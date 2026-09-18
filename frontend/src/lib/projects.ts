// ── Types ──────────────────────────────────────────────────────────
export interface Project {
  id: string
  publicId: string
  name: string
  description: string | null
  glbFileUrl: string
  unlisted: boolean
  createdAt: string
  updatedAt: string
  parts: number
  views: number
}

export interface Stats {
  total_projects: number
  total_parts: number
  total_views: number
}

// ── Color palette & deterministic generator ────────────────────────
export const PROJECT_COLOR_PALETTE = [
  "bg-blue-500/10 text-blue-600",
  "bg-emerald-500/10 text-emerald-600",
  "bg-amber-500/10 text-amber-600",
  "bg-violet-500/10 text-violet-600",
  "bg-rose-500/10 text-rose-600",
  "bg-cyan-500/10 text-cyan-600",
  "bg-orange-500/10 text-orange-600",
  "bg-teal-500/10 text-teal-600",
] as const

export function getProjectColor(publicId: string): string {
  let hash = 0
  for (let i = 0; i < publicId.length; i++) {
    hash = (hash * 31 + publicId.charCodeAt(i)) | 0
  }
  return PROJECT_COLOR_PALETTE[Math.abs(hash) % PROJECT_COLOR_PALETTE.length]
}

// ── Relative time helper ───────────────────────────────────────────
export function timeAgo(dateString: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateString).getTime()) / 1000,
  )
  if (seconds < 60) return "Just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

