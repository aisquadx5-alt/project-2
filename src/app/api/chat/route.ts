import { streamText } from 'ai';
import { z } from 'zod';
import { openrouter } from '@/lib/openai-provider';
import { supabase } from '@/lib/supabase';
import { waitUntil } from '@vercel/functions';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { conversationId, chatbotId } = body;
    const message = body.message || (body.messages && body.messages.length > 0 ? body.messages[body.messages.length - 1].content : '');

    if (!conversationId || !message || !chatbotId) {
      return new Response(JSON.stringify({ error: 'Missing required parameters.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 1. Fetch Chatbot Settings and Validate Referrer/Origin
    const { data: chatbot, error: chatbotError } = await supabase
      .from('chatbots')
      .select('*')
      .eq('id', chatbotId)
      .single();

    if (chatbotError || !chatbot) {
      return new Response(JSON.stringify({ error: 'Chatbot not found.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (chatbot.status !== 'active') {
      return new Response(JSON.stringify({ error: 'Chatbot is currently inactive.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Origin/Referrer Check for Security (API protection)
    const originHeader = req.headers.get('origin');
    const refererHeader = req.headers.get('referer');
    const requestOrigin = originHeader 
      ? new URL(originHeader).hostname 
      : (refererHeader ? new URL(refererHeader).hostname : null);

    const allowlist = chatbot.domain_allowlist.split(',').map((d: string) => d.trim().toLowerCase());
    
    const isDomainAllowed = allowlist.includes('*') || 
      (requestOrigin && allowlist.includes(requestOrigin.toLowerCase())) ||
      (requestOrigin && requestOrigin === 'localhost'); // Allow localhost for development

    if (!isDomainAllowed) {
      return new Response(JSON.stringify({ error: 'Unauthorized domain. API access blocked.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Fetch Conversation Status (Agent Lockout check)
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      return new Response(JSON.stringify({ error: 'Conversation not found.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // If bot is paused (agent active), ignore and do not reply
    if (conversation.is_bot_paused) {
      return new Response(
        JSON.stringify({ 
          error: 'Bot is paused. A support agent has manual control.',
          isBotPaused: true 
        }), 
        {
          status: 200, // Return 200 so UI can gracefully display paused status
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 3. Save User Message to Supabase (synchronously before starting AI completion)
    const { error: msgSaveError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender: 'user',
        content: message
      });

    if (msgSaveError) {
      console.error('Failed to save user message:', msgSaveError);
      return new Response(JSON.stringify({ error: 'Failed to write message to database.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 4. Retrieve message history (sliding context window - last 12 messages)
    const { data: history, error: historyError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(12);

    if (historyError) {
      console.error('Failed to retrieve chat history:', historyError);
    }

    // Reverse history to keep chronological order
    const sortedHistory = (history || []).reverse();

    // Map history to SDK CoreMessage format
    const messages = sortedHistory.map((m) => ({
      role: m.sender === 'user' ? ('user' as const) : ('assistant' as const),
      content: m.content,
    }));

    // Retrieve RAG document context (Text-matching fallback RAG, robust in both local sandbox and production)
    let ragContext = '';
    try {
      const { data: docs } = await supabase
        .from('chatbot_documents')
        .select('content, filename')
        .eq('chatbot_id', chatbotId);
      
      if (docs && docs.length > 0) {
        // Simple text-matching fallback RAG
        const userKeywords = message.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);
        const matchingChunks = docs.filter(doc => {
          const docText = doc.content.toLowerCase();
          return userKeywords.some((kw: string) => docText.includes(kw));
        }).slice(0, 3); // top 3 chunks
        
        if (matchingChunks.length > 0) {
          ragContext = `\n\n[Knowledge Base Context]\nHere is some relevant context from the company's knowledge base:\n${matchingChunks.map(c => `[From Document: ${c.filename}]\n${c.content}`).join('\n\n')}\nUse the above context to answer the user's query. If the answer cannot be found in the context, answer generally or ask for clarification.`;
        }
      }
    } catch (ragError) {
      console.error('RAG context retrieval failed:', ragError);
    }

    // Combine Base System Prompt, Tone instruction, and RAG contexts
    const basePrompt = chatbot.system_prompt || 'You are a helpful customer support assistant.';
    const tone = chatbot.tone_of_voice || 'professional';
    const toneInstruction = 
      tone === 'friendly' ? 'Please maintain a warm, welcoming, and friendly tone.' :
      tone === 'casual' ? 'Please maintain a casual, conversational, and relaxed tone.' :
      tone === 'humorous' ? 'Please maintain a humorous, engaging, and witty tone. Use lighthearted humor where appropriate.' :
      'Please maintain a professional, polite, and authoritative B2B SaaS tone.';

    const systemPrompt = `${basePrompt}\n\n[Tone of Voice Rule]\n${toneInstruction}${ragContext}`;
    const modelName = 'google/gemini-2.5-flash'; // Cost-efficient standard model with tool calling

    // 5. Initialize streaming via Vercel AI SDK
    const result = streamText({
      model: openrouter(modelName),
      system: systemPrompt,
      messages: messages,
      tools: {
        escalate_to_human: {
          description: 'Escalate this conversation to a human support agent when the user requests a person, live support, representative, or is frustrated and needs human assistance.',
          parameters: z.object({
            reason: z.string().describe('The reason the user needs to speak to a human'),
          }),
          execute: async ({ reason }: { reason: string }) => {
            return { success: true, reason };
          }
        }
      } as any,
    });

    // 6. Handle Background DB saves on Finish using waitUntil()
    // This executes after the stream is sent to client, preventing serverless execution timeout.
    waitUntil(
      Promise.all([result.text, result.toolCalls]).then(async ([text, toolCalls]) => {

        const escalateCall = toolCalls.find((tc) => tc.toolName === 'escalate_to_human');

        if (escalateCall) {
          const args = (escalateCall as any).args as { reason: string };
          console.log(`[Escalating chat] Conversation: ${conversationId}. Reason: ${args.reason}`);

          // Update conversation in database
          await supabase
            .from('conversations')
            .update({ status: 'escalated', is_bot_paused: true })
            .eq('id', conversationId);

          // Add System Message notifying escalation
          await supabase
            .from('messages')
            .insert({
              conversation_id: conversationId,
              sender: 'system',
              content: 'System: Chat escalated to a human agent.'
            });

          // Add Bot's final response if any text was output before/during the tool call
          if (text && text.trim().length > 0) {
            await supabase
              .from('messages')
              .insert({
                conversation_id: conversationId,
                sender: 'bot',
                content: text
              });
          }
        } else if (text && text.trim().length > 0) {
          // Standard AI message save
          await supabase
            .from('messages')
            .insert({
              conversation_id: conversationId,
              sender: 'bot',
              content: text
            });
        }
      }).catch((err) => {
        console.error('Error in Vercel AI SDK onFinish handler:', err);
      })
    );

    // Return the response stream to the client
    return (result as any).toDataStreamResponse();
  } catch (error) {
    console.error('Error in /api/chat:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
