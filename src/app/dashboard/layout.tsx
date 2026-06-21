'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { Bot, MessageSquare, Database, Users, Plug, BarChart3, Settings, LogOut, Search } from 'lucide-react';
import { logout } from './actions';
import styles from './layout.module.css';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isSandbox, setIsSandbox] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      // Check Supabase Auth session first
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setUser(session.user);
        setIsSandbox(false);
      } else {
        // Fallback: Check local storage developer session
        const demoUserStr = localStorage.getItem('uipro_demo_user');
        if (demoUserStr) {
          setUser(JSON.parse(demoUserStr));
          setIsSandbox(true);
        } else {
          // No active session, redirect to login
          router.push('/login');
        }
      }
    }

    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('SignOut error:', e);
    }
    localStorage.clear();
    // Clear demo auth cookie to prevent middleware redirect loops
    document.cookie = 'uipro_demo_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;';
    window.location.replace('/login');
  };

  const getPageTitle = () => {
    if (pathname.includes('/chatbots')) return 'Chatbots Manager';
    if (pathname.includes('/inbox')) return 'Live Support Inbox';
    if (pathname.includes('/knowledge-base')) return 'Knowledge Base';
    if (pathname.includes('/leads')) return 'Leads & Contacts';
    if (pathname.includes('/integrations')) return 'API & Integrations';
    if (pathname.includes('/analytics')) return 'Performance Analytics';
    if (pathname.includes('/settings')) return 'Workspace Settings';
    return 'Dashboard';
  };

  const getSearchPlaceholder = () => {
    if (pathname.includes('/chatbots')) return 'Search chatbots...';
    if (pathname.includes('/inbox')) return 'Search conversations...';
    if (pathname.includes('/knowledge-base')) return 'Search sources...';
    if (pathname.includes('/leads')) return 'Search leads...';
    if (pathname.includes('/integrations')) return 'Search integrations...';
    if (pathname.includes('/analytics')) return 'Search metrics...';
    if (pathname.includes('/settings')) return 'Search settings...';
    return 'Search...';
  };

  // Render layout and children immediately to bypass blocked loading state

  return (
    <div className={styles.layoutContainer}>
      {/* SIDEBAR NAVIGATION */}
      <aside className={styles.sidebar}>
        <div className={styles.logoArea}>
          <div className={styles.logoIcon}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'translateY(-0.5px)' }}>
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
          </div>
          <div className={styles.logoTextContainer}>
            <span className={styles.logoText}>SupportAI</span>
            <span className={styles.logoSubtext}>Enterprise</span>
          </div>
        </div>

        <nav className={styles.navSection}>
          <Link 
            href="/dashboard/chatbots" 
            className={`${styles.navLink} ${pathname.includes('/chatbots') ? styles.activeNavLink : ''}`}
          >
            <Bot size={18} className={styles.navIcon} />
            <div className={styles.navTextContainer}>
              <span className={styles.navLabel}>Chatbots</span>
              <span className={styles.navSubtitle}>Manage system prompts & widgets</span>
            </div>
          </Link>
          
          <Link 
            href="/dashboard/inbox" 
            className={`${styles.navLink} ${pathname.includes('/inbox') ? styles.activeNavLink : ''}`}
          >
            <MessageSquare size={18} className={styles.navIcon} />
            <div className={styles.navTextContainer}>
              <span className={styles.navLabel}>Live Inbox</span>
              <span className={styles.navSubtitle}>Manually intervene & takeover</span>
            </div>
          </Link>

          <Link 
            href="/dashboard/knowledge-base" 
            className={`${styles.navLink} ${pathname.includes('/knowledge-base') ? styles.activeNavLink : ''}`}
          >
            <Database size={18} className={styles.navIcon} />
            <div className={styles.navTextContainer}>
              <span className={styles.navLabel}>Knowledge Base</span>
              <span className={styles.navSubtitle}>Train AI on URLs and Documents</span>
            </div>
          </Link>

          <Link 
            href="/dashboard/leads" 
            className={`${styles.navLink} ${pathname.includes('/leads') ? styles.activeNavLink : ''}`}
          >
            <Users size={18} className={styles.navIcon} />
            <div className={styles.navTextContainer}>
              <span className={styles.navLabel}>Leads</span>
              <span className={styles.navSubtitle}>Captured emails and visitor contacts</span>
            </div>
          </Link>

          <Link 
            href="/dashboard/integrations" 
            className={`${styles.navLink} ${pathname.includes('/integrations') ? styles.activeNavLink : ''}`}
          >
            <Plug size={18} className={styles.navIcon} />
            <div className={styles.navTextContainer}>
              <span className={styles.navLabel}>Integrations</span>
              <span className={styles.navSubtitle}>API keys & Webhooks</span>
            </div>
          </Link>

          <Link 
            href="/dashboard/analytics" 
            className={`${styles.navLink} ${pathname.includes('/analytics') ? styles.activeNavLink : ''}`}
          >
            <BarChart3 size={18} className={styles.navIcon} />
            <div className={styles.navTextContainer}>
              <span className={styles.navLabel}>Analytics</span>
              <span className={styles.navSubtitle}>View usage & chat metrics</span>
            </div>
          </Link>
        </nav>

        {/* BOTTOM NAV LINKS */}
        <div className={styles.bottomNavSection}>
          <Link 
            href="/dashboard/settings" 
            className={`${styles.navLink} ${pathname.includes('/settings') ? styles.activeNavLink : ''}`}
          >
            <Settings size={18} className={styles.navIcon} />
            <div className={styles.navTextContainer}>
              <span className={styles.navLabel}>Settings</span>
              <span className={styles.navSubtitle}>Workspace & team settings</span>
            </div>
          </Link>
          
          <div className={styles.divider}></div>
          
          <button className={styles.logoutBtn} onClick={handleLogout}>
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      {/* MAIN PANEL */}
      <div className={styles.mainContent}>
        <header className={styles.header}>
          <h2 className={styles.headerTitle}>{getPageTitle()}</h2>
          
          <div className={styles.headerRight}>
            <div className={styles.searchBar}>
              <Search size={16} className={styles.searchIcon} />
              <input 
                type="text" 
                placeholder={getSearchPlaceholder()} 
                className={styles.searchInput} 
                aria-label={getSearchPlaceholder()}
              />
            </div>
            
            {isSandbox && (
              <span className={styles.userBadge} title="Environment is running in test mode">
                Sandbox Mode
              </span>
            )}
            
            <div 
              className={styles.profileAvatarBadge} 
              title={user?.email || 'User Session'}
              aria-label="User profile"
            >
              {(user?.email || 'U').charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <div className={styles.contentBody}>
          {children}
        </div>
      </div>
    </div>
  );
}
