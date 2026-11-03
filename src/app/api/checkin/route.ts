
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

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

export async function POST(request: NextRequest) {
  let insertedId: string | null = null;

  try {
    const { childName, parentName, parentEmail } = await request.json();

    if (
      typeof childName !== "string" ||
      typeof parentName !== "string" ||
      typeof parentEmail !== "string" ||
      !childName.trim() ||
      !parentName.trim() ||
      !parentEmail.trim()
    ) {
      return NextResponse.json(
        { error: "Please enter child name, parent name and parent email." },
        { status: 400 }
      );
    }

    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;

    if (!apiKey || !fromEmail) {
      return NextResponse.json(
        { error: "Email service is not configured. Check Resend environment variables." },
        { status: 500 }
      );
    }

    const resend = new Resend(apiKey);
    const token = randomUUID();

    // Create the check-in session.
    const { data, error } = await supabaseAdmin
      .from("live_parent_sessions")
      .insert({
        child_name: childName.trim(),
        parent_name: parentName.trim(),
        parent_email: parentEmail.trim().toLowerCase(),
        access_token: token,
        status: "CHECKED_IN",
      })
      .select("id, child_name, parent_name, parent_email, access_token, checked_in_at")
      .single();

    if (error || !data) {
      console.error("Supabase check-in error:", error);
      return NextResponse.json(
        { error: "Unable to save check-in. Please try again." },
        { status: 500 }
      );
    }

    insertedId = data.id;

    // Use APP_URL in production. Localhost is used during local testing.
    const appUrl = (
      process.env.APP_URL || request.nextUrl.origin
    ).replace(/\/$/, "");

    const liveLink = `${appUrl}/live/${token}`;

    const safeParentName = escapeHtml(parentName.trim());
    const safeChildName = escapeHtml(childName.trim());

    // Send the temporary parent link.
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: fromEmail,
      to: [parentEmail.trim().toLowerCase()],
      subject: `Iklo | ${childName.trim()}'s live viewing link`,
      html: `
        <!DOCTYPE html>
        <html>
          <body style="margin:0;padding:0;background:#f4f7f5;font-family:Arial,sans-serif;color:#26352e;">
            <div style="max-width:560px;margin:35px auto;background:#ffffff;border-radius:14px;overflow:hidden;">
              <div style="padding:25px 30px;background:#00a878;color:#ffffff;">
                <h1 style="margin:0;font-size:28px;">iklo</h1>
                <p style="margin:8px 0 0;font-size:14px;">Childcare live viewing</p>
              </div>

              <div style="padding:30px;">
                <h2 style="margin-top:0;">Hello ${safeParentName},</h2>

                <p>Your child, <strong>${safeChildName}</strong>, has been checked in successfully.</p>

                <p>You can use the secure temporary link below to view the live session.</p>

                <div style="text-align:center;margin:30px 0;">
                  <a href="${liveLink}"
                    style="display:inline-block;background:#00a878;color:#ffffff;text-decoration:none;padding:15px 28px;border-radius:8px;font-weight:bold;">
                    View Live CCTV
                  </a>
                </div>

                <p style="font-size:13px;color:#66736c;">
                  This link is unique to this check-in session. Live viewing will no longer be available after checkout.
                </p>

                <p style="font-size:13px;color:#66736c;">
                  Please do not share this private link with others.
                </p>
              </div>

              <div style="padding:18px 30px;background:#f4f7f5;color:#78847d;font-size:12px;">
                Iklo · Secure childcare experience
              </div>
            </div>
          </body>
        </html>
      `,
      text: `Hello ${parentName}, ${childName} has been checked in. View the live session using this temporary link: ${liveLink}. Access ends after checkout.`,
    });

    if (emailError) {
      console.error("Resend email error:", emailError);

      // Revoke the session if its parent email could not be sent.
      await supabaseAdmin
        .from("live_parent_sessions")
        .update({
          status: "CHECKED_OUT",
          checked_out_at: new Date().toISOString(),
        })
        .eq("id", insertedId);

      return NextResponse.json(
        {
          error: `Check-in was saved, but the parent email failed: ${emailError.message}`,
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
      session: data,
      message: "Check-in successful. Temporary link emailed to parent.",
    });
  } catch (error) {
    console.error("Check-in API error:", error);

    if (insertedId) {
      await supabaseAdmin
        .from("live_parent_sessions")
        .update({
          status: "CHECKED_OUT",
          checked_out_at: new Date().toISOString(),
        })
        .eq("id", insertedId);
    }

    return NextResponse.json(
      { error: "Unexpected error while processing check-in." },
      { status: 500 }
    );
  }
}
