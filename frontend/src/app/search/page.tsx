import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search for projects",
  description:
    "Search and discover new PartLens projects",
};

import DiscoverPageLoggedIn from "@/components/discover-page/DiscoverPageLoggedIn";

export default function Page() {
return <DiscoverPageLoggedIn></DiscoverPageLoggedIn>
}
