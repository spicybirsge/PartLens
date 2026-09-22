"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ArrowLeft,
  BarChart3,
  FileText,
  InfoIcon,
  ExternalLink
} from "lucide-react"
import { useState } from "react"

import UserMenu from "@/components/UserMenu"
import { Separator } from "@/components/ui/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
} from "@/components/ui/sidebar"

function SidebarNavigation({ projectId }: { projectId: string }) {
  const pathname = usePathname()
  const projectPath = `/manage/${projectId}`
  const navigation = [
    { label: "Details", href: projectPath, icon: InfoIcon },
    { label: "Manuals", href: `${projectPath}/manuals`, icon: FileText },
    { label: "Analytics", href: `${projectPath}/analytics`, icon: BarChart3 },
    {label: "Public page", href:`/project/${projectId}`, icon:ExternalLink}
  ]

  return (
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                render={<Link href="/" />}
                tooltip="Back to home"
              >
                <ArrowLeft />
                <span>Back to home</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
      <SidebarGroup>
        <SidebarGroupLabel>Project</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {navigation.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  render={<Link href={item.href} />}
                  isActive={
                    item.href === projectPath
                      ? pathname === projectPath
                      : pathname.startsWith(item.href)
                  }
                  tooltip={item.label}
                >
                  <item.icon />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  )
}

export default function DashboardSidebar({
  children,
  projectId,
}: {
  children: React.ReactNode
  projectId: string
}) {
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return true
    return window.localStorage.getItem("partlens-sidebar-state") !== "collapsed"
  })

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    window.localStorage.setItem(
      "partlens-sidebar-state",
      nextOpen ? "expanded" : "collapsed"
    )
  }

  return (
    <SidebarProvider open={open} onOpenChange={handleOpenChange}>
      <Sidebar collapsible="icon" variant="inset">
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-1">
            <img
              src="/logo_partlens.png"
              alt="PartLens logo"
              className="size-8 shrink-0 rounded-lg object-contain"
            />
            <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
              <span className="font-semibold">PartLens</span>
              <span className="text-xs text-sidebar-foreground/65">
                Project management
              </span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarNavigation projectId={projectId} />
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <UserMenu />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <Separator
        orientation="vertical"
        className="hidden self-stretch bg-sidebar-border md:block"
      />
      {children}
    </SidebarProvider>
  )
}
