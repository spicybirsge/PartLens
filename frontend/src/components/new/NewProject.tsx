"use client"

import { useEffect, useRef, useState } from "react"
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import DashboardSidebar from "../DashboardSidebar"
import PageLoading from "../PageLoading"
import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Separator } from "../ui/separator"
import { toast } from "../ui/toast"
import { SidebarTrigger } from "@/components/ui/sidebar"
import GlbFileField from "@/components/projects/GlbFileField"
import { ProjectDescriptionField, ProjectNameField } from "@/components/projects/ProjectDetailsFields"
import ProjectVisibilityOptions from "@/components/projects/ProjectVisibilityOptions"
import {
  getApiErrorMessage,
  getGlbFileError,
  readJsonResponse,
} from "@/lib/project-form"
import { userStore } from "@/store/store"
import vars from "@/vars/vars"

type FieldErrors = {
  name?: string
  description?: string
  file?: string
}

type ApiRecord = Record<string, unknown>

function getProjectFieldsError(name: string, description: string, file: File | null) {
  const errors: FieldErrors = {}
  const trimmedName = name.trim()
  const trimmedDescription = description.trim()

  if (!trimmedName) errors.name = "Enter a project name."
  else if (trimmedName.length > 255) {
    errors.name = "Project names can be at most 255 characters."
  }

  if (trimmedDescription.length > 1000) {
    errors.description = "Descriptions can be at most 1,000 characters."
  }

  const fileError = getGlbFileError(file)
  if (fileError) errors.file = fileError

  return errors
}

export default function NewProject() {
  const router = useRouter()
  const { user, loaded, checkIfLoggedIn } = userStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [unlisted, setUnlisted] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submissionStage, setSubmissionStage] = useState<"idle" | "uploading" | "creating">("idle")

  useEffect(() => {
    if (!loaded) {
      checkIfLoggedIn()
    } else if (!user) {
      router.push("/login", { scroll: false })
    }
  }, [loaded, user, checkIfLoggedIn, router])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const isSubmitting = submissionStage !== "idle"

  const validate = () => {
    const nextErrors = getProjectFieldsError(name, description, file)
    const firstInvalidField = Object.keys(nextErrors)[0] as keyof FieldErrors | undefined

    setErrors(nextErrors)

    if (firstInvalidField) {
      const fieldIds: Record<keyof FieldErrors, string> = {
        name: "project-name",
        description: "project-description",
        file: "glb-file",
      }
      window.requestAnimationFrame(() => {
        document.getElementById(fieldIds[firstInvalidField])?.focus()
      })
    }

    return !firstInvalidField
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null
    const fileError = getGlbFileError(nextFile)

    setPreviewError(null)
    setErrors((current) => ({ ...current, file: fileError }))

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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)

    if (!validate() || !file) return

    const token = window.localStorage.getItem("token")
    if (!token) {
      setFormError("Your session has expired. Please sign in again.")
      return
    }

    try {
      setSubmissionStage("uploading")

      const uploadFormData = new FormData()
      uploadFormData.append("file", file)

      const uploadResponse = await fetch(`${vars.BACKEND_URL}/api/v1/upload/glb`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: uploadFormData,
      })
      const uploadPayload = await readJsonResponse(uploadResponse)

      if (!uploadResponse.ok) {
        throw new Error(getApiErrorMessage(uploadPayload, "Unable to upload the GLB model."))
      }

      const uploadData = (uploadPayload as ApiRecord | null)?.data
      const fileUrl = uploadData && typeof uploadData === "object"
        ? (uploadData as ApiRecord).url
        : undefined

      if (typeof fileUrl !== "string") {
        throw new Error("The upload did not return a model URL. Please try again.")
      }

      setSubmissionStage("creating")

      const createResponse = await fetch(`${vars.BACKEND_URL}/api/v1/create/project`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          file_url: fileUrl,
          unlisted,
        }),
      })
      const createPayload = await readJsonResponse(createResponse)

      if (!createResponse.ok) {
        throw new Error(getApiErrorMessage(createPayload, "Unable to create the project."))
      }

      const projectData = (createPayload as ApiRecord | null)?.data
      const publicId = projectData && typeof projectData === "object"
        ? (projectData as ApiRecord).publicId
        : undefined

      if (typeof publicId !== "string") {
        throw new Error("The project was created, but its public ID was missing.")
      }

      toast.add({
        type: "success",
        title: "Project created",
        description: "Your model is ready for documentation.",
      })
      router.push(`/manage/${publicId}`)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Something went wrong. Please try again.")
      setSubmissionStage("idle")
    }
  }

  if (!loaded || !user) { 
    return <PageLoading />

}

  return (
    <DashboardSidebar>
      <main className="min-w-0 flex-1 bg-muted/30">
        <div className="mx-auto min-h-svh w-full max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger variant="outline" size="icon" aria-label="Toggle navigation" />
              <div>
                <p className="text-sm text-muted-foreground">Add a model and begin documenting its parts</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight">New Project</h1>
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          <form
            className="grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)]"
            onSubmit={handleSubmit}
            noValidate
          >
            <Card>
              <CardHeader>
                <CardTitle>Project details</CardTitle>
                <CardDescription>Use a clear name so your project is easy to find later.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <ProjectNameField
                  value={name}
                  error={errors.name}
                  disabled={isSubmitting}
                  onChange={setName}
                  onErrorChange={(error) => setErrors((current) => ({ ...current, name: error }))}
                />
                <ProjectDescriptionField
                  value={description}
                  error={errors.description}
                  disabled={isSubmitting}
                  onChange={setDescription}
                  onErrorChange={(error) => setErrors((current) => ({ ...current, description: error }))}
                />
                <ProjectVisibilityOptions unlisted={unlisted} disabled={isSubmitting} onChange={setUnlisted} />
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>3D model</CardTitle>
                  <CardDescription>Upload the GLB model whose object names identify its parts.</CardDescription>
                </CardHeader>
                <CardContent>
                  <GlbFileField
                    file={file}
                    previewUrl={previewUrl}
                    error={errors.file}
                    previewError={previewError}
                    disabled={isSubmitting}
                    inputRef={fileInputRef}
                    onChange={handleFileChange}
                    onRemove={removeFile}
                    onPreviewError={setPreviewError}
                  />
                </CardContent>
              </Card>

              {formError && <FormError message={formError} />}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={() => router.push("/")} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
                  {submissionStage === "uploading"
                    ? "Uploading model…"
                    : submissionStage === "creating"
                      ? "Creating project…"
                      : "Create project"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </main>
    </DashboardSidebar>
  )
}

function FormError({ message }: { message: string }) {
  return (
    <div role="alert" className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <p>{message}</p>
    </div>
  )
}
