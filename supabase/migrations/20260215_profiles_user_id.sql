-- Add user_id column for website auth users (alongside whatsapp_user_id)
ALTER TABLE customer_profiles ADD COLUMN IF NOT EXISTS user_id TEXT;

-- Make whatsapp_user_id nullable (website users don't have one)
ALTER TABLE customer_profiles ALTER COLUMN whatsapp_user_id DROP NOT NULL;

-- Unique constraint on user_id for website users
CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_profiles_user_id
  ON customer_profiles(user_id) WHERE user_id IS NOT NULL;

-- Index for web chat history queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_web
  ON chat_messages(user_id, channel, created_at DESC);
