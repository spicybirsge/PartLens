'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Check, ImagePlus, LogOut, Monitor, RefreshCw, Sun, Moon, Laptop, Loader2, Trash2 } from "lucide-react"
import { useTheme } from "next-themes"
import DashboardSidebar from "../DashboardSidebar"
import PageLoading from "../PageLoading"
import { userStore } from "@/store/store"
import vars from "@/vars/vars"
import { Separator } from "../ui/separator"
import { SidebarTrigger } from "../ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Input } from "../ui/input"
import { Button } from "../ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "../ui/dialog"
import { toast } from "../ui/toast"

interface Session {
    id: string
    ipAddress: string | null
    userAgent: string | null
    createdAt: string
    lastActive: string | null
    expiresAt: string
    current: boolean
}

type Confirmation = "logout" | "logoutOthers" | null

export default function SettingsPage() {

    const router = useRouter()
    const { user, loaded, checkIfLoggedIn, setUser, logout } = userStore()
    const { theme, setTheme } = useTheme()
    const [isSaving, setIsSaving] = useState(false)
    const [name, setName] = useState("")
    const [username, setUsername] = useState("")
    const [fieldErrors, setFieldErrors] = useState<{ name?: string; username?: string }>({})
    const [sessions, setSessions] = useState<Session[]>([])
    const [sessionsLoading, setSessionsLoading] = useState(false)
    const [sessionsError, setSessionsError] = useState<string | null>(null)
    const [isLoggingOutOthers, setIsLoggingOutOthers] = useState(false)
    const [confirmation, setConfirmation] = useState<Confirmation>(null)
    const [selectedImage, setSelectedImage] = useState<string | null>(null)
    const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
    const [removeImage, setRemoveImage] = useState(false)
    const [cropOpen, setCropOpen] = useState(false)
    const [cropZoom, setCropZoom] = useState(1)
    const [cropX, setCropX] = useState(50)
    const [cropY, setCropY] = useState(50)
    const imageInputRef = useRef<HTMLInputElement>(null)
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null


    useEffect(() => {
        if (!loaded) {
            checkIfLoggedIn()
        } else if (!user) {
            router.push("/login", { scroll: false })
        }
    }, [loaded, user, checkIfLoggedIn, router])

    useEffect(() => {
        if (user) {
            const timeoutId = window.setTimeout(() => {
                setName(user.name)
                setUsername(user.username)
            }, 0)
            return () => window.clearTimeout(timeoutId)
        }
    }, [user])

    const showToast = (title: string, description: string, type: "success" | "error") => {
        toast.add({ title, description, type })
    }

    const initials = useMemo(
        () => (user?.name || user?.username || "U")
            .split(" ")
            .map((part) => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase(),
        [user?.name, user?.username]
    )

    const fetchSessions = async () => {
        const currentToken = localStorage.getItem("token")
        if (!currentToken) return

        setSessionsLoading(true)
        setSessionsError(null)
        try {
            const response = await fetch(`${vars.BACKEND_URL}/api/v1/auth/sessions`, {
                headers: { Authorization: `Bearer ${currentToken}` },
            })
            const data = await response.json()
            if (!response.ok || !data.success) {
                throw new Error(data.message || "Could not load active sessions")
            }
            setSessions(data.sessions)
        } catch (error) {
            setSessionsError(error instanceof Error ? error.message : "Could not load active sessions")
        } finally {
            setSessionsLoading(false)
        }
    }

    useEffect(() => {
        if (user && token) {
            const timeoutId = window.setTimeout(() => {
                void fetchSessions()
            }, 0)
            return () => window.clearTimeout(timeoutId)
        }
    }, [user, token])

    const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const currentToken = localStorage.getItem("token")
        if (!currentToken) return

        const nextName = name.trim()
        const nextUsername = username.trim()
        const errors: { name?: string; username?: string } = {}
        if (!nextName) errors.name = "Display name is required."
        if (!nextUsername) errors.username = "Username is required."
        setFieldErrors(errors)
        if (Object.keys(errors).length > 0) {
          
            return;
        }
        setIsSaving(true)
        try {
            let avatarUrl: string | undefined
            if (selectedImageFile) {
                const uploadData = new FormData()
                uploadData.append("file", selectedImageFile)
                const uploadResponse = await fetch(`${vars.BACKEND_URL}/api/v1/upload/image`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${currentToken}` },
                    body: uploadData,
                })
                const uploaded = await uploadResponse.json()
                if (!uploadResponse.ok || !uploaded.success || !uploaded.data?.url) {
                    throw new Error(uploaded.message || "Could not upload your profile image")
                }
                avatarUrl = uploaded.data.url
            }

            const response = await fetch(`${vars.BACKEND_URL}/api/v1/update/user`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${currentToken}`,
                },
                body: JSON.stringify({
                    name: nextName,
                    username: nextUsername,
                    ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
                    ...(removeImage && !avatarUrl ? { avatar_url: null } : {}),
                }),
            })
            const data = await response.json()
            if (!response.ok || !data.success) {
                throw new Error(data.message || "Could not update your profile")
            }
            setUser(data.data)
            setSelectedImageFile(null)
            setSelectedImage(null)
            setRemoveImage(false)
            showToast("Profile updated", "Your profile details have been saved.", "success")
        } catch (error) {
            showToast("Profile update failed", error instanceof Error ? error.message : "Could not update your profile", "error")
        } finally {
            setIsSaving(false)
        }
    }

    const handleLogoutOthers = async () => {
        const currentToken = localStorage.getItem("token")
        if (!currentToken) return

        setIsLoggingOutOthers(true)
        setSessionsError(null)
        try {
            const response = await fetch(`${vars.BACKEND_URL}/api/v1/auth/logout-all`, {
                method: "POST",
                headers: { Authorization: `Bearer ${currentToken}` },
            })
            const data = await response.json()
            if (!response.ok || !data.success) {
                throw new Error(data.message || "Could not terminate other sessions")
            }
            await fetchSessions()
            showToast("Sessions cleared", "All other active sessions have been logged out.", "success")
        } catch (error) {
            setSessionsError(error instanceof Error ? error.message : "Could not terminate other sessions")
            showToast("Could not log out other sessions", error instanceof Error ? error.message : "Please try again.", "error")
        } finally {
            setIsLoggingOutOthers(false)
        }
    }

    const handleLogout = async () => {
        await logout()
        router.push("/login")
    }

    const handleConfirmation = async () => {
        const action = confirmation
        setConfirmation(null)
        if (action === "logout") await handleLogout()
        if (action === "logoutOthers") await handleLogoutOthers()
    }

    const handleImageSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return
        const objectUrl = URL.createObjectURL(file)
        setSelectedImageFile(file)
        setSelectedImage(objectUrl)
        setRemoveImage(false)
        setCropOpen(true)
        setCropZoom(1)
        setCropX(50)
        setCropY(50)
    }

    const cancelImageSelection = () => {
        if (selectedImage) URL.revokeObjectURL(selectedImage)
        setSelectedImage(null)
        setSelectedImageFile(null)
        setCropOpen(false)
        if (imageInputRef.current) imageInputRef.current.value = ""
    }

    const handleRemoveImage = () => {
        cancelImageSelection()
        setRemoveImage(true)
    }

    const createCroppedImage = async () => {
        if (!selectedImage) return
        const image = new window.Image()
        image.src = selectedImage
        await new Promise<void>((resolve, reject) => {
            image.onload = () => resolve()
            image.onerror = () => reject(new Error("Could not read selected image"))
        })

        const size = Math.min(image.naturalWidth, image.naturalHeight) / cropZoom
        const maxX = image.naturalWidth - size
        const maxY = image.naturalHeight - size
        const canvas = document.createElement("canvas")
        canvas.width = 512
        canvas.height = 512
        const context = canvas.getContext("2d")
        if (!context) throw new Error("Could not prepare image crop")
        context.drawImage(
            image,
            (maxX * cropX) / 100,
            (maxY * cropY) / 100,
            size,
            size,
            0,
            0,
            512,
            512,
        )
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9))
        if (!blob) throw new Error("Could not create cropped image")
        setSelectedImageFile(new File([blob], "profile-image.jpg", { type: "image/jpeg" }))
        setSelectedImage(URL.createObjectURL(blob))
        setCropOpen(false)
    }

    const describeUserAgent = (userAgent: string | null) => {
        if (!userAgent || userAgent === "unknown") return "Unknown device"
        const browser = /Edg\/[\d.]+/.test(userAgent)
            ? "Microsoft Edge"
            : /Chrome\/[\d.]+/.test(userAgent)
                ? "Google Chrome"
                : /Firefox\/[\d.]+/.test(userAgent)
                    ? "Mozilla Firefox"
                    : /Safari\/[\d.]+/.test(userAgent) && !/Chrome/.test(userAgent)
                        ? "Safari"
                        : "Web browser"
        const operatingSystem = /Windows/i.test(userAgent)
            ? "Windows"
            : /Mac OS|Macintosh/i.test(userAgent)
                ? "macOS"
                : /Android/i.test(userAgent)
                    ? "Android"
                    : /iPhone|iPad/i.test(userAgent)
                        ? "iOS"
                        : /Linux/i.test(userAgent)
                            ? "Linux"
                            : "Unknown device"
        return `${browser} on ${operatingSystem}`
    }
    const formatDate = (date: string | null) => {
        if (!date) return "Never"
        return new Intl.DateTimeFormat(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
        }).format(new Date(date))
    }

    if (!loaded || !user) {
        return <PageLoading />

    }


    return (<>
        <DashboardSidebar>
        <main className="min-w-0 flex-1 bg-muted/30">
            <div className="mx-auto min-h-svh w-full max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <SidebarTrigger variant="outline" size="icon" aria-label="Toggle navigation" />
                        <div>
                            <p className="text-sm text-muted-foreground">Manage your dashboard settings and account details</p>
                            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Settings</h1>
                        </div>
                    </div>
                </div>

                <Separator className="my-6" />

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
                    <Card>
                        <CardHeader>
                            <CardTitle>Profile</CardTitle>
                            <CardDescription>Update the details shown on your PartLens account.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form className="space-y-5" onSubmit={handleProfileSubmit}>
                                <div className="flex items-center gap-4 rounded-lg border bg-muted/30 p-4">
                                    <Avatar size="lg">
                                        <AvatarImage src={selectedImage || user.avatarUrl || undefined} alt={user.name} />
                                        <AvatarFallback>{initials}</AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                        <p className="font-medium">{user.email}</p>
                                        <p className="text-sm text-muted-foreground">Your email address is managed by Google.</p>
                                    </div>
                                    <div className="ml-auto flex shrink-0 flex-col gap-2 sm:flex-row">
                                        <input
                                            ref={imageInputRef}
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp,image/gif"
                                            className="hidden"
                                            onChange={handleImageSelected}
                                        />
                                        <Button type="button" variant="outline" size="sm" onClick={() => imageInputRef.current?.click()}>
                                            <ImagePlus /> Change photo
                                        </Button>
                                        {(user.avatarUrl || selectedImage) && (
                                            <Button type="button" variant="ghost" size="sm" onClick={handleRemoveImage}>
                                                <Trash2 /> Remove
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <label className="grid gap-2 text-sm font-medium">
                                        Display name
                                        <Input
                                            name="name"
                                            value={name}
                                            placeholder="display name"
                                            maxLength={70}
                                            aria-invalid={Boolean(fieldErrors.name)}
                                            onChange={(event) => {
                                                setName(event.target.value)
                                                if (event.target.value.trim()) setFieldErrors((current) => ({ ...current, name: undefined }))
                                            }}
                                        />
                                        {fieldErrors.name && <span className="text-xs font-normal text-destructive">{fieldErrors.name}</span>}
                                    </label>
                                    <label className="grid gap-2 text-sm font-medium">
                                        Username
                                        <Input
                                            name="username"
                                            value={username}
                                            placeholder="username"
                                            maxLength={30}
                                            aria-invalid={Boolean(fieldErrors.username)}
                                            onChange={(event) => {
                                                const sanitized = event.target.value.replace(/[^a-zA-Z0-9_-]/g, "")
                                                setUsername(sanitized)
                                                if (sanitized) setFieldErrors((current) => ({ ...current, username: undefined }))
                                            }}
                                        />
                                        {fieldErrors.username && <span className="text-xs font-normal text-destructive">{fieldErrors.username}</span>}
                                    </label>
                                </div>
                                <Button type="submit" disabled={isSaving}>
                                    {isSaving && <Loader2 className="animate-spin" />}
                                    {isSaving ? "Saving..." : "Save changes"}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Appearance</CardTitle>
                            <CardDescription>Choose how PartLens looks on this device.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <label className="grid gap-2 text-sm font-medium">
                                Theme
                                <div className="relative">
                                    <select
                                        value={theme || "system"}
                                        onChange={(event) => setTheme(event.target.value)}
                                        className="h-9 w-full appearance-none rounded-lg border border-input bg-background px-3 pr-9 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                                    >
                                        <option value="light">Light</option>
                                        <option value="dark">Dark</option>
                                        <option value="system">System</option>
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted-foreground">
                                        {theme === "light" ? <Sun className="size-4" /> : theme === "dark" ? <Moon className="size-4" /> : <Laptop className="size-4" />}
                                    </div>
                                </div>
                            </label>
                        </CardContent>
                    </Card>
                </div>

                <Card className="mt-6">
                    <CardHeader className="flex-row items-start justify-between gap-4">
                        <div>
                            <CardTitle>Active sessions</CardTitle>
                            <CardDescription>These are the devices currently signed in to your account.</CardDescription>
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={() => void fetchSessions()} disabled={sessionsLoading}>
                            <RefreshCw className={sessionsLoading ? "animate-spin" : ""} />
                            Refresh
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {sessionsError && <p className="text-sm text-destructive">{sessionsError}</p>}
                        {sessionsLoading && sessions.length === 0 && <p className="text-sm text-muted-foreground">Loading sessions...</p>}
                        {!sessionsLoading && !sessionsError && sessions.length === 0 && (
                            <p className="text-sm text-muted-foreground">No active sessions found.</p>
                        )}
                        <div className="divide-y rounded-lg border">
                            {sessions.map((session) => (
                                <div key={session.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex min-w-0 items-start gap-3">
                                        <Monitor className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="font-medium">{describeUserAgent(session.userAgent)}</p>
                                                {session.current && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                                        <Check className="size-3" /> Current
                                                    </span>
                                                )}
                                            </div>
                                            <p className="truncate text-sm text-muted-foreground">
                                                {session.ipAddress || "IP unavailable"} · Last active {formatDate(session.lastActive)}
                                            </p>
                                            <p className="text-xs text-muted-foreground">Signed in {formatDate(session.createdAt)}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {sessions.some((session) => !session.current) && (
                            <Button type="button" variant="outline" onClick={() => setConfirmation("logoutOthers")} disabled={isLoggingOutOthers}>
                                {isLoggingOutOthers && <Loader2 className="animate-spin" />}
                                {isLoggingOutOthers ? "Logging out..." : "Log out of all other sessions"}
                            </Button>
                        )}
                        <Button type="button" variant="destructive" onClick={() => setConfirmation("logout")}>
                            <LogOut /> Log out
                        </Button>
                    </CardContent>
                </Card>
            </div></main></DashboardSidebar>

        <Dialog open={cropOpen} onOpenChange={setCropOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Crop profile photo</DialogTitle>
                    <DialogDescription>Adjust the zoom and position of your square profile photo.</DialogDescription>
                </DialogHeader>
                {selectedImage && (
                    <div className="space-y-5">
                        <div className="mx-auto size-64 overflow-hidden rounded-full bg-muted">
                            <Image
                                src={selectedImage}
                                alt="Profile crop preview"
                                width={512}
                                height={512}
                                unoptimized
                                className="size-full object-cover"
                                style={{
                                    objectPosition: `${cropX}% ${cropY}%`,
                                    transform: `scale(${cropZoom})`,
                                }}
                            />
                        </div>
                        <label className="grid gap-2 text-sm font-medium">
                            Zoom
                            <input type="range" min="1" max="3" step="0.05" value={cropZoom} onChange={(event) => setCropZoom(Number(event.target.value))} />
                        </label>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <label className="grid gap-2 text-sm font-medium">
                                Horizontal position
                                <input type="range" min="0" max="100" value={cropX} onChange={(event) => setCropX(Number(event.target.value))} />
                            </label>
                            <label className="grid gap-2 text-sm font-medium">
                                Vertical position
                                <input type="range" min="0" max="100" value={cropY} onChange={(event) => setCropY(Number(event.target.value))} />
                            </label>
                        </div>
                    </div>
                )}
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={cancelImageSelection}>Cancel</Button>
                    <Button type="button" onClick={() => void createCroppedImage()}>Use this photo</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <Dialog open={confirmation !== null} onOpenChange={(open) => !open && setConfirmation(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{confirmation === "logoutOthers" ? "Log out other sessions?" : "Log out?"}</DialogTitle>
                    <DialogDescription>
                        {confirmation === "logoutOthers"
                            ? "Every other active session will be terminated. Your current session will remain active."
                            : "You will be signed out of PartLens on this device."}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setConfirmation(null)}>Cancel</Button>
                    <Button type="button" variant="destructive" onClick={() => void handleConfirmation()}>
                        {confirmation === "logoutOthers" ? "Log out other sessions" : "Log out"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </>)
}