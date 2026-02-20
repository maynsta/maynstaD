'use client'

import type { Album, Song, Playlist, Profile } from "@/lib/types"
import { SongListItem } from "@/components/song-list-item"
import { Button } from "@/components/ui/button"
import { usePlayer } from "@/contexts/player-context"
import { Play, Pause, Music, Clock, Check, ArrowLeft, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { mutate } from "swr"
import { useState, useEffect, useCallback, useRef } from "react"
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

export function AlbumContent({ album, songs: initialSongs, playlists, profile, userId }: AlbumContentProps) {
  const { currentSong, isPlaying, playSong, pause, resume, setPlaylist } = usePlayer()
  const [songs, setSongs] = useState<Song[]>(initialSongs)
  const [page, setPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [totalCount, setTotalCount] = useState<number | null>(null)

  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [addedToLibrary, setAddedToLibrary] = useState(false)
  const [showBanner, setShowBanner] = useState(false)

  const router = useRouter()
  const supabase = createClient()
  const observerRef = useRef<HTMLDivElement | null>(null)

  const isCurrentAlbum = songs.some(s => s.id === currentSong?.id)
  const totalDuration = songs.reduce((acc, song) => acc + (song.duration || 0), 0)

  // Audio progress
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
    }
    return () => clearInterval(interval)
  }, [currentSong])

  // Load more with real paging + count
  const loadMoreSongs = useCallback(async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)

    const limit = 10
    const from = page * limit
    const to = from + limit - 1

    const { data, error, count } = await supabase
      .from("songs")
      .select("*", { count: "exact" })
      .eq("album_id", album.id)
      .order("track_number", { ascending: true })
      .range(from, to)

    if (!error && data) {
      setSongs(prev => [...prev, ...data])
      setPage(prev => prev + 1)
      if (count !== null) setTotalCount(count)
      if (data.length < limit) setHasMore(false)
    } else {
      setHasMore(false)
    }

    setLoadingMore(false)
  }, [album.id, page, hasMore, loadingMore, supabase])

  // Intersection Observer + Auto Prefetch
  useEffect(() => {
    if (!observerRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreSongs()
        }
      },
      { rootMargin: "400px" } // Prefetch früher
    )

    observer.observe(observerRef.current)
    return () => observer.disconnect()
  }, [loadMoreSongs])

  const handlePlayAll = () => {
    if (!songs.length) return
    setPlaylist(songs)
    playSong(songs[0])
  }

  const handleAddToLibrary = async () => {
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

  return (
    <div className="p-8 relative min-h-screen pb-40 overflow-auto">
      <button
        className="flex items-center gap-2 text-sm text-muted-foreground mb-4"
        onClick={() => router.back()}
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück
      </button>

      <div className="flex flex-col md:flex-row gap-6 mb-8">
        <div className="w-48 h-48 shrink-0 rounded-lg bg-muted overflow-hidden shadow-lg">
          {album.cover_url ? (
            <img src={album.cover_url} alt={album.title} className="w-full h-full object-cover" />
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
            <span>{songs.length}{totalCount ? ` / ${totalCount}` : ""} Songs</span>
            <span>•</span>
            <Clock className="h-4 w-4" />
            <span>{formatDuration(totalDuration)}</span>
          </div>
          <div className="flex gap-3">
            <Button size="lg" onClick={handlePlayAll}>
              {isCurrentAlbum && isPlaying ? (
                <>
                  <Pause className="h-5 w-5 mr-2" /> Pause
                </>
              ) : (
                <>
                  <Play className="h-5 w-5 mr-2" /> Abspielen
                </>
              )}
            </Button>
            <Button size="lg" variant="outline" onClick={handleAddToLibrary}>
              {addedToLibrary ? <Check className="h-5 w-5" /> : "Zur Bibliothek"}
            </Button>
          </div>
        </div>
      </div>

      <section>
        <h2 className="text-xl font-semibold text-foreground mb-4">Songs</h2>
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
                parentalPin={profile?.parental_pin}
                onPlaylistCreated={() => mutate(`playlists-${userId}`)}
              />
            )
          })}

          {hasMore && <div ref={observerRef} className="h-10" />}

          {loadingMore && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </section>

      {showBanner && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 bg-foreground text-background px-4 py-2 rounded shadow-lg">
          Hinzugefügt
        </div>
      )}
    </div>
  )
}
