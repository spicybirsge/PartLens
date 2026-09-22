"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import DashboardSidebar from "@/components/DashboardSidebar"
import DashboardHome from "@/components/dashboard/DashboardHome"
import PageLoading from "@/components/PageLoading"
import { userStore } from "@/store/store"
import HomePage from "@/components/home-page/HomePage"
export default function DashboardPage() {
  const router = useRouter()
  const { user, loaded, checkIfLoggedIn } = userStore()

  useEffect(() => {
    if (!loaded) {
      checkIfLoggedIn()
    } 
  }, [loaded, user, checkIfLoggedIn, router])



  return <>
  {!loaded ? <PageLoading /> : user ? <DashboardSidebar>
      <DashboardHome />
    </DashboardSidebar> : <HomePage></HomePage>}
    
  </>
}
