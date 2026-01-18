import type React from "react"
import { Sidebar } from "@/components/sidebar"
import { PlayerBar } from "@/components/player-bar"
import { PlayerProvider } from "@/contexts/player-context"
import { SidebarProvider } from "@/contexts/sidebar-context"
import { MainContent } from "@/components/main-content"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()

  if (!data?.user) {
    redirect("/auth/login")
  }

  return (
    <PlayerProvider>
      <SidebarProvider>
        <div className="flex h-screen bg-background text-foreground overflow-hidden">
          <Sidebar />
          <MainContent>{children}</MainContent>
          <PlayerBar />
        </div>
      </SidebarProvider>
    </PlayerProvider>
  )
}
