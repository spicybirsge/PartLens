import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Manage Project",
  description:
    "Managing your PartLens project",
};

import ManageProject from "@/components/manage-project/ManageProject";

interface PageProps {
  params: Promise<{
    id: string; // Dynamic path segments are always typed as strings
  }>;
}


export default async function Page({params}: PageProps) {
      const { id } = await params; 
    return <ManageProject id={id}></ManageProject>
}