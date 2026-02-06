"use client"

import type React from "react"
import { useState, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, X, Sparkles } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { SongListItem } from "@/components/song-list-item"
import type { Song, Playlist } from "@/lib/types"
import useSWR, { mutate } from "swr"
import { debounce } from "lodash"

interface SearchContentProps {
  userId: string
}

type Suggestion =
  | { id: string; title: string; kind: "song" }
  | { id: string; title: string; kind: "album" }
  | { id: string; title: string; kind: "single" }
  | { id: string; title: string; kind: "ai" }

export function SearchContent({ userId }: SearchContentProps) {
  const [query, setQuery] = useState("")
  const [searchResults, setSearchResults] = useState<{ songs: Song[] }>({ songs: [] })
  const [aiAnswer, setAiAnswer] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  const { data: playlists } = useSWR(`playlists-${userId}`, async () => {
    const supabase = createClient()
    const { data } = await supabase.from("playlists").select("*").eq("user_id", userId)
    return data || []
  })

  // 🤖 KI-Antwort (passend zu DEINER Route → { prompt })
  const fetchAiAnswer = async (q: string) => {
    if (!q.trim()) return
    try {
      const res = await fetch("/api/ai-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: q }), // ✅ WICHTIG
      })
      const data = await res.json()
      setAiAnswer(data.answer || "Keine KI-Antwort erhalten.")
    } catch {
      setAiAnswer("Fehler bei der KI-Anfrage.")
    }
  }

  // 🔍 Vorschläge
  const fetchSuggestions = async (q: string) => {
    if (!q.trim()) {
      setSuggestions([])
      return
    }

    const supabase = createClient()

    const { data: songData } = await supabase
      .from("songs")
      .select("id, title, is_single")
      .ilike("title", `${q}%`)
      .limit(3)

    const { data: albumData } = await supabase
      .from("albums")
      .select("id, title")
      .ilike("title", `${q}%`)
      .limit(2)

    const songSuggestions: Suggestion[] =
      songData?.map((s) => ({
        id: s.id,
        title: s.title,
        kind: s.is_single ? "single" : "song",
      })) || []

    const albumSuggestions: Suggestion[] =
      albumData?.map((a) => ({
        id: a.id,
        title: a.title,
        kind: "album",
      })) || []

    const aiSuggestion: Suggestion = {
      id: "ai",
      title: `KI-Antwort zu: "${q}"`,
      kind: "ai",
    }

    const merged: Suggestion[] = [aiSuggestion, ...songSuggestions, ...albumSuggestions].slice(0, 5)

    setSuggestions(merged)
    setShowSuggestions(true)
  }

  const debouncedSuggestions = useCallback(
    debounce((q: string) => fetchSuggestions(q), 250),
    []
  )

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return

    const supabase = createClient()

    const { data: songs } = await supabase
      .from("songs")
      .select("*, artist:profiles(*), album:albums(*)")
      .ilike("title", `%${searchQuery}%`)
      .limit(20)

    setSearchResults({ songs: songs || [] })
  }

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    debouncedSuggestions(value)
    handleSearch(value)
    fetchAiAnswer(value)
  }

  const handleSuggestionClick = (s: Suggestion) => {
    if (s.kind !== "ai") {
      setQuery(s.title)
      handleSearch(s.title)
      fetchAiAnswer(s.title)
    }
    setShowSuggestions(false)
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Suche</h1>

      <div className="mb-8 max-w-2xl relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Song, Album oder Single suchen..."
          value={query}
          onChange={handleQueryChange}
          className="pl-10 pr-10 rounded-full"
        />
        {query && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1 h-7 w-7"
            onClick={() => {
              setQuery("")
              setAiAnswer(null)
              setSearchResults({ songs: [] })
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}

        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-50 mt-2 w-full bg-background border rounded-[10px] shadow">
            {suggestions.map((s) => (
              <button
                key={`${s.kind}-${s.id}`}
                onClick={() => handleSuggestionClick(s)}
                className="w-full text-left px-4 py-2 text-sm hover:bg-accent flex justify-between items-center"
              >
                <span className="flex items-center gap-2">
                  {s.kind === "ai" && <Sparkles className="h-4 w-4 text-primary" />}
                  {s.title}
                </span>
                <span className="text-xs text-muted-foreground">
                  {s.kind === "song" && "Song"}
                  {s.kind === "album" && "Album"}
                  {s.kind === "single" && "Single"}
                  {s.kind === "ai" && "KI"}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 🤖 KI ganz oben */}
      {aiAnswer && (
        <div className="mb-6 p-4 border rounded-[10px] bg-muted">
          <div className="flex items-center gap-2 mb-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-primary" />
            KI-Antwort
          </div>
          <p className="text-sm leading-relaxed">{aiAnswer}</p>
        </div>
      )}

      {/* 🎵 Songs bleiben sichtbar */}
      {searchResults.songs.length > 0 && (
        <section className="space-y-1">
          {searchResults.songs.map((song) => (
            <SongListItem
              key={song.id}
              song={song}
              queue={searchResults.songs}
              playlists={(playlists as Playlist[]) || []}
              onPlaylistCreated={() => mutate(`playlists-${userId}`)}
            />
          ))}
        </section>
      )}
    </div>
  )
}
