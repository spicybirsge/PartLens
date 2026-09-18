"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import DashboardSidebar from "@/components/DashboardSidebar"
import DashboardHome from "@/components/dashboard/DashboardHome"
import PageLoading from "@/components/PageLoading"
import { userStore } from "@/store/store"

export default function Home() {
  const router = useRouter()
  const { user, loaded, checkIfLoggedIn } = userStore()

  useEffect(() => {
    if (!loaded) {
      checkIfLoggedIn()
    } else if (!user) {
      // For now, redirect unauthenticated users to login
      // Future public/landing catalog page can be rendered here directly
      router.push("/login", { scroll: false })
    }
  }, [loaded, user, checkIfLoggedIn, router])

  if (!loaded || !user) {
    return <PageLoading />
  }

  return (
    <DashboardSidebar>
      <DashboardHome />
    </DashboardSidebar>
  )
}
