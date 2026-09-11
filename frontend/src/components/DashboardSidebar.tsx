"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  BarChart3,
  BookOpen,
  ChevronUp,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Search,
  Settings,
  SlidersHorizontal,
} from "lucide-react"
import { useMemo, useState } from "react"

import { userStore } from "@/store/store"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  useSidebar,
} from "@/components/ui/sidebar"

const navigation = [
  { label: "Overview", href: "/", icon: LayoutDashboard },
  { label: "My machines", href: "/machines", icon: FolderKanban },
  { label: "Bookmarks", href: "/bookmarks", icon: BookOpen },
  { label: "Discover", href: "/search", icon: Search },
]

function UserMenu() {
  const { user, logout } = userStore()
  const router = useRouter()
  const { isMobile } = useSidebar()

  const initials = useMemo(
    () =>
      (user?.name || user?.username || "U")
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    [user?.name, user?.username]
  )

  const handleLogout = async () => {
    await logout()
    router.push("/login")
  }

  if (!user) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <SidebarMenuButton
            size="lg"
            className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
            tooltip={`${user.name} account`}
          />
        }
      >
        <Avatar size="sm">
          <AvatarImage src={user.avatarURL || undefined} alt={user.name} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <span className="grid flex-1 text-left text-sm leading-tight">
          <span className="truncate font-medium">{user.name}</span>
          <span className="truncate text-xs text-sidebar-foreground/65">
            @{user.username}
          </span>
        </span>
        <ChevronUp className="ml-auto" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="min-w-56 rounded-lg"
        side={isMobile ? "bottom" : "right"}
        align="end"
        sideOffset={4}
      >
        <DropdownMenuLabel className="font-normal">
          <div className="flex items-center gap-2">
            <Avatar size="sm">
              <AvatarImage src={user.avatarURL || undefined} alt={user.name} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="grid min-w-0">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-xs text-muted-foreground">
                {user.email}
              </span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/account/settings" />}>
          <Settings />
          Account settings
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={handleLogout}>
          <LogOut />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

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
                render={<Link href="/analytics" />}
                isActive={pathname.startsWith("/analytics")}
                tooltip="Analytics"
              >
                <BarChart3 />
                <span>Analytics</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                render={<Link href="/settings" />}
                isActive={pathname.startsWith("/settings")}
                tooltip="Settings"
              >
                <SlidersHorizontal />
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
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <SlidersHorizontal className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
              <span className="font-semibold">PartLens</span>
              <span className="text-xs text-sidebar-foreground/65">
                Machine workspace
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
      {children}
    </SidebarProvider>
  )
}
