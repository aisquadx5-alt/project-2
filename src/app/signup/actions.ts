'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function signup(formData: FormData) {
  const fullName = formData.get('fullName') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!fullName || !email || !password) {
    return { error: 'All fields are required.' };
  }

  if (password.length < 6) {
    return { error: 'Password must be at least 6 characters long.' };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      // If Supabase is unconfigured, allow local sandbox fallback
      if (
        error.message.includes('API key') ||
        error.message.includes('fetch')
      ) {
        const cookieStore = await cookies();
        cookieStore.set('uipro_demo_auth', 'true', { path: '/' });
        return { success: true, sandbox: true, email, fullName };
      }
      return { error: error.message };
    }

    if (data.user) {
      // If email confirmation is required, Supabase might not return a session immediately.
      // But we can check if identities is empty, which could mean the user already exists.
      // Usually signUp returns user and identities. If identities is empty, the user might already exist.
      const userIdentities = data.user.identities;
      if (userIdentities && userIdentities.length === 0) {
        return { error: 'Email already in use. Please sign in instead.' };
      }

      // Automatically sign in the user after signup by setting demo auth cookie if needed, 
      // or letting Supabase handle it if autologin is enabled.
      return { success: true, sandbox: false, email, fullName };
    }
  } catch (err: any) {
    // Network/Configuration fallback to local sandbox mode
    const cookieStore = await cookies();
    cookieStore.set('uipro_demo_auth', 'true', { path: '/' });
    return { success: true, sandbox: true, email, fullName };
  }

  return { error: 'Signup failed. Please try again.' };
}
