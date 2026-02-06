import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ArtistDashboard } from "./artist-dashboard"

const PAGE_SIZE = 12

export default async function ArtistPage({
  searchParams,
}: {
  searchParams: { page?: string }
}) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData?.user?.id

  // Get profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single()

  // Redirect if not an artist
  if (!profile?.is_artist) {
    redirect("/account")
  }

  const page = Number(searchParams.page ?? "1")
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  // Get artist's albums (paginated)
  const { data: albums } = await supabase
    .from("albums")
    .select("*, songs(*)")
    .eq("artist_id", userId)
    .order("created_at", { ascending: false })
    .range(from, to)

  // Get singles (songs without album)
  const { data: singles } = await supabase
    .from("songs")
    .select("*")
    .eq("artist_id", userId)
    .is("album_id", null)
    .order("created_at", { ascending: false })

  return (
    <ArtistDashboard
      profile={profile}
      albums={albums || []}
      singles={singles || []}
      userId={userId || ""}
      page={page}
      pageSize={PAGE_SIZE}
    />
  )
}
