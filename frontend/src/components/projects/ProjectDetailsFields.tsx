"use client"

import { Input } from "@/components/ui/input"

interface TextFieldProps {
  value: string
  error?: string
  disabled: boolean
  onChange: (value: string) => void
  onErrorChange: (error?: string) => void
}

export function ProjectNameField({ value, error, disabled, onChange, onErrorChange }: TextFieldProps) {
  const handleBlur = () => {
    const trimmedValue = value.trim()
    onErrorChange(
      !trimmedValue
        ? "Enter a project name."
        : trimmedValue.length > 255
          ? "Project names can be at most 255 characters."
          : undefined,
    )
  }

  return (
    <div className="space-y-2">
      <label htmlFor="project-name" className="text-sm font-medium">
        Project name <span className="text-destructive">*</span>
      </label>
      <Input
        id="project-name"
        value={value}
        maxLength={255}
        placeholder="e.g. Hydraulic Press 220"
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby="project-name-help project-name-error"
        onChange={(event) => {
          onChange(event.target.value)
          if (error) onErrorChange()
        }}
        onBlur={handleBlur}
      />
      <div className="flex justify-between gap-3 text-xs text-muted-foreground">
        <span id="project-name-help">Required, up to 255 characters.</span>
        <span>{value.length}/255</span>
      </div>
      {error && <p id="project-name-error" className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

export function ProjectDescriptionField({ value, error, disabled, onChange, onErrorChange }: TextFieldProps) {
  const handleBlur = () => {
    onErrorChange(value.trim().length > 1000 ? "Descriptions can be at most 1,000 characters." : undefined)
  }

  return (
    <div className="space-y-2">
      <label htmlFor="project-description" className="text-sm font-medium">
        Description <span className="font-normal text-muted-foreground">(optional)</span>
      </label>
      <textarea
        id="project-description"
        value={value}
        maxLength={1000}
        placeholder="What is this project and what documentation will it contain?"
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby="project-description-help project-description-error"
        onChange={(event) => {
          onChange(event.target.value)
          if (error) onErrorChange()
        }}
        onBlur={handleBlur}
        className="min-h-28 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20"
      />
      <div className="flex justify-between gap-3 text-xs text-muted-foreground">
        <span id="project-description-help">Optional, up to 1,000 characters.</span>
        <span>{value.length}/1000</span>
      </div>
      {error && <p id="project-description-error" className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
