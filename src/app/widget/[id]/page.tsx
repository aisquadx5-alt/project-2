import { headers } from 'next/headers';
import { supabase } from '@/lib/supabase';
import WidgetClient from './WidgetClient';
import styles from './widget.module.css';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sessionId?: string; url?: string }>;
}

export default async function WidgetPage({ params, searchParams }: Props) {
  const { id: chatbotId } = await params;
  const { sessionId, url: hostUrl } = await searchParams;

  if (!chatbotId) {
    return (
      <div className={styles.errorContainer}>
        <h3>Invalid Widget Configuration</h3>
        <p>Chatbot ID is missing.</p>
      </div>
    );
  }

  // 1. Fetch Chatbot configuration
  const { data: chatbot, error: chatbotError } = await supabase
    .from('chatbots')
    .select('*')
    .eq('id', chatbotId)
    .single();

  if (chatbotError || !chatbot) {
    return (
      <div className={styles.errorContainer}>
        <h3>Chatbot Not Found</h3>
        <p>The requested chatbot configuration does not exist.</p>
      </div>
    );
  }

  if (chatbot.status !== 'active') {
    return (
      <div className={styles.errorContainer}>
        <h3>Widget Offline</h3>
        <p>This customer support agent is currently offline.</p>
      </div>
    );
  }

  // 2. Performance-safe Domain Allowlist Validation
  // Read referer headers server-side
  const headersList = await headers();
  const referer = headersList.get('referer');
  let requestHost: string | null = null;
  
  if (referer) {
    try {
      requestHost = new URL(referer).hostname;
    } catch {
      requestHost = null;
    }
  }

  const allowlist = chatbot.domain_allowlist
    .split(',')
    .map((d: string) => d.trim().toLowerCase());

  const isDomainAllowed =
    allowlist.includes('*') ||
    (requestHost && allowlist.includes(requestHost.toLowerCase())) ||
    (requestHost && requestHost === 'localhost') ||
    !requestHost; // Allow direct access for testing/debugging if referer is missing

  if (!isDomainAllowed) {
    return (
      <div className={styles.errorContainer}>
        <h3>Blocked Domain</h3>
        <p>This website is not authorized to host this support chat widget.</p>
      </div>
    );
  }

  // 3. Render the client widget container passing validated configuration
  return (
    <main className={styles.widgetMain}>
      <WidgetClient
        chatbot={chatbot}
        sessionId={sessionId || ''}
        initialHostUrl={hostUrl || ''}
      />
    </main>
  );
}
