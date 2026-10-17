import { getRunState, resetRun, stopRun } from "../_runner/runner";

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
      case "stop":
        return Response.json({ state: stopRun() });
      case "reset":
        resetRun();
        return Response.json({ state: getRunState() });
      default:
        return Response.json(
          { error: "action must be 'stop' or 'reset'" },
          { status: 400 },
        );
    }
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Request failed" },
      { status: 400 },
    );
  }
}
