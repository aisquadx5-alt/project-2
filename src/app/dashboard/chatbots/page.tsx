import { createClient } from '@supabase/supabase-js';
import ChatbotsClientPage from './ChatbotsClientPage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Bypass auth totally to just read the public table
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function ChatbotsPage() {
  const { data: chatbots, error } = await supabase
    .from('chatbots')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <ChatbotsClientPage 
      initialChatbots={chatbots || []} 
      fetchError={error?.message || null} 
    />
  );
}
