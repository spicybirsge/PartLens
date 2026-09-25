import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "User profile ",
  description:
    "Viewing a user profile",
};

import ProfilePage from "@/components/user-profile/UserProfile"

export default function Page() {
    return <><ProfilePage></ProfilePage></>
}