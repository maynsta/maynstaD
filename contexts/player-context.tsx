"use client"

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react"

export type RepeatMode = "off" | "one" | "all"

export interface Song {
  id: string
  title: string
  artist?: { artist_name: string }
  cover_url?: string
  audio_url: string
}

interface PlayerContextType {
  currentSong: Song | null
  isPlaying: boolean
  currentTime: number
  duration: number
  playlist: Song[]
  isShuffled: boolean
  repeatMode: RepeatMode
  play: (song: Song, playlist?: Song[]) => void
  togglePlay: () => void
  next: () => void
  prev: () => void
  seek: (time: number) => void
  toggleShuffle: () => void
  toggleRepeat: () => void
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined)

export function usePlayer() {
  const context = useContext(PlayerContext)
  if (!context) throw new Error("usePlayer must be used within PlayerProvider")
  return context
}

interface PlayerProviderProps {
  children: ReactNode
}

export function PlayerProvider({ children }: PlayerProviderProps) {
  const [playlist, setPlaylist] = useState<Song[]>([])
  const [currentSong, setCurrentSong] = useState<Song | null>(null)
  const [currentIndex, setCurrentIndex] = useState<number>(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isShuffled, setIsShuffled] = useState(false)
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("off")

  // -------------------- client-only Audio --------------------
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    audioRef.current = new Audio()
  }, [])

  // -------------------- client-only localStorage --------------------
  const [currentLang, setCurrentLang] = useState("en")
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedLang = localStorage.getItem("lang")
      if (savedLang) setCurrentLang(savedLang)
    }
  }, [])

  // -------------------- PLAY --------------------
  function play(song: Song, newPlaylist?: Song[]) {
    if (!audioRef.current) return

    if (newPlaylist) {
      setPlaylist(newPlaylist)
      const index = newPlaylist.findIndex(s => s.id === song.id)
      setCurrentIndex(index >= 0 ? index : 0)
    } else if (playlist.length === 0) {
      setPlaylist([song])
      setCurrentIndex(0)
    } else {
      const idx = playlist.findIndex(s => s.id === song.id)
      setCurrentIndex(idx >= 0 ? idx : 0)
    }

    setCurrentSong(song)
    audioRef.current.src = song.audio_url
    audioRef.current.play().catch(() => {})
    setIsPlaying(true)
  }

  // -------------------- TOGGLE PLAY --------------------
  function togglePlay() {
    if (!audioRef.current || !currentSong) return
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play().catch(() => {})
      setIsPlaying(true)
    }
  }

  // -------------------- SEEK --------------------
  function seek(time: number) {
    if (!audioRef.current) return
    audioRef.current.currentTime = time
    setCurrentTime(time)
  }

  // -------------------- NEXT --------------------
  function next() {
    if (!audioRef.current || !playlist.length) return

    if (isShuffled) {
      const remaining = playlist.filter((_, i) => i !== currentIndex)
      const randomSong = remaining[Math.floor(Math.random() * remaining.length)]
      const idx = playlist.findIndex(s => s.id === randomSong.id)
      setCurrentIndex(idx)
      setCurrentSong(randomSong)
      audioRef.current.src = randomSong.audio_url
      audioRef.current.play().catch(() => {})
      setIsPlaying(true)
      return
    }

    if (currentIndex + 1 < playlist.length) {
      const nextSong = playlist[currentIndex + 1]
      setCurrentIndex(currentIndex + 1)
      setCurrentSong(nextSong)
      audioRef.current.src = nextSong.audio_url
      audioRef.current.play().catch(() => {})
      setIsPlaying(true)
    } else if (repeatMode === "all") {
      const firstSong = playlist[0]
      setCurrentIndex(0)
      setCurrentSong(firstSong)
      audioRef.current.src = firstSong.audio_url
      audioRef.current.play().catch(() => {})
      setIsPlaying(true)
    } else {
      setIsPlaying(false)
    }
  }

  // -------------------- PREV --------------------
  function prev() {
    if (!audioRef.current || !playlist.length) return

    if (currentTime > 3) {
      audioRef.current.currentTime = 0
      setCurrentTime(0)
      return
    }

    if (currentIndex > 0) {
      const prevSong = playlist[currentIndex - 1]
      setCurrentIndex(currentIndex - 1)
      setCurrentSong(prevSong)
      audioRef.current.src = prevSong.audio_url
      audioRef.current.play().catch(() => {})
      setIsPlaying(true)
    } else if (repeatMode === "all") {
      const lastSong = playlist[playlist.length - 1]
      setCurrentIndex(playlist.length - 1)
      setCurrentSong(lastSong)
      audioRef.current.src = lastSong.audio_url
      audioRef.current.play().catch(() => {})
      setIsPlaying(true)
    }
  }

  // -------------------- SHUFFLE --------------------
  function toggleShuffle() {
    setIsShuffled(prev => !prev)
  }

  // -------------------- REPEAT --------------------
  function toggleRepeat() {
    setRepeatMode(prev => {
      if (prev === "off") return "one"
      if (prev === "one") return "all"
      return "off"
    })
  }

  // -------------------- AUDIO EVENTS --------------------
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    function updateTime() {
      setCurrentTime(audio.currentTime)
      setDuration(audio.duration || 0)
    }

    function handleEnded() {
      if (repeatMode === "one") {
        audio.currentTime = 0
        audio.play().catch(() => {})
      } else {
        next()
      }
    }

    audio.addEventListener("timeupdate", updateTime)
    audio.addEventListener("ended", handleEnded)

    return () => {
      audio.removeEventListener("timeupdate", updateTime)
      audio.removeEventListener("ended", handleEnded)
    }
  }, [currentIndex, playlist, repeatMode, isShuffled])

  // -------------------- PROVIDER --------------------
  return (
    <PlayerContext.Provider
      value={{
        currentSong,
        isPlaying,
        currentTime,
        duration,
        playlist,
        isShuffled,
        repeatMode,
        play,
        togglePlay,
        next,
        prev,
        seek,
        toggleShuffle,
        toggleRepeat,
      }}
    >
      {children}
    </PlayerContext.Provider>
  )
}
