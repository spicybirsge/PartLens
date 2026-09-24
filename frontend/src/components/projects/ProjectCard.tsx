"use client"

import type { ReactNode } from "react"
import { Box, UploadCloud } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getProjectColor, timeAgo } from "@/lib/projects"

export type ProjectCardProject = {
  publicId: string
  name: string
  description?: string | null
  unlisted: boolean
  updatedAt: string
  savedAt?: string
  glbFileUrl?: string | null
  parts?: number
  views?: number
}

type ProjectCardProps = {
  project: ProjectCardProject
  onOpen?: () => void
  action?: ReactNode
}

export default function ProjectCard({ project, onOpen, action }: ProjectCardProps) {
  const hasCounts = project.parts !== undefined || project.views !== undefined

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
          <div className="flex shrink-0 items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                project.unlisted
                  ? "bg-muted text-muted-foreground"
                  : "bg-emerald-500/10 text-emerald-600"
              }`}
            >
              {project.unlisted ? "Unlisted" : "Public"}
            </span>
            {action ? (
              <span onClick={(e) => e.stopPropagation()}>{action}</span>
            ) : null}
          </div>
        </div>
        <CardTitle className="pt-2 truncate" title={project.name}>
          {project.name}
        </CardTitle>
        <CardDescription className="truncate">
          {project.savedAt
            ? `Saved ${timeAgo(project.savedAt)}`
            : `Modified ${timeAgo(project.updatedAt)}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="min-w-0 text-xs text-muted-foreground">
        {hasCounts ? (
          <div className="flex items-center gap-4">
            {project.parts !== undefined && <span>{project.parts} parts</span>}
            {project.views !== undefined && <span>{project.views} views</span>}
            {project.glbFileUrl && (
              <span className="ml-auto inline-flex items-center gap-1">
                <UploadCloud className="size-3.5" />
                GLB
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-start gap-2">
            <p className="min-w-0 flex-1 truncate">
              {project.description?.trim() || "No description provided."}
            </p>
            {project.glbFileUrl && (
              <span className="inline-flex shrink-0 items-center gap-1">
                <UploadCloud className="size-3.5" />
                GLB
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
