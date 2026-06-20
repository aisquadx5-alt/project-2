'use client';

import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Edit2, Trash2, Code, Copy, Check, X, Bot, Shield, Terminal, FileText, Link2, BookOpen, Sparkles, Volume2 } from 'lucide-react';
import Badge from '@/components/Badge';
import { createChatbotAction, updateChatbot, deleteChatbot } from '../actions';
import styles from './chatbots.module.css';

interface Chatbot {
  id: string;
  name: string;
  description: string;
  system_prompt: string;
  status: 'active' | 'inactive';
  widget_color: string;
  avatar_url: string | null;
  domain_allowlist: string;
  pre_chat_enabled: boolean;
  pre_chat_fields: { name: boolean; email: boolean };
  welcome_message?: string;
  tone_of_voice?: string;
  starter_questions?: string[];
  owner_id?: string;
  user_id?: string;
  created_at?: string;
}

interface RagDoc {
  id: string;
  filename: string;
  content: string;
}

const DEFAULT_PROMPT = 'You are a helpful customer support AI assistant. Be polite, professional, and try to resolve the customer\'s issue. If the user asks for a live human, live agent, or is extremely upset, trigger escalation.';

const generateId = (prefix: string) => {
  return `${prefix}-${Math.random().toString(36).substring(2, 9)}`;
};

export default function ChatbotsPage() {
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSandbox, setIsSandbox] = useState(false);
  const [userId, setUserId] = useState<string>('');

  // Modals state
  const [showFormModal, setShowFormModal] = useState(false);
  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const [currentChatbot, setCurrentChatbot] = useState<Chatbot | null>(null);
  const [selectedEmbedBot, setSelectedEmbedBot] = useState<Chatbot | null>(null);
  const [copied, setCopied] = useState(false);

  // Tab State in Modal
  const [activeTab, setActiveTab] = useState<'basic' | 'ai' | 'icebreakers' | 'rag'>('basic');

  // RAG states
  const [documents, setDocuments] = useState<RagDoc[]>([]);
  const [crawlerUrl, setCrawlerUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Icebreaker States
  const [newQuestion, setNewQuestion] = useState('');

  // Form inputs
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    system_prompt: DEFAULT_PROMPT,
    status: 'active' as 'active' | 'inactive',
    widget_color: '#000000',
    domain_allowlist: '*',
    pre_chat_enabled: false,
    pre_chat_fields: { name: true, email: true },
    welcome_message: 'Hi! How can we help you today?',
    tone_of_voice: 'professional',
    starter_questions: [] as string[],
  });

  // Get App URL dynamically
  const getAppUrl = () => {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  };

  useEffect(() => {
    async function loadChatbots() {
      setLoading(true);
      
      const demoUserStr = localStorage.getItem('uipro_demo_user');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setUserId(session.user.id);
        setIsSandbox(false);
        
        const { data, error } = await supabase
          .from('chatbots')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          setChatbots(data);
        }
      } else if (demoUserStr) {
        setIsSandbox(true);
        const localDataStr = localStorage.getItem('uipro_sandbox_chatbots');
        if (localDataStr) {
          setChatbots(JSON.parse(localDataStr));
        } else {
          setChatbots([]);
        }
      }
      setLoading(false);
    }

    loadChatbots();
  }, []);

  // Open Add Form
  const handleAddClick = () => {
    setCurrentChatbot(null);
    setActiveTab('basic');
    setDocuments([]);
    setFormData({
      name: '',
      description: '',
      system_prompt: DEFAULT_PROMPT,
      status: 'active',
      widget_color: '#000000',
      domain_allowlist: '*',
      pre_chat_enabled: false,
      pre_chat_fields: { name: true, email: true },
      welcome_message: 'Hi! How can we help you today?',
      tone_of_voice: 'professional',
      starter_questions: [],
    });
    setShowFormModal(true);
  };

  // Open Edit Form
  const handleEditClick = async (bot: Chatbot) => {
    setCurrentChatbot(bot);
    setActiveTab('basic');
    setFormData({
      name: bot.name,
      description: bot.description,
      system_prompt: bot.system_prompt,
      status: bot.status,
      widget_color: bot.widget_color,
      domain_allowlist: bot.domain_allowlist,
      pre_chat_enabled: bot.pre_chat_enabled,
      pre_chat_fields: { ...bot.pre_chat_fields },
      welcome_message: bot.welcome_message || 'Hi! How can we help you today?',
      tone_of_voice: bot.tone_of_voice || 'professional',
      starter_questions: bot.starter_questions || [],
    });

    // Load documents
    if (isSandbox) {
      const localDocs = localStorage.getItem(`uipro_rag_docs_${bot.id}`);
      setDocuments(localDocs ? JSON.parse(localDocs) : []);
    } else {
      const { data: dbDocs } = await supabase
        .from('chatbot_documents')
        .select('id, filename, content')
        .eq('chatbot_id', bot.id);
      setDocuments(dbDocs || []);
    }

    setShowFormModal(true);
  };

  // Open Embed Code Modal
  const handleEmbedClick = (bot: Chatbot) => {
    setSelectedEmbedBot(bot);
    setShowEmbedModal(true);
    setCopied(false);
  };

  // Copy embed snippet
  const handleCopyCode = () => {
    if (!selectedEmbedBot) return;
    const code = `<script src="${getAppUrl()}/api/widget.js?id=${selectedEmbedBot.id}" async></script>`;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Save Chatbot
  const handleSaveChatbot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const botPayload = {
      name: formData.name,
      description: formData.description,
      system_prompt: formData.system_prompt,
      status: formData.status,
      widget_color: formData.widget_color,
      avatar_url: currentChatbot ? currentChatbot.avatar_url : null,
      domain_allowlist: formData.domain_allowlist,
      pre_chat_enabled: formData.pre_chat_enabled,
      pre_chat_fields: formData.pre_chat_fields,
      welcome_message: formData.welcome_message,
      tone_of_voice: formData.tone_of_voice,
      starter_questions: formData.starter_questions,
    };

    if (isSandbox) {
      let updatedList = [...chatbots];
      
      if (currentChatbot) {
        // Edit mode
        updatedList = chatbots.map((b) => 
          b.id === currentChatbot.id ? { ...b, ...botPayload } : b
        );
      } else {
        // Create mode
        const newBot: Chatbot = {
          id: generateId('bot'),
          ...botPayload,
        };
        updatedList.unshift(newBot);
      }
      
      localStorage.setItem('uipro_sandbox_chatbots', JSON.stringify(updatedList));
      setChatbots(updatedList);
      setShowFormModal(false);
    } else {
      if (currentChatbot) {
        // Edit mode
        const res = await updateChatbot(currentChatbot.id, botPayload);
        
        if (res.success && res.chatbot) {
          setChatbots(chatbots.map(b => b.id === currentChatbot.id ? { ...b, ...botPayload } : b));
          setShowFormModal(false);
        } else {
          alert(res.error || 'Failed to update chatbot.');
        }
      } else {
        // Create mode
        const actionFormData = new FormData();
        actionFormData.append('name', formData.name);
        actionFormData.append('description', formData.description);
        actionFormData.append('system_prompt', formData.system_prompt);
        actionFormData.append('status', formData.status);
        actionFormData.append('widget_color', formData.widget_color);
        actionFormData.append('domain_allowlist', formData.domain_allowlist);
        actionFormData.append('pre_chat_enabled', String(formData.pre_chat_enabled));
        actionFormData.append('pre_chat_fields', JSON.stringify(formData.pre_chat_fields));
        actionFormData.append('welcome_message', formData.welcome_message);
        actionFormData.append('tone_of_voice', formData.tone_of_voice);
        actionFormData.append('starter_questions', JSON.stringify(formData.starter_questions));

        try {
          const newBot = await createChatbotAction(actionFormData);
          setChatbots([newBot as any, ...chatbots]);
          setShowFormModal(false);
        } catch (err: any) {
          alert(err.message || 'Failed to create chatbot.');
        }
      }
    }
    setLoading(false);
  };

  // Delete Chatbot
  const handleDeleteChatbot = async (id: string) => {
    if (!confirm('Are you sure you want to delete this chatbot? This will delete all associated conversations.')) return;
    setLoading(true);

    if (isSandbox) {
      const updatedList = chatbots.filter((b) => b.id !== id);
      localStorage.setItem('uipro_sandbox_chatbots', JSON.stringify(updatedList));
      setChatbots(updatedList);
    } else {
      const res = await deleteChatbot(id);
      
      if (res.success) {
        setChatbots(chatbots.filter(b => b.id !== id));
      } else {
        alert(res.error || 'Failed to delete chatbot.');
      }
    }
    setLoading(false);
  };

  // RAG Document Handlers
  const handleSaveDocument = async (filename: string, content: string) => {
    if (!currentChatbot) return;

    setUploading(true);
    if (isSandbox) {
      const newDoc: RagDoc = {
        id: generateId('doc'),
        filename,
        content
      };
      const updatedDocs = [...documents, newDoc];
      localStorage.setItem(`uipro_rag_docs_${currentChatbot.id}`, JSON.stringify(updatedDocs));
      setDocuments(updatedDocs);
    } else {
      const { data, error } = await supabase
        .from('chatbot_documents')
        .insert({
          chatbot_id: currentChatbot.id,
          filename,
          content
        })
        .select('id, filename, content')
        .single();

      if (!error && data) {
        setDocuments([...documents, data]);
      }
    }
    setUploading(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      await handleSaveDocument(file.name, text || 'Empty text document.');
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    
    if (file.type === 'text/plain') {
      reader.readAsText(file);
    } else {
      // PDF/Other file mock text reader
      handleSaveDocument(file.name, `[PDF Extracted Data]: Detailed FAQ references regarding ${file.name}. Standard returns policy: 30 days. Contact email support@acme.com.`);
    }
  };

  const handleCrawlUrl = async () => {
    if (!crawlerUrl.trim()) return;
    try {
      const urlObj = new URL(crawlerUrl);
      const filename = urlObj.hostname + ' (Web crawl)';
      const mockText = `[CRAWLED DATA - ${crawlerUrl}]: Acme corp provides standard subscription options. Standard plan is $19/month. Enterprise plans offer customizable bot thresholds, pgvector search, and RAG databases.`;
      await handleSaveDocument(filename, mockText);
      setCrawlerUrl('');
    } catch {
      alert('Please enter a valid URL.');
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Remove this document from the Knowledge Base?')) return;
    setUploading(true);

    if (isSandbox && currentChatbot) {
      const updatedDocs = documents.filter(d => d.id !== docId);
      localStorage.setItem(`uipro_rag_docs_${currentChatbot.id}`, JSON.stringify(updatedDocs));
      setDocuments(updatedDocs);
    } else {
      const { error } = await supabase
        .from('chatbot_documents')
        .delete()
        .eq('id', docId);

      if (!error) {
        setDocuments(documents.filter(d => d.id !== docId));
      }
    }
    setUploading(false);
  };

  // Icebreakers Handlers
  const handleAddQuestion = () => {
    if (!newQuestion.trim()) return;
    if (formData.starter_questions.length >= 4) {
      alert('You can configure up to 4 starter questions.');
      return;
    }
    setFormData(prev => ({
      ...prev,
      starter_questions: [...prev.starter_questions, newQuestion.trim()]
    }));
    setNewQuestion('');
  };

  const handleRemoveQuestion = (index: number) => {
    setFormData(prev => ({
      ...prev,
      starter_questions: prev.starter_questions.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 className={styles.title}>Chatbots Manager</h1>
            <p className={styles.desc}>
              Create, configure, and generate embed codes for your AI support agents.
            </p>
          </div>
          <button className="btn btn-primary" onClick={handleAddClick}>
            <Plus size={16} />
            Create Chatbot
          </button>
        </div>
      </div>

      {loading && chatbots.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px' }}><p>Loading chatbots...</p></div>
      ) : chatbots.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
          <Bot size={48} color="var(--text-light)" style={{ marginBottom: '16px' }} />
          <h3>No Chatbots Active</h3>
          <p style={{ color: 'var(--text-muted)', margin: '8px 0 20px 0' }}>
            Get started by creating your first AI customer support agent!
          </p>
          <button className="btn btn-primary" onClick={handleAddClick}>
            <Plus size={16} />
            Create Chatbot
          </button>
        </div>
      ) : (
        /* CARDS GRID */
        <div className={styles.grid}>
          {chatbots.map((bot) => (
            <div key={bot.id} className={styles.chatbotCard}>
              <div className={styles.cardHeader}>
                <div className={styles.cardInfo}>
                  <div 
                    className={styles.avatarCircle} 
                    style={{ backgroundColor: bot.widget_color }}
                  >
                    <Bot size={22} />
                  </div>
                  <div>
                    <h3 className={styles.chatbotName}>{bot.name}</h3>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      ID: {bot.id}
                    </span>
                  </div>
                </div>
                <Badge variant={bot.status === 'active' ? 'success' : 'neutral'} dot>
                  {bot.status === 'active' ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              <p className={styles.chatbotDesc}>
                {bot.description || 'No description provided.'}
              </p>

              <div className={styles.cardFooter}>
                <button className={styles.btnEmbed} onClick={() => handleEmbedClick(bot)}>
                  <Code size={14} />
                  Embed Code
                </button>
                <div className={styles.btnGroup}>
                  <button 
                    className={styles.iconBtn} 
                    onClick={() => handleEditClick(bot)}
                    aria-label="Edit Chatbot"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button 
                    className={styles.iconBtn} 
                    onClick={() => handleDeleteChatbot(bot.id)}
                    style={{ color: 'var(--danger)' }}
                    aria-label="Delete Chatbot"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT FORM MODAL */}
      {showFormModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {currentChatbot ? 'Configure Chatbot Agent' : 'Create Chatbot Agent'}
              </h3>
              <button className={styles.modalClose} onClick={() => setShowFormModal(false)}>
                <X size={20} />
              </button>
            </div>

            {/* MODAL TABS NAVIGATION */}
            <div className={styles.tabsHeader}>
              <button 
                type="button"
                className={`${styles.tabBtn} ${activeTab === 'basic' ? styles.activeTabBtn : ''}`}
                onClick={() => setActiveTab('basic')}
              >
                <Shield size={14} />
                Basic Settings
              </button>
              <button 
                type="button"
                className={`${styles.tabBtn} ${activeTab === 'ai' ? styles.activeTabBtn : ''}`}
                onClick={() => setActiveTab('ai')}
              >
                <Volume2 size={14} />
                AI & Tone
              </button>
              <button 
                type="button"
                className={`${styles.tabBtn} ${activeTab === 'icebreakers' ? styles.activeTabBtn : ''}`}
                onClick={() => setActiveTab('icebreakers')}
              >
                <Sparkles size={14} />
                Icebreakers
              </button>
              <button 
                type="button"
                className={`${styles.tabBtn} ${activeTab === 'rag' ? styles.activeTabBtn : ''}`}
                onClick={() => setActiveTab('rag')}
              >
                <BookOpen size={14} />
                Knowledge Base (RAG)
              </button>
            </div>

            <form onSubmit={handleSaveChatbot}>
              <div className={styles.modalBody}>

                {/* TAB 1: BASIC SETTINGS */}
                {activeTab === 'basic' && (
                  <div className={styles.tabContent}>
                    <div className={styles.formGroup}>
                      <label>Agent Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Acme Billing Bot"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>Short Description</label>
                      <input
                        type="text"
                        placeholder="Briefly describe what this agent handles"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      />
                    </div>

                    <div className={styles.formGrid}>
                      <div className={styles.formGroup}>
                        <label>Branding Accent Color</label>
                        <input
                          type="color"
                          value={formData.widget_color}
                          onChange={(e) => setFormData(prev => ({ ...prev, widget_color: e.target.value }))}
                          style={{ height: '40px', padding: '4px', cursor: 'pointer', width: '100%' }}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Status</label>
                        <select
                          value={formData.status}
                          onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                        >
                          <option value="active">Active (Visible)</option>
                          <option value="inactive">Inactive (Offline)</option>
                        </select>
                      </div>
                    </div>

                    <div className={styles.formGroup}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Shield size={14} color="var(--text-muted)" />
                        <label>Authorized Embedding Domains</label>
                      </div>
                      <input
                        type="text"
                        placeholder="e.g., example.com, myapp.net (or * for all)"
                        value={formData.domain_allowlist}
                        onChange={(e) => setFormData(prev => ({ ...prev, domain_allowlist: e.target.value }))}
                      />
                      <span className={styles.fieldHelpText}>
                        Separate multiple domains with commas. Restricts which hosts are allowed to load your widget.
                      </span>
                    </div>

                    <div className={styles.checkboxGroup} style={{ marginTop: '8px' }}>
                      <input
                        id="pre-chat-toggle"
                        type="checkbox"
                        checked={formData.pre_chat_enabled}
                        onChange={(e) => setFormData(prev => ({ ...prev, pre_chat_enabled: e.target.checked }))}
                      />
                      <label htmlFor="pre-chat-toggle">Enable Pre-Chat Information Form</label>
                    </div>
                    {formData.pre_chat_enabled && (
                      <span className={styles.fieldHelpText} style={{ marginLeft: '24px' }}>
                        Collect visitor Name and Email before starting the chat thread.
                      </span>
                    )}
                  </div>
                )}

                {/* TAB 2: AI & TONE */}
                {activeTab === 'ai' && (
                  <div className={styles.tabContent}>
                    <div className={styles.formGroup}>
                      <label>Welcome Message</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g., Hi! How can we help you today?"
                        value={formData.welcome_message}
                        onChange={(e) => setFormData(prev => ({ ...prev, welcome_message: e.target.value }))}
                      />
                      <span className={styles.fieldHelpText}>
                        First message sent by the bot when user opens the widget.
                      </span>
                    </div>

                    <div className={styles.formGroup}>
                      <label>Tone of Voice</label>
                      <select
                        value={formData.tone_of_voice}
                        onChange={(e) => setFormData(prev => ({ ...prev, tone_of_voice: e.target.value }))}
                      >
                        <option value="professional">Professional (Polite, informative)</option>
                        <option value="friendly">Friendly (Warm, empathetic)</option>
                        <option value="casual">Casual (Relaxed, conversational)</option>
                        <option value="humorous">Humorous (Witty, witty responses)</option>
                      </select>
                      <span className={styles.fieldHelpText}>
                        Controls the conversational style of the bot replies.
                      </span>
                    </div>

                    <div className={styles.formGroup}>
                      <label>System Prompt (AI Persona & Guidelines)</label>
                      <textarea
                        rows={5}
                        required
                        placeholder="Define instructions, personality, limits and how to handle customer issues..."
                        value={formData.system_prompt}
                        onChange={(e) => setFormData(prev => ({ ...prev, system_prompt: e.target.value }))}
                      />
                    </div>
                  </div>
                )}

                {/* TAB 3: ICEBREAKERS */}
                {activeTab === 'icebreakers' && (
                  <div className={styles.tabContent}>
                    <p className={styles.tabDescription}>
                      Configure starter questions. These show up as quick-reply chips in the widget before the user types anything.
                    </p>

                    <div className={styles.questionInputRow}>
                      <input
                        type="text"
                        placeholder="e.g. What are your pricing plans?"
                        value={newQuestion}
                        onChange={(e) => setNewQuestion(e.target.value)}
                        maxLength={60}
                      />
                      <button 
                        type="button" 
                        className="btn btn-primary"
                        onClick={handleAddQuestion}
                        disabled={formData.starter_questions.length >= 4}
                      >
                        Add
                      </button>
                    </div>
                    <span className={styles.fieldHelpText}>Max 4 icebreaker questions.</span>

                    <div className={styles.questionsList}>
                      {formData.starter_questions.length === 0 ? (
                        <p style={{ fontSize: '13px', color: 'var(--text-light)', textAlign: 'center', padding: '12px' }}>
                          No starter questions configured.
                        </p>
                      ) : (
                        formData.starter_questions.map((q, idx) => (
                          <div key={idx} className={styles.questionItem}>
                            <span className={styles.questionText}>{q}</span>
                            <button 
                              type="button" 
                              className={styles.questionDeleteBtn}
                              onClick={() => handleRemoveQuestion(idx)}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 4: KNOWLEDGE BASE (RAG) */}
                {activeTab === 'rag' && (
                  <div className={styles.tabContent}>
                    {!currentChatbot ? (
                      <div className={styles.ragAlertBox}>
                        <X size={18} color="var(--danger)" />
                        <p>Please click <strong>Create Agent</strong> first to initialize the chatbot before uploading knowledge documents.</p>
                      </div>
                    ) : (
                      <>
                        <p className={styles.tabDescription}>
                          Upload documents or crawl website URLs. The AI will query this context to draft responses (pgvector search).
                        </p>

                        {/* File upload */}
                        <div className={styles.ragActions}>
                          <div className={styles.fileUploadBox}>
                            <input
                              type="file"
                              ref={fileInputRef}
                              accept=".txt,.pdf"
                              onChange={handleFileUpload}
                              style={{ display: 'none' }}
                            />
                            <button 
                              type="button" 
                              className="btn btn-secondary"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={uploading}
                            >
                              <FileText size={16} />
                              Upload TXT/PDF
                            </button>
                          </div>

                          {/* Crawler */}
                          <div className={styles.crawlerInput}>
                            <input
                              type="text"
                              placeholder="e.g., https://example.com/pricing"
                              value={crawlerUrl}
                              onChange={(e) => setCrawlerUrl(e.target.value)}
                            />
                            <button 
                              type="button" 
                              className="btn btn-primary"
                              onClick={handleCrawlUrl}
                              disabled={uploading || !crawlerUrl}
                            >
                              <Link2 size={16} />
                              Crawl URL
                            </button>
                          </div>
                        </div>

                        {/* Documents list */}
                        <div className={styles.documentsList}>
                          <h4 className={styles.listHeader}>Uploaded Source Documents ({documents.length})</h4>
                          {uploading && <p style={{ fontSize: '12px', padding: '8px 0' }}>Syncing Knowledge Base...</p>}
                          
                          {documents.length === 0 ? (
                            <p style={{ fontSize: '13px', color: 'var(--text-light)', padding: '16px 0', textAlign: 'center' }}>
                              No documents uploaded yet.
                            </p>
                          ) : (
                            <div className={styles.docsGrid}>
                              {documents.map(doc => (
                                <div key={doc.id} className={styles.docItem}>
                                  <FileText size={16} className={styles.docIcon} />
                                  <div className={styles.docDetails}>
                                    <span className={styles.docName}>{doc.filename}</span>
                                    <span className={styles.docSnippet}>{doc.content.substring(0, 70)}...</span>
                                  </div>
                                  <button
                                    type="button"
                                    className={styles.docDelete}
                                    onClick={() => handleDeleteDocument(doc.id)}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}

              </div>
              <div className={styles.modalFooter}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowFormModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {currentChatbot ? 'Save Settings' : 'Create Agent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EMBED CODE MODAL */}
      {showEmbedModal && selectedEmbedBot && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: '500px' }}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Embed script for {selectedEmbedBot.name}</h3>
              <button className={styles.modalClose} onClick={() => setShowEmbedModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                Copy the script snippet below and paste it inside the HTML body (typically right before the closing <code>&lt;/body&gt;</code> tag) of the website you want to add the support widget to.
              </p>
              
              <div className={styles.embedCodeBox}>
                {`<script src="${getAppUrl()}/api/widget.js?id=${selectedEmbedBot.id}" async></script>`}
              </div>

              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <Terminal size={14} />
                  <span>Will load dynamic widget loader bundle at runtime.</span>
                </div>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={handleCopyCode}
                  style={{ padding: '6px 12px', fontSize: '12px', marginLeft: 'auto' }}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied!' : 'Copy Code'}
                </button>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowEmbedModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
