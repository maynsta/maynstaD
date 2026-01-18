'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ResetPasswordForm from './ResetPasswordForm'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const router = useRouter()

  // erst hier Supabase-Client erstellen, nur client-side
  const supabase = createClient()

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push("/auth/login")
      }
    }
    checkSession()
  }, [router, supabase])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (password.length < 6) {
      setError("Das Passwort muss mindestens 6 Zeichen lang sein.")
      return
    }

    if (password !== confirmPassword) {
      setError("Die Passwörter stimmen nicht überein.")
      return
    }

    setIsLoading(true)

    const { error } = await supabase.auth.updateUser({ password })

    setIsLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    setSuccess("Passwort erfolgreich geändert. Du wirst weitergeleitet…")
    setTimeout(() => router.push("/auth/login"), 2000)
  }

  return (
    <Suspense fallback={<div className="flex min-h-svh items-center justify-center"><p>Lädt…</p></div>}>
      <ResetPasswordForm
        password={password}
        setPassword={setPassword}
        confirmPassword={confirmPassword}
        setConfirmPassword={setConfirmPassword}
        error={error}
        setError={setError}
        success={success}
        setSuccess={setSuccess}
        isLoading={isLoading}
        handleResetPassword={handleResetPassword}
      />
    </Suspense>
  )
}
