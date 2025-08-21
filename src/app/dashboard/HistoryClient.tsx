"use client";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Download, Filter } from "lucide-react";

type Item = {
  id: string;
  action: string;
  sender: string;
  fromEmail: string;
  method?: string | null;
  count?: number | null;
  createdAt: string;
};

export default function HistoryClient() {
  const [type, setType] = useState<string>("all");
  const [items, setItems] = useState<Item[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const queryType = type === "all" ? "" : type;
      const res = await fetch(`/api/history?type=${encodeURIComponent(queryType)}&page=${page}`);
      const data = await res.json();
      console.log("HistoryClient received data:", data); // Debug log
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (error) {
      console.error("Failed to load history:", error);
    } finally {
      setLoading(false);
    }
  }, [type, page]);

  useEffect(() => { 
    load(); 
  }, [load]);

  const handleTypeChange = (newType: string) => {
    setPage(1);
    setType(newType);
  };

  const exportToCsv = () => {
    const rows = [
      ["Date", "Sender", "From", "Action", "Method", "Count"],
      ...items.map(i => [
        new Date(i.createdAt).toISOString(), 
        i.sender || i.fromEmail || "Unknown", 
        i.fromEmail || "—", 
        i.action, 
        i.method ?? "", 
        String(i.count ?? "")
      ])
    ];
    const csv = rows.map(r => r.map((c) => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; 
    a.download = "unsub-hero-history.csv"; 
    a.click();
    URL.revokeObjectURL(url);
  };

  const pages = Math.max(1, Math.ceil(total / 25));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">History</h2>
          <p className="text-muted-foreground">
            View your unsubscribe and delete actions
          </p>
        </div>
        <Button onClick={exportToCsv} disabled={items.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Separator />

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={type} onValueChange={handleTypeChange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              <SelectItem value="unsubscribe">Unsubscribe</SelectItem>
              <SelectItem value="delete">Delete</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Action History</CardTitle>
          <CardDescription>
            {total} total actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Sender</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No actions found
                  </TableCell>
                </TableRow>
              ) : (
                items.map(i => (
                  <TableRow key={i.id}>
                    <TableCell>
                      <div className="font-medium">
                        {new Date(i.createdAt).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(i.createdAt).toLocaleTimeString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {i.sender || i.fromEmail || "Unknown"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {i.fromEmail || "—"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={i.action === "unsubscribe" ? "default" : "destructive"}
                        className={
                          i.action === "unsubscribe" 
                            ? "bg-green-100 text-green-800 hover:bg-green-100" 
                            : "bg-red-100 text-red-800 hover:bg-red-100"
                        }
                      >
                        {i.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {i.method ? (
                        <Badge 
                          variant="outline"
                          className={
                            i.method === "http" 
                              ? "bg-blue-100 text-blue-800 hover:bg-blue-100" 
                              : "bg-purple-100 text-purple-800 hover:bg-purple-100"
                          }
                        >
                          {i.method}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {i.count ? (
                        <Badge variant="secondary">{i.count}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((page - 1) * 25) + 1} to {Math.min(page * 25, total)} of {total} results
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
              Page {page} of {pages}
            </span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setPage(p => p + 1)} 
              disabled={page >= pages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}


