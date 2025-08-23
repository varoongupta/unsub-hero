"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useClerk } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { User, Settings, LogOut } from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
  currentTab?: string;
}

export function AppShell({ children, currentTab = "senders" }: AppShellProps) {
  const { signOut } = useClerk();
  const [isGmailConnected, setIsGmailConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check Gmail connection status on component mount
  useEffect(() => {
    const checkGmailStatus = async () => {
      try {
        const response = await fetch("/api/gmail/status");
        if (response.ok) {
          const data = await response.json();
          setIsGmailConnected(data.connected);
        }
      } catch (error) {
        console.error("Error checking Gmail status:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkGmailStatus();
  }, []);

  const handleSignOut = () => {
    signOut();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex h-16 items-center justify-between">
            {/* Logo and Navigation */}
            <div className="flex items-center space-x-6">
              <Link href="/dashboard" className="flex items-center space-x-2">
                <h1 className="text-xl font-semibold">Unsub Hero</h1>
              </Link>
              
              <Tabs value={currentTab} className="w-auto">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="senders" asChild>
                    <Link href="/dashboard?tab=senders">Senders</Link>
                  </TabsTrigger>
                  <TabsTrigger value="history" asChild>
                    <Link href="/dashboard?tab=history">History</Link>
                  </TabsTrigger>
                  <TabsTrigger value="settings" asChild>
                    <Link href="/dashboard?tab=settings">Settings</Link>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Right side actions */}
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                Go Pro
              </Button>
              {!isLoading && (
                <Button size="sm" asChild>
                  <Link href="/api/gmail/start">
                    {isGmailConnected ? "Connected" : "Connect Gmail"}
                  </Link>
                </Button>
              )}
              
              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="relative h-8 w-8 rounded-full">
                    <User className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard?tab=settings">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-6">
        {children}
      </main>
    </div>
  );
}
