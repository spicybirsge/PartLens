"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowUpRight, Box, Plus, UploadCloud } from "lucide-react"

import DashboardSidebar from "@/components/DashboardSidebar"
import PageLoading from "@/components/PageLoading"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { userStore } from "@/store/store"

const projects = [
  { name: "Hydraulic Press A-200", parts: 24, views: 184, updated: "2 hours ago", color: "bg-blue-500/10 text-blue-600" },
  { name: "CNC Milling Station", parts: 38, views: 126, updated: "Yesterday", color: "bg-emerald-500/10 text-emerald-600" },
  { name: "Packaging Line 04", parts: 17, views: 92, updated: "3 days ago", color: "bg-amber-500/10 text-amber-600" },
  { name: "Industrial Robot Arm", parts: 31, views: 71, updated: "5 days ago", color: "bg-violet-500/10 text-violet-600" },
  { name: "Conveyor System", parts: 12, views: 48, updated: "Last week", color: "bg-rose-500/10 text-rose-600" },
  { name: "Laser Cutter Mk II", parts: 9, views: 35, updated: "Last week", color: "bg-cyan-500/10 text-cyan-600" },
]

function DashboardHome() {
  const { user } = userStore()

  return (
    <main className="min-w-0 flex-1 bg-muted/30">
      <div className="mx-auto min-h-svh w-full max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <SidebarTrigger
              variant="outline"
              size="icon"
              aria-label="Toggle navigation"
            />
            <div>
            <p className="text-sm text-muted-foreground">Workspace overview</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              Good morning, {user?.name?.split(" ")[0] || "there"}
            </h1>
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        <section className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total projects</CardDescription>
              <CardTitle className="text-2xl">6</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Your machine documentation library
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Documented parts</CardDescription>
              <CardTitle className="text-2xl">131</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Across all your projects
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Project views</CardDescription>
              <CardTitle className="text-2xl">556</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Public and shared machine views
            </CardContent>
          </Card>
        </section>

        <div className="flex justify-center py-8">
          <Button size="lg">
            <Plus />
            Create new project
          </Button>
        </div>

        <div className="mt-10 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Your projects</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage your machines and their documentation.
            </p>
          </div>
          <Button variant="outline" className="hidden sm:inline-flex">
            View all
            <ArrowUpRight />
          </Button>
        </div>

        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.name} className="transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className={`flex size-10 items-center justify-center rounded-lg ${project.color}`}>
                    <Box className="size-5" />
                  </div>
                  <Button variant="ghost" size="icon-sm" aria-label={`Open ${project.name}`}>
                    <ArrowUpRight />
                  </Button>
                </div>
                <CardTitle className="pt-2">{project.name}</CardTitle>
                <CardDescription>Updated {project.updated}</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{project.parts} parts</span>
                <span>{project.views} views</span>
                <span className="ml-auto inline-flex items-center gap-1">
                  <UploadCloud className="size-3.5" />
                  GLB
                </span>
              </CardContent>
            </Card>
          ))}
        </section>

      </div>
    </main>
  )
}

export default function Home() {
  const router = useRouter()
  const { user, loaded, checkIfLoggedIn } = userStore()

  useEffect(() => {
    if (!loaded) {
      checkIfLoggedIn()
    } else if (!user) {
      router.push("/login", { scroll: false })
    }
  }, [loaded, user, checkIfLoggedIn, router])

  if (!loaded || !user) return <PageLoading />

  return (
    <DashboardSidebar>
      <DashboardHome />
    </DashboardSidebar>
  )
}
