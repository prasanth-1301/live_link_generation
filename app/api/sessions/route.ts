import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("live_parent_sessions")
    .select("*")
    .eq("status", "CHECKED_IN")
    .order("checked_in_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "Unable to load sessions" },
      { status: 500 }
    );
  }

  return NextResponse.json({ sessions: data });
}