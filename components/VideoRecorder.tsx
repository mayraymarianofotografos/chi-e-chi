'use client'

import { useRef, useState, useCallback } from 'react'

// Prompts aleatorios — aparecen en pantalla al grabar
const PROMPTS = [
  'Come hai conosciuto gli sposi? Raccontalo in 15 secondi 🎤',
  'Dì il tuo nome e un consiglio (cattivo) per gli sposi 😄',
  'Definisci gli sposi in esattamente 3 parole',
  'Qual è il tuo augurio per questa coppia?',
  'Cosa ti aspetti da stasera? Spoiler: che vada tutto bene',
  'Un aneddoto memorabile con gli sposi (in breve)',
]

type Phase = 'idle' | 'camera' | 'countdown' | 'recording' | 'preview'

type Props = {
  onVideoReady: (blob: Blob) => void
}

export default function VideoRecorder({ onVideoReady }: Props) {
  const liveVideoRef    = useRef<HTMLVideoElement>(null)
  const recorderRef     = useRef<MediaRecorder | null>(null)
  const streamRef       = useRef<MediaStream | null>(null)
  const chunksRef       = useRef<Blob[]>([])
  const timerRef        = useRef<ReturnType<typeof setInterval> | null>(null)

  const [phase, setPhase]         = useState<Phase>('idle')
  const [countdown, setCountdown] = useState(3)
  const [timeLeft, setTimeLeft]   = useState(15)
  const [prompt]                  = useState(
    () => PROMPTS[Math.floor(Math.random() * PROMPTS.length)]
  )
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null)

  // ── Abrir cámara ──────────────────────────────────────────────
  const openCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width:  { ideal: 720 },
          height: { ideal: 1280 },
        },
        audio: true,
      })
      streamRef.current = stream
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream
        liveVideoRef.current.muted = true
      }
      setPhase('camera')
    } catch {
      alert(
        'Impossibile accedere alla fotocamera.\n' +
        'Verifica i permessi nelle impostazioni del tuo browser.'
      )
    }
  }, [])

  // ── Iniciar cuenta regresiva ──────────────────────────────────
  const startCountdown = useCallback(() => {
    setPhase('countdown')
    let c = 3
    setCountdown(c)

    const interval = setInterval(() => {
      c--
      if (c === 0) {
        clearInterval(interval)
        beginRecording()
      } else {
        setCountdown(c)
      }
    }, 1000)
  }, [])

  // ── Grabar ────────────────────────────────────────────────────
  const beginRecording = useCallback(() => {
    if (!streamRef.current) return
    chunksRef.current = []

    // iOS Safari solo soporta mp4
    const mimeType =
      MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' :
      MediaRecorder.isTypeSupported('video/webm')            ? 'video/webm' :
                                                               'video/mp4'

    const recorder = new MediaRecorder(streamRef.current, { mimeType })
    recorderRef.current = recorder

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    recorder.onstop = () => {
      // Detener stream de cámara
      streamRef.current?.getTracks().forEach((t) => t.stop())

      const blob = new Blob(chunksRef.current, { type: mimeType })
      const url  = URL.createObjectURL(blob)
      setPreviewBlob(blob)
      setPreviewUrl(url)
      setPhase('preview')
    }

    recorder.start(100) // chunk cada 100ms
    setPhase('recording')
    setTimeLeft(15)

    // Contador regresivo visible
    let t = 15
    timerRef.current = setInterval(() => {
      t--
      setTimeLeft(t)
      if (t === 0) {
        clearInterval(timerRef.current!)
        recorder.stop()
      }
    }, 1000)
  }, [])

  // ── Detener manualmente ───────────────────────────────────────
  const stopManually = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    recorderRef.current?.stop()
  }, [])

  // ── Volver a grabar ───────────────────────────────────────────
  const retake = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl('')
    setPreviewBlob(null)
    setPhase('idle')
  }, [previewUrl])

  // ── Confirmar video ───────────────────────────────────────────
  const confirm = useCallback(() => {
    if (previewBlob) onVideoReady(previewBlob)
  }, [previewBlob, onVideoReady])

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────

  // Vista previa del video grabado
  if (phase === 'preview' && previewUrl) {
    return (
      <div className="space-y-4 font-sans">
        <p className="text-xs uppercase tracking-widest text-anthracite/60 text-center font-semibold pb-1">
          Controlla il tuo video prima di pubblicarlo
        </p>
        <video
          src={previewUrl}
          controls
          playsInline
          className="w-full rounded-none border border-stone aspect-[9/16] object-cover bg-black shadow-sm"
        />
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={retake}
            className="bg-white border border-stone rounded-none py-3.5 text-xs uppercase tracking-widest text-anthracite hover:bg-stone/20 transition-colors flex items-center justify-center gap-2"
          >
            <span>↩</span> Registra di nuovo
          </button>
          <button
            onClick={confirm}
            className="bg-anthracite hover:bg-black text-white rounded-none py-3.5 text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
          >
            <span>✓</span> Usa questo video
          </button>
        </div>
      </div>
    )
  }

  // Cámara activa (preview / countdown / recording)
  return (
    <div className="space-y-4 font-sans">
      {/* Contenedor de video 9:16 */}
      <div className="relative rounded-none overflow-hidden bg-stone/30 aspect-[9/16] border border-stone shadow-sm">

        {/* Placeholder cuando cámara está inactiva */}
        {phase === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-anthracite/40">
            <span className="text-5xl opacity-50">📹</span>
            <p className="text-sm tracking-wide">La tua fotocamera apparirà qui</p>
          </div>
        )}

        {/* Feed de cámara en vivo */}
        <video
          ref={liveVideoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover scale-x-[-1] ${
            phase === 'idle' ? 'hidden' : ''
          }`}
        />

        {/* Cuenta regresiva */}
        {phase === 'countdown' && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm">
            <span className="text-9xl font-serif text-anthracite">
              {countdown}
            </span>
          </div>
        )}

        {/* Indicadores durante grabación */}
        {phase === 'recording' && (
          <>
            {/* Indicador REC + tiempo */}
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-white/90 border border-stone rounded-none px-3 py-1.5 backdrop-blur-md shadow-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-bold tabular-nums text-anthracite tracking-wider">{timeLeft}s</span>
            </div>
            {/* Barra de progreso */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-stone/50">
              <div
                className="h-full bg-red-500 transition-all duration-1000"
                style={{ width: `${((15 - timeLeft) / 15) * 100}%` }}
              />
            </div>
          </>
        )}

        {/* Prompt en pantalla (visible en camera, countdown y recording) */}
        {phase !== 'idle' && (
          <div className="absolute bottom-5 left-4 right-4 bg-white/90 border border-stone rounded-none px-4 py-3 backdrop-blur-md shadow-sm">
            <p className="text-xs text-center text-anthracite leading-relaxed font-medium">
              {prompt}
            </p>
          </div>
        )}
      </div>

      {/* Botones de acción */}
      {phase === 'idle' && (
        <button
          onClick={openCamera}
          className="w-full bg-anthracite hover:bg-black active:scale-95 text-white rounded-none py-4 text-sm tracking-wide transition-all uppercase flex justify-center items-center gap-2"
        >
          <span>📹</span> Attiva fotocamera
        </button>
      )}

      {phase === 'camera' && (
        <button
          onClick={startCountdown}
          className="w-full bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-none py-4 text-sm tracking-wide transition-all uppercase flex justify-center items-center gap-2"
        >
          <span className="w-3 h-3 rounded-full bg-white animate-pulse" /> Registra (15 sec)
        </button>
      )}

      {phase === 'recording' && (
        <button
          onClick={stopManually}
          className="w-full border border-red-500 bg-white text-red-600 hover:bg-red-50 active:scale-95 rounded-none py-4 text-sm tracking-wide transition-all uppercase flex justify-center items-center gap-2"
        >
          <span className="w-3 h-3 bg-red-600 rounded-sm" /> Termina registrazione
        </button>
      )}

      {phase === 'countdown' && (
        <div className="w-full bg-stone/40 border border-stone rounded-none py-4 text-center text-anthracite/60 text-sm tracking-wide uppercase">
          Preparati...
        </div>
      )}
    </div>
  )
}