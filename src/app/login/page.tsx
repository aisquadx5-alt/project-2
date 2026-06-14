'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { login } from './actions';
import { Bot, HelpCircle, ArrowRight } from 'lucide-react';
import styles from './login.module.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);

    try {
      const res = await login(formData);

      if (res.error) {
        setError(res.error);
        return;
      }

      if (res.success) {
        if (res.sandbox) {
          localStorage.setItem('uipro_demo_user', JSON.stringify({ email: res.email }));
        } else {
          localStorage.removeItem('uipro_demo_user');
        }
        router.push('/dashboard/chatbots');
        router.refresh();
      }
    } catch (err: any) {
      setError('An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginCard}>
        <div className={styles.header}>
          <div className={styles.logo}>
            <Bot size={24} color="#ffffff" />
          </div>
          <h2 className={styles.title}>AI Support Platform</h2>
          <p className={styles.subtitle}>Sign in to manage your support agents</p>
        </div>

        <form className={styles.form} onSubmit={handleLogin}>
          <div className={styles.formGroup}>
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              required
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className={styles.errorText}>{error}</p>}

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
            <ArrowRight size={16} />
          </button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '13.5px', color: 'var(--text-muted)' }}>
          Don&apos;t have an account?
          <Link href="/signup" style={{ color: 'var(--primary)', fontWeight: '600', textDecoration: 'none', marginLeft: '4px' }}>
            Create workspace
          </Link>
        </div>

        <div className={styles.infoBox}>
          <HelpCircle size={16} className={styles.infoIcon} />
          <div className={styles.infoText}>
            <strong>Developer Note:</strong> Enter credentials to login. If Supabase is unconfigured, it falls back to <strong>Sandbox Mode</strong>.
          </div>
        </div>
      </div>
    </div>
  );
}
