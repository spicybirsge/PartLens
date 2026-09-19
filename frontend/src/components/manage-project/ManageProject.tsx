"use client"

import { useEffect, useRef, useState } from "react"
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import ManageProjectSidebar from "../ManageProjectSidebar"
import PageLoading from "../PageLoading"
import { SidebarTrigger } from "../ui/sidebar"
import { Separator } from "../ui/separator"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Skeleton } from "../ui/skeleton"
import { toast } from "../ui/toast"
import GlbFileField from "@/components/projects/GlbFileField"
import GlbPreview from "@/components/3d/GlbPreview"
import { ProjectDescriptionField, ProjectNameField } from "@/components/projects/ProjectDetailsFields"
import ProjectVisibilityOptions from "@/components/projects/ProjectVisibilityOptions"
import { getApiErrorMessage, getGlbFileError, readJsonResponse } from "@/lib/project-form"
import { userStore } from "@/store/store"
import vars from "@/vars/vars"

type FieldErrors = { name?: string; description?: string; file?: string }
type ApiRecord = Record<string, unknown>
type ProjectDetails = {
  name: string
  description: string | null
  glbFileUrl: string
  unlisted: boolean
}

function getFieldErrors(name: string, description: string, file: File | null, hasExistingModel: boolean) {
  const errors: FieldErrors = {}
  const trimmedName = name.trim()
  if (!trimmedName) errors.name = "Enter a project name."
  else if (trimmedName.length > 255) errors.name = "Project names can be at most 255 characters."
  if (description.trim().length > 1000) errors.description = "Descriptions can be at most 1,000 characters."
  const fileError = file ? getGlbFileError(file) : undefined
  if (fileError) errors.file = fileError
  if (!file && !hasExistingModel) errors.file = "A GLB model is required."
  return errors
}

function getDisplayProjectName(name: string) {
  const trimmedName = name.trim()
  return trimmedName.length > 80 ? `${trimmedName.slice(0, 77)}...` : trimmedName
}

export default function ManageProject({ id }: { id: string }) {
  const router = useRouter()
  const { user, loaded, checkIfLoggedIn } = userStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [project, setProject] = useState<ProjectDetails | null>(null)
  const [loadingProject, setLoadingProject] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [unlisted, setUnlisted] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [existingPreviewError, setExistingPreviewError] = useState<string | null>(null)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deletePhrase, setDeletePhrase] = useState("")
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!loaded) checkIfLoggedIn()
    else if (!user) router.push("/login", { scroll: false })
  }, [loaded, user, checkIfLoggedIn, router])

  useEffect(() => {
    if (!user) return
    const controller = new AbortController()
    const fetchProject = async () => {
      setLoadingProject(true)
      setLoadError(null)
      const token = window.localStorage.getItem("token")
      if (!token) {
        setLoadError("Your session has expired. Please sign in again.")
        setLoadingProject(false)
        return
      }
      try {
        const response = await fetch(`${vars.BACKEND_URL}/api/v1/read/project/${id}/details`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        })
        const payload = await readJsonResponse(response)
        if (!response.ok) throw new Error(getApiErrorMessage(payload, "Unable to load this project."))
        const data = (payload as ApiRecord | null)?.data
        if (!data || typeof data !== "object") throw new Error("The project details were missing from the response.")
        const details = data as ApiRecord
        const nextProject: ProjectDetails = {
          name: typeof details.name === "string" ? details.name : "",
          description: typeof details.description === "string" ? details.description : null,
          glbFileUrl: typeof details.glbFileUrl === "string" ? details.glbFileUrl : "",
          unlisted: details.unlisted === true,
        }
        setProject(nextProject)
        setName(nextProject.name)
        setDescription(nextProject.description ?? "")
        setUnlisted(nextProject.unlisted)
        document.title = nextProject.name.trim()
          ? `Project Details — ${nextProject.name.trim()} | PartLens`
          : "Project Details | PartLens"
      } catch (error) {
        if (!controller.signal.aborted) setLoadError(error instanceof Error ? error.message : "Unable to load this project.")
      } finally {
        if (!controller.signal.aborted) setLoadingProject(false)
      }
    }
    fetchProject()
    return () => controller.abort()
  }, [id, user])

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null
    const fileError = nextFile ? getGlbFileError(nextFile) : undefined
    setErrors((current) => ({ ...current, file: fileError }))
    setPreviewError(null)
    if (fileError || !nextFile) {
      setFile(null)
      setPreviewUrl(null)
      event.target.value = ""
      return
    }
    setFile(nextFile)
    setPreviewUrl(URL.createObjectURL(nextFile))
  }

  const removeFile = () => {
    setFile(null)
    setPreviewUrl(null)
    setPreviewError(null)
    setErrors((current) => ({ ...current, file: undefined }))
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const validate = () => {
    const nextErrors = getFieldErrors(name, description, file, Boolean(project?.glbFileUrl))
    setErrors(nextErrors)
    const firstInvalid = Object.keys(nextErrors)[0] as keyof FieldErrors | undefined
    if (firstInvalid) {
      const ids = { name: "project-name", description: "project-description", file: "glb-file" }
      window.requestAnimationFrame(() => document.getElementById(ids[firstInvalid])?.focus())
    }
    return !firstInvalid
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)
    if (!validate() || !project) return
    const token = window.localStorage.getItem("token")
    if (!token) {
      setFormError("Your session has expired. Please sign in again.")
      return
    }
    try {
      setSubmitting(true)
      let fileUrl: string | undefined
      if (file) {
        const uploadData = new FormData()
        uploadData.append("file", file)
        const uploadResponse = await fetch(`${vars.BACKEND_URL}/api/v1/upload/glb`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: uploadData,
        })
        const uploadPayload = await readJsonResponse(uploadResponse)
        if (!uploadResponse.ok) throw new Error(getApiErrorMessage(uploadPayload, "Unable to upload the GLB model."))
        const data = (uploadPayload as ApiRecord | null)?.data
        fileUrl = data && typeof data === "object" && typeof (data as ApiRecord).url === "string"
          ? (data as ApiRecord).url as string
          : undefined
        if (!fileUrl) throw new Error("The upload did not return a model URL. Please try again.")
      }
      const response = await fetch(`${vars.BACKEND_URL}/api/v1/update/project/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          unlisted,
          ...(fileUrl ? { file_url: fileUrl } : {}),
        }),
      })
      const payload = await readJsonResponse(response)
      if (!response.ok) throw new Error(getApiErrorMessage(payload, "Unable to update the project."))
      if (fileUrl) setProject((current) => current ? { ...current, glbFileUrl: fileUrl as string } : current)
      setFile(null)
      setPreviewUrl(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
      toast.add({ type: "success", title: "Project updated", description: "Your project details are up to date." })
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Something went wrong. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (deletePhrase !== "DELETE PROJECT") return

    const token = window.localStorage.getItem("token")
    if (!token) {
      setDeleteError("Your session has expired. Please sign in again.")
      return
    }

    try {
      setDeleting(true)
      setDeleteError(null)
      const response = await fetch(`${vars.BACKEND_URL}/api/v1/delete/project/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      const payload = await readJsonResponse(response)
      if (!response.ok) throw new Error(getApiErrorMessage(payload, "Unable to delete the project."))
      toast.add({ type: "success", title: "Project deleted", description: "The project was permanently deleted." })
      router.push("/")
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Unable to delete the project.")
      setDeleting(false)
    }
  }

  if (!loaded || !user) return <PageLoading />

  return (
    <ManageProjectSidebar projectId={id}>
      <main className="min-w-0 flex-1 bg-muted/30">
        <div className="mx-auto min-h-svh w-full max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
          <div className="flex items-center gap-3">
            <SidebarTrigger variant="outline" size="icon" aria-label="Toggle navigation" />
            <div>
              <p className="text-sm text-muted-foreground">Manage your projects general details here</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">Project Details</h1>
              {!loadingProject && project && (
                <p className="mt-1 max-w-[min(32rem,70vw)] truncate text-sm font-medium text-foreground/80" title={project.name}>
                  Editing: {getDisplayProjectName(project.name) || "Untitled project"}
                </p>
              )}
            </div>
          </div>
          <Separator className="my-6" />
          {loadingProject ? <ManageProjectSkeleton /> : loadError ? <FormError message={loadError} /> : (
            <>
              <form className="grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)]" onSubmit={handleSubmit} noValidate>
                <div className="contents lg:col-start-1 lg:row-start-1 lg:block">
                  <Card className="order-1 self-start">
                    <CardHeader>
                      <CardTitle>Project details</CardTitle>
                      <CardDescription>Update the information shown for this project.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <ProjectNameField value={name} error={errors.name} disabled={submitting} onChange={setName} onErrorChange={(error) => setErrors((current) => ({ ...current, name: error }))} />
                      <ProjectDescriptionField value={description} error={errors.description} disabled={submitting} onChange={setDescription} onErrorChange={(error) => setErrors((current) => ({ ...current, description: error }))} />
                      <ProjectVisibilityOptions unlisted={unlisted} disabled={submitting} onChange={setUnlisted} />
                    </CardContent>
                  </Card>
                  <Card className="order-3 mt-6 border-destructive/30">
                    <CardHeader>
                      <CardTitle className="text-destructive">Delete project</CardTitle>
                      <CardDescription>
                        This permanently deletes <span className="font-medium text-foreground" title={project?.name}>{getDisplayProjectName(project?.name ?? "") || "this project"}</span> and its associated data. This action cannot be undone.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <label htmlFor="delete-project-confirmation" className="text-sm font-medium">
                          Type <span className="font-mono text-destructive">DELETE PROJECT</span> to confirm
                        </label>
                        <Input
                          id="delete-project-confirmation"
                          value={deletePhrase}
                          onChange={(event) => setDeletePhrase(event.target.value)}
                          placeholder="DELETE PROJECT"
                          disabled={deleting}
                          aria-invalid={Boolean(deleteError)}
                        />
                      </div>
                      {deleteError && <FormError message={deleteError} />}
                      <Button type="button" variant="destructive" onClick={handleDelete} disabled={deletePhrase !== "DELETE PROJECT" || deleting}>
                        {deleting && <Loader2 className="animate-spin" />}
                        {deleting ? "Deleting project…" : "Delete project permanently"}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
                <div className="order-2 space-y-6 lg:col-start-2 lg:row-start-1">
                  <Card>
                    <CardHeader>
                      <CardTitle>3D model</CardTitle>
                      <CardDescription>Keep the current model or choose a replacement.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {project?.glbFileUrl && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Current model</p>
                          {existingPreviewError ? <p className="text-sm text-muted-foreground">{existingPreviewError}</p> : <GlbPreview url={project.glbFileUrl} onError={setExistingPreviewError} />}
                        </div>
                      )}
                      <div className="border-t pt-4">
                        <p className="mb-3 text-sm font-medium">Replace model</p>
                        <GlbFileField file={file} previewUrl={previewUrl} error={errors.file} previewError={previewError} disabled={submitting} inputRef={fileInputRef} onChange={handleFileChange} onRemove={removeFile} onPreviewError={setPreviewError} />
                      </div>
                    </CardContent>
                  </Card>
                  {formError && <FormError message={formError} />}
                  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <Button type="button" variant="outline" onClick={() => router.push("/")} disabled={submitting}>Cancel</Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
                      {submitting ? "Saving changes…" : "Save changes"}
                    </Button>
                  </div>
                </div>
              </form>
            </>
          )}
        </div>
      </main>
    </ManageProjectSidebar>
  )
}

function ManageProjectSkeleton() {
  return <div className="grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)]">
    <Card><CardHeader><Skeleton className="h-6 w-40" /><Skeleton className="h-4 w-64" /></CardHeader><CardContent className="space-y-5"><Skeleton className="h-10 w-full" /><Skeleton className="h-28 w-full" /><Skeleton className="h-24 w-full" /></CardContent></Card>
    <Card><CardHeader><Skeleton className="h-6 w-32" /><Skeleton className="h-4 w-56" /></CardHeader><CardContent><Skeleton className="h-72 w-full" /></CardContent></Card>
  </div>
}

function FormError({ message }: { message: string }) {
  return <div role="alert" className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"><AlertCircle className="mt-0.5 size-4 shrink-0" /><p>{message}</p></div>
}
