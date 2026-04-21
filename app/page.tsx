'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function HomePage() {
  const [code, setCode]       = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) return

    setLoading(true)
    setError('')

    const clean = code.trim().toUpperCase().replace(/\s+/g, '_')

    const { data, error: dbError } = await supabase
      .from('weddings')
      .select('code, couple_names')
      .eq('code', clean)
      .single()

    if (dbError || !data) {
      setError('Codice non trovato. Verifica che sia scritto bene.')
      setLoading(false)
      return
    }

    router.push(`/${clean}/join`)
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-6">
      <div className="w-full max-w-xs">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="text-6xl mb-4 select-none opacity-90">💍</div>
          <h1 className="text-4xl tracking-[-0.02em] font-serif mb-2">Chi è chi</h1>
          <p className="text-anthracite/60 text-sm">
            Conosci tutti gli invitati prima di arrivare
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="CODICE MATRIMONIO"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            maxLength={60}
            className="w-full bg-white border border-stone rounded-none px-4 py-4 text-anthracite placeholder-anthracite/40 focus:outline-none focus:border-anthracite text-center tracking-widest text-sm font-sans transition-colors"
            required
          />

          {error && (
            <p className="text-red-500 text-sm text-center px-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="w-full bg-anthracite hover:bg-black text-white disabled:opacity-40 disabled:cursor-not-allowed rounded-none py-4 font-sans text-sm tracking-wide transition-colors"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Verifica in corso...
              </span>
            ) : (
              'Entra →'
            )}
          </button>
        </form>

        <p className="text-center text-anthracite/50 text-xs mt-8">
          Il codice te lo danno gli sposi
        </p>
      </div>
    </main>
  )
}