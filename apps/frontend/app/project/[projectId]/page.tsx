import ProjectWorkspace from "@/components/ProjectWorkspace";
import { notFound } from "next/navigation";

interface ProjectPageProps {
  params: Promise<{
    projectId: string;
  }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;

  if (!projectId || projectId === "undefined") {
    notFound();
  }

  return <ProjectWorkspace projectId={projectId} />;
}
