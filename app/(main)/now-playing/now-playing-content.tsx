"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { usePlayer } from "@/contexts/player-context"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Music, MoreHorizontal, Pause, Play, SkipBack, SkipForward, X } from "lucide-react"

function formatTime(seconds: number): string {
  if (!isFinite(seconds)) return "0:00"
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

export function NowPlayingContent() {
  const router = useRouter()
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    togglePlay,
    next,
    prev,
    seek,
    toggleShuffle,
    toggleRepeat,
    isShuffled,
    repeatMode,
  } = usePlayer()

  if (!currentSong) {
    return (
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-4 px-6">
        <p className="text-muted-foreground">Kein Song aktiv.</p>
        <Button onClick={() => router.back()}>Zurück</Button>
      </div>
    )
  }

  const artistName =
    (currentSong.artist as { display_name?: string } | undefined)?.display_name ||
    currentSong.artist?.artist_name ||
    "Unbekannt"

  return (
    <div className="mx-auto min-h-screen w-full max-w-2xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuItem onClick={toggleShuffle}>
              Shuffle: {isShuffled ? "An" : "Aus"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={toggleRepeat}>
              Repeat: {repeatMode === "off" ? "Aus" : repeatMode === "one" ? "1x" : "Alle"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => router.back()}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex flex-col items-center">
        <div className="mb-6 flex h-72 w-72 items-center justify-center overflow-hidden rounded-3xl bg-muted sm:h-96 sm:w-96">
          {currentSong.cover_url ? (
            <img src={currentSong.cover_url} alt={currentSong.title} className="h-full w-full object-cover" />
          ) : (
            <Music className="h-16 w-16 text-muted-foreground" />
          )}
        </div>

        <h1 className="text-center text-2xl font-bold">{currentSong.title}</h1>
        <p className="mb-6 mt-1 text-center text-muted-foreground">{artistName}</p>

        <div className="mb-6 flex w-full items-center gap-2">
          <span className="w-10 text-right text-xs text-muted-foreground">{formatTime(currentTime)}</span>
          <Slider value={[currentTime]} max={duration || 1} step={0.1} onValueChange={([v]) => seek(v)} />
          <span className="w-10 text-xs text-muted-foreground">{formatTime(duration)}</span>
        </div>

        <div className="mb-10 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={prev}>
            <SkipBack className="h-5 w-5" />
          </Button>
          <Button size="icon" className="h-14 w-14 rounded-full" onClick={togglePlay}>
            {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="ml-0.5 h-6 w-6" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={next}>
            <SkipForward className="h-5 w-5" />
          </Button>
        </div>

        <div className="w-full border-t pt-8">
          <Button asChild className="w-full rounded-full" variant="secondary">
            <Link href={`/search?query=${encodeURIComponent(artistName)}`}>Zu Artist</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
