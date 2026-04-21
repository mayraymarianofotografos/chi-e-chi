'use client'

import { useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import VideoRecorder from '@/components/VideoRecorder'
import { supabase } from '@/lib/supabase'
import { uploadVideoToCloudinary } from '@/lib/cloudinary'

const GROUP_TAGS = [
  'Famiglia Sposa',
  'Famiglia Sposo',
  'Amici Sposa',
  'Amici Sposo',
  'Amici in comune',
  'Lavoro',
  'Scapolo',
  'Nubile',
  'Altri',
]

type Step = 'form' | 'video' | 'uploading' | 'done' | 'checking' | 'redirect'

export default function JoinPage() {
  const { code } = useParams<{ code: string }>()
  const router   = useRouter()

  // Form state
  const [name, setName]           = useState('')
  const [bio, setBio]             = useState('')
  const [groups, setGroups]       = useState<string[]>([])
  const [consented, setConsented] = useState(false)

  // Flow state
  const [step, setStep]       = useState<Step>('form')
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null)
  const [progress, setProgress]   = useState(0)
  const [error, setError]         = useState('')

  // Callback del VideoRecorder — se llama cuando el usuario confirma su video
  const handleVideoReady = useCallback((blob: Blob) => {
    setVideoBlob(blob)
  }, [])  // Validar formulario y avanzar al paso de video (o redirigir al mural si ya existe)
  async function goToVideoStep() {
    if (!name.trim()) { setError('Inserisci il tuo nome.'); return }
    setError('')

    // Verificar si el invitado ya subió su video
    setStep('checking')

    try {
      // Obtener el ID de la boda
      const { data: wedding, error: wErr } = await supabase
        .from('weddings')
        .select('id')
        .eq('code', code)
        .single()

      if (wErr || !wedding) {
        setError('Matrimonio non trovato.')
        setStep('form')
        return
      }

      // Buscar si ya existe un invitado con este nombre en esta boda
      const { data: existingGuest } = await supabase
        .from('guests')
        .select('id, name, video_url')
        .eq('wedding_id', wedding.id)
        .ilike('name', name.trim())
        .not('video_url', 'is', null)
        .limit(1)

      if (existingGuest && existingGuest.length > 0) {
        // El invitado ya tiene un video — redirigir al mural
        setStep('redirect')
        setTimeout(() => router.push(`/${code}/mural`), 2000)
        return
      }

      // SI NO EXISTE, validamos que haya completado lo demás
      if (groups.length === 0) {
        setError('Seleziona almeno un gruppo.')
        setStep('form')
        return
      }
      if (!consented) {
        setError('Devi accettare il consenso per continuare.')
        setStep('form')
        return
      }

      // No existe y todo ok — continuar con el flujo normal
      setStep('video')
    } catch {
      setError('Errore durante la verifica. Riprova.')
      setStep('form')
    }
  }

  // Submit final: subir video + guardar en Supabase
  async function handleSubmit() {
    if (!videoBlob) {
      setError('Prima registra e conferma il tuo video.')
      return
    }

    setStep('uploading')
    setError('')
    setProgress(0)

    try {
      // 1. Subir video a Cloudinary (con progreso real)
      const { videoUrl, thumbnailUrl } = await uploadVideoToCloudinary(
        videoBlob,
        (p) => setProgress(Math.min(p, 85)) // reservamos el último 15% para Supabase
      )

      // 2. Obtener ID de la boda
      const { data: wedding, error: wErr } = await supabase
        .from('weddings')
        .select('id')
        .eq('code', code)
        .single()

      if (wErr || !wedding) throw new Error('Matrimonio non trovato.')

      // 3. Guardar invitado en Supabase
      setProgress(90)
      const { error: gErr } = await supabase.from('guests').insert({
        wedding_id:    wedding.id,
        name:          name.trim(),
        bio:           bio.trim() || null,
        group_tag:     groups.join(', '),
        video_url:     videoUrl,
        thumbnail_url: thumbnailUrl,
        consented:     true,
      })

      if (gErr) throw new Error(gErr.message)

      setProgress(100)
      setStep('done')

      // Ir al mural después de 2 segundos
      setTimeout(() => router.push(`/${code}/mural`), 2000)

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore sconosciuto'
      setError(`Errore: ${msg}. Riprova.`)
      setStep('video')
    }
  }

  // ─────────────────────────────────────────
  // PANTALLAS DE ESTADO
  // ─────────────────────────────────────────

  if (step === 'checking') {
    return (
      <main className="flex items-center justify-center min-h-screen px-6">
        <div className="text-center w-full max-w-xs">
          <div className="w-8 h-8 border-2 border-stone border-t-anthracite rounded-full animate-spin mx-auto mb-5" />
          <p className="text-lg font-serif text-anthracite mb-2">Un momento...</p>
          <p className="text-anthracite/50 text-sm">Stiamo verificando i tuoi dati</p>
        </div>
      </main>
    )
  }

  if (step === 'redirect') {
    return (
      <main className="flex items-center justify-center min-h-screen px-6">
        <div className="text-center">
          <div className="text-6xl mb-4 opacity-90">👋</div>
          <h2 className="text-3xl font-serif text-anthracite mb-2">Bentornato, {name.trim()}!</h2>
          <p className="text-anthracite/60 text-sm">
            Hai già caricato il tuo video.<br />
            Ti portiamo alla bacheca degli ospiti...
          </p>
        </div>
      </main>
    )
  }

  if (step === 'uploading') {
    return (
      <main className="flex items-center justify-center min-h-screen px-6">
        <div className="text-center w-full max-w-xs">
          <div className="text-4xl mb-5 opacity-90">
            {progress < 100 ? '⌛' : '✓'}
          </div>
          <p className="text-lg font-serif mb-5 text-anthracite">
            {progress < 85
              ? 'Caricamento del video in corso...'
              : progress < 100
              ? 'Salvataggio del profilo...'
              : 'Fatto!'}
          </p>
          {/* Barra de progreso */}
          <div className="w-full bg-stone rounded-none h-1 overflow-hidden">
            <div
              className="bg-anthracite h-1 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-anthracite/60 text-sm mt-2 tabular-nums">{progress}%</p>
          <p className="text-anthracite/40 text-xs mt-4">
            Non chiudere l'app durante il caricamento
          </p>
        </div>
      </main>
    )
  }

  if (step === 'done') {
    return (
      <main className="flex items-center justify-center min-h-screen px-6">
        <div className="text-center">
          <div className="text-6xl mb-4 opacity-90">🥂</div>
          <h2 className="text-3xl font-serif text-anthracite mb-2">Sei stato aggiunto alla festa!</h2>
          <p className="text-anthracite/60 text-sm">Andando alla bacheca degli ospiti...</p>
        </div>
      </main>
    )
  }

  // ─────────────────────────────────────────
  // FORMULARIO PRINCIPAL
  // ─────────────────────────────────────────

  const weddingLabel = (code as string).replace(/_/g, ' ')

  return (
    <main className="min-h-screen px-5 py-10 pb-20">
      <div className="max-w-sm mx-auto space-y-7">

        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-serif tracking-[-0.02em]">Presentati 👋</h1>
          <p className="text-anthracite/60 text-sm mt-2 tracking-widest uppercase font-sans">
            {weddingLabel}
          </p>
          {name.trim().length > 0 && (
            <p className="text-emerald-600 font-medium text-xs mt-3 font-sans animate-subtle-pulse">
              Hai già caricato un video? Inserisci solo il tuo nome e ti portiamo al muro 🎬
            </p>
          )}
        </div>

        {/* ── PASO 1: Datos personales ──────────────────────── */}
        {step === 'form' && (
          <div className="space-y-6">

            {/* Nombre */}
            <div className="space-y-1.5">
              <label className="text-sm font-sans tracking-wide text-anthracite uppercase text-xs font-semibold">
                Il tuo nome <span className="text-anthracite/50">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Es: Luca Rossi"
                maxLength={60}
                className="w-full bg-white border border-stone rounded-none px-4 py-3 text-anthracite placeholder-anthracite/30 focus:outline-none focus:border-anthracite transition-colors"
              />
            </div>

            {/* Bio */}
            <div className="space-y-1.5">
              <label className="flex justify-between font-sans tracking-wide text-anthracite uppercase text-xs font-semibold">
                <span>Breve bio</span>
                <span className={`tabular-nums lowercase font-normal ${bio.length > 90 ? 'text-red-500' : 'text-anthracite/50'}`}>
                  {bio.length}/100
                </span>
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder='Es: "Cugino dello sposo, esperto di barbecue e foto rovinate"'
                maxLength={100}
                rows={2}
                className="w-full bg-white border border-stone rounded-none px-4 py-3 text-anthracite placeholder-anthracite/30 focus:outline-none focus:border-anthracite resize-none transition-colors text-sm leading-relaxed"
              />
            </div>

            {/* Grupo */}
            <div className="space-y-2">
              <label className="text-sm font-sans tracking-wide text-anthracite uppercase text-xs font-semibold">
                Di quale gruppo fai parte? <span className="text-anthracite/50">*</span>
              </label>
              <div className="flex flex-wrap gap-2 pt-1">
                {GROUP_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setGroups(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                    className={`px-3 py-1.5 border rounded-none text-xs tracking-wide transition-colors ${
                      groups.includes(tag)
                        ? 'bg-anthracite border-anthracite text-white font-medium'
                        : 'bg-white border-stone text-anthracite/60 hover:text-anthracite'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Consentimiento */}
            <label className="flex items-start gap-3 cursor-pointer pt-2">
              <div className="relative mt-0.5">
                <input
                  type="checkbox"
                  checked={consented}
                  onChange={(e) => setConsented(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`w-4 h-4 rounded-none border flex items-center justify-center transition-colors ${
                    consented
                      ? 'bg-anthracite border-anthracite'
                      : 'bg-transparent border-stone'
                  }`}
                >
                  {consented && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="square" strokeLinejoin="miter" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-xs text-anthracite/60 leading-relaxed font-sans">
                Accetto che il mio video e i miei dati siano visibili agli invitati di questo matrimonio
                e verranno eliminati automaticamente 5 giorni dopo l'evento.
              </span>
            </label>

            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}

            <button
              onClick={goToVideoStep}
              className="w-full mt-4 bg-anthracite hover:bg-black text-white rounded-none py-4 text-sm tracking-wide transition-colors"
            >
              Avanti: Registra video →
            </button>
          </div>
        )}

        {/* ── PASO 2: Video ─────────────────────────────────── */}
        {step === 'video' && (
          <div className="space-y-4">
            <button
              onClick={() => { setStep('form'); setVideoBlob(null) }}
              className="text-xs uppercase tracking-widest text-anthracite/50 hover:text-anthracite transition-colors pb-2"
            >
              ← Torna ai miei dati
            </button>

            <VideoRecorder onVideoReady={handleVideoReady} />

            {/* Botón de submit — aparece solo cuando el video está listo */}
            {videoBlob && (
              <div className="pt-2">
                {error && (
                  <p className="text-red-500 text-sm text-center pb-3">{error}</p>
                )}
                <button
                  onClick={handleSubmit}
                  className="w-full bg-anthracite hover:bg-black text-white rounded-none py-4 text-sm tracking-wide transition-colors"
                >
                  Pubblica la mia presentazione
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </main>
  )
}