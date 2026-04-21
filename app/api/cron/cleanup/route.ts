import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - 5)

  const { error } = await supabase
    .from('guests')
    .delete()
    .lt('created_at', cutoffDate.toISOString())

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ ok: true, cutoff: cutoffDate.toISOString() })
}
