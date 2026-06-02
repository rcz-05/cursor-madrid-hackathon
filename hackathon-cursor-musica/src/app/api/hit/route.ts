import { DRUM_LABELS, isDrumCode } from "@/lib/drum-codes";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || !("code" in body)) {
    return NextResponse.json(
      { error: "Missing required field: code" },
      { status: 400 },
    );
  }

  const { code, velocity } = body as { code: unknown; velocity?: unknown };

  if (typeof code !== "string" || !isDrumCode(code)) {
    return NextResponse.json(
      {
        error: "Unknown drum code",
        validCodes: Object.keys(DRUM_LABELS),
      },
      { status: 400 },
    );
  }

  const vel =
    velocity === undefined
      ? 1
      : typeof velocity === "number"
        ? velocity
        : null;

  if (vel === null || vel < 0 || vel > 1) {
    return NextResponse.json(
      { error: "velocity must be a number between 0 and 1" },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    code,
    label: DRUM_LABELS[code],
    velocity: vel,
  });
}
