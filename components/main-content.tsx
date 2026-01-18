"use client"

import { useSidebar } from "@/contexts/sidebar-context"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { ChevronRight } from "lucide-react"

export function MainContent({ children }: { children: ReactNode }) {
  const { isCollapsed } = useSidebar()

  return (
    <main
      className={cn(
        "pb-24 min-h-screen transition-all duration-300",
        isCollapsed ? "ml-0" : "ml-64"
      )}
    >
      <div className="flex-1 overflow-y-auto">{children}</div>
    </main>
  )
}
