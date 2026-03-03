import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Linkedin, Bot, Users, Webhook } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 mt-1">Configure your AI SDR platform</p>
      </div>

      <Tabs defaultValue="accounts" className="space-y-6">
        <TabsList className="bg-[#25252A] border border-[#3A3A40]">
          <TabsTrigger value="accounts">Connected Accounts</TabsTrigger>
          <TabsTrigger value="sending">Sending</TabsTrigger>
          <TabsTrigger value="ai">AI Configuration</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="space-y-4">
          <Card className="bg-[#25252A] border-[#3A3A40]">
            <CardHeader>
              <CardTitle className="text-white">Email Accounts</CardTitle>
              <CardDescription className="text-gray-400">
                Connect your email accounts for outbound campaigns
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-[#1B1B1F] border border-[#3A3A40]">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-blue-400" />
                  <div>
                    <p className="font-medium text-white">example@company.com</p>
                    <p className="text-sm text-gray-400">SMTP Connected</p>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-green-500/10 text-green-400">
                  Active
                </Badge>
              </div>
              <Button className="w-full bg-[#266DF0] hover:bg-[#1a5ac9] text-white">
                <Mail className="mr-2 h-4 w-4" />
                Connect Email Account
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-[#25252A] border-[#3A3A40]">
            <CardHeader>
              <CardTitle className="text-white">LinkedIn Accounts</CardTitle>
              <CardDescription className="text-gray-400">
                Connect LinkedIn for social outreach
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-[#266DF0] hover:bg-[#1a5ac9] text-white">
                <Linkedin className="mr-2 h-4 w-4" />
                Connect LinkedIn Account
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sending" className="space-y-4">
          <Card className="bg-[#25252A] border-[#3A3A40]">
            <CardHeader>
              <CardTitle className="text-white">Sending Limits</CardTitle>
              <CardDescription className="text-gray-400">
                Configure daily sending limits and schedules
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">Sending configuration options will appear here</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="space-y-4">
          <Card className="bg-[#25252A] border-[#3A3A40]">
            <CardHeader>
              <CardTitle className="text-white">AI Configuration</CardTitle>
              <CardDescription className="text-gray-400">
                Configure AI message generation and decision-making
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 p-4 rounded-lg bg-[#1B1B1F] border border-[#3A3A40]">
                <Bot className="h-5 w-5 text-purple-400" />
                <div className="flex-1">
                  <p className="font-medium text-white">OpenAI GPT-4</p>
                  <p className="text-sm text-gray-400">AI Model for message generation</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <Card className="bg-[#25252A] border-[#3A3A40]">
            <CardHeader>
              <CardTitle className="text-white">Team Members</CardTitle>
              <CardDescription className="text-gray-400">
                Manage team access and permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-[#266DF0] hover:bg-[#1a5ac9] text-white">
                <Users className="mr-2 h-4 w-4" />
                Invite Team Member
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <Card className="bg-[#25252A] border-[#3A3A40]">
            <CardHeader>
              <CardTitle className="text-white">Integrations</CardTitle>
              <CardDescription className="text-gray-400">
                Connect with your CRM and other tools
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-[#266DF0] hover:bg-[#1a5ac9] text-white">
                <Webhook className="mr-2 h-4 w-4" />
                Add Integration
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
