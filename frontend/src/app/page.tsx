'use client'

import ModelViewer from "../components/ModelViewer";
import Link from "next/link";
import { userStore } from "@/store/store"
import { useEffect, useState, useRef } from "react";
import { useRouter } from 'next/navigation';
import PageLoading from "@/components/PageLoading";
import { Button } from "@/components/ui/button";

export default function Home() {


    const router = useRouter()
  const { user, loaded, checkIfLoggedIn, logout } = userStore();


    useEffect(() => {


    if (!loaded) {
      checkIfLoggedIn()

    } else if (loaded && !user) {

      router.push("/login", { scroll: false })
    }
  }, [loaded, user, checkIfLoggedIn])


    if (!loaded) {
    return <><PageLoading></PageLoading></>
  }

  if (loaded && !user) {
    return <><PageLoading></PageLoading></>
  }
   return (
    <main>
      <h1>Machine Viewer</h1>
<p>logged in as {user?.name}</p>
<p>email: {user?.email}</p>
<Button onClick={logout} variant="destructive">logout</Button>
    </main>
  );
}