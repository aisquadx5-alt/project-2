import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

  // 1. Create Launcher Button (Floating Circle Bubble)
  const launcher = document.createElement('div');
  launcher.style.position = 'fixed';
  launcher.style.bottom = '20px';
  launcher.style.right = '20px';
  launcher.style.zIndex = '999999';
  launcher.style.borderRadius = '50%';
  launcher.style.cursor = 'pointer';
  launcher.style.background = '#0F172A';
  launcher.style.width = '60px';
  launcher.style.height = '60px';
  launcher.style.boxShadow = '0 4px 10px rgba(0,0,0,0.2)';
  launcher.style.display = 'flex';
  launcher.style.alignItems = 'center';
  launcher.style.justifyContent = 'center';
  launcher.style.transition = 'transform 0.2s ease';

  // SVG Chat Icon
  launcher.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
  
  launcher.onmouseover = function() {
    launcher.style.transform = 'scale(1.05)';
  };
  launcher.onmouseout = function() {
    launcher.style.transform = 'scale(1)';
  };

  // 2. Create Iframe Container
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.bottom = '90px';
  container.style.right = '20px';
  container.style.width = '350px';
  container.style.height = '500px';
  container.style.zIndex = '999999';
  container.style.borderRadius = '12px';
  container.style.boxShadow = '0 10px 20px rgba(0,0,0,0.2)';
  container.style.overflow = 'hidden';
  container.style.display = 'none';
  container.style.border = 'none';

  // Create Iframe inside Container
  const iframe = document.createElement('iframe');
  const widgetUrl = '${appUrl}/widget/' + chatbotId + 
    '?sessionId=' + sessionId + 
    '&url=' + encodeURIComponent(window.location.origin + window.location.pathname);

  iframe.src = widgetUrl;
  iframe.title = 'AI Customer Support Chatbot';
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';
  iframe.style.margin = '0';
  iframe.style.padding = '0';
  iframe.style.background = 'transparent';
  iframe.style.colorScheme = 'light';
  iframe.setAttribute('allow', 'clipboard-write');

  container.appendChild(iframe);

  // Inject elements
  document.body.appendChild(launcher);
  document.body.appendChild(container);

  // 3. Toggle Logic
  let isOpen = false;
  launcher.addEventListener('click', function() {
    isOpen = !isOpen;
    if (isOpen) {
      container.style.display = 'block';
      // Change SVG icon to X Close
      launcher.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    } else {
      container.style.display = 'none';
      // Change SVG icon back to Chat Bubble
      launcher.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
    }
  });

  // Listen for close/minimize messages from within the iframe
  window.addEventListener('message', function(event) {
    const expectedOrigin = new URL('${appUrl}').origin;
    if (event.origin !== expectedOrigin) return;

    const data = event.data;
    if (data && data.type === 'uipro-chatbot-toggle') {
      // If widget minimizes inside the iframe (by clicking close button), sync state
      if (!data.open) {
        isOpen = false;
        container.style.display = 'none';
        launcher.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
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
