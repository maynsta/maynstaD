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
import { createClient } from "@/lib/supabase/client"
import { Music, Upload, ImagePlus } from "lucide-react"

interface CreateSingleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  onCreated?: () => void
}

export function CreateSingleDialog({
  open,
  onOpenChange,
  userId,
  onCreated,
}: CreateSingleDialogProps) {
  const [title, setTitle] = useState("")
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [isExplicit, setIsExplicit] = useState(false)
  const [hasVideo, setHasVideo] = useState(false)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const coverInputRef = useRef<HTMLInputElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setCoverFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setCoverPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setIsLoading(true)
    const supabase = createClient()

    let coverUrl: string | null = null
    let audioUrl: string | null = null
    let videoUrl: string | null = null

    if (coverFile) {
      const ext = coverFile.name.split(".").pop()
      const path = `${userId}/${Date.now()}-cover.${ext}`
      await supabase.storage.from("covers").upload(path, coverFile)
      coverUrl = supabase.storage.from("covers").getPublicUrl(path).data.publicUrl
    }

    if (audioFile) {
      const ext = audioFile.name.split(".").pop()
      const path = `${userId}/${Date.now()}-audio.${ext}`
      await supabase.storage.from("audio").upload(path, audioFile)
      audioUrl = supabase.storage.from("audio").getPublicUrl(path).data.publicUrl
    }

    if (hasVideo && videoFile) {
      const ext = videoFile.name.split(".").pop()
      const path = `${userId}/${Date.now()}-video.${ext}`
      await supabase.storage.from("videos").upload(path, videoFile)
      videoUrl = supabase.storage.from("videos").getPublicUrl(path).data.publicUrl
    }

    // ✅ SINGLE erstellen (NICHT mehr Album!)
    const { data: single } = await supabase
      .from("singles")
      .insert({
        artist_id: userId,
        title: title.trim(),
        cover_url: coverUrl,
      })
      .select()
      .single()

    if (single) {
      // ✅ Song mit single_id statt album_id
      await supabase.from("songs").insert({
        single_id: single.id,
        artist_id: userId,
        title: title.trim(),
        cover_url: coverUrl,
        audio_url: audioUrl,
        is_explicit: isExplicit,
        has_music_video: hasVideo,
        music_video_url: videoUrl,
        duration: 180,
      })
    }

    setTitle("")
    setCoverFile(null)
    setCoverPreview(null)
    setAudioFile(null)
    setIsExplicit(false)
    setHasVideo(false)
    setVideoFile(null)
    setIsLoading(false)
    onOpenChange(false)
    onCreated?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-[10px]">
        <DialogHeader>
          <DialogTitle>Single hochladen</DialogTitle>
          <DialogDescription>Lade eine neue Single hoch.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreate}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Titel</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="rounded-[10px]"
              />
            </div>

            <div className="grid gap-2">
              <Label>Cover</Label>
              <div className="flex gap-3 items-center">
                <div
                  className="h-16 w-16 rounded-[10px] border-2 border-dashed flex items-center justify-center cursor-pointer"
                  onClick={() => coverInputRef.current?.click()}
                >
                  {coverPreview ? (
                    <img src={coverPreview} className="h-full w-full object-cover rounded-[10px]" />
                  ) : (
                    <ImagePlus className="h-5 w-5" />
                  )}
                </div>
                <input ref={coverInputRef} type="file" accept="image/*" hidden onChange={handleCoverChange} />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Audio</Label>
              <input ref={audioInputRef} type="file" accept=".mp3,.wav" hidden onChange={(e) => setAudioFile(e.target.files?.[0] || null)} />
              <Button type="button" variant="outline" onClick={() => audioInputRef.current?.click()}>
                <Music className="h-4 w-4 mr-2" />
                {audioFile?.name || "Audio hochladen"}
              </Button>
            </div>

            <div className="flex justify-between">
              <Label>Explizit</Label>
              <Switch checked={isExplicit} onCheckedChange={setIsExplicit} />
            </div>

            <div className="flex justify-between">
              <Label>Musikvideo</Label>
              <Switch checked={hasVideo} onCheckedChange={setHasVideo} />
            </div>

            {hasVideo && (
              <div>
                <input ref={videoInputRef} type="file" accept=".mp4,.mov" hidden onChange={(e) => setVideoFile(e.target.files?.[0] || null)} />
                <Button type="button" variant="outline" onClick={() => videoInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  {videoFile?.name || "Video hochladen"}
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Hochladen..." : "Single erstellen"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
