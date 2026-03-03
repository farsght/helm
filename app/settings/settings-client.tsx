'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Mail, Linkedin, Trash2, CheckCircle, XCircle, Webhook } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

type ConnectedAccount = {
  id: number;
  type: string;
  name: string;
  status: string;
  configJson: string | null;
};

type Settings = {
  dailySendLimit: number;
  sendingStartHour: number;
  sendingEndHour: number;
  timezone: string;
  delayBetweenMessages: number;
  defaultModel: string;
  defaultTone: string;
  autoReply: boolean;
  maxAutoReplies: number;
  bannedTopics: string[];
  webhookUrl: string;
};

export function SettingsClient() {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [accountType, setAccountType] = useState<'email' | 'linkedin'>('email');
  const [accountForm, setAccountForm] = useState({
    name: '',
    email: '',
    password: '',
    smtpHost: '',
    smtpPort: '587',
    linkedinSession: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [accountsRes, settingsRes] = await Promise.all([
        fetch('/api/settings/accounts'),
        fetch('/api/settings/general'),
      ]);
      const accountsData = await accountsRes.json();
      const settingsData = await settingsRes.json();
      setAccounts(accountsData);
      setSettings(settingsData);
    } catch (err) {
      console.error('Load settings error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAccount = async () => {
    try {
      const config = accountType === 'email' ? {
        email: accountForm.email,
        password: accountForm.password,
        smtpHost: accountForm.smtpHost,
        smtpPort: parseInt(accountForm.smtpPort),
      } : {
        sessionToken: accountForm.linkedinSession,
      };

      const response = await fetch('/api/settings/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: accountType,
          name: accountForm.name,
          config,
        }),
      });

      if (!response.ok) throw new Error('Failed to add account');

      setShowAccountDialog(false);
      setAccountForm({ name: '', email: '', password: '', smtpHost: '', smtpPort: '587', linkedinSession: '' });
      loadData();
    } catch (err) {
      console.error('Add account error:', err);
      alert('Failed to add account');
    }
  };

  const handleDeleteAccount = async (id: number) => {
    if (!confirm('Delete this account?')) return;
    try {
      const response = await fetch(`/api/settings/accounts/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete account');
      loadData();
    } catch (err) {
      console.error('Delete account error:', err);
      alert('Failed to delete account');
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const response = await fetch('/api/settings/general', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!response.ok) throw new Error('Failed to save settings');
      alert('Settings saved successfully!');
    } catch (err) {
      console.error('Save settings error:', err);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-gray-400">Loading settings...</div>;
  }

  if (!settings) {
    return <div className="p-8 text-gray-400">Failed to load settings</div>;
  }

  return (
    <>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Settings</h1>
          <p className="text-gray-400 mt-1">Manage your account settings and preferences</p>
        </div>

        <Tabs defaultValue="accounts" className="space-y-6">
          <TabsList className="bg-[#25252A] border border-[#3A3A40]">
            <TabsTrigger value="accounts">Accounts</TabsTrigger>
            <TabsTrigger value="sending">Sending</TabsTrigger>
            <TabsTrigger value="ai">AI</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
          </TabsList>

          {/* Accounts Tab */}
          <TabsContent value="accounts" className="space-y-6">
            <Card className="bg-[#25252A] border-[#3A3A40]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white">Connected Accounts</CardTitle>
                    <CardDescription className="text-gray-400">
                      Manage your email and LinkedIn accounts
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => setShowAccountDialog(true)}
                    className="bg-[#266DF0] hover:bg-[#1a5ac9]"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Account
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {accounts.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400 mb-4">No accounts connected yet</p>
                    <Button onClick={() => setShowAccountDialog(true)} variant="outline" className="border-[#3A3A40]">
                      Connect your first account
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {accounts.map((account) => (
                      <div
                        key={account.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-[#1B1B1F] border border-[#3A3A40]"
                      >
                        <div className="flex items-center gap-3">
                          {account.type === 'email' ? (
                            <Mail className="h-5 w-5 text-blue-400" />
                          ) : (
                            <Linkedin className="h-5 w-5 text-purple-400" />
                          )}
                          <div>
                            <p className="font-medium text-white">{account.name}</p>
                            <p className="text-sm text-gray-400">{account.type}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge
                            className={
                              account.status === 'active'
                                ? 'bg-green-500/10 text-green-500'
                                : account.status === 'error'
                                ? 'bg-red-500/10 text-red-500'
                                : 'bg-gray-500/10 text-gray-400'
                            }
                          >
                            {account.status === 'active' && <CheckCircle className="mr-1 h-3 w-3" />}
                            {account.status === 'error' && <XCircle className="mr-1 h-3 w-3" />}
                            {account.status}
                          </Badge>
                          <Button
                            onClick={() => handleDeleteAccount(account.id)}
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sending Tab */}
          <TabsContent value="sending" className="space-y-6">
            <Card className="bg-[#25252A] border-[#3A3A40]">
              <CardHeader>
                <CardTitle className="text-white">Sending Settings</CardTitle>
                <CardDescription className="text-gray-400">
                  Control when and how messages are sent
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <Label htmlFor="daily-limit" className="text-gray-400">Daily Send Limit</Label>
                    <Input
                      id="daily-limit"
                      type="number"
                      value={settings.dailySendLimit}
                      onChange={(e) => setSettings({ ...settings, dailySendLimit: parseInt(e.target.value) })}
                      className="bg-[#1B1B1F] border-[#3A3A40] text-white mt-2"
                    />
                    <p className="text-xs text-gray-500 mt-1">Maximum messages to send per day</p>
                  </div>

                  <div>
                    <Label htmlFor="timezone" className="text-gray-400">Timezone</Label>
                    <Select
                      value={settings.timezone}
                      onValueChange={(value) => setSettings({ ...settings, timezone: value })}
                    >
                      <SelectTrigger className="bg-[#1B1B1F] border-[#3A3A40] text-white mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/New_York">Eastern Time</SelectItem>
                        <SelectItem value="America/Chicago">Central Time</SelectItem>
                        <SelectItem value="America/Denver">Mountain Time</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <Label htmlFor="start-hour" className="text-gray-400">Sending Start Hour</Label>
                    <Input
                      id="start-hour"
                      type="number"
                      min="0"
                      max="23"
                      value={settings.sendingStartHour}
                      onChange={(e) => setSettings({ ...settings, sendingStartHour: parseInt(e.target.value) })}
                      className="bg-[#1B1B1F] border-[#3A3A40] text-white mt-2"
                    />
                    <p className="text-xs text-gray-500 mt-1">Hour to start sending (0-23)</p>
                  </div>

                  <div>
                    <Label htmlFor="end-hour" className="text-gray-400">Sending End Hour</Label>
                    <Input
                      id="end-hour"
                      type="number"
                      min="0"
                      max="23"
                      value={settings.sendingEndHour}
                      onChange={(e) => setSettings({ ...settings, sendingEndHour: parseInt(e.target.value) })}
                      className="bg-[#1B1B1F] border-[#3A3A40] text-white mt-2"
                    />
                    <p className="text-xs text-gray-500 mt-1">Hour to stop sending (0-23)</p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="delay" className="text-gray-400">Delay Between Messages (seconds)</Label>
                  <Input
                    id="delay"
                    type="number"
                    value={settings.delayBetweenMessages}
                    onChange={(e) => setSettings({ ...settings, delayBetweenMessages: parseInt(e.target.value) })}
                    className="bg-[#1B1B1F] border-[#3A3A40] text-white mt-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">Delay to avoid rate limiting</p>
                </div>

                <Button onClick={handleSaveSettings} disabled={saving} className="bg-[#266DF0] hover:bg-[#1a5ac9]">
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Tab */}
          <TabsContent value="ai" className="space-y-6">
            <Card className="bg-[#25252A] border-[#3A3A40]">
              <CardHeader>
                <CardTitle className="text-white">AI Configuration</CardTitle>
                <CardDescription className="text-gray-400">
                  Configure AI behavior and guardrails
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <Label htmlFor="model" className="text-gray-400">Default AI Model</Label>
                    <Select
                      value={settings.defaultModel}
                      onValueChange={(value) => setSettings({ ...settings, defaultModel: value })}
                    >
                      <SelectTrigger className="bg-[#1B1B1F] border-[#3A3A40] text-white mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gpt-4o-mini">GPT-4o Mini (Fast)</SelectItem>
                        <SelectItem value="gpt-4o">GPT-4o (Balanced)</SelectItem>
                        <SelectItem value="gpt-4-turbo">GPT-4 Turbo (Best)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="tone" className="text-gray-400">Default Tone</Label>
                    <Select
                      value={settings.defaultTone}
                      onValueChange={(value) => setSettings({ ...settings, defaultTone: value })}
                    >
                      <SelectTrigger className="bg-[#1B1B1F] border-[#3A3A40] text-white mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="friendly">Friendly</SelectItem>
                        <SelectItem value="direct">Direct</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-[#1B1B1F] border border-[#3A3A40]">
                  <div>
                    <p className="font-medium text-white">Auto-Reply to Prospects</p>
                    <p className="text-sm text-gray-400">Allow AI to automatically reply to prospect messages</p>
                  </div>
                  <Switch
                    checked={settings.autoReply}
                    onCheckedChange={(checked) => setSettings({ ...settings, autoReply: checked })}
                  />
                </div>

                <div>
                  <Label htmlFor="max-replies" className="text-gray-400">Max Auto-Replies per Conversation</Label>
                  <Input
                    id="max-replies"
                    type="number"
                    value={settings.maxAutoReplies}
                    onChange={(e) => setSettings({ ...settings, maxAutoReplies: parseInt(e.target.value) })}
                    className="bg-[#1B1B1F] border-[#3A3A40] text-white mt-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">Limit auto-replies to prevent runaway conversations</p>
                </div>

                <div>
                  <Label htmlFor="banned-topics" className="text-gray-400">Banned Topics</Label>
                  <Textarea
                    id="banned-topics"
                    value={settings.bannedTopics.join(', ')}
                    onChange={(e) => setSettings({ ...settings, bannedTopics: e.target.value.split(',').map(t => t.trim()) })}
                    rows={3}
                    className="bg-[#1B1B1F] border-[#3A3A40] text-white mt-2 resize-none"
                    placeholder="e.g., politics, religion, pricing"
                  />
                  <p className="text-xs text-gray-500 mt-1">Comma-separated list of topics AI should avoid</p>
                </div>

                <Button onClick={handleSaveSettings} disabled={saving} className="bg-[#266DF0] hover:bg-[#1a5ac9]">
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Team Tab */}
          <TabsContent value="team" className="space-y-6">
            <Card className="bg-[#25252A] border-[#3A3A40]">
              <CardHeader>
                <CardTitle className="text-white">Team Members</CardTitle>
                <CardDescription className="text-gray-400">
                  Manage team access and permissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <p className="text-gray-400 mb-2">Team management coming soon</p>
                  <p className="text-sm text-gray-500">Invite team members and assign roles</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integrations Tab */}
          <TabsContent value="integrations" className="space-y-6">
            <Card className="bg-[#25252A] border-[#3A3A40]">
              <CardHeader>
                <CardTitle className="text-white">Integrations</CardTitle>
                <CardDescription className="text-gray-400">
                  Connect with external tools and services
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="webhook" className="text-gray-400">Webhook URL</Label>
                  <Input
                    id="webhook"
                    type="url"
                    value={settings.webhookUrl}
                    onChange={(e) => setSettings({ ...settings, webhookUrl: e.target.value })}
                    placeholder="https://your-webhook-endpoint.com/webhook"
                    className="bg-[#1B1B1F] border-[#3A3A40] text-white mt-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">Receive notifications when prospects reply or book meetings</p>
                </div>

                <div className="p-4 rounded-lg bg-[#1B1B1F] border border-[#3A3A40]">
                  <div className="flex items-start gap-3">
                    <Webhook className="h-5 w-5 text-gray-400 mt-1" />
                    <div>
                      <p className="font-medium text-white">CRM Integration</p>
                      <p className="text-sm text-gray-400 mt-1">Sync prospects with Salesforce, HubSpot, or Pipedrive</p>
                      <Button variant="outline" className="border-[#3A3A40] mt-3" disabled>
                        Coming Soon
                      </Button>
                    </div>
                  </div>
                </div>

                <Button onClick={handleSaveSettings} disabled={saving} className="bg-[#266DF0] hover:bg-[#1a5ac9]">
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Account Dialog */}
      <Dialog open={showAccountDialog} onOpenChange={setShowAccountDialog}>
        <DialogContent className="bg-[#1B1B1F] border-[#3A3A40] text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-gray-400">Account Type</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Button
                  variant={accountType === 'email' ? 'default' : 'outline'}
                  className={accountType === 'email' ? 'bg-[#266DF0]' : 'border-[#3A3A40]'}
                  onClick={() => setAccountType('email')}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Email
                </Button>
                <Button
                  variant={accountType === 'linkedin' ? 'default' : 'outline'}
                  className={accountType === 'linkedin' ? 'bg-[#266DF0]' : 'border-[#3A3A40]'}
                  onClick={() => setAccountType('linkedin')}
                >
                  <Linkedin className="mr-2 h-4 w-4" />
                  LinkedIn
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="account-name" className="text-gray-400">Account Name</Label>
              <Input
                id="account-name"
                value={accountForm.name}
                onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                placeholder="e.g., Main Email, Work LinkedIn"
                className="bg-[#25252A] border-[#3A3A40] text-white mt-2"
              />
            </div>

            {accountType === 'email' ? (
              <>
                <div>
                  <Label htmlFor="email" className="text-gray-400">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={accountForm.email}
                    onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
                    className="bg-[#25252A] border-[#3A3A40] text-white mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="password" className="text-gray-400">Password / App Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={accountForm.password}
                    onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })}
                    className="bg-[#25252A] border-[#3A3A40] text-white mt-2"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="smtp-host" className="text-gray-400">SMTP Host</Label>
                    <Input
                      id="smtp-host"
                      value={accountForm.smtpHost}
                      onChange={(e) => setAccountForm({ ...accountForm, smtpHost: e.target.value })}
                      placeholder="smtp.gmail.com"
                      className="bg-[#25252A] border-[#3A3A40] text-white mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="smtp-port" className="text-gray-400">SMTP Port</Label>
                    <Input
                      id="smtp-port"
                      value={accountForm.smtpPort}
                      onChange={(e) => setAccountForm({ ...accountForm, smtpPort: e.target.value })}
                      className="bg-[#25252A] border-[#3A3A40] text-white mt-2"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div>
                <Label htmlFor="linkedin-session" className="text-gray-400">LinkedIn Session Token</Label>
                <Textarea
                  id="linkedin-session"
                  value={accountForm.linkedinSession}
                  onChange={(e) => setAccountForm({ ...accountForm, linkedinSession: e.target.value })}
                  rows={4}
                  placeholder="Paste your LinkedIn session cookie here"
                  className="bg-[#25252A] border-[#3A3A40] text-white mt-2 resize-none font-mono text-xs"
                />
                <p className="text-xs text-gray-500 mt-1">
                  For now, this is simulated. Real implementation requires browser automation.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowAccountDialog(false)} variant="outline" className="border-[#3A3A40]">
              Cancel
            </Button>
            <Button onClick={handleAddAccount} className="bg-[#266DF0] hover:bg-[#1a5ac9]">
              Add Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
