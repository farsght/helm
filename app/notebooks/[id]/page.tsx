export const dynamic = "force-dynamic";
import { NotebookDetailClient } from "./notebook-detail-client";

export default async function NotebookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <NotebookDetailClient id={id} />;
}
