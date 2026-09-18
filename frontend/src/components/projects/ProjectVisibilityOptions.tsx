"use client"

interface ProjectVisibilityOptionsProps {
  unlisted: boolean
  disabled?: boolean
  onChange: (unlisted: boolean) => void
}

export default function ProjectVisibilityOptions({
  unlisted,
  disabled = false,
  onChange,
}: ProjectVisibilityOptionsProps) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">Visibility</legend>
      <p className="text-xs text-muted-foreground">
        Public projects can appear in discovery. Unlisted projects are accessible only by URL.
      </p>
      <div className="grid gap-3 pt-1 sm:grid-cols-2">
        <label className={`flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors ${!unlisted ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}>
          <input type="radio" name="visibility" checked={!unlisted} onChange={() => onChange(false)} disabled={disabled} className="mt-0.5" />
          <span>
            <span className="block text-sm font-medium">Public</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">Shown in search and discovery.</span>
          </span>
        </label>
        <label className={`flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors ${unlisted ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}>
          <input type="radio" name="visibility" checked={unlisted} onChange={() => onChange(true)} disabled={disabled} className="mt-0.5" />
          <span>
            <span className="block text-sm font-medium">Unlisted</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">Hidden from search; share the URL.</span>
          </span>
        </label>
      </div>
    </fieldset>
  )
}
