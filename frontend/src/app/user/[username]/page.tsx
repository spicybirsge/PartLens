import type { Metadata } from "next";
import vars from "@/vars/vars";
import ProfilePage from "@/components/user-profile/UserProfile"

interface UserMeta {
  id: string
  username: string
  name: string
  avatarUrl: string | null
  createdAt: string
  totalProjects: number
}

async function fetchUserMeta(username: string): Promise<UserMeta | null> {
  try {
    const response = await fetch(
      `${vars.BACKEND_URL}/api/v1/read/user?username=${encodeURIComponent(username)}`,
      { cache: "no-store" },
    );

    if (!response.ok) return null;

    const body = (await response.json()) as {
      success: boolean
      data: UserMeta | null
    };

    return body.data ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>
}): Promise<Metadata> {
  const { username } = await params;
  const user = await fetchUserMeta(username);

  if (!user) {
    return {
      title: "User not found",
    };
  }

  const title = `${user.name} (@${user.username})`;
  const description =
    `${user.name} (@${user.username}) on PartLens. ` +
    `Explore ${user.totalProjects} public project${user.totalProjects === 1 ? "" : "s"}.`;
  const profileUrl = `${vars.FRONTEND_URL}/user/${user.username}`;

  return {
    title,
    description,
    authors: [
      {
        name: `${user.name} (@${user.username})`,
        url: profileUrl,
      },
    ],
    alternates: {
      canonical: profileUrl,
    },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      url: profileUrl,
      siteName: "PartLens",
      type: "profile",
      locale: "en_US",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
    other: {
      "profile:projects": String(user.totalProjects),
    },
  };
}

interface PageProps {
  params: Promise<{
    username: string;
  }>;
}

export default async function Page({ params }: PageProps) {
  const { username } = await params;
  return <ProfilePage key={username}></ProfilePage>
}
