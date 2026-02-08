"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowLeft, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AlbumCard } from "@/components/album-card"
import { SongListItem } from "@/components/song-list-item"
import type { Album, Playlist, Profile, Song } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"
import { mutate } from "swr"

interface ArtistSearchContentProps {
  artists: Profile[]
  userId: string
  playlists: Playlist[]
  query: string
  onDetailChange?: (active: boolean) => void
}

export function ArtistSearchContent({
  artists,
  userId,
  playlists,
  query,
  onDetailChange,
}: ArtistSearchContentProps) {
  const [selectedArtist, setSelectedArtist] = useState<{
    artist: Profile
    albums: Album[]
    songs: Song[]
    singles: Song[]
    isSaved: boolean
  } | null>(null)
  const [isSavingArtist, setIsSavingArtist] = useState(false)
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (selectedArtist) {
      setSelectedArtist(null)
      onDetailChange?.(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  const handleArtistSelect = async (artist: Profile) => {
    const supabase = createClient()

    const [
      { data: artistProfile },
      { data: albums },
      { data: songs },
      { data: singles },
      { data: libraryItem },
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", artist.id).maybeSingle(),
      supabase
        .from("albums")
        .select("*, artist:profiles(*)")
        .eq("artist_id", artist.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("songs")
        .select("*, artist:profiles(*), album:albums(*)")
        .eq("artist_id", artist.id)
        .not("album_id", "is", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("songs")
        .select("*, artist:profiles(*), album:albums(*)")
        .eq("artist_id", artist.id)
        .is("album_id", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("library_items")
        .select("id")
        .eq("user_id", userId)
        .eq("artist_id", artist.id)
        .maybeSingle(),
    ])

    setSelectedArtist({
      artist: artistProfile || artist,
    const [{ data: albums }, { data: songs }, { data: singles }, { data: libraryItem }] =
      await Promise.all([
        supabase
          .from("albums")
          .select("*, artist:profiles(*)")
          .eq("artist_id", artist.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("songs")
          .select("*, artist:profiles(*), album:albums(*)")
          .eq("artist_id", artist.id)
          .not("album_id", "is", null)
          .order("created_at", { ascending: false }),
        supabase
          .from("songs")
          .select("*, artist:profiles(*), album:albums(*)")
          .eq("artist_id", artist.id)
          .is("album_id", null)
          .order("created_at", { ascending: false }),
        supabase
          .from("library_items")
          .select("id")
          .eq("user_id", userId)
          .eq("artist_id", artist.id)
          .maybeSingle(),
      ])

    setSelectedArtist({
      artist,
      albums: albums || [],
      songs: songs || [],
      singles: singles || [],
      isSaved: !!libraryItem,
    })
    onDetailChange?.(true)
  }

  const handleArtistLibraryToggle = async () => {
    if (!selectedArtist || !userId) return
    setIsSavingArtist(true)
    const supabase = createClient()

    if (selectedArtist.isSaved) {
      await supabase
        .from("library_items")
        .delete()
        .eq("user_id", userId)
        .eq("artist_id", selectedArtist.artist.id)
    } else {
      await supabase.from("library_items").insert({
        user_id: userId,
        artist_id: selectedArtist.artist.id,
      })
    }

    setSelectedArtist((prev) => (prev ? { ...prev, isSaved: !prev.isSaved } : prev))
    setIsSavingArtist(false)
    setShowSaveConfirmation(true)
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = setTimeout(() => {
      setShowSaveConfirmation(false)
    }, 3000)
    mutate(`library-artists-${userId}`)
  }

  if (selectedArtist) {
    return (
      <div className="mt-4 flex flex-col items-center">
      <div className="mt-4">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => {
            setSelectedArtist(null)
            onDetailChange?.(false)
          }}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück zur Suche
        </Button>

        <div className="flex flex-col items-center text-center gap-3 w-full max-w-3xl">
        <div className="flex flex-col items-center text-center gap-3">
          <Avatar className="h-28 w-28">
            <AvatarImage src={selectedArtist.artist.avatar_url || ""} />
            <AvatarFallback className="text-3xl">
              {selectedArtist.artist.artist_name?.[0] ||
                selectedArtist.artist.display_name?.[0] ||
                "?"}
            </AvatarFallback>
          </Avatar>
          <h2 className="text-3xl font-bold">
            {selectedArtist.artist.artist_name || selectedArtist.artist.display_name}
          </h2>
          <Button
            onClick={handleArtistLibraryToggle}
            variant={selectedArtist.isSaved ? "secondary" : "default"}
            className="rounded-full min-w-[220px]"
            disabled={isSavingArtist}
          >
            {showSaveConfirmation ? (
              <Check className="h-5 w-5" />
            ) : selectedArtist.isSaved ? (
              "Aus Bibliothek entfernen"
            ) : (
              "Zur Bibliothek hinzufügen"
            )}
          </Button>
        </div>

        <div className="mt-8 flex flex-col gap-8 overflow-y-auto max-h-[calc(100vh-260px)] pr-2 w-full max-w-4xl">
        <div className="mt-8 flex flex-col gap-8 overflow-y-auto max-h-[calc(100vh-260px)] pr-2">
          {selectedArtist.songs.length > 0 && (
            <section>
              <h3 className="text-2xl font-semibold mb-4">Songs</h3>
              <div className="space-y-1">
                {selectedArtist.songs.map((song) => (
                  <SongListItem
                    key={song.id}
                    song={song}
                    queue={selectedArtist.songs}
                    playlists={playlists}
                  />
                ))}
              </div>
            </section>
          )}

          {selectedArtist.albums.length > 0 && (
            <section>
              <h3 className="text-2xl font-semibold mb-4">Alben</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                {selectedArtist.albums.map((album) => (
                  <AlbumCard key={album.id} album={album} />
                ))}
              </div>
            </section>
          )}

          {selectedArtist.singles.length > 0 && (
            <section>
              <h3 className="text-2xl font-semibold mb-4">Singles</h3>
              <div className="space-y-1">
                {selectedArtist.singles.map((song) => (
                  <SongListItem
                    key={song.id}
                    song={song}
                    queue={selectedArtist.singles}
                    playlists={playlists}
                  />
                ))}
              </div>
            </section>
          )}

          {selectedArtist.artist.artist_bio && (
            <section>
              <h3 className="text-2xl font-semibold mb-4">Biografie</h3>
              <p className="text-muted-foreground leading-relaxed">
                {selectedArtist.artist.artist_bio}
              </p>
            </section>
          )}
        </div>
      </div>
    )
  }

  if (!artists.length) {
    return null
  }

  return (
    <section className="mb-8 text-center">
    <section className="mb-8">
      <h2 className="text-xl font-semibold mb-3">Künstler</h2>
      <div className="space-y-2">
        {artists.map((artist) => (
          <button
            key={artist.id}
            type="button"
            onClick={() => handleArtistSelect(artist)}
            className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors text-left max-w-3xl mx-auto"
            className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors text-left"
          >
            <Avatar className="h-12 w-12">
              <AvatarImage src={artist.avatar_url || ""} />
              <AvatarFallback>
                {artist.artist_name?.[0] || artist.display_name?.[0] || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">
                {artist.artist_name || artist.display_name}
              </p>
              <p className="text-xs text-muted-foreground">Künstlerprofil</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}
