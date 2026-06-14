import React from 'react';
import Link from 'next/link';
import { Bot, MessageSquare, Shield, Zap, ArrowRight, Code } from 'lucide-react';
import styles from './landing.module.css';

export default function LandingPage() {
  return (
    <div className={styles.landingContainer}>
      {/* NAVBAR */}
      <nav className={styles.navbar}>
        <div className={styles.logoArea}>
          <div className={styles.logoIcon}>
            <Bot size={22} />
          </div>
          <span className={styles.logoText}>Support Center</span>
        </div>
        <Link href="/login" className="btn btn-secondary">
          Enter Dashboard
        </Link>
      </nav>

      {/* HERO SECTION */}
      <header className={styles.heroSection}>
        <span className={styles.heroTag}>AI Customer Support Platform v1.0</span>
        <h1 className={styles.heroTitle}>
          AI-Native Customer Chatbots for Your Website
        </h1>
        <p className={styles.heroSubtitle}>
          Deploy smart AI agents on your site in under 5 minutes. Pause the bot and takeover manually at any time. Isolation-secured widget, and RLS-protected visitor sessions.
        </p>

        <div className={styles.ctaGroup}>
          <Link href="/login" className={styles.btnPrimary}>
            Get Started
            <ArrowRight size={16} />
          </Link>
          <Link href="/login" className={styles.btnSecondary}>
            View Demo
          </Link>
        </div>
      </header>

      {/* FEATURES ROW */}
      <section className={styles.featuresSection}>
        <h2 className={styles.sectionTitle}>Engineered for Modern Teams</h2>
        <div className={styles.grid}>
          {/* Feature 1 */}
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <Bot size={22} />
            </div>
            <h3 className={styles.featureTitle}>Chatbot Manager</h3>
            <p className={styles.featureDesc}>
              Configure your system prompts, customize colors, set avatars, and lock down unauthorized embeds using domain allowlists.
            </p>
          </div>

          {/* Feature 2 */}
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <MessageSquare size={22} />
            </div>
            <h3 className={styles.featureTitle}>Live inbox & Takeover</h3>
            <p className={styles.featureDesc}>
              WhatsApp Web-style inbox. Intervene manually to text customers directly, which automatically pauses the AI chatbot to prevent double replies.
            </p>
          </div>

          {/* Feature 3 */}
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <Code size={22} />
            </div>
            <h3 className={styles.featureTitle}>Secure Iframe Embed</h3>
            <p className={styles.featureDesc}>
              Loader dynamically builds and streams the widget inside a sandboxed iframe. Stores session keys on the host domain to prevent Safari cross-origin blocks.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className={styles.footer}>
        <p>© 2026 AI Support Center. Designed for high performance, accessibility, and robust security.</p>
      </footer>
    </div>
  );
}
