import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

function cleanJson(content: string) {
  return content.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
}

async function callOpenRouter(system: string, prompt: string) {
  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey?.trim()) throw new Error("OPENROUTER_API_KEY is not configured for this Edge Function.");
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "https://orion.local",
      "X-Title": "ORION Onboarding Assessment",
    },
    body: JSON.stringify({
      model: Deno.env.get("OPENROUTER_MODEL") || "openai/gpt-4o-mini",
      messages: [{ role: "system", content: system }, { role: "user", content: prompt }],
      temperature: 0.2,
      response_format: { type: "json_object" },
    }),
  });
  if (!response.ok) throw new Error(`OpenRouter request failed (${response.status}).`);
  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("OpenRouter returned no assessment content.");
  return JSON.parse(cleanJson(content));
}

function validQuestions(value: unknown) {
  const questions = value && typeof value === "object" && Array.isArray((value as { questions?: unknown[] }).questions)
    ? (value as { questions: unknown[] }).questions : [];
  if (questions.length !== 5) throw new Error("Orion AI must return exactly five assessment questions.");
  return questions.map((item, index) => {
    const q = item as Record<string, unknown>;
    const type = q?.type;
    if (!q || type !== "mcq" || !String(q.question || "").trim() || !String(q.answer || "").trim()) {
      throw new Error(`Assessment question ${index + 1} was invalid.`);
    }
    const options = Array.isArray(q.options) ? q.options.map(String).filter(Boolean).slice(0, 4) : [];
    if (options.length !== 4 || !options.includes(String(q.answer).trim())) {
      throw new Error(`Assessment question ${index + 1} has invalid options.`);
    }
    return { type, question: String(q.question).trim(), options, answer: String(q.answer).trim() };
  });
}

function relevantKnowledge(documents: Array<{ file_name: string; extracted_text: string }>, taskText: string) {
  const terms = new Set(taskText.toLowerCase().match(/[a-z0-9]{3,}/g) || []);
  return documents
    .map((document) => ({
      document,
      score: (document.file_name + " " + document.extracted_text).toLowerCase().match(/[a-z0-9]{3,}/g)?.filter((word) => terms.has(word)).length || 0,
    }))
    .sort((a, b) => b.score - a.score)
    .filter(({ score }) => score > 0)
    .slice(0, 5)
    .map(({ document }) => `[${document.file_name}]\n${String(document.extracted_text || "").slice(0, 6000)}`)
    .join("\n\n")
    .slice(0, 30000);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (!supabaseUrl || !anonKey || !serviceKey || !token) return jsonResponse({ error: "Authentication is required." }, 401);
    const authClient = createClient(supabaseUrl, anonKey);
    const { data: authData, error: authError } = await authClient.auth.getUser(token);
    if (authError || !authData.user) return jsonResponse({ error: "Invalid or expired session." }, 401);
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const body = await req.json();
    const taskId = typeof body?.task_id === "string" ? body.task_id : "";
    if (!taskId) return jsonResponse({ error: "task_id is required." }, 400);

    const { data: task, error: taskError } = await admin.from("onboarding_tasks")
      .select("id, title, instructions, onboarding_plan_id, requires_assessment, status, assessment_attempts")
      .eq("id", taskId).maybeSingle();
    if (taskError || !task) return jsonResponse({ error: "Onboarding task not found." }, 404);
    if (!task.requires_assessment) return jsonResponse({ error: "This task does not require an assessment." }, 400);
    const { data: plan, error: planError } = await admin.from("onboarding_plans")
      .select("employee_id, company_id").eq("id", task.onboarding_plan_id).maybeSingle();
    if (planError || !plan) return jsonResponse({ error: "Onboarding plan not found." }, 404);
    const { data: employee } = await admin.from("employee_profiles").select("user_id")
      .eq("id", plan.employee_id).maybeSingle();
    if (!employee || employee.user_id !== authData.user.id) return jsonResponse({ error: "You are not allowed to assess this task." }, 403);

    if (body?.action === "grade") {
      const questions = validQuestions({ questions: body.questions });
      const answers = Array.isArray(body.answers) ? body.answers.map((answer: unknown) => String(answer || "").trim()).slice(0, 5) : [];
      if (answers.length !== 5) return jsonResponse({ error: "Answers for all five questions are required." }, 400);
      const result = await callOpenRouter(
        "You are a fair, open-minded corporate trainer grading an onboarding assessment. Grade only against the supplied questions, reference answers, and employee answers. Return strict JSON only.",
        `Return exactly {"score":0,"passed":false,"feedback":["..."]}. Score must be an integer 0-100. passed must be true only when score is at least 80.

Grade each answer for demonstrated understanding, not for copying the reference wording. All questions are multiple-choice, so treat the employee's selected option as correct when it matches the supported answer. Give concise, constructive feedback only for genuinely incorrect concepts.

Questions and reference answers: ${JSON.stringify(questions)}
Employee answers: ${JSON.stringify(answers)}`,
      );
      const score = Math.max(0, Math.min(100, Math.round(Number(result?.score) || 0)));
      const passed = score >= 80;
      const feedback = Array.isArray(result?.feedback) ? result.feedback.map(String).slice(0, 5) : [];
      const { error: updateError } = await admin.from("onboarding_tasks").update({
        assessment_score: score,
        assessment_attempts: Number(task.assessment_attempts || 0) + 1,
        assessment_completed: passed,
        ...(passed ? { status: "completed", completed_at: new Date().toISOString() } : {}),
      }).eq("id", task.id);
      if (updateError) throw updateError;
      return jsonResponse({ score, passed, feedback });
    }

    const { data: documents } = await admin.from("company_knowledge")
      .select("file_name, extracted_text").eq("company_id", plan.company_id).eq("processing_status", "processed").limit(10);
    const knowledge = relevantKnowledge(documents || [], `${task.title} ${task.instructions || ""}`);
    const result = await callOpenRouter(
      "You are a supportive corporate trainer. Create simple, confidence-building onboarding assessments. Never use external knowledge. Every question and answer must be supported solely by the supplied task material and company knowledge.",
      `Return ONLY valid JSON exactly shaped as {"questions":[{"type":"mcq","question":"","options":["","","",""],"answer":""}]}. Generate exactly five easy multiple-choice questions. Every question must have type "mcq", exactly four options, and an answer that exactly matches one option. Use plain language, test one clear fact or action at a time, and make the correct option directly supported by the task material. Avoid trick questions, negatives (such as "which is NOT"), ambiguous wording, obscure details, and questions that require inference beyond the supplied material. Make distractors clearly less suitable but plausible.\n\nTask title: ${task.title}\nTask description: ${task.instructions || ""}\nTask instructions: ${task.instructions || ""}\nAttached learning resources: No task-specific attachments were provided.\nRelevant company knowledge (use only if relevant):\n${knowledge || "No company knowledge was supplied."}`,
    );
    return jsonResponse({ questions: validQuestions(result) });
  } catch (error) {
    console.error("Onboarding assessment error:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Unable to run assessment." }, 500);
  }
});
