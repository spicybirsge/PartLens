"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronUp, FileText, LogOut, User2, Shield, Info } from "lucide-react"
import { SiGithub } from "@icons-pack/react-simple-icons"
import { useMemo } from "react"

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
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar"

export default function UserMenu() {
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
          <AvatarImage src={user.avatarUrl || undefined} alt={user.name} />
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
              <AvatarImage src={user.avatarUrl || undefined} alt={user.name} />
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
         <DropdownMenuItem render={<Link href={`/user/${user.username}`}/>}>
          <User2 />
          View Profile
        </DropdownMenuItem>
        <DropdownMenuSub>
          
          <DropdownMenuSubTrigger>
            <Info />
            Learn more
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuLabel>Legal</DropdownMenuLabel>
            <DropdownMenuItem render={<Link href="/terms" />}>
              <FileText />
              Terms of Service
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/privacy" />}>
              <Shield />
              Privacy Policy
            </DropdownMenuItem>
  <DropdownMenuLabel>Contribute</DropdownMenuLabel>
             <DropdownMenuItem
          render={
            <a
              href="https://github.com/spicybirsge/PartLens"
              target="_blank"
              rel="noopener noreferrer"
            />
          }
        >
          <SiGithub />
          GitHub
        </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
       
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleLogout}>
          <LogOut />
          Log Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
