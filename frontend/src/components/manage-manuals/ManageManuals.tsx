"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertCircle, FileText, Loader2, Plus, Save, Trash2, UploadCloud } from "lucide-react"
import { useRouter } from "next/navigation"

import InteractiveGlbViewer from "@/components/3d/InteractiveGlbViewer"
import ManageProjectSidebar from "../ManageProjectSidebar"
import PageLoading from "../PageLoading"
import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Input } from "../ui/input"
import { Separator } from "../ui/separator"
import { Skeleton } from "../ui/skeleton"
import { SidebarTrigger } from "../ui/sidebar"
import { toast } from "../ui/toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog"
import { readJsonResponse, getApiErrorMessage } from "@/lib/project-form"
import { userStore } from "@/store/store"
import vars from "@/vars/vars"

type Manual = {
  id: string
  title: string
  fileUrl: string
  uploadedAt: string
}

type Part = {
  id: string
  partNumber: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
  manuals: Manual[]
}

type Project = {
  name: string
  glbFileUrl: string
}

type PartsResponse = {
  project: Project
  parts: Part[]
}

type PartForm = {
  partNumber: string
  name: string
  description: string
}

const emptyPartForm: PartForm = { partNumber: "", name: "", description: "" }

export default function ManageManuals({ id }: { id: string }) {
  const router = useRouter()
  const { user, loaded, checkIfLoggedIn } = userStore()
  const [project, setProject] = useState<Project | null>(null)
  const [parts, setParts] = useState<Part[]>([])
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null)
  const [selectedObjectName, setSelectedObjectName] = useState<string | null>(null)
  const [hoveredObjectName, setHoveredObjectName] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [viewerError, setViewerError] = useState<string | null>(null)
  const [partForm, setPartForm] = useState<PartForm>(emptyPartForm)
  const [partFormOpen, setPartFormOpen] = useState(false)
  const [editingPartId, setEditingPartId] = useState<string | null>(null)
  const [partSubmitting, setPartSubmitting] = useState(false)
  const [manualTitle, setManualTitle] = useState("")
  const [manualFile, setManualFile] = useState<File | null>(null)
  const [manualSubmitting, setManualSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ type: "part" | "manual"; id: string; label: string } | null>(null)

  useEffect(() => {
    if (!loaded) checkIfLoggedIn()
    else if (!user) router.push("/login", { scroll: false })
  }, [loaded, user, checkIfLoggedIn, router])

  useEffect(() => {
    if (!user) return
    const controller = new AbortController()
    const load = async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const token = window.localStorage.getItem("token")
        if (!token) throw new Error("Your session has expired. Please sign in again.")
        const response = await fetch(`${vars.BACKEND_URL}/api/v1/read/project/${id}/parts`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        })
        const payload = await readJsonResponse(response)
        if (!response.ok) throw new Error(getApiErrorMessage(payload, "Unable to load project parts."))
        const data = payload && typeof payload === "object" ? (payload as { data?: unknown }).data : null
        if (!data || typeof data !== "object") throw new Error("Project parts were missing from the response.")
        const result = data as Partial<PartsResponse>
        if (!result.project || !Array.isArray(result.parts)) throw new Error("The project parts response was invalid.")
        setProject(result.project)
        setParts(result.parts)
        setSelectedPartId(result.parts[0]?.id ?? null)
      } catch (error) {
        if (!controller.signal.aborted) setLoadError(error instanceof Error ? error.message : "Unable to load project parts.")
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [id, user])

  const selectedPart = parts.find((part) => part.id === selectedPartId) ?? null
  const filteredParts = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return parts
    return parts.filter((part) => `${part.partNumber} ${part.name}`.toLowerCase().includes(query))
  }, [parts, search])

  const findMatchingPart = (objectName: string) =>
    parts.find((part) => part.partNumber === objectName || part.name === objectName) ?? null

  const handleObjectClick = (objectName: string) => {
    setSelectedObjectName(objectName)
    const match = findMatchingPart(objectName)
    if (match) {
      setSelectedPartId(match.id)
      return
    }
    openPartForm({ partNumber: objectName, name: objectName, description: "" })
  }

  const openPartForm = (initial: PartForm = emptyPartForm, part?: Part) => {
    setEditingPartId(part?.id ?? null)
    setPartForm(part ? {
      partNumber: part.partNumber,
      name: part.name,
      description: part.description ?? "",
    } : initial)
    setPartFormOpen(true)
  }

  const submitPart = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!partForm.partNumber.trim() || !partForm.name.trim()) return
    setPartSubmitting(true)
    try {
      const token = window.localStorage.getItem("token")
      if (!token) throw new Error("Your session has expired. Please sign in again.")
      const editing = Boolean(editingPartId)
      const response = await fetch(
        `${vars.BACKEND_URL}/api/v1/${editing ? `update/manual/${editingPartId}` : "create/part"}`,
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(editing ? {
            part_number: partForm.partNumber.trim(),
            name: partForm.name.trim(),
            description: partForm.description.trim(),
          } : {
            public_id: id,
            part_number: partForm.partNumber.trim(),
            name: partForm.name.trim(),
            description: partForm.description.trim(),
            file_urls: [],
          }),
        },
      )
      const payload = await readJsonResponse(response)
      if (!response.ok) throw new Error(getApiErrorMessage(payload, "Unable to save the part."))
      const data = payload && typeof payload === "object" ? (payload as { data?: unknown }).data : null
      const saved = editing
        ? data
        : data && typeof data === "object" ? (data as { part?: unknown }).part : null
      if (!saved || typeof saved !== "object") throw new Error("The saved part was missing from the response.")
      const nextPart = { ...(saved as Part), manuals: editing ? (selectedPart?.manuals ?? []) : [] }
      setParts((current) => editing
        ? current.map((part) => part.id === nextPart.id ? nextPart : part)
        : [...current, nextPart])
      setSelectedPartId(nextPart.id)
      setSelectedObjectName(nextPart.partNumber)
      setPartFormOpen(false)
      toast.add({ type: "success", title: editing ? "Part updated" : "Part created", description: "The part list is up to date." })
    } catch (error) {
      toast.add({ type: "error", title: "Unable to save part", description: error instanceof Error ? error.message : "Please try again." })
    } finally {
      setPartSubmitting(false)
    }
  }

  const deletePart = async (part: Part) => {
    setDeletingId(part.id)
    try {
      const token = window.localStorage.getItem("token")
      if (!token) throw new Error("Your session has expired. Please sign in again.")
      const response = await fetch(`${vars.BACKEND_URL}/api/v1/delete/part/${part.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      const payload = await readJsonResponse(response)
      if (!response.ok) throw new Error(getApiErrorMessage(payload, "Unable to delete the part."))
      setParts((current) => current.filter((item) => item.id !== part.id))
      setSelectedPartId((current) => current === part.id ? null : current)
      toast.add({ type: "success", title: "Part deleted", description: "The part and its manuals were removed." })
      setDeleteTarget(null)
    } catch (error) {
      toast.add({ type: "error", title: "Unable to delete part", description: error instanceof Error ? error.message : "Please try again." })
    } finally {
      setDeletingId(null)
    }
  }

  const uploadManual = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedPart || !manualFile || !manualTitle.trim()) return
    setManualSubmitting(true)
    try {
      const token = window.localStorage.getItem("token")
      if (!token) throw new Error("Your session has expired. Please sign in again.")
      const formData = new FormData()
      formData.append("file", manualFile)
      const uploadResponse = await fetch(`${vars.BACKEND_URL}/api/v1/upload/pdf`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const uploadPayload = await readJsonResponse(uploadResponse)
      if (!uploadResponse.ok) throw new Error(getApiErrorMessage(uploadPayload, "Unable to upload the PDF."))
      const uploadData = uploadPayload && typeof uploadPayload === "object" ? (uploadPayload as { data?: { url?: unknown } }).data : null
      if (!uploadData || typeof uploadData.url !== "string") throw new Error("The PDF upload did not return a file URL.")
      const response = await fetch(`${vars.BACKEND_URL}/api/v1/create/manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ part_id: selectedPart.id, title: manualTitle.trim(), file_url: uploadData.url }),
      })
      const payload = await readJsonResponse(response)
      if (!response.ok) throw new Error(getApiErrorMessage(payload, "Unable to add the manual."))
      const data = payload && typeof payload === "object" ? (payload as { data?: unknown }).data : null
      if (!data || typeof data !== "object") throw new Error("The created manual was missing from the response.")
      setParts((current) => current.map((part) => part.id === selectedPart.id
        ? { ...part, manuals: [data as Manual, ...part.manuals] }
        : part))
      setManualTitle("")
      setManualFile(null)
      const input = document.getElementById("manual-file") as HTMLInputElement | null
      if (input) input.value = ""
      toast.add({ type: "success", title: "Manual added", description: "The manual is now linked to this part." })
    } catch (error) {
      toast.add({ type: "error", title: "Unable to add manual", description: error instanceof Error ? error.message : "Please try again." })
    } finally {
      setManualSubmitting(false)
    }
  }

  const deleteManual = async (manual: Manual) => {
    setDeletingId(manual.id)
    try {
      const token = window.localStorage.getItem("token")
      if (!token) throw new Error("Your session has expired. Please sign in again.")
      const response = await fetch(`${vars.BACKEND_URL}/api/v1/delete/manual/${manual.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      const payload = await readJsonResponse(response)
      if (!response.ok) throw new Error(getApiErrorMessage(payload, "Unable to delete the manual."))
      setParts((current) => current.map((part) => ({
        ...part,
        manuals: part.manuals.filter((item) => item.id !== manual.id),
      })))
      toast.add({ type: "success", title: "Manual deleted", description: "The manual was removed." })
      setDeleteTarget(null)
    } catch (error) {
      toast.add({ type: "error", title: "Unable to delete manual", description: error instanceof Error ? error.message : "Please try again." })
    } finally {
      setDeletingId(null)
    }
  }

  if (!loaded || !user) return <PageLoading />

  return (
    <ManageProjectSidebar projectId={id}>
      <main className="min-w-0 flex-1 bg-muted/30">
        <div className="mx-auto min-h-svh w-full max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
          <div className="flex items-center gap-3">
            <SidebarTrigger variant="outline" size="icon" aria-label="Toggle navigation" />
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">Manage your project manuals here</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">Project Manuals</h1>
              {loading ? <Skeleton className="mt-2 h-5 w-64" /> : project && (
                <p className="mt-1 max-w-[min(32rem,70vw)] truncate text-sm font-medium text-foreground/80" title={project.name}>
                  Editing: {project.name}
                </p>
              )}
            </div>
          </div>
          <Separator className="my-6" />

          {loading ? <ManualsSkeleton /> : loadError ? <ErrorMessage message={loadError} /> : project && (
            <div className="space-y-6">
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]">
                <Card>
                  <CardHeader>
                    <CardTitle>Interactive model</CardTitle>
                    <CardDescription>
                      {hoveredObjectName ? `Hovering: ${hoveredObjectName}` : "Select a named GLB object to configure its documentation."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {viewerError ? <ErrorMessage message={viewerError} /> : (
                      <InteractiveGlbViewer
                        url={project.glbFileUrl}
                        selectedPartName={selectedObjectName ?? selectedPart?.partNumber}
                        onPartClick={handleObjectClick}
                        onHoverChange={setHoveredObjectName}
                        onError={setViewerError}
                      />
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex-row items-start justify-between gap-3">
                    <div>
                      <CardTitle>Parts</CardTitle>
                      <CardDescription>{parts.length} configured part{parts.length === 1 ? "" : "s"}</CardDescription>
                    </div>
                    <Button type="button" size="sm" onClick={() => openPartForm()}><Plus /> Create Part</Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search part number or name" aria-label="Search parts" />
                    <div className="max-h-[29rem] space-y-2 overflow-y-auto pr-1">
                      {filteredParts.length === 0 ? (
                        <p className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">No parts match this search.</p>
                      ) : filteredParts.map((part) => (
                        <button
                          key={part.id}
                          type="button"
                          className={`w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted/60 ${selectedPartId === part.id ? "border-primary bg-primary/5" : ""}`}
                          onClick={() => {
                            setSelectedPartId(part.id)
                            setSelectedObjectName(part.partNumber)
                          }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="min-w-0">
                              <span className="block truncate font-medium">{part.partNumber}</span>
                              <span className="block truncate text-xs text-muted-foreground">{part.name}</span>
                            </span>
                            <span className="shrink-0 text-xs text-muted-foreground">{part.manuals.length} file{part.manuals.length === 1 ? "" : "s"}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {selectedPart ? (
                <Card>
                  <CardHeader className="flex-row items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="truncate">{selectedPart.name}</CardTitle>
                      <CardDescription className="truncate">{selectedPart.partNumber}{selectedObjectName ? ` · GLB object: ${selectedObjectName}` : ""}</CardDescription>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => openPartForm(emptyPartForm, selectedPart)}><Save /> Edit</Button>
                      <Button type="button" variant="destructive" size="sm" onClick={() => setDeleteTarget({ type: "part", id: selectedPart.id, label: selectedPart.partNumber })} disabled={deletingId === selectedPart.id}><Trash2 /> Delete</Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <form className="grid gap-3 rounded-lg border border-dashed p-4 sm:grid-cols-[1fr_1fr_auto]" onSubmit={uploadManual}>
                      <Input value={manualTitle} onChange={(event) => setManualTitle(event.target.value)} placeholder="Manual title" aria-label="Manual title" required />
                      <Input id="manual-file" type="file" accept=".pdf,application/pdf" onChange={(event) => setManualFile(event.target.files?.[0] ?? null)} required />
                      <Button type="submit" disabled={manualSubmitting || !manualFile || !manualTitle.trim()}>
                        {manualSubmitting ? <Loader2 className="animate-spin" /> : <UploadCloud />}
                        {manualSubmitting ? "Uploading…" : "Add manual"}
                      </Button>
                    </form>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {selectedPart.manuals.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No documentation has been added for this part yet.</p>
                      ) : selectedPart.manuals.map((manual) => (
                        <div key={manual.id} className="flex items-center gap-3 rounded-lg border p-3">
                          <FileText className="size-5 shrink-0 text-primary" />
                          <div className="min-w-0 flex-1">
                            <a href={manual.fileUrl} target="_blank" rel="noreferrer" className="block truncate text-sm font-medium hover:underline">{manual.title}</a>
                            <p className="text-xs text-muted-foreground">PDF manual</p>
                          </div>
                          <Button type="button" variant="ghost" size="icon-sm" aria-label={`Delete ${manual.title}`} onClick={() => setDeleteTarget({ type: "manual", id: manual.id, label: manual.title })} disabled={deletingId === manual.id}><Trash2 /></Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Create or select a part to manage its manuals.</CardContent></Card>
              )}
            </div>
          )}
        </div>
      </main>
      <Dialog open={partFormOpen} onOpenChange={setPartFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPartId ? "Edit part" : "Create part"}</DialogTitle>
            <DialogDescription>Part numbers are matched with GLB object names when available.</DialogDescription>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={submitPart}>
            <Field label="Part number" required value={partForm.partNumber} onChange={(value) => setPartForm((current) => ({ ...current, partNumber: value }))} />
            <Field label="Name" required value={partForm.name} onChange={(value) => setPartForm((current) => ({ ...current, name: value }))} />
            <Field label="Description" value={partForm.description} onChange={(value) => setPartForm((current) => ({ ...current, description: value }))} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPartFormOpen(false)} disabled={partSubmitting}>Cancel</Button>
              <Button type="submit" disabled={partSubmitting || !partForm.partNumber.trim() || !partForm.name.trim()}>
                {partSubmitting ? <Loader2 className="animate-spin" /> : <Save />}
                {partSubmitting ? "Saving…" : editingPartId ? "Save changes" : "Create part"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{deleteTarget?.type === "manual" ? "Delete manual?" : "Delete part?"}</DialogTitle>
            <DialogDescription>
              {deleteTarget?.type === "manual"
                ? `This will permanently remove “${deleteTarget.label}”.`
                : `This will permanently remove ${deleteTarget?.label ?? "this part"} and all of its manuals.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)} disabled={deletingId !== null}>Cancel</Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!deleteTarget || deletingId !== null}
              onClick={() => {
                if (!deleteTarget) return
                if (deleteTarget.type === "manual") {
                  const manual = parts.flatMap((part) => part.manuals).find((item) => item.id === deleteTarget.id)
                  if (manual) void deleteManual(manual)
                } else {
                  const part = parts.find((item) => item.id === deleteTarget.id)
                  if (part) void deletePart(part)
                }
              }}
            >
              {deletingId !== null ? <Loader2 className="animate-spin" /> : <Trash2 />}
              {deletingId !== null ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ManageProjectSidebar>
  )
}

function Field({ label, value, onChange, required = false }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  return (
    <label className="space-y-2 text-sm font-medium">
      <span>{label}{required ? " *" : ""}</span>
      <Input value={value} onChange={(event) => onChange(event.target.value)} required={required} maxLength={label === "Description" ? 1000 : 255} />
    </label>
  )
}

function ManualsSkeleton() {
  return <div className="space-y-6"><div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]"><Card><CardHeader><Skeleton className="h-5 w-36" /><Skeleton className="h-4 w-72" /></CardHeader><CardContent><Skeleton className="h-80 w-full sm:h-[30rem]" /></CardContent></Card><Card><CardHeader><Skeleton className="h-5 w-24" /><Skeleton className="h-4 w-36" /></CardHeader><CardContent className="space-y-3"><Skeleton className="h-8 w-full" /><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /></CardContent></Card></div><Card><CardContent className="space-y-4 py-6"><Skeleton className="h-5 w-48" /><Skeleton className="h-10 w-full" /></CardContent></Card></div>
}

function ErrorMessage({ message }: { message: string }) {
  return <div role="alert" className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"><AlertCircle className="mt-0.5 size-4 shrink-0" /><p>{message}</p></div>
}
