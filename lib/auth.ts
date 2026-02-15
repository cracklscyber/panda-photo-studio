'use client'

import { supabase } from './supabase'
import { User } from '@supabase/supabase-js'

// Sign up with email, password and name
export async function signUp(email: string, password: string, name?: string): Promise<{ user: User | null; error: string | null }> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: name }
    }
  })

  if (error) {
    return { user: null, error: error.message }
  }

  // Create customer profile with name
  if (data.user && name) {
    await supabase.from('customer_profiles').upsert(
      {
        user_id: data.user.id,
        customer_name: name,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'user_id' }
    )
  }

  return { user: data.user, error: null }
}

// Sign in with email and password
export async function signIn(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { user: null, error: error.message }
  }

  return { user: data.user, error: null }
}

// Sign out
export async function signOut(): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signOut()

  if (error) {
    return { error: error.message }
  }

  return { error: null }
}

// Get current user
export async function getCurrentUser(): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Reset password - sends email with reset link
export async function resetPassword(email: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`
  })

  if (error) {
    return { error: error.message }
  }

  return { error: null }
}

// Update password (after clicking reset link)
export async function updatePassword(newPassword: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.updateUser({
    password: newPassword
  })

  if (error) {
    return { error: error.message }
  }

  return { error: null }
}

// Listen to auth changes
export function onAuthStateChange(callback: (user: User | null) => void) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user || null)
  })
}
