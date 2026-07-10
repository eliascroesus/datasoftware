import { NextRequest, NextResponse } from "next/server";
import { getGoogleAccessToken, disconnectGoogle } from "@/lib/integrations";
import { listSpreadsheets, listTabs, getHeaderColumns } from "@/lib/google";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Disconnect the Google account (keeps the integration + its metrics).
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const action = req.nextUrl.searchParams.get("action");
  if (action === "disconnect") {
    try {
      await disconnectGoogle(params.id);
      return NextResponse.json({ ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }
  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}

// Drive/Sheets picker backing the "pick spreadsheet → tab → columns" UI.
// action=spreadsheets | tabs | columns
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const action = req.nextUrl.searchParams.get("action") ?? "spreadsheets";
  try {
    const token = await getGoogleAccessToken(params.id);

    if (action === "spreadsheets") {
      const q = req.nextUrl.searchParams.get("q") ?? "";
      const files = await listSpreadsheets(token, q);
      return NextResponse.json({ spreadsheets: files });
    }
    if (action === "tabs") {
      const spreadsheetId = req.nextUrl.searchParams.get("spreadsheetId") ?? "";
      if (!spreadsheetId)
        return NextResponse.json({ error: "spreadsheetId required" }, { status: 400 });
      const tabs = await listTabs(token, spreadsheetId);
      return NextResponse.json({ tabs });
    }
    if (action === "columns") {
      const spreadsheetId = req.nextUrl.searchParams.get("spreadsheetId") ?? "";
      const tab = req.nextUrl.searchParams.get("tab") ?? "";
      if (!spreadsheetId || !tab)
        return NextResponse.json({ error: "spreadsheetId and tab required" }, { status: 400 });
      const columns = await getHeaderColumns(token, spreadsheetId, tab);
      return NextResponse.json({ columns });
    }
    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
