"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BookOpen,
  LayoutDashboard,
  Search,
  Settings
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

const navigation = [
  { label: "Home", href: "/", icon: LayoutDashboard },
  { label: "Bookmarks", href: "/bookmarks", icon: BookOpen },
  { label: "Discover", href: "/search", icon: Search },
]

function SidebarNavigation() {
  const pathname = usePathname()

  return (
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>Workspace</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {navigation.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  render={<Link href={item.href} />}
                  isActive={
                    item.href === "/"
                      ? pathname === "/"
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
      <SidebarGroup className="mt-auto">
        <SidebarGroupLabel>Manage</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                render={<Link href="/settings" />}
                isActive={pathname.startsWith("/settings")}
                tooltip="Settings"
              >
                <Settings />
                <span>Settings</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  )
}

export default function DashboardSidebar({
  children,
}: {
  children: React.ReactNode
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
                Project workspace
              </span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarNavigation />
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
