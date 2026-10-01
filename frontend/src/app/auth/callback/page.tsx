
'use client';

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "@/components/ui/toast";
import PageLoading from "@/components/PageLoading";
import vars from "@/vars/vars";
import { useRouter } from 'next/navigation';
import { userStore } from '@/store/store';



function CallbackPage() {

    const router = useRouter()
    const { checkIfLoggedIn } = userStore();



    const searchParams = useSearchParams();
    const callbackCode = searchParams.get("code");
    const callbackState = searchParams.get("state");

    const hasChecked = useRef(false);

    useEffect(() => {
        if (hasChecked.current) return;

        hasChecked.current = true;

        async function obtainSession() {
            // Keep the captured values, but remove them from the address bar.
            const url = new URL(window.location.href);
            url.searchParams.delete("code");
            url.searchParams.delete("state");

            window.history.replaceState(
                {},
                "",
                url.pathname + url.search + url.hash
            );

            try {
                const expectedState = window.sessionStorage.getItem("oauth_state");
                if (!callbackCode || !callbackState || !expectedState || callbackState !== expectedState) {
                    toast.add({ type: "error", description: "Login could not be verified. Please start again from the login page." });
                    router.replace("/login");
                    return;
                }
                // Consume only a matching state; an unrelated callback must not cancel a pending login.
                window.sessionStorage.removeItem("oauth_state");
                const request = await fetch(vars.BACKEND_URL + "/api/v1/auth/obtain-session", {
                    method: 'POST',
                    referrerPolicy: "no-referrer",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        callback_code: callbackCode,
                        state: callbackState
                    })
                })

                const response = await request.json()

                if (!request.ok || !response.success) {
                    toast.add({ type: 'error', description: response.message || "Failed to complete login" });
                    router.replace("/login");
                    return;
                }

                window.localStorage.setItem("token", response.token)
                await checkIfLoggedIn()
                router.push("/", { scroll: false })





            } catch (error) {
                console.error("Failed to obtain session:", error);

                toast.add({
                    type: "error",
                    description: "Failed to complete login",
                });
                router.replace("/login");
            }
        }

        obtainSession();
    }, [callbackCode, callbackState, checkIfLoggedIn, router]);

    return <PageLoading></PageLoading>;
}

export default function Page() {
    return (
        <Suspense fallback={<PageLoading />}>
            <CallbackPage />
        </Suspense>
    );
}
