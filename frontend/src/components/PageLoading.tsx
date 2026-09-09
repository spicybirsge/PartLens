'use client'
import { Loader2 } from 'lucide-react'
export default function PageLoading() {
    return <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin " />
    </div>
}