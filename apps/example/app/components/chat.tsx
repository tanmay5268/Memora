"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

type Message = {
  id: number;
  role: "user" | "assistant";
  content: string;
  durationMs?: number;
  error?: boolean;
};

function formatDuration(ms: number) {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);

  // Live timer while a request is in flight.
  useEffect(() => {
    if (!pending) return;
    const startedAt = Date.now();
    setElapsedMs(0);
    const timer = setInterval(() => setElapsedMs(Date.now() - startedAt), 100);
    return () => clearInterval(timer);
  }, [pending]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, pending]);

  async function send(event: FormEvent) {
    event.preventDefault();

    const prompt = input.trim();
    if (!prompt || pending) return;

    setInput("");
    setPending(true);
    setMessages((prev) => [
      ...prev,
      { id: nextId.current++, role: "user", content: prompt },
    ]);

    const startedAt = Date.now();

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await response.json().catch(() => ({}));
      // Total round trip: what the user actually waits for.
      const durationMs = Date.now() - startedAt;

      if (!response.ok) {
        throw new Error(data?.error ?? `Request failed (${response.status})`);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: nextId.current++,
          role: "assistant",
          content: data.reply ?? "",
          durationMs: data.durationMs ?? durationMs,
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: nextId.current++,
          role: "assistant",
          content: error instanceof Error ? error.message : "Request failed",
          durationMs: Date.now() - startedAt,
          error: true,
        },
      ]);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-black/10 px-5 py-3 dark:border-white/10">
        <h1 className="text-sm font-semibold tracking-tight">Chat</h1>
        <span className="text-xs text-foreground/50">
          {messages.filter((m) => m.role === "user").length} messages
        </span>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          {messages.length === 0 && (
            <p className="mt-24 text-center text-sm text-foreground/40">
              Ask something to get started.
            </p>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex flex-col ${
                message.role === "user" ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  message.role === "user"
                    ? "bg-foreground text-background"
                    : message.error
                      ? "bg-red-500/10 text-red-600 ring-1 ring-red-500/20 dark:text-red-400"
                      : "bg-black/5 dark:bg-white/10"
                }`}
              >
                {message.content}
              </div>
              {message.durationMs !== undefined && (
                <span className="mt-1 px-1 text-[11px] text-foreground/40">
                  {message.role === "assistant" && !message.error
                    ? "responded in "
                    : "failed after "}
                  {formatDuration(message.durationMs)}
                </span>
              )}
            </div>
          ))}

          {pending && (
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-2 rounded-2xl bg-black/5 px-4 py-2.5 text-sm dark:bg-white/10">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground/70" />
                <span>Thinking…</span>
              </div>
              <span className="mt-1 px-1 text-[11px] text-foreground/40">
                {formatDuration(elapsedMs)} elapsed
              </span>
            </div>
          )}
        </div>
      </div>

      <form
        onSubmit={send}
        className="border-t border-black/10 px-5 py-4 dark:border-white/10"
      >
        <div className="mx-auto flex max-w-2xl items-end gap-2">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            rows={1}
            placeholder="Send a message…"
            className="max-h-40 flex-1 resize-none rounded-xl border border-black/10 bg-transparent px-4 py-2.5 text-sm outline-none placeholder:text-foreground/40 focus:border-foreground/30 dark:border-white/15"
          />
          <button
            type="submit"
            disabled={pending || input.trim().length === 0}
            className="rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-opacity disabled:opacity-40"
          >
            {pending ? "Sending" : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}
