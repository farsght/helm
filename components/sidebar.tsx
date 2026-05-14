"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { UserButton } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  LayoutDashboard,
  Target,
  Users,
  List,
  FileText,
  MessageSquare,
  BarChart3,
  Settings,
  ChevronLeft,
  Search,
  Database,
  GitFork,
  BookOpen,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type NavItem = { name: string; href: string; icon: React.ComponentType<{ className?: string }> };
type NavSection = { label: string | null; items: NavItem[] };

const navSections: NavSection[] = [
  {
    label: null,
    items: [
      { name: "Dashboard", href: "/", icon: LayoutDashboard },
    ],
  },
  {
    label: "Outreach",
    items: [
      { name: "Campaigns", href: "/campaigns", icon: Target },
      { name: "Prospects", href: "/prospects", icon: Users },
      { name: "Segments", href: "/segments", icon: List },
      { name: "Templates", href: "/templates", icon: FileText },
      { name: "Conversations", href: "/conversations", icon: MessageSquare },
    ],
  },
  {
    label: "Insights",
    items: [
      { name: "Analytics", href: "/analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Ops",
    items: [
      { name: "Datasets", href: "/datasets", icon: Database },
      { name: "Pipelines", href: "/pipelines", icon: GitFork },
      { name: "Notebooks", href: "/notebooks", icon: BookOpen },
      { name: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

const allNavItems = navSections.flatMap((s) => s.items);

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setSearchQuery("");
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredNav = allNavItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSearchSelect = (href: string) => {
    router.push(href);
    setSearchOpen(false);
    setSearchQuery("");
  };

  return (
    <>
      <div
        className={cn(
          "flex h-full flex-col border-r border-border transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b border-border">
          {!collapsed && <h1 className="text-xl font-bold text-foreground">Helm</h1>}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="text-foreground hover:text-foreground hover:bg-card"
          >
            <ChevronLeft className={cn("h-5 w-5 transition-transform", collapsed && "rotate-180")} />
          </Button>
        </div>

        {!collapsed && (
          <div className="px-3 py-3">
            <Button
              variant="outline"
              className="w-full justify-start gap-2 border-border text-muted-foreground hover:text-foreground hover:bg-card"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="h-4 w-4" />
              <span>Search</span>
              <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-card px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
          {navSections.map((section, si) => (
            <div key={si}>
              {section.label && !collapsed && (
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  {section.label}
                </p>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary text-foreground"
                          : "text-muted-foreground hover:bg-card hover:text-foreground",
                        collapsed && "justify-center"
                      )}
                      title={collapsed ? item.name : undefined}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!collapsed && item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className={cn("p-4 border-t border-border flex items-center", collapsed ? "flex-col gap-3" : "gap-3")}>
          <UserButton />
          <ThemeToggle />
          {!collapsed && (
            <div className="text-xs text-muted-foreground">
              <p className="mb-1">Keyboard Shortcuts:</p>
              <p><kbd className="text-muted-foreground">⌘K</kbd> Search</p>
              <p><kbd className="text-muted-foreground">Esc</kbd> Close panels</p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="bg-background border-border text-foreground max-w-2xl">
          <DialogHeader>
            <DialogTitle>Quick Search</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search pages, campaigns, prospects..."
              className="bg-card border-border text-foreground"
              autoFocus
            />
            <div className="space-y-1">
              {filteredNav.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">No results found</p>
              ) : (
                filteredNav.map((item) => (
                  <button
                    key={item.href}
                    onClick={() => handleSearchSelect(item.href)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left hover:bg-card transition-colors"
                  >
                    <item.icon className="h-5 w-5 text-muted-foreground" />
                    <span className="text-foreground">{item.name}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
