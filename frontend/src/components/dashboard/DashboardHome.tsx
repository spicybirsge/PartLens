"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Box, Plus, Search, UploadCloud } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { userStore } from "@/store/store"
import vars from "@/vars/vars"
import {
  getProjectColor,
  timeAgo,
  type Project,
  type Stats,
} from "@/lib/projects"

import { usePathname } from "next/navigation"

function StatsSkeleton() {
  return (
    <section className="grid gap-4 sm:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-2 h-8 w-16" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-3.5 w-44" />
          </CardContent>
        </Card>
      ))}
    </section>
  )
}

function ProjectCardsSkeleton() {
  return (
    <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Card key={i}>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <Skeleton className="size-10 rounded-lg" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
            <Skeleton className="mt-3 h-6 w-3/4" />
            <Skeleton className="mt-2 h-4 w-1/3" />
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="ml-auto h-3.5 w-12" />
          </CardContent>
        </Card>
      ))}
    </section>
  )
}

export default function DashboardHome() {
  const pathname = usePathname()
  const { user } = userStore()
  const router = useRouter()

  const [projects, setProjects] = useState<Project[]>([])
  const [stats, setStats] = useState<Stats>({
    total_projects: 0,
    total_parts: 0,
    total_views: 0,
  })
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")



  useEffect(() => {
   
    const fetchProjects = async () => {
      
      const token = localStorage.getItem("token")
      if (!token) return

      try {
        const response = await fetch(
          `${vars.BACKEND_URL}/api/v1/read/projects`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        )

        const data = await response.json()

        if (data.success) {
          setProjects(data.data)
          setStats(data.stats)
        }
      } catch (error) {
        console.error("Failed to fetch projects:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [])

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects
    const query = searchQuery.trim().toLowerCase()
    return projects.filter(
      (project) =>
        project.name.toLowerCase().includes(query) ||
        project.description?.toLowerCase().includes(query) === true,
    )
  }, [projects, searchQuery])

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
                Hello, {user?.name?.split(" ")[0] || "there"}
              </h1>
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        {loading ? (
          <StatsSkeleton />
        ) : (
          <section className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total projects</CardDescription>
                <CardTitle className="text-2xl">
                  {stats.total_projects}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Created using your account
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Documented parts</CardDescription>
                <CardTitle className="text-2xl">
                  {stats.total_parts}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Across all your projects
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Project views</CardDescription>
                <CardTitle className="text-2xl">
                  {stats.total_views}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Across all your projects
              </CardContent>
            </Card>
          </section>
        )}

        <div className="flex justify-center py-8">
          <Link href={"/new"}>
          <Button size="lg">
            <Plus />
            Create new project
          </Button></Link>
        </div>

        <div className="mt-10 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Your projects</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage a project by clicking on it.
            </p>
          </div>
          <div className="relative hidden sm:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search projects…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-60 pl-9"
            />
          </div>
        </div>

        {/* Mobile search */}
        <div className="relative mt-4 sm:hidden">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search projects…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {loading ? (
          <ProjectCardsSkeleton />
        ) : filteredProjects.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            {searchQuery.trim()
              ? "No projects match your search."
              : "No projects yet. Create one to get started!"}
          </div>
        ) : (
          <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredProjects.map((project) => (
              <Link href={`/manage/${project.publicId}`} key={project.id} className="block min-w-0">            
              <Card
                className="cursor-pointer transition-shadow hover:shadow-md min-w-0"
              >
                <CardHeader className="min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={`flex size-10 items-center justify-center rounded-lg shrink-0 ${getProjectColor(project.publicId)}`}
                    >
                      <Box className="size-5" />
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium shrink-0 ${
                        project.unlisted
                          ? "bg-muted text-muted-foreground"
                          : "bg-emerald-500/10 text-emerald-600"
                      }`}
                    >
                      {project.unlisted ? "Unlisted" : "Public"}
                    </span>
                  </div>
                  <CardTitle className="pt-2 truncate" title={project.name}>
                    {project.name}
                  </CardTitle>
                  <CardDescription className="truncate">
                    Updated {timeAgo(project.updatedAt)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{project.parts} parts</span>
                  <span>{project.views} views</span>
                  {project.glbFileUrl && (
                    <span className="ml-auto inline-flex items-center gap-1">
                      <UploadCloud className="size-3.5" />
                      GLB
                    </span>
                  )}
                </CardContent>
              </Card>
              </Link>
 
            ))}
          </section>
        )}
      </div>
    </main>
  )
}

