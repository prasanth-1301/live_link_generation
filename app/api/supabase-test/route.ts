import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("live_parent_sessions")
      .select("id")
      .limit(1);

    if (error) {
      console.error("SUPABASE TEST ERROR:", error);

      return NextResponse.json({
        success: false,
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Supabase connection successful",
      rowsFound: data?.length ?? 0,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json({
      success: false,
      message: "Server connection failed",
    }, { status: 500 });
  }
}