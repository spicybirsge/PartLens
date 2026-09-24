"use client"

import type { ReactNode } from "react"
import { Cog } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getProjectColor, timeAgo } from "@/lib/projects"

export type PartBookmarkPart = {
  id: string
  partNumber: string
  name: string
  description: string | null
  updatedAt: string
}

export type PartBookmarkProject = {
  id: string
  publicId: string
  name: string
}

type PartBookmarkCardProps = {
  part: PartBookmarkPart
  project: PartBookmarkProject
  savedAt?: string
  onOpen?: () => void
  action?: ReactNode
}

export default function PartBookmarkCard({
  part,
  project,
  savedAt,
  onOpen,
  action,
}: PartBookmarkCardProps) {
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
            <Cog className="size-5" />
          </div>
          {action ? (
            <span className="shrink-0" onClick={(e) => e.stopPropagation()}>
              {action}
            </span>
          ) : null}
        </div>
        <CardTitle className="pt-2 truncate font-mono" title={part.partNumber}>
          {part.partNumber}
        </CardTitle>
        <CardDescription className="truncate" title={part.name}>
          {part.name}
        </CardDescription>
      </CardHeader>
      <CardContent className="min-w-0 space-y-2 text-xs text-muted-foreground">
        <p className="min-w-0 truncate">
          {part.description?.trim() || "No description"}
        </p>
        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="min-w-0 truncate">
            in <span className="font-medium text-foreground">{project.name}</span>
          </span>
          {savedAt ? (
            <span className="shrink-0">Saved {timeAgo(savedAt)}</span>
          ) : (
            <span className="shrink-0">Modified {timeAgo(part.updatedAt)}</span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
