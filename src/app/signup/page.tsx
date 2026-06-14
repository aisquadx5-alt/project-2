'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signup } from './actions';
import { Bot, HelpCircle, ArrowRight } from 'lucide-react';
import styles from './signup.module.css';

export default function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(false);
    setError('');
    setSuccessMsg('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append('fullName', fullName);
    formData.append('email', email);
    formData.append('password', password);

    try {
      const res = await signup(formData);

      if (res.error) {
        setError(res.error);
        return;
      }

      if (res.success) {
        if (res.sandbox) {
          localStorage.setItem(
            'uipro_demo_user',
            JSON.stringify({ email: res.email, name: res.fullName })
          );
          router.push('/dashboard/chatbots');
          router.refresh();
        } else {
          setSuccessMsg(
            'Registration successful! Please check your email inbox to confirm your account.'
          );
          // Clear form inputs
          setFullName('');
          setEmail('');
          setPassword('');
        }
      }
    } catch (err: any) {
      setError('An error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.signupContainer}>
      <div className={styles.signupCard}>
        <div className={styles.header}>
          <div className={styles.logo}>
            <Bot size={24} color="#ffffff" />
          </div>
          <h2 className={styles.title}>Create Workspace</h2>
          <p className={styles.subtitle}>Set up your enterprise chatbot platform</p>
        </div>

        {successMsg ? (
          <div style={{ textAlign: 'center' }}>
            <p className={styles.successText}>{successMsg}</p>
            <div className={styles.footerLink} style={{ marginTop: '24px' }}>
              <Link href="/login">Proceed to Sign In</Link>
            </div>
          </div>
        ) : (
          <form className={styles.form} onSubmit={handleSignup}>
            <div className={styles.formGroup}>
              <label htmlFor="fullName">Full Name</label>
              <input
                id="fullName"
                type="text"
                required
                placeholder="e.g. John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                required
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="password">Password (min 6 characters)</label>
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
              {loading ? 'Creating account...' : 'Create Account'}
              <ArrowRight size={16} />
            </button>
          </form>
        )}

        {!successMsg && (
          <>
            <div className={styles.footerLink}>
              Already have an account?
              <Link href="/login">Sign In</Link>
            </div>

            <div className={styles.infoBox}>
              <HelpCircle size={16} className={styles.infoIcon} />
              <div className={styles.infoText}>
                <strong>Developer Note:</strong> Creating an account registers you in Supabase. Falls back to <strong>Sandbox Mode</strong> if Supabase is unconfigured.
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
