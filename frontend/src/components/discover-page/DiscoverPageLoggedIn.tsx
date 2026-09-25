'use client'
import { useEffect } from "react"
import { useRouter } from "next/navigation"

import DashboardSidebar from "@/components/DashboardSidebar"
import PageLoading from "@/components/PageLoading"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { userStore } from "@/store/store"
import DiscoverPage from "./DiscoverPage"

export default function DiscoverPageLoggedIn() {
    const router = useRouter()
    const { user, loaded, checkIfLoggedIn } = userStore()

    useEffect(() => {
        if (!loaded) {
            checkIfLoggedIn()
        } else if (!user) {
            router.push("/login")
        }
    }, [loaded, user, checkIfLoggedIn, router])

    if (!loaded || !user) {
        return <PageLoading />
    }

    return (
        <DashboardSidebar>
            <DiscoverPage
                sidebarToggle={
                    <SidebarTrigger
                        variant="outline"
                        size="icon"
                        aria-label="Toggle navigation"
                    />
                }
            />
        </DashboardSidebar>
    )
}
