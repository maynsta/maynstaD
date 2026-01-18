"use client"

import type React from "react"
import { useState, useRef } from "react"
import type { Profile } from "@/lib/types"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { createClient } from "@/lib/supabase/client"
import { useTheme } from "@/contexts/theme-context"
import { User, Shield, Mic2, Info, Sun, Moon, Monitor, LogOut, Save, Upload } from "lucide-react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { debounce } from "lodash"
import { useCallback } from "react"

interface AccountContentProps {
  profile: Profile | null
  userId: string
  userEmail: string
}

export function AccountContent({ profile: initialProfile, userId, userEmail }: AccountContentProps) {
  const { theme, setTheme } = useTheme()
  const router = useRouter()

  const { data: profile, mutate: mutateProfile } = useSWR(
    `profile-${userId}`,
    async () => {
      const supabase = createClient()
      const { data } = await supabase.from("profiles").select("*").eq("id", userId).single()
      return data
    },
    { fallbackData: initialProfile },
  )

  // Konto state
  const [displayName, setDisplayName] = useState(profile?.display_name || "")
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url || null)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const autoSaveProfile = useCallback(
    debounce(async (name: string) => {
      const supabase = createClient()
      await supabase.from("profiles").update({
        display_name: name,
        updated_at: new Date().toISOString(),
      }).eq("id", userId)
      mutateProfile()
    }, 1000),
    [userId, mutateProfile]
  )

  const handleDisplayNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDisplayName(e.target.value)
    autoSaveProfile(e.target.value)
  }

  // Parental Controls state
  const [parentalEnabled, setParentalEnabled] = useState(profile?.parental_controls_enabled || false)
  const [parentalPin, setParentalPin] = useState(profile?.parental_pin || "")
  const [musicVideosEnabled, setMusicVideosEnabled] = useState(profile?.music_videos_enabled ?? true)
  const [explicitEnabled, setExplicitEnabled] = useState(profile?.explicit_content_enabled ?? true)
  const [isSavingParental, setIsSavingParental] = useState(false)

// Artist state  👈 HIER
const [isArtist, setIsArtist] = useState(profile?.is_artist ?? false)
const [artistName, setArtistName] = useState(profile?.artist_name || "")
const [artistBio, setArtistBio] = useState(profile?.artist_bio || "")
const [isSavingArtist, setIsSavingArtist] = useState(false)

  const autoSaveParental = useCallback(
    debounce(async (enabled: boolean, pin: string, videos: boolean, explicit: boolean) => {
      const supabase = createClient()
      await supabase.from("profiles").update({
        parental_controls_enabled: enabled,
        parental_pin: pin || null,
        music_videos_enabled: videos,
        explicit_content_enabled: explicit,
        updated_at: new Date().toISOString(),
      }).eq("id", userId)
      mutateProfile()
    }, 1000),
    [userId, mutateProfile]
  )

  const autoSaveArtist = useCallback(
    debounce(async (name: string, bio: string, enabled: boolean) => {
      const supabase = createClient()
      await supabase.from("profiles").update({
        is_artist: enabled,
        artist_name: name || null,
        artist_bio: bio || null,
        updated_at: new Date().toISOString(),
      }).eq("id", userId)
      mutateProfile()
    }, 1000),
    [userId, mutateProfile]
  )

  const autoSaveAvatar = useCallback(
    debounce(async (file: File | null) => {
      if (!file) return
      setIsSavingProfile(true)
      const supabase = createClient()
      const fileExt = file.name.split(".").pop()
      const fileName = `${userId}/${Date.now()}-avatar.${fileExt}`
      const { data: uploadData } = await supabase.storage.from("avatars").upload(fileName, file)
      if (uploadData) {
        const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(fileName)
        await supabase.from("profiles").update({
          avatar_url: publicUrl,
          updated_at: new Date().toISOString(),
        }).eq("id", userId)
        mutateProfile()
      }
      setIsSavingProfile(false)
    }, 500),
    [userId, mutateProfile]
  )

  const handleArtistNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setArtistName(e.target.value)
    autoSaveArtist(e.target.value, artistBio, isArtist)
  }

  const handleArtistBioChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setArtistBio(e.target.value)
    autoSaveArtist(artistName, e.target.value, isArtist)
  }

  const handleIsArtistChange = (checked: boolean) => {
    setIsArtist(checked)
    autoSaveArtist(artistName, artistBio, checked)
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
        autoSaveAvatar(file)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleParentalEnabledChange = (checked: boolean) => {
    setParentalEnabled(checked)
    autoSaveParental(checked, parentalPin, musicVideosEnabled, explicitEnabled)
  }

  const handleParentalPinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pin = e.target.value.replace(/\D/g, "")
    setParentalPin(pin)
    autoSaveParental(parentalEnabled, pin, musicVideosEnabled, explicitEnabled)
  }

  const handleMusicVideosChange = (checked: boolean) => {
    setMusicVideosEnabled(checked)
    autoSaveParental(parentalEnabled, parentalPin, checked, explicitEnabled)
  }

  const handleExplicitChange = (checked: boolean) => {
    setExplicitEnabled(checked)
    autoSaveParental(parentalEnabled, parentalPin, musicVideosEnabled, checked)
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingProfile(true)
    const supabase = createClient()
    let avatarUrl = profile?.avatar_url || null

    if (avatarFile) {
      const fileExt = avatarFile.name.split(".").pop()
      const fileName = `${userId}/${Date.now()}-avatar.${fileExt}`
      const { data: uploadData } = await supabase.storage.from("avatars").upload(fileName, avatarFile)
      if (uploadData) {
        const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(fileName)
        avatarUrl = publicUrl
      }
    }

    await supabase.from("profiles").update({
      display_name: displayName,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    }).eq("id", userId)

    setAvatarFile(null)
    mutateProfile()
    setIsSavingProfile(false)
  }

  const handleSaveParental = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingParental(true)
    const supabase = createClient()

    await supabase.from("profiles").update({
      parental_controls_enabled: parentalEnabled,
      parental_pin: parentalPin || null,
      music_videos_enabled: musicVideosEnabled,
      explicit_content_enabled: explicitEnabled,
      updated_at: new Date().toISOString(),
    }).eq("id", userId)

    mutateProfile()
    setIsSavingParental(false)
  }

  const handleSaveArtist = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingArtist(true)
    const supabase = createClient()

    await supabase.from("profiles").update({
      is_artist: isArtist,
      artist_name: artistName || null,
      artist_bio: artistBio || null,
      updated_at: new Date().toISOString(),
    }).eq("id", userId)

    mutateProfile()
    setIsSavingArtist(false)
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

 return (
  <div className="p-8 max-w-4xl pb-32">
    <h1 className="text-3xl font-bold text-foreground mb-6">Konto</h1>

    <Tabs defaultValue="profile">
      <TabsList className="mb-6 grid w-full grid-cols-4 rounded-full">
        <TabsTrigger value="profile" className="flex items-center gap-2 rounded-full">
          <User className="h-4 w-4" />
          <span className="hidden sm:inline">Konto</span>
        </TabsTrigger>
        <TabsTrigger value="parental" className="flex items-center gap-2 rounded-full">
          <Shield className="h-4 w-4" />
          <span className="hidden sm:inline">Parental</span>
        </TabsTrigger>
        <TabsTrigger value="artist" className="flex items-center gap-2 rounded-full">
          <Mic2 className="h-4 w-4" />
          <span className="hidden sm:inline">Artist</span>
        </TabsTrigger>
        <TabsTrigger value="info" className="flex items-center gap-2 rounded-full">
          <Info className="h-4 w-4" />
          <span className="hidden sm:inline">Info</span>
        </TabsTrigger>
      </TabsList>

      {/* ================= PROFILE ================= */}
      <TabsContent value="profile">
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>Konto</CardTitle>
            <CardDescription>Verwalte dein Profil</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-12 w-12 text-muted-foreground" />
                    )}
                  </div>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="absolute bottom-0 right-0 rounded-full"
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex-1">
                  <Label htmlFor="displayName">Anzeigename</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={handleDisplayNameChange}
                    placeholder="Dein Anzeigename"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label>E-Mail</Label>
                <Input value={userEmail} disabled className="mt-1 bg-muted" />
              </div>

              <div className="space-y-4">
                <Label>Design</Label>
                <div className="flex gap-2">
                  <Button type="button" variant={theme === "light" ? "default" : "outline"} size="sm" onClick={() => setTheme("light")} className="rounded-full">
                    <Sun className="h-4 w-4 mr-2" /> Hell
                  </Button>
                  <Button type="button" variant={theme === "dark" ? "default" : "outline"} size="sm" onClick={() => setTheme("dark")} className="rounded-full">
                    <Moon className="h-4 w-4 mr-2" /> Dunkel
                  </Button>
                  <Button type="button" variant={theme === "system" ? "default" : "outline"} size="sm" onClick={() => setTheme("system")} className="rounded-full">
                    <Monitor className="h-4 w-4 mr-2" /> System
                  </Button>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="button" variant="destructive" onClick={handleLogout} className="rounded-full">
                  <LogOut className="h-4 w-4 mr-2" /> Abmelden
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ================= PARENTAL ================= */}
      <TabsContent value="parental">
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>Parental Controls</CardTitle>
            <CardDescription>Kindersicherungseinstellungen</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveParental} className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-muted">
                <div>
                  <p className="font-medium">Kindersicherung aktiviert</p>
                  <p className="text-sm text-muted-foreground">PIN erforderlich für Änderungen</p>
                </div>
                <Switch checked={parentalEnabled} onCheckedChange={handleParentalEnabledChange} />
              </div>

              {parentalEnabled && (
                <>
                  <div>
                    <Label htmlFor="parentalPin">PIN (4 Ziffern)</Label>
                    <Input
                      id="parentalPin"
                      type="password"
                      maxLength={4}
                      value={parentalPin}
                      onChange={handleParentalPinChange}
                      className="mt-1 max-w-32"
                    />
                  </div>
                </>
              )}
            </form>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ================= ARTIST ================= */}
      <TabsContent value="artist">
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>Artist-Bereich</CardTitle>
            <CardDescription>Werde Künstler und veröffentliche deine Musik</CardDescription>
          </CardHeader>
          <CardContent>
<form className="space-y-6">
  <div className="flex items-center justify-between p-4 rounded-2xl bg-muted">
    <div>
      <p className="font-medium">Ich bin ein Künstler</p>
      <p className="text-sm text-muted-foreground">
        Aktiviere den Artist-Modus um Musik zu veröffentlichen
      </p>
    </div>
    <Switch checked={isArtist} onCheckedChange={handleIsArtistChange} />
  </div>

  {isArtist && (
    <>
      <div>
        <Label htmlFor="artistName">Künstlername</Label>
        <Input
          id="artistName"
          value={artistName}
          onChange={handleArtistNameChange}
          placeholder="Dein Künstlername"
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="artistBio">Biografie</Label>
        <textarea
          id="artistBio"
          value={artistBio}
          onChange={handleArtistBioChange}
          placeholder="Erzähle etwas über dich..."
          className="mt-1 w-full min-h-24 rounded-xl border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
    </>
  )}

  {/* ACTION BUTTONS */}
  <div className="flex gap-2 pt-4">
    {isArtist && (
      <Button
        type="button"
        variant="outline"
        className="rounded-full"
        onClick={() => router.push("/artist")}
      >
        <Mic2 className="h-4 w-4 mr-2" />
        Artist Dashboard
      </Button>
    )}
  </div>
</form>

          </CardContent>
        </Card>
      </TabsContent>

      {/* ================= INFO ================= */}
      <TabsContent value="info">
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>Info</CardTitle>
            <CardDescription>App-Informationen</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 rounded-2xl bg-muted text-center">
              <p className="text-muted-foreground">
                Maynsta wurde erstellt von Maynsta Inc.<br />
                Alle Rechte vorbehalten.
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  </div>
)
}

