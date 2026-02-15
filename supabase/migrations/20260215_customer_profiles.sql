-- Customer profiles for persistent preferences
CREATE TABLE IF NOT EXISTS customer_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  whatsapp_user_id UUID NOT NULL REFERENCES whatsapp_users(id) ON DELETE CASCADE,
  customer_name TEXT,
  company_name TEXT,
  brand_colors TEXT,
  preferred_styles TEXT,
  favorite_backgrounds TEXT,
  image_format_preferences TEXT,
  address_form TEXT DEFAULT 'Du',
  special_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(whatsapp_user_id)
);

-- Add channel column to chat_messages for WhatsApp vs web distinction
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'web';

-- Index for efficient WhatsApp chat history queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_whatsapp
  ON chat_messages(user_id, channel, created_at DESC);
