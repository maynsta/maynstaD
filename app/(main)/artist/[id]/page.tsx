import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { ArtistProfileContent } from "./artist-profile-content"

export default async function ArtistProfilePage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData?.user?.id

  // Get artist profile
  const { data: artist } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", params.id)
    .single()

  if (!artist || !artist.is_artist) {
    notFound()
  }

  // Get artist's albums
  const { data: albums } = await supabase
    .from("albums")
    .select("*, songs(*)")
    .eq("artist_id", params.id)
    .order("created_at", { ascending: false })

  // Get singles
  const { data: singles } = await supabase
    .from("songs")
    .select("*, artist:profiles(*), album:albums(*)")
    .eq("artist_id", params.id)
    .is("album_id", null)
    .order("created_at", { ascending: false })

  // Check if saved in library
  const { data: libraryItem } = await supabase
    .from("library_items")
    .select("*")
    .eq("user_id", userId)
    .eq("artist_id", params.id)
    .single()

  // Get playlists for song list items
  const { data: playlists } = await supabase
    .from("playlists")
    .select("*")
    .eq("user_id", userId)

  return (
    <ArtistProfileContent
      artist={artist}
      albums={albums || []}
      singles={singles || []}
      isSaved={!!libraryItem}
      userId={userId || ""}
      playlists={playlists || []}
    />
  )
}
