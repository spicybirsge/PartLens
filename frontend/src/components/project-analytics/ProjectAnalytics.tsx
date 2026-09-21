"use client"

import { useEffect, useState } from "react"
import {
  AlertCircle,
  CalendarDays,
  Eye,
  Loader2,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react"
import { useRouter } from "next/navigation"

import ManageProjectSidebar from "../ManageProjectSidebar"
import PageLoading from "../PageLoading"
import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Separator } from "../ui/separator"
import { SidebarTrigger } from "../ui/sidebar"
import { Skeleton } from "../ui/skeleton"
import { getApiErrorMessage, readJsonResponse } from "@/lib/project-form"
import {
  formatViewedAt,
  isProjectAnalytics,
  type ProjectAnalytics as ProjectAnalyticsData,
} from "@/lib/project-analytics"
import { userStore } from "@/store/store"
import vars from "@/vars/vars"

type Stat = {
  label: string
  value: number
  description: string
  icon: typeof Eye
}

export default function ProjectAnalytics({ id }: { id: string }) {
  const router = useRouter()
  const { user, loaded, checkIfLoggedIn } = userStore()
  const [analytics, setAnalytics] = useState<ProjectAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!loaded) checkIfLoggedIn()
    else if (!user) router.push("/login", { scroll: false })
  }, [loaded, user, checkIfLoggedIn, router])

  useEffect(() => {
    if (!user) return
    const controller = new AbortController()

    const loadAnalytics = async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const token = window.localStorage.getItem("token")
        if (!token) throw new Error("Your session has expired. Please sign in again.")

        const response = await fetch(
          `${vars.BACKEND_URL}/api/v1/read/project/${encodeURIComponent(id)}/analytics`,
          {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          },
        )
        const payload = await readJsonResponse(response)
        if (!response.ok) {
          throw new Error(getApiErrorMessage(payload, "Unable to load project analytics."))
        }

        const data = payload && typeof payload === "object"
          ? (payload as { data?: unknown }).data
          : null
        if (!isProjectAnalytics(data)) throw new Error("The project analytics response was invalid.")
        setAnalytics(data)
        document.title = `Project Analytics — ${data.project.name} | PartLens`
      } catch (error) {
        if (!controller.signal.aborted) {
          setLoadError(error instanceof Error ? error.message : "Unable to load project analytics.")
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    loadAnalytics()
    return () => controller.abort()
  }, [id, user])

  if (!loaded || !user) return <PageLoading />

  const stats: Stat[] = analytics
    ? [
        {
          label: "Unique viewers",
          value: analytics.uniqueViewers,
          description: "All-time viewers",
          icon: Users,
        },
        {
          label: "Today",
          value: analytics.viewersToday,
          description: "Viewers since midnight",
          icon: Eye,
        },
        {
          label: "This week",
          value: analytics.viewersThisWeek,
          description: "Viewers since Sunday",
          icon: TrendingUp,
        },
        {
          label: "This month",
          value: analytics.viewersThisMonth,
          description: "Viewers since the 1st",
          icon: CalendarDays,
        },
      ]
    : []

  return (
    <ManageProjectSidebar projectId={id}>
      <main className="min-w-0 flex-1 bg-muted/30">
        <div className="mx-auto min-h-svh w-full max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
          <div className="flex items-center gap-3">
            <SidebarTrigger variant="outline" size="icon" aria-label="Toggle navigation" />
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">View analytics for your project</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">Project Analytics</h1>
              {loading ? (
                <Skeleton className="mt-2 h-5 w-64" />
              ) : analytics ? (
                <p className="mt-1 max-w-[min(32rem,70vw)] truncate text-sm font-medium text-foreground/80">
                 Viewing analytics for: {analytics.project.name}
                </p>
              ) : null}
            </div>
          </div>
          <Separator className="my-6" />

          {loading ? (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }, (_, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <Skeleton className="h-4 w-28" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-9 w-20" />
                      <Skeleton className="mt-2 h-4 w-36" />
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Card>
                <CardHeader>
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-72 max-w-full" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 rounded-lg border p-2">
                    {Array.from({ length: 3 }, (_, index) => (
                      <div className="flex items-center justify-between gap-4 rounded-md px-2 py-3" key={index}>
                        <div className="flex items-center gap-3">
                          <Skeleton className="size-8 rounded-full" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-44 max-w-[45vw]" />
                            <Skeleton className="h-3 w-28" />
                          </div>
                        </div>
                        <Skeleton className="h-4 w-40 max-w-[35vw]" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : loadError ? (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="flex flex-wrap items-center gap-3 ">
                <AlertCircle className="size-5 shrink-0 text-destructive" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-destructive">{loadError}</p>
                 
                </div>
               
              </CardContent>
            </Card>
          ) : analytics ? (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {stats.map((stat) => (
                  <Card key={stat.label}>
                    <CardHeader className="flex-row items-center justify-between space-y-0">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        {stat.label}
                      </CardTitle>
                      <stat.icon className="size-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-semibold tracking-tight">
                        {stat.value.toLocaleString()}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{stat.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Recent views</CardTitle>
                  <CardDescription>The latest unique viewer activity for this project.</CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics.recentlyViewed.length > 0 ? (
                    <div className="divide-y rounded-lg border">
                      {analytics.recentlyViewed.map((viewedAt, index) => (
                        <div className="flex items-center justify-between gap-4 px-4 py-3" key={`${viewedAt}-${index}`}>
                          <div className="flex items-center gap-3">
                            <span className="flex size-8 items-center justify-center rounded-full bg-muted">
                              <Eye className="size-4 text-muted-foreground" />
                            </span>
                            <div>
                              <p className="text-sm font-medium">A user visited this project</p>
                              <p className="text-xs text-muted-foreground">
                                visitor activity
                              </p>
                            </div>
                          </div>
                          <time className="text-right text-sm text-muted-foreground" dateTime={viewedAt}>
                            On {formatViewedAt(viewedAt)}
                          </time>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex min-h-32 flex-col items-center justify-center rounded-lg border border-dashed text-center">
                      <Eye className="mb-2 size-5 text-muted-foreground" />
                      <p className="text-sm font-medium">No viewers yet</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Viewer activity will appear here once your project is visited.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex min-h-48 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />
              Loading analytics…
            </div>
          )}
        </div>
      </main>
    </ManageProjectSidebar>
  )
}
