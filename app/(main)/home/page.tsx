// app/(main)/home/page.tsx
import { createClient } from "@/lib/supabase/server"
import { HomeContent } from "./home-content"
import { PlayerBar } from "@/components/player-bar"

export default async function HomePage() {
  const supabase = await createClient()

  // User
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData?.user?.id

  // User-Profil
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single()

  // Zuletzt gespielt
  const { data: recentlyPlayed } = await supabase
    .from("recently_played")
    .select(
      `
      *,
      song:songs(*, artist:profiles(*)),
      album:albums(*, artist:profiles(*))
    `
    )
    .eq("user_id", userId)
    .order("played_at", { ascending: false })
    .limit(10)

  const hasHistory = recentlyPlayed && recentlyPlayed.length > 0

  return (
    <div className="relative min-h-screen flex flex-col">
      {/* Scrollbarer Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        <HomeContent
          profile={profile}
          recentlyPlayed={recentlyPlayed || []}
          hasHistory={hasHistory || false}
          userId={userId || ""}
        />
      </div>

      {/* PlayerBar (Client Component) */}
      <PlayerBar />
    </div>
  )
}
