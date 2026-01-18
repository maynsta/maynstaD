'use client'

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Supabase liefert den Reset-Code als ?code=XYZ in der URL
  const code = searchParams.get("code")

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!code) {
      setError("Ungültiger Link. Bitte fordere ein neues Passwort an.")
      return
    }

    if (password.length < 6) {
      setError("Das Passwort muss mindestens 6 Zeichen lang sein.")
      return
    }

    if (password !== confirmPassword) {
      setError("Die Passwörter stimmen nicht überein.")
      return
    }

    setIsLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({ password }, code)

      if (error) {
        setError(error.message)
        setIsLoading(false)
        return
      }

      setSuccess("Passwort erfolgreich geändert. Du wirst weitergeleitet…")
      setTimeout(() => {
        router.push("/auth/login")
      }, 2000)
    } catch (err: any) {
      setError(err.message || "Ein Fehler ist aufgetreten.")
      setIsLoading(false)
    }
  }

  if (!code) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background p-6">
        <p className="text-destructive">Ungültiger Link. Bitte fordere ein neues Passwort an.</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm">
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>Neues Passwort setzen</CardTitle>
            <CardDescription>
              Gib ein neues Passwort für dein Konto ein
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleResetPassword} className="flex flex-col gap-5">
              <div className="grid gap-2">
                <Label>Neues Passwort</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="rounded-full"
                />
              </div>

              <div className="grid gap-2">
                <Label>Passwort bestätigen</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="rounded-full"
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}
              {success && <p className="text-sm text-green-600">{success}</p>}

              <Button
                type="submit"
                disabled={isLoading}
                className="rounded-full"
              >
                {isLoading ? "Speichern…" : "Passwort ändern"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
