'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { BarChart2, MessageSquare, Clock, AlertTriangle, ArrowUpRight, TrendingUp, CheckCircle } from 'lucide-react';
import styles from './analytics.module.css';

export default function AnalyticsPage() {
  const [isSandbox, setIsSandbox] = useState(false);
  const [stats, setStats] = useState({
    conversations: 0,
    messages: 0,
    avgDuration: 0, // in minutes
    escalations: 0,
  });

  const [chatbotActivity, setChatbotActivity] = useState<any[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  useEffect(() => {
    async function loadAnalytics() {
      const demoUserStr = localStorage.getItem('uipro_demo_user');
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        setIsSandbox(false);
        // 1. Fetch conversations
        const { data: convsData } = await supabase
          .from('conversations')
          .select('id, chatbot_id, status, visitor_name, visitor_email, page_url, created_at, updated_at, chatbots ( name )');
        
        const convs = convsData as any[] | null;

        // 2. Fetch messages count
        const { count: msgCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true });

        if (convs) {
          const totalConvs = convs.length;
          const escalatedConvs = convs.filter(c => c.status === 'escalated').length;

          // Calculate average duration
          let totalDurationMs = 0;
          convs.forEach(c => {
            const start = new Date(c.created_at).getTime();
            const end = new Date(c.updated_at).getTime();
            totalDurationMs += (end - start);
          });
          const avgDurationMin = totalConvs > 0 
            ? Math.round((totalDurationMs / totalConvs) / 60000) 
            : 0;

          setStats({
            conversations: totalConvs,
            messages: msgCount || 0,
            avgDuration: Math.max(avgDurationMin, 1), // floor at 1 minute
            escalations: escalatedConvs
          });

          // Fetch chatbot distribution
          const { data: dbChatbots } = await supabase.from('chatbots').select('id, name');
          if (dbChatbots) {
            // Group by chatbot using real counts from convs
            const grouped = dbChatbots.map(b => {
              const count = convs.filter(c => c.chatbot_id === b.id).length;
              return {
                name: b.name,
                count
              };
            });
            setChatbotActivity(grouped);
          }

          // Generate real recent activity logs from convs
          const sortedConvsForLogs = [...convs].sort((a, b) => 
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          ).slice(0, 5);

          const logs = sortedConvsForLogs.map(c => {
            const visitor = c.visitor_name || c.visitor_email || 'Visitor';
            const botName = c.chatbots?.name || 'AI Bot';
            let msg = '';
            let color = 'var(--primary)';

            if (c.status === 'escalated') {
              msg = `${visitor} escalated to agent (on ${botName})`;
              color = 'var(--danger)';
            } else if (c.status === 'closed') {
              msg = `Ticket closed for ${visitor}`;
              color = 'var(--text-light)';
            } else {
              msg = `New chat started with ${visitor} on ${c.page_url || '/'}`;
              color = 'var(--secondary)';
            }

            // Calculate human-readable time difference
            const diffMs = new Date().getTime() - new Date(c.updated_at).getTime();
            const diffMin = Math.round(diffMs / 60000);
            let timeStr = 'Just now';
            if (diffMin > 0) {
              if (diffMin < 60) {
                timeStr = `${diffMin}m ago`;
              } else if (diffMin < 1440) {
                timeStr = `${Math.round(diffMin / 60)}h ago`;
              } else {
                timeStr = `${Math.round(diffMin / 1440)}d ago`;
              }
            }

            return {
              type: c.status,
              msg,
              time: timeStr,
              color
            };
          });
          setRecentLogs(logs);
        }
      } else if (demoUserStr) {
        setIsSandbox(true);
        // Seed mock stats for sandbox
        setStats({
          conversations: 54,
          messages: 238,
          avgDuration: 4,
          escalations: 8
        });

        setChatbotActivity([
          { name: 'Acme Support Agent', count: 32 },
          { name: 'Acme Billing Bot', count: 15 },
          { name: 'Sales Assistant', count: 7 }
        ]);

        setRecentLogs([
          { type: 'escalated', msg: 'Sarah Connor escalated to agent', time: '10 mins ago', color: 'var(--danger)' },
          { type: 'created', msg: 'New conversation started on /pricing', time: '15 mins ago', color: 'var(--primary)' },
          { type: 'replied', msg: 'Bot replied to visitor on /checkout', time: '22 mins ago', color: 'var(--success)' },
          { type: 'closed', msg: 'Agent closed ticket #3210', time: '1 hr ago', color: 'var(--text-light)' }
        ]);
      }
    }

    loadAnalytics();
  }, []);

  return (
    <div className={styles.container}>
      {/* STATS ROW */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.iconCircle}>
            <MessageSquare size={20} />
          </div>
          <div>
            <h3 className={styles.statValue}>{stats.conversations}</h3>
            <span className={styles.statLabel}>Total Chats</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.iconCircle} style={{ backgroundColor: 'rgba(6, 182, 212, 0.08)', color: 'var(--secondary)' }}>
            <TrendingUp size={20} />
          </div>
          <div>
            <h3 className={styles.statValue}>{stats.messages}</h3>
            <span className={styles.statLabel}>Messages Sent</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.iconCircle} style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)', color: 'var(--success)' }}>
            <Clock size={20} />
          </div>
          <div>
            <h3 className={styles.statValue}>{stats.avgDuration}m</h3>
            <span className={styles.statLabel}>Avg Duration</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.iconCircle} style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', color: 'var(--danger)' }}>
            <AlertTriangle size={20} />
          </div>
          <div>
            <h3 className={styles.statValue}>{stats.escalations}</h3>
            <span className={styles.statLabel}>Escalations</span>
          </div>
        </div>
      </div>

      {/* CHARTS SECTION */}
      <div className={styles.chartsSection}>
        {/* CHART 1: CONVERSATIONS PER BOT */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h4 className={styles.chartTitle}>Chats by Chatbot Agent</h4>
          </div>
          <div className={styles.barChart}>
            {chatbotActivity.map((item, idx) => {
              const maxCount = Math.max(...chatbotActivity.map(c => c.count), 1);
              const percentage = Math.round((item.count / maxCount) * 100);
              return (
                <div key={idx} className={styles.barRow}>
                  <span className={styles.barLabel} title={item.name}>{item.name}</span>
                  <div className={styles.barTrack}>
                    <div 
                      className={styles.barFill} 
                      style={{ 
                        width: `${percentage}%`, 
                        backgroundColor: idx === 0 ? 'var(--primary)' : idx === 1 ? 'var(--secondary)' : 'var(--primary-light)'
                      }}
                    ></div>
                  </div>
                  <span className={styles.barValue}>{item.count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* CHART 2: RECENT ACTIVITY */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h4 className={styles.chartTitle}>Recent Activity Log</h4>
          </div>
          <div className={styles.activityList}>
            {recentLogs.length > 0 ? (
              recentLogs.map((log, idx) => (
                <div key={idx} className={styles.activityItem}>
                  <span className={styles.activityDot} style={{ backgroundColor: log.color }}></span>
                  <div className={styles.activityInfo}>
                    <p className={styles.activityText}>{log.msg}</p>
                    <span className={styles.activityTime}>{log.time}</span>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-light)' }}>
                <CheckCircle size={24} style={{ marginBottom: '8px', color: 'var(--success)' }} />
                <p style={{ fontSize: '13px' }}>No recent activities found.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
