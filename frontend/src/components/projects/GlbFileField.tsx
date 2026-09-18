"use client"

import type { ChangeEventHandler, RefObject } from "react"
import { AlertCircle, FileBox, UploadCloud, X } from "lucide-react"
import GlbPreview from "@/components/3d/GlbPreview"
import { Button } from "@/components/ui/button"
import { formatFileSize } from "@/lib/project-form"

interface GlbFileFieldProps {
  file: File | null
  previewUrl: string | null
  error?: string
  previewError?: string | null
  disabled?: boolean
  inputRef: RefObject<HTMLInputElement | null>
  onChange: ChangeEventHandler<HTMLInputElement>
  onRemove: () => void
  onPreviewError: (message: string) => void
}

export default function GlbFileField({
  file,
  previewUrl,
  error,
  previewError,
  disabled = false,
  inputRef,
  onChange,
  onRemove,
  onPreviewError,
}: GlbFileFieldProps) {
  return (
    <div className="space-y-4">
      {!file ? (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <UploadCloud className="mx-auto size-8 text-muted-foreground" />
          <label htmlFor="glb-file" className="mt-3 inline-block cursor-pointer text-sm font-medium text-primary hover:underline">
            Choose a GLB file
          </label>
          <p className="mt-2 text-xs text-muted-foreground">GLB only, up to 25 MB.</p>
          <input
            ref={inputRef}
            id="glb-file"
            type="file"
            accept=".glb,model/gltf-binary,application/octet-stream"
            onChange={onChange}
            className="sr-only"
            disabled={disabled}
            aria-invalid={Boolean(error)}
          />
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
            <FileBox className="size-8 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">{formatFileSize(file.size)} · GLB model</p>
            </div>
            <Button type="button" variant="ghost" size="icon-sm" onClick={onRemove} disabled={disabled} aria-label="Remove selected GLB file">
              <X />
            </Button>
          </div>
          {previewUrl && !previewError && <GlbPreview key={previewUrl} url={previewUrl} onError={onPreviewError} />}
          {previewError && (
            <div className="flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-950 dark:text-amber-100">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <p>The file can still be uploaded, but its local preview could not be displayed.</p>
            </div>
          )}
        </>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
