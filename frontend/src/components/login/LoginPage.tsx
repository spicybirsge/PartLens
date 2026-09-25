'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import GoogleIcon from '../icons/flat-color-icons-google';
import { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { userStore } from '@/store/store';
import { useRouter } from 'next/navigation';
import PageLoading from '../PageLoading';
import vars from '@/vars/vars';
import Navbar from '../Navbar';
export default function LoginPage() {

    const router = useRouter()
    const { user, loaded, checkIfLoggedIn } = userStore();
    useEffect(() => {

        if (!loaded) {
            checkIfLoggedIn()

        } else if (loaded && user) {

            router.push("/", { scroll: false })
        }
    }, [loaded, user, checkIfLoggedIn])

    const handleBack = () => {
        const referrer = document.referrer
        const cameFromSameSite = referrer && new URL(referrer).origin === window.location.origin

        if (cameFromSameSite && window.history.length > 1) {
            router.back()
        } else {
            router.push('/')
        }
    }

    if (!loaded) {
        return <><PageLoading></PageLoading></>
    }
    return (
        <>
        <Navbar></Navbar>
        <div className="flex min-h-[calc(100svh-4rem)] items-center justify-center bg-muted/30 px-4 py-8">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1 text-center relative">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute left-2 top-2 h-8 w-8"
                        onClick={handleBack}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <CardTitle className="text-2xl">Welcome back</CardTitle>
                    <CardDescription>Sign in to continue to your account</CardDescription>
                </CardHeader>
                <CardContent><a href={vars.BACKEND_URL+"/api/v1/auth/google"}>                    <Button variant="outline" className="w-full">
                    <GoogleIcon />
                    <span className="ml-2">Continue with Google</span>
                </Button></a>
                <p className="mt-4 text-center text-xs text-muted-foreground">
                    By continuing, you agree to our{" "}
                    <Link
                        href="/terms"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-4 hover:text-foreground"
                    >
                        Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link
                        href="/privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-4 hover:text-foreground"
                    >
                        Privacy Policy
                    </Link>
                    .
                </p>

                </CardContent>
            </Card>
        </div></>
    )
}