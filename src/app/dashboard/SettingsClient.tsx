"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Mail, Trash2, Shield, ExternalLink, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function SettingsClient() {
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isGmailConnected, setIsGmailConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

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

  const handleDisconnectGmail = async () => {
    setIsDisconnecting(true);
    try {
      const response = await fetch("/api/gmail/disconnect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        setIsGmailConnected(false);
        toast.success("Gmail has been disconnected successfully");
      } else {
        toast.error("Failed to disconnect Gmail");
        console.error("Failed to disconnect Gmail");
      }
    } catch (error) {
      toast.error("Error disconnecting Gmail");
      console.error("Error disconnecting Gmail:", error);
    } finally {
      setIsDisconnecting(false);
    }
  };
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage your account and connected services
        </p>
      </div>

      <Separator />

      {/* Connected Accounts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Connected Accounts
          </CardTitle>
          <CardDescription>
            Manage your connected email accounts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isGmailConnected ? "bg-red-100" : "bg-gray-100"
              }`}>
                <Mail className={`h-5 w-5 ${
                  isGmailConnected ? "text-red-600" : "text-gray-400"
                }`} />
              </div>
              <div>
                <div className="font-medium">Gmail</div>
                <div className="text-sm text-muted-foreground">
                  {isLoading ? "Loading..." : isGmailConnected ? "Connected" : "Not connected"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isLoading ? (
                <div className="text-sm text-muted-foreground">Loading...</div>
              ) : isGmailConnected ? (
                <>
                  <Badge variant="secondary">Connected</Badge>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        Disconnect
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Disconnect Gmail?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove your Gmail connection and stop syncing your email data. 
                          You can reconnect at any time.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={handleDisconnectGmail}
                          disabled={isDisconnecting}
                        >
                          {isDisconnecting ? "Disconnecting..." : "Disconnect"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              ) : (
                <>
                  <Badge variant="outline">Disconnected</Badge>
                  <Button size="sm" asChild>
                    <a href="/api/gmail/start">Connect</a>
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Account Data
          </CardTitle>
          <CardDescription>
            Manage your account data and privacy
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <div className="font-medium">Delete My Data</div>
              <div className="text-sm text-muted-foreground">
                Permanently delete all your data and account
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Delete Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete All Data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your account 
                    and remove all your data from our servers, including:
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Email sender data</li>
                      <li>Action history</li>
                      <li>Account settings</li>
                      <li>Connected email accounts</li>
                    </ul>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete All Data
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* Privacy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy & Legal
          </CardTitle>
          <CardDescription>
            Privacy policy and terms of service
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <div className="font-medium">Privacy Policy</div>
              <div className="text-sm text-muted-foreground">
                Learn how we handle your data
              </div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href="/privacy" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                View
              </a>
            </Button>
          </div>
          
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <div className="font-medium">Terms of Service</div>
              <div className="text-sm text-muted-foreground">
                Read our terms and conditions
              </div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href="/terms" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                View
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


