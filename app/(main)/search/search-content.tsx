"use client"

import type React from "react"
import { useState, useCallback, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Trash2, X, Sparkles, Loader2, MessageCircle, User } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { SongListItem } from "@/components/song-list-item"
import { AlbumCard } from "@/components/album-card"
import type { Song, Album, SearchHistory, Playlist, Profile } from "@/lib/types"
import useSWR, { mutate } from "swr"
import { debounce } from "lodash"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface SearchContentProps {
  initialSearchHistory: SearchHistory[]
  userId: string
}

export function SearchContent({ initialSearchHistory, userId }: SearchContentProps) {
  const [query, setQuery] = useState("")
  const [searchResults, setSearchResults] = useState<{ songs: Song[]; albums: Album[]; artists: Profile[] } | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  const debouncedSearch = useCallback(
    debounce((q: string) => {
      handleSearch(q)
    }, 500),
    [],
  )

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    debouncedSearch(value)
  }
  
  const [aiQuestion, setAiQuestion] = useState("")
  const [aiResponse, setAiResponse] = useState("")
  const [isAskingAi, setIsAskingAi] = useState(false)
  const [showAiChat, setShowAiChat] = useState(false)

  const { data: searchHistory, mutate: mutateHistory } = useSWR(
    `search-history-${userId}`,
    async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from("search_history")
        .select("*")
        .eq("user_id", userId)
        .order("searched_at", { ascending: false })
        .limit(10)
      return data || []
    },
    { fallbackData: initialSearchHistory },
  )

  const { data: playlists } = useSWR(`playlists-${userId}`, async () => {
    const supabase = createClient()
    const { data } = await supabase.from("playlists").select("*").eq("user_id", userId)
    return data || []
  })

  const handleSearch = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setSearchResults(null)
        return
      }

      setIsSearching(true)
      const supabase = createClient()

      await supabase.from("search_history").insert({
        user_id: userId,
        query: searchQuery.trim(),
      })

      const { data: songs } = await supabase
        .from("songs")
        .select("*, artist:profiles(*), album:albums(*)")
        .or(`title.ilike.%${searchQuery}%,artist.display_name.ilike.%${searchQuery}%`)
        .limit(20)

      const { data: albums } = await supabase
        .from("albums")
        .select("*, artist:profiles(*)")
        .ilike("title", `%${searchQuery}%`)
        .limit(10)

      const { data: artists } = await supabase
        .from("profiles")
        .select("*")
        .eq("is_artist", true)
        .or(`artist_name.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
        .limit(10)

      setSearchResults({
        songs: songs || [],
        albums: albums || [],
        artists: artists || [],
      })

      mutateHistory()
      setIsSearching(false)
    },
    [userId, mutateHistory],
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSearch(query)
  }

  const handleClearHistory = async () => {
    const supabase = createClient()
    await supabase.from("search_history").delete().eq("user_id", userId)
    mutateHistory([])
  }

  const handleHistoryClick = (historyQuery: string) => {
    setQuery(historyQuery)
    handleSearch(historyQuery)
  }

  const handleClearSearch = () => {
    setQuery("")
    setSearchResults(null)
    setShowAiChat(false)
    setAiResponse("")
  }

  const handleAskAi = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!aiQuestion.trim()) return

    setIsAskingAi(true)
    setAiResponse("")

    try {
      const firstSong = searchResults?.songs[0]
      const response = await fetch("/api/ai-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: aiQuestion,
          songTitle: firstSong?.title,
          artistName: firstSong?.artist?.display_name,
        }),
      })

      const data = await response.json()
      
      if (data.error) {
        setAiResponse(data.error)
      } else {
        setAiResponse(data.answer)
      }
    } catch {
      setAiResponse("Ein Fehler ist aufgetreten. Bitte versuche es erneut.")
    } finally {
      setIsAskingAi(false)
      setAiQuestion("")
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-foreground mb-6">Suche</h1>

      <form onSubmit={handleSubmit} className="mb-8">
        <div className="flex gap-2 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Songs, Alben oder Künstler suchen..."
              value={query}
              onChange={handleQueryChange}
              className="pl-10 pr-10 bg-card rounded-full"
            />
            {query && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={handleClearSearch}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          {searchHistory && searchHistory.length > 0 && (
            <Button type="button" variant="outline" size="icon" onClick={handleClearHistory} title="Verlauf löschen" className="rounded-full">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </form>

      {!searchResults && searchHistory && searchHistory.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-3">Letzte Suchen</h2>
          <div className="flex flex-wrap gap-2">
            {searchHistory.map((item) => (
              <Button
                key={item.id}
                variant="secondary"
                size="sm"
                onClick={() => handleHistoryClick(item.query)}
                className="rounded-full"
              >
                {item.query}
              </Button>
            ))}
          </div>
        </section>
      )}

      {searchResults && (
        <div>
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-purple-500" />
              <h3 className="font-semibold text-foreground">Frag die KI</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAiChat(!showAiChat)}
                className="ml-auto rounded-full"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                {showAiChat ? "Schließen" : "Frage stellen"}
              </Button>
            </div>

            {showAiChat && (
              <div className="space-y-3">
                <form onSubmit={handleAskAi} className="flex gap-2">
                  <Input
                    placeholder="Stell eine Frage über diesen Song..."
                    value={aiQuestion}
                    onChange={(e) => setAiQuestion(e.target.value)}
                    className="bg-background"
                    disabled={isAskingAi}
                  />
                  <Button type="submit" disabled={isAskingAi || !aiQuestion.trim()} className="rounded-full">
                    {isAskingAi ? <Loader2 className="h-4 w-4 animate-spin" /> : "Fragen"}
                  </Button>
                </form>

                {aiResponse && (
                  <div className="p-3 rounded-xl bg-background border">
                    <p className="text-sm text-foreground">{aiResponse}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {searchResults.songs.length === 0 && searchResults.albums.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Keine Ergebnisse für "{query}" gefunden.</p>
            </div>
          ) : (
            <>
              {searchResults.songs.length > 0 && (
                <section className="mb-10">
                  <h2 className="text-xl font-semibold text-foreground mb-4">Songs</h2>
                  <div className="space-y-1">
                    {searchResults.songs.map((song) => (
                      <SongListItem
                        key={song.id}
                        song={song}
                        queue={searchResults.songs}
                        playlists={(playlists as Playlist[]) || []}
                        onPlaylistCreated={() => mutate(`playlists-${userId}`)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {searchResults.albums.length > 0 && (
                <section className="mb-10">
                  <h2 className="text-xl font-semibold text-foreground mb-4">Alben</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {searchResults.albums.map((album) => (
                      <AlbumCard key={album.id} album={album} />
                    ))}
                  </div>
                </section>
              )}

              {searchResults.artists.length > 0 && (
                <section>
                  <h2 className="text-xl font-semibold text-foreground mb-4">Künstler</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {searchResults.artists.map((artist) => (
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
                </section>
              )}
            </>
          )}
        </div>
      )}

      {!searchResults && (!searchHistory || searchHistory.length === 0) && (
        <div className="text-center py-12">
          <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Suche nach deiner Lieblingsmusik</p>
        </div>
      )}
    </div>
  )
}
