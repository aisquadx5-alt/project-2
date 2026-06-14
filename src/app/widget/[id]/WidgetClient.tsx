'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useChat } from '@ai-sdk/react';
import { createVisitorSupabaseClient } from '@/lib/supabase';
import { MessageCircle, X, Send, Bot, AlertCircle } from 'lucide-react';
import styles from './widget.module.css';

interface ChatbotConfig {
  id: string;
  name: string;
  description: string;
  widget_color: string;
  avatar_url: string | null;
  pre_chat_enabled: boolean;
  pre_chat_fields: any;
  welcome_message?: string;
  starter_questions?: string[];
}

interface WidgetClientProps {
  chatbot: ChatbotConfig;
  sessionId: string;
  initialHostUrl: string;
}

function generateTempId() {
  return 'temp-' + Math.random().toString(36).substring(2, 9);
}

export default function WidgetClient({ chatbot, sessionId, initialHostUrl }: WidgetClientProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [conversation, setConversation] = useState<any>(null);
  const [showPreChat, setShowPreChat] = useState(false);
  const [preChatData, setPreChatData] = useState({ name: '', email: '' });
  const [isBotPaused, setIsBotPaused] = useState(false);
  const [isEscalated, setIsEscalated] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initialize Visitor Supabase Client (RLS secured with x-session-id header)
  const visitorSupabase = useMemo(() => {
    if (!sessionId) return null;
    return createVisitorSupabaseClient(sessionId);
  }, [sessionId]);

  // useChat hook from Vercel AI SDK
  const { 
    messages, 
    setMessages, 
    input, 
    handleInputChange, 
    handleSubmit, 
    isLoading,
    setInput,
    append
  } = useChat({
    api: '/api/chat',
    body: {
      conversationId: conversation?.id,
      chatbotId: chatbot.id,
    },
    onFinish: (message: any) => {
      // Re-fetch conversation status to check if LLM tool-calling triggered escalation
      checkConversationStatus();
    }
  } as any) as any;

  // Handler for quick-reply starter questions (icebreakers)
  const handleIcebreakerClick = async (question: string) => {
    if (!conversation?.id || !visitorSupabase) return;

    if (isBotPaused) {
      // Add user message to UI immediately
      const tempId = generateTempId();
      setMessages((prev: any) => [
        ...prev,
        { id: tempId, role: 'user', content: question, createdAt: new Date() }
      ]);

      // Save user message to Supabase (agent will reply to this)
      await visitorSupabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          sender: 'user',
          content: question
        });
    } else {
      append({
        role: 'user',
        content: question
      } as any);
    }
  };

  // Check conversation status to see if it is escalated or paused
  const checkConversationStatus = async () => {
    if (!conversation?.id || !visitorSupabase) return;
    const { data } = await visitorSupabase
      .from('conversations')
      .select('status, is_bot_paused')
      .eq('id', conversation.id)
      .single();

    if (data) {
      setIsBotPaused(data.is_bot_paused);
      setIsEscalated(data.status === 'escalated');
    }
  };

  // Helper to create conversation
  const createConversation = async (name?: string, email?: string) => {
    if (!visitorSupabase) return;

    const userAgent = typeof window !== 'undefined' ? navigator.userAgent : '';
    const browserName = userAgent.includes('Chrome') ? 'Chrome' : 
                        userAgent.includes('Safari') ? 'Safari' : 
                        userAgent.includes('Firefox') ? 'Firefox' : 'Browser';

    const { data: newConv, error } = await visitorSupabase
      .from('conversations')
      .insert({
        chatbot_id: chatbot.id,
        session_id: sessionId,
        visitor_name: name || null,
        visitor_email: email || null,
        browser: browserName,
        page_url: initialHostUrl || '',
      })
      .select()
      .single();

    if (newConv) {
      setConversation(newConv);
      setShowPreChat(false);
    } else {
      console.error('Failed to initialize conversation:', error);
    }
  };

  // 1. Initial Load: Check if conversation exists
  useEffect(() => {
    async function loadSession() {
      if (!visitorSupabase || !sessionId) return;

      const { data: existingConv, error } = await visitorSupabase
        .from('conversations')
        .select('*')
        .eq('session_id', sessionId)
        .eq('chatbot_id', chatbot.id)
        .maybeSingle();

      if (existingConv) {
        setConversation(existingConv);
        setIsBotPaused(existingConv.is_bot_paused);
        setIsEscalated(existingConv.status === 'escalated');

        // Fetch message history
        const { data: history } = await visitorSupabase
          .from('messages')
          .select('*')
          .eq('conversation_id', existingConv.id)
          .order('created_at', { ascending: true });

        if (history) {
          setMessages(
            history.map((m: any) => ({
              id: m.id,
              role: m.sender === 'user' ? 'user' : 'assistant',
              content: m.content,
              createdAt: m.created_at ? new Date(m.created_at) : new Date(),
            }))
          );
        }
      } else {
        // No conversation exists
        if (chatbot.pre_chat_enabled) {
          setShowPreChat(true);
        } else {
          await createConversation();
        }
      }
      setIsInitialized(true);
    }

    loadSession();
  }, [sessionId, chatbot.id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // 2. Realtime Subscriptions: Sync dashboard manual agent replies and overrides
  useEffect(() => {
    if (!conversation?.id || !visitorSupabase) return;

    // A. Subscribe to conversation updates (to sync agent paused/escalated flags)
    const convChannel = visitorSupabase
      .channel(`conv_updates_${conversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `id=eq.${conversation.id}`,
        },
        (payload: any) => {
          const updated = payload.new;
          setIsBotPaused(updated.is_bot_paused);
          setIsEscalated(updated.status === 'escalated');
        }
      )
      .subscribe();

    // B. Subscribe to new messages (specifically from agent/system/bot)
    const msgChannel = visitorSupabase
      .channel(`new_messages_${conversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload: any) => {
          const newMsg = payload.new;
          // Only append if it's from the agent or system (since user and streaming bot replies are handled locally)
          if (newMsg.sender === 'agent' || newMsg.sender === 'system') {
            setMessages((prev: any) => {
              // Prevent duplicates
              if (prev.some((m: any) => m.id === newMsg.id)) return prev;
              return [
                ...prev,
                {
                  id: newMsg.id,
                  role: newMsg.sender === 'agent' ? 'assistant' : 'system',
                  content: newMsg.content,
                  createdAt: newMsg.created_at ? new Date(newMsg.created_at) : new Date(),
                },
              ];
            });
          }
        }
      )
      .subscribe();

    return () => {
      visitorSupabase.removeChannel(convChannel);
      visitorSupabase.removeChannel(msgChannel);
    };
  }, [conversation?.id]);



  // Pre-chat form submit handler
  const handlePreChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createConversation(preChatData.name, preChatData.email);
  };

  // Resize container in host window
  const toggleWidget = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (typeof window !== 'undefined') {
      window.parent.postMessage(
        {
          type: 'uipro-chatbot-toggle',
          open: nextState,
        },
        '*'
      );
    }
  };

  // Custom send handler to intercept manual override (isBotPaused) state
  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || !conversation?.id || !visitorSupabase) return;

    if (isBotPaused) {
      const userMsgContent = input;
      setInput('');

      // Add user message to UI immediately
      const tempId = generateTempId();
      setMessages((prev: any) => [
        ...prev,
        { id: tempId, role: 'user', content: userMsgContent, createdAt: new Date() }
      ]);

      // Save user message to Supabase (agent will reply to this)
      await visitorSupabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          sender: 'user',
          content: userMsgContent
        });
    } else {
      // Standard AI stream submit
      handleSubmit(e);
    }
  };

  const formatTime = (date?: any) => {
    if (!date) return '';
    try {
      const d = new Date(date);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  if (!isInitialized) {
    return null;
  }

  // MINIMIZED STATE (Launcher Bubble)
  if (!isOpen) {
    return (
      <button 
        className={styles.launcherBtn}
        onClick={toggleWidget}
        style={{ backgroundColor: chatbot.widget_color }}
        aria-label="Open Chat"
      >
        <MessageCircle size={28} color="#ffffff" className={styles.launcherIcon} />
      </button>
    );
  }

  // EXPANDED STATE (Chat Window)
  return (
    <div className={styles.chatWindow}>
      {/* HEADER */}
      <header className={styles.chatHeader} style={{ backgroundColor: chatbot.widget_color }}>
        <div className={styles.headerInfo}>
          {chatbot.avatar_url ? (
            <img src={chatbot.avatar_url} alt="Avatar" className={styles.avatar} />
          ) : (
            <div className={styles.defaultAvatar}>
              <Bot size={18} color="#ffffff" />
            </div>
          )}
          <div>
            <h4 className={styles.chatbotName}>{chatbot.name}</h4>
            <div className={styles.statusIndicator}>
              <div className={styles.statusPingContainer}>
                <span className={styles.statusPing}></span>
                <span className={styles.statusDot}></span>
              </div>
              <span className={styles.statusText}>
                {isBotPaused ? 'Agent Connected' : 'Online'}
              </span>
            </div>
          </div>
        </div>
        <button className={styles.closeBtn} onClick={toggleWidget} aria-label="Minimize Chat">
          <X size={18} color="#ffffff" />
        </button>
      </header>

      {/* BODY */}
      <div className={styles.chatBody}>
        {showPreChat ? (
          // PRE-CHAT FORM
          <form className={styles.preChatForm} onSubmit={handlePreChatSubmit}>
            <p className={styles.preChatIntro}>
              Welcome! Please fill in your details to begin the chat.
            </p>
            {chatbot.pre_chat_fields.name && (
              <div className={styles.formGroup}>
                <label htmlFor="pre-chat-name">Name</label>
                <input
                  id="pre-chat-name"
                  type="text"
                  required
                  placeholder="John Doe"
                  value={preChatData.name}
                  onChange={(e) => setPreChatData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
            )}
            {chatbot.pre_chat_fields.email && (
              <div className={styles.formGroup}>
                <label htmlFor="pre-chat-email">Email</label>
                <input
                  id="pre-chat-email"
                  type="email"
                  required
                  placeholder="john@example.com"
                  value={preChatData.email}
                  onChange={(e) => setPreChatData(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
            )}
            <button 
              type="submit" 
              className={styles.submitBtn}
              style={{ backgroundColor: chatbot.widget_color }}
            >
              Start Conversation
            </button>
          </form>
        ) : (
          // CHAT STREAM
          <div className={`${styles.messageStream} chat-scroll`}>
            <div className={styles.systemMsgContainer}>
              <span className={styles.systemMsg}>Today</span>
            </div>
            
            <div className={styles.msgRowBot}>
              <div 
                className={styles.msgBubbleBot}
                style={{ backgroundColor: chatbot.widget_color }}
              >
                {chatbot.welcome_message || 'Hi! How can we help you today?'}
              </div>
            </div>

            {/* Icebreaker starter questions */}
            {messages.length === 0 && chatbot.starter_questions && chatbot.starter_questions.length > 0 && (
              <div className={styles.starterQuestionsContainer}>
                {chatbot.starter_questions.map((q: string, idx: number) => (
                  <button 
                    key={idx} 
                    type="button" 
                    className={styles.starterQuestionBtn}
                    onClick={() => handleIcebreakerClick(q)}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {messages.map((m: any) => {
              if (m.role === 'system') {
                return (
                  <div key={m.id} className={styles.systemMsgContainer}>
                    <span className={styles.systemMsg}>{m.content}</span>
                  </div>
                );
              }

              const isUser = m.role === 'user';
              return (
                <div 
                  key={m.id} 
                  className={isUser ? styles.msgRowUser : styles.msgRowBot}
                >
                  <div 
                    className={isUser ? styles.msgBubbleUser : styles.msgBubbleBot}
                    style={!isUser ? { backgroundColor: chatbot.widget_color } : undefined}
                  >
                    {m.content}
                  </div>
                  {m.createdAt && (
                    <span className={isUser ? styles.msgTimeUser : styles.msgTimeBot}>
                      {formatTime(m.createdAt)}
                    </span>
                  )}
                </div>
              );
            })}

            {/* AI LOADING/TYPING STATE */}
            {isLoading && (
              <div className={styles.msgRowBot}>
                <div 
                  className={styles.msgBubbleBot}
                  style={{ backgroundColor: chatbot.widget_color, height: '38px', display: 'flex', alignItems: 'center' }}
                >
                  <div className={styles.typingIndicator}>
                    <span className={styles.typingDot}></span>
                    <span className={styles.typingDot}></span>
                    <span className={styles.typingDot}></span>
                  </div>
                </div>
              </div>
            )}

            {/* ESCALATED BLOCK NOTICE */}
            {isEscalated && (
              <div className={styles.escalationNotice}>
                <AlertCircle size={16} className={styles.escalationIcon} />
                <p>Support requested. A human agent will message you directly in this chat.</p>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* FOOTER INPUT */}
      {!showPreChat && (
        <div className={styles.chatFooter}>
          <form className={styles.chatInputContainer} onSubmit={handleSendMessage}>
            <input
              type="text"
              className={styles.chatInput}
              placeholder={isBotPaused ? "Message agent..." : "Type your message..."}
              value={input}
              onChange={handleInputChange}
              disabled={showPreChat}
            />
            <button 
              type="submit" 
              className={styles.sendBtn}
              style={{ backgroundColor: chatbot.widget_color }}
              disabled={!input.trim() || showPreChat}
              aria-label="Send Message"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
