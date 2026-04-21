'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Guest = {
  id: string
  name: string
  bio: string | null
  group_tag: string | null
  video_url: string
  thumbnail_url: string
  created_at: string
}

type Wedding = {
  id: string
  code: string
  couple_names: string
}

export default function MuralPage() {
  const { code } = useParams<{ code: string }>()
  
  const [wedding, setWedding] = useState<Wedding | null>(null)
  const [guests, setGuests] = useState<Guest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Si openGuestIndex es null, mostramos la grilla. Si es un número, mostramos el feed de videos.
  const [openGuestIndex, setOpenGuestIndex] = useState<number | null>(null)

  // Filtro de grupos (opcional, para la grilla)
  const [activeTag, setActiveTag] = useState<string>('Tutti')

  useEffect(() => {
    async function loadData() {
      try {
        const cleanCode = (code as string).toUpperCase().replace(/\s+/g, '_')
        const { data: wData, error: wErr } = await supabase
          .from('weddings')
          .select('*')
          .eq('code', cleanCode)
          .single()

        if (wErr || !wData) {
          setError('Matrimonio non trovato')
          setLoading(false)
          return
        }
        setWedding(wData)

        const { data: gData, error: gErr } = await supabase
          .from('guests')
          .select('*')
          .eq('wedding_id', wData.id)
          .order('created_at', { ascending: false })

        if (gErr) throw gErr
        setGuests(gData || [])
      } catch (err: any) {
        setError(err.message || 'Errore durante il caricamento dei dati')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [code])

  const translateLegacyTag = (tag: string) => {
    const map: Record<string, string> = {
      'Familia Novia': 'Famiglia Sposa',
      'Familia Novio': 'Famiglia Sposo',
      'Amigos Novia': 'Amici Sposa',
      'Amigos Novio': 'Amici Sposo',
      'Amigos en común': 'Amici in comune',
      'Trabajo': 'Lavoro',
      'Soltero': 'Scapolo',
      'Soltera': 'Nubile',
      'Otros': 'Altri'
    }
    return map[tag] || tag
  }

  const allTags = new Set<string>()
  guests.forEach(g => {
    if (g.group_tag) {
      g.group_tag.split(',').forEach(t => allTags.add(translateLegacyTag(t.trim())))
    }
  })
  
  const tags = ['Tutti', ...Array.from(allTags)]
  const filteredGuests = activeTag === 'Tutti' 
    ? guests 
    : guests.filter(g => g.group_tag && g.group_tag.split(',').map(t => translateLegacyTag(t.trim())).includes(activeTag))

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-offwhite">
        <div className="w-8 h-8 border-2 border-stone border-t-anthracite rounded-full animate-spin" />
      </main>
    )
  }

  if (error || !wedding) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center bg-offwhite">
        <h1 className="text-3xl font-serif text-anthracite mb-4">Ops</h1>
        <p className="text-anthracite/60 font-sans tracking-wide">{error || 'Impossibile caricare la bacheca.'}</p>
      </main>
    )
  }

  // Vista inmersiva (Feed TikTok)
  if (openGuestIndex !== null) {
    return (
      <FullscreenFeed 
        guests={filteredGuests} 
        initialIndex={openGuestIndex} 
        onClose={() => setOpenGuestIndex(null)} 
        translateLegacyTag={translateLegacyTag}
      />
    )
  }

  // Vista de Grilla (Mural)
  return (
    <main className="min-h-screen bg-offwhite pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-offwhite/90 backdrop-blur-xl border-b border-stone pt-12 pb-6 px-5">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-anthracite/50 text-xs font-semibold tracking-widest uppercase mb-2">
            Bacheca degli Ospiti
          </p>
          <h1 className="text-4xl font-serif tracking-[-0.02em] text-anthracite">{wedding.couple_names}</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-5 mt-8">
        {/* Filtros */}
        <div className="flex overflow-x-auto gap-2 pb-4 scrollbar-hide -mx-5 px-5 select-none touch-pan-x items-center justify-center md:flex-wrap md:justify-center">
          {tags.map(tag => (
            <button
              key={tag}
              onClick={() => setActiveTag(tag)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-none text-xs tracking-wide uppercase transition-colors border ${
                activeTag === tag
                  ? 'bg-anthracite border-anthracite text-white font-medium'
                  : 'bg-transparent border-stone text-anthracite/60 hover:text-anthracite hover:bg-stone/30'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Grilla */}
        {filteredGuests.length === 0 ? (
          <div className="mt-24 text-center text-anthracite/40 font-sans tracking-wide text-sm">
            Non ci sono ancora video in questo gruppo.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
            {filteredGuests.map((guest, idx) => (
              <div 
                key={guest.id}
                onClick={() => setOpenGuestIndex(idx)}
                className="group relative aspect-[9/16] rounded-none overflow-hidden cursor-pointer bg-white border border-stone shadow-sm transform transition-transform hover:-translate-y-1 active:scale-95"
              >
                {/* miniatura cargada desde cloudinary */}
                <img 
                  src={guest.thumbnail_url} 
                  alt={`Video di ${guest.name}`}
                  className="w-full h-full object-cover transition-opacity duration-500 group-hover:opacity-90 mix-blend-multiply"
                  loading="lazy"
                />
                
                {/* Degradado para que se lea el texto */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none transition-opacity duration-300" />
                
                {/* Info del invitado */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="text-white font-serif text-lg tracking-wide truncate drop-shadow-md">
                    {guest.name}
                  </p>
                  {guest.group_tag && (
                    <span className="inline-block mt-1.5 bg-black/40 backdrop-blur-md border border-white/20 text-white text-[9px] uppercase font-bold tracking-widest px-2 py-1 rounded-none shadow-none">
                      {guest.group_tag.split(',').map(t => translateLegacyTag(t.trim())).join(', ')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

// ==========================================
// Componente de Feed de Videos
// ==========================================

function FullscreenFeed({ 
  guests, 
  initialIndex, 
  onClose,
  translateLegacyTag
}: { 
  guests: Guest[], 
  initialIndex: number, 
  onClose: () => void,
  translateLegacyTag: (t: string) => string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [currentIndex, setCurrentIndex] = useState(initialIndex)

  // Scroll automático al instante para situarse en el video elegido en la grilla
  useEffect(() => {
    if (containerRef.current) {
      const height = window.innerHeight
      containerRef.current.scrollTo(0, initialIndex * height)
    }
  }, [initialIndex])

  // Detectar el índice actual basado en el scroll
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return
    const height = window.innerHeight
    const scrollTop = containerRef.current.scrollTop
    const index = Math.round(scrollTop / height)
    if (index !== currentIndex && index >= 0 && index < guests.length) {
      setCurrentIndex(index)
    }
  }, [currentIndex, guests.length])

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col font-sans">
      {/* Botón flotante para cerrar */}
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 z-[60] w-10 h-10 bg-black/40 backdrop-blur-md rounded-none flex items-center justify-center border border-white/20 text-white hover:bg-black/70 transition active:scale-95"
      >
        <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="square" strokeLinejoin="miter" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Contenedor que hace snap */}
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 w-full h-full overflow-y-scroll snap-y snap-mandatory scroll-smooth scrollbar-hide"
      >
        {guests.map((guest, idx) => (
          <VideoPlayerItem 
            key={guest.id} 
            guest={guest} 
            isActive={idx === currentIndex} 
            translateLegacyTag={translateLegacyTag}
          />
        ))}
      </div>
    </div>
  )
}

function VideoPlayerItem({ guest, isActive, translateLegacyTag }: { guest: Guest, isActive: boolean, translateLegacyTag: (t: string) => string }) {
  const videoRef = useRef<HTMLVideoElement>(null)

  // Reproducir/pausar según estemos viendo el video o no
  useEffect(() => {
    if (isActive) {
      videoRef.current?.play().catch(() => {
        // Ignorar el error de autoplay
      })
    } else {
      videoRef.current?.pause()
      if (videoRef.current) {
        videoRef.current.currentTime = 0
      }
    }
  }, [isActive])

  return (
    <div className="relative w-full h-[100dvh] snap-start bg-black flex items-center justify-center">
      {/* Reproductor */}
      <video
        ref={videoRef}
        src={guest.video_url}
        poster={guest.thumbnail_url}
        className="object-cover w-full h-full"
        loop
        playsInline
        muted={false} // Comienza con sonido (o podría requerir unmute del usuario por el navegador)
        onClick={(e) => {
          // Play/Pause manual al tocar
          const v = e.currentTarget
          if (v.paused) v.play()
          else v.pause()
        }}
      />
      
      {/* Gradiente sutil debajo para legibilidad */}
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

      {/* Info en el Feed */}
      <div className="absolute bottom-12 left-6 right-20 pointer-events-none">
        <h2 className="text-white text-3xl font-serif tracking-wide mb-2 drop-shadow-md">
          {guest.name}
        </h2>
        
        {guest.group_tag && (
          <div className="mb-4">
             <span className="bg-white/10 backdrop-blur-md border border-white/20 text-white text-[10px] uppercase font-semibold tracking-widest px-3 py-1.5 rounded-none shadow-none">
               {guest.group_tag.split(',').map(t => translateLegacyTag(t.trim())).join(', ')}
             </span>
          </div>
        )}
        
        {guest.bio && (
          <p className="text-white/90 text-sm font-sans tracking-wide leading-relaxed drop-shadow">
            {guest.bio}
          </p>
        )}
      </div>
    </div>
  )
}
