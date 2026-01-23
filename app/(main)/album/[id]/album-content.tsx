'use client'

import type { Album, Song, Playlist, Profile } from "@/lib/types"
import { SongListItem } from "@/components/song-list-item"
import { Button } from "@/components/ui/button"
import { usePlayer } from "@/contexts/player-context"
import { Play, Pause, Music, Clock, Check, ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { mutate } from "swr"
import { PinDialog } from "@/components/pin-dialog"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

interface AlbumContentProps {
  album: Album
  songs: Song[]
  playlists: Playlist[]
  profile: Profile | null
  userId: string
}

function formatDuration(seconds: number | undefined): string {
  if (!seconds || isNaN(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function AlbumContent({ album, songs, playlists, profile, userId }: AlbumContentProps) {
  const { currentSong, isPlaying, playSong, pause, resume, playlist, setPlaylist } = usePlayer()
  const [showPinDialog, setShowPinDialog] = useState(false)
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)
  const [addedToLibrary, setAddedToLibrary] = useState(false)
  const [showBanner, setShowBanner] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)

  const router = useRouter()
  const isCurrentAlbum = songs.some(s => s.id === currentSong?.id)
  const totalDuration = songs.reduce((acc, song) => acc + (song.duration || 0), 0)

  // Update progress for current song
  useEffect(() => {
    let interval: NodeJS.Timer
    if (currentSong) {
      interval = setInterval(() => {
        const audio = document.querySelector('audio')
        if (audio) {
          setProgress(audio.currentTime)
          setDuration(audio.duration || 0)
        }
      }, 500)
    } else {
      setProgress(0)
      setDuration(0)
    }

    return () => clearInterval(interval)
  }, [currentSong])

  const handlePlayAll = async () => {
    if (songs.length === 0) return

    const hasExplicit = songs.some((s) => s.is_explicit)
    if (hasExplicit && profile?.parental_controls_enabled && !profile.explicit_content_enabled) {
      setPendingAction(() => () => {
        setPlaylist(songs)
        playSong(songs[0])
      })
      setShowPinDialog(true)
      return
    }

    if (isCurrentAlbum && isPlaying) {
      pause()
    } else {
      setPlaylist(songs)
      playSong(songs[0])
    }
  }

  const handleAddToLibrary = async () => {
    const supabase = createClient()
    await supabase.from("library_items").insert({
      user_id: userId,
      album_id: album.id,
    })

    setAddedToLibrary(true)
    setShowBanner(true)
    setTimeout(() => {
      setAddedToLibrary(false)
      setShowBanner(false)
    }, 2000)
  }

  const handlePinSuccess = () => {
    setShowPinDialog(false)
    pendingAction?.()
    setPendingAction(null)
  }

  return (
    <div className="p-8 relative min-h-screen pb-40">
      {/* Back Button */}
      <button
        className="flex items-center gap-2 text-sm text-muted-foreground mb-4"
        onClick={() => router.back()}
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück
      </button>

      {/* Album header */}
      <div className="flex flex-col md:flex-row gap-6 mb-8">
        <div className="w-48 h-48 shrink-0 rounded-lg bg-muted overflow-hidden shadow-lg">
          {album.cover_url ? (
            <img src={album.cover_url || "/placeholder.svg"} alt={album.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Music className="h-16 w-16 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="flex flex-col justify-end">
          <p className="text-sm text-muted-foreground uppercase tracking-wider mb-2">
            {album.is_single ? "Single" : "Album"}
          </p>
          <h1 className="text-4xl font-bold text-foreground mb-2">{album.title}</h1>
          <p className="text-muted-foreground mb-4">
            {album.artist?.display_name || album.artist?.artist_name || "Unbekannt"}
          </p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <span>{songs.length} Songs</span>
            <span>•</span>
            <Clock className="h-4 w-4" />
            <span>{formatDuration(totalDuration)}</span>
          </div>
          <div className="flex gap-3">
            <Button size="lg" onClick={handlePlayAll} disabled={songs.length === 0}>
              {isCurrentAlbum && isPlaying ? (
                <>
                  <Pause className="h-5 w-5 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-5 w-5 mr-2" />
                  Abspielen
                </>
              )}
            </Button>
            <Button size="lg" variant="outline" onClick={handleAddToLibrary}>
              {addedToLibrary ? <Check className="h-5 w-5" /> : "Zur Bibliothek"}
            </Button>
          </div>
        </div>
      </div>

      {/* Songs list */}
      <section>
        <h2 className="text-xl font-semibold text-foreground mb-4">Songs</h2>
        {songs.length === 0 ? (
          <p className="text-muted-foreground">Keine Songs in diesem Album.</p>
        ) : (
          <div className="space-y-1">
            {songs.map((song) => {
              const isBlocked =
                song.is_explicit && profile?.parental_controls_enabled && !profile.explicit_content_enabled

              return (
                <SongListItem
                  key={song.id}
                  song={song}
                  queue={songs}
                  playlists={playlists}
                  showExplicitWarning={!!profile?.parental_controls_enabled}
                  isBlocked={isBlocked}
                  onRequestPin={async () => {
                    return new Promise((resolve) => {
                      setPendingAction(() => () => resolve(true))
                      setShowPinDialog(true)
                    })
                  }}
                  onPlaylistCreated={() => mutate(`playlists-${userId}`)}
                />
              )
            })}
            {/* Spacer für immer scrollbaren Bereich */}
            <div className="h-[1000px]" />
          </div>
        )}
      </section>

      {/* Audio Player */}
      <div className="fixed bottom-0 left-0 w-full bg-background px-4 py-2 flex items-center gap-4">
        <div className="flex-1">
          <p className="truncate">{currentSong?.title || 'Kein Song'}</p>
          <div className="h-1 bg-muted rounded mt-1 relative">
            <div
              className="h-1 bg-foreground rounded absolute left-0 top-0"
              style={{ width: duration ? `${(progress / duration) * 100}%` : '0%' }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>{formatDuration(progress)}</span>
            <span>{formatDuration(duration)}</span>
          </div>
        </div>
        <Button size="icon" onClick={() => currentSong && (isPlaying ? pause() : resume())}>
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </Button>
      </div>

      <PinDialog
        open={showPinDialog}
        onOpenChange={setShowPinDialog}
        correctPin={profile?.parental_pin || ""}
        onSuccess={handlePinSuccess}
      />

      {/* Added to Library Banner */}
      {showBanner && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 bg-foreground text-background px-4 py-2 rounded shadow-lg">
          Hinzugefügt
        </div>
      )}
    </div>
  )
}
