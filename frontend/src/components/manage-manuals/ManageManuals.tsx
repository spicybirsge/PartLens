'use client'
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import ManageProjectSidebar from "../ManageProjectSidebar"
import PageLoading from "../PageLoading"
import { SidebarTrigger } from "../ui/sidebar"
import { Separator } from "../ui/separator"


import { userStore } from "@/store/store"
import vars from "@/vars/vars"

export default function ManageManuals({ id }: { id: string }) {
    const router = useRouter()
    const { user, loaded, checkIfLoggedIn } = userStore()

    useEffect(() => {
        if (!loaded) checkIfLoggedIn()
        else if (!user) router.push("/login", { scroll: false })
    }, [loaded, user, checkIfLoggedIn, router])

    if (!loaded || !user) return <PageLoading />
    return <ManageProjectSidebar projectId={id}>
        <main className="min-w-0 flex-1 bg-muted/30">
            <div className="mx-auto min-h-svh w-full max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
                <div className="flex items-center gap-3">
                    <SidebarTrigger variant="outline" size="icon" aria-label="Toggle navigation" />
                    <div>
                        <p className="text-sm text-muted-foreground">Manage your projects manuals here</p>
                        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Project Manuals</h1>

                        <p className="mt-1 max-w-[min(32rem,70vw)] truncate text-sm font-medium text-foreground/80" title={"Untitled Project"}>
                            Editing:  Untitled project
                        </p>

                    </div>
                </div>
                <Separator className="my-6" />
            </div>
        </main>
    </ManageProjectSidebar>
}