
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { id } = await request.json();

    if (typeof id !== "string" || !id.trim()) {
      return NextResponse.json(
        { error: "A valid session ID is required." },
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
      .select("id, child_name, status, checked_out_at")
      .maybeSingle();

    if (error) {
      console.error("Supabase checkout error:", error);

      return NextResponse.json(
        { error: "Unable to complete checkout." },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Session not found or already checked out." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      session: data,
      message: "Checkout completed. Parent session access has been revoked at the application level.",
    });
  } catch (error) {
    console.error("Checkout API error:", error);

    return NextResponse.json(
      { error: "Unexpected checkout error." },
      { status: 500 }
    );
  }
}
