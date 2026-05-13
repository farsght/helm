export const dynamic = "force-dynamic";
import { db } from "@/db";
import { templates } from "@/db/schema";
import { sql } from "drizzle-orm";
import { TemplatesClient } from "./templates-client";

export default async function TemplatesPage() {
  const allTemplates = await db.select().from(templates).orderBy(sql`${templates.createdAt} DESC`);

  return <TemplatesClient initialTemplates={allTemplates} />;
}
