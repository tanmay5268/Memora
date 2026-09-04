<p align="center">
  <img src="apps/cacheWeb/app/icon.svg" alt="CashLM" width="120" height="120" />
</p>

<h1 align="center">Memora</h1>

<p align="center"><em>Never pay twice for the same prompt.</em></p>

A hosted semantic caching layer for LLM API calls. Developers install an npm SDK that acts as a drop-in replacement for their LLM provider's client. Behind the scenes, CashLM checks whether a similar request has already been answered — and if so, returns the cached response instead of calling the LLM provider again, cutting API costs on repetitive workloads.

## The core idea

Most caching is exact-match only, which misses the real savings opportunity: near-duplicate prompts that are worded differently but mean the same thing. CashLM embeds each incoming request and compares it against previously cached requests using vector similarity search — catching duplicates that a simple hash-based cache would miss.

## How it works

1. Dev's app calls the CashLM SDK instead of the LLM provider's client directly
2. CashLM authenticates the request (tenant-scoped, via platform API key) and embeds the prompt
3. It searches for a sufficiently similar prompt already in that tenant's cache
4. **Cache hit** → return the stored response instantly, no LLM call made
5. **Cache miss** → call the LLM provider live, then store the new response for next time

## First integration

**Gemini API** — chosen as the first provider, using Gemini's own `text-embedding-004` model for the similarity comparisons, so no second embedding vendor is needed.

## Platform pieces

- **Website (cashlm.dev)**: Google/GitHub login, a page to generate platform API keys, and SDK docs
- **API key system**: keys are generated as random strings, hashed (SHA-256) before storage, and shown to the user only once at creation — the raw key is never stored or re-displayed
- **Auth caching**: a shared Redis layer (via a provider like Upstash) sits in front of the database for API key lookups, using write-through caching on key creation plus a cache-aside fallback, so most requests avoid a database round-trip entirely
- **Semantic cache storage**: a vector-capable store (e.g. pgvector) holds embeddings and responses per tenant, separate from the Redis auth-lookup layer

## Why it's differentiated

Exact-match LLM caching already exists (Helicone, Portkey, GPTCache, LiteLLM). CashLM's wedge is doing *semantic* near-duplicate caching safely — with a tunable similarity threshold, per-request opt-outs for freshness-sensitive calls, and cache-hit confidence scores so devs aren't trusting a black box.

## Status

Early-stage — architecture and key decisions (provider, auth flow, caching layers) are settled; SDK, server, and dashboard are not yet built.
