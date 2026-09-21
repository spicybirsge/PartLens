import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Project Analytics",
  description:
    "Analyze your PartLens project",
};

import ProjectAnalytics from "@/components/project-analytics/ProjectAnalytics";


interface PageProps {
  params: Promise<{
    id: string; 
  }>;
}

export default async function Page({params}: PageProps) {
      const { id } = await params; 
    return <ProjectAnalytics id={id}></ProjectAnalytics>
}