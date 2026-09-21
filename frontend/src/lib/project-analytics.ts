export type ProjectAnalytics = {
  project: {
    name: string
    publicId: string
  }
  uniqueViewers: number
  viewersToday: number
  viewersThisWeek: number
  viewersThisMonth: number
  recentlyViewed: string[]
}

export function isProjectAnalytics(value: unknown): value is ProjectAnalytics {
  if (!value || typeof value !== "object") return false
  const data = value as Partial<ProjectAnalytics>
  return (
    !!data.project &&
    typeof data.project === "object" &&
    typeof data.project.name === "string" &&
    typeof data.project.publicId === "string" &&
    typeof data.uniqueViewers === "number" &&
    typeof data.viewersToday === "number" &&
    typeof data.viewersThisWeek === "number" &&
    typeof data.viewersThisMonth === "number" &&
    Array.isArray(data.recentlyViewed) &&
    data.recentlyViewed.every((date) => typeof date === "string")
  )
}

export function formatViewedAt(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Unknown time"
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}
