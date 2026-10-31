import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ProjectTaskPlan = {
  title: string;
  description: string;
  assignee_id: string;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function cleanJson(content: string) {
  return content.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const openRouterKey = Deno.env.get("OPENROUTER_API_KEY");
    const authorization = req.headers.get("Authorization") || "";
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new Error("Supabase Edge Function environment is incomplete.");
    }
    if (!openRouterKey?.trim()) {
      return jsonResponse({ error: "OPENROUTER_API_KEY is not configured for project planning." }, 500);
    }
    if (!authorization.startsWith("Bearer ")) return jsonResponse({ error: "Authentication is required." }, 401);

    const authClient = createClient(supabaseUrl, anonKey);
    const { data: authData, error: authError } = await authClient.auth.getUser(authorization.slice(7));
    if (authError || !authData.user) return jsonResponse({ error: "Invalid or expired session." }, 401);

    const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const { data: company, error: companyError } = await adminClient
      .from("company_profiles")
      .select("id, company_name, industry")
      .eq("user_id", authData.user.id)
      .maybeSingle();
    if (companyError) throw new Error("Company membership could not be verified.");
    if (!company) return jsonResponse({ error: "A company account is required to generate a project plan." }, 403);

    const body = await req.json();
    const departmentId = typeof body?.department_id === "string" ? body.department_id : "";
    const projectName = typeof body?.project_name === "string" ? body.project_name.trim() : "";
    const problemStatement = typeof body?.problem_statement === "string" ? body.problem_statement.trim() : "";
    const description = typeof body?.description === "string" ? body.description.trim() : "";
    const deadline = typeof body?.deadline === "string" ? body.deadline : "";
    if (!departmentId || !projectName || !problemStatement) {
      return jsonResponse({ error: "Choose a department and provide a project name and problem statement." }, 400);
    }

    const { data: department, error: departmentError } = await adminClient
      .from("departments")
      .select("id, name, description")
      .eq("id", departmentId)
      .eq("company_id", company.id)
      .maybeSingle();
    if (departmentError) throw new Error("Department could not be verified.");
    if (!department) return jsonResponse({ error: "The selected department does not belong to this company." }, 403);

    const { data: employees, error: employeesError } = await adminClient
      .from("employee_profiles")
      .select("id, full_name, role, experience_level, technical_skills, onboarding_goals, additional_info")
      .eq("company_id", company.id)
      .eq("department_id", department.id)
      .order("full_name");
    if (employeesError) throw new Error("Department employee profiles could not be loaded.");
    if (!employees?.length) return jsonResponse({ error: "The selected department has no employees to assign." }, 400);

    const employeeProfiles = employees.map((employee) => ({
      id: employee.id,
      role: employee.role || "",
      experience_level: employee.experience_level || "unspecified",
      technical_skills: Array.isArray(employee.technical_skills) ? employee.technical_skills : [],
    }));

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openRouterKey}`,
        "HTTP-Referer": "https://orion.local",
        "X-Title": "ORION Project Planner",
      },
      body: JSON.stringify({
        model: Deno.env.get("OPENROUTER_MODEL") || "openai/gpt-4o-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "You are a project manager. Create 3 to 8 concrete, appropriately scoped project tasks. Assign every task to exactly one employee from the provided roster. Match task requirements to technical skills, role, experience level, goals, and profile notes; do not give advanced work to someone lacking the experience when another qualified teammate exists. Spread work fairly, give junior employees appropriately scoped work, and do not invent employees or skills. Return only JSON with a tasks array; each task must contain title, description, and assignee_id.",
          },
          {
            role: "user",
            content: JSON.stringify({
              company: { name: company.company_name, industry: company.industry },
              department: { name: department.name, description: department.description },
              project: { name: projectName, problem_statement: problemStatement, description, deadline },
              employees: employeeProfiles,
            }),
          },
        ],
      }),
    });

    if (!response.ok) {
      const details = (await response.text()).replaceAll(openRouterKey, "[REDACTED]").slice(0, 1000);
      console.error("OpenRouter project planning failed", { status: response.status, details });
      return jsonResponse({ error: "The AI project planner could not generate tasks. Please try again later." }, 502);
    }

    const result = await response.json();
    const content = result?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      throw new Error("The AI project planner returned no content.");
    }
    const parsed = JSON.parse(cleanJson(content));
    const allowedEmployees = new Set(employeeProfiles.map((employee) => employee.id));
    const tasks: ProjectTaskPlan[] = (Array.isArray(parsed?.tasks) ? parsed.tasks : [])
      .slice(0, 8)
      .filter((task: unknown): task is Record<string, unknown> => !!task && typeof task === "object")
      .map((task: Record<string, unknown>) => ({
        title: typeof task.title === "string" ? task.title.trim().slice(0, 160) : "",
        description: typeof task.description === "string" ? task.description.trim().slice(0, 4000) : "",
        assignee_id: typeof task.assignee_id === "string" ? task.assignee_id : "",
      }))
      .filter((task: ProjectTaskPlan) => task.title && allowedEmployees.has(task.assignee_id));

    if (tasks.length < 3) throw new Error("The AI project planner returned fewer than three valid tasks.");
    return jsonResponse({ department_id: department.id, members: employees.map((employee) => employee.id), tasks });
  } catch (error) {
    console.error("PROJECT PLAN GENERATION ERROR:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Project plan generation failed." }, 500);
  }
});
