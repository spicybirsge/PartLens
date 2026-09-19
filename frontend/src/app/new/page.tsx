import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New project",
  description:
    "Create a new PartLens project",
};

import NewProject from "@/components/new/NewProject";
export default function Page() {

    return <NewProject></NewProject>

}