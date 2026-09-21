"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import DashboardSidebar from "@/components/DashboardSidebar"
import DashboardHome from "@/components/dashboard/DashboardHome"
import PageLoading from "@/components/PageLoading"
import { userStore } from "@/store/store"

export default function DashboardPage() {
  const router = useRouter()
  const { user, loaded, checkIfLoggedIn } = userStore()

  useEffect(() => {
    if (!loaded) {
      checkIfLoggedIn()
    } else if (!user) {
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
