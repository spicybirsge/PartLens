import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Project Manuals",
  description:
    "Managing your PartLens project",
};

import ManageManuals from "@/components/manage-manuals/ManageManuals"


interface PageProps {
  params: Promise<{
    id: string; 
  }>;
}

export default async function Page({params}: PageProps) {
      const { id } = await params; 
    return <ManageManuals id={id}></ManageManuals>
}