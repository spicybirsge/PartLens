import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bookmarks",
  description:
    "View all of your bookmarks",
};

import Bookmarks from "@/components/bookmarks/bookmarks";

export default function Page() {

return <Bookmarks></Bookmarks>

}
