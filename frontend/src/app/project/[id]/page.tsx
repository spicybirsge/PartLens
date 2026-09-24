import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New project",
  description:
    "Create a new PartLens project",
};


import ProjectPage from "@/components/view-project/Project";

export default function Page() {

    return <ProjectPage></ProjectPage>
}