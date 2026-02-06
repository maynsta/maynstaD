"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Search, Library, User, Music, ChevronLeft, ChevronRight, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSidebar } from "@/contexts/sidebar-context"
import { Button } from "@/components/ui/button"
import { useSwipeable } from "react-swipeable"

// Alle Navigationseinträge, inkl. AI-Chat
const navItems = [
  { href: "/home", icon: Home, label: "Home" },
  { href: "/search", icon: Search, label: "Suche" },
  { href: "/library", icon: Library, label: "Bibliothek" },
  { href: "/account", icon: User, label: "Konto" },
  { href: "/ai-chat", icon: MessageSquare, label: "AI-Chat" }, // neue Kategorie
]

export function Sidebar() {
  const pathname = usePathname()
  const { isCollapsed, toggleSidebar } = useSidebar()

  const handlers = useSwipeable({
    onSwipedRight: (e) => {
      if (e.initial[0] < 50 && isCollapsed) toggleSidebar()
    },
    onSwipedLeft: () => {
      if (!isCollapsed) toggleSidebar()
    },
    trackMouse: true,
  })

  return (
    <>
      {/* Ausklapp-Button, nur sichtbar, wenn Sidebar eingeklappt */}
      {isCollapsed && (
        <div className="fixed top-4 left-4 z-50">
          <Button
            variant="outline"
            size="icon"
            onClick={toggleSidebar}
            className="rounded-full shadow-md bg-card"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* Swipe Wrapper */}
      <div {...handlers}>
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed top-0 left-0 z-50 h-full bg-card transition-all duration-300 overflow-hidden",
            isCollapsed ? "w-0" : "w-screen" // Vollbild, wenn ausgeklappt
          )}
        >
          {!isCollapsed && (
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex h-16 items-center gap-2 border-b border-border px-6 justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary flex-shrink-0">
                  <Music className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold text-card-foreground">Maynsta</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleSidebar}
                  className="rounded-full shadow-md bg-card"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              </div>

              {/* Navigation */}
              <nav className="flex-1 p-4 flex flex-col">
                <ul className="space-y-2">
                  {navItems.map((item) => {
                    const isActive = pathname.startsWith(item.href)
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={cn(
                            "flex items-center gap-3 rounded-full text-sm font-medium transition-colors px-4 py-3",
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                          )}
                        >
                          <item.icon className="h-5 w-5 flex-shrink-0" />
                          {item.label}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </nav>
            </div>
          )}
        </aside>
      </div>
    </>
  )
}
