"use client"

import { useSidebar } from "@/contexts/sidebar-context"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"
import { useEffect, useState } from "react"

export function MainContent({ children }: { children: ReactNode }) {
  const { isCollapsed } = useSidebar()
  const [isLargeScreen, setIsLargeScreen] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1440px)")
    const handleChange = () => setIsLargeScreen(mediaQuery.matches)
    handleChange()
    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [])

  return (
    <main
      className={cn(
        "pb-24 min-h-screen transition-all duration-300",
        isLargeScreen
          ? "ml-72"
          : isCollapsed
            ? "ml-0"
            : "ml-64"
      )}
    >
      <div className="flex-1 overflow-y-auto">{children}</div>
    </main>
  )
}
