import { db } from "@/db";
import { conversations, prospects } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mail } from "lucide-react";

export default async function ConversationsPage() {
  const allConversations = await db
    .select({
      conversation: conversations,
      prospect: prospects,
    })
    .from(conversations)
    .innerJoin(prospects, eq(conversations.prospectId, prospects.id))
    .orderBy(sql`${conversations.lastMessageAt} DESC`);

  return (
    <div className="flex h-screen">
      {/* Conversation List */}
      <div className="w-96 border-r border-[#3A3A40] bg-[#1B1B1F]">
        <div className="p-6 border-b border-[#3A3A40]">
          <h1 className="text-2xl font-bold text-white">Conversations</h1>
          <p className="text-gray-400 text-sm mt-1">All prospect interactions</p>
        </div>
        <ScrollArea className="h-[calc(100vh-100px)]">
          <div className="p-4 space-y-2">
            {allConversations.length === 0 ? (
              <p className="text-gray-400 text-sm p-4 text-center">No conversations yet</p>
            ) : (
              allConversations.map(({ conversation, prospect }) => (
                <Card
                  key={conversation.id}
                  className="p-4 bg-[#25252A] border-[#3A3A40] hover:border-[#266DF0] cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-medium text-white">
                        {prospect.firstName} {prospect.lastName}
                      </h3>
                      <p className="text-xs text-gray-400 mt-1">
                        {prospect.title} at {prospect.company}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={
                        conversation.status === 'new'
                          ? 'bg-blue-500/10 text-blue-400'
                          : conversation.status === 'interested'
                          ? 'bg-green-500/10 text-green-400'
                          : 'bg-gray-500/10 text-gray-400'
                      }
                    >
                      {conversation.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Mail className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-400">
                      {conversation.lastMessageAt
                        ? new Date(conversation.lastMessageAt).toLocaleDateString()
                        : 'No messages'}
                    </span>
                  </div>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Message Thread */}
      <div className="flex-1 flex flex-col bg-[#1B1B1F]">
        <div className="p-6 border-b border-[#3A3A40]">
          <p className="text-gray-400">Select a conversation to view messages</p>
        </div>
        <div className="flex-1 p-6 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-[#25252A] flex items-center justify-center mx-auto mb-4">
              <Mail className="h-8 w-8 text-gray-600" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No conversation selected</h3>
            <p className="text-gray-400 text-sm">
              Choose a conversation from the list to view the message thread
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
