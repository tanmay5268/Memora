import {
  getConfig,
  getRunState,
  startRun,
  updateConfig,
} from "./_runner/runner";
import { TEST_PROMPTS, PROMPT_COUNTS } from "./_runner/prompts";

export async function GET() {
  return Response.json({
    state: getRunState(),
    config: getConfig(),
    plan: {
      total: TEST_PROMPTS.length,
      counts: PROMPT_COUNTS,
    },
  });
}

export async function POST(request: Request) {
  let body: unknown = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text);
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const action = (body as { action?: unknown })?.action;

  try {
    switch (action) {
      case "start": {
        const patch = (body as { config?: Record<string, unknown> })?.config;
        if (patch) updateConfig(patch);
        return Response.json({ state: startRun() });
      }
      case "config": {
        const config = updateConfig(
          (body as { config?: Record<string, unknown> })?.config ?? {},
        );
        return Response.json({ config });
      }
      default:
        return Response.json(
          { error: "action must be 'start' or 'config'" },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("[loadtest] request failed:", error);
    return Response.json(
      { error: "Request failed. Check the server logs for details." },
      { status: 400 },
    );
  }
}
