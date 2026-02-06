"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Music, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export default function SignUpPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [repeatPassword, setRepeatPassword] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)
  const router = useRouter()

  // ✅ Nur redirect wenn schon eingeloggt
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push("/home")
    })
  }, [router])

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!acceptedPrivacy) {
      setError("You must accept the privacy policy")
      return
    }

    if (password !== repeatPassword) {
      setError("Passwords do not match")
      return
    }

    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: "https://maynsta.com/home",
          data: { display_name: displayName },
        },
      })
      if (error) throw error
      router.push("/auth/sign-up-success")
    } catch (err: any) {
      setError(err.message || "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: "https://maynsta.com/home" },
      })
      if (error) throw error
    } catch (err: any) {
      setError(err.message || "Google login failed")
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">

          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary">
              <Music className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-foreground">Maynsta</span>
          </div>

          <Card className="border-border bg-card rounded-3xl">
            <CardHeader>
              <CardTitle className="text-2xl">Sign-Up</CardTitle>
              <CardDescription>Create a new account</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignUp} className="flex flex-col gap-6">

                <div className="grid gap-2">
                  <Label htmlFor="displayName">Viewing name</Label>
                  <Input id="displayName" value={displayName} onChange={e => setDisplayName(e.target.value)} required />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="email">E-Mail</Label>
                  <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="repeat">Repeat password</Label>
                  <Input id="repeat" type="password" value={repeatPassword} onChange={e => setRepeatPassword(e.target.value)} required />
                </div>

                {/* Privacy */}
                <div className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={acceptedPrivacy} onChange={e => setAcceptedPrivacy(e.target.checked)} />
                  <span>
                    I accept the{" "}
                    <button type="button" className="underline text-blue-500" onClick={() => setShowPrivacyModal(true)}>
                      privacy policy
                    </button>
                  </span>
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}

                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Creating account..." : "Sign-Up"}
                </Button>

                <Button type="button" variant="outline" onClick={handleGoogleSignUp}>
                  Continue with Google
                </Button>

                <div className="text-center text-sm">
                  Already have an account?{" "}
                  <Link href="/auth/login" className="underline text-primary">Log-In</Link>
                </div>

              </form>
            </CardContent>
          </Card>
        </div>
      </div>

{/* Privacy Modal */}
<AnimatePresence>
  {showPrivacyModal && (
    <motion.div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-card rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto relative"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
      >
        <button
          className="absolute top-3 right-3 text-foreground"
          onClick={() => setShowPrivacyModal(false)}
        >
          <X />
        </button>

        <div className="space-y-3 text-sm text-foreground">
          <p className="font-bold">Privacy Policy</p>
          <p>Updated on: January 30, 2026</p>

          <p><strong>1. General</strong></p>
          <p>
            At Maynsta, we take the protection of your personal data very seriously.
            These privacy policies explain what data we collect, how we use it, and what rights you have as a user.
          </p>

          <p><strong>2. Collection and use of data</strong></p>
          <p>2.1 We store personal information solely to create, manage, and provide our service to your account.</p>
          <p>2.2 We need the following data to create an account:</p>

          <ul className="list-disc list-inside">
            <li>Name (or stage name)</li>
            <li>Email address</li>
            <li>Password</li>
          </ul>

          <p>2.3 We recommend using secure login credentials:</p>
          <ul className="list-disc list-inside">
            <li>Password at least 8 characters</li>
            <li>No sharing of the password with third parties</li>
            <li>Use your data responsibly</li>
          </ul>

          <p><strong>3. Storage and Security</strong></p>
          <p>3.1 Your data is stored in secure databases and protected against unauthorized access.</p>
          <p>3.2 In case of a security incident we inform you within 72 hours if required by law.</p>

          <p><strong>4. Deletion and management</strong></p>
          <p>4.1 You can delete your account anytime under Account → Delete Account.</p>

          <p><strong>5. Sharing data</strong></p>
          <p>We do not sell or publish your data to third parties.</p>

          <p><strong>6. Your rights</strong></p>
          <ul className="list-disc list-inside">
            <li>Information</li>
            <li>Correction</li>
            <li>Deletion</li>
            <li>Restriction</li>
            <li>Objection</li>
            <li>Data portability</li>
          </ul>

          <p>Contact: ceo@maynsta.com</p>
          <p className="pt-2 text-xs">
            Maynsta Cooperation © 2026<br />
            Mayn Inc. ® 2026
          </p>
        </div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>

    </div>
  )
}

