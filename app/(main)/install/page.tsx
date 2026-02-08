"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft, Download } from "lucide-react"
import { Button } from "@/components/ui/button"

const platforms = [
  { label: "Apple Intel", file: "Maynsta-Apple-Intel.dmg", url: "" },
  { label: "Apple ARM", file: "Maynsta-Apple-ARM.dmg", url: "" },
  { label: "Windows", file: "Maynsta-Windows.exe", url: "" },
  { label: "Debian", file: "Maynsta-Debian.deb", url: "" },
  { label: "Fedora", file: "Maynsta-Fedora.rpm", url: "" },
  { label: "Linux", file: "Maynsta-Linux.AppImage", url: "" },
]

export default function InstallPage() {
  const router = useRouter()

  return (
    <div className="p-8 flex flex-col items-center">
      <div className="w-full max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück
        </Button>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Install the App!</h1>
          <p className="text-muted-foreground">
            Wähle deine Plattform und starte den Download.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {platforms.map((platform) => (
            <div
              key={platform.label}
              className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3"
            >
              <div>
                <h2 className="text-lg font-semibold">{platform.label}</h2>
                <p className="text-sm text-muted-foreground">{platform.file}</p>
              </div>
              <Button asChild className="rounded-full w-full">
                <a href={platform.url} download>
                  <Download className="h-4 w-4 mr-2" />
                  Installieren
                </a>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
