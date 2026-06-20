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

export async function createChatbot(botPayload: {
  name: string;
  description: string;
  system_prompt: string;
  status: 'active' | 'inactive';
  widget_color: string;
  domain_allowlist: string;
  pre_chat_enabled: boolean;
  pre_chat_fields: { name: boolean; email: boolean };
  welcome_message: string;
  tone_of_voice: string;
  starter_questions: string[];
}) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { error: 'Unauthorized: No active user session.' };
    }

    const { data, error } = await supabase
      .from('chatbots')
      .insert({
        name: botPayload.name,
        description: botPayload.description,
        system_prompt: botPayload.system_prompt,
        status: botPayload.status,
        widget_color: botPayload.widget_color,
        domain_allowlist: botPayload.domain_allowlist,
        pre_chat_enabled: botPayload.pre_chat_enabled,
        pre_chat_fields: botPayload.pre_chat_fields,
        welcome_message: botPayload.welcome_message,
        tone_of_voice: botPayload.tone_of_voice,
        starter_questions: botPayload.starter_questions,
        owner_id: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting chatbot:', error);
      return { error: error.message };
    }

    return { success: true, chatbot: data };
  } catch (err: any) {
    console.error('Unexpected error in createChatbot:', err);
    return { error: err.message || 'An unexpected error occurred.' };
  }
}

export async function updateChatbot(id: string, botPayload: {
  name: string;
  description: string;
  system_prompt: string;
  status: 'active' | 'inactive';
  widget_color: string;
  domain_allowlist: string;
  pre_chat_enabled: boolean;
  pre_chat_fields: { name: boolean; email: boolean };
  welcome_message: string;
  tone_of_voice: string;
  starter_questions: string[];
}) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { error: 'Unauthorized: No active user session.' };
    }

    const { data, error } = await supabase
      .from('chatbots')
      .update({
        name: botPayload.name,
        description: botPayload.description,
        system_prompt: botPayload.system_prompt,
        status: botPayload.status,
        widget_color: botPayload.widget_color,
        domain_allowlist: botPayload.domain_allowlist,
        pre_chat_enabled: botPayload.pre_chat_enabled,
        pre_chat_fields: botPayload.pre_chat_fields,
        welcome_message: botPayload.welcome_message,
        tone_of_voice: botPayload.tone_of_voice,
        starter_questions: botPayload.starter_questions,
      })
      .eq('id', id)
      .eq('owner_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating chatbot:', error);
      return { error: error.message };
    }

    return { success: true, chatbot: data };
  } catch (err: any) {
    console.error('Unexpected error in updateChatbot:', err);
    return { error: err.message || 'An unexpected error occurred.' };
  }
}

export async function deleteChatbot(id: string) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { error: 'Unauthorized: No active user session.' };
    }

    const { error } = await supabase
      .from('chatbots')
      .delete()
      .eq('id', id)
      .eq('owner_id', user.id);

    if (error) {
      console.error('Error deleting chatbot:', error);
      return { error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Unexpected error in deleteChatbot:', err);
    return { error: err.message || 'An unexpected error occurred.' };
  }
}

