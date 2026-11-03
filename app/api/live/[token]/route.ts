
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { active: false, message: "Invalid access link." },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("live_parent_sessions")
      .select("id, child_name, parent_name, status, checked_in_at, checked_out_at")
      .eq("access_token", token)
      .maybeSingle();

    if (error) {
      console.error("LIVE SESSION ERROR:", error);

      return NextResponse.json(
        { active: false, message: "Unable to verify session." },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { active: false, message: "Invalid or expired link." },
        { status: 404 }
      );
    }

    if (data.status !== "CHECKED_IN") {
      return NextResponse.json({
        active: false,
        message: "Session Completed",
        childName: data.child_name,
        checkedOutAt: data.checked_out_at
      });
    }

    return NextResponse.json({
      active: true,
      childName: data.child_name,
      parentName: data.parent_name,
      checkedInAt: data.checked_in_at
    }, {
      headers: {
        "Cache-Control": "no-store"
      }
    });

  } catch (error) {
    console.error("LIVE API ERROR:", error);

    return NextResponse.json(
      { active: false, message: "Server error." },
      { status: 500 }
    );
  }
}
