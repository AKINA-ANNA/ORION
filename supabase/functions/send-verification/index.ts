import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/*
 * Only these hosts may be used as post-verification redirects.
 * Add your production domain here if it changes.
 */
const ALLOWED_REDIRECT_HOSTS = [
  "akina-anna.github.io",
  "localhost",
  "127.0.0.1",
];

/*
 * Maximum number of users scanned when looking up an email.
 * 50 pages x 1000 users = 50 000 users.
 */
const MAX_USER_PAGES = 50;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function isAllowedRedirect(value: string) {
  try {
    const url = new URL(value);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return false;
    }

    return ALLOWED_REDIRECT_HOSTS.includes(url.hostname);
  } catch {
    return false;
  }
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function findUserByEmail(
  admin: ReturnType<typeof createClient>,
  email: string,
) {
  for (let page = 1; page <= MAX_USER_PAGES; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) {
      throw new Error(`Could not look up users: ${error.message}`);
    }

    const user = data.users.find(
      (candidate) =>
        (candidate.email || "").toLowerCase() === email.toLowerCase(),
    );

    if (user) {
      return user;
    }

    if (data.users.length < 1000) {
      break;
    }
  }

  return null;
}

async function sendVerificationEmail(
  email: string,
  fullName: string,
  actionLink: string,
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

  const safeName = escapeHtml(fullName || email);
  const safeEmail = escapeHtml(email);
  const safeLink = escapeHtml(actionLink);

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
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
          name: fullName || email,
        },
      ],
      subject: "Verify your ORION email address",
      htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Verify your ORION email</title>
</head>

<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;color:#222;">

  <div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:12px;padding:40px;">

    <h1 style="margin-top:0;">
      Verify your email
    </h1>

    <p>
      Hi ${safeName},
    </p>

    <p>
      Thanks for signing up to ORION. Please confirm that
      <strong>${safeEmail}</strong> is your email address by
      clicking the button below.
    </p>

    <p style="margin:32px 0;">
      <a
        href="${safeLink}"
        style="display:inline-block;background:#111111;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:bold;"
      >
        Verify Email
      </a>
    </p>

    <p style="font-size:13px;color:#555;">
      If the button does not work, copy and paste this link into your browser:
      <br>
      <a href="${safeLink}">${safeLink}</a>
    </p>

    <p style="font-size:13px;color:#555;">
      If you did not create an ORION account, you can safely ignore this email.
    </p>

    <p>
      — ORION
    </p>

  </div>

</body>
</html>
      `,
      textContent: `
Verify your ORION email

Hi ${fullName || email},

Thanks for signing up to ORION. Please confirm that ${email} is your email address by opening the link below:

${actionLink}

If you did not create an ORION account, you can safely ignore this email.

— ORION
      `,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();

    console.error("Brevo verification email failed:", {
      status: response.status,
      response: errorText,
    });

    throw new Error(
      `Verification email could not be sent (Brevo status ${response.status}).`,
    );
  }

  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed." }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !serviceKey || !anonKey) {
      return json(
        {
          error: "Supabase environment variables are not configured.",
        },
        500,
      );
    }

    /*
     * The endpoint is public so unauthenticated users can sign up.
     * We still require the project's anon key to avoid random abuse.
     */
    const apikey = req.headers.get("apikey");

    if (!apikey || apikey !== anonKey) {
      return json({ error: "Missing or invalid API key." }, 401);
    }

    const body = await req.json().catch(() => null);

    const email =
      typeof body?.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const password =
      typeof body?.password === "string" ? body.password : "";

    const metadata =
      body?.metadata && typeof body.metadata === "object"
        ? body.metadata
        : {};

    if (!isValidEmail(email)) {
      return json({ error: "Please enter a valid email address." }, 400);
    }

    if (password.length < 8) {
      return json(
        { error: "Password must contain at least 8 characters." },
        400,
      );
    }

    const fallbackRedirect = `${supabaseUrl.replace(
      /\/$/,
      "",
    )}`;

    const requestedRedirect =
      typeof body?.redirectTo === "string" ? body.redirectTo : "";

    const redirectTo = isAllowedRedirect(requestedRedirect)
      ? requestedRedirect
      : fallbackRedirect;

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const existingUser = await findUserByEmail(admin, email);

    if (existingUser?.email_confirmed_at) {
      return json(
        {
          error:
            "An account with this email already exists. Please log in instead.",
        },
        409,
      );
    }

    let user = existingUser;

    if (!user) {
      const { data: created, error: createError } =
        await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: false,
          user_metadata: metadata,
        });

      if (createError || !created?.user) {
        console.error("Company Auth creation failed:", createError);

        return json(
          {
            error:
              createError?.message ||
              "Could not create your account.",
          },
          400,
        );
      }

      user = created.user;
    }

    /*
     * generateLink does not send an email itself. We generate the
     * confirmation link and deliver it through Brevo below.
     */
    const { data: linkData, error: linkError } =
      await admin.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: {
          redirectTo,
        },
      });

    if (linkError || !linkData?.properties?.action_link) {
      console.error("Verification link generation failed:", linkError);

      return json(
        {
          error:
            linkError?.message ||
            "Could not generate a verification link.",
        },
        500,
      );
    }

    const fullName =
      typeof metadata.full_name === "string"
        ? metadata.full_name
        : "";

    try {
      await sendVerificationEmail(
        email,
        fullName,
        linkData.properties.action_link,
      );
    } catch (emailError) {
      console.error("Verification email failed:", emailError);

      return json(
        {
          error:
            "Your account was created, but the verification email could not be sent. Please try again.",
        },
        502,
      );
    }

    return json({
      sent: true,
      email,
      message: `Verification email sent to ${email}`,
    });
  } catch (error) {
    console.error(
      "Send verification error:",
      error instanceof Error ? error.message : error,
    );

    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not send the verification email.",
      },
      500,
    );
  }
});
