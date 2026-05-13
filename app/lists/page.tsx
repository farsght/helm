export const dynamic = "force-dynamic";
import { db } from "@/db";
import { lists, listMembers } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { ListsClient } from "./lists-client";

export default async function ListsPage() {
  const allLists = await db.select().from(lists).orderBy(sql`${lists.createdAt} DESC`);

  // Get member counts
  const memberCounts = await Promise.all(
    allLists.map(async (list) => {
      const count = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(listMembers)
        .where(eq(listMembers.listId, list.id));
      return { listId: list.id, count: count[0]?.count || 0 };
    })
  );

  const listsWithCounts = allLists.map(list => ({
    ...list,
    memberCount: memberCounts.find(m => m.listId === list.id)?.count || 0,
  }));

  return <ListsClient initialLists={listsWithCounts} />;
}
