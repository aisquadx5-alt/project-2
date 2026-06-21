'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize strictly client-side
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ChatbotManagerUI() {
  const [bots, setBots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBots = async () => {
    const { data, error } = await supabase.from('chatbots').select('*').order('created_at', { ascending: false });
    if (data) setBots(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchBots();
  }, []);

  // Expose this so the Create Modal can refresh the list!
  if (typeof window !== 'undefined') {
    (window as any).refreshBots = fetchBots;
  }

  if (loading) return <div>Loading live database...</div>;

  return (
    <div>
      {/* DEBUG: Uncomment next line if UI still doesn't show to prove data exists */}
      {/* <pre className="text-xs text-red-500">{JSON.stringify(bots, null, 2)}</pre> */}
      
      <div className="grid grid-cols-2 gap-4">
        {bots.map(bot => (
          <div key={bot.id} className="p-4 border rounded">
            <h3>{bot.name}</h3>
            <code>ID: {bot.id}</code>
          </div>
        ))}
      </div>
    </div>
  );
}
