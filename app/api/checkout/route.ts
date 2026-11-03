import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Session ID required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("live_parent_sessions")
      .update({
        status: "CHECKED_OUT",
        checked_out_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("status", "CHECKED_IN")
      .select("id")
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return NextResponse.json(
        { error: "Session not found or already checked out" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Checkout failed" },
      { status: 500 }
    );
  }
}