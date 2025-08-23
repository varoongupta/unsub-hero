"use client";
import { useEffect, useMemo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Search, Trash2, Mail, ExternalLink, MoreHorizontal, Check } from "lucide-react";

type Sender = {
  id: string;
  from: string;
  fromEmail: string;
  listUnsub?: string;
  count: number;
  hasHttp: boolean;
  hasMailto: boolean;
};

export default function SendersClient() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [loading, setLoading] = useState(true); // Start with loading true
  const [allSenders, setAllSenders] = useState<Sender[]>([]); // All senders from API
  const [senders, setSenders] = useState<Sender[]>([]); // Filtered senders for display
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [doing, setDoing] = useState<"unsub" | "trash" | "both" | null>(null);
  const [showProgress, setShowProgress] = useState(false);
  const [progress, setProgress] = useState(0);
  const [provider, setProvider] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/senders/list?page=${page}&pageSize=${pageSize}`);
      const data = await res.json();
      setAllSenders(data.senders ?? []);
      setTotal(data.total ?? 0);
    } catch {
      toast.error("Failed to load senders");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  // Filter senders locally based on search query and provider
  useEffect(() => {
    let filtered = allSenders;
    
    // Filter by search query
    if (q.trim()) {
      const searchTerm = q.toLowerCase();
      filtered = filtered.filter(s => 
        s.from?.toLowerCase().includes(searchTerm) || 
        s.fromEmail.toLowerCase().includes(searchTerm)
      );
    }
    
    // Filter by provider (if needed in the future)
    if (provider !== "all") {
      // Add provider filtering logic here when needed
    }
    
    setSenders(filtered);
    setPage(1); // Reset to first page when filtering
  }, [allSenders, q, provider]);

  // Get paginated senders for display
  const paginatedSenders = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return senders.slice(startIndex, endIndex);
  }, [senders, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  const selectedSenders = useMemo(() => senders.filter((s) => selected[s.fromEmail]), [senders, selected]);
  const hasSelection = selectedSenders.length > 0;

  const handleUnsubscribe = async () => {
    const items = selectedSenders
      .filter((s) => s.listUnsub)
      .map((s) => ({ 
        listUnsub: s.listUnsub!, 
        sender: s.from || s.fromEmail,
        fromEmail: s.fromEmail 
      }));
    
    if (items.length === 0) return;
    
    setDoing("unsub");
    setShowProgress(true);
    setProgress(0);
    
    try {
      const res = await fetch("/api/unsubscribe", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ items }) 
      });
      
      if (res.ok) {
        toast.success(`Unsubscribed from ${items.length} sender(s)`);
        setSelected({});
        load();
      } else {
        toast.error("Failed to unsubscribe. Please try again.");
      }
    } catch (error) {
      toast.error("Error: " + error);
    } finally {
      setDoing(null);
      setShowProgress(false);
      setProgress(0);
    }
  };

  const handleTrash = async () => {
    const fromEmails = selectedSenders.map((s) => s.fromEmail);
    if (fromEmails.length === 0) return;
    
    setDoing("trash");
    setShowProgress(true);
    setProgress(0);
    
    try {
      const res = await fetch("/api/delete", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ fromEmails }) 
      });
      
      if (res.ok) {
        const data = await res.json();
        const totalDeleted = Object.values(data.deletedCountBySender || {}).reduce((sum: number, count: unknown) => sum + (typeof count === 'number' ? count : 0), 0);
        toast.success(`Moved ${totalDeleted} messages to Trash`);
        setSelected({});
        load();
      } else {
        toast.error("Failed to move messages to trash. Please try again.");
      }
    } catch (error) {
      toast.error("Error: " + error);
    } finally {
      setDoing(null);
      setShowProgress(false);
      setProgress(0);
    }
  };

  const handleBoth = async () => {
    const items = selectedSenders
      .filter((s) => s.listUnsub)
      .map((s) => ({ 
        listUnsub: s.listUnsub!, 
        sender: s.from || s.fromEmail,
        fromEmail: s.fromEmail 
      }));
    const fromEmails = selectedSenders.map((s) => s.fromEmail);
    
    if (items.length === 0 && fromEmails.length === 0) return;
    
    setDoing("both");
    setShowProgress(true);
    setProgress(0);
    
    try {
      // First unsubscribe
      if (items.length > 0) {
        const unsubRes = await fetch("/api/unsubscribe", { 
          method: "POST", 
          headers: { "Content-Type": "application/json" }, 
          body: JSON.stringify({ items }) 
        });
        if (!unsubRes.ok) {
          toast.error("Failed to unsubscribe. Please try again.");
          return;
        }
      }
      
      // Then trash
      if (fromEmails.length > 0) {
        const trashRes = await fetch("/api/delete", { 
          method: "POST", 
          headers: { "Content-Type": "application/json" }, 
          body: JSON.stringify({ fromEmails }) 
        });
        
        if (trashRes.ok) {
          const data = await trashRes.json();
          const totalDeleted = Object.values(data.deletedCountBySender || {}).reduce((sum: number, count: unknown) => sum + (typeof count === 'number' ? count : 0), 0);
          toast.success(`Unsubscribed and moved ${totalDeleted} messages to Trash`);
          setSelected({});
          load();
        } else {
          toast.error("Failed to move messages to trash. Please try again.");
        }
      } else {
        toast.success(`Unsubscribed from ${items.length} sender(s)`);
        setSelected({});
        load();
      }
    } catch (error) {
      toast.error("Error: " + error);
    } finally {
      setDoing(null);
      setShowProgress(false);
      setProgress(0);
    }
  };

  const handleIndividualAction = async (sender: Sender, action: "unsubscribe" | "delete" | "both") => {
    if (action === "unsubscribe" && !sender.listUnsub) {
      toast.error("No unsubscribe method available for this sender");
      return;
    }

    try {
      if (action === "unsubscribe" || action === "both") {
        const items = [{ 
          listUnsub: sender.listUnsub!, 
          sender: sender.from || sender.fromEmail,
          fromEmail: sender.fromEmail 
        }];
        
        const res = await fetch("/api/unsubscribe", { 
          method: "POST", 
          headers: { "Content-Type": "application/json" }, 
          body: JSON.stringify({ items }) 
        });
        
        if (!res.ok) {
          toast.error("Failed to unsubscribe");
          return;
        }
      }

      if (action === "delete" || action === "both") {
        const res = await fetch("/api/delete", { 
          method: "POST", 
          headers: { "Content-Type": "application/json" }, 
          body: JSON.stringify({ fromEmails: [sender.fromEmail] }) 
        });
        
        if (!res.ok) {
          toast.error("Failed to delete messages");
          return;
        }
      }

      const actionText = action === "both" ? "Unsubscribed and deleted" : action === "unsubscribe" ? "Unsubscribed from" : "Deleted messages from";
      toast.success(`${actionText} ${sender.from || sender.fromEmail}`);
      load();
    } catch {
      toast.error("Error performing action");
    }
  };

  const handleSelectAll = (checked: boolean) => {
    const map: Record<string, boolean> = {};
    senders.forEach(s => map[s.fromEmail] = checked);
    setSelected(map);
  };

  const handleSelect = (fromEmail: string, checked: boolean) => {
    setSelected(prev => ({ ...prev, [fromEmail]: checked }));
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search senders..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-64"
          />
        </div>
        <Select value={provider} onValueChange={setProvider}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="gmail">Gmail</SelectItem>
            <SelectItem value="outlook">Outlook</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={load} disabled={loading}>
          Refresh
        </Button>
      </div>

      <Separator />

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <Button 
          onClick={handleUnsubscribe} 
          disabled={doing !== null || !hasSelection}
          aria-busy={doing === "unsub"}
        >
          <Mail className="mr-2 h-4 w-4" />
          Unsubscribe
        </Button>
        
        <Button 
          variant="outline"
          onClick={handleTrash} 
          disabled={doing !== null || !hasSelection}
          aria-busy={doing === "trash"}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="default"
              disabled={doing !== null || !hasSelection}
              aria-busy={doing === "both"}
            >
              <Check className="mr-2 h-4 w-4" />
              Both
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Unsubscribe and Delete?</AlertDialogTitle>
              <AlertDialogDescription>
                This will unsubscribe from the selected senders AND move their recent messages to Trash. 
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleBoth}>Unsubscribe & Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <span className="text-sm text-muted-foreground">
          {selectedSenders.length} selected
        </span>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Senders</CardTitle>
          <CardDescription>
            Email senders from the last 90 days with unsubscribe options
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            // Loading state for table only
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                <p className="text-lg font-medium">Loading senders...</p>
                <p className="text-sm text-muted-foreground">This may take a few moments</p>
              </div>
            </div>
          ) : senders.length === 0 ? (
            // Empty state
            <div className="text-center py-12">
              <p className="text-lg font-medium">No senders found</p>
              <p className="text-sm text-muted-foreground mb-4">
                No email senders found in your inbox. Try refreshing or check back later.
              </p>
              <Button variant="outline" onClick={load} disabled={loading}>
                Refresh
              </Button>
            </div>
          ) : (
            // Table content
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input 
                      type="checkbox" 
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      checked={senders.length > 0 && senders.every(s => selected[s.fromEmail])}
                      className="rounded border-gray-300"
                    />
                  </TableHead>
                  <TableHead>Sender</TableHead>
                  <TableHead>Count</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSenders.map((s) => (
                  <TableRow key={s.fromEmail}>
                    <TableCell>
                      <input 
                        type="checkbox" 
                        checked={!!selected[s.fromEmail]} 
                        onChange={(e) => handleSelect(s.fromEmail, e.target.checked)}
                        disabled={!s.listUnsub && doing !== "trash"}
                        className="rounded border-gray-300"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{s.from || s.fromEmail}</div>
                      <div className="text-sm text-muted-foreground">{s.fromEmail}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{s.count}</Badge>
                    </TableCell>
                    <TableCell>
                      {s.hasHttp ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                          <ExternalLink className="mr-1 h-3 w-3" />
                          HTTP
                        </Badge>
                      ) : s.hasMailto ? (
                        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                          <Mail className="mr-1 h-3 w-3" />
                          Mailto
                        </Badge>
                      ) : (
                        <Badge variant="outline">—</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {s.listUnsub && (
                            <DropdownMenuItem onClick={() => handleIndividualAction(s, "unsubscribe")}>
                              <Mail className="mr-2 h-4 w-4" />
                              Unsubscribe
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleIndividualAction(s, "delete")}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                          {s.listUnsub && (
                            <DropdownMenuItem onClick={() => handleIndividualAction(s, "both")}>
                              <Check className="mr-2 h-4 w-4" />
                              Both
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, senders.length)} of {senders.length} results
          {q.trim() && ` (filtered from ${total} total)`}
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))} 
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="text-sm">
            Page {page} of {Math.max(1, Math.ceil(senders.length / pageSize))}
          </span>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setPage(p => p + 1)} 
            disabled={page >= Math.ceil(senders.length / pageSize)}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Progress Dialog */}
      <Dialog open={showProgress} onOpenChange={setShowProgress}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {doing === "unsub" ? "Unsubscribing..." : 
               doing === "trash" ? "Moving to Trash..." : 
               "Processing..."}
            </DialogTitle>
            <DialogDescription>
              Please wait while we process your request.
            </DialogDescription>
          </DialogHeader>
          <Progress value={progress} className="w-full" />
        </DialogContent>
      </Dialog>
    </div>
  );
}


