import { createClient } from "@/lib/supabase/server"
import LandingPage from "./landing-page"
import { redirect } from "next/navigation"

export default async function RootPage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()

  if (data?.user) {
    redirect("/home")
  }

  return <LandingPage />
}
