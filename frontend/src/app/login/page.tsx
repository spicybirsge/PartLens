import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login or Sign Up | Partlens",
  description:
    "Log in to your Partlens account or create a new account to access Partlens.",
};
import LoginPage from "@/components/LoginPage";

export default function Page() {
    return <><LoginPage></LoginPage></>
}