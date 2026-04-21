import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// Tipos
export type Wedding = {
  id: string
  code: string
  couple_names: string
  wedding_date: string
  created_at: string
}

export type Guest = {
  id: string
  wedding_id: string
  name: string
  bio: string | null
  group_tag: string | null
  video_url: string | null
  thumbnail_url: string | null
  consented: boolean
  created_at: string
}