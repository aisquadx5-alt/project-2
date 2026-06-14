-- schema.sql
-- Database schema for AI Customer Support Chatbot Platform

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================================
-- TABLES
-- =========================================================================

-- Chatbots configuration table
CREATE TABLE IF NOT EXISTS chatbots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  system_prompt TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  widget_color TEXT DEFAULT '#7C3AED',
  avatar_url TEXT,
  domain_allowlist TEXT DEFAULT '*' NOT NULL, -- comma-separated or '*'
  pre_chat_enabled BOOLEAN DEFAULT false,
  pre_chat_fields JSONB DEFAULT '{"name": true, "email": true}'::jsonb,
  welcome_message TEXT DEFAULT 'Hi! How can we help you today?',
  tone_of_voice TEXT DEFAULT 'professional',
  starter_questions JSONB DEFAULT '[]'::jsonb,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chatbot_id UUID REFERENCES chatbots(id) ON DELETE CASCADE NOT NULL,
  visitor_name TEXT,
  visitor_email TEXT,
  session_id UUID NOT NULL, -- Session token stored in client's host localStorage
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'escalated', 'closed')),
  browser TEXT,
  page_url TEXT,
  is_bot_paused BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  sender TEXT NOT NULL CHECK (sender IN ('user', 'bot', 'agent', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- =========================================================================
-- KNOWLEDGE BASE (RAG) & VECTOR EXTENSION
-- =========================================================================

-- Enable pgvector extension for similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Chatbot documents / chunks table
CREATE TABLE IF NOT EXISTS chatbot_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chatbot_id UUID REFERENCES chatbots(id) ON DELETE CASCADE NOT NULL,
  filename TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536), -- standard dimension size for OpenAI embeddings
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Match documents helper function for vector search
CREATE OR REPLACE FUNCTION match_documents (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter_chatbot_id uuid
)
RETURNS TABLE (
  id uuid,
  content text,
  filename text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    chatbot_documents.id,
    chatbot_documents.content,
    chatbot_documents.filename,
    1 - (chatbot_documents.embedding <=> query_embedding) AS similarity
  FROM chatbot_documents
  WHERE chatbot_documents.chatbot_id = filter_chatbot_id
    AND 1 - (chatbot_documents.embedding <=> query_embedding) > match_threshold
  ORDER BY chatbot_documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- =========================================================================
-- TRIGGERS & HELPERS
-- =========================================================================

-- Automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chatbots_updated_at
BEFORE UPDATE ON chatbots
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
BEFORE UPDATE ON conversations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================================================================
-- ROW LEVEL SECURITY (RLS)
-- =========================================================================

ALTER TABLE chatbots ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- -----------------
-- Chatbots Policies
-- -----------------

-- Public/anon can read chatbots (needed for the widget to load configuration)
CREATE POLICY select_chatbots_public ON chatbots
  FOR SELECT USING (true);

-- Authenticated chatbot owners have full access
CREATE POLICY owner_all_chatbots ON chatbots
  FOR ALL TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- ----------------------
-- Conversations Policies
-- ----------------------

-- Anyone can start a conversation (INSERT)
CREATE POLICY insert_conversations_public ON conversations
  FOR INSERT WITH CHECK (true);

-- Chatbot owners/agents can view all conversations for their chatbots
CREATE POLICY select_conversations_owner ON conversations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chatbots cb
      WHERE cb.id = conversations.chatbot_id AND cb.owner_id = auth.uid()
    )
  );

-- Chatbot owners/agents can update conversations (e.g. override, close, escalate)
CREATE POLICY update_conversations_owner ON conversations
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chatbots cb
      WHERE cb.id = conversations.chatbot_id AND cb.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chatbots cb
      WHERE cb.id = conversations.chatbot_id AND cb.owner_id = auth.uid()
    )
  );

-- Anonymous visitors can view their own conversation (checked via custom header 'x-session-id')
CREATE POLICY select_conversations_anon ON conversations
  FOR SELECT TO anon
  USING (
    session_id::text = COALESCE(current_setting('request.headers', true)::json->>'x-session-id', '')
  );

-- Anonymous visitors can update their own conversation metadata (e.g. updating name/email in pre-chat)
CREATE POLICY update_conversations_anon ON conversations
  FOR UPDATE TO anon
  USING (
    session_id::text = COALESCE(current_setting('request.headers', true)::json->>'x-session-id', '')
  )
  WITH CHECK (
    session_id::text = COALESCE(current_setting('request.headers', true)::json->>'x-session-id', '')
  );

-- -----------------
-- Messages Policies
-- -----------------

-- Chatbot owners/agents can view messages
CREATE POLICY select_messages_owner ON messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      JOIN chatbots cb ON c.chatbot_id = cb.id
      WHERE c.id = messages.conversation_id AND cb.owner_id = auth.uid()
    )
  );

-- Chatbot owners/agents can insert messages (manual agent replies)
CREATE POLICY insert_messages_owner ON messages
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations c
      JOIN chatbots cb ON c.chatbot_id = cb.id
      WHERE c.id = messages.conversation_id AND cb.owner_id = auth.uid()
    )
  );

-- Anonymous visitors can view messages belonging to their active session
CREATE POLICY select_messages_anon ON messages
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id 
      AND c.session_id::text = COALESCE(current_setting('request.headers', true)::json->>'x-session-id', '')
    )
  );

-- Anonymous visitors can insert messages to their own active session
CREATE POLICY insert_messages_anon ON messages
  FOR INSERT TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id 
      AND c.session_id::text = COALESCE(current_setting('request.headers', true)::json->>'x-session-id', '')
    )
  );

-- ---------------------
-- Documents Policies
-- ---------------------

ALTER TABLE chatbot_documents ENABLE ROW LEVEL SECURITY;

-- Public can select documents (needed for chatbot to query chunks during a chat session)
CREATE POLICY select_documents_public ON chatbot_documents
  FOR SELECT USING (true);

-- Chatbot owners have full access to their documents
CREATE POLICY owner_all_documents ON chatbot_documents
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chatbots cb
      WHERE cb.id = chatbot_documents.chatbot_id AND cb.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chatbots cb
      WHERE cb.id = chatbot_documents.chatbot_id AND cb.owner_id = auth.uid()
    )
  );

-- =========================================================================
-- REALTIME REPLICATION ENABLEMENT
-- =========================================================================

-- Enable realtime publications for live inbox updates
alter publication supabase_realtime add table conversations;
alter publication supabase_realtime add table messages;
