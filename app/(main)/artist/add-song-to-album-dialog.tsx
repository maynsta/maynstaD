"use client"

import type React from "react"
import { useState, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import type { Album } from "@/lib/types"
import { Music, Upload, Mic, StopCircle, PauseCircle } from "lucide-react"

interface AddSongToAlbumDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  album: Album
  userId: string
  onCreated?: () => void
}

export function AddSongToAlbumDialog({
  open,
  onOpenChange,
  album,
  userId,
  onCreated,
}: AddSongToAlbumDialogProps) {
  const [title, setTitle] = useState("")
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [isExplicit, setIsExplicit] = useState(false)
  const [hasVideo, setHasVideo] = useState(false)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [mode, setMode] = useState<"upload" | "record" | "compose">("upload")
  const [recording, setRecording] = useState(false)
  const [paused, setPaused] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])

  const audioInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  // --- Upload / Fingerprint Check ---
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !audioFile) return

    setIsLoading(true)

    try {
      setTitle("")
      setAudioFile(null)
      setIsExplicit(false)
      setHasVideo(false)
      setVideoFile(null)
      onOpenChange(false)
      onCreated?.()
    } catch (error) {
      console.error(error)
      alert("Fehler beim Hochladen")
    }
    setIsLoading(false)
  }

  // --- RECORD LOGIC ---
  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mediaRecorder = new MediaRecorder(stream)
    recordedChunksRef.current = []

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunksRef.current.push(e.data)
    }

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: "audio/webm" })
      const file = new File([blob], `recorded-${Date.now()}.webm`, { type: "audio/webm" })
      setAudioFile(file)
    }

    mediaRecorder.start()
    mediaRecorderRef.current = mediaRecorder
    setRecording(true)
    setPaused(false)
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    setRecording(false)
    setPaused(false)
  }

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.pause()
      setPaused(true)
    }
  }

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume()
      setPaused(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-[10px]">
        <DialogHeader>
          <DialogTitle>Song zu &quot;{album.title}&quot; hinzufügen</DialogTitle>
          <DialogDescription>
            Wähle eine Methode, um einen neuen Song hinzuzufügen.
          </DialogDescription>
        </DialogHeader>

        {/* MODE SWITCHER */}
        <div className="flex justify-around py-2">
          {["upload", "record", "compose"].map((m) => (
            <Button
              key={m}
              variant={mode === m ? "default" : "outline"}
              onClick={() => setMode(m as any)}
              className="rounded-[10px] px-4"
            >
              {m === "upload" ? "Upload" : m === "record" ? "Record" : "Compose"}
            </Button>
          ))}
        </div>

        <form onSubmit={handleCreate}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Song Titel</Label>
              <Input
                id="title"
                placeholder="Song Name"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="rounded-[10px]"
              />
            </div>

            {/* UPLOAD MODE */}
            {mode === "upload" && (
              <div className="grid gap-2">
                <Label>Audio Datei (MP3, WAV, MPA)</Label>
                <input
                  ref={audioInputRef}
                  type="file"
                  accept=".mp3,.wav,.mpa"
                  onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-[10px] justify-start bg-transparent"
                  onClick={() => audioInputRef.current?.click()}
                >
                  <Music className="h-4 w-4 mr-2" />
                  {audioFile ? audioFile.name : "Audio hochladen"}
                </Button>
              </div>
            )}

            {/* RECORD MODE */}
            {mode === "record" && (
              <div className="grid gap-2 text-center">
                <Label>Aufnahme</Label>
                <div className="flex justify-center gap-2">
                  {!recording && (
                    <Button onClick={startRecording} variant="outline" className="rounded-[10px]">
                      <Mic className="h-4 w-4 mr-2" /> Record
                    </Button>
                  )}
                  {recording && !paused && (
                    <Button onClick={pauseRecording} variant="destructive" className="rounded-[10px]">
                      <PauseCircle className="h-4 w-4 mr-2" /> Pause
                    </Button>
                  )}
                  {recording && paused && (
                    <Button onClick={resumeRecording} variant="outline" className="rounded-[10px]">
                      <Mic className="h-4 w-4 mr-2" /> Resume
                    </Button>
                  )}
                  {recording && (
                    <Button onClick={stopRecording} variant="default" className="rounded-[10px]">
                      <StopCircle className="h-4 w-4 mr-2" /> Stop
                    </Button>
                  )}
                </div>
                {audioFile && <p className="text-sm mt-2 text-muted-foreground">Aufnahme bereit: {audioFile.name}</p>}
              </div>
            )}

            {/* COMPOSE MODE */}
            {mode === "compose" && (
              <div className="grid gap-2 text-center">
                <Button
                  type="button"
                  variant="default"
                  className="rounded-[10px]"
                  onClick={() => window.open("https://studio.maynsta.com", "_blank")}
                >
                  Compose on Maynsta Studio
                </Button>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Expliziter Inhalt</Label>
                <p className="text-xs text-muted-foreground">
                  Song enthält unangemessene Inhalte
                </p>
              </div>
              <Switch checked={isExplicit} onCheckedChange={setIsExplicit} />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Musikvideo</Label>
                <p className="text-xs text-muted-foreground">
                  Hat dieser Song ein Musikvideo?
                </p>
              </div>
              <Switch checked={hasVideo} onCheckedChange={setHasVideo} />
            </div>

            {hasVideo && (
              <div className="grid gap-2">
                <Label>Video Datei (MP4, MOV)</Label>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept=".mp4,.mov"
                  onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-[10px] justify-start bg-transparent"
                  onClick={() => videoInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {videoFile ? videoFile.name : "Video hochladen"}
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-[10px]"
            >
              Abbrechen
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !title.trim()}
              className="rounded-[10px]"
            >
              {isLoading ? "Hinzufügen..." : "Hinzufügen"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
