"use client"

import {
  ArchiveIcon,
  ChevronRightIcon,
  FileTextIcon,
  FunnelIcon,
  ImageIcon,
  MailIcon,
  MegaphoneIcon,
  MousePointerClickIcon,
  PencilIcon,
  RocketIcon,
  SearchIcon,
  ShareIcon,
  TargetIcon,
  TrendingUpIcon,
} from "lucide-react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
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

const data = {
  groups: [
    {
      title: "Campaigns",
      defaultOpen: true,
      items: [
        { title: "Active", url: "#", icon: RocketIcon, isActive: true },
        { title: "Drafts", url: "#", icon: PencilIcon },
        { title: "Archived", url: "#", icon: ArchiveIcon },
      ],
    },
    {
      title: "Channels",
      defaultOpen: true,
      items: [
        { title: "Email", url: "#", icon: MailIcon },
        { title: "Social", url: "#", icon: ShareIcon },
        { title: "Ads", url: "#", icon: MousePointerClickIcon },
        { title: "SEO", url: "#", icon: SearchIcon },
      ],
    },
    {
      title: "Analytics",
      defaultOpen: false,
      items: [
        { title: "Funnel", url: "#", icon: FunnelIcon },
        { title: "Attribution", url: "#", icon: TargetIcon },
        { title: "ROI", url: "#", icon: TrendingUpIcon },
      ],
    },
    {
      title: "Assets",
      defaultOpen: false,
      items: [
        { title: "Templates", url: "#", icon: FileTextIcon },
        { title: "Media", url: "#", icon: ImageIcon },
      ],
    },
  ],
}

export default function SidebarMarketingHub() {
  return (
    <section className="mx-auto w-full max-w-6xl p-4">
      <div className="overflow-hidden rounded-lg border bg-card">
        <SidebarProvider className="h-[700px] !min-h-0">
          <Sidebar collapsible="icon" className="border-r">
            <SidebarHeader>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton size="lg" asChild>
                    <a href="#">
                      <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                        <MegaphoneIcon className="size-4" />
                      </div>
                      <div className="flex flex-col gap-0.5 leading-none">
                        <span className="font-medium">Marketing Hub</span>
                        <span className="text-xs">Acme Corp</span>
                      </div>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
              {data.groups.map(group => (
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
                          {group.items.map(item => (
                            <SidebarMenuItem key={item.title}>
                              <SidebarMenuButton
                                asChild
                                isActive={item.isActive}
                                tooltip={item.title}
                              >
                                <a href={item.url}>
                                  <item.icon className="size-4" />
                                  <span>{item.title}</span>
                                </a>
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
            <SidebarRail />
          </Sidebar>

          <SidebarInset className="min-w-0 flex-1">
            <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="#">Campaigns</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Active</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </header>

          </SidebarInset>
        </SidebarProvider>
      </div>
    </section>
  )
}
