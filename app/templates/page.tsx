import { db } from "@/db";
import { templates } from "@/db/schema";
import { sql } from "drizzle-orm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Mail, Linkedin } from "lucide-react";

export default async function TemplatesPage() {
  const allTemplates = await db.select().from(templates).orderBy(sql`${templates.createdAt} DESC`);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Templates</h1>
          <p className="text-gray-400 mt-1">Manage your message templates</p>
        </div>
        <Button className="bg-[#266DF0] hover:bg-[#1a5ac9] text-white">
          <Plus className="mr-2 h-4 w-4" />
          Create Template
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {allTemplates.map((template) => (
          <Card key={template.id} className="bg-[#25252A] border-[#3A3A40] hover:border-[#266DF0] transition-colors">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {template.channel === 'email' ? (
                      <Mail className="h-4 w-4 text-blue-400" />
                    ) : (
                      <Linkedin className="h-4 w-4 text-purple-400" />
                    )}
                    <CardTitle className="text-white">{template.name}</CardTitle>
                  </div>
                  {template.subject && (
                    <CardDescription className="text-gray-400 text-sm">
                      Subject: {template.subject}
                    </CardDescription>
                  )}
                </div>
                <Badge
                  variant="secondary"
                  className={
                    template.channel === 'email'
                      ? 'bg-blue-500/10 text-blue-400'
                      : 'bg-purple-500/10 text-purple-400'
                  }
                >
                  {template.channel}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-gray-400 line-clamp-3 bg-[#1B1B1F] p-3 rounded-md border border-[#3A3A40]">
                {template.body}
              </div>
              <div className="flex items-center gap-2">
                {template.variablesJson && JSON.parse(template.variablesJson).map((variable: string) => (
                  <Badge
                    key={variable}
                    variant="secondary"
                    className="bg-[#266DF0]/10 text-[#266DF0] text-xs"
                  >
                    {variable}
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="flex-1 text-gray-400 hover:text-white hover:bg-[#3A3A40]"
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  className="flex-1 bg-[#266DF0] hover:bg-[#1a5ac9] text-white"
                >
                  Use Template
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
