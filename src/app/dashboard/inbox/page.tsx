'use client';

import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  MessageSquare, Play, Pause, Send, User, Bot, AlertTriangle, 
  Monitor, Globe, CheckCircle2, Hand, Paperclip, Smile, FileText, 
  ChevronDown, ListFilter 
} from 'lucide-react';
import Badge from '@/components/Badge';
import styles from './inbox.module.css';

const generateId = (prefix: string) => {
  return `${prefix}-${Math.random().toString(36).substring(2, 9)}`;
};

interface Conversation {
  id: string;
  chatbot_id: string;
  visitor_name: string | null;
  visitor_email: string | null;
  session_id: string;
  status: 'active' | 'escalated' | 'closed';
  browser: string | null;
  page_url: string | null;
  is_bot_paused: boolean;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender: 'user' | 'bot' | 'agent' | 'system';
  content: string;
  created_at: string;
}

export default function InboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyInput, setReplyInput] = useState('');
  const [lastMessages, setLastMessages] = useState<Record<string, string>>({});
  
  const [filter, setFilter] = useState<'all' | 'needs_agent'>('all');
  const [loading, setLoading] = useState(true);
  const [isSandbox, setIsSandbox] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Helper to extract initials
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  // Helper to get formatted status details
  const getStatusDetails = (conv: Conversation) => {
    if (conv.status === 'escalated') {
      return { text: 'Needs Agent', variant: 'danger' as const };
    }
    if (conv.is_bot_paused) {
      return { text: 'Active (Agent)', variant: 'success' as const };
    }
    return { text: 'AI Handling', variant: 'neutral' as const };
  };

  // 1. Initial Load: Fetch conversations list
  useEffect(() => {
    async function loadConversations() {
      setLoading(true);
      const demoUserStr = localStorage.getItem('uipro_demo_user');
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        setIsSandbox(false);
        const { data, error } = await supabase
          .from('conversations')
          .select('*')
          .order('updated_at', { ascending: false });

        if (!error && data) {
          setConversations(data);
          
          // Fetch last message for each conversation
          const { data: msgs } = await supabase
            .from('messages')
            .select('conversation_id, content, sender, created_at')
            .order('created_at', { ascending: false });

          if (msgs) {
            const lastMsgMap: Record<string, string> = {};
            msgs.forEach((m) => {
              if (!lastMsgMap[m.conversation_id]) {
                lastMsgMap[m.conversation_id] = m.content;
              }
            });
            setLastMessages(lastMsgMap);
          }
        }
      } else if (demoUserStr) {
        setIsSandbox(true);
        // Seed mock data for sandbox
        const localConvStr = localStorage.getItem('uipro_sandbox_conversations');
        if (localConvStr) {
          setConversations(JSON.parse(localConvStr));
        } else {
          const seedConvs: Conversation[] = [
            {
              id: 'conv-1',
              chatbot_id: 'demo-chatbot-id',
              visitor_name: 'Sarah Miller',
              visitor_email: 'sarah.m@example.com',
              session_id: '892-A-session-uuid',
              status: 'escalated',
              browser: 'Safari',
              page_url: 'https://example.com/checkout',
              is_bot_paused: true,
              created_at: new Date(Date.now() - 3600000).toISOString(),
              updated_at: new Date().toISOString(),
            },
            {
              id: 'conv-2',
              chatbot_id: 'demo-chatbot-id',
              visitor_name: 'John Doe',
              visitor_email: 'john.d@example.com',
              session_id: '123-B-session-uuid',
              status: 'active',
              browser: 'Chrome',
              page_url: 'https://example.com/pricing',
              is_bot_paused: false,
              created_at: new Date(Date.now() - 7200000).toISOString(),
              updated_at: new Date(Date.now() - 1200000).toISOString(),
            },
            {
              id: 'conv-3',
              chatbot_id: 'demo-chatbot-id',
              visitor_name: 'Alex Kumar',
              visitor_email: 'alex.k@example.com',
              session_id: '456-C-session-uuid',
              status: 'active',
              browser: 'Chrome',
              page_url: 'https://example.com/pricing',
              is_bot_paused: true,
              created_at: new Date(Date.now() - 14400000).toISOString(),
              updated_at: new Date(Date.now() - 900000).toISOString(),
            }
          ];
          localStorage.setItem('uipro_sandbox_conversations', JSON.stringify(seedConvs));
          setConversations(seedConvs);

          // Seed mock messages
          const seedMessages: Record<string, Message[]> = {
            'conv-1': [
              { id: 'm-1-1', conversation_id: 'conv-1', sender: 'user', content: "Hi, I've been trying to reset my password but the link in the email keeps expiring before I can use it. It's happening repeatedly.", created_at: new Date(Date.now() - 60000).toISOString() },
              { id: 'm-1-2', conversation_id: 'conv-1', sender: 'bot', content: "I understand that's frustrating, Sarah. The password reset links expire after 15 minutes for security reasons. I can generate a specialized secure link for you that lasts for 24 hours. Would you like me to send that to sarah.m@example.com?", created_at: new Date(Date.now() - 50000).toISOString() },
              { id: 'm-1-3', conversation_id: 'conv-1', sender: 'user', content: "Yes please, that would be great. Also, can a human agent verify why my account was locked in the first place?", created_at: new Date(Date.now() - 40000).toISOString() }
            ],
            'conv-2': [
              { id: 'm-2-1', conversation_id: 'conv-2', sender: 'user', content: 'How do I upgrade my billing plan?', created_at: new Date(Date.now() - 7100000).toISOString() }
            ],
            'conv-3': [
              { id: 'm-3-1', conversation_id: 'conv-3', sender: 'user', content: 'Thanks, that solved my issue perfectly.', created_at: new Date(Date.now() - 14300000).toISOString() }
            ]
          };
          localStorage.setItem('uipro_sandbox_messages', JSON.stringify(seedMessages));
        }

        // Load sandbox last messages
        const localMsgsStr = localStorage.getItem('uipro_sandbox_messages');
        if (localMsgsStr) {
          const allMsgs = JSON.parse(localMsgsStr);
          const lastMsgMap: Record<string, string> = {};
          Object.keys(allMsgs).forEach((convId) => {
            const list = allMsgs[convId];
            if (list.length > 0) {
              lastMsgMap[convId] = list[list.length - 1].content;
            }
          });
          setLastMessages(lastMsgMap);
        }
      }
      setLoading(false);
    }

    loadConversations();
  }, []);

  // 2. Fetch messages when active conversation changes
  useEffect(() => {
    if (!activeConv) return;
    const activeId = activeConv.id;
    
    async function loadMessages() {
      if (isSandbox) {
        const localMsgsStr = localStorage.getItem('uipro_sandbox_messages');
        if (localMsgsStr) {
          const allMsgs = JSON.parse(localMsgsStr);
          setMessages(allMsgs[activeId] || []);
        }
      } else {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', activeId)
          .order('created_at', { ascending: true });

        if (!error && data) {
          setMessages(data);
        }
      }
    }

    loadMessages();
  }, [activeConv?.id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 3. Realtime updates (Supabase Realtime)
  useEffect(() => {
    if (isSandbox) return;

    // Listen to new conversations/updates in the list
    const listChannel = supabase
      .channel('realtime_inbox_conversations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        (payload: any) => {
          setConversations((prev) => {
            const index = prev.findIndex((c) => c.id === payload.new.id);
            if (index > -1) {
              const updated = [...prev];
              updated[index] = payload.new;
              return updated.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
            } else {
              return [payload.new, ...prev];
            }
          });

          if (activeConv && payload.new.id === activeConv.id) {
            setActiveConv(payload.new);
          }
        }
      )
      .subscribe();

    // Listen to new messages in the active conversation thread
    let threadChannel: any = null;
    if (activeConv?.id) {
      threadChannel = supabase
        .channel(`realtime_thread_${activeConv.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeConv.id}` },
          (payload: any) => {
            setMessages((prev) => {
              if (prev.some((m) => m.id === payload.new.id)) return prev;
              return [...prev, payload.new];
            });

            // Update last message state
            setLastMessages((prev) => ({
              ...prev,
              [payload.new.conversation_id]: payload.new.content
            }));
          }
        )
        .subscribe();
    }

    return () => {
      supabase.removeChannel(listChannel);
      if (threadChannel) supabase.removeChannel(threadChannel);
    };
  }, [activeConv?.id, isSandbox]);

  // Send Manual Agent Message
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyInput.trim() || !activeConv) return;

    const messageText = replyInput;
    setReplyInput('');

    if (isSandbox) {
      // Mock Sandbox Write
      const newMsg: Message = {
        id: generateId('msg'),
        conversation_id: activeConv.id,
        sender: 'agent',
        content: messageText,
        created_at: new Date().toISOString(),
      };

      // 1. Update messages state & localStorage
      const localMsgsStr = localStorage.getItem('uipro_sandbox_messages');
      const allMsgs = localMsgsStr ? JSON.parse(localMsgsStr) : {};
      const convMsgs = allMsgs[activeConv.id] || [];
      convMsgs.push(newMsg);
      allMsgs[activeConv.id] = convMsgs;
      localStorage.setItem('uipro_sandbox_messages', JSON.stringify(allMsgs));
      setMessages(convMsgs);

      // Update last message
      setLastMessages((prev) => ({
        ...prev,
        [activeConv.id]: messageText
      }));

      // 2. Set conversation paused (locked out bot)
      const updatedConvs = conversations.map((c) => 
        c.id === activeConv.id 
          ? { ...c, is_bot_paused: true, status: 'escalated' as const, updated_at: new Date().toISOString() } 
          : c
      );
      localStorage.setItem('uipro_sandbox_conversations', JSON.stringify(updatedConvs));
      setConversations(updatedConvs);
      setActiveConv({ ...activeConv, is_bot_paused: true, status: 'escalated' });
    } else {
      // 1. Write agent reply message to Supabase
      const { error: msgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: activeConv.id,
          sender: 'agent',
          content: messageText
        });

      if (msgError) console.error('Failed to send agent reply:', msgError);

      // 2. Lockout bot: set is_bot_paused = true
      const { error: convError } = await supabase
        .from('conversations')
        .update({ is_bot_paused: true })
        .eq('id', activeConv.id);

      if (convError) console.error('Failed to pause AI chatbot:', convError);

      setLastMessages((prev) => ({
        ...prev,
        [activeConv.id]: messageText
      }));
    }
  };

  // Toggle Bot Pause/Resume AI
  const handleToggleBot = async (pause: boolean) => {
    if (!activeConv) return;

    if (isSandbox) {
      const updatedConvs = conversations.map((c) => 
        c.id === activeConv.id 
          ? { ...c, is_bot_paused: pause, updated_at: new Date().toISOString() } 
          : c
      );
      localStorage.setItem('uipro_sandbox_conversations', JSON.stringify(updatedConvs));
      setConversations(updatedConvs);
      
      const newSystemMsg: Message = {
        id: generateId('msg'),
        conversation_id: activeConv.id,
        sender: 'system',
        content: pause ? 'System: AI chatbot has been paused.' : 'System: AI chatbot resumed.',
        created_at: new Date().toISOString(),
      };

      const localMsgsStr = localStorage.getItem('uipro_sandbox_messages');
      const allMsgs = localMsgsStr ? JSON.parse(localMsgsStr) : {};
      const convMsgs = allMsgs[activeConv.id] || [];
      convMsgs.push(newSystemMsg);
      allMsgs[activeConv.id] = convMsgs;
      localStorage.setItem('uipro_sandbox_messages', JSON.stringify(allMsgs));
      
      setMessages(convMsgs);
      setActiveConv({ ...activeConv, is_bot_paused: pause });
    } else {
      // 1. Update is_bot_paused in db
      await supabase
        .from('conversations')
        .update({ is_bot_paused: pause })
        .eq('id', activeConv.id);

      // 2. Insert system notification message
      await supabase
        .from('messages')
        .insert({
          conversation_id: activeConv.id,
          sender: 'system',
          content: pause ? 'System: AI chatbot has been paused.' : 'System: AI chatbot resumed.'
        });
    }
  };

  // Filter conversations based on tab
  const filteredConversations = conversations.filter((c) => {
    if (filter === 'needs_agent') {
      return c.status === 'escalated';
    }
    return true;
  });

  return (
    <div className={styles.workspace}>
      {/* LEFT PANEL: CONVERSATIONS LIST */}
      <div className={styles.listPanel}>
        <div className={styles.panelHeader}>
          <div className={styles.titleRow}>
            <h1 className={styles.panelTitle}>Inbox</h1>
            <button className={styles.iconBtn} aria-label="Filter inbox">
              <ListFilter size={16} />
            </button>
          </div>
          
          <div className={styles.filterTabs}>
            <button 
              className={`${styles.filterTab} ${filter === 'all' ? styles.filterTabActive : ''}`}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button 
              className={`${styles.filterTab} ${filter === 'needs_agent' ? styles.filterTabActive : ''}`}
              onClick={() => setFilter('needs_agent')}
            >
              Needs Agent
            </button>
          </div>
        </div>

        <div className={styles.conversationList}>
          {loading && conversations.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center' }}><p>Loading...</p></div>
          ) : filteredConversations.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-light)' }}>
              <MessageSquare size={32} style={{ marginBottom: '12px' }} />
              <p style={{ fontSize: '13px' }}>No dialogues found.</p>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const statusDetails = getStatusDetails(conv);
              return (
                <div 
                  key={conv.id} 
                  className={`${styles.convItem} ${activeConv?.id === conv.id ? styles.convItemActive : ''}`}
                  onClick={() => setActiveConv(conv)}
                >
                  <div className={styles.convMain}>
                    <div className={styles.avatarCircleSmall}>
                      {conv.visitor_name ? getInitials(conv.visitor_name) : 'V'}
                    </div>
                    
                    <div className={styles.convContentWrap}>
                      <div className={styles.convMeta}>
                        <h4 className={styles.visitorName}>
                          {conv.visitor_name || `Visitor (${conv.session_id.substring(0, 5).toUpperCase()})`}
                        </h4>
                        <span className={styles.timeText}>
                          {new Date(conv.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      
                      <div className={styles.badgeRow}>
                        <Badge variant={statusDetails.variant} dot>
                          {statusDetails.text}
                        </Badge>
                      </div>
                      
                      <p className={styles.snippetText}>
                        {lastMessages[conv.id] || 'No messages yet.'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT PANEL: THREAD CONVERSATION */}
      <div className={styles.threadPanel}>
        {activeConv ? (
          <>
            {/* THREAD HEADER */}
            <header className={styles.threadHeader}>
              <div className={styles.threadInfo}>
                <div className={styles.avatarCircleLarge}>
                  {activeConv.visitor_name ? getInitials(activeConv.visitor_name) : 'V'}
                </div>
                <div>
                  <div className={styles.titleWithEmail}>
                    <h3 className={styles.threadTitle}>
                      {activeConv.visitor_name || `Visitor ${activeConv.session_id.substring(0, 5).toUpperCase()}`}
                    </h3>
                    <span className={styles.headerDot}>|</span>
                    <span className={styles.threadSubtitle}>
                      {activeConv.visitor_email || 'No email collected'}
                    </span>
                    <span className={styles.headerDot}>|</span>
                    <span className={styles.threadIdLabel}>
                      ID: #{activeConv.session_id.substring(0, 5).toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.controlsGroup}>
                <button className={styles.btnViewProfile}>
                  View Profile
                </button>

                {activeConv.is_bot_paused ? (
                  <button className={styles.btnResumeActive} onClick={() => handleToggleBot(false)}>
                    <Pause size={14} fill="currentColor" />
                    Resume Bot
                  </button>
                ) : (
                  <button 
                    className={styles.btnTakeOver} 
                    onClick={() => handleToggleBot(true)}
                  >
                    <Hand size={14} style={{ marginRight: '6px' }} />
                    Take Over
                  </button>
                )}
              </div>
            </header>

            {/* MESSAGE TIMELINE AREA */}
            <div className={styles.messageArea}>
              {messages.map((m) => {
                if (m.sender === 'system') {
                  return (
                    <div key={m.id} className={styles.msgRowSystem}>
                      <div className={styles.systemBubble}>
                        <AlertTriangle size={14} className={styles.warningIcon} />
                        <span>{m.content}</span>
                      </div>
                    </div>
                  );
                }

                const isUser = m.sender === 'user';
                const isBot = m.sender === 'bot';
                const isAgent = m.sender === 'agent';

                if (isUser) {
                  // User (Customer) -> Left aligned
                  return (
                    <div key={m.id} className={styles.msgRowLeft}>
                      <div className={styles.avatarCircleSmallTimeline}>
                        {activeConv.visitor_name ? getInitials(activeConv.visitor_name) : 'V'}
                      </div>
                      <div className={styles.userBubbleLeft}>
                        <p className={styles.msgContent}>{m.content}</p>
                        <span className={styles.msgTimeLeft}>
                          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                } else {
                  // Bot or Agent -> Right aligned
                  return (
                    <div key={m.id} className={styles.msgRowRight}>
                      <div className={styles.botBubbleRight}>
                        <p className={styles.msgContent}>{m.content}</p>
                        <span className={styles.msgTimeRight}>
                          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {isBot && (
                        <div className={styles.botIconBadge} title="AI Chatbot Response">
                          <Bot size={12} />
                        </div>
                      )}
                      {isAgent && (
                        <div className={styles.agentIconBadge} title="Human Agent Response">
                          <User size={12} />
                        </div>
                      )}
                    </div>
                  );
                }
              })}
              
              {/* Manual escalation warning banner */}
              {activeConv.status === 'escalated' && (
                <div className={styles.msgRowSystem}>
                  <div className={styles.escalationWarningBanner}>
                    <AlertTriangle size={14} className={styles.warningIcon} />
                    <span>User requested human escalation. Handoff pending.</span>
                  </div>
                </div>
              )}

              <div ref={scrollRef} />
            </div>

            {/* FOOTER REPLY AREA */}
            <form className={styles.threadFooter} onSubmit={handleSendReply}>
              <div className={styles.replyBoxContainer}>
                <textarea
                  className={styles.inputFieldArea}
                  placeholder="Type a message or internal note..."
                  value={replyInput}
                  onChange={(e) => setReplyInput(e.target.value)}
                  rows={2}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendReply(e as any);
                    }
                  }}
                />
                
                <div className={styles.replyToolbar}>
                  <div className={styles.toolbarLeft}>
                    <button type="button" className={styles.toolbarBtn} aria-label="Attach file">
                      <Paperclip size={16} />
                    </button>
                    <button type="button" className={styles.toolbarBtn} aria-label="Emoji picker">
                      <Smile size={16} />
                    </button>
                    <button type="button" className={styles.toolbarBtn} aria-label="Canned responses">
                      <FileText size={16} />
                    </button>
                  </div>
                  
                  <div className={styles.toolbarRight}>
                    <button 
                      type="submit" 
                      className={styles.btnEscalate}
                      disabled={!replyInput.trim()}
                    >
                      Reply as Agent
                    </button>
                    
                    <button 
                      type="submit" 
                      className={styles.btnSendReply}
                      disabled={!replyInput.trim()}
                    >
                      <Send size={14} />
                      Send
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </>
        ) : (
          <div className={styles.noConversationSelected}>
            <MessageSquare size={44} color="var(--text-light)" style={{ marginBottom: '16px' }} />
            <h3>No Conversation Selected</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '6px' }}>
              Select a conversation from the sidebar to view dialogue timeline and override controls.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
