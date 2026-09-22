import type { Metadata } from "next"
import DashboardPage from "@/components/dashboard/DashboardPage"

export const metadata: Metadata = {
title: "Home | PartLens"
}

export default function Home() {
  return <DashboardPage />
}
