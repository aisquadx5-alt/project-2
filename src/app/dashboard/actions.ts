'use server';

import { createClient } from '@/lib/supabase/server';
import { createServerClient } from '@supabase/ssr';
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

export async function createChatbotAction(formData: FormData) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
      },
    }
  );

  // 1. Get current logged-in user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error("You must be logged in to create a chatbot.");
  }

  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const systemPrompt = formData.get('system_prompt') as string;
  const status = formData.get('status') as string;
  const widgetColor = formData.get('widget_color') as string;
  const domainAllowlist = formData.get('domain_allowlist') as string;
  const preChatEnabled = formData.get('pre_chat_enabled') === 'true';
  const preChatFieldsStr = formData.get('pre_chat_fields') as string;
  const preChatFields = preChatFieldsStr ? JSON.parse(preChatFieldsStr) : { name: true, email: true };
  const welcomeMessage = formData.get('welcome_message') as string;
  const toneOfVoice = formData.get('tone_of_voice') as string;
  const starterQuestionsStr = formData.get('starter_questions') as string;
  const starterQuestions = starterQuestionsStr ? JSON.parse(starterQuestionsStr) : [];

  // Try user_id first, fallback to owner_id if column does not exist
  const insertPayload: any = { 
    name: name || 'New Chatbot',
    description: description || '',
    system_prompt: systemPrompt || '',
    status: status || 'active',
    widget_color: widgetColor || '#7C3AED',
    domain_allowlist: domainAllowlist || '*',
    pre_chat_enabled: preChatEnabled,
    pre_chat_fields: preChatFields,
    welcome_message: welcomeMessage || 'Hi! How can we help you today?',
    tone_of_voice: toneOfVoice || 'professional',
    starter_questions: starterQuestions,
    user_id: user.id,
  };

  let { data, error } = await supabase
    .from('chatbots')
    .insert([insertPayload])
    .select()
    .single();

  if (error && (error.message.includes('column "user_id" does not exist') || error.code === '42703')) {
    delete insertPayload.user_id;
    insertPayload.owner_id = user.id;

    const fallbackResult = await supabase
      .from('chatbots')
      .insert([insertPayload])
      .select()
      .single();

    data = fallbackResult.data;
    error = fallbackResult.error;
  }

  if (error) {
    console.error("Supabase Insert Error:", error);
    throw new Error(error.message);
  }

  return data;
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
        name: botPayload.name || 'AI Support Agent',
        description: botPayload.description || '',
        system_prompt: botPayload.system_prompt || 'You are a helpful assistant.',
        status: botPayload.status || 'active',
        widget_color: botPayload.widget_color || '#7C3AED',
        domain_allowlist: botPayload.domain_allowlist || '*',
        pre_chat_enabled: botPayload.pre_chat_enabled ?? false,
        pre_chat_fields: botPayload.pre_chat_fields || { name: true, email: true },
        welcome_message: botPayload.welcome_message || 'Hi! How can we help you today?',
        tone_of_voice: botPayload.tone_of_voice || 'professional',
        starter_questions: botPayload.starter_questions || [],
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

