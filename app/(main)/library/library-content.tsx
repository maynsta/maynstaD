"use client"

import { useState, useMemo } from "react"
import type { Playlist, LibraryItem, Profile, Song, Album } from "@/lib/types"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Plus, Grid, List, Music, Disc, Mic2, ChevronLeft } from "lucide-react"
import { CreatePlaylistDialog } from "@/components/create-playlist-dialog"
import { PlaylistCard } from "@/components/playlist-card"
import { SongListItem } from "@/components/song-list-item"
import { AlbumCard } from "@/components/album-card"
import useSWR, { mutate } from "swr"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface LibraryContentProps {
  playlists: Playlist[]
  librarySongs: LibraryItem[]
  libraryAlbums: LibraryItem[]
  profile: Profile | null
  userId: string
  currentPlaylistId?: string // optional, wenn man sich in einer Playlist befindet
}

export function LibraryContent({
  playlists: initialPlaylists,
  librarySongs: initialLibrarySongs,
  libraryAlbums: initialLibraryAlbums,
  profile,
  userId,
  currentPlaylistId,
}: LibraryContentProps) {
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false)
  const [viewMode, setViewMode] = useState<"grid" | "list">("list")

  const { data: playlists, mutate: mutatePlaylists } = useSWR(
    `playlists-${userId}`,
    async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from("playlists")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
      return data || []
    },
    { fallbackData: initialPlaylists },
  )

  const { data: librarySongs } = useSWR(
    `library-songs-${userId}`,
    async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from("library_items")
        .select("*, song:songs(*, artist:profiles(*))")
        .eq("user_id", userId)
        .not("song_id", "is", null)
        .order("added_at", { ascending: false })
      return data || []
    },
    { fallbackData: initialLibrarySongs },
  )

  const { data: libraryAlbums } = useSWR(
    `library-albums-${userId}`,
    async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from("library_items")
        .select("*, album:albums(*, artist:profiles(*))")
        .eq("user_id", userId)
        .not("album_id", "is", null)
        .order("added_at", { ascending: false })
      return data || []
    },
    { fallbackData: initialLibraryAlbums },
  )

  const { data: libraryArtists } = useSWR(
    `library-artists-${userId}`,
    async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from("library_items")
        .select("*, artist:profiles(*)")
        .eq("user_id", userId)
        .not("artist_id", "is", null)
        .order("added_at", { ascending: false })
      return data || []
    },
  )

  const artists: Profile[] = useMemo(() => {
    const map = new Map<string, Profile>()
    ;(libraryArtists || []).forEach((item) => {
      if (item.artist && !map.has(item.artist.id)) {
        map.set(item.artist.id, item.artist)
      }
    })
    return Array.from(map.values())
  }, [libraryArtists])

  const songs: Song[] = useMemo(() => {
    const map = new Map<string, Song>()
    ;(librarySongs || []).forEach((item) => {
      if (item.song && !map.has(item.song.id)) {
        map.set(item.song.id, item.song)
      }
    })
    return Array.from(map.values())
  }, [librarySongs])

  const albums: Album[] = useMemo(() => {
    const map = new Map<string, Album>()
    ;(libraryAlbums || []).forEach((item) => {
      if (item.album && !map.has(item.album.id)) {
        map.set(item.album.id, item.album)
      }
    })
    return Array.from(map.values())
  }, [libraryAlbums])

  return (
    <div className="p-8">
      {/* ---------------- BACK BUTTON ---------------- */}
      {currentPlaylistId && (
        <div className="mb-6">
          <Link href="/library">
            <Button className="mt-4">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Zurück zur Bibliothek
            </Button>
          </Link>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-foreground">Bibliothek</h1>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("grid")}
          >
            <Grid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="playlists">
        <TabsList className="mb-6">
          <TabsTrigger value="playlists">Playlists</TabsTrigger>
          <TabsTrigger value="songs">Songs</TabsTrigger>
          <TabsTrigger value="albums">Alben</TabsTrigger>
          <TabsTrigger value="artists">Künstler</TabsTrigger>
        </TabsList>

        <TabsContent value="playlists">
          <div className="mb-4">
            <Button onClick={() => setShowCreatePlaylist(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Playlist erstellen
            </Button>
          </div>

          {!playlists?.length ? (
            <div className="text-center py-12">
              <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Noch keine Playlists erstellt.</p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {playlists.map((playlist) => (
                <PlaylistCard key={playlist.id} playlist={playlist} variant="grid" />
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {playlists.map((playlist) => (
                <PlaylistCard key={playlist.id} playlist={playlist} variant="list" />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ---------------- SONGS ---------------- */}
        <TabsContent value="songs">
          {!songs.length ? (
            <div className="text-center py-12">
              <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Noch keine Songs in der Bibliothek.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {songs.map((song) => (
                <SongListItem
                  key={song.id}
                  song={song}
                  queue={songs}
                  playlists={playlists || []}
                  showExplicitWarning={!!profile?.parental_controls_enabled}
                  isBlocked={
                    song.is_explicit &&
                    profile?.parental_controls_enabled &&
                    !profile.explicit_content_enabled
                  }
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ---------------- ALBEN ---------------- */}
        <TabsContent value="albums">
          {!albums.length ? (
            <div className="text-center py-12">
              <Disc className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Noch keine Alben in der Bibliothek.</p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {albums.map((album) => (
                <AlbumCard key={album.id} album={album} variant="grid" />
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {albums.map((album) => (
                <AlbumCard key={album.id} album={album} variant="list" />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ---------------- KÜNSTLER ---------------- */}
        <TabsContent value="artists">
          {!artists.length ? (
            <div className="text-center py-12">
              <Mic2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Noch keine Künstler in der Bibliothek.</p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {artists.map((artist) => (
                <Link
                  key={artist.id}
                  href={`/artist/${artist.id}`}
                  className="group flex flex-col items-center p-4 rounded-2xl hover:bg-accent transition-colors text-center"
                >
                  <Avatar className="h-32 w-32 mb-4 border-2 border-border group-hover:border-primary transition-colors">
                    <AvatarImage src={artist.avatar_url || ""} />
                    <AvatarFallback className="text-2xl">
                      {artist.artist_name?.[0] || artist.display_name?.[0] || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="font-semibold text-foreground truncate w-full">
                    {artist.artist_name || artist.display_name}
                  </h3>
                  <p className="text-xs text-muted-foreground">Künstler</p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {artists.map((artist) => (
                <Link
                  key={artist.id}
                  href={`/artist/${artist.id}`}
                  className="flex items-center gap-4 p-2 rounded-xl hover:bg-accent transition-colors"
                >
                  <Avatar className="h-12 w-12 border border-border">
                    <AvatarImage src={artist.avatar_url || ""} />
                    <AvatarFallback>
                      {artist.artist_name?.[0] || artist.display_name?.[0] || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium text-foreground">
                      {artist.artist_name || artist.display_name}
                    </h3>
                    <p className="text-xs text-muted-foreground">Künstler</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <CreatePlaylistDialog
        open={showCreatePlaylist}
        onOpenChange={setShowCreatePlaylist}
        onCreated={() => mutatePlaylists()}
      />
    </div>
  )
}
