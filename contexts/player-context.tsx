"use client"

import { createContext, useContext, useEffect, useRef, useState } from "react"
import type { Song } from "@/lib/types"

type RepeatMode = "off" | "one" | "all"

interface PlayerContextType {
  currentSong: Song | null
  isPlaying: boolean
  currentTime: number
  duration: number
  playSong: (song: Song, queue?: Song[]) => void
  togglePlay: () => void
  next: () => void
  prev: () => void
  seek: (time: number) => void
  toggleShuffle: () => void
  toggleRepeat: () => void
  isShuffled: boolean
  repeatMode: RepeatMode
}

const PlayerContext = createContext<PlayerContextType | null>(null)

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const [queue, setQueue] = useState<Song[]>([])
  const [index, setIndex] = useState(0)
  const [currentSong, setCurrentSong] = useState<Song | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isShuffled, setIsShuffled] = useState(false)
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("off")

  useEffect(() => {
    const audio = new Audio()
    audio.preload = "auto"              // 🔥 wichtig für iOS
    audioRef.current = audio

    const onTimeUpdate = () => setCurrentTime(audio.currentTime || 0)
    const onLoaded = () => setDuration(audio.duration || 0)
    const onEnded = () => handleEnded()

    audio.addEventListener("timeupdate", onTimeUpdate)
    audio.addEventListener("loadedmetadata", onLoaded)
    audio.addEventListener("ended", onEnded)

    return () => {
      audio.pause()
      audio.removeEventListener("timeupdate", onTimeUpdate)
      audio.removeEventListener("loadedmetadata", onLoaded)
      audio.removeEventListener("ended", onEnded)
    }
  }, [])

  const handleEnded = () => {
    if (repeatMode === "one") {
      audioRef.current!.currentTime = 0
      audioRef.current!.play()
      return
    }

    if (index < queue.length - 1) {
      next()
    } else if (repeatMode === "all") {
      setIndex(0)
      playAtIndex(0)
    } else {
      setIsPlaying(false)
    }
  }

  const playAtIndex = (i: number) => {
    const song = queue[i]
    if (!song || !audioRef.current) return

    const audio = audioRef.current
    audio.src = song.audio_url
    audio.load()               // 🔥 iOS braucht das
    audio.currentTime = 0

    audio.play().catch(() => {})
    setCurrentSong(song)
    setIndex(i)
    setIsPlaying(true)
  }

  const playSong = (song: Song, list?: Song[]) => {
    const q = list && list.length ? list : [song]
    setQueue(q)

    const i = q.findIndex((s) => s.id === song.id)
    const startIndex = i >= 0 ? i : 0

    playAtIndex(startIndex)
  }

  const togglePlay = () => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play().catch(() => {})
      setIsPlaying(true)
    }
  }

  const next = () => {
    if (queue.length === 0) return
    const nextIndex = index + 1 < queue.length ? index + 1 : 0
    playAtIndex(nextIndex)
  }

  const prev = () => {
    if (queue.length === 0) return
    const prevIndex = index - 1 >= 0 ? index - 1 : queue.length - 1
    playAtIndex(prevIndex)
  }

  const seek = (time: number) => {
    if (!audioRef.current) return
    audioRef.current.currentTime = time
    setCurrentTime(time)
  }

  const toggleShuffle = () => setIsShuffled((s) => !s)

  const toggleRepeat = () => {
    setRepeatMode((m) => (m === "off" ? "all" : m === "all" ? "one" : "off"))
  }

  return (
    <PlayerContext.Provider
      value={{
        currentSong,
        isPlaying,
        currentTime,
        duration,
        playSong,
        togglePlay,
        next,
        prev,
        seek,
        toggleShuffle,
        toggleRepeat,
        isShuffled,
        repeatMode,
      }}
    >
      {children}
    </PlayerContext.Provider>
  )
}

export function usePlayer() {
  const ctx = useContext(PlayerContext)
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider")
  return ctx
}
