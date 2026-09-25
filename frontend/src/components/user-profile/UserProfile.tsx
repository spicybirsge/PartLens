'use client'

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import InfiniteScroll from "react-infinite-scroll-component"
import { Box, CalendarDays, Pencil } from "lucide-react"

import DashboardSidebar from "@/components/DashboardSidebar"
import Navbar from "@/components/Navbar"
import PageLoading from "@/components/PageLoading"
import PublicProjectCard from "@/components/public/PublicProjectCard"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/components/ui/toast"
import { getApiErrorMessage, readJsonResponse } from "@/lib/project-form"
import { userStore } from "@/store/store"
import vars from "@/vars/vars"

type PublicProfile = {
  id: string
  username: string
  name: string
  avatarUrl: string | null
  createdAt: string
  totalProjects: number
}

type PublicProject = {
  id: string
  publicId: string
  name: string
  description: string | null
  glbFileUrl: string
  unlisted: boolean
  createdAt: string
  updatedAt: string
  parts: number
  views: number
}

const PAGE_LIMIT = 12

function ProfileSkeleton() {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center">
        <Skeleton className="size-16 shrink-0 rounded-full sm:size-20" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-6 w-48 max-w-full" />
          <Skeleton className="h-4 w-32 max-w-full" />
          <Skeleton className="h-4 w-56 max-w-full" />
        </div>
        <Skeleton className="h-9 w-full sm:w-28" />
      </CardContent>
    </Card>
  )
}

function ProjectCardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Card key={i}>
          <CardContent className="space-y-3 py-6">
            <div className="flex items-start gap-3">
              <Skeleton className="size-10 shrink-0 rounded-lg" />
            </div>
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default function UserProfile() {
  const params = useParams()
  const router = useRouter()
  const { user, loaded, checkIfLoggedIn } = userStore()

  const routeUsername = useMemo(() => {
    const value = params.username
    if (typeof value === "string") return value
    if (Array.isArray(value) && value.length > 0) return value[0]
    return ""
  }, [params.username])

  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)

  const [projects, setProjects] = useState<PublicProject[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [projectsError, setProjectsError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    if (!loaded) checkIfLoggedIn()
  }, [loaded, checkIfLoggedIn])

  const fetchProfile = useCallback(async (username: string) => {
    const response = await fetch(
      `${vars.BACKEND_URL}/api/v1/read/user?username=${encodeURIComponent(username)}`,
    )
    const payload = await readJsonResponse(response)
    if (!response.ok)
      throw new Error(getApiErrorMessage(payload, "Unable to load this profile."))
    const data = (payload as { data?: unknown }).data
    if (!data || typeof data !== "object")
      throw new Error("The profile response was invalid.")
    const result = data as Partial<PublicProfile>
    if (!result.id || !result.username || !result.name || !result.createdAt)
      throw new Error("The profile response was invalid.")
    return {
      id: result.id,
      username: result.username,
      name: result.name,
      avatarUrl: result.avatarUrl ?? null,
      createdAt: result.createdAt,
      totalProjects:
        typeof result.totalProjects === "number" ? result.totalProjects : 0,
    } satisfies PublicProfile
  }, [])

  const fetchProjects = useCallback(
    async (username: string, cursor?: string | null) => {
      const query = new URLSearchParams({
        username,
        limit: String(PAGE_LIMIT),
      })
      if (cursor) query.set("cursor", cursor)
      const response = await fetch(
        `${vars.BACKEND_URL}/api/v1/read/user/projects?${query.toString()}`,
      )
      const payload = await readJsonResponse(response)
      if (!response.ok)
        throw new Error(getApiErrorMessage(payload, "Unable to load projects."))
      const data = (payload as { data?: unknown }).data as {
        items?: unknown
        nextCursor?: string | null
        hasMore?: boolean
      } | null
      if (!data || !Array.isArray(data.items))
        throw new Error("The projects response was invalid.")
      return {
        items: data.items as PublicProject[],
        nextCursor: data.nextCursor ?? null,
        hasMore: data.hasMore ?? false,
      }
    },
    [],
  )

  useEffect(() => {
    if (!routeUsername) {
      setProfileLoading(false)
      setProfileError("No username was provided.")
      return
    }
    let cancelled = false
    const load = async () => {
      setProfileLoading(true)
      setProfileError(null)
      setProfile(null)
      try {
        const result = await fetchProfile(routeUsername)
        if (!cancelled) setProfile(result)
      } catch (error) {
        if (!cancelled)
          setProfileError(
            error instanceof Error ? error.message : "Unable to load this profile.",
          )
      } finally {
        if (!cancelled) setProfileLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [routeUsername, retryKey, fetchProfile])

  useEffect(() => {
    if (!profile) return
    let cancelled = false
    const load = async () => {
      setProjectsLoading(true)
      setProjectsError(null)
      try {
        const result = await fetchProjects(profile.username, null)
        if (cancelled) return
        setProjects(result.items)
        setNextCursor(result.nextCursor)
        setHasMore(result.hasMore)
      } catch (error) {
        if (!cancelled)
          setProjectsError(
            error instanceof Error ? error.message : "Unable to load projects.",
          )
      } finally {
        if (!cancelled) setProjectsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [profile, retryKey, fetchProjects])

  const fetchMore = async () => {
    if (!profile || !hasMore || !nextCursor) return
    try {
      const result = await fetchProjects(profile.username, nextCursor)
      setProjects((prev) => [...prev, ...result.items])
      setNextCursor(result.nextCursor)
      setHasMore(result.hasMore)
    } catch (error) {
      toast.add({
        type: "error",
        title: "Unable to load more projects",
        description: error instanceof Error ? error.message : "Please try again.",
      })
    }
  }

  const initials = useMemo(
    () =>
      (profile?.name || profile?.username || "U")
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    [profile?.name, profile?.username],
  )

  const joinedDate = useMemo(() => {
    if (!profile) return ""
    const date = new Date(profile.createdAt)
    if (Number.isNaN(date.getTime())) return ""
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }, [profile])

  const isOwnProfile = Boolean(
    user && profile && user.username === profile.username,
  )

  if (!loaded) return <PageLoading />

  const content = (
    <main className="min-w-0 flex-1 bg-muted/30">
      <div className="mx-auto min-h-svh w-full max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
        {user && (
          <div className="mb-6 flex items-center gap-3">
            <SidebarTrigger
              variant="outline"
              size="icon"
              aria-label="Toggle navigation"
            />
            <p className="text-sm text-muted-foreground">Public profile</p>
          </div>
        )}

        {profileLoading ? (
          <ProfileSkeleton />
        ) : profileError || !profile ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center">
            <p className="text-sm font-medium text-destructive">
              {profileError ?? "This profile could not be found."}
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRetryKey((key) => key + 1)}
              >
                Try again
              </Button>
              <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
                Go home
              </Button>
            </div>
          </div>
        ) : (
          <>
            <Card>
              <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:gap-5">
                <Avatar size="lg" className="size-16 shrink-0 sm:size-20">
                  <AvatarImage
                    src={profile.avatarUrl || undefined}
                    alt={profile.name}
                  />
                  <AvatarFallback className="text-lg">{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
                    {profile.name}
                  </h1>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">
                    @{profile.username}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground sm:text-sm">
                    {joinedDate && (
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="size-3.5 shrink-0" />
                        Joined PartLens on {joinedDate}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5">
                      <Box className="size-3.5 shrink-0" />
                      {profile.totalProjects.toLocaleString()} public project
                      {profile.totalProjects === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
                {isOwnProfile && (
                  <Link
                    href="/settings"
                    className="w-full shrink-0 sm:w-auto"
                    aria-label="Edit profile"
                  >
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto"
                    >
                      <Pencil />
                      Edit profile
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>

            <Separator className="my-6" />

            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold tracking-tight">Projects</h2>
              <p className="text-sm text-muted-foreground">
                {profile.totalProjects.toLocaleString()} public project
                {profile.totalProjects === 1 ? "" : "s"}
              </p>
            </div>

            {projectsLoading ? (
              <ProjectCardsSkeleton />
            ) : projectsError ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center">
                <p className="text-sm font-medium text-destructive">
                  {projectsError}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setRetryKey((key) => key + 1)}
                >
                  Try again
                </Button>
              </div>
            ) : projects.length === 0 ? (
              <div className="rounded-lg border border-dashed p-10 text-center">
                <p className="text-sm font-medium">No public projects yet.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  @{profile.username} hasn&apos;t published any projects.
                </p>
              </div>
            ) : (
              <InfiniteScroll
                dataLength={projects.length}
                next={() => void fetchMore()}
                hasMore={hasMore}
                loader={
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {[1, 2].map((i) => (
                      <Card key={i}>
                        <CardContent className="space-y-3 py-6">
                          <Skeleton className="size-10 rounded-lg" />
                          <Skeleton className="h-6 w-3/4" />
                          <Skeleton className="h-4 w-full" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                }
                endMessage={
                  <p className="py-8 text-center text-xs text-muted-foreground">
                    You have reached the end of these projects.
                  </p>
                }
              >
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {projects.map((project) => (
                    <PublicProjectCard
                      key={project.id}
                      project={project}
                      onOpen={() => router.push(`/project/${project.publicId}`)}
                    />
                  ))}
                </div>
              </InfiniteScroll>
            )}
          </>
        )}
      </div>
    </main>
  )

  return user ? (
    <DashboardSidebar>{content}</DashboardSidebar>
  ) : (
    <>
      <Navbar />
      {content}
    </>
  )
}
