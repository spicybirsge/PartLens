"use client"

import { Box, Eye } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getProjectColor, timeAgo } from "@/lib/projects"

export type PublicProjectCardProject = {
  publicId: string
  name: string
  description?: string | null
  createdAt: string
  views?: number
  parts?: number
}

type PublicProjectCardProps = {
  project: PublicProjectCardProject
  onOpen?: () => void
}

/**
 * Reusable card for rendering public projects in discovery surfaces
 * (user profiles, search, landing page, ...).
 */
export default function PublicProjectCard({
  project,
  onOpen,
}: PublicProjectCardProps) {
  const description = project.description?.trim() || "No description"

  return (
    <Card
      onClick={onOpen}
      className={
        onOpen
          ? "h-full min-w-0 cursor-pointer overflow-hidden transition-shadow hover:shadow-md"
          : "h-full min-w-0 overflow-hidden"
      }
    >
      <CardHeader className="min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div
            className={`flex size-10 items-center justify-center rounded-lg shrink-0 ${getProjectColor(project.publicId)}`}
          >
            <Box className="size-5" />
          </div>
        </div>
        <CardTitle className="pt-2 truncate" title={project.name}>
          {project.name}
        </CardTitle>
        <CardDescription className="truncate" title={description}>
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="min-w-0 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="shrink-0">Published {timeAgo(project.createdAt)}</span>
          {project.views !== undefined && (
            <span className="inline-flex shrink-0 items-center gap-1">
              <Eye className="size-3.5" />
              {project.views.toLocaleString()} view
              {project.views === 1 ? "" : "s"}
            </span>
          )}
          {project.parts !== undefined && (
            <span className="shrink-0">
              {project.parts.toLocaleString()} part
              {project.parts === 1 ? "" : "s"}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
