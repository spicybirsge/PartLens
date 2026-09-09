
'use client';

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "@/components/ui/toast";
import PageLoading from "@/components/PageLoading";
import vars from "@/vars/vars";
import { useRouter } from 'next/navigation';
import { userStore } from '@/store/store';



export default function Page() {

    const router = useRouter()
    const { user, loaded, checkIfLoggedIn } = userStore();



    const searchParams = useSearchParams();
    const callbackCode = searchParams.get("code");

    const hasChecked = useRef(false);

    useEffect(() => {
        if (hasChecked.current) return;

        hasChecked.current = true;

        async function obtainSession() {
            if (!callbackCode) {
                toast.add({
                    type: "error",
                    description: "Callback code not available to proceed",
                });

                return;
            }

            // Remove the callback code from the address bar immediately.
            // The callbackCode variable still contains the original code.
            const url = new URL(window.location.href);
            url.searchParams.delete("code");

            window.history.replaceState(
                {},
                "",
                url.pathname + url.search + url.hash
            );

            try {


                const request = await fetch(vars.BACKEND_URL + "/api/v1/auth/obtain-session", {
                    method: 'POST',
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        callback_code: callbackCode
                    })
                })

                const response = await request.json()

                if (!response.success) {
                    return toast.add({ type: 'error', description: response.message })
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
            }
        }

        obtainSession();
    }, [callbackCode]);

    return <PageLoading></PageLoading>;
}

