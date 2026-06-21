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
  // Safe fallback configuration variables: generate a real UUID if sessionId is missing/invalid
  const safeSessionId = useMemo(() => {
    if (sessionId && sessionId.length === 36 && sessionId.split('-').length === 5) return sessionId;
    if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
      try {
        return window.crypto.randomUUID();
      } catch {}
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }, [sessionId]);
  const safeChatbot = chatbot || {} as any;
  const widgetColor = (safeChatbot?.widget_color || (safeChatbot as any)?.branding_color || '#7C3AED').trim();
  const chatbotName = (safeChatbot?.name || 'AI Support Agent').trim();
  const welcomeMessage = (safeChatbot?.welcome_message || 'Hi! How can we help you today?').trim();
  const preChatFields = safeChatbot?.pre_chat_fields || { name: true, email: true };
  const preChatEnabled = safeChatbot?.pre_chat_enabled || false;
  const starterQuestions = safeChatbot?.starter_questions || [];
  const avatarUrl = safeChatbot?.avatar_url || null;

  const [isOpen, setIsOpen] = useState(true); // Force widget open for the presentation
  const [isInitialized, setIsInitialized] = useState(false);
  const [conversation, setConversation] = useState<any>(null);
  const [showPreChat, setShowPreChat] = useState(false);
  const [preChatData, setPreChatData] = useState({ name: '', email: '' });
  const [isBotPaused, setIsBotPaused] = useState(false);
  const [isEscalated, setIsEscalated] = useState(false);
  const [localInput, setLocalInput] = useState('');
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initialize Visitor Supabase Client (RLS secured with x-session-id header)
  const visitorSupabase = useMemo(() => {
    return createVisitorSupabaseClient(safeSessionId);
  }, [safeSessionId]);

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
      chatbotId: safeChatbot.id,
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
    if (!visitorSupabase) return null;

    const userAgent = typeof window !== 'undefined' ? navigator.userAgent : '';
    const browserName = userAgent.includes('Chrome') ? 'Chrome' : 
                        userAgent.includes('Safari') ? 'Safari' : 
                        userAgent.includes('Firefox') ? 'Firefox' : 'Browser';

    try {
      const { data: newConv, error } = await visitorSupabase
        .from('conversations')
        .insert({
          chatbot_id: safeChatbot.id,
          session_id: safeSessionId,
          visitor_name: name || null,
          visitor_email: email || null,
          browser: browserName,
          page_url: initialHostUrl || '',
        })
        .select()
        .single();

      if (error) {
        console.error('Database conversation initialization failed:', error);
        alert('Database conversation initialization failed: ' + error.message);
        return null;
      }

      if (newConv) {
        setConversation(newConv);
        setShowPreChat(false);
        return newConv;
      }
    } catch (err: any) {
      console.error('Error creating conversation:', err);
      alert('Error creating conversation: ' + err.message);
    }
    return null;
  };

  // 1. Initial Load: Check if conversation exists
  useEffect(() => {
    async function loadSession() {
      if (!visitorSupabase) {
        setIsInitialized(true);
        return;
      }

      const { data: existingConv, error } = await visitorSupabase
        .from('conversations')
        .select('*')
        .eq('session_id', safeSessionId)
        .eq('chatbot_id', safeChatbot.id)
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
        if (preChatEnabled) {
          setShowPreChat(true);
        } else {
          await createConversation();
        }
      }
      setIsInitialized(true);
    }

    loadSession();
  }, [safeSessionId, safeChatbot.id]);

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
    console.log("Send Button Clicked. Input (useChat):", input, "localInput:", localInput);
    const userMsgContent = localInput;
    if (!(userMsgContent || '').trim() || !visitorSupabase) return;

    try {
      let activeConv = conversation;
      
      // If conversation is missing, gracefully create a new one first!
      if (!activeConv?.id) {
        activeConv = await createConversation();
        if (!activeConv?.id) {
          throw new Error("Unable to establish chat session with the server.");
        }
      }

      if (isBotPaused) {
        setLocalInput('');
        setInput('');
        
        // Add user message to UI immediately
        const tempId = generateTempId();
        setMessages((prev: any) => [
          ...prev,
          { id: tempId, role: 'user', content: userMsgContent, createdAt: new Date() }
        ]);

        // Save user message to Supabase (agent will reply to this)
        const { error: insertError } = await visitorSupabase
          .from('messages')
          .insert({
            conversation_id: activeConv.id,
            sender: 'user',
            content: userMsgContent
          });

        if (insertError) {
          throw new Error("Failed to save message to database: " + insertError.message);
        }
      } else {
        // Standard AI stream submit
        try {
          console.log("Attempting to send message via append...");
          await append({
            role: 'user',
            content: userMsgContent,
          }, {
            body: {
              conversationId: activeConv.id,
              chatbotId: safeChatbot.id,
            }
          } as any);
          console.log("Message successfully sent via append.");
        } catch (appendErr: any) {
          console.warn("append failed, trying handleSubmit fallback:", appendErr);
          handleSubmit(e, {
            body: {
              conversationId: activeConv.id,
              chatbotId: safeChatbot.id,
            }
          } as any);
        }
        setLocalInput('');
        setInput(''); // Clear input manually
      }
    } catch (err: any) {
      console.error("Error in handleSendMessage:", err);
      alert("Error sending message: " + err.message + "\nStack: " + err.stack);
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
    return <div style={{ color: '#ffffff', padding: '24px', textAlign: 'center', fontWeight: 'bold', fontFamily: 'sans-serif' }}>Loading support chat...</div>;
  }

  // Force chat window open unconditionally inside this iframe view for the presentation
  // (We do not render the minimized bubble launcher button inside the iframe)

  console.log("WidgetClient Render. Input:", input, "localInput:", localInput);

  // EXPANDED STATE (Chat Window)
  return (
    <div className={styles.chatWindow} style={{ backgroundColor: '#ffffff', color: '#000000' }}>
      {/* HEADER */}
      <header className={styles.chatHeader} style={{ backgroundColor: widgetColor, color: '#ffffff' }}>
        <div className={styles.headerInfo}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className={styles.avatar} />
          ) : (
            <div className={styles.defaultAvatar}>
              <Bot size={18} color="#ffffff" />
            </div>
          )}
          <div>
            <h4 className={styles.chatbotName}>{chatbotName}</h4>
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
      <div className={styles.chatBody} style={{ backgroundColor: '#ffffff', color: '#000000' }}>
        {showPreChat ? (
          // PRE-CHAT FORM
          <form className={styles.preChatForm} onSubmit={handlePreChatSubmit}>
            <p className={styles.preChatIntro}>
              Welcome! Please fill in your details to begin the chat.
            </p>
            {preChatFields.name && (
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
            {preChatFields.email && (
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
              style={{ backgroundColor: widgetColor }}
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
                style={{ backgroundColor: widgetColor }}
              >
                {welcomeMessage}
              </div>
            </div>

            {/* Icebreaker starter questions */}
            {messages.length === 0 && starterQuestions && starterQuestions.length > 0 && (
              <div className={styles.starterQuestionsContainer}>
                {starterQuestions.map((q: string, idx: number) => (
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
                    style={isUser ? { backgroundColor: '#f3f4f6', color: '#000000' } : { backgroundColor: widgetColor, color: '#ffffff' }}
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
                  style={{ backgroundColor: widgetColor, height: '38px', display: 'flex', alignItems: 'center' }}
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
        <div className={styles.chatFooter} style={{ backgroundColor: '#ffffff' }}>
          <form className={styles.chatInputContainer} onSubmit={handleSendMessage} style={{ backgroundColor: '#ffffff' }}>
            <input
              type="text"
              className={styles.chatInput}
              placeholder={isBotPaused ? "Message agent..." : "Type your message..."}
              value={localInput}
              onChange={(e) => {
                setLocalInput(e.target.value);
                handleInputChange(e);
              }}
              disabled={showPreChat}
              style={{ backgroundColor: '#ffffff', color: '#000000', border: '1px solid #e5e7eb' }}
            />
            <button 
              type="submit" 
              className={styles.sendBtn}
              style={{ backgroundColor: widgetColor }}
              disabled={!localInput.trim()}
              aria-label="Send Message"
            >
              <Send size={16} color="#ffffff" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
