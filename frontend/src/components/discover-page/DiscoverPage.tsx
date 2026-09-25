'use client'

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import InfiniteScroll from "react-infinite-scroll-component"
import { Check, ChevronDown, Search, X } from "lucide-react"

import PublicProjectCard from "@/components/public/PublicProjectCard"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/components/ui/toast"
import { getApiErrorMessage, readJsonResponse } from "@/lib/project-form"
import vars from "@/vars/vars"

type DiscoverSort = "top" | "newest"

type PublicProject = {
  id: string
  publicId: string
  name: string
  description: string | null
  glbFileUrl: string
  createdAt: string
  updatedAt: string
  owner: {
    username: string
    name: string
    avatarUrl: string | null
  }
  views: number
  parts: number
}

const PAGE_LIMIT = 12

const SORT_LABELS: Record<DiscoverSort, string> = {
  top: "Top projects",
  newest: "Newest first",
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

export default function DiscoverPage({
  sidebarToggle,
}: {
  sidebarToggle?: React.ReactNode
}) {
  const router = useRouter()

  const [draft, setDraft] = useState("")
  const [query, setQuery] = useState<string | null>(null)
  const [sort, setSort] = useState<DiscoverSort>("top")

  const [items, setItems] = useState<PublicProject[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  const fetchDiscover = useCallback(
    async (sortValue: DiscoverSort, cursor?: string | null) => {
      const params = new URLSearchParams({
        sort: sortValue,
        limit: String(PAGE_LIMIT),
      })
      if (cursor) params.set("cursor", cursor)
      const response = await fetch(
        `${vars.BACKEND_URL}/api/v1/read/projects/discover?${params.toString()}`,
      )
      const payload = await readJsonResponse(response)
      if (!response.ok)
        throw new Error(
          getApiErrorMessage(payload, "Unable to load projects."),
        )
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

  const fetchSearch = useCallback(
    async (searchQuery: string, cursor?: string | null) => {
      const params = new URLSearchParams({
        q: searchQuery,
        limit: String(PAGE_LIMIT),
      })
      if (cursor) params.set("cursor", cursor)
      const response = await fetch(
        `${vars.BACKEND_URL}/api/v1/read/search/projects?${params.toString()}`,
      )
      const payload = await readJsonResponse(response)
      if (!response.ok)
        throw new Error(getApiErrorMessage(payload, "Unable to search projects."))
      const data = (payload as { data?: unknown }).data as {
        items?: unknown
        nextCursor?: string | null
        hasMore?: boolean
      } | null
      if (!data || !Array.isArray(data.items))
        throw new Error("The search response was invalid.")
      return {
        items: data.items as PublicProject[],
        nextCursor: data.nextCursor ?? null,
        hasMore: data.hasMore ?? false,
      }
    },
    [],
  )

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const result = query
          ? await fetchSearch(query, null)
          : await fetchDiscover(sort, null)
        if (cancelled) return
        setItems(result.items)
        setNextCursor(result.nextCursor)
        setHasMore(result.hasMore)
      } catch (err) {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : "Unable to load projects.",
          )
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [query, sort, retryKey, fetchDiscover, fetchSearch])

  const fetchMore = async () => {
    if (!hasMore || !nextCursor) return
    try {
      const result = query
        ? await fetchSearch(query, nextCursor)
        : await fetchDiscover(sort, nextCursor)
      setItems((prev) => [...prev, ...result.items])
      setNextCursor(result.nextCursor)
      setHasMore(result.hasMore)
    } catch (err) {
      toast.add({
        type: "error",
        title: "Unable to load more projects",
        description: err instanceof Error ? err.message : "Please try again.",
      })
    }
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const trimmed = draft.trim()
    if (!trimmed) {
      setDraft("")
      setQuery(null)
      return
    }
    if (trimmed === query) {
      setRetryKey((key) => key + 1)
      return
    }
    setQuery(trimmed)
  }

  const handleClearSearch = () => {
    setDraft("")
    setQuery(null)
  }

  const isSearching = query !== null

  return (
    <main className="min-w-0 flex-1 bg-muted/30">
      <div className="mx-auto min-h-svh w-full max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {sidebarToggle}
          {!isSearching && (
            <div className="order-2 ml-auto sm:order-3 sm:ml-0">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" className="shrink-0">
                    {SORT_LABELS[sort]}
                    <ChevronDown />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-44">
                {(Object.keys(SORT_LABELS) as DiscoverSort[]).map((value) => (
                  <DropdownMenuItem
                    key={value}
                    onClick={() => setSort(value)}
                  >
                    <span className="flex-1">{SORT_LABELS[value]}</span>
                    {sort === value && <Check />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            </div>
          )}
          <form
            onSubmit={handleSubmit}
            role="search"
            className="order-3 flex w-full basis-full items-center gap-2 sm:order-2 sm:mx-auto sm:w-auto sm:max-w-xl sm:flex-1"
          >
            <Input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Search projects by name or description…"
              aria-label="Search projects"
              className="h-10 min-w-0"
            />
            <Button type="submit" size="icon" aria-label="Search" className="shrink-0">
              <Search />
            </Button>
          </form>
        </div>

        <div className="mt-4 flex min-h-6 flex-wrap items-center justify-between gap-2">
          {isSearching ? (
            <>
              <p className="text-sm text-muted-foreground">
                Results for{" "}
                <span className="font-medium text-foreground">
                  &ldquo;{query}&rdquo;
                </span>
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearSearch}
              >
                <X />
                Clear search
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Discover projects
            </p>
          )}
        </div>

        <Separator className="my-4" />

        {loading ? (
          <ProjectCardsSkeleton />
        ) : error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center">
            <p className="text-sm font-medium text-destructive">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => setRetryKey((key) => key + 1)}
            >
              Try again
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-dashed p-10 text-center">
            <p className="text-sm font-medium">
              {isSearching
                ? "No projects matched your search."
                : "No public projects yet."}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {isSearching
                ? "Try a different keyword or browse the discovery feed."
                : "Published public projects will appear here."}
            </p>
            {isSearching && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={handleClearSearch}
              >
                Back to discovery
              </Button>
            )}
          </div>
        ) : (
          <InfiniteScroll
            dataLength={items.length}
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
                You have reached the end.
              </p>
            }
          >
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((project) => (
                <PublicProjectCard
                  key={project.id}
                  project={project}
                  onOpen={() => router.push(`/project/${project.publicId}`)}
                />
              ))}
            </div>
          </InfiniteScroll>
        )}
      </div>
    </main>
  )
}
