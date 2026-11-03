
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("live_parent_sessions")
      .select(
        "id, child_name, parent_name, parent_email, access_token, checked_in_at"
      )
      .eq("status", "CHECKED_IN")
      .order("checked_in_at", { ascending: false });

    if (error) {
      console.error("Supabase sessions error:", error);

      return NextResponse.json(
        { error: "Unable to load active sessions." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { sessions: data || [] },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("Sessions API error:", error);

    return NextResponse.json(
      { error: "Unexpected error loading sessions." },
      { status: 500 }
    );
  }
}
