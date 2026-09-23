'use client'

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import DashboardSidebar from "../DashboardSidebar"
import PageLoading from "../PageLoading"
import { userStore } from "@/store/store"
import vars from "@/vars/vars"
import { Separator } from "../ui/separator"
import { SidebarTrigger } from "../ui/sidebar"

export default function SettingsPage() {

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


    return (<DashboardSidebar>
        <main className="min-w-0 flex-1 bg-muted/30">
            <div className="mx-auto min-h-svh w-full max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <SidebarTrigger variant="outline" size="icon" aria-label="Toggle navigation" />
                        <div>
                            <p className="text-sm text-muted-foreground">Manage your dashboard settings and account details</p>
                            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Settings</h1>
                        </div>
                    </div>
                </div>

                <Separator className="my-6" />

            </div></main></DashboardSidebar>)
}