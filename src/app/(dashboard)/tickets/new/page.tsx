"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createTicket, getTeamUsers, getClientNames } from "@/actions/tickets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExternalLink } from "lucide-react";

type User = { id: string; name: string; avatar: string | null };
type ClientItem = { id: string; name: string };

export default function NewTicketPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<ClientItem[]>([]);

  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [customClient, setCustomClient] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [format, setFormat] = useState("");
  const [creativeType, setCreativeType] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [creativeBriefUrl, setCreativeBriefUrl] = useState("");
  const [deliveryLink, setDeliveryLink] = useState("");

  useEffect(() => {
    Promise.all([getTeamUsers(), getClientNames()]).then(([u, c]) => {
      setUsers(u);
      setClients(c);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const finalClientName =
      clientName === "__custom__" ? customClient : clientName;

    const result = await createTicket({
      title,
      clientName: finalClientName || undefined,
      assigneeId: assigneeId || undefined,
      format: (format || undefined) as
        | "STATIC" | "VIDEO" | "UGC" | "GIF" | "CAROUSEL" | "DPA_FRAME" | undefined,
      creativeType: (creativeType || undefined) as "NET_NEW" | "ITERATION" | undefined,
      priority: priority as "LOW" | "MEDIUM" | "HIGH" | "URGENT",
      dueDate: dueDate || undefined,
      creativeBriefUrl: creativeBriefUrl || undefined,
      deliveryLink: deliveryLink || undefined,
    });

    if (result.success && result.data) {
      router.push(`/tickets/${result.data.id}`);
    } else {
      setError(result.error || "Failed to create ticket");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Create Creative Ticket</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Ticket Title *</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g., Homepage Hero Banner Design" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Client Name</Label>
                <Select value={clientName} onValueChange={setClientName}>
                  <SelectTrigger><SelectValue placeholder="Select client..." /></SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                    ))}
                    <SelectItem value="__custom__">+ Add custom...</SelectItem>
                  </SelectContent>
                </Select>
                {clientName === "__custom__" && (
                  <Input placeholder="Enter client name..." value={customClient} onChange={(e) => setCustomClient(e.target.value)} autoFocus />
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Assignee</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger><SelectValue placeholder="Select assignee..." /></SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Format</Label>
                <Select value={format} onValueChange={setFormat}>
                  <SelectTrigger><SelectValue placeholder="Select format..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STATIC">Static</SelectItem>
                    <SelectItem value="VIDEO">Video</SelectItem>
                    <SelectItem value="UGC">UGC</SelectItem>
                    <SelectItem value="GIF">GIF</SelectItem>
                    <SelectItem value="CAROUSEL">Carousel</SelectItem>
                    <SelectItem value="DPA_FRAME">DPA Frame</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Creative Type</Label>
                <Select value={creativeType} onValueChange={setCreativeType}>
                  <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NET_NEW">Net New</SelectItem>
                    <SelectItem value="ITERATION">Iteration</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Urgency</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="briefUrl">Creative Brief <span className="text-xs text-muted-foreground">(Google Doc link)</span></Label>
              <div className="flex gap-2">
                <Input id="briefUrl" value={creativeBriefUrl} onChange={(e) => setCreativeBriefUrl(e.target.value)} placeholder="https://docs.google.com/..." />
                {creativeBriefUrl && (
                  <Button type="button" variant="outline" size="icon" asChild>
                    <a href={creativeBriefUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a>
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deliveryLink">Creative Delivery Link</Label>
              <Input id="deliveryLink" value={deliveryLink} onChange={(e) => setDeliveryLink(e.target.value)} placeholder="Link to final deliverable..." />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create Ticket"}</Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
