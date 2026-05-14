"use client"

import {
  BarChart3Icon,
  GlobeIcon,
  LayoutDashboardIcon,
  MegaphoneIcon,
  MousePointerClickIcon,
  RadioIcon,
  RepeatIcon,
  SettingsIcon,
  TargetIcon,
  TrendingUpIcon,
  UsersIcon,
} from "lucide-react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"

const navGroups = [
  {
    title: "Overview",
    items: [
      {
        title: "Dashboard",
        url: "#",
        icon: LayoutDashboardIcon,
        isActive: true,
      },
      { title: "Real-time", url: "#", icon: RadioIcon },
    ],
  },
  {
    title: "Acquisition",
    items: [
      { title: "Channels", url: "#", icon: GlobeIcon },
      { title: "Campaigns", url: "#", icon: MegaphoneIcon },
      { title: "Sources", url: "#", icon: TrendingUpIcon },
    ],
  },
  {
    title: "Engagement",
    items: [
      { title: "Events", url: "#", icon: MousePointerClickIcon },
      { title: "Conversions", url: "#", icon: TargetIcon },
      { title: "Retention", url: "#", icon: RepeatIcon },
    ],
  },
  {
    title: "Settings",
    items: [
      { title: "Users", url: "#", icon: UsersIcon },
      { title: "Configuration", url: "#", icon: SettingsIcon },
    ],
  },
]

export default function SidebarAnalyticsDashboard() {
  return (
    <section className="mx-auto w-full max-w-6xl p-4">
      <div className="overflow-hidden rounded-lg border bg-card">
        <SidebarProvider className="h-[700px] !min-h-0">
          <Sidebar className="border-r">
            <SidebarHeader>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton size="lg" asChild>
                    <a href="#">
                      <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                        <BarChart3Icon className="size-4" />
                      </div>
                      <div className="flex flex-col gap-0.5 leading-none">
                        <span className="font-medium">Analytics</span>
                        <span className="text-xs text-muted-foreground">Production</span>
                      </div>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
              {navGroups.map(group => (
                <SidebarGroup key={group.title}>
                  <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {group.items.map(item => (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton asChild isActive={item.isActive}>
                            <a href={item.url}>
                              <item.icon className="size-4" />
                              <span>{item.title}</span>
                            </a>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              ))}
            </SidebarContent>
            <SidebarRail />
          </Sidebar>

          <SidebarInset className="min-w-0 flex-1">
            <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="#">Section</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Page</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </header>
            <div className="flex flex-1 flex-col gap-4 p-4">
              <div className="grid auto-rows-min gap-4 md:grid-cols-3">
                <div className="aspect-video rounded-xl bg-muted/50" />
                <div className="aspect-video rounded-xl bg-muted/50" />
                <div className="aspect-video rounded-xl bg-muted/50" />
              </div>
              <div className="flex-1 rounded-xl bg-muted/50" />
            </div>
          </SidebarInset>
        </SidebarProvider>
      </div>
    </section>
  )
}
