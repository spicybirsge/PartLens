'use client'
import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import InfiniteScroll from "react-infinite-scroll-component"
import { BookmarkX, Check, ChevronDown, Loader2 } from "lucide-react"
import DashboardSidebar from "../DashboardSidebar"
import PageLoading from "../PageLoading"
import ProjectCard from "../projects/ProjectCard"
import PartBookmarkCard from "./PartBookmarkCard"
import { userStore } from "@/store/store"
import vars from "@/vars/vars"
import { Separator } from "../ui/separator"
import { SidebarTrigger } from "../ui/sidebar"
import { Button } from "../ui/button"
import { Card, CardContent, CardHeader } from "../ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu"
import { Skeleton } from "../ui/skeleton"
import { toast } from "../ui/toast"
import { getApiErrorMessage, readJsonResponse } from "@/lib/project-form"
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip"

type BookmarkFilter = "projects" | "parts"

type ProjectBookmarkItem = {
  id: string
  createdAt: string
  project: {
    id: string
    publicId: string
    name: string
    description: string | null
    glbFileUrl: string
    unlisted: boolean
    createdAt: string
    updatedAt: string
  }
}

type PartBookmarkItem = {
  id: string
  createdAt: string
  part: {
    id: string
    partNumber: string
    name: string
    description: string | null
    createdAt: string
    updatedAt: string
  }
  project: {
    id: string
    publicId: string
    name: string
  }
}

const PAGE_LIMIT = 12

const FILTER_LABELS: Record<BookmarkFilter, string> = {
  projects: "Project bookmarks",
  parts: "Part bookmarks",
}

function ProjectCardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
          <CardContent>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-2/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function PartCardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Card key={i}>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <Skeleton className="size-10 rounded-lg" />
              <Skeleton className="size-8 rounded-md" />
            </div>
            <Skeleton className="mt-3 h-6 w-1/2 font-mono" />
            <Skeleton className="mt-2 h-4 w-2/3" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <div className="flex items-center justify-between gap-2 pt-1">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3.5 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default function Bookmarks() {
  const router = useRouter()
  const { user, loaded, checkIfLoggedIn } = userStore()

  const [filter, setFilter] = useState<BookmarkFilter>("projects")
  const [projectItems, setProjectItems] = useState<ProjectBookmarkItem[]>([])
  const [partItems, setPartItems] = useState<PartBookmarkItem[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    if (!loaded) {
      checkIfLoggedIn()
    } else if (!user) {
      router.push("/login", { scroll: false })
    }
  }, [loaded, user, checkIfLoggedIn, router])

  const fetchBookmarks = useCallback(
    async (type: BookmarkFilter, cursor?: string | null) => {
      const token = window.localStorage.getItem("token")
      if (!token) throw new Error("You are not signed in.")
      const params = new URLSearchParams({
        type,
        limit: String(PAGE_LIMIT),
      })
      if (cursor) params.set("cursor", cursor)
      const response = await fetch(
        `${vars.BACKEND_URL}/api/v1/read/bookmarks?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      const payload = await readJsonResponse(response)
      if (!response.ok)
        throw new Error(getApiErrorMessage(payload, "Unable to load bookmarks."))
      const data = (payload as { data?: unknown }).data as {
        items?: unknown
        nextCursor?: string | null
        hasMore?: boolean
      } | null
      if (!data || !Array.isArray(data.items))
        throw new Error("The bookmarks response was invalid.")
      return {
        items: data.items,
        nextCursor: data.nextCursor ?? null,
        hasMore: data.hasMore ?? false,
      }
    },
    [],
  )

  useEffect(() => {
    if (!loaded || !user) return
    let cancelled = false
    const load = async () => {
      setLoadingInitial(true)
      setLoadError(null)
      try {
        const result = await fetchBookmarks(filter, null)
        if (cancelled) return
        if (filter === "projects") {
          setProjectItems(result.items as ProjectBookmarkItem[])
          setPartItems([])
        } else {
          setPartItems(result.items as PartBookmarkItem[])
          setProjectItems([])
        }
        setNextCursor(result.nextCursor)
        setHasMore(result.hasMore)
      } catch (error) {
        if (!cancelled)
          setLoadError(
            error instanceof Error ? error.message : "Unable to load bookmarks.",
          )
      } finally {
        if (!cancelled) setLoadingInitial(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [filter, retryKey, loaded, user, fetchBookmarks])

  const fetchMore = async () => {
    if (!hasMore || !nextCursor) return
    try {
      const result = await fetchBookmarks(filter, nextCursor)
      if (filter === "projects") {
        setProjectItems((prev) => [
          ...prev,
          ...(result.items as ProjectBookmarkItem[]),
        ])
      } else {
        setPartItems((prev) => [...prev, ...(result.items as PartBookmarkItem[])])
      }
      setNextCursor(result.nextCursor)
      setHasMore(result.hasMore)
    } catch (error) {
      toast.add({
        type: "error",
        title: "Unable to load more bookmarks",
        description:
          error instanceof Error ? error.message : "Please try again.",
      })
    }
  }

  const handleRemoveProject = async (item: ProjectBookmarkItem) => {
    const token = window.localStorage.getItem("token")
    if (!token) return
    setRemovingId(item.id)
    const previous = projectItems
    setProjectItems((prev) => prev.filter((entry) => entry.id !== item.id))
    try {
      const response = await fetch(
        `${vars.BACKEND_URL}/api/v1/delete/bookmark/project/${item.project.publicId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      )
      const payload = await readJsonResponse(response)
      if (!response.ok)
        throw new Error(getApiErrorMessage(payload, "Unable to remove bookmark."))
      toast.add({
        type: "success",
        title: "Bookmark removed",
        description: `${item.project.name} was removed from your bookmarks.`,
      })
    } catch (error) {
      setProjectItems(previous)
      toast.add({
        type: "error",
        title: "Unable to remove bookmark",
        description: error instanceof Error ? error.message : "Please try again.",
      })
    } finally {
      setRemovingId(null)
    }
  }

  const handleRemovePart = async (item: PartBookmarkItem) => {
    const token = window.localStorage.getItem("token")
    if (!token) return
    setRemovingId(item.id)
    const previous = partItems
    setPartItems((prev) => prev.filter((entry) => entry.id !== item.id))
    try {
      const response = await fetch(
        `${vars.BACKEND_URL}/api/v1/delete/bookmark/part/${item.part.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      )
      const payload = await readJsonResponse(response)
      if (!response.ok)
        throw new Error(getApiErrorMessage(payload, "Unable to remove bookmark."))
      toast.add({
        type: "success",
        title: "Bookmark removed",
        description: `${item.part.partNumber} was removed from your bookmarks.`,
      })
    } catch (error) {
      setPartItems(previous)
      toast.add({
        type: "error",
        title: "Unable to remove bookmark",
        description: error instanceof Error ? error.message : "Please try again.",
      })
    } finally {
      setRemovingId(null)
    }
  }

  if (!loaded || !user) {
    return <PageLoading />
  }

  const itemsCount =
    filter === "projects" ? projectItems.length : partItems.length

  return (
    <DashboardSidebar>
      <main className="min-w-0 flex-1 bg-muted/30">
        <div className="mx-auto min-h-svh w-full max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <SidebarTrigger variant="outline" size="icon" aria-label="Toggle navigation" />
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Manage your bookmarks</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight">Bookmarks</h1>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" className="w-full justify-between sm:w-auto sm:shrink-0">
                    {FILTER_LABELS[filter]}
                    <ChevronDown />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-52">
                {(Object.keys(FILTER_LABELS) as BookmarkFilter[]).map((value) => (
                  <DropdownMenuItem
                    key={value}
                    onClick={() => setFilter(value)}
                  >
                    <span className="flex-1">{FILTER_LABELS[value]}</span>
                    {filter === value && <Check />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Separator className="my-6" />

          {loadingInitial ? (
            filter === "projects" ? (
              <ProjectCardsSkeleton />
            ) : (
              <PartCardsSkeleton />
            )
          ) : loadError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center">
              <p className="text-sm font-medium text-destructive">{loadError}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setRetryKey((key) => key + 1)}
              >
                Try again
              </Button>
            </div>
          ) : itemsCount === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center">
              <p className="text-sm font-medium">
                {filter === "projects"
                  ? "No project bookmarks yet."
                  : "No part bookmarks yet."}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {filter === "projects"
                  ? "Save a project to see it here."
                  : "Save a part to see it here."}
              </p>
            </div>
          ) : (
            <InfiniteScroll
              dataLength={itemsCount}
              next={() => void fetchMore()}
              hasMore={hasMore}
              loader={
                filter === "projects" ? (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {[1, 2].map((i) => (
                      <Card key={i}>
                        <CardHeader>
                          <Skeleton className="size-10 rounded-lg" />
                          <Skeleton className="mt-3 h-6 w-3/4" />
                        </CardHeader>
                        <CardContent>
                          <Skeleton className="h-4 w-full" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {[1, 2].map((i) => (
                      <Card key={i}>
                        <CardHeader>
                          <Skeleton className="h-6 w-1/2" />
                        </CardHeader>
                        <CardContent>
                          <Skeleton className="h-4 w-full" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )
              }
              endMessage={
                <p className="py-8 text-center text-xs text-muted-foreground">
                  You have reached the end of your bookmarks.
                </p>
              }
            >
              {filter === "projects" ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {projectItems.map((item) => (
                    <ProjectCard
                      key={item.id}
                      project={{ ...item.project, savedAt: item.createdAt }}
                      onOpen={() =>
                        router.push(`/project/${item.project.publicId}`)
                      }
                      action={
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Remove ${item.project.name} bookmark`}
                                disabled={removingId === item.id}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  void handleRemoveProject(item)
                                }}
                              >
                                {removingId === item.id ? (
                                  <Loader2 className="animate-spin" />
                                ) : (
                                  <BookmarkX />
                                )}
                              </Button>
                            }
                          />
                          <TooltipContent>Remove bookmark</TooltipContent>
                        </Tooltip>
                      }
                    />
                  ))}
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {partItems.map((item) => (
                    <PartBookmarkCard
                      key={item.id}
                      part={item.part}
                      project={item.project}
                      savedAt={item.createdAt}
                      onOpen={() =>
                        router.push(
                          `/project/${item.project.publicId}?part=${encodeURIComponent(item.part.partNumber)}`,
                        )
                      }
                      action={
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Remove ${item.part.partNumber} bookmark`}
                                disabled={removingId === item.id}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  void handleRemovePart(item)
                                }}
                              >
                                {removingId === item.id ? (
                                  <Loader2 className="animate-spin" />
                                ) : (
                                  <BookmarkX />
                                )}
                              </Button>
                            }
                          />
                          <TooltipContent>Remove bookmark</TooltipContent>
                        </Tooltip>
                      }
                    />
                  ))}
                </div>
              )}
            </InfiniteScroll>
          )}
        </div>
      </main>
    </DashboardSidebar>
  )
}
