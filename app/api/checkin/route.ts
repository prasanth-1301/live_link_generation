
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { randomUUID } from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[char];
  });
}

export async function POST(request: Request) {
  let sessionId: string | null = null;

  try {
    const body = await request.json();

    const childName =
      typeof body.childName === "string" ? body.childName.trim() : "";

    const parentName =
      typeof body.parentName === "string" ? body.parentName.trim() : "";

    const parentEmail =
      typeof body.parentEmail === "string"
        ? body.parentEmail.trim().toLowerCase()
        : "";

    if (!childName || !parentName || !parentEmail) {
      return NextResponse.json(
        { error: "Child name, parent name and parent email are required." },
        { status: 400 }
      );
    }

    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    const testRecipient = process.env.RESEND_TEST_RECIPIENT;

    if (!apiKey || !fromEmail || !testRecipient) {
      return NextResponse.json(
        { error: "Missing Resend configuration. Check .env.local." },
        { status: 500 }
      );
    }

    // Generate unique parent session token.
    const token = randomUUID();

    // Save check-in in Supabase.
    const { data, error } = await supabaseAdmin
      .from("live_parent_sessions")
      .insert({
        child_name: childName,
        parent_name: parentName,
        parent_email: parentEmail,
        access_token: token,
        status: "CHECKED_IN",
      })
      .select(
        "id, child_name, parent_name, parent_email, access_token, checked_in_at"
      )
      .single();

    if (error || !data) {
      console.error("SUPABASE ERROR:", error);

      return NextResponse.json(
        { error: error?.message || "Unable to save check-in." },
        { status: 500 }
      );
    }

    sessionId = data.id;

    // Generate temporary parent link.
    const appUrl = (
      process.env.APP_URL || new URL(request.url).origin
    ).replace(/\/$/, "");

    const liveLink = `${appUrl}/live/${token}`;

    // Send POC email to verified Resend account recipient.
    const resend = new Resend(apiKey);

    const { data: emailData, error: emailError } =
      await resend.emails.send({
        from: fromEmail,
        to: [testRecipient],
        subject: `Iklo POC: ${childName}'s live viewing link`,
        html: `
          <!DOCTYPE html>
          <html>
          <body style="margin:0;padding:30px 10px;background:#f4f8f5;font-family:Arial,sans-serif;color:#26352e;">
            <div style="max-width:560px;margin:auto;background:#ffffff;border-radius:14px;overflow:hidden;">
              <div style="padding:25px 30px;background:#00a878;color:#ffffff;">
                <h1 style="margin:0;font-size:30px;">iklo</h1>
                <p>Childcare live viewing</p>
              </div>
              <div style="padding:30px;">
                <h2>Hello ${escapeHtml(parentName)},</h2>
                <p>
                  <strong>${escapeHtml(childName)}</strong>
                  has been checked in successfully.
                </p>
                <p>Parent email registered: ${escapeHtml(parentEmail)}</p>
                <div style="text-align:center;margin:30px 0;">
                  <a href="${liveLink}"
                    style="background:#00a878;color:#ffffff;text-decoration:none;padding:15px 28px;border-radius:8px;display:inline-block;font-weight:bold;">
                    View Live Session
                  </a>
                </div>
                <p style="font-size:13px;color:#66736c;">
                  This is a POC test email. Access should end after checkout.
                </p>
              </div>
              <div style="padding:18px 30px;background:#f4f8f5;color:#78847d;font-size:12px;">
                Iklo | Secure childcare experience
              </div>
            </div>
          </body>
          </html>
        `,
        text: `Hello ${parentName}. ${childName} has been checked in. Parent email: ${parentEmail}. Live session: ${liveLink}`,
      });

    if (emailError) {
      console.error("RESEND ERROR:", emailError);

      await supabaseAdmin
        .from("live_parent_sessions")
        .update({
          status: "CHECKED_OUT",
          checked_out_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

      return NextResponse.json(
        {
          error: `Email sending failed: ${emailError.message}`,
          emailSent: false,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      emailSent: true,
      emailId: emailData?.id,
      liveLink,
      testMode: true,
      message: `Check-in successful. POC email sent to ${testRecipient}.`,
    });

  } catch (error) {
    console.error("CHECK-IN ERROR:", error);

    if (sessionId) {
      await supabaseAdmin
        .from("live_parent_sessions")
        .update({
          status: "CHECKED_OUT",
          checked_out_at: new Date().toISOString(),
        })
        .eq("id", sessionId);
    }

    return NextResponse.json(
      { error: "Unexpected error while processing check-in." },
      { status: 500 }
    );
  }
}
