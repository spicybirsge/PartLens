"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { SiGithub } from "@icons-pack/react-simple-icons"
import { FileText, Shield } from "lucide-react"
import { Menu, Scale, X } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function Navbar() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <img
            src="/favicon-96x96.png"
            alt="PartLens logo"
            className="h-8 w-8 object-contain"
          />
          <span className="text-lg font-semibold tracking-tight">
            PartLens
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          <Link href="/about">
            <Button
              variant={pathname.toLowerCase() === "/about" ? "secondary" : "ghost"}
              size="sm"
              className="mr-1"
            >
              About
            </Button>
          </Link>

          <Link href="/login">
            <Button
              variant="default"
              size="sm"
              className="mr-1 shadow-sm"
            >
              Sign Up
            </Button>
          </Link>
          <Separator orientation="vertical" className="mx-1 h-6" />
          <a
            href="https://github.com/spicybirsge/PartLens"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="PartLens GitHub repository"
          >
            <Button variant="ghost" size="icon-sm">
              <SiGithub size={18} />
              <span className="sr-only">GitHub</span>
            </Button>
          </a>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon-sm" aria-label="Legal">
                  <Scale className="h-4 w-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-max">
              <DropdownMenuItem render={<Link href="/terms" />}>
                <FileText></FileText>Terms of Service
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/privacy" />}>
                <Shield></Shield>Privacy Policy
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X /> : <Menu />}
        </Button>

        {menuOpen && (
          <div
            id="mobile-navigation"
            className="absolute inset-x-4 top-[calc(100%+0.5rem)] flex flex-col gap-2 rounded-xl border bg-background p-2 shadow-lg md:hidden"
          >
            <Link href="/about" onClick={() => setMenuOpen(false)}>
              <Button
                variant={pathname.toLowerCase() === "/about" ? "secondary" : "ghost"}
                className="w-full justify-start"
              >
                About
              </Button>
            </Link>
            <Link href="/login" onClick={() => setMenuOpen(false)}>
              <Button variant="default" className="w-full justify-start shadow-sm">
                Sign Up
              </Button>
            </Link>
            <Separator />
            <a
              href="https://github.com/spicybirsge/PartLens"
              target="_blank"
              rel="noopener noreferrer"
              className="block"
              onClick={() => setMenuOpen(false)}
            >
              <Button variant="ghost" className="w-full justify-start gap-2">
                <SiGithub size={18} />
                GitHub
              </Button>
            </a>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" className="w-full justify-start gap-2">
                    <Scale className="h-4 w-4" />
                    Legal
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-max">
                <DropdownMenuItem render={<Link href="/terms" />}>
                  <FileText></FileText>Terms of Service
                </DropdownMenuItem>
                <DropdownMenuItem render={<Link href="/privacy" />}>
                  <Shield></Shield>Privacy Policy
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </nav>
  )
}
