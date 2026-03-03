'use client';

import { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Linkedin, Send, Sparkles, Loader2 } from "lucide-react";

interface Message {
  id: number;
  direction: 'outbound' | 'inbound';
  subject?: string | null;
  body: string;
  channel: 'email' | 'linkedin';
  status: string;
  sentAt?: Date | null;
  createdAt: Date;
}

interface Prospect {
  id: number;
  firstName: string;
  lastName: string;
  email?: string | null;
  company?: string | null;
  title?: string | null;
}

interface Conversation {
  conversation: {
    id: number;
    status: string;
    lastMessageAt?: Date | null;
  };
  prospect: Prospect;
}

interface ConversationsClientProps {
  initialConversations: Conversation[];
}

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-500/10 text-blue-400',
  in_progress: 'bg-yellow-500/10 text-yellow-400',
  interested: 'bg-green-500/10 text-green-400',
  meeting_booked: 'bg-purple-500/10 text-purple-400',
  not_interested: 'bg-gray-500/10 text-gray-400',
};

export function ConversationsClient({ initialConversations }: ConversationsClientProps) {
  const [conversations, setConversations] = useState(initialConversations);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [tone, setTone] = useState<'professional' | 'casual' | 'friendly' | 'direct'>('professional');

  useEffect(() => {
    if (selectedConversation) {
      loadConversationMessages(selectedConversation.conversation.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation]);

  const loadConversationMessages = async (conversationId: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/conversations/${conversationId}`);
      if (!response.ok) throw new Error('Failed to load messages');
      
      const data = await response.json();
      setMessages(data.messages || []);
      
      // If there's an inbound message, generate AI suggestion
      const lastMessage = data.messages?.[data.messages.length - 1];
      if (lastMessage?.direction === 'inbound') {
        generateAISuggestion(data.messages, data.prospect);
      }
    } catch (err) {
      console.error('Load messages error:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateAISuggestion = async (conversationHistory: Message[], prospect: Prospect) => {
    setGeneratingAI(true);
    setAiSuggestion(null);
    
    try {
      const response = await fetch('/api/messages/ai-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationHistory: conversationHistory.map(m => ({
            direction: m.direction,
            body: m.body,
            sentAt: m.sentAt,
          })),
          prospectData: {
            firstName: prospect.firstName,
            lastName: prospect.lastName,
            company: prospect.company,
            title: prospect.title,
          },
          tone,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate AI reply');

      const data = await response.json();
      setAiSuggestion(data.reply);
    } catch (err) {
      console.error('AI generation error:', err);
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleStatusChange = async (conversationId: number, newStatus: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update status');

      // Update local state
      setConversations(prev =>
        prev.map(c =>
          c.conversation.id === conversationId
            ? { ...c, conversation: { ...c.conversation, status: newStatus } }
            : c
        )
      );

      if (selectedConversation?.conversation.id === conversationId) {
        setSelectedConversation({
          ...selectedConversation,
          conversation: { ...selectedConversation.conversation, status: newStatus },
        });
      }
    } catch (err) {
      console.error('Status update error:', err);
      alert('Failed to update status');
    }
  };

  const handleSendReply = async () => {
    if (!selectedConversation || !replyText.trim()) return;

    setSending(true);
    try {
      const response = await fetch(`/api/conversations/${selectedConversation.conversation.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: replyText,
          send: true,
        }),
      });

      if (!response.ok) throw new Error('Failed to send reply');

      // Reload messages
      await loadConversationMessages(selectedConversation.conversation.id);
      setReplyText('');
      setAiSuggestion(null);
    } catch (err) {
      console.error('Send reply error:', err);
      alert('Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const useAISuggestion = () => {
    if (aiSuggestion) {
      setReplyText(aiSuggestion);
      setAiSuggestion(null);
    }
  };

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
            {conversations.length === 0 ? (
              <p className="text-gray-400 text-sm p-4 text-center">No conversations yet</p>
            ) : (
              conversations.map(({ conversation, prospect }) => (
                <Card
                  key={conversation.id}
                  onClick={() => setSelectedConversation({ conversation, prospect })}
                  className={`p-4 cursor-pointer transition-colors ${
                    selectedConversation?.conversation.id === conversation.id
                      ? 'bg-[#266DF0]/20 border-[#266DF0]'
                      : 'bg-[#25252A] border-[#3A3A40] hover:border-[#266DF0]'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-medium text-white">
                        {prospect.firstName} {prospect.lastName}
                      </h3>
                      <p className="text-xs text-gray-400 mt-1">
                        {prospect.title} {prospect.company ? `at ${prospect.company}` : ''}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={STATUS_COLORS[conversation.status] || 'bg-gray-500/10 text-gray-400'}
                    >
                      {conversation.status.replace('_', ' ')}
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
        {selectedConversation ? (
          <>
            {/* Header */}
            <div className="p-6 border-b border-[#3A3A40]">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {selectedConversation.prospect.firstName} {selectedConversation.prospect.lastName}
                  </h2>
                  <p className="text-gray-400 text-sm mt-1">
                    {selectedConversation.prospect.title}{' '}
                    {selectedConversation.prospect.company && `at ${selectedConversation.prospect.company}`}
                  </p>
                </div>
                <Select
                  value={selectedConversation.conversation.status}
                  onValueChange={(v) => handleStatusChange(selectedConversation.conversation.id, v)}
                >
                  <SelectTrigger className="w-48 bg-[#25252A] border-[#3A3A40] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="interested">Interested</SelectItem>
                    <SelectItem value="meeting_booked">Meeting Booked</SelectItem>
                    <SelectItem value="not_interested">Not Interested</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-6">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
                </div>
              ) : (
                <div className="space-y-4 max-w-3xl">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-4 ${
                          message.direction === 'outbound'
                            ? 'bg-[#266DF0] text-white'
                            : 'bg-[#25252A] text-white border border-[#3A3A40]'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {message.channel === 'email' ? (
                            <Mail className="h-3 w-3" />
                          ) : (
                            <Linkedin className="h-3 w-3" />
                          )}
                          <span className="text-xs opacity-80">
                            {message.direction === 'outbound' ? 'You' : selectedConversation.prospect.firstName}
                          </span>
                          <span className="text-xs opacity-60">
                            {message.sentAt
                              ? new Date(message.sentAt).toLocaleString()
                              : new Date(message.createdAt).toLocaleString()}
                          </span>
                        </div>
                        {message.subject && (
                          <p className="font-medium mb-2 text-sm">{message.subject}</p>
                        )}
                        <p className="whitespace-pre-wrap text-sm">{message.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* AI Suggestion */}
            {aiSuggestion && (
              <div className="px-6 py-4 bg-purple-500/10 border-t border-purple-500/20">
                <div className="flex items-start gap-3 max-w-3xl">
                  <Sparkles className="h-5 w-5 text-purple-400 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-purple-400 mb-2">AI Suggested Reply</p>
                    <p className="text-sm text-white whitespace-pre-wrap bg-[#25252A] p-3 rounded-md border border-[#3A3A40]">
                      {aiSuggestion}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={useAISuggestion}
                    className="bg-purple-600 hover:bg-purple-700 text-white flex-shrink-0"
                  >
                    Use This Reply
                  </Button>
                </div>
              </div>
            )}

            {/* Reply Composer */}
            <div className="p-6 border-t border-[#3A3A40]">
              <div className="max-w-3xl space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Select value={tone} onValueChange={(v: 'professional' | 'casual' | 'friendly' | 'direct') => setTone(v)}>
                    <SelectTrigger className="w-48 bg-[#25252A] border-[#3A3A40] text-white text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="direct">Direct</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => generateAISuggestion(messages, selectedConversation.prospect)}
                    disabled={generatingAI}
                    className="bg-[#25252A] border-[#3A3A40] text-purple-400 hover:bg-purple-500/10"
                  >
                    {generatingAI ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-1" />
                        Get AI Suggestion
                      </>
                    )}
                  </Button>
                </div>
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your reply..."
                  rows={4}
                  className="bg-[#25252A] border-[#3A3A40] text-white"
                />
                <div className="flex justify-end">
                  <Button
                    onClick={handleSendReply}
                    disabled={sending || !replyText.trim()}
                    className="bg-[#266DF0] hover:bg-[#1a5ac9] text-white"
                  >
                    {sending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Reply
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : (
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
        )}
      </div>
    </div>
  );
}
