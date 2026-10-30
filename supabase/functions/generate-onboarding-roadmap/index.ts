import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type RoadmapTask = {
  step_no: number;
  title: string;
  instructions: string;
  step_phase: string;
  order_index: number;
  status: "pending";
};

class OpenRouterRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly providerMessage: string,
  ) {
    super(`OpenRouter request failed (${status}).`);
    this.name = "OpenRouterRequestError";
  }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function cleanJson(content: string) {
  return content
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function normaliseTasks(value: unknown): RoadmapTask[] {
  const candidates = Array.isArray(value)
    ? value
    : value && typeof value === "object" && Array.isArray((value as { tasks?: unknown[] }).tasks)
      ? (value as { tasks: unknown[] }).tasks
      : [];

  const tasks = candidates
    .filter((task): task is Record<string, unknown> => !!task && typeof task === "object")
    .slice(0, 50)
    .map((task, index) => ({
      step_no: index + 1,
      title: String(task.title ?? task.step_title ?? `Task ${index + 1}`).trim(),
      instructions: String(task.instructions ?? task.step_instructions ?? "").trim(),
      step_phase: String(task.step_phase ?? task.phase ?? "General").trim(),
      order_index: index + 1,
      status: "pending" as const,
    }))
    .filter((task) => task.title.length > 0);

  if (!tasks.length) throw new Error("AI returned no valid onboarding tasks.");
  return tasks;
}

function fallbackTasks(role: string, companyContext: string, goals: string[]): RoadmapTask[] {
  const roleLabel = role || "new employee";
  const contextHint = companyContext || goals.join("; ") || "the company onboarding plan";
  return [
    { step_no: 1, title: "Complete account and access setup", instructions: `Confirm the tools, accounts, and access required for your role as ${roleLabel}.`, step_phase: "Day 1 Setup", order_index: 1, status: "pending" },
    { step_no: 2, title: "Review company and team context", instructions: `Review the relevant company context and documentation: ${contextHint}.`, step_phase: "Day 1", order_index: 2, status: "pending" },
    { step_no: 3, title: "Meet your team and align on expectations", instructions: "Schedule an introductory discussion with your manager or onboarding buddy to confirm priorities and ways of working.", step_phase: "Week 1", order_index: 3, status: "pending" },
  ];
}

async function callOpenRouter(systemPrompt: string, userPrompt: string) {
  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  const endpoint = "https://openrouter.ai/api/v1/chat/completions";
  const apiKeyConfigured = Boolean(apiKey?.trim());
  const authorizationHeader = apiKeyConfigured ? `Bearer ${apiKey}` : "";

  console.info("OpenRouter request diagnostics", {
    apiKeyConfigured,
    apiKeyLength: apiKey?.length ?? 0,
    authorizationHeaderConstructed: authorizationHeader.startsWith("Bearer "),
    openRouterEndpoint: endpoint,
  });

  if (!apiKeyConfigured) {
    throw new Error("OPENROUTER_API_KEY is not configured for this Edge Function.");
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "https://orion.local",
      "X-Title": "ORION Onboarding",
    },
    body: JSON.stringify({
      model: Deno.env.get("OPENROUTER_MODEL") || "openai/gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    }),
  });

  console.info("OpenRouter response diagnostics", {
    openRouterStatus: response.status,
  });

  if (!response.ok) {
    const rawDetails = await response.text();
    const providerMessage = rawDetails
      .replaceAll(apiKey, "[REDACTED]")
      .slice(0, 2000);
    console.error("OpenRouter onboarding request failed", {
      openRouterStatus: response.status,
      openRouterError: providerMessage,
    });
    throw new OpenRouterRequestError(response.status, providerMessage);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") throw new Error("OpenRouter returned no AI content.");
  return JSON.parse(cleanJson(content));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authHeader = req.headers.get("Authorization") || "";

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      throw new Error("Supabase Edge Function environment is incomplete.");
    }
    const openRouterApiKey = Deno.env.get("OPENROUTER_API_KEY");
    const apiKeyConfigured = Boolean(openRouterApiKey?.trim());
    console.info("OpenRouter configuration diagnostics", {
      apiKeyConfigured,
      apiKeyLength: openRouterApiKey?.length ?? 0,
    });
    if (!apiKeyConfigured) {
      return jsonResponse({ error: "OPENROUTER_API_KEY is not configured for this Edge Function." }, 500);
    }
    if (!authHeader.startsWith("Bearer ")) return jsonResponse({ error: "Authentication is required." }, 401);

    const token = authHeader.slice("Bearer ".length);
    const authClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: authData, error: authError } = await authClient.auth.getUser(token);
    if (authError || !authData.user) return jsonResponse({ error: "Invalid or expired session." }, 401);

    const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const body = await req.json();
    const action = body?.action === "task-guidance" ? "task-guidance" : "generate-roadmap";

    if (body?.action === "adaptive-question") {
      const targetStep = Number(body?.target_step);
      if (![2, 3, 4, 5].includes(targetStep)) return jsonResponse({ error: "target_step must be between 2 and 5." }, 400);
      const { data: employee, error: employeeError } = await adminClient
        .from("employee_profiles")
        .select("id, company_id, department_id, full_name, role, experience_level, technical_skills, onboarding_goals, working_preferences, additional_info")
        .eq("user_id", authData.user.id)
        .maybeSingle();
      if (employeeError || !employee) return jsonResponse({ error: "Employee membership could not be verified." }, 403);

      const { data: company, error: companyError } = await adminClient
        .from("company_profiles")
        .select("company_name, industry, company_description, technologies, onboarding_focus")
        .eq("id", employee.company_id)
        .maybeSingle();
      if (companyError || !company) throw new Error("Company context could not be loaded.");

      let departmentName = "";
      if (employee.department_id) {
        const { data: department, error: departmentError } = await adminClient
          .from("departments")
          .select("name")
          .eq("id", employee.department_id)
          .maybeSingle();
        if (departmentError) throw new Error("Employee department context could not be loaded.");
        departmentName = department?.name || "";
      }

      const answers = body?.previous_answers && typeof body.previous_answers === "object" ? body.previous_answers : {};
      const previousAnswers = JSON.stringify(answers).slice(0, 6000);
      const employeeContext = JSON.stringify({
        full_name: employee.full_name || "",
        role: employee.role || answers.role || "",
        department: departmentName,
        experience_level: employee.experience_level || "",
        technical_skills: employee.technical_skills || [],
        onboarding_goals: employee.onboarding_goals || [],
        working_preferences: employee.working_preferences || [],
        additional_info: employee.additional_info || "",
      }).slice(0, 4000);
      const companyContext = JSON.stringify({
        company_name: company?.company_name || "",
        industry: company?.industry || "",
        description: company?.company_description || "",
        technologies: company?.technologies || [],
        onboarding_focus: company?.onboarding_focus || "",
      }).slice(0, 4000);
      const topic = targetStep === 2
        ? "experience level and working style for this role"
        : targetStep === 3
          ? "technical skills relevant to this role, department, and company technology stack"
          : targetStep === 4
            ? "early onboarding goals connected to this role and company"
            : "the learning and work approaches that would make onboarding tasks comfortable and enjoyable for this employee";
      const result = await callOpenRouter(
        "You tailor a friendly, first-time employee onboarding questionnaire. Return strict JSON only.",
        `Return exactly {"question":"","description":"","options":[""]}. Create one simple question about ${topic}, tailored from the employee profile, company context, and the employee's previous answers. Use plain language and provide 4 to 8 short options written specifically for this employee's role and context. Step 2 is single-select; steps 3 through 5 are select-all-that-apply. Do not ask for sensitive personal information or invent company facts beyond the supplied context. For work and learning preferences, make the options practical ways to structure or learn onboarding tasks, not personality labels.\n\nEmployee profile: ${employeeContext}\nCompany context: ${companyContext}\nPrevious answers: ${previousAnswers}`,
      );
      const question = typeof result?.question === "string" ? result.question.trim() : "";
      const description = typeof result?.description === "string" ? result.description.trim() : "";
      const options = Array.isArray(result?.options) ? result.options.map((option: unknown) => String(option).trim()).filter(Boolean).slice(0, 8) : [];
      if (!question || options.length < 4) throw new Error("AI returned an incomplete questionnaire follow-up.");
      return jsonResponse({ source: "openrouter", question, description, options });
    }

    if (action === "task-guidance") {
      const taskId = typeof body.task_id === "string" ? body.task_id : "";
      if (!taskId) return jsonResponse({ error: "task_id is required for task guidance." }, 400);

      const { data: task, error: taskError } = await adminClient
        .from("onboarding_tasks")
        .select("id, title, instructions, step_phase, onboarding_plan_id")
        .eq("id", taskId)
        .maybeSingle();
      if (taskError || !task) return jsonResponse({ error: "Onboarding task not found." }, 404);

      const { data: plan, error: planError } = await adminClient
        .from("onboarding_plans")
        .select("employee_id, company_context")
        .eq("id", task.onboarding_plan_id)
        .maybeSingle();
      if (planError || !plan) return jsonResponse({ error: "Onboarding plan not found." }, 404);

      const { data: employee, error: employeeError } = await adminClient
        .from("employee_profiles")
        .select("user_id, role, experience_level, technical_skills, onboarding_goals, working_preferences")
        .eq("id", plan.employee_id)
        .maybeSingle();
      if (employeeError || !employee || employee.user_id !== authData.user.id) {
        return jsonResponse({ error: "You are not allowed to request guidance for this task." }, 403);
      }

      const guidancePrompt = `You are ORION AI, a supportive onboarding mentor. Break the assigned task into 4 to 6 clear, ordered, manageable actions that let the employee complete the original task. Keep the assigned task title and expected outcome intact; these are supporting steps, not replacement tasks. Match the explanation depth to the employee's experience and use their preferred learning/work style. Only use facts in the task and company context; do not invent access, tools, people, or policies. Return ONLY valid JSON with this exact shape: {"guidance":[{"step":1,"title":"","details":""}]}.\n\nEmployee role: ${employee.role || "Employee"}\nExperience: ${employee.experience_level || "Not specified"}\nSkills: ${JSON.stringify(employee.technical_skills || [])}\nEmployee goals: ${JSON.stringify(employee.onboarding_goals || [])}\nLearning and working preferences: ${JSON.stringify(employee.working_preferences || [])}\nCompany context: ${plan.company_context || ""}\nTask: ${task.title}\nPhase: ${task.step_phase || "General"}\nInstructions: ${task.instructions || ""}`;
      const aiResult = await callOpenRouter("You produce concise, actionable onboarding guidance as strict JSON.", guidancePrompt);
      const guidance = Array.isArray(aiResult?.guidance)
        ? aiResult.guidance
          .slice(0, 8)
          .map((item: unknown, index: number) => {
            if (!item || typeof item !== "object") return null;
            const step = item as Record<string, unknown>;
            const title = typeof step.title === "string" ? step.title.trim() : "";
            const details = typeof step.details === "string" ? step.details.trim() : "";
            if (!title || !details) return null;
            return { step: index + 1, title, details };
          })
          .filter((item: { step: number; title: string; details: string } | null): item is { step: number; title: string; details: string } => item !== null)
        : [];
      if (guidance.length < 3) throw new Error("OpenRouter returned an incomplete task breakdown.");
      return jsonResponse({ status: "success", source: "openrouter", task_title: task.title, guidance });
    }

    const employeeId = typeof body?.employee_id === "string" ? body.employee_id : "";
    const companyId = typeof body?.company_id === "string" ? body.company_id : "";
    const employee = body?.employee && typeof body.employee === "object" ? body.employee : null;
    const companyContext = typeof body?.company_context === "string" ? body.company_context : "";
    const expectations = Array.isArray(body?.company_expectations) ? body.company_expectations.filter((value: unknown) => typeof value === "string") : [];
    const goals = Array.isArray(body?.onboarding_goals) ? body.onboarding_goals.filter((value: unknown) => typeof value === "string") : [];
    const additionalInstructions = typeof body?.additional_instructions === "string" ? body.additional_instructions : "";

    if (!employeeId || !companyId || !employee) return jsonResponse({ error: "employee_id, company_id, and employee information are required." }, 400);

    const { data: company, error: companyError } = await adminClient
      .from("company_profiles")
      .select("id")
      .eq("id", companyId)
      .eq("user_id", authData.user.id)
      .maybeSingle();
    if (companyError || !company) return jsonResponse({ error: "You are not allowed to generate a roadmap for this company." }, 403);

    const { data: employeeRecord, error: employeeRecordError } = await adminClient
      .from("employee_profiles")
      .select("id, full_name, role, experience_level, technical_skills, onboarding_goals, working_preferences, additional_info, questionnaire_completed")
      .eq("id", employeeId)
      .eq("company_id", companyId)
      .maybeSingle();
    if (employeeRecordError || !employeeRecord) return jsonResponse({ error: "The selected employee does not belong to this company." }, 403);

    const role = String(employeeRecord.role || "Employee");
    const experience = String(employeeRecord.experience_level || "Not specified");
    const skills = Array.isArray(employeeRecord.technical_skills) ? employeeRecord.technical_skills : [];
    const employeeGoals = Array.isArray(employeeRecord.onboarding_goals)
      ? employeeRecord.onboarding_goals.filter((value: unknown) => typeof value === "string")
      : [];
    const employeePreferences = Array.isArray(employeeRecord.working_preferences)
      ? employeeRecord.working_preferences.filter((value: unknown) => typeof value === "string")
      : [];
    const employeeNotes = typeof employeeRecord.additional_info === "string" ? employeeRecord.additional_info : "";
    const roadmapPrompt = `You are ORION AI, an employee onboarding strategist. Return ONLY valid JSON with exactly this shape: {"tasks":[{"title":"","instructions":"","step_phase":"","order_index":1}]}. Generate a practical, personalized onboarding roadmap with a dynamic number of specific tasks. Use the employee's own questionnaire answers to choose the right depth, examples, task formats, pacing, and early wins, and combine them with the company brief so every task feels written for this person. Respect the employee's stated learning and work preferences when breaking tasks into steps. Do not include markdown or commentary.\n\nEmployee: ${String(employeeRecord.full_name || employee.name || "New employee")}\nRole: ${role}\nExperience: ${experience}\nTechnical skills: ${JSON.stringify(skills)}\nEmployee questionnaire completed: ${employeeRecord.questionnaire_completed ? "yes" : "no"}\nEmployee onboarding goals: ${JSON.stringify(employeeGoals)}\nEmployee learning and working preferences: ${JSON.stringify(employeePreferences)}\nEmployee additional notes: ${employeeNotes}\nCompany context: ${companyContext}\nCompany expectations: ${JSON.stringify(expectations)}\nCompany and employee onboarding goals: ${JSON.stringify(goals)}\nAdditional instructions: ${additionalInstructions}`;

    try {
      const aiResult = await callOpenRouter("You create practical, structured employee onboarding roadmaps as strict JSON.", roadmapPrompt);
      const tasks = normaliseTasks(aiResult);
      return jsonResponse({ status: "success", source: "openrouter", total_tasks: tasks.length, tasks });
    } catch (aiError) {
      if (aiError instanceof OpenRouterRequestError && aiError.status === 401) {
        return jsonResponse({
          error: "OpenRouter authentication failed. Verify the OPENROUTER_API_KEY secret in this Supabase project.",
          openRouterStatus: aiError.status,
          openRouterError: aiError.providerMessage,
        }, 502);
      }
      // Preserve the project's existing explicit fallback behavior while making
      // the source visible to the Company Dashboard.
      const tasks = fallbackTasks(role, companyContext, goals);
      return jsonResponse({ status: "success", source: "orion-fallback-engine", generation_warning: aiError instanceof Error ? aiError.message : "OpenRouter generation failed.", total_tasks: tasks.length, tasks });
    }
  } catch (error) {
    console.error("Onboarding AI Edge Function error:", error);
    if (error instanceof OpenRouterRequestError) {
      return jsonResponse({
        error: "OpenRouter request failed.",
        openRouterStatus: error.status,
        openRouterError: error.providerMessage,
      }, 502);
    }
    return jsonResponse({ error: error instanceof Error ? error.message : "Unable to generate onboarding content." }, 500);
  }
});
