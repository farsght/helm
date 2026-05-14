export const dynamic = "force-dynamic";
import { Card } from "@/components/ui/card";
import { Network } from "lucide-react";
import { PageHeader } from "@/components/page";

export default function ConnectionsPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <PageHeader
          title="Connections"
          description="Deterministic, platform-owned integrations — data syncs, enrichment APIs, email providers. Coming in Tier 3."
        />
      </div>
      <Card className="bg-card border-border p-12">
        <div className="text-center">
          <Network className="h-12 w-12 text-muted-foreground/60 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">Connections coming soon</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            HubSpot sync, Apollo enrichment, Obsidian vault, and your existing data pipeline will land here. For now, MCP Servers covers agent-mediated access.
          </p>
        </div>
      </Card>
    </div>
  );
}
