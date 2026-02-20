"use client"

import type { Song, Playlist } from "@/lib/types"
import { usePlayer } from "@/contexts/player-context"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Play, MoreHorizontal, Plus, ListPlus, Music } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useState, useEffect } from "react"
import { CreatePlaylistDialog } from "@/components/create-playlist-dialog"
import { useToast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

interface SongListItemProps {
  song: Song
  queue?: Song[]
  playlists?: Playlist[]
  onAddToLibrary?: (song: Song) => void
  onPlaylistCreated?: () => void
  showExplicitWarning?: boolean
  isBlocked?: boolean
  parentalPin?: string | null
}

export function SongListItem({
  song,
  queue,
  playlists = [],
  onAddToLibrary,
  onPlaylistCreated,
  showExplicitWarning = false,
  isBlocked = false,
  parentalPin,
}: SongListItemProps) {
  // ⚡ Hier: playSong -> play
  const { play, currentSong, isPlaying } = usePlayer()
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false)
  const { toast } = useToast()
  const [isMounted, setIsMounted] = useState(false)
  const [showParentalDialog, setShowParentalDialog] = useState(false)
  const [showCodeDialog, setShowCodeDialog] = useState(false)
  const [enteredCode, setEnteredCode] = useState("")
  const [codeError, setCodeError] = useState("")

  const isCurrentSong = currentSong?.id === song.id

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const handlePlay = async () => {
    if (isBlocked) {
      setShowParentalDialog(true)
      return
    }

    if (queue && queue.length > 0) {
      play(song, queue)
    } else {
      play(song)
    }
  }

  const playCurrentSong = () => {
    if (queue && queue.length > 0) {
      play(song, queue)
    } else {
      play(song)
    }
  }

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!parentalPin || enteredCode !== parentalPin) {
      setCodeError("Falscher Code")
      return
    }

    setShowCodeDialog(false)
    setShowParentalDialog(false)
    setEnteredCode("")
    setCodeError("")
    playCurrentSong()
  }

  const handleAddToLibrary = async () => {
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
      .eq("song_id", song.id)
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
      song_id: song.id,
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
      description: `"${song.title}" wurde zur Bibliothek hinzugefügt.`,
    })

    onAddToLibrary?.(song)
  }

  const handleAddToPlaylist = async (playlistId: string) => {
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
      song_id: song.id,
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
      description: `"${song.title}" wurde zur Playlist hinzugefügt.`,
    })
  }

  if (!isMounted) return null

  return (
    <>
      <div
        className={`flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors group ${
          isBlocked && showExplicitWarning ? "opacity-50" : ""
        }`}
      >
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-muted overflow-hidden">
          {song.cover_url ? (
            <img
              src={song.cover_url || "/placeholder.svg"}
              alt={song.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <Music className="h-5 w-5 text-muted-foreground" />
          )}

          {isCurrentSong && isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="flex gap-0.5">
                <span className="h-3 w-0.5 bg-primary animate-pulse" />
                <span className="h-4 w-0.5 bg-primary animate-pulse delay-75" />
                <span className="h-2 w-0.5 bg-primary animate-pulse delay-150" />
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-medium truncate ${
              isCurrentSong ? "text-primary" : "text-foreground"
            } ${isBlocked && showExplicitWarning ? "line-through" : ""}`}
          >
            {song.title}
            {song.is_explicit && (
              <span className="ml-2 text-xs text-muted-foreground bg-muted px-1 rounded">
                E
              </span>
            )}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {song.artist?.display_name || "Unbekannt"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={handlePlay}
          >
            <Play className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleAddToLibrary}>
                <Plus className="h-4 w-4 mr-2" />
                Zur Bibliothek hinzufügen
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowCreatePlaylist(true)}>
                <ListPlus className="h-4 w-4 mr-2" />
                Playlist erstellen
              </DropdownMenuItem>
              {playlists.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  {playlists.map((playlist) => (
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

      <CreatePlaylistDialog
        open={showCreatePlaylist}
        onOpenChange={setShowCreatePlaylist}
        onCreated={onPlaylistCreated}
      />

      <AlertDialog open={showParentalDialog} onOpenChange={setShowParentalDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kindersicherung aktiviert!</AlertDialogTitle>
            <AlertDialogDescription>
              Dieser Song enthält expliziten Inhalt und wird ohne Code nicht abgespielt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                setShowParentalDialog(false)
                setShowCodeDialog(true)
              }}
            >
              Code eingeben
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={showCodeDialog}
        onOpenChange={(open) => {
          setShowCodeDialog(open)
          if (!open) {
            setEnteredCode("")
            setCodeError("")
          }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Code eingeben</DialogTitle>
            <DialogDescription>
              Gib den festgelegten Kindersicherungs-Code ein, um den Song einmalig abzuspielen.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCodeSubmit} className="space-y-3">
            <Input
              type="password"
              value={enteredCode}
              onChange={(e) => {
                setEnteredCode(e.target.value.replace(/\D/g, ""))
                setCodeError("")
              }}
              inputMode="numeric"
              maxLength={6}
              placeholder="Code"
            />
            {codeError && <p className="text-sm text-destructive">{codeError}</p>}
            <Button type="submit" className="w-full">Bestätigen</Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
