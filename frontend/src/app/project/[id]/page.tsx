import type { Metadata } from "next";
import vars from "@/vars/vars";
import ProjectPage from "@/components/view-project/Project";

interface ProjectOwner {
  id: string
  username: string
  name: string
  avatarUrl: string | null
}

interface ProjectMeta {
  id: string
  publicId: string
  name: string
  description: string | null
  unlisted: boolean
  views: number
  createdAt: string
  updatedAt: string
  owner: ProjectOwner
}

async function fetchProjectMeta(publicId: string): Promise<ProjectMeta | null> {
  try {
    const response = await fetch(
      `${vars.BACKEND_URL}/api/v1/read/project/${publicId}/meta`,
      { cache: "no-store" },
    );

    if (!response.ok) return null;

    const body = (await response.json()) as {
      success: boolean
      data: ProjectMeta | null
    };

    return body.data ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params;
  const project = await fetchProjectMeta(id);

  if (!project) {
    return {
      title: "Project not found",
    };
  }

  const title = `Project: ${project.name} by ${project.owner.name}(@${project.owner.username})`;
  const description =
    project.description ??
    `Interactive 3D model with manuals by ${project.owner.name} (@${project.owner.username}) on PartLens.`;
  const projectUrl = `${vars.FRONTEND_URL}/project/${project.publicId}`;
  const visibility = project.unlisted ? "unlisted" : "public";

  return {
    title,
    description,
    authors: [
      {
        name: `${project.owner.name} (@${project.owner.username})`,
        url: `${vars.FRONTEND_URL}/profile/${project.owner.username}`,
      },
    ],
    alternates: {
      canonical: projectUrl,
    },
    robots: project.unlisted
      ? { index: false, follow: false }
      : { index: true, follow: true },
    openGraph: {
      title,
      description,
      url: projectUrl,
      siteName: "PartLens",
      type: "website",
      locale: "en_US",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
    other: {
      "project:views": String(project.views),
      "project:visibility": visibility,
    },
  };
}

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  return <ProjectPage id={id}></ProjectPage>
}