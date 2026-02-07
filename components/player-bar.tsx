"use client"

import { usePlayer } from "@/contexts/player-context"
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Music,
  Shuffle,
  Repeat,
  MoreHorizontal,
  Plus,
  ListPlus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useState } from "react"
import { CreatePlaylistDialog } from "@/components/create-playlist-dialog"
import { createClient } from "@/lib/supabase/client"
import useSWR, { mutate } from "swr"
import type { Playlist } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

function formatTime(seconds: number): string {
  if (!isFinite(seconds)) return "0:00"
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

export function PlayerBar() {
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false)
  const { toast } = useToast()
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
  const { data: playlists } = useSWR("player-playlists", async () => {
    const supabase = createClient()
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData?.user?.id
    if (!userId) return []
    const { data } = await supabase.from("playlists").select("*").eq("user_id", userId)
    return data || []
  })

  const handleAddToLibrary = async () => {
    if (!currentSong) return
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      toast({
        title: "Fehler",
        description: "Du musst eingeloggt sein.",
        variant: "destructive",
      })
      return
    }

    const { data: existing } = await supabase
      .from("library_items")
      .select("id")
      .eq("user_id", user.id)
      .eq("song_id", currentSong.id)
      .maybeSingle()

    if (existing) {
      toast({
        title: "Info",
        description: "Song ist bereits in deiner Bibliothek.",
      })
      return
    }

    const { error } = await supabase.from("library_items").insert({
      user_id: user.id,
      song_id: currentSong.id,
    })

    if (error) {
      toast({
        title: "Fehler",
        description: "Konnte nicht zur Bibliothek hinzugefügt werden.",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Hinzugefügt",
      description: `"${currentSong.title}" wurde zur Bibliothek hinzugefügt.`,
    })
  }

  const handleAddToPlaylist = async (playlistId: string) => {
    if (!currentSong) return
    const supabase = createClient()

    const { data: existingSongs } = await supabase
      .from("playlist_songs")
      .select("position")
      .eq("playlist_id", playlistId)
      .order("position", { ascending: false })
      .limit(1)

    const nextPosition =
      existingSongs && existingSongs.length > 0 ? existingSongs[0].position + 1 : 0

    const { error } = await supabase.from("playlist_songs").insert({
      playlist_id: playlistId,
      song_id: currentSong.id,
      position: nextPosition,
    })

    if (error) {
      toast({
        title: "Fehler",
        description: "Konnte nicht zur Playlist hinzugefügt werden.",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Hinzugefügt",
      description: `"${currentSong.title}" wurde zur Playlist hinzugefügt.`,
    })
  }

  if (!currentSong) {
    return (
      <div className="fixed bottom-0 left-0 w-screen z-50 h-20 border-t border-border bg-card">
        <div className="flex h-full items-center justify-center text-muted-foreground">
          <p className="text-sm">Wähle einen Song aus, um Musik zu hören</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed bottom-0 left-0 w-screen z-50 border-t border-border bg-card">
      <div className="flex flex-col items-center px-4 py-2">
        {/* Progressbar über allem */}
        <div className="flex w-full max-w-md items-center gap-2 mb-2">
          <span className="text-xs text-muted-foreground w-10 text-right">
            {formatTime(currentTime)}
          </span>

          <Slider
            value={[currentTime]}
            max={duration || 1}
            step={0.1}
            onValueChange={([v]) => seek(v)}
            className="flex-1"
          />

          <span className="text-xs text-muted-foreground w-10">
            {formatTime(duration)}
          </span>
        </div>

        <div className="flex w-full items-center justify-between">
          {/* Song info */}
          <div className="flex w-1/4 items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted overflow-hidden">
              {currentSong.cover_url ? (
                <img
                  src={currentSong.cover_url}
                  alt={currentSong.title}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <Music className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{currentSong.title}</p>
              <p className="truncate text-xs text-muted-foreground">
                {currentSong.artist?.display_name || "Unbekannt"}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-1 flex-col items-center gap-1">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={prev}>
                <SkipBack className="h-4 w-4" />
              </Button>

              <Button
                variant="default"
                size="icon"
                className="h-10 w-10 rounded-full"
                onClick={togglePlay}
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
              </Button>

              <Button variant="ghost" size="icon" onClick={next}>
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex w-1/4 justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={toggleShuffle} className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Shuffle className="h-4 w-4" />
                    Shuffle
                  </span>
                  <span className={isShuffled ? "text-primary" : "text-muted-foreground"}>
                    {isShuffled ? "An" : "Aus"}
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={toggleRepeat} className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Repeat className="h-4 w-4" />
                    Repeat
                  </span>
                  <span className={repeatMode !== "off" ? "text-primary" : "text-muted-foreground"}>
                    {repeatMode === "off" && "Aus"}
                    {repeatMode === "one" && "1x"}
                    {repeatMode === "all" && "Alle"}
                  </span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleAddToLibrary}>
                  <Plus className="h-4 w-4 mr-2" />
                  Zur Bibliothek hinzufügen
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowCreatePlaylist(true)}>
                  <ListPlus className="h-4 w-4 mr-2" />
                  Playlist erstellen
                </DropdownMenuItem>
                {(playlists as Playlist[])?.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    {(playlists as Playlist[]).map((playlist) => (
                      <DropdownMenuItem
                        key={playlist.id}
                        onClick={() => handleAddToPlaylist(playlist.id)}
                      >
                        {playlist.name}
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      <CreatePlaylistDialog
        open={showCreatePlaylist}
        onOpenChange={setShowCreatePlaylist}
        onCreated={() => mutate("player-playlists")}
      />
    </div>
  )
}
