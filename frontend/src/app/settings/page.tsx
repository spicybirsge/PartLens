import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings",
  description:
    "Manage your dashboard and account settings",
};

import SettingsPage from "@/components/settings-page/SettingsPage"
export default function Page() {

    return <SettingsPage></SettingsPage>

}