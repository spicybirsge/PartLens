"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { SiGithub } from "@icons-pack/react-simple-icons"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

export default function Navbar() {
  const pathname = usePathname()

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <img
            src="/logo_partlens.png"
            alt="PartLens logo"
            className="h-8 w-8 object-contain"
          />
          <span className="text-lg font-semibold tracking-tight">
            PartLens
          </span>
        </Link>

        <div className="flex items-center gap-1">
          <Link href="/">
            <Button
              variant={pathname === "/" ? "secondary" : "ghost"}
              size="sm"
              className="mr-1"
            >
              Home
            </Button>
          </Link>
          <Link href="/about">
            <Button
              variant={pathname.toLowerCase() === "/about" ? "secondary" : "ghost"}
              size="sm"
              className="mr-1"
            >
              About
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
        </div>
      </div>
    </nav>
  )
}
