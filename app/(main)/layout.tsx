import type React from "react"
import { Sidebar } from "@/components/sidebar"
import { PlayerBar } from "@/components/player-bar"
import { PlayerProvider } from "@/contexts/player-context"
import { SidebarProvider } from "@/contexts/sidebar-context"
import { MainContent } from "@/components/main-content"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Button } from "@/components/ui/button"

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
          <div className="fixed top-4 right-4 z-40">
            <Button asChild className="rounded-full">
              <Link href="/install">Install the App!</Link>
            </Button>
          </div>
          <Sidebar />
          <MainContent>
            <div className="min-h-[120vh] pb-32">
              {children}
            </div>
          </MainContent>
          <div className="min-[1440px]:hidden">
            <PlayerBar />
          </div>
        </div>
      </SidebarProvider>
    </PlayerProvider>
  )
}
