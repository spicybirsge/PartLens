import type { Metadata } from "next"
import DashboardPage from "@/components/dashboard/DashboardPage"

export const metadata: Metadata = {
  title: {
    absolute: "Overview | PartLens",
  },
  description: "Manage your PartLens projects",
}

export default function Home() {
  return <DashboardPage />
}
