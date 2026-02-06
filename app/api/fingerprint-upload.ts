import type { NextApiRequest, NextApiResponse } from "next"
import formidable from "formidable"
import fs from "fs"
import fetch from "node-fetch"
import { createClient } from "@/lib/supabase/client"

export const config = {
  api: {
    bodyParser: false, // notwendig für File Uploads
  },
}

type ResponseData = {
  success: boolean
  message: string
  audioUrl?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" })
  }

  const form = new formidable.IncomingForm()

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ success: false, message: "Upload error" })

    const file = files.audio as formidable.File
    const title = fields.title as string
    const userId = fields.userId as string
    const albumId = fields.albumId as string
    const isExplicit = fields.isExplicit === "true"
    const hasVideo = fields.hasVideo === "true"

    if (!file || !title || !userId || !albumId) {
      return res.status(400).json({ success: false, message: "Missing required fields" })
    }

    try {
      const fileData = fs.readFileSync(file.filepath)

      // --- Fingerprint Check via AudD ---
      const formData = new FormData()
      formData.append("file", fileData, file.originalFilename)
      formData.append("api_token", process.env.AUDD_API_KEY!)

      const apiRes = await fetch("https://api.audd.io/", {
        method: "POST",
        body: formData as any,
      })

      const result = await apiRes.json()

      if (result.status === "success" && result.result) {
        // Song existiert bereits
        return res.status(400).json({
          success: false,
          message: `Song existiert schon: ${result.result.title} von ${result.result.artist}`,
        })
      }

      // --- Upload zu Supabase Storage ---
      const supabase = createClient()
      const fileExt = file.originalFilename?.split(".").pop() || "mp3"
      const fileName = `${userId}/${Date.now()}-audio.${fileExt}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("audio")
        .upload(fileName, fs.createReadStream(file.filepath))

      if (uploadError || !uploadData) {
        return res.status(500).json({ success: false, message: "Supabase upload failed" })
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("audio").getPublicUrl(fileName)

      // --- Song in DB eintragen ---
      await supabase.from("songs").insert({
        album_id: albumId,
        artist_id: userId,
        title,
        audio_url: publicUrl,
        cover_url: "", // optional
        duration: 180, // du kannst die echte Dauer später berechnen
        is_explicit: isExplicit,
        has_music_video: hasVideo,
        music_video_url: hasVideo ? "" : null, // optional
      })

      return res.status(200).json({ success: true, message: "Upload erfolgreich", audioUrl: publicUrl })
    } catch (error) {
      console.error(error)
      return res.status(500).json({ success: false, message: "Internal server error" })
    }
  })
}
