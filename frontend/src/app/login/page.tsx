import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login or Sign Up | PartLens",
  description:
    "Log in to your PartLens account or create a new account to access PartLens.",
};
import LoginPage from "@/components/login/LoginPage";

export default function Page() {
    return <><LoginPage></LoginPage></>
}