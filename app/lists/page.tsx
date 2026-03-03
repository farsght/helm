import { db } from "@/db";
import { lists, listMembers } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Users } from "lucide-react";

export default async function ListsPage() {
  const allLists = await db.select().from(lists).orderBy(sql`${lists.createdAt} DESC`);

  // Get member counts
  const memberCounts = await Promise.all(
    allLists.map(async (list) => {
      const count = await db
        .select({ count: sql<number>`count(*)` })
        .from(listMembers)
        .where(eq(listMembers.listId, list.id));
      return { listId: list.id, count: count[0]?.count || 0 };
    })
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Lists</h1>
          <p className="text-gray-400 mt-1">Organize prospects into lists</p>
        </div>
        <Button className="bg-[#266DF0] hover:bg-[#1a5ac9] text-white">
          <Plus className="mr-2 h-4 w-4" />
          Create List
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {allLists.map((list) => {
          const memberCount = memberCounts.find(m => m.listId === list.id)?.count || 0;

          return (
            <Card key={list.id} className="bg-[#25252A] border-[#3A3A40] hover:border-[#266DF0] transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-white">{list.name}</CardTitle>
                    <CardDescription className="text-gray-400 mt-2">
                      {list.description || 'No description'}
                    </CardDescription>
                  </div>
                  <Badge
                    variant="secondary"
                    className={
                      list.type === 'static'
                        ? 'bg-blue-500/10 text-blue-400'
                        : 'bg-purple-500/10 text-purple-400'
                    }
                  >
                    {list.type}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Users className="h-4 w-4" />
                    <span className="text-sm">{memberCount} prospects</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-[#266DF0] hover:text-white hover:bg-[#266DF0]"
                  >
                    View
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
