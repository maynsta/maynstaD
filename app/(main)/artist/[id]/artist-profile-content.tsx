"use client"

import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Heart, Music, Disc, Trash2, ChevronUp, ChevronDown } from "lucide-react"
import { AlbumCard } from "@/components/album-card"
import { SongListItem } from "@/components/song-list-item"
import type { Profile, Album, Song, Playlist } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"
import { mutate } from "swr"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface ArtistProfileContentProps {
  artist: Profile
  albums: Album[]
  singles: Song[]
  isSaved: boolean
  userId: string
  playlists: Playlist[]
}

export function ArtistProfileContent({
  artist,
  albums: initialAlbums,
  singles,
  isSaved: initialIsSaved,
  userId,
  playlists,
}: ArtistProfileContentProps) {
  const [isSaved, setIsSaved] = useState(initialIsSaved)
  const [isSaving, setIsSaving] = useState(false)
  const [albums, setAlbums] = useState(initialAlbums)
  const [albumSongs, setAlbumSongs] = useState<Record<string, Song[]>>(
    Object.fromEntries(initialAlbums.map((a) => [a.id, a.songs || []]))
  )

  const toggleSave = async () => {
    if (!userId) return
    setIsSaving(true)
    const supabase = createClient()

    if (isSaved) {
      await supabase
        .from("library_items")
        .delete()
        .eq("user_id", userId)
        .eq("artist_id", artist.id)
    } else {
      await supabase.from("library_items").insert({
        user_id: userId,
        artist_id: artist.id,
      })
    }

    setIsSaved(!isSaved)
    setIsSaving(false)
    mutate(`library-artists-${userId}`)
  }

  const handleDeleteSong = async (albumId: string, songId: string) => {
    const supabase = createClient()
    await supabase.from("album_songs").delete().eq("album_id", albumId).eq("song_id", songId)
    setAlbumSongs((prev) => ({
      ...prev,
      [albumId]: prev[albumId].filter((s) => s.id !== songId),
    }))
  }

  const moveSong = (albumId: string, index: number, direction: "up" | "down") => {
    setAlbumSongs((prev) => {
      const songs = [...prev[albumId]]
      const newIndex = direction === "up" ? index - 1 : index + 1
      if (newIndex < 0 || newIndex >= songs.length) return prev
      const temp = songs[newIndex]
      songs[newIndex] = songs[index]
      songs[index] = temp
      return { ...prev, [albumId]: songs }
    })
  }

  const handleDeleteAlbum = async (albumId: string) => {
    const supabase = createClient()
    await supabase.from("albums").delete().eq("id", albumId)
    setAlbums((prev) => prev.filter((a) => a.id !== albumId))
    mutate(`library-albums-${userId}`)
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-80 w-full overflow-hidden bg-gradient-to-b from-primary/20 to-background flex items-end p-8">
        <div className="flex w-full max-w-5xl items-center justify-center gap-8">
          <Avatar className="h-48 w-48 border-4 border-background shadow-2xl">
            <AvatarImage src={artist.avatar_url || ""} />
            <AvatarFallback className="text-4xl">
              {artist.artist_name?.[0] || artist.display_name?.[0] || "?"}
            </AvatarFallback>
          </Avatar>
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Verifizierter Künstler
            </p>
            <h1 className="text-6xl font-black mb-4">{artist.artist_name || artist.display_name}</h1>
            <div className="flex items-center gap-4 justify-center">
              <Button onClick={toggleSave} variant={isSaved ? "secondary" : "default"} disabled={isSaving} className="rounded-full">
                <Heart className={`h-4 w-4 mr-2 ${isSaved ? "fill-primary text-primary" : ""}`} />
                {isSaved ? "In Bibliothek" : "Folgen"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-12 w-full max-w-5xl">
        {artist.artist_bio && (
          <section>
            <h2 className="text-2xl font-bold mb-4">Über</h2>
            <p className="text-muted-foreground max-w-2xl leading-relaxed mx-auto text-center">
              {artist.artist_bio}
            </p>
          </section>
        )}

        {albums.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-6">Alben</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 justify-items-center">
              {albums.map((album) => (
                <div key={album.id} className="relative border p-4 rounded-lg shadow hover:shadow-lg">
                  <AlbumCard album={album} />
                  
                  {/* Album delete button */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="outline" className="absolute top-2 right-2">
                        <Trash2 className="h-4 w-4 mr-1" />
                        Album löschen
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Album löschen?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Bist du sicher, dass du das Album "{album.name}" löschen möchtest? Diese Aktion kann nicht rückgängig gemacht werden.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteAlbum(album.id)}>Löschen</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  {/* Songs list inside album */}
                  <div className="mt-4 space-y-2">
                    {(albumSongs[album.id] || []).map((song, idx) => (
                      <div key={song.id} className="flex items-center justify-between gap-2 p-2 border rounded">
                        <span>{song.title}</span>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="outline" onClick={() => moveSong(album.id, idx, "up")}>
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="outline" onClick={() => moveSong(album.id, idx, "down")}>
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="destructive" onClick={() => handleDeleteSong(album.id, song.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {singles.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-6">Singles & Songs</h2>
            <div className="space-y-1">
              {singles.map((song) => (
                <SongListItem key={song.id} song={song} queue={singles} playlists={playlists} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
