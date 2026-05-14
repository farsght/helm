"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Bot,
  Building2,
  CalendarClock,
  ChevronRightIcon,
  Contact,
  Database,
  FileText,
  HandCoins,
  HeartPulse,
  LayoutDashboard,
  Layers,
  MegaphoneIcon,
  MessageSquare,
  Network,
  Plug,
  ScrollText,
  Settings,
  Target,
  Workflow,
  NotebookText,
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";

type NavItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
};

type NavGroup = {
  title: string;
  defaultOpen: boolean;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    title: "Insights",
    defaultOpen: true,
    items: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard },
      { title: "Analytics", url: "/analytics", icon: BarChart3 },
    ],
  },
  {
    title: "Outreach",
    defaultOpen: true,
    items: [
      { title: "Campaigns", url: "/campaigns", icon: Target },
      { title: "Templates", url: "/templates", icon: FileText },
      { title: "Conversations", url: "/conversations", icon: MessageSquare },
    ],
  },
  {
    title: "Audience",
    defaultOpen: true,
    items: [
      { title: "Companies", url: "/companies", icon: Building2 },
      { title: "Contacts", url: "/contacts", icon: Contact },
      { title: "Deals", url: "/deals", icon: HandCoins },
      { title: "Segments", url: "/segments", icon: Layers },
    ],
  },
  {
    title: "Agents",
    defaultOpen: true,
    items: [
      { title: "Library", url: "/agents", icon: Bot },
      { title: "Skills", url: "/skills", icon: BookOpen },
      { title: "Runs", url: "/agents/runs", icon: Activity },
    ],
  },
  {
    title: "Integrations",
    defaultOpen: false,
    items: [
      { title: "MCP Servers", url: "/integrations/mcp-servers", icon: Plug },
      { title: "Connections", url: "/integrations/connections", icon: Network },
    ],
  },
  {
    title: "Ops",
    defaultOpen: true,
    items: [
      { title: "Datasets", url: "/datasets", icon: Database },
      { title: "Pipelines", url: "/pipelines", icon: Workflow },
      { title: "Notebooks", url: "/notebooks", icon: NotebookText },
      { title: "Events", url: "/events", icon: CalendarClock },
      { title: "Intent Signals", url: "/intent-signals", icon: Activity },
    ],
  },
  {
    title: "Monitoring",
    defaultOpen: false,
    items: [
      { title: "Health", url: "/monitoring/health", icon: HeartPulse },
      { title: "Logs", url: "/monitoring/logs", icon: ScrollText },
      { title: "Alerts", url: "/monitoring/alerts", icon: AlertTriangle },
    ],
  },
];

function isItemActive(pathname: string, url: string): boolean {
  if (url === "/") return pathname === "/";
  return pathname === url || pathname.startsWith(`${url}/`);
}

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <MegaphoneIcon className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-medium">Helm</span>
                  <span className="text-xs text-muted-foreground">
                    Marketing OS
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {navGroups.map((group) => (
          <Collapsible
            key={group.title}
            defaultOpen={group.defaultOpen}
            className="group/collapsible"
          >
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="flex w-full items-center">
                  {group.title}
                  <ChevronRightIcon className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          isActive={isItemActive(pathname, item.url)}
                          tooltip={item.title}
                        >
                          <Link href={item.url}>
                            <item.icon className="size-4" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isItemActive(pathname, "/settings")}
              tooltip="Settings"
            >
              <Link href="/settings">
                <Settings className="size-4" />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="flex items-center justify-between gap-2 px-2 py-1 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-2">
          <UserButton />
          <ThemeToggle />
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
