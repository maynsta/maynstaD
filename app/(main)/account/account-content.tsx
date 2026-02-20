"use client"

import type React from "react"
import { useState, useRef, useCallback, useEffect, useMemo } from "react"
import type { Profile } from "@/lib/types"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { createClient } from "@/lib/supabase/client"
import { useTheme } from "@/contexts/theme-context"
import { User, Shield, Mic2, Info, LogOut, Upload } from "lucide-react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { debounce } from "lodash"
import { motion, AnimatePresence } from "framer-motion"

interface AccountContentProps {
  profile: Profile | null
  userId: string
  userEmail: string
}

export function AccountContent({ profile: initialProfile, userId, userEmail }: AccountContentProps) {
  const { theme } = useTheme()
  const router = useRouter()
  const supabase = createClient()

  const { data: profile, mutate: mutateProfile } = useSWR(
    `profile-${userId}`,
    async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", userId).single()
      return data
    },
    { fallbackData: initialProfile },
  )

  // ------------------------- IMPORT SPRACHDATEIEN -------------------------
  const de = require("@/app/languages/de.json")
  const en = require("@/app/languages/en.json")
  const fr = require("@/app/languages/fr.json")
  const es = require("@/app/languages/es.json")
  const it = require("@/app/languages/it.json")
  const nl = require("@/app/languages/nl.json")
  const pl = require("@/app/languages/pl.json")
  const pt = require("@/app/languages/pt.json")
  const ro = require("@/app/languages/ro.json")
  const ru = require("@/app/languages/ru.json")
  const sv = require("@/app/languages/sv.json")
  const ar = require("@/app/languages/ar.json")

  // ------------------------- LANGUAGE STATE -------------------------
  const [currentLang, setCurrentLang] = useState(() => localStorage.getItem("lang") || "en")

  const languages = useMemo(() => {
    switch(currentLang) {
      case "de": return de
      case "en": return en
      case "fr": return fr
      case "es": return es
      case "it": return it
      case "nl": return nl
      case "pl": return pl
      case "pt": return pt
      case "ro": return ro
      case "ru": return ru
      case "sv": return sv
      case "ar": return ar
      default: return en
    }
  }, [currentLang])

  // ------------------------- ACCOUNT -------------------------
  const [displayName, setDisplayName] = useState(profile?.display_name || "")
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url || null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const [initialDisplayName, setInitialDisplayName] = useState(displayName)
  const [initialArtistName, setInitialArtistName] = useState(profile?.artist_name || "")
  const [initialArtistBio, setInitialArtistBio] = useState(profile?.artist_bio || "")

  const autoSaveProfile = useCallback(
    debounce(async (name: string) => {
      if (name !== initialDisplayName) {
        await supabase.from("profiles").update({
          display_name: name,
          updated_at: new Date().toISOString(),
        }).eq("id", userId)
        mutateProfile()
        setInitialDisplayName(name)
        showToast(languages.profile_saved || "Profil gespeichert")
      }
    }, 1000),
    [userId, mutateProfile, initialDisplayName, languages.profile_saved]
  )

  const handleDisplayNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDisplayName(e.target.value)
    autoSaveProfile(e.target.value)
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setAvatarPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  // ------------------------- PARENTAL -------------------------
  const [parentalEnabled, setParentalEnabled] = useState(profile?.parental_controls_enabled || false)
  const [parentalPin, setParentalPin] = useState("")
  const [oldParentalPin, setOldParentalPin] = useState("")
  const [musicVideosEnabled, setMusicVideosEnabled] = useState(profile?.music_videos_enabled ?? true)
  const [explicitEnabled, setExplicitEnabled] = useState(profile?.explicit_content_enabled ?? true)

  const handleParentalEnabledChange = (checked: boolean) => setParentalEnabled(checked)
  const handleMusicVideosChange = (checked: boolean) => setMusicVideosEnabled(checked)
  const handleExplicitChange = (checked: boolean) => setExplicitEnabled(checked)

  const handleParentalPinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pin = e.target.value.replace(/\D/g, "")
    setOldParentalPin(parentalPin)
    setParentalPin(pin)
  }

  const handleSaveParental = async () => {
    if (oldParentalPin && oldParentalPin !== profile?.parental_pin) {
      showToast("Alter PIN ist falsch")
      return
    }

    await supabase.from("profiles").update({
      parental_controls_enabled: parentalEnabled,
      parental_pin: parentalPin || null,
      music_videos_enabled: musicVideosEnabled,
      explicit_content_enabled: explicitEnabled,
      updated_at: new Date().toISOString(),
    }).eq("id", userId)

    mutateProfile()
    showToast("Kindersicherung gespeichert")
  }

  // ------------------------- ARTIST -------------------------
  const [isArtist, setIsArtist] = useState(profile?.is_artist ?? false)
  const [artistName, setArtistName] = useState(profile?.artist_name || "")
  const [artistBio, setArtistBio] = useState(profile?.artist_bio || "")

  const autoSaveArtist = useCallback(
    debounce(async () => {
      if (
        isArtist !== profile?.is_artist ||
        artistName !== initialArtistName ||
        artistBio !== initialArtistBio
      ) {
        await supabase.from("profiles").update({
          is_artist: isArtist,
          artist_name: artistName,
          artist_bio: artistBio,
          updated_at: new Date().toISOString(),
        }).eq("id", userId)
        mutateProfile()
        setInitialArtistName(artistName)
        setInitialArtistBio(artistBio)
        showToast("Artist-Bereich gespeichert")
      }
    }, 1000),
    [isArtist, artistName, artistBio, profile, userId, mutateProfile, initialArtistName, initialArtistBio]
  )

  useEffect(() => {
    if (isArtist) autoSaveArtist()
  }, [isArtist, artistName, artistBio])

  const handleIsArtistChange = (checked: boolean) => setIsArtist(checked)
  const handleArtistNameChange = (e: React.ChangeEvent<HTMLInputElement>) => setArtistName(e.target.value)
  const handleArtistBioChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => setArtistBio(e.target.value)

  // ------------------------- LOGOUT -------------------------
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  // ------------------------- DELETE ACCOUNT -------------------------
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteInput, setDeleteInput] = useState("")
  const handleDeleteAccount = async () => {
    if (deleteInput !== profile?.display_name) {
      showToast("Profilname stimmt nicht")
      return
    }
    await supabase.from("profiles").delete().eq("id", userId)
    await supabase.auth.admin.deleteUser(userId)
    router.push("/auth/login")
  }

  // ------------------------- PASSWORD RESET -------------------------
  const handlePasswordReset = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(userEmail)
    if (error) showToast(error.message)
    else showToast("Passwort zurücksetzen E-Mail gesendet")
  }

  // ------------------------- TOAST -------------------------
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [toastVisible, setToastVisible] = useState(false)

  const showToast = (message: string) => {
    setToastMessage(message)
    setToastVisible(true)
    setTimeout(() => setToastVisible(false), 3000)
  }

  // ------------------------- RENDER -------------------------
 return (
   <div className="p-8 relative pb-40">

      {/* ------------------------- TOAST ------------------------- */}
      <AnimatePresence>
        {toastVisible && toastMessage && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-32 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-2 rounded-lg shadow-lg z-50"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ------------------------- CONTENT ------------------------- */}
      <h1 className="text-3xl font-bold text-foreground mb-6">Konto</h1>

      <Tabs defaultValue="profile">
        <TabsList className="mb-6 grid w-full grid-cols-4 rounded-full">
          <TabsTrigger value="profile" className="flex items-center gap-2 rounded-full">
            <User className="h-4 w-4" /><span className="hidden sm:inline">Konto</span>
          </TabsTrigger>
          <TabsTrigger value="parental" className="flex items-center gap-2 rounded-full">
            <Shield className="h-4 w-4" /><span className="hidden sm:inline">Parental</span>
          </TabsTrigger>
          <TabsTrigger value="artist" className="flex items-center gap-2 rounded-full">
            <Mic2 className="h-4 w-4" /><span className="hidden sm:inline">Artist</span>
          </TabsTrigger>
          <TabsTrigger value="info" className="flex items-center gap-2 rounded-full">
            <Info className="h-4 w-4" /><span className="hidden sm:inline">Info</span>
          </TabsTrigger>
        </TabsList>

        {/* ------------------------- PROFILE ------------------------- */}
        <TabsContent value="profile">
          <Card className="rounded-3xl min-h-[500px] w-full max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle>{languages.account || "Konto"}</CardTitle>
              <CardDescription>{languages.manage_profile || "Verwalte dein Profil"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 flex flex-col items-center">

              {/* Avatar */}
              <div className="relative mb-4">
                <div className="h-32 w-32 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-16 w-16 text-muted-foreground" />
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
                  size="icon"
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute bottom-0 right-0 rounded-full"
                >
                  <Upload className="h-4 w-4" />
                </Button>
              </div>

              {/* Anzeigename */}
              <div className="w-full max-w-md flex flex-col gap-3">
                <Label htmlFor="displayName">{languages.display_name || "Anzeigename"}</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={handleDisplayNameChange}
                  placeholder={languages.enter_display_name || "Dein Anzeigename"}
                  className="mt-1"
                />

                {/* Sprache unter Anzeigename */}
                <div className="flex flex-col mt-2">
                  <Label htmlFor="language">{languages.preferred_language || "Bevorzugte Sprache"}</Label>
                  <select
                    id="language"
                    value={currentLang}
                    onChange={(e) => {
                      const lang = e.target.value
                      setCurrentLang(lang)
                      localStorage.setItem("lang", lang)
                      window.location.reload()
                    }}
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2"
                  >
                    <option value="de">Deutsch</option>
                    <option value="en">English</option>
                    <option value="fr">Français</option>
                    <option value="es">Español</option>
                    <option value="it">Italiano</option>
                    <option value="nl">Nederlands</option>
                    <option value="pl">Polski</option>
                    <option value="pt">Português</option>
                    <option value="ro">Română</option>
                    <option value="ru">Русский</option>
                    <option value="sv">Svenska</option>
                    <option value="ar">عربي</option>
                  </select>
                </div>

                <Label className="mt-2">{languages.email || "E-Mail"}</Label>
                <Input value={userEmail} disabled className="mt-1 bg-muted" />
              </div>

              {/* Passwort ändern */}
              <div className="w-full max-w-md mt-4">
                <Button type="button" variant="outline" onClick={handlePasswordReset} className="w-full">
                  {languages.password_change || "Passwort ändern"}
                </Button>
              </div>

              {/* Konto löschen + Abmelden nebeneinander */}
              <div className="flex gap-2 w-full max-w-md mt-2">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setShowDeleteModal(true)}
                  className="flex-1"
                >
                  {languages.delete_account || "Konto löschen"}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setShowLogoutModal(true)}
                  className="flex-1"
                >
                  {languages.logout || "Abmelden"}
                </Button>
              </div>

            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------- PARENTAL ------------------------- */}
        <TabsContent value="parental">
          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle>Parental Controls</CardTitle>
              <CardDescription>Kindersicherungseinstellungen</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center justify-between p-4 rounded-2xl bg-muted">
                <div>
                  <p className="font-medium">Kindersicherung aktiviert</p>
                  <p className="text-sm text-muted-foreground">PIN erforderlich für Änderungen</p>
                </div>
                <Switch checked={parentalEnabled} onCheckedChange={handleParentalEnabledChange} />
              </div>
              {parentalEnabled && (
                <div className="space-y-4">
                  <Label htmlFor="parentalPin">Neuer PIN (4 Ziffern)</Label>
                  <Input id="parentalPin" type="password" maxLength={4} value={parentalPin} onChange={handleParentalPinChange} className="mt-1 max-w-32" />
                  <Button type="button" onClick={handleSaveParental}>PIN speichern</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

         {/* ------------------------- ARTIST ------------------------- */}
        <TabsContent value="artist">
          <Card className="rounded-3xl p-6 space-y-6">
            <CardHeader>
              <CardTitle>Artist-Bereich</CardTitle>
              <CardDescription>Werde Künstler und veröffentliche deine Musik</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="mb-4 flex items-center justify-between p-4 rounded-2xl bg-muted">
                <p className="font-medium">Ich bin ein Künstler</p>
                <Switch checked={isArtist} onCheckedChange={handleIsArtistChange} />
              </div>
              {isArtist && (
                <div className="space-y-4">
                  <Label htmlFor="artistName">Künstlername</Label>
                  <Input
                    id="artistName"
                    value={artistName}
                    onChange={handleArtistNameChange}
                    placeholder="Dein Künstlername"
                    className="mt-1"
                  />
                  <Label htmlFor="artistBio">Biografie</Label>
                  <textarea
                    id="artistBio"
                    value={artistBio}
                    onChange={handleArtistBioChange}
                    placeholder="Erzähle etwas über dich..."
                    className="mt-1 w-full min-h-32 rounded-[20px] border border-input bg-background px-3 py-2 text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/artist")}
                    className="ml-auto"
                  >
                    Zum Artist Dashboard
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------- INFO ------------------------- */}
        <TabsContent value="info">
          <Card className="rounded-[15px] space-y-4 p-4">
            <CardHeader>
              <CardTitle>Info</CardTitle>
              <CardDescription>Maynsta Software von Mayn Inc.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <p className="text-muted-foreground">
                Maynsta wurde erstellt von Maynsta Inc.<br />
                Alle Rechte vorbehalten.
              </p>
              <p className="text-muted-foreground">
                Version 1.2.3<br />
                Letztes Update: 26.01.2026
              </p>
              <p className="text-muted-foreground">
                Kontakt: ceo@maynsta.com
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ------------------------- DELETE MODAL ------------------------- */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background p-4 rounded-[20px] w-full max-w-sm space-y-4">
            <h2 className="text-xl font-bold">Konto löschen</h2>
            <p>Gib deinen Profilnamen ein, um das Konto zu löschen:</p>
            <Input
              value={deleteInput}
              onChange={e => setDeleteInput(e.target.value)}
              placeholder="Profilname"
            />
            <div className="flex justify-end gap-2">
              <Button variant="destructive" onClick={handleDeleteAccount}>Löschen</Button>
              <Button onClick={() => setShowDeleteModal(false)}>Abbrechen</Button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------- LOGOUT MODAL ------------------------- */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background p-4 rounded-[20px] w-full max-w-sm space-y-4">
            <h2 className="text-xl font-bold">Abmelden</h2>
            <p>Bist du sicher, dass du dich abmelden möchtest?</p>
            <div className="flex justify-end gap-2">
              <Button variant="destructive" onClick={handleLogout}>Abmelden</Button>
              <Button onClick={() => setShowLogoutModal(false)}>Abbrechen</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}