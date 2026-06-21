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
  launcher.style.setProperty('position', 'fixed', 'important');
  launcher.style.setProperty('bottom', '20px', 'important');
  launcher.style.setProperty('right', '20px', 'important');
  launcher.style.setProperty('z-index', '999999', 'important');
  launcher.style.setProperty('border-radius', '50%', 'important');
  launcher.style.setProperty('cursor', 'pointer', 'important');
  launcher.style.setProperty('background', '#0F172A', 'important');
  launcher.style.setProperty('width', '60px', 'important');
  launcher.style.setProperty('height', '60px', 'important');
  launcher.style.setProperty('box-shadow', '0 4px 10px rgba(0,0,0,0.2)', 'important');
  launcher.style.setProperty('display', 'flex', 'important');
  launcher.style.setProperty('align-items', 'center', 'important');
  launcher.style.setProperty('justify-content', 'center', 'important');
  launcher.style.setProperty('transition', 'transform 0.2s ease', 'important');

  // SVG Chat Icon
  launcher.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
  
  launcher.onmouseover = function() {
    launcher.style.setProperty('transform', 'scale(1.05)', 'important');
  };
  launcher.onmouseout = function() {
    launcher.style.setProperty('transform', 'scale(1)', 'important');
  };

  // 2. Create Iframe Container
  const container = document.createElement('div');
  container.style.setProperty('position', 'fixed', 'important');
  container.style.setProperty('bottom', '90px', 'important');
  container.style.setProperty('right', '20px', 'important');
  container.style.setProperty('width', '350px', 'important');
  container.style.setProperty('height', '500px', 'important');
  container.style.setProperty('z-index', '999999', 'important');
  container.style.setProperty('border-radius', '12px', 'important');
  container.style.setProperty('box-shadow', '0 10px 20px rgba(0,0,0,0.2)', 'important');
  container.style.setProperty('overflow', 'hidden', 'important');
  container.style.setProperty('display', 'none', 'important');
  container.style.setProperty('border', 'none', 'important');

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
      container.style.setProperty('display', 'block', 'important');
      // Change SVG icon to X Close
      launcher.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    } else {
      container.style.setProperty('display', 'none', 'important');
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
        container.style.setProperty('display', 'none', 'important');
        launcher.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
      }
    }
  });
})();`;

  return new NextResponse(jsCode, {
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    },
  });
}
