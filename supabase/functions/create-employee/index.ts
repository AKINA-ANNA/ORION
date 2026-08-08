import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
};

const LOGIN_URL =
  "https://akina-anna.github.io/ORION/auth/employee-login.html";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function temporaryPassword() {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*-_";

  const bytes = crypto.getRandomValues(new Uint8Array(20));

  return Array.from(
    bytes,
    (value) => alphabet[value % alphabet.length],
  ).join("");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function sendCredentials(
  email: string,
  fullName: string,
  password: string,
) {
  const apiKey = Deno.env.get("BREVO_API_KEY");
  const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL");
  const senderName = Deno.env.get("BREVO_SENDER_NAME") || "ORION";

  if (!apiKey) {
    throw new Error("BREVO_API_KEY is not configured.");
  }

  if (!senderEmail) {
    throw new Error("BREVO_SENDER_EMAIL is not configured.");
  }

  const safeName = escapeHtml(fullName);
  const safeEmail = escapeHtml(email);
  const safePassword = escapeHtml(password);
  const safeLoginUrl = escapeHtml(LOGIN_URL);

  const response = await fetch(
    "https://api.brevo.com/v3/smtp/email",
    {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          email: senderEmail,
          name: senderName,
        },
        to: [
          {
            email,
            name: fullName,
          },
        ],
        subject: "Welcome to ORION — Your Employee Login",
        htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Welcome to ORION</title>
</head>

<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;color:#222;">

  <div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:12px;padding:40px;">

    <h1 style="margin-top:0;">
      Welcome to ORION
    </h1>

    <p>
      Hi ${safeName},
    </p>

    <p>
      Your employee account for ORION has been created by your company.
    </p>

    <h2>Your login credentials</h2>

    <div style="background:#f3f4f6;border-radius:8px;padding:20px;margin:20px 0;">

      <p style="margin:0 0 12px;">
        <strong>Login:</strong><br>
        <a href="${safeLoginUrl}">
          ${safeLoginUrl}
        </a>
      </p>

      <p style="margin:0 0 12px;">
        <strong>Email:</strong><br>
        ${safeEmail}
      </p>

      <p style="margin:0;">
        <strong>Temporary Password:</strong><br>
        <span style="font-family:monospace;font-size:16px;">
          ${safePassword}
        </span>
      </p>

    </div>

    <p>
      Please use these credentials to log in to ORION.
    </p>

    <p>
      For security, you should change your temporary password after your
      first login.
    </p>

    <p>
      See you inside ORION.
    </p>

    <p>
      — ORION
    </p>

  </div>

</body>
</html>
        `,
        textContent: `
Welcome to ORION

Hi ${fullName},

Your employee account for ORION has been created by your company.

Login:
${LOGIN_URL}

Email:
${email}

Temporary Password:
${password}

Please log in using these credentials and change your temporary password after your first login.

— ORION
        `,
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();

    console.error("Brevo email request failed:", {
      status: response.status,
      response: errorText,
    });

    throw new Error(
      `Brevo email request failed with status ${response.status}.`,
    );
  }

  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return json(
      {
        error: "Method not allowed.",
      },
      405,
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceKey) {
      return json(
        {
          error: "Supabase environment variables are not configured.",
        },
        500,
      );
    }

    const authHeader = req.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return json(
        {
          error: "Authentication is required.",
        },
        401,
      );
    }

    /*
     * Client authenticated as the company.
     */
    const caller = createClient(
      supabaseUrl,
      anonKey,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      },
    );

    /*
     * Admin client is only used server-side.
     * NEVER expose this key to frontend JavaScript.
     */
    const admin = createClient(
      supabaseUrl,
      serviceKey,
      {
        auth: {
          persistSession: false,
        },
      },
    );

    const {
      data: { user },
      error: userError,
    } = await caller.auth.getUser();

    if (userError || !user) {
      return json(
        {
          error: "Unauthorized.",
        },
        401,
      );
    }

    const body = await req.json();

    const fullName =
      typeof body?.full_name === "string"
        ? body.full_name.trim()
        : "";

    const email =
      typeof body?.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const departmentId =
      typeof body?.department_id === "string"
        ? body.department_id.trim()
        : "";

    /*
     * We accept company_id from the existing dashboard request,
     * but we immediately verify that this company belongs to the
     * authenticated company user.
     */
    const companyId =
      typeof body?.company_id === "string"
        ? body.company_id.trim()
        : "";

    if (!fullName || !email || !departmentId || !companyId) {
      return json(
        {
          error:
            "Name, email, department, and company are required.",
        },
        400,
      );
    }

    /*
     * Verify that the authenticated user owns this company.
     */
    const {
      data: company,
      error: companyError,
    } = await admin
      .from("company_profiles")
      .select("id")
      .eq("id", companyId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (companyError) {
      console.error(
        "Company verification failed:",
        companyError,
      );

      return json(
        {
          error: "Could not verify company ownership.",
        },
        500,
      );
    }

    if (!company) {
      return json(
        {
          error:
            "You are not authorized to create employees for this company.",
        },
        403,
      );
    }

    /*
     * Verify department belongs to the same company.
     */
    const {
      data: department,
      error: departmentError,
    } = await admin
      .from("departments")
      .select("id")
      .eq("id", departmentId)
      .eq("company_id", companyId)
      .maybeSingle();

    if (departmentError) {
      console.error(
        "Department verification failed:",
        departmentError,
      );

      return json(
        {
          error: "Could not verify department.",
        },
        500,
      );
    }

    if (!department) {
      return json(
        {
          error: "Select a department in your company.",
        },
        400,
      );
    }

    /*
     * Check whether this employee already exists in this company.
     */
    const {
      data: existingProfile,
      error: existingProfileError,
    } = await admin
      .from("employee_profiles")
      .select("id, user_id, email")
      .eq("company_id", companyId)
      .eq("email", email)
      .maybeSingle();

    if (existingProfileError) {
      console.error(
        "Existing employee lookup failed:",
        existingProfileError,
      );

      return json(
        {
          error: "Could not check for an existing employee.",
        },
        500,
      );
    }

    const password = temporaryPassword();

    let employeeUserId: string;
    let employeeProfileId: string;

    /*
     * EXISTING EMPLOYEE
     *
     * Reset their temporary password and resend credentials.
     */
    if (existingProfile) {
      employeeUserId = existingProfile.user_id;
      employeeProfileId = existingProfile.id;

      const {
        error: updateAuthError,
      } = await admin.auth.admin.updateUserById(
        employeeUserId,
        {
          password,
          email_confirm: true,
          user_metadata: {
            full_name: fullName,
          },
        },
      );

      if (updateAuthError) {
        console.error(
          "Auth account update failed:",
          updateAuthError,
        );

        return json(
          {
            error: updateAuthError.message,
          },
          400,
        );
      }

      const {
        error: updateProfileError,
      } = await admin
        .from("employee_profiles")
        .update({
          full_name: fullName,
          department_id: departmentId,
          must_change_password: true,
        })
        .eq("id", employeeProfileId);

      if (updateProfileError) {
        console.error(
          "Employee profile update failed:",
          updateProfileError,
        );

        return json(
          {
            error: updateProfileError.message,
          },
          500,
        );
      }
    } else {
      /*
       * NEW EMPLOYEE
       */
      const {
        data: created,
        error: createError,
      } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
        },
      });

      if (createError || !created?.user) {
        console.error(
          "Employee Auth creation failed:",
          createError,
        );

        return json(
          {
            error:
              createError?.message ||
              "Could not create the employee account.",
          },
          400,
        );
      }

      employeeUserId = created.user.id;

      /*
       * Create employee profile.
       */
      const {
        data: profile,
        error: profileError,
      } = await admin
        .from("employee_profiles")
        .insert({
          user_id: employeeUserId,
          company_id: companyId,
          department_id: departmentId,
          full_name: fullName,
          email,
          must_change_password: true,
        })
        .select("id")
        .single();

      if (profileError || !profile) {
        console.error(
          "Employee profile creation failed:",
          profileError,
        );

        /*
         * Clean up Auth account if profile creation failed.
         */
        await admin.auth.admin.deleteUser(employeeUserId);

        return json(
          {
            error:
              profileError?.message ||
              "Could not create employee profile.",
          },
          500,
        );
      }

      employeeProfileId = profile.id;
    }

    /*
     * Send credentials through Brevo.
     */
    try {
      await sendCredentials(
        email,
        fullName,
        password,
      );
    } catch (emailError) {
      console.error(
        "Credential email failed:",
        emailError,
      );

      /*
       * The employee account exists, but the email failed.
       * We intentionally do NOT delete the account because
       * the company can resend the credentials later.
       */
      return json(
        {
          employee_id: employeeProfileId,
          credentials_sent: false,
          email_failed: true,
          message:
            "Employee account created, but the login email could not be sent.",
        },
        202,
      );
    }

    /*
     * Record when credentials were successfully emailed.
     *
     * This update is optional. If your database does not yet
     * contain credentials_email_sent_at, this update will fail.
     *
     * The employee was already successfully created and emailed,
     * so don't fail the whole operation because of this metadata.
     */
    const {
      error: timestampError,
    } = await admin
      .from("employee_profiles")
      .update({
        credentials_email_sent_at:
          new Date().toISOString(),
      })
      .eq("id", employeeProfileId);

    if (timestampError) {
      console.warn(
        "Could not record credentials_email_sent_at:",
        timestampError.message,
      );
    }

    return json({
      employee_id: employeeProfileId,
      credentials_sent: true,
      message:
        `Login credentials sent successfully to ${email}`,
    });
  } catch (error) {
    console.error(
      "Create employee error:",
      error instanceof Error
        ? error.message
        : error,
    );

    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not create employee.",
      },
      500,
    );
  }
});