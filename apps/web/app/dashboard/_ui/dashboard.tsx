"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createAuthClient } from "@workspace/auth/client";
import { Button } from "@workspace/ui/components/button";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@workspace/ui/components/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";

import { orpc, safe } from "@/lib/orpc";
import { CopyIcon, KeyIcon, Trash2Icon, Loader2Icon, CheckIcon, XIcon, ExternalLinkIcon } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

interface ApiKey {
  id: string;
  keyPrefix: string;
  name: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  revoked: boolean;
}

interface DashboardProps {
  user: {
    email?: string | null;
    name?: string | null;
    image?: string | null;
  };
}

function formatDate(date: Date | null): string {
  if (!date) return "Never";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function KeyCard({ apiKey, onRevoke, revoking }: { apiKey: ApiKey; onRevoke: (id: string) => void; revoking: boolean }) {
  return (
    <Card className="relative">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyIcon className="text-muted-foreground" size={16} />
            <code className="font-mono text-xs bg-muted px-2 py-1 rounded">{apiKey.keyPrefix}••••</code>
          </div>
          <span className={cn(
            "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
            apiKey.revoked
              ? "bg-destructive/10 text-destructive"
              : "bg-green-500/10 text-green-600 dark:text-green-400"
          )}>
            {apiKey.revoked ? "Revoked" : "Active"}
          </span>
        </div>
        <CardTitle className="text-sm font-medium mt-1">{apiKey.name}</CardTitle>
        <CardDescription className="text-xs">
          Created {formatDate(apiKey.createdAt)} · Last used {formatDate(apiKey.lastUsedAt)}
        </CardDescription>
      </CardHeader>
      <CardFooter className="flex justify-end gap-2 border-t pt-3">
        {!apiKey.revoked && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRevoke(apiKey.id)}
            disabled={revoking}
            className="gap-1"
          >
            {revoking ? (
              <>
                <Loader2Icon className="animate-spin" size={14} />
                Revoking...
              </>
            ) : (
              <>
                <Trash2Icon size={14} />
                Revoke
              </>
            )}
          </Button>
        )}
        {apiKey.revoked && (
          <Button variant="ghost" size="sm" disabled className="text-muted-foreground">
            <XIcon size={14} />
            Revoked
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

function EmptyState({ onAction }: { onAction: () => void }) {
  return (
    <Card className="text-center py-12 border-dashed">
      <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <KeyIcon className="text-muted-foreground" size={32} />
      </div>
      <h3 className="font-heading text-lg font-medium mb-2">No API keys yet</h3>
      <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">
        Create your first API key to start making authenticated requests to the API.
      </p>
      <Button onClick={onAction} size="lg" className="gap-2">
        <KeyIcon size={16} />
        Create your first API key
      </Button>
    </Card>
  );
}

function SkeletonKeyCard() {
  return (
    <Card>
      <CardHeader>
        <div className="h-5 w-24 bg-muted rounded animate-pulse mb-2" />
        <div className="h-4 w-32 bg-muted rounded animate-pulse" />
        <div className="h-3 w-20 bg-muted rounded animate-pulse mt-1" />
      </CardHeader>
      <CardFooter className="border-t pt-3">
        <div className="h-7 w-20 bg-muted rounded animate-pulse" />
      </CardFooter>
    </Card>
  );
}

export default function DashboardPageContents({ user }: DashboardProps) {
  const router = useRouter();
  const authClient = createAuthClient();
  const ref  = useRef(null)
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState<{ rawKey: string; prefix: string } | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const fetchKeys = async () => {
    const [err, data] = await safe(orpc.apiKey.list());
    if (!err && data) {
       
      setKeys(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/");
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return;
    setCreating(true);
    const [err, data] = await safe(orpc.apiKey.create({ name: newKeyName.trim() }));
    setCreating(false);
    if (!err && data) {
      setCreatedKey({ rawKey: data.apiKey, prefix: data.keyPrefix });
      setCreateDialogOpen(false);
      setNewKeyName("");
      fetchKeys();
    }
  };

  const handleRevokeKey = async (id: string) => {
    setRevokingId(id);
    const [err] = await safe(orpc.apiKey.revoke({ id }));
    if (!err) {
      fetchKeys();
    }
    setRevokingId(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCreatedKey(null);
  };
  if(!user) return null;
  const initials = user.name
    ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : (user.email?.[0]?.toUpperCase() || "U");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Manage your API keys and account settings</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleSignOut} className="gap-1">
          <ExternalLinkIcon size={14} />
          Sign Out
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium text-lg">
              {initials}
            </div>
            <div>
              <p className="font-medium">{user.name || "User"}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-lg font-medium">API Keys</h2>
          <Button onClick={() => setCreateDialogOpen(true)} className="gap-1">
            <KeyIcon size={14} />
            Create Key
          </Button>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SkeletonKeyCard />
            <SkeletonKeyCard />
            <SkeletonKeyCard />
          </div>
        ) : keys.length === 0 ? (
          <EmptyState onAction={() => setCreateDialogOpen(true)} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {keys.map((key) => (
              <KeyCard
                key={key.id}
                apiKey={key}
                onRevoke={handleRevokeKey}
                revoking={revokingId === key.id}
              />
            ))}
          </div>
        )}
      </div>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>Give your key a name to identify it later. The key will only be shown once.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <label htmlFor="key-name" className="text-sm font-medium">Key Name</label>
              <Input
                id="key-name"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g. Production Server"
                disabled={creating}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button onClick={handleCreateKey} disabled={creating || !newKeyName.trim()}>
              {creating ? (
                <>
                  <Loader2Icon className="animate-spin" size={14} />
                  Creating...
                </>
              ) : (
                <>
                  <KeyIcon size={14} />
                  Create Key
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {createdKey && (
        <Dialog open onOpenChange={(open) => !open && setCreatedKey(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckIcon className="text-green-600" size={16} />
                </div>
                <DialogTitle>API Key Created</DialogTitle>
              </div>
              <DialogDescription>Copy this key now. You won`&apos;`t be able to see it again.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={createdKey.rawKey}
                  className="font-mono text-xs flex-1 bg-muted/50"
                />
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(createdKey.rawKey)}
                  className="gap-1 h-7"
                >
                  <CopyIcon size={14} />
                  Copy
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                <strong>memora_</strong>{createdKey.prefix.slice(3)}••••••••••••
              </p>
            </div>
            <DialogFooter showCloseButton>
              <Button variant="outline" onClick={() => setCreatedKey(null)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {revokingId && (
        <Dialog open onOpenChange={(open) => !open && setRevokingId(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Revoke API Key?</DialogTitle>
              <DialogDescription>This action cannot be undone. The key will stop working immediately and cannot be recovered.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRevokingId(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => revokingId && handleRevokeKey(revokingId)}>Revoke Key</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}