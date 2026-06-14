import { createOpenAI } from '@ai-sdk/openai';

// Create a custom OpenAI provider instance configured for OpenRouter
export const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || '',
  baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
  headers: {
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    'X-Title': 'AI Customer Support Chatbot Platform',
  },
});
