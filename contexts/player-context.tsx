// context/player-context.tsx
'use client'

import React, { createContext, useContext, useRef, useState, useEffect, ReactNode } from 'react'

export type Song = {
  id: string
  title: string
  artist: string
  album?: string
  cover?: string
  url: string
}

type PlayerContextType = {
  currentSong: Song | null
  isPlaying: boolean
  playSong: (song: Song) => void
  pause: () => void
  resume: () => void
  playNext: () => void
  playPrevious: () => void
  playlist: Song[]
  setPlaylist: (songs: Song[]) => void
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined)

export const usePlayer = () => {
  const context = useContext(PlayerContext)
  if (!context) throw new Error('usePlayer must be used within PlayerProvider')
  return context
}

export const PlayerProvider = ({ children }: { children: ReactNode }) => {
  const audioRef = useRef<HTMLAudioElement>(new Audio())
  const [currentSong, setCurrentSong] = useState<Song | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playlist, setPlaylist] = useState<Song[]>([])
  const [currentIndex, setCurrentIndex] = useState<number>(0)
  const [userInteracted, setUserInteracted] = useState(false) // für iOS Autoplay

  // Set User Interaction
  useEffect(() => {
    const handleInteraction = () => setUserInteracted(true)
    window.addEventListener('click', handleInteraction, { once: true })
    window.addEventListener('touchstart', handleInteraction, { once: true })
    return () => {
      window.removeEventListener('click', handleInteraction)
      window.removeEventListener('touchstart', handleInteraction)
    }
  }, [])

  const playSong = (song: Song) => {
    if (!userInteracted) return // iOS: Audio darf nur nach Interaktion starten

    if (audioRef.current.src !== song.url) {
      audioRef.current.pause()
      audioRef.current.src = song.url
      audioRef.current.currentTime = 0
    }
    setCurrentSong(song)
    audioRef.current
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false)) // fallback falls Safari blockiert
  }

  const pause = () => {
    audioRef.current.pause()
    setIsPlaying(false)
  }

  const resume = () => {
    if (!currentSong || !userInteracted) return
    audioRef.current
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false))
  }

  const playNext = () => {
    if (playlist.length === 0) return
    const nextIndex = (currentIndex + 1) % playlist.length
    setCurrentIndex(nextIndex)
    playSong(playlist[nextIndex])
  }

  const playPrevious = () => {
    if (playlist.length === 0) return
    const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length
    setCurrentIndex(prevIndex)
    playSong(playlist[prevIndex])
  }

  // Update currentIndex when currentSong changes
  useEffect(() => {
    if (!currentSong) return
    const index = playlist.findIndex((s) => s.id === currentSong.id)
    if (index !== -1) setCurrentIndex(index)
  }, [currentSong, playlist])

  // Media Session API for Lockscreen
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentSong) return

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentSong.title,
      artist: currentSong.artist,
      album: currentSong.album || '',
      artwork: currentSong.cover
        ? [{ src: currentSong.cover, sizes: '512x512', type: 'image/png' }]
        : [],
    })

    navigator.mediaSession.setActionHandler('play', resume)
    navigator.mediaSession.setActionHandler('pause', pause)
    navigator.mediaSession.setActionHandler('previoustrack', playPrevious)
    navigator.mediaSession.setActionHandler('nexttrack', playNext)
  }, [currentSong])

  // Handle automatic next song
  useEffect(() => {
    const audio = audioRef.current
    const handleEnded = () => {
      if (playlist.length === 0) return
      const nextIndex = (currentIndex + 1) % playlist.length
      setCurrentIndex(nextIndex)
      
      const nextSong = playlist[nextIndex]
      if (audio.src !== nextSong.url) {
        audio.pause()
        audio.src = nextSong.url
        audio.currentTime = 0
      }
      setCurrentSong(nextSong)
      audio.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false))
    }
    
    audio.addEventListener('ended', handleEnded)
    return () => audio.removeEventListener('ended', handleEnded)
  }, [playlist, currentIndex])

  return (
    <PlayerContext.Provider
      value={{
        currentSong,
        isPlaying,
        playSong,
        pause,
        resume,
        playNext,
        playPrevious,
        playlist,
        setPlaylist,
      }}
    >
      {children}
    </PlayerContext.Provider>
  )
}
