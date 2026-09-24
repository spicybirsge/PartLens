"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowLeft, Bookmark, Eye, FileText, Info, Loader2, Settings2, Share2 } from "lucide-react"
import Link from "next/link"

import DashboardSidebar from "@/components/DashboardSidebar"
import Navbar from "@/components/Navbar"
import PageLoading from "@/components/PageLoading"
import InteractiveGlbViewer from "@/components/3d/InteractiveGlbViewer"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { toast } from "@/components/ui/toast"
import { getApiErrorMessage, readJsonResponse } from "@/lib/project-form"
import { userStore } from "@/store/store"
import vars from "@/vars/vars"

type Manual = {
  id: string
  partId: string
  title: string
  fileUrl: string
  uploadedAt: string
}

type Part = {
  id: string
  projectId: string
  partNumber: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
  bookmarked: boolean
  manuals: Manual[]
}

type Owner = {
  id: string
  username: string
  name: string
  avatarUrl: string | null
  createdAt: string
}

type Project = {
  id: string
  publicId: string
  userId: string
  name: string
  description: string | null
  glbFileUrl: string
  unlisted: boolean
  createdAt: string
  updatedAt: string
  bookmarked: boolean
  owner: Owner
  views: number
  parts: Part[]
}

export default function ProjectPage({ id }: { id: string }) {
  const { user, loaded, checkIfLoggedIn } = userStore()
  const router = useRouter()

  const [project, setProject] = useState<Project | null>(null)
  const [parts, setParts] = useState<Part[]>([])
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null)
  const [selectedObjectName, setSelectedObjectName] = useState<string | null>(null)
  const [hoveredObjectName, setHoveredObjectName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [viewerError, setViewerError] = useState<string | null>(null)
  const [projectBookmarking, setProjectBookmarking] = useState(false)
  const [partBookmarkingId, setPartBookmarkingId] = useState<string | null>(null)

  useEffect(() => {
    if (!loaded) checkIfLoggedIn()
  }, [loaded, checkIfLoggedIn])

  useEffect(() => {
    if (!loaded) return
    const controller = new AbortController()
    const load = async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const token = window.localStorage.getItem("token")
        const headers: Record<string, string> = {}
        if (user && token) headers.Authorization = `Bearer ${token}`
        const response = await fetch(`${vars.BACKEND_URL}/api/v1/read/project/${id}`, {
          headers,
          signal: controller.signal,
        })
        const payload = await readJsonResponse(response)
        if (!response.ok) throw new Error(getApiErrorMessage(payload, "Unable to load the project."))
        const data = payload && typeof payload === "object" ? (payload as { data?: unknown }).data : null
        if (!data || typeof data !== "object") throw new Error("Project data was missing from the response.")
        const result = data as Partial<Project>
        if (
          !result.publicId ||
          !result.name ||
          !result.glbFileUrl ||
          !result.owner ||
          !Array.isArray(result.parts)
        ) {
          throw new Error("The project response was invalid.")
        }
        setProject(result as Project)
        setParts(result.parts)

        // Auto-select a part when the URL contains ?part=partNumber
        const partParam = new URLSearchParams(window.location.search).get("part")
        if (partParam) {
          const match = result.parts.find((part) => part.partNumber === partParam)
          if (match) {
            setSelectedPartId(match.id)
            setSelectedObjectName(match.partNumber)
          }
        }
      } catch (error) {
        if (!controller.signal.aborted) setLoadError(error instanceof Error ? error.message : "Unable to load the project.")
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [id, loaded, user])

  const selectedPart = parts.find((part) => part.id === selectedPartId) ?? null

  const updatePartQuery = (partNumber: string | null) => {
    const url = new URL(window.location.href)
    if (partNumber) url.searchParams.set("part", partNumber)
    else url.searchParams.delete("part")
    router.replace(url.pathname + url.search, { scroll: false })
  }

  const handleObjectClick = (objectName: string) => {
    setSelectedObjectName(objectName)
    const match = parts.find((part) => part.partNumber === objectName) ?? null
    setSelectedPartId(match?.id ?? null)
    updatePartQuery(match?.partNumber ?? null)
  }

  const handlePartSelect = (part: Part) => {
    setSelectedPartId(part.id)
    setSelectedObjectName(part.partNumber)
    updatePartQuery(part.partNumber)
  }

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back()
    } else {
      router.push("/")
    }
  }

  const handleShare = async () => {
    if (!project) return
    const url = `${vars.FRONTEND_URL}/project/${project.publicId}`
    try {
      await navigator.clipboard.writeText(url)
      toast.add({
        type: "success",
        title: "Link copied",
        description: "Project URL copied to clipboard.",
      })
    } catch {
      toast.add({
        type: "error",
        title: "Could not copy link",
        description: "Copy the URL from the address bar instead.",
      })
    }
  }

  const toggleProjectBookmark = async () => {
    if (!project) return
    const token = window.localStorage.getItem("token")
    if (!token) return
    const next = !project.bookmarked
    setProjectBookmarking(true)
    // Optimistic update before the API call, like social media apps do.
    setProject((current) => (current ? { ...current, bookmarked: next } : current))
    try {
      const creating = next
      const response = await fetch(
        creating
          ? `${vars.BACKEND_URL}/api/v1/create/bookmark/project`
          : `${vars.BACKEND_URL}/api/v1/delete/bookmark/project/${project.publicId}`,
        {
          method: creating ? "POST" : "DELETE",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: creating ? JSON.stringify({ public_id: project.publicId }) : undefined,
        },
      )
      const payload = await readJsonResponse(response)
      if (!response.ok) throw new Error(getApiErrorMessage(payload, "Unable to update the bookmark."))
      toast.add({
        type: "success",
        title: creating ? "Project bookmarked" : "Bookmark removed",
        description: creating ? `${project.name} was saved to your bookmarks.` : `${project.name} was removed from your bookmarks.`,
      })
    } catch (error) {
      setProject((current) => (current ? { ...current, bookmarked: !next } : current))
      toast.add({
        type: "error",
        title: "Unable to update bookmark",
        description: error instanceof Error ? error.message : "Please try again.",
      })
    } finally {
      setProjectBookmarking(false)
    }
  }

  const togglePartBookmark = async (part: Part) => {
    if (!project) return
    const token = window.localStorage.getItem("token")
    if (!token) return
    const next = !part.bookmarked
    setPartBookmarkingId(part.id)
    // Optimistic update before the API call.
    setParts((current) => current.map((item) => (item.id === part.id ? { ...item, bookmarked: next } : item)))
    try {
      const creating = next
      const response = await fetch(
        creating
          ? `${vars.BACKEND_URL}/api/v1/create/bookmark/part`
          : `${vars.BACKEND_URL}/api/v1/delete/bookmark/part/${part.id}`,
        {
          method: creating ? "POST" : "DELETE",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: creating ? JSON.stringify({ public_id: project.publicId, part_id: part.id }) : undefined,
        },
      )
      const payload = await readJsonResponse(response)
      if (!response.ok) throw new Error(getApiErrorMessage(payload, "Unable to update the bookmark."))
      toast.add({
        type: "success",
        title: creating ? "Part bookmarked" : "Bookmark removed",
        description: creating ? `${part.partNumber} was saved to your bookmarks.` : `${part.partNumber} was removed from your bookmarks.`,
      })
    } catch (error) {
      setParts((current) => current.map((item) => (item.id === part.id ? { ...item, bookmarked: !next } : item)))
      toast.add({
        type: "error",
        title: "Unable to update bookmark",
        description: error instanceof Error ? error.message : "Please try again.",
      })
    } finally {
      setPartBookmarkingId(null)
    }
  }

  if (!loaded) return <PageLoading />

  const isOwner = Boolean(user && project && project.owner.id === user.id)

  const content = (
    <ProjectView
      inSidebar={Boolean(user)}
      loading={loading}
      loadError={loadError}
      viewerError={viewerError}
      project={project}
      parts={parts}
      selectedPart={selectedPart}
      selectedObjectName={selectedObjectName}
      hoveredObjectName={hoveredObjectName}
      showBookmarks={Boolean(user)}
      isOwner={isOwner}
      projectBookmarking={projectBookmarking}
      partBookmarkingId={partBookmarkingId}
      onBack={handleBack}
      onShare={() => void handleShare()}
      onObjectClick={handleObjectClick}
      onPartSelect={handlePartSelect}
      onHoverChange={setHoveredObjectName}
      onViewerError={setViewerError}
      onProjectBookmark={() => void toggleProjectBookmark()}
      onPartBookmark={(part) => void togglePartBookmark(part)}
    />
  )

  return user ? <DashboardSidebar>{content}</DashboardSidebar> : (
    <>
      <Navbar />
      {content}
    </>
  )
}

type ProjectViewProps = {
  inSidebar: boolean
  loading: boolean
  loadError: string | null
  viewerError: string | null
  project: Project | null
  parts: Part[]
  selectedPart: Part | null
  selectedObjectName: string | null
  hoveredObjectName: string | null
  showBookmarks: boolean
  isOwner: boolean
  projectBookmarking: boolean
  partBookmarkingId: string | null
  onBack: () => void
  onShare: () => void
  onObjectClick: (objectName: string) => void
  onPartSelect: (part: Part) => void
  onHoverChange: (name: string | null) => void
  onViewerError: (message: string) => void
  onProjectBookmark: () => void
  onPartBookmark: (part: Part) => void
}

function ProjectView({
  inSidebar,
  loading,
  loadError,
  viewerError,
  project,
  parts,
  selectedPart,
  selectedObjectName,
  hoveredObjectName,
  showBookmarks,
  isOwner,
  projectBookmarking,
  partBookmarkingId,
  onBack,
  onShare,
  onObjectClick,
  onPartSelect,
  onHoverChange,
  onViewerError,
  onProjectBookmark,
  onPartBookmark,
}: ProjectViewProps) {
  const [search, setSearch] = useState("")
  const [descriptionOpen, setDescriptionOpen] = useState(false)

  const filteredParts = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return parts
    return parts.filter((part) => `${part.partNumber} ${part.name}`.toLowerCase().includes(query))
  }, [parts, search])

  const ownerInitials = useMemo(() => {
    if (!project) return "?"
    return (project.owner.name || project.owner.username || "U")
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase()
  }, [project])

  return (
    <main className="min-w-0 flex-1 bg-muted/30">
      <div className="mx-auto min-h-svh w-full max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
          
            {inSidebar && <SidebarTrigger variant="outline" size="icon" aria-label="Toggle navigation" />}
              <Button type="button" variant="ghost" size="icon" onClick={onBack} aria-label="Go back">
              <ArrowLeft />
            </Button>
            <div className="min-w-0">
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                <h1 className="truncate text-2xl font-semibold tracking-tight">
                  {loading ? <Skeleton className="h-7 w-48" /> : project?.name}
                </h1>
                {project && (
                  <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${project.unlisted ? "bg-muted text-muted-foreground" : "bg-emerald-500/10 text-emerald-600"}`}>
                    {project.unlisted ? "Unlisted" : "Public"}
                  </span>
                )}
              </div>
              {project && (
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Eye className="size-3.5" />
                    {project.views.toLocaleString()} view{project.views === 1 ? "" : "s"}
                  </span>
                  <span>Published {new Date(project.createdAt).toLocaleDateString()}</span>
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {project && (
              <Button type="button" variant="outline" size="sm" onClick={onShare}>
                <Share2 />
                <span className="hidden sm:inline">Share</span>
              </Button>
            )}
            {project && (
              <Button type="button" variant="outline" size="sm" onClick={() => setDescriptionOpen(true)}>
                <FileText />
                <span className="hidden sm:inline">View description</span>
              </Button>
            )}
            {isOwner && project && (
              <Link href={`/manage/${project.publicId}`}>
                <Button type="button" variant="outline" size="sm">
                  <Settings2 />
                  <span className="hidden sm:inline">Manage project</span>
                </Button>
              </Link>
            )}
            {showBookmarks && project && (
              <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={onProjectBookmark} disabled={projectBookmarking}>
                {projectBookmarking ? <Loader2 className="animate-spin" /> : <Bookmark className={project.bookmarked ? "fill-current text-primary" : ""} />}
                <span className="hidden sm:inline">{project.bookmarked ? "Bookmarked" : "Save project"}</span>
              </Button>
            )}
          </div>
        </div>
        <Separator className="my-6" />

        {project && !loading && (
          <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Link href={`/user/${project.owner.username}`} className="shrink-0" aria-label={`${project.owner.name} profile`}>
              <Avatar size="sm">
                <AvatarImage src={project.owner.avatarUrl || undefined} alt={project.owner.name} />
                <AvatarFallback>{ownerInitials}</AvatarFallback>
              </Avatar>
            </Link>
            <span className="min-w-0">
              {" "}
              <Link href={`/user/${project.owner.username}`} className="font-medium text-foreground hover:underline">
                {project.owner.name}
              </Link>{" "}
              (@{project.owner.username})
            </span>
          </div>
        )}

        {loading ? (
          <ProjectSkeleton />
        ) : loadError ? (
          <ErrorMessage message={loadError} />
        ) : project && (
          <div className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]">
              <Card>
                <CardHeader>
                  <CardTitle>Interactive model</CardTitle>
                  <CardDescription>
                    {hoveredObjectName ? `Hovering: ${hoveredObjectName}` : "Click a part on the model to see its manuals."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {viewerError ? <ErrorMessage message={viewerError} /> : (
                    <InteractiveGlbViewer
                      url={project.glbFileUrl}
                      selectedPartName={selectedObjectName ?? selectedPart?.partNumber}
                      onPartClick={onObjectClick}
                      onHoverChange={onHoverChange}
                      onError={onViewerError}
                      isManaging={false}
                    />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Parts</CardTitle>
                  <CardDescription>{parts.length} part{parts.length === 1 ? "" : "s"}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search part number or name" aria-label="Search parts" />
                  <div className="max-h-[29rem] space-y-2 overflow-y-auto pr-1">
                    {filteredParts.length === 0 ? (
                      <p className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
                        {parts.length === 0 ? "This project has no parts configured yet." : "No parts match this search."}
                      </p>
                    ) : filteredParts.map((part) => (
                      <button
                        key={part.id}
                        type="button"
                        className={`w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted/60 ${selectedPart?.id === part.id ? "border-primary bg-primary/5" : ""}`}
                        onClick={() => onPartSelect(part)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{part.partNumber}</span>
                            <span className="block truncate text-xs text-muted-foreground">{part.name}</span>
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground">{part.manuals.length} manual{part.manuals.length === 1 ? "" : "s"}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {selectedPart ? (
              <Card>
                <CardHeader className="!flex flex-row items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="truncate uppercase">{selectedPart.name}</CardTitle>
                    <CardDescription className="space-y-1">
                      <span className="block">
                        <span className="font-medium text-foreground">Part number:</span>{" "}
                        <span className="font-mono">{selectedPart.partNumber}</span>
                      </span>
                      {selectedObjectName && selectedObjectName !== selectedPart.partNumber && (
                        <span className="block">
                          <span className="font-medium text-foreground">GLB object:</span>{" "}
                          <span className="font-mono">{selectedObjectName}</span>
                        </span>
                      )}
                      {selectedPart.description && (
                        <span className="block">
                          <span className="font-medium text-foreground">Description:</span>{" "}
                          {selectedPart.description}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  {showBookmarks && (
                    <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => onPartBookmark(selectedPart)} disabled={partBookmarkingId === selectedPart.id}>
                      {partBookmarkingId === selectedPart.id ? <Loader2 className="animate-spin" /> : <Bookmark className={selectedPart.bookmarked ? "fill-current text-primary" : ""} />}
                      <span className="hidden sm:inline">{selectedPart.bookmarked ? "Bookmarked" : "Save part"}</span>
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {selectedPart.manuals.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No documentation has been added for this part yet.</p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {selectedPart.manuals.map((manual) => (
                        <div key={manual.id} className="flex items-center gap-3 rounded-lg border p-3">
                          <FileText className="size-5 shrink-0 text-primary" />
                          <div className="min-w-0 flex-1">
                            <a href={manual.fileUrl} target="_blank" rel="noreferrer" className="block truncate text-sm font-medium hover:underline">{manual.title}</a>
                            <p className="text-xs text-muted-foreground">PDF manual</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : selectedObjectName ? (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  No documentation available for this part:{" "}
                  <span className="font-mono font-medium text-foreground">{selectedObjectName}</span>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  Select a part on the model or from the list to view its documentation.
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <Dialog open={descriptionOpen} onOpenChange={setDescriptionOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Description</DialogTitle>
            </DialogHeader>
            {project?.description ? (
              <p className="text-sm whitespace-pre-wrap">{project.description}</p>
            ) : (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <Info className="size-8 text-muted-foreground" />
                <p className="text-sm font-medium">No description</p>
                <p className="text-sm text-muted-foreground">The owner hasn&apos;t added a description for this project yet.</p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </main>
  )
}

function ProjectSkeleton() {
  return <div className="space-y-6"><div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]"><Card><CardHeader><Skeleton className="h-5 w-36" /><Skeleton className="h-4 w-72" /></CardHeader><CardContent><Skeleton className="h-80 w-full sm:h-[30rem]" /></CardContent></Card><Card><CardHeader><Skeleton className="h-5 w-24" /><Skeleton className="h-4 w-36" /></CardHeader><CardContent className="space-y-3"><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /></CardContent></Card></div><Card><CardContent className="space-y-4 py-6"><Skeleton className="h-5 w-48" /><Skeleton className="h-10 w-full" /></CardContent></Card></div>
}

function ErrorMessage({ message }: { message: string }) {
  return <div role="alert" className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"><AlertCircle className="mt-0.5 size-4 shrink-0" /><p>{message}</p></div>
}