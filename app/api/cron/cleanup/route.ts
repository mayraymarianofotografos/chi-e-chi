import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'
import { createClient } from '@supabase/supabase-js'

// Se configura dentro del handler para mayor robustez
function configureCloudinary() {
  const cloud_name = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const api_key = process.env.CLOUDINARY_API_KEY
  const api_secret = process.env.CLOUDINARY_API_SECRET

  if (!cloud_name || !api_key || !api_secret) {
    throw new Error('Mancano le credenziali di Cloudinary (API Key/Secret).')
  }

  cloudinary.config({ cloud_name, api_key, api_secret, secure: true })
}

// Se crea dentro del handler para evitar error si la key no está en .env.local
function getSupabaseAdmin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key)
}

// Proteger el endpoint chequeando el CRON_SECRET de Vercel
function isAuthorized(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return true // En local o si no está configurado, pasamos
  return authHeader === `Bearer ${cronSecret}`
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabaseAdmin = getSupabaseAdmin()
    configureCloudinary()

    // 1. Encontrar todos los invitados cuyo video fue cargado hace más de 5 días
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 5)

    const { data: expiredGuests, error: guestErr } = await supabaseAdmin
      .from('guests')
      .select('id, video_url')
      .not('video_url', 'is', null)
      .lt('created_at', cutoffDate.toISOString())

    if (guestErr) throw new Error(`Error fetching expired guests: ${guestErr.message}`)
    if (!expiredGuests || expiredGuests.length === 0) {
      return NextResponse.json({ message: 'No expired videos to clean up today.' })
    }

    // 2. Extraer los public IDs de Cloudinary de cada video
    const publicIdsToDelete: string[] = []

    expiredGuests.forEach(guest => {
      if (guest.video_url) {
        // Extraemos 'vibecheck-weddings/nombre-archivo' sin extensión
        const match = guest.video_url.match(/(vibecheck-weddings\/[^/.]+)/)
        if (match && match[1]) {
          publicIdsToDelete.push(match[1])
        }
      }
    })

    // 3. Borrar los videos de Cloudinary (en lotes de hasta 100)
    if (publicIdsToDelete.length > 0) {
      const chunkSize = 100
      for (let i = 0; i < publicIdsToDelete.length; i += chunkSize) {
        const chunk = publicIdsToDelete.slice(i, i + chunkSize)
        await cloudinary.api.delete_resources(chunk, { resource_type: 'video' })
      }
    }

    // 4. Borrar los registros de los invitados expirados en Supabase
    const expiredIds = expiredGuests.map(g => g.id)
    const { error: delErr } = await supabaseAdmin
      .from('guests')
      .delete()
      .in('id', expiredIds)

    if (delErr) throw new Error(`Error deleting expired guests: ${delErr.message}`)

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${expiredGuests.length} expired videos (${publicIdsToDelete.length} from Cloudinary).`
    })

  } catch (error: any) {
    console.error('Cleanup Cron Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
