export const dynamic = "force-dynamic";
import { db } from "@/db";
import { conversations, prospects } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { ConversationsClient } from "./conversations-client";

export default async function ConversationsPage() {
  const allConversations = await db
    .select({
      conversation: conversations,
      prospect: prospects,
    })
    .from(conversations)
    .innerJoin(prospects, eq(conversations.prospectId, prospects.id))
    .orderBy(sql`${conversations.lastMessageAt} DESC`);

  return <ConversationsClient initialConversations={allConversations} />;
}
