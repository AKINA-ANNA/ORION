"""
Orion AI Onboarding Generator Backend
Flask server providing /api/generate-roadmap for LM Studio AI generation with dynamic fallback engine.
"""

import os
import sys
import json
import re
import time
import random
from flask import Flask, request, jsonify

# Reconfigure stdout for utf-8 on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

app = Flask(__name__)

# Config
LM_STUDIO_HOST = os.environ.get("LM_STUDIO_HOST", "localhost:1234")
DEFAULT_MODEL = os.environ.get("MODEL_NAME", "qwen2.5-coder-0.5b-instruct")

# CORS Headers
@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    return response

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "ok",
        "service": "Orion AI Onboarding Engine",
        "version": "2.0.0"
    }), 200

def generate_fallback_roadmap(employee, company_context, company_expectations, onboarding_goals, additional_instructions):
    """
    Generate realistic, role-tailored fallback tasks if LM Studio is offline.
    Combines role-specific steps with the company's custom expectations & goals.
    """
    role = str(employee.get('role', '') or '').lower()
    name = employee.get('name', 'New Employee')
    skills = employee.get('technical_skills', [])
    skills_str = ", ".join(skills) if isinstance(skills, list) and skills else str(skills)

    tasks = []

    # Day 1 / Phase 1: Setup & Access
    tasks.append({
        "title": "Workstation Setup & Core System Access",
        "instructions": f"Set up work environment, configure 2FA, generate SSH keys, and gain access to company tools and GitHub org. (Role: {employee.get('role', 'Team Member')})",
        "step_phase": "Day 1 Setup",
        "order_index": 1
    })

    tasks.append({
        "title": "Security Compliance & Data Privacy Verification",
        "instructions": "Review company security policies, complete SOC2 compliance training video, and sign security handbook certification.",
        "step_phase": "Security & Access",
        "order_index": 2
    })

    # Include company expectations directly into tasks if provided
    current_index = 3
    if company_expectations and isinstance(company_expectations, list):
        for exp in company_expectations:
            if str(exp).strip():
                tasks.append({
                    "title": f"Expectation: {str(exp).strip()}",
                    "instructions": f"Focus on mastering this expectation defined by your team: {str(exp).strip()}. Review relevant repository docs or sync with your mentor.",
                    "step_phase": "Role Expectations",
                    "order_index": current_index
                })
                current_index += 1

    # Role-specific tasks
    if any(k in role for k in ['backend', 'developer', 'engineer', 'software', 'fullstack', 'code']):
        tasks.append({
            "title": "Repository Cloning & Local Environment Configuration",
            "instructions": f"Clone primary microservices repositories and set up local Docker stack (PostgreSQL, Redis). Verify local server boots cleanly.",
            "step_phase": "Architecture & Tools",
            "order_index": current_index
        })
        current_index += 1

        tasks.append({
            "title": "Authentication & Secrets Authentication",
            "instructions": "Authenticate with 1Password/Vault to retrieve staging API tokens and local development credentials.",
            "step_phase": "Architecture & Tools",
            "order_index": current_index
        })
        current_index += 1

        tasks.append({
            "title": "First Starter Ticket & PR Submission",
            "instructions": "Pick up a starter issue, make code changes, run automated unit test suite, and submit a pull request for peer review.",
            "step_phase": "First Wins",
            "order_index": current_index
        })
        current_index += 1

    elif any(k in role for k in ['design', 'figma', 'ui', 'ux', 'product']):
        tasks.append({
            "title": "Figma Workspace & Global Design Tokens Setup",
            "instructions": "Obtain Figma workspace access, install design system component libraries, and review core typography and color tokens.",
            "step_phase": "Architecture & Tools",
            "order_index": current_index
        })
        current_index += 1

        tasks.append({
            "title": "Product Roadmap & UX Heuristic Review",
            "instructions": "Review active Q3 product epic specs, conduct user flow heuristic audit, and document friction points.",
            "step_phase": "First Wins",
            "order_index": current_index
        })
        current_index += 1

    else:
        tasks.append({
            "title": "Team & Stakeholder Introduction Syncs",
            "instructions": "Schedule 1-on-1 welcome syncs with team lead, key project partners, and cross-functional leads.",
            "step_phase": "Team Integration",
            "order_index": current_index
        })
        current_index += 1

    # Goals
    if onboarding_goals and isinstance(onboarding_goals, list):
        for goal in onboarding_goals:
            if str(goal).strip():
                tasks.append({
                    "title": f"Goal: {str(goal).strip()}",
                    "instructions": f"Achieve key milestone: {str(goal).strip()}. Confirm completion with your manager.",
                    "step_phase": "30-Day Goals",
                    "order_index": current_index
                })
                current_index += 1

    return tasks


@app.route('/api/generate-roadmap', methods=['POST', 'OPTIONS'])
def generate_roadmap():
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    payload = request.get_json(silent=True) or {}
    employee = payload.get('employee', {})
    company_context = payload.get('company_context', '')
    company_expectations = payload.get('company_expectations', [])
    onboarding_goals = payload.get('onboarding_goals', [])
    additional_instructions = payload.get('additional_instructions', '')

    role = employee.get('role', 'Employee')
    name = employee.get('name', 'New Hired Employee')
    experience = employee.get('experience_level', 'Mid')
    skills = employee.get('technical_skills', [])

    # Try LM Studio Python SDK / Client
    tasks = []
    source = "lmstudio"

    system_prompt = (
        "You are ORION AI, an expert employee onboarding strategist.\n"
        "Generate a structured multi-step onboarding roadmap tailored to the employee role and company expectations.\n"
        "Return ONLY a valid JSON object matching this exact schema:\n"
        "{\n"
        '  "tasks": [\n'
        '    {\n'
        '      "title": "Setup Workstation & SSH Keys",\n'
        '      "instructions": "Generate Ed25519 SSH keys and upload public key to GitHub org.",\n'
        '      "step_phase": "Day 1 Setup",\n'
        '      "order_index": 1\n'
        '    }\n'
        '  ]\n'
        "}\n"
        "Be concise, clear, and actionable. Do not output markdown or explanation text outside the JSON."
    )

    user_prompt = f"""
Employee Name: {name}
Role: {role}
Experience Level: {experience}
Technical Skills: {json.dumps(skills)}

Company Context: {company_context}
Company Expectations: {json.dumps(company_expectations)}
Onboarding Goals: {json.dumps(onboarding_goals)}
Additional Instructions: {additional_instructions}
"""

    lm_success = False
    try:
        import lmstudio as lms
        clean_host = LM_STUDIO_HOST.replace('http://', '').replace('https://', '').split('/')[0]
        with lms.Client(api_host=clean_host) as client:
            loaded_models = client.list_loaded_models()
            model_name = getattr(loaded_models[0], 'model_key', None) if loaded_models else DEFAULT_MODEL
            model = client.llm.model(model_name or DEFAULT_MODEL)
            
            chat = lms.Chat(system_prompt)
            chat.add_user_message(user_prompt)
            
            response = model.respond(chat, config={"temperature": 0.3, "maxTokens": 2048})
            raw_text = str(response).strip()
            
            # Extract JSON
            match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', raw_text, re.IGNORECASE)
            cleaned = match.group(1).strip() if match else raw_text
            parsed = json.loads(cleaned)
            if isinstance(parsed, dict) and "tasks" in parsed and isinstance(parsed["tasks"], list):
                tasks = parsed["tasks"]
                lm_success = True
            elif isinstance(parsed, list):
                tasks = parsed
                lm_success = True
    except Exception as e:
        print(f"⚠️ LM Studio query failed ({e}). Utilizing Orion Fallback Generator Engine.")
        lm_success = False

    if not lm_success or not tasks:
        tasks = generate_fallback_roadmap(employee, company_context, company_expectations, onboarding_goals, additional_instructions)
        source = "orion-fallback-engine"

    # Normalize tasks structure
    normalized_tasks = []
    for idx, t in enumerate(tasks):
        normalized_tasks.append({
            "step_no": idx + 1,
            "title": str(t.get('title') or t.get('step_title') or f"Task {idx + 1}").strip(),
            "instructions": str(t.get('instructions') or t.get('step_instructions') or '').strip(),
            "step_phase": str(t.get('step_phase') or t.get('phase') or 'Day 1 Setup').strip(),
            "order_index": idx + 1,
            "status": "pending"
        })

    return jsonify({
        "status": "success",
        "source": source,
        "total_tasks": len(normalized_tasks),
        "tasks": normalized_tasks
    }), 200


if __name__ == '__main__':
    port = int(os.environ.get("PORT", 1224))
    print(f"🚀 Starting Orion AI Backend Server on http://localhost:{port}")
    app.run(host='0.0.0.0', port=port, debug=True)
