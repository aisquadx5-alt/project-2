'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function logout() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch (err) {
    // Ignore signOut errors if Supabase is unconfigured
  }

  const cookieStore = await cookies();
  cookieStore.delete('uipro_demo_auth');

  redirect('/login');
}
