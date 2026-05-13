"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { UserButton } from "@clerk/nextjs";
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
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Campaigns", href: "/campaigns", icon: Target },
  { name: "Prospects", href: "/prospects", icon: Users },
  { name: "Lists", href: "/lists", icon: List },
  { name: "Templates", href: "/templates", icon: FileText },
  { name: "Conversations", href: "/conversations", icon: MessageSquare },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K for search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      // Escape to close search
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setSearchQuery("");
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredNav = navigation.filter(item =>
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
          "flex h-full flex-col bg-[#1B1B1F] border-r border-[#3A3A40] transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b border-[#3A3A40]">
          {!collapsed && <h1 className="text-xl font-bold text-white">AI SDR</h1>}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="text-gray-400 hover:text-white hover:bg-[#25252A]"
          >
            <ChevronLeft className={cn("h-5 w-5 transition-transform", collapsed && "rotate-180")} />
          </Button>
        </div>
        
        {!collapsed && (
          <div className="px-3 py-3">
            <Button
              variant="outline"
              className="w-full justify-start gap-2 border-[#3A3A40] text-gray-400 hover:text-white hover:bg-[#25252A]"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="h-4 w-4" />
              <span>Search</span>
              <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-[#3A3A40] bg-[#25252A] px-1.5 font-mono text-[10px] font-medium text-gray-400">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>
          </div>
        )}

        <nav className="flex-1 space-y-1 px-3 py-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-[#266DF0] text-white"
                    : "text-gray-400 hover:bg-[#25252A] hover:text-white",
                  collapsed && "justify-center"
                )}
                title={collapsed ? item.name : undefined}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && item.name}
              </Link>
            );
          })}
        </nav>

        <div className={cn("p-4 border-t border-[#3A3A40] flex items-center", collapsed ? "justify-center" : "gap-3")}>
          <UserButton />
          {!collapsed && (
            <div className="text-xs text-gray-500">
              <p className="mb-1">Keyboard Shortcuts:</p>
              <p><kbd className="text-gray-400">⌘K</kbd> Search</p>
              <p><kbd className="text-gray-400">Esc</kbd> Close panels</p>
            </div>
          )}
        </div>
      </div>

      {/* Search Dialog */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="bg-[#1B1B1F] border-[#3A3A40] text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Quick Search</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search pages, campaigns, prospects..."
              className="bg-[#25252A] border-[#3A3A40] text-white"
              autoFocus
            />
            <div className="space-y-1">
              {filteredNav.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">No results found</p>
              ) : (
                filteredNav.map((item) => (
                  <button
                    key={item.href}
                    onClick={() => handleSearchSelect(item.href)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left hover:bg-[#25252A] transition-colors"
                  >
                    <item.icon className="h-5 w-5 text-gray-400" />
                    <span className="text-white">{item.name}</span>
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
