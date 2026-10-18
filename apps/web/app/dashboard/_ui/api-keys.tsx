"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { Icon } from "@/app/components/Icon"
import { orpc, safe } from "@/lib/orpc"
import { toast } from "@workspace/ui/components/toast"
import { cn } from "@workspace/ui/lib/utils"

export type SerializedApiKey = {
  id: string
  name: string
  keyPrefix: string
  /** ISO strings so the server-rendered rows need no date revival. */
  createdAt: string
  lastUsedAt: string | null
  revoked: boolean
}

const INSTALL_SNIPPET = `import { MemoraSdk } from "memorasdk";
import { Index } from "@upstash/vector";

const memora = new MemoraSdk({
  openAIKey: process.env.GEMINI_API_KEY!,
  VectorInstance: new Index({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  }),
  scoreThreshold: 0.88,
});`

const toDate = (value: string | Date) => new Date(value)

function formatDate(value: string | Date) {
  return toDate(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

/** Compact "how long ago" for the last-used column. */
function formatRelative(value: string | Date | null) {
  if (!value) return "Never"
  const seconds = Math.floor((Date.now() - toDate(value).getTime()) / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return formatDate(value)
}

function CopyButton({
  value,
  label,
  className,
  icon = "content_copy",
}: {
  value: string
  label: string
  className?: string
  icon?: "content_copy" | "copy_all"
}) {
  const [copied, setCopied] = useState(false)
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timeout.current), [])

  return (
    <button
      aria-label={label}
      className={cn(
        "text-outline hover:text-primary transition-colors flex items-center gap-1",
        className,
      )}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value)
        } catch {
          toast.add({
            type: "error",
            title: "Couldn't copy",
            description: "Your browser blocked clipboard access.",
          })
          return
        }
        setCopied(true)
        clearTimeout(timeout.current)
        timeout.current = setTimeout(() => setCopied(false), 1600)
      }}
      title={label}
      type="button"
    >
      {copied ? (
        <Icon className="text-sm leading-none text-primary" name="check" />
      ) : (
        <Icon className="text-sm leading-none" name={icon} />
      )}
    </button>
  )
}

/** Reveals a freshly-provisioned secret exactly once, then forgets it. */
function NewKeyDialog({
  open,
  onClose,
  onCreate,
  pending,
}: {
  open: boolean
  onClose: () => void
  onCreate: (name: string) => void
  pending: boolean
}) {
  const [name, setName] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset on the way out rather than in an effect, so opening the dialog never
  // triggers a cascading render.
  const close = useCallback(() => {
    setName("")
    onClose()
  }, [onClose])

  useEffect(() => {
    if (!open) return
    // Wait for the dialog transition to settle before stealing focus.
    const id = setTimeout(() => inputRef.current?.focus(), 30)
    return () => clearTimeout(id)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) close()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, pending, close])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-space-md">
      <button
        aria-label="Close dialog"
        className="absolute inset-0 bg-surface-container-lowest/80"
        onClick={pending ? undefined : close}
        type="button"
      />
      <div
        aria-labelledby="new-key-title"
        aria-modal="true"
        className="relative w-full max-w-lg bg-surface-container-low p-space-lg flex flex-col gap-space-md border border-surface-container-high"
        role="dialog"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-sm">
            <span className="w-2 h-2 bg-primary-container" />
            <span
              className="font-headline-sm text-headline-sm text-on-surface"
              id="new-key-title"
            >
              Create API key
            </span>
          </div>
          <button
            aria-label="Close"
            className="text-outline hover:text-on-surface"
            disabled={pending}
            onClick={close}
            type="button"
          >
            <Icon className="text-base" name="close" />
          </button>
        </div>

        <p className="font-body-sm text-body-sm text-outline">
          The secret is shown once and never stored in readable form — copy it
          before you close this dialog.
        </p>

        <div className="flex flex-col gap-space-sm">
          <label
            className="font-label-sm text-label-sm text-on-surface uppercase tracking-wider"
            htmlFor="key-name-input"
          >
            Key name
          </label>
          <input
            className="w-full bg-surface-container-lowest px-space-sm py-2 font-code-sm text-code-sm text-on-surface placeholder:text-outline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container/50"
            id="key-name-input"
            maxLength={100}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && name.trim() && !pending)
                onCreate(name.trim())
            }}
            placeholder="inference-cache-primary"
            ref={inputRef}
            type="text"
            value={name}
          />
        </div>

        <div className="flex justify-end items-center gap-space-sm">
          <button
            className="px-space-md py-2 bg-surface-container-high text-on-surface font-label-md text-label-md hover:bg-surface-variant transition-colors disabled:opacity-50"
            disabled={pending}
            onClick={close}
            type="button"
          >
            Cancel
          </button>
          <button
            className="px-space-md py-2 bg-primary-container text-on-primary-container font-label-md text-label-md hover:opacity-95 transition-opacity disabled:opacity-50 disabled:pointer-events-none"
            disabled={!name.trim() || pending}
            onClick={() => onCreate(name.trim())}
            type="button"
          >
            {pending ? "Creating…" : "Create key"}
          </button>
        </div>
      </div>
    </div>
  )
}

function StatTile({
  label,
  value,
  note,
  valueClassName,
}: {
  label: string
  value: string
  note?: string
  valueClassName?: string
}) {
  return (
    <div className="bg-surface-container-low p-space-md flex flex-col justify-between border border-surface-container-high">
      <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">
        {label}
      </span>
      <div className="flex items-baseline gap-space-sm mt-space-sm">
        <span
          className={cn(
            "font-headline-lg text-headline-lg text-on-surface tracking-tight",
            valueClassName,
          )}
        >
          {value}
        </span>
        {note && (
          <span className="font-code-sm text-code-sm text-outline">{note}</span>
        )}
      </div>
    </div>
  )
}

export function ApiKeys({ initialKeys }: { initialKeys: SerializedApiKey[] }) {
  const [keys, setKeys] = useState<SerializedApiKey[]>(initialKeys)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "revoked">(
    "all",
  )
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [secret, setSecret] = useState<{ raw: string; name: string } | null>(null)
  const [revokeTarget, setRevokeTarget] = useState<SerializedApiKey | null>(null)

  // Re-reads after a mutation. Mounting needs nothing — the server already
  // sent the current rows.
  const refresh = useCallback(async () => {
    setRefreshing(true)
    const [error, data] = await safe(orpc.apiKey.list())
    if (error || !data) {
      setLoadError("Couldn't refresh your keys.")
      toast.add({
        type: "error",
        title: "Refresh failed",
        description: "Showing the last known list.",
      })
    } else {
      setLoadError(null)
      setKeys(data as unknown as SerializedApiKey[])
    }
    setRefreshing(false)
  }, [])

  const createKey = async (name: string) => {
    setCreating(true)
    const [error, data] = await safe(orpc.apiKey.create({ name }))
    setCreating(false)

    if (error || !data) {
      toast.add({
        type: "error",
        title: "Couldn't create the key",
        description: "Try again in a moment.",
      })
      return
    }

    setDialogOpen(false)
    setSecret({ raw: data.apiKey, name })
    toast.add({ type: "success", title: "API key created" })
    void refresh()
  }

  const revokeKey = async (id: string, name: string) => {
    const [error] = await safe(orpc.apiKey.revoke({ id }))
    if (error) {
      toast.add({
        type: "error",
        title: "Couldn't revoke the key",
        description: "Try again in a moment.",
      })
      return
    }
    toast.add({
      type: "success",
      title: "Key revoked",
      description: `${name} can no longer authenticate.`,
    })
    void refresh()
  }

  const active = useMemo(() => keys.filter((key) => !key.revoked), [keys])
  const revoked = useMemo(() => keys.filter((key) => key.revoked), [keys])
  const lastUsed = useMemo(() => {
    const stamps = keys
      .map((key) => key.lastUsedAt)
      .filter((value): value is string => Boolean(value))
      .map(toDate)
      .sort((a, b) => b.getTime() - a.getTime())
    return stamps[0] ?? null
  }, [keys])

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return keys.filter((key) => {
      if (statusFilter === "active" && key.revoked) return false
      if (statusFilter === "revoked" && !key.revoked) return false
      if (!needle) return true
      return (
        key.name.toLowerCase().includes(needle) ||
        key.keyPrefix.toLowerCase().includes(needle)
      )
    })
  }, [keys, query, statusFilter])

  const filtersActive =
    Boolean(query.trim()) || statusFilter !== "all" || loadError !== null

  return (
    <>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md pb-space-lg">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-space-sm">
            <h1 className="font-headline-lg text-headline-lg text-on-surface font-medium tracking-tight">
              API Keys
            </h1>
            <span className="px-1.5 py-0.5 bg-surface-container text-outline font-code-sm text-code-sm">
              v2.40
            </span>
          </div>
          <p className="font-body-md text-body-md text-outline max-w-2xl">
            Credentials for authenticating memora-sdk proxy and edge vector
            lookup nodes.
          </p>
          <div className="flex items-center gap-space-md font-code-sm text-code-sm text-on-surface-variant mt-1">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-secondary-container" />
              <span>
                {active.length} active key{active.length === 1 ? "" : "s"}
              </span>
            </span>
            <span className="text-surface-container-highest">/</span>
            <span className="flex items-center gap-1.5 text-outline">
              <span className="w-1.5 h-1.5 bg-surface-container-highest" />
              <span>
                {revoked.length} revoked
              </span>
            </span>
            <span
              aria-live="polite"
              className={cn(
                "flex items-center gap-1.5 text-outline transition-opacity",
                refreshing ? "opacity-100" : "opacity-0",
              )}
            >
              <Icon className="text-xs animate-spin" name="sync" />
              <span>Syncing</span>
            </span>
          </div>
        </div>

        <button
          className="flex items-center gap-2 px-space-md py-2 bg-primary-container text-on-primary-container font-label-md text-label-md hover:opacity-90 transition-opacity shrink-0 active:scale-[0.98]"
          onClick={() => setDialogOpen(true)}
          type="button"
        >
          <Icon className="text-base leading-none" name="add" />
          <span>Create API key</span>
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-space-sm bg-surface-container-low p-space-sm mb-space-sm border border-surface-container-high">
        <div className="md:col-span-8 relative flex items-center">
          <Icon
            className="absolute left-3 text-outline text-base"
            name="search"
          />
          <input
            aria-label="Search keys"
            className="w-full bg-surface-container-lowest pl-9 pr-3 py-1.5 font-code-sm text-code-sm text-on-surface placeholder:text-outline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container/50"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="filter by key name or prefix…"
            type="search"
            value={query}
          />
        </div>
        <div className="md:col-span-4">
          <select
            aria-label="Filter by status"
            className="w-full h-full bg-surface-container-lowest px-3 py-1.5 font-code-sm text-code-sm text-on-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container/50 cursor-pointer"
            onChange={(event) =>
              setStatusFilter(event.target.value as typeof statusFilter)
            }
            value={statusFilter}
          >
            <option value="all">All statuses</option>
            <option value="active">Active only</option>
            <option value="revoked">Revoked only</option>
          </select>
        </div>
      </div>

      {/* Inventory */}
      <div className="w-full overflow-x-auto bg-surface-container-lowest border border-surface-container-high">
        <table className="w-full text-left border-collapse min-w-[46rem]">
          <thead>
            <tr className="bg-surface-container-low text-outline font-label-sm text-label-sm uppercase tracking-wider border-b border-surface-container-high">
              <th className="py-2.5 px-space-md font-medium" scope="col">
                Name
              </th>
              <th className="py-2.5 px-space-md font-medium" scope="col">
                Key prefix
              </th>
              <th className="py-2.5 px-space-md font-medium" scope="col">
                Created
              </th>
              <th className="py-2.5 px-space-md font-medium" scope="col">
                Last used
              </th>
              <th className="py-2.5 px-space-md font-medium" scope="col">
                Status
              </th>
              <th
                className="py-2.5 px-space-md font-medium text-right"
                scope="col"
              >
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td className="py-8 px-space-md" colSpan={6}>
                  <div className="flex flex-col items-center justify-center text-center gap-2 py-4">
                    <Icon className="text-outline text-2xl" name="manage_search" />
                    <span className="font-headline-sm text-headline-sm text-on-surface">
                      {keys.length === 0 ? "No API keys yet" : "No keys match this filter"}
                    </span>
                    <p className="font-body-sm text-body-sm text-outline max-w-sm">
                      {keys.length === 0
                        ? "Create a key to authenticate requests from memorasdk."
                        : "Adjust the search term or status filter to find other keys."}
                    </p>
                    {keys.length === 0 ? (
                      <button
                        className="mt-1 px-space-md py-1.5 bg-primary-container text-on-primary-container font-label-sm text-label-sm"
                        onClick={() => setDialogOpen(true)}
                        type="button"
                      >
                        Create API key
                      </button>
                    ) : (
                      <button
                        className="mt-1 px-space-md py-1.5 bg-surface-container-high text-on-surface font-label-sm text-label-sm hover:bg-surface-variant transition-colors"
                        onClick={() => {
                          setQuery("")
                          setStatusFilter("all")
                        }}
                        type="button"
                      >
                        Reset filters
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              visible.map((key) => (
                <tr
                  className={cn(
                    "border-b border-surface-container-high/40 transition-colors last:border-0",
                    key.revoked
                      ? "opacity-50"
                      : "bg-surface-container-low/30 hover:bg-surface-container-low",
                  )}
                  key={key.id}
                >
                  <td className="py-3 px-space-md">
                    <div className="flex flex-col min-w-0">
                      <span
                        className={cn(
                          "font-code-md text-code-md text-on-surface font-medium break-words",
                          key.revoked && "line-through",
                        )}
                      >
                        {key.name}
                      </span>
                      <span className="font-code-sm text-code-sm text-outline">
                        id: {key.id.slice(0, 8)}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-space-md">
                    <span className="inline-flex items-center gap-2 px-2 py-1 bg-surface-container-lowest border border-surface-container-high font-code-sm text-code-sm text-on-surface">
                      {key.keyPrefix}••••••••
                      {key.revoked ? (
                        <Icon
                          className="text-sm leading-none text-outline"
                          name="lock"
                        />
                      ) : (
                        <CopyButton
                          label={`Copy prefix for ${key.name}`}
                          value={key.keyPrefix}
                        />
                      )}
                    </span>
                  </td>
                  <td className="py-3 px-space-md font-code-sm text-code-sm text-outline whitespace-nowrap">
                    {formatDate(key.createdAt)}
                  </td>
                  <td className="py-3 px-space-md font-code-sm text-code-sm text-on-surface whitespace-nowrap">
                    {formatRelative(key.lastUsedAt)}
                  </td>
                  <td className="py-3 px-space-md">
                    <span className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "w-1.5 h-1.5",
                          key.revoked ? "bg-surface-container-highest" : "bg-secondary-container",
                        )}
                      />
                      <span className="font-label-sm text-label-sm text-on-surface font-medium">
                        {key.revoked ? "Revoked" : "Active"}
                      </span>
                    </span>
                  </td>
                  <td className="py-3 px-space-md text-right">
                    {key.revoked ? (
                      <span className="font-code-sm text-code-sm text-outline">
                        Archived
                      </span>
                    ) : (
                      <button
                        className="px-2 py-1 bg-transparent hover:bg-error-container hover:text-error text-outline font-code-sm text-code-sm transition-colors"
                        onClick={() => setRevokeTarget(key)}
                        type="button"
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {filtersActive && visible.length > 0 && (
          <div className="px-space-md py-2 bg-surface-container-low border-t border-surface-container-high font-code-sm text-code-sm text-outline">
            Showing {visible.length} of {keys.length} key
            {keys.length === 1 ? "" : "s"}
          </div>
        )}
      </div>

      {/* Usage summary — derived from your actual keys */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-space-sm mt-space-lg">
        <StatTile
          label="Active credentials"
          note="ready to authenticate"
          value={String(active.length)}
        />
        <StatTile
          label="Last invocation"
          note={lastUsed ? "most recent key use" : undefined}
          value={formatRelative(lastUsed)}
        />
        <StatTile
          label="Revoked"
          note="permanently rejected"
          value={String(revoked.length)}
          valueClassName={revoked.length > 0 ? "text-outline" : undefined}
        />
      </div>

      {/* Quick start */}
      <div className="mt-space-md p-space-md bg-surface-container-lowest border border-surface-container-high">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm pb-space-sm">
          <div className="flex items-center gap-space-sm">
            <Icon className="text-outline text-base" name="terminal" />
            <span className="font-label-md text-label-md text-on-surface font-medium">
              SDK initializer hook
            </span>
          </div>
          <span className="font-code-sm text-code-sm text-outline">
            Zero latency initialization example
          </span>
        </div>
        <div className="bg-surface-container-low p-space-sm overflow-x-auto flex items-center justify-between gap-space-sm border border-surface-container-high">
          <pre className="font-code-sm text-code-sm text-on-surface leading-relaxed">
            <code>{INSTALL_SNIPPET}</code>
          </pre>
          <CopyButton
            className="px-2 py-1 bg-surface-container text-outline hover:text-on-surface font-code-sm text-code-sm shrink-0"
            icon="copy_all"
            label="Copy SDK snippet"
            value={INSTALL_SNIPPET}
          />
        </div>
      </div>

      <NewKeyDialog
        onClose={() => setDialogOpen(false)}
        onCreate={createKey}
        open={dialogOpen}
        pending={creating}
      />

      {/* One-shot secret reveal */}
      {secret && (
        <SecretRevealModal
          open={true}
          onClose={() => setSecret(null)}
          secret={secret}
          onAbort={() => setSecret(null)}
        />
      )}

      {/* Revocation safeguard dialog (bottom-right panel) */}
      {revokeTarget && (
        <RevocationDialog
          key={revokeTarget.id}
          keyPrefix={revokeTarget.keyPrefix}
          name={revokeTarget.name}
          onClose={() => setRevokeTarget(null)}
          onConfirm={async () => {
            setRevokingId(revokeTarget.id)
            await revokeKey(revokeTarget.id, revokeTarget.name)
            setRevokingId(null)
            setRevokeTarget(null)
          }}
          pending={revokingId === revokeTarget.id}
        />
      )}
    </>
  )
}

/** Elaborate secret reveal modal matching the Secret Key Reveal & Revocation design. */
function SecretRevealModal({
  open,
  onClose,
  secret,
  onAbort,
}: {
  open: boolean
  onClose: () => void
  secret: { raw: string; name: string }
  onAbort: () => void
}) {
  const [copied, setCopied] = useState(false)
  const copyTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [zeroed, setZeroed] = useState(false)
  const [tab, setTab] = useState<"curl" | "node" | "python">("curl")
  const [safeguardChecked, setSafeguardChecked] = useState(false)

  useEffect(() => () => clearTimeout(copyTimeout.current), [])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(secret.raw)
    } catch {
      toast.add({
        type: "error",
        title: "Couldn't copy",
        description: "Your browser blocked clipboard access.",
      })
      return
    }
    setCopied(true)
    clearTimeout(copyTimeout.current)
    copyTimeout.current = setTimeout(() => setCopied(false), 2500)
  }, [secret.raw])

  const curlSnippet = `curl -X POST https://api.memora.dev/v1/agent/rag/query \\
  -H "Authorization: Bearer ${secret.raw}" \\
  -H "Content-Type: application/json" \\
  -d '{"stream": true, "session_id": "ephemeral-init"}'`

  const nodeSnippet = `import { MemoraClient } from "@memora/sdk";

const memora = new MemoraClient({
  apiKey: "${secret.raw}"
});

const res = await memora.agent.invoke("prod-agent-rag-pipeline");`

  const pythonSnippet = `from memora import MemoraClient

client = MemoraClient(api_key="${secret.raw}")
response = client.rag.query(agent="prod-agent-rag-pipeline", stream=True)`

  const snippet = tab === "curl" ? curlSnippet : tab === "node" ? nodeSnippet : pythonSnippet

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-space-md">
      <button
        aria-label="Close dialog"
        className="absolute inset-0 bg-surface-container-lowest/80 backdrop-blur-sm"
        onClick={zeroed || copied ? undefined : onClose}
        type="button"
      />
      <div
        aria-labelledby="secret-title"
        aria-modal="true"
        className="relative w-full max-w-xl bg-surface-container-low p-space-xl flex flex-col gap-space-lg rounded-xl shadow-2xl text-on-surface transition-all duration-200 border border-surface-container-high"
        id="revealModal"
        role="dialog"
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-space-sm">
              <span
                className="font-headline-md text-headline-md font-medium tracking-tight text-on-surface"
                id="secret-title"
              >
                API Key Created
              </span>
              <span className="font-code-sm text-code-sm px-2 py-0.5 rounded bg-surface-container-high text-secondary font-medium">
                production
              </span>
            </div>
            <div className="flex items-center gap-space-xs font-code-md text-code-md text-outline">
              <Icon
                className="text-sm leading-none text-primary-container"
                name="terminal"
              />
              <span className="text-on-surface-variant font-medium">
                {secret.name}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-surface-container-low text-outline">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-container animate-pulse" />
            <span className="font-label-sm text-label-sm tracking-wide uppercase">
              RAM Buffer Active
            </span>
          </div>
        </div>

        {/* Security invariant box */}
        <div className="bg-surface-container-low rounded-lg p-space-md flex items-start gap-3.5 border border-surface-container-high">
          <Icon
            className="text-secondary-container shrink-0 mt-0.5 text-xl"
            name="shield_locked"
          />
          <div className="flex flex-col gap-1">
            <span className="font-label-md text-label-md font-semibold text-secondary-container tracking-tight">
              Single Revelation Policy
            </span>
            <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
              This secret token is generated server-side and held exclusively in
              ephemeral memory. It will{" "}
              <strong className="text-on-surface font-medium">
                never be shown again
              </strong>{" "}
              or stored in plaintext on our infrastructure. If destroyed or
              misplaced, a complete key rotation is mandated.
            </p>
          </div>
        </div>

        {zeroed ? (
          <div className="py-12 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-secondary">
              <Icon className="text-2xl" name="verified_user" />
            </div>
            <span className="font-headline-md text-headline-md font-medium text-on-surface">
              Secret Token Purged
            </span>
            <p className="font-body-sm text-body-sm text-outline max-w-sm">
              The secret has been dropped from this view. Store it in your vault
              to keep using it in application requests.
            </p>
            <button
              className="mt-4 px-4 py-2 bg-surface-container-high hover:bg-surface-container text-on-surface rounded font-label-md text-label-md transition-colors"
              onClick={onClose}
              type="button"
            >
              Return to Key Vault
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-space-lg">
            {/* One-time secret token */}
            <div className="flex flex-col gap-space-xs">
              <div className="flex items-center justify-between text-outline">
                <span className="font-label-sm text-label-sm uppercase tracking-wider font-semibold">
                  One-Time Secret Token
                </span>
                <span
                  className="font-code-sm text-code-sm text-outline"
                  id="entropyTag"
                >
                  256-bit entropy &bull; SHA-256
                </span>
              </div>
              <div className="bg-[#0c0c0f] rounded-lg p-2.5 flex items-center justify-between gap-3 focus-within:bg-[#08080a] transition-all">
                <div className="flex items-center gap-2 px-2 overflow-x-auto select-all cursor-text min-w-0">
                  <Icon
                    className="text-outline text-base shrink-0"
                    name="key"
                  />
                  <code
                    className="font-code-md text-code-md text-on-surface font-semibold tracking-tight whitespace-nowrap"
                    id="rawSecret"
                  >
                    {secret.raw}
                  </code>
                </div>
                <button
                  aria-label="Copy secret token"
                  className={cn(
                    "shrink-0 px-3.5 py-2 rounded font-label-md text-label-md font-medium flex items-center gap-1.5 transition-all shadow-sm active:scale-95",
                    copied
                      ? "bg-secondary text-on-secondary"
                      : "bg-primary-container hover:bg-secondary-container text-on-primary-fixed",
                  )}
                  onClick={handleCopy}
                  type="button"
                >
                  <Icon
                    className="text-base leading-none"
                    name={copied ? "check" : "content_copy"}
                  />
                  <span id="copyLabel">
                    {copied ? "Copied to Clipboard" : "Copy Secret"}
                  </span>
                </button>
              </div>
            </div>

            {/* Implementation snippet preview */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
                  Immediate Execution Signature
                </span>
                <div className="flex items-center gap-2">
                  {(
                    [
                      ["curl", "cURL"],
                      ["node", "TypeScript"],
                      ["python", "Python"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      className={cn(
                        "font-code-sm text-code-sm px-2 py-0.5 rounded transition-colors",
                        tab === value
                          ? "bg-surface-container-high text-on-surface"
                          : "text-outline hover:text-on-surface",
                      )}
                      key={value}
                      onClick={() => setTab(value)}
                      type="button"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-[#0c0c0f] rounded-lg p-3 overflow-x-auto">
                <pre
                  className="font-code-sm text-code-sm text-on-surface-variant font-mono leading-relaxed select-all"
                  id="codeSnippet"
                >
                  <code>{highlightToken(snippet, secret.raw)}</code>
                </pre>
              </div>
            </div>

            {/* Safeguard checkbox & termination action */}
            <div className="flex flex-col gap-space-md pt-space-xs">
              <label className="flex items-start gap-3 cursor-pointer group select-none">
                <div className="relative flex items-center mt-0.5">
                  <input
                    checked={safeguardChecked}
                    className="sr-only peer"
                    id="safeguardCheckbox"
                    onChange={() => setSafeguardChecked((value) => !value)}
                    type="checkbox"
                  />
                  <div
                    className={cn(
                      "w-4 h-4 rounded flex items-center justify-center transition-all",
                      safeguardChecked
                        ? "bg-primary-container"
                        : "bg-surface-container",
                    )}
                  >
                    <Icon
                      className={cn(
                        "text-xs text-on-primary font-bold transition-opacity",
                        safeguardChecked ? "opacity-100" : "opacity-0",
                      )}
                      name="check"
                    />
                  </div>
                </div>
                <span className="font-body-sm text-body-sm text-on-surface-variant group-hover:text-on-surface transition-colors leading-snug">
                  I have safely copied this API key and stored it in an
                  encrypted secrets manager (
                  <code className="font-code-sm text-code-sm text-outline">
                    .env
                  </code>
                  , Doppler, AWS Secrets Manager).
                </span>
              </label>
              <div className="flex items-center justify-between gap-3 pt-space-xs">
                <button
                  className="font-body-sm text-body-sm text-outline hover:text-error transition-colors flex items-center gap-1"
                  onClick={onAbort}
                  type="button"
                >
                  <Icon
                    className="text-sm leading-none"
                    name="delete_forever"
                  />
                  <span>Abort Key Deployment</span>
                </button>
                <button
                  className={cn(
                    "px-5 py-2.5 rounded font-label-md text-label-md font-medium flex items-center gap-2 transition-all disabled:opacity-50 disabled:pointer-events-none",
                    safeguardChecked
                      ? "bg-primary hover:bg-secondary text-on-primary-fixed cursor-pointer"
                      : "bg-surface-container-high cursor-not-allowed text-surface-container-lowest",
                  )}
                  disabled={!safeguardChecked}
                  id="zeroKeyBtn"
                  onClick={() => setZeroed(true)}
                  type="button"
                >
                  <Icon className="text-base leading-none" name="memory" />
                  <span>Done &amp; Zero Key from Memory</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/** Highlights the raw token inside a snippet so it reads as a live credential. */
function highlightToken(snippet: string, token: string) {
  const parts = snippet.split(token)
  if (parts.length === 1) return snippet

  return parts.map((part, index) => (
    <span key={index}>
      {part}
      {index < parts.length - 1 ? (
        <span className="text-secondary">{token}</span>
      ) : null}
    </span>
  ))
}

/** Bottom-right revocation safeguard panel. */
function RevocationDialog({
  name,
  keyPrefix,
  onClose,
  onConfirm,
  pending,
}: {
  name: string
  keyPrefix: string
  onClose: () => void
  onConfirm: () => void | Promise<void>
  pending: boolean
}) {
  return (
    <aside className="fixed bottom-6 right-6 z-50 w-full max-w-sm bg-[#16151a] rounded-xl shadow-2xl p-space-md flex flex-col gap-3 transition-all transform animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-error">
          <Icon className="text-lg leading-none" name="gpp_maybe" />
          <span className="font-label-md text-label-md font-semibold tracking-tight uppercase">
            Revocation Safeguard
          </span>
        </div>
        <span className="font-code-sm text-code-sm px-1.5 py-0.5 rounded bg-surface-container-highest text-outline">
          v1.3
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="font-headline-sm text-headline-sm font-medium text-on-surface leading-tight">
          Revoke Key{" "}
          <span className="font-code-sm text-code-sm text-error bg-error-container/20 px-1 py-0.5 rounded break-all">
            {name}
          </span>
          ?
        </div>
        <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
          Immediate failure will trigger for any client invoking this token. This
          action takes effect across edge regions within 450ms and cannot be
          undone.
        </p>
      </div>

      <div className="bg-surface-container-low rounded p-2.5 flex items-center justify-between gap-3">
        <span className="font-code-sm text-code-sm text-outline">
          Key prefix
        </span>
        <span className="font-code-sm text-code-sm font-semibold text-on-surface truncate">
          {keyPrefix}••••••••
        </span>
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          className="px-3 py-1.5 rounded font-label-md text-label-md text-on-surface-variant hover:text-on-surface bg-surface-container transition-colors disabled:opacity-50"
          disabled={pending}
          onClick={onClose}
          type="button"
        >
          Dismiss
        </button>
        <button
          className="px-3 py-1.5 rounded font-label-md text-label-md font-medium text-white bg-error-container hover:bg-opacity-90 flex items-center gap-1 transition-all disabled:opacity-50 disabled:pointer-events-none"
          disabled={pending}
          onClick={onConfirm}
          type="button"
        >
          <Icon className="text-sm leading-none" name="block" />
          <span>{pending ? "Revoking…" : "Revoke Immediately"}</span>
        </button>
      </div>
    </aside>
  )
}
