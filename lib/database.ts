'use client'

import { supabase } from './supabase'

export interface GalleryImage {
  id: string
  user_id?: string
  image_url: string
  created_at: string
  archived: boolean
}

export interface ChatMessage {
  id: string
  user_id?: string
  role: 'user' | 'assistant'
  content: string
  image_url?: string
  generated_image_url?: string
  created_at: string
}

// Gallery functions
export async function saveImageToGallery(imageUrl: string, userId?: string): Promise<GalleryImage | null> {
  const { data, error } = await supabase
    .from('gallery_images')
    .insert({
      image_url: imageUrl,
      user_id: userId || 'anonymous',
      archived: false
    })
    .select()
    .single()

  if (error) {
    console.error('Error saving image:', error)
    return null
  }
  return data
}

export async function getGalleryImages(userId?: string): Promise<GalleryImage[]> {
  const { data, error } = await supabase
    .from('gallery_images')
    .select('*')
    .eq('user_id', userId || 'anonymous')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching images:', error)
    return []
  }
  return data || []
}

export async function toggleArchiveImage(id: string, archived: boolean): Promise<boolean> {
  const { error } = await supabase
    .from('gallery_images')
    .update({ archived })
    .eq('id', id)

  if (error) {
    console.error('Error toggling archive:', error)
    return false
  }
  return true
}

// Chat functions
export async function saveChatMessage(
  role: 'user' | 'assistant',
  content: string,
  imageUrl?: string,
  generatedImageUrl?: string,
  userId?: string
): Promise<ChatMessage | null> {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      role,
      content,
      image_url: imageUrl,
      generated_image_url: generatedImageUrl,
      user_id: userId || 'anonymous'
    })
    .select()
    .single()

  if (error) {
    console.error('Error saving message:', error)
    return null
  }
  return data
}

export async function getChatHistory(userId?: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('user_id', userId || 'anonymous')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching chat history:', error)
    return []
  }
  return data || []
}

export async function clearChatHistory(userId?: string): Promise<boolean> {
  const { error } = await supabase
    .from('chat_messages')
    .delete()
    .eq('user_id', userId || 'anonymous')

  if (error) {
    console.error('Error clearing chat:', error)
    return false
  }
  return true
}

// Upload base64 image to Supabase Storage and get public URL
export async function uploadImageToStorage(base64Image: string, fileName?: string): Promise<string | null> {
  try {
    // Extract base64 data and mime type
    const matches = base64Image.match(/^data:(.+);base64,(.+)$/)
    if (!matches) return null

    const mimeType = matches[1]
    const base64Data = matches[2]
    const extension = mimeType.split('/')[1] || 'png'

    // Convert base64 to blob
    const byteCharacters = atob(base64Data)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: mimeType })

    // Generate unique filename
    const uniqueName = fileName || `lumino-${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('generated-images')
      .upload(uniqueName, blob, {
        contentType: mimeType,
        upsert: false
      })

    if (error) {
      console.error('Error uploading to storage:', error)
      return null
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('generated-images')
      .getPublicUrl(data.path)

    return urlData.publicUrl
  } catch (error) {
    console.error('Error in uploadImageToStorage:', error)
    return null
  }
}

// WhatsApp user functions - link phone number to user data
export async function getOrCreateWhatsAppUser(phoneNumber: string): Promise<string> {
  // Check if user exists
  const { data: existing } = await supabase
    .from('whatsapp_users')
    .select('id')
    .eq('phone_number', phoneNumber)
    .single()

  if (existing) {
    return existing.id
  }

  // Create new WhatsApp user
  const { data: newUser, error } = await supabase
    .from('whatsapp_users')
    .insert({ phone_number: phoneNumber })
    .select('id')
    .single()

  if (error) {
    console.error('Error creating WhatsApp user:', error)
    return phoneNumber // Fallback to phone number as ID
  }

  return newUser.id
}
