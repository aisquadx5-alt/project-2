import { NextResponse } from 'next/server';

export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const jsCode = `(function() {
  // Prevent duplicate loading
  if (window.__uipro_chatbot_loaded) return;
  window.__uipro_chatbot_loaded = true;

  // Find script element and extract chatbot ID
  const scriptTag = document.currentScript || document.querySelector('script[src*="widget.js"]');
  if (!scriptTag) {
    console.error('UI/UX Pro Max Chatbot: Script tag not found. Make sure the script is loaded properly.');
    return;
  }

  const scriptUrl = new URL(scriptTag.src);
  const chatbotId = scriptUrl.searchParams.get('id');
  if (!chatbotId) {
    console.error('UI/UX Pro Max Chatbot: Missing chatbot "id" query parameter.');
    return;
  }

  // Workaround Safari third-party session/cookie blocking by storing sessionId on the host domain
  const storageKey = 'uipro_chatbot_session_' + chatbotId;
  let sessionId = localStorage.getItem(storageKey);
  if (!sessionId) {
    // Generate a secure V4 UUID
    sessionId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
    localStorage.setItem(storageKey, sessionId);
  }

  // Create iframe element
  const iframe = document.createElement('iframe');
  const widgetUrl = '${appUrl}/widget/' + chatbotId + 
    '?sessionId=' + sessionId + 
    '&url=' + encodeURIComponent(window.location.origin + window.location.pathname);

  iframe.src = widgetUrl;
  iframe.title = 'AI Customer Support Chatbot';
  iframe.style.position = 'fixed';
  iframe.style.bottom = '20px';
  iframe.style.right = '20px';
  iframe.style.width = '90px';
  iframe.style.height = '90px';
  iframe.style.border = 'none';
  iframe.style.zIndex = '999999';
  iframe.style.transition = 'width 0.3s ease, height 0.3s ease, transform 0.2s ease';
  iframe.style.background = 'transparent';
  iframe.style.colorScheme = 'light';
  iframe.setAttribute('allow', 'clipboard-write');

  document.body.appendChild(iframe);

  // Listen for resize and toggle messages from the iframe
  window.addEventListener('message', function(event) {
    // Basic source origin check (must match our app URL)
    const expectedOrigin = new URL('${appUrl}').origin;
    if (event.origin !== expectedOrigin) return;

    const data = event.data;
    if (data && data.type === 'uipro-chatbot-toggle') {
      if (data.open) {
        // Expanded chat state
        // Check if mobile screen size for responsive sizing
        if (window.innerWidth < 480) {
          iframe.style.width = '100%';
          iframe.style.height = '100%';
          iframe.style.bottom = '0';
          iframe.style.right = '0';
        } else {
          iframe.style.width = '390px';
          iframe.style.height = '620px';
          iframe.style.bottom = '20px';
          iframe.style.right = '20px';
        }
      } else {
        // Closed/bubble launcher state
        iframe.style.width = '90px';
        iframe.style.height = '90px';
        iframe.style.bottom = '20px';
        iframe.style.right = '20px';
      }
    }
  });

  // Handle window resizing to keep it responsive
  window.addEventListener('resize', function() {
    // Only resize if the iframe is currently expanded
    if (iframe.style.width === '100%' || parseFloat(iframe.style.width) > 90) {
      if (window.innerWidth < 480) {
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.bottom = '0';
        iframe.style.right = '0';
      } else {
        iframe.style.width = '390px';
        iframe.style.height = '620px';
        iframe.style.bottom = '20px';
        iframe.style.right = '20px';
      }
    }
  });
})();`;

  return new NextResponse(jsCode, {
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=600',
    },
  });
}
