'use client';

import { useState, useEffect } from 'react';
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Mail, Linkedin, Building, MapPin, Phone, Loader2 } from "lucide-react";

interface Prospect {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  company: string | null;
  title: string | null;
  linkedinUrl: string | null;
  phone: string | null;
  industry: string | null;
  location: string | null;
  createdAt: Date;
}

interface Campaign {
  id: number;
  name: string;
  status: string;
}

interface Enrollment {
  status: string;
  enrolledAt: Date;
}

interface Message {
  id: number;
  channel: string;
  direction: string;
  subject: string | null;
  body: string | null;
  status: string;
  sentAt: Date | null;
  createdAt: Date;
}

export function ProspectDetailClient({ id }: { id: string }) {
  const [prospect, setProspect] = useState<Prospect | null>(null);
  const [campaignHistory, setCampaignHistory] = useState<Array<{ campaign: Campaign; enrollment: Enrollment }>>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/prospects/${id}`).then(r => r.json()),
      fetch(`/api/prospects/${id}/campaigns`).then(r => r.json()),
      fetch(`/api/messages?prospectId=${id}`).then(r => r.json()),
    ]).then(([p, campaigns, msgs]) => {
      setProspect(p);
      setCampaignHistory(Array.isArray(campaigns) ? campaigns : []);
      setMessages(Array.isArray(msgs) ? msgs : []);
    }).catch(err => console.error('Fetch prospect detail error:', err))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!prospect) {
    return (
      <div className="p-8 text-center text-gray-400">Prospect not found.</div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/prospects">
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-white">
            {prospect.firstName} {prospect.lastName}
          </h1>
          {prospect.title && prospect.company && (
            <p className="text-gray-400 mt-1">{prospect.title} at {prospect.company}</p>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Card */}
        <Card className="bg-[#25252A] border-[#3A3A40] md:col-span-1">
          <CardHeader>
            <CardTitle className="text-white text-lg">Contact Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {prospect.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-blue-400 shrink-0" />
                <span className="text-gray-300 break-all">{prospect.email}</span>
              </div>
            )}
            {prospect.linkedinUrl && (
              <div className="flex items-center gap-2 text-sm">
                <Linkedin className="h-4 w-4 text-purple-400 shrink-0" />
                <a href={prospect.linkedinUrl} target="_blank" rel="noreferrer" className="text-[#266DF0] hover:underline break-all">
                  LinkedIn Profile
                </a>
              </div>
            )}
            {prospect.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                <span className="text-gray-300">{prospect.phone}</span>
              </div>
            )}
            {prospect.company && (
              <div className="flex items-center gap-2 text-sm">
                <Building className="h-4 w-4 text-gray-400 shrink-0" />
                <span className="text-gray-300">{prospect.company}</span>
              </div>
            )}
            {prospect.location && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
                <span className="text-gray-300">{prospect.location}</span>
              </div>
            )}
            {prospect.industry && (
              <div className="text-sm">
                <span className="text-gray-400">Industry: </span>
                <span className="text-gray-300">{prospect.industry}</span>
              </div>
            )}
            <div className="text-sm text-gray-500 pt-2 border-t border-[#3A3A40]">
              Added {new Date(prospect.createdAt).toLocaleDateString()}
            </div>
          </CardContent>
        </Card>

        {/* Right column */}
        <div className="md:col-span-2 space-y-6">
          {/* Campaign History */}
          <Card className="bg-[#25252A] border-[#3A3A40]">
            <CardHeader>
              <CardTitle className="text-white text-lg">Campaign History</CardTitle>
            </CardHeader>
            <CardContent>
              {campaignHistory.length === 0 ? (
                <p className="text-gray-400 text-sm">Not enrolled in any campaigns</p>
              ) : (
                <div className="space-y-2">
                  {campaignHistory.map(({ campaign, enrollment }) => (
                    <div key={campaign.id} className="flex items-center justify-between p-3 rounded-lg bg-[#1B1B1F] border border-[#3A3A40]">
                      <div>
                        <Link href={`/campaigns/${campaign.id}`} className="text-white font-medium hover:text-[#266DF0]">
                          {campaign.name}
                        </Link>
                        <p className="text-xs text-gray-500 mt-1">
                          Enrolled {new Date(enrollment.enrolledAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Badge className="bg-blue-500/10 text-blue-400">{enrollment.status}</Badge>
                        <Badge className={campaign.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-gray-500/10 text-gray-400'}>
                          {campaign.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Messages */}
          <Card className="bg-[#25252A] border-[#3A3A40]">
            <CardHeader>
              <CardTitle className="text-white text-lg">Messages ({messages.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {messages.length === 0 ? (
                <p className="text-gray-400 text-sm">No messages yet</p>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div key={msg.id} className="p-3 rounded-lg bg-[#1B1B1F] border border-[#3A3A40]">
                      <div className="flex items-center gap-2 mb-2">
                        {msg.channel === 'email' ? (
                          <Mail className="h-4 w-4 text-blue-400" />
                        ) : (
                          <Linkedin className="h-4 w-4 text-purple-400" />
                        )}
                        <span className="text-sm text-gray-400 capitalize">{msg.direction} · {msg.channel}</span>
                        <Badge variant="secondary" className="ml-auto text-xs bg-[#25252A] text-gray-400">
                          {msg.status}
                        </Badge>
                      </div>
                      {msg.subject && (
                        <p className="text-sm font-medium text-white mb-1">{msg.subject}</p>
                      )}
                      {msg.body && (
                        <p className="text-sm text-gray-400 line-clamp-2">{msg.body}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        {msg.sentAt ? new Date(msg.sentAt).toLocaleString() : new Date(msg.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
