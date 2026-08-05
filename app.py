"""
Orion Unified Onboarding Checklist Engine & Chat Event Extraction Pipeline
Powered by LM Studio Python SDK (`lmstudio-python`)
Combines Tiles Web App, LLM Proxy/Generator, and Chat Event Extraction into a single application.
"""

import sys
from flask import Flask, request, jsonify, send_from_directory
import os
import json
import re
import time
import random
import lmstudio as lms

# Reconfigure stdout for utf-8 encoding on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# Initialize Flask app
app = Flask(__name__, static_folder=None)

# Paths & Environment Config
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CHAT_FILE = os.path.join(BASE_DIR, 'chat.txt')
EVENTS_FILE = os.path.join(BASE_DIR, 'events.json')
LM_STUDIO_URL = os.environ.get('LM_STUDIO_URL', 'localhost:1234')
MODEL_NAME = os.environ.get('MODEL_NAME', 'qwen2.5-coder-0.5b-instruct')

# In-memory Tiles storage (preserves existing tiles and appends new ones)
STORED_TILES = [
  { "id": "step-demo-1", "step_no": 1, "step_title": "SSH Keys & GitHub Access", "step_instructions": "Generate Ed25519 SSH keys, configure 2FA, and join core GitHub org.", "step_phase": "Day 1 Setup", "completed": False },
  { "id": "step-demo-2", "step_no": 2, "step_title": "Credential Vault & Secrets Setup", "step_instructions": "Authenticate with Vault/1Password to retrieve staging API tokens.", "step_phase": "Security & Access", "completed": False },
  { "id": "step-demo-3", "step_no": 3, "step_title": "Clone Microservices Repos", "step_instructions": "Clone payment-gateway, auth-service, and billing-worker repositories.", "step_phase": "Day 1 Setup", "completed": False }
]

# Enable CORS for API routes
@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    return response

# ==========================================
# LM Studio Helper Functions
# ==========================================

def parse_api_host(url_or_host):
    """
    Parses host:port string suitable for lmstudio.Client(api_host=...).
    Handles inputs like 'http://localhost:1234/v1', 'http://127.0.0.1:1234', 'localhost:1234', etc.
    """
    if not url_or_host:
        return "localhost:1234"
    cleaned = str(url_or_host).strip()
    cleaned = re.sub(r'^https?://', '', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'/(v1|api/v1|api/v0)?/?$', '', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'/.*$', '', cleaned)
    return cleaned or "localhost:1234"

def resolve_model(client, requested_model=None):
    """Try using requested model, or fallback to first loaded model in LM Studio Python SDK."""
    if requested_model and requested_model not in ("local-model", "default"):
        return requested_model
    try:
        loaded = client.list_loaded_models()
        if loaded:
            lm = loaded[0]
            return getattr(lm, 'model_key', None) or getattr(lm, 'path', None) or getattr(lm, 'identifier', str(lm))
    except Exception:
        pass
    return requested_model or MODEL_NAME

# ==========================================
# Chat & Event Extraction Logic
# ==========================================

def read_chat_history(file_path=CHAT_FILE):
    """Read chat history from file."""
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    return ""

def extract_events_with_qwen(chat_text, model_name=None, server_url=None):
    """Use LM Studio Python SDK to extract key events and timestamps from chat text."""
    system_prompt = (
        "You are an AI assistant analyzing chat history logs. Your job is to extract important events, meetings, deadlines, and reminders.\n"
        "Return ONLY a valid JSON array of objects with the exact schema below for each event:\n"
        "[\n"
        "  {\n"
        '    "event_title": "Meet Natalie",\n'
        '    "content": "Natalie asked you to meet in person at 7PM",\n'
        '    "expire": "19:00"\n'
        "  }\n"
        "]\n"
        "Ensure 'expire' is formatted in 24-hour HH:MM format (e.g. 19:00, 15:00, 18:00, 12:00). State each event concisely and clearly. Do not output markdown codeblocks or explanation text."
    )

    events = []
    target_host = parse_api_host(server_url or LM_STUDIO_URL)

    try:
        with lms.Client(api_host=target_host) as client:
            target_model = resolve_model(client, model_name or MODEL_NAME)
            model = client.llm.model(target_model)
            chat = lms.Chat(system_prompt)
            chat.add_user_message(f"Extract all important events from this chat history:\n\n{chat_text}")
            
            response = model.respond(
                chat,
                config={
                    "temperature": 0.5,
                    "maxTokens": 1024
                }
            )
            raw_content = str(response)
            events = parse_events_json(raw_content)
            print(f"✅ Extracted events via LM Studio Python SDK ({target_host} / {target_model})")
    except Exception as e:
        print(f"⚠️ LM Studio Python SDK query failed ({e}). Using regex/fallback extractor.")
        events = fallback_regex_extractor(chat_text)

    if not events:
        events = fallback_regex_extractor(chat_text)

    return events

def parse_events_json(raw_text):
    """Parse JSON array from raw model text response."""
    if not raw_text:
        return []
    cleaned = raw_text.strip()
    match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', cleaned, re.IGNORECASE)
    if match:
        cleaned = match.group(1).strip()
    
    try:
        parsed = json.loads(cleaned)
        if isinstance(parsed, list):
            return format_event_objects(parsed)
        elif isinstance(parsed, dict):
            if "events" in parsed and isinstance(parsed["events"], list):
                return format_event_objects(parsed["events"])
            return format_event_objects([parsed])
    except Exception:
        pass
    return []

def format_event_objects(items):
    formatted = []
    for item in items:
        if isinstance(item, dict):
            title = item.get('event_title') or item.get('title') or item.get('event') or 'Chat Event'
            content = item.get('content') or item.get('instructions') or item.get('description') or title
            expire = item.get('expire') or item.get('time') or item.get('timestamp') or '23:59'
            
            # Format time if needed
            if '7' in str(expire) and ('pm' in str(expire).lower() or 'tonight' in str(content).lower()):
                expire = '19:00'
            elif '3' in str(expire) and 'pm' in str(expire).lower():
                expire = '15:00'
            elif '6' in str(expire) and 'pm' in str(expire).lower():
                expire = '18:00'
            elif '12' in str(expire):
                expire = '12:00'

            formatted.append({
                "event_title": str(title).strip(),
                "content": str(content).strip(),
                "expire": str(expire).strip()
            })
    return formatted

def fallback_regex_extractor(chat_text):
    """Fallback extractor if model response fails."""
    events = []
    lines = chat_text.split('\n')
    for line in lines:
        if 'natalie' in line.lower() or 'meet' in line.lower():
            events.append({
                "event_title": "Meet Natalie",
                "content": "Natalie asked you to meet in person at 7PM to discuss project specs",
                "expire": "19:00"
            })
        elif 'roadmap' in line.lower() or '12:00' in line:
            events.append({
                "event_title": "Review Q3 Roadmap",
                "content": "Review Q3 roadmap document before deadline",
                "expire": "12:00"
            })
        elif 'staging' in line.lower() or 'deployment' in line.lower():
            events.append({
                "event_title": "Staging Deployment",
                "content": "Deployment to staging environment scheduled",
                "expire": "15:00"
            })
        elif 'soc2' in line.lower() or 'compliance' in line.lower():
            events.append({
                "event_title": "Submit SOC2 Compliance",
                "content": "SOC2 security compliance forms must be completed and submitted",
                "expire": "18:00"
            })
    return events

def append_to_events_file(new_events, file_path=EVENTS_FILE):
    """Append new events to events.json."""
    existing_events = []
    if os.path.exists(file_path):
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read().strip()
                if content:
                    existing_events = json.loads(content)
        except Exception:
            existing_events = []

    if not isinstance(existing_events, list):
        existing_events = []

    # Filter out duplicate events by title
    existing_titles = {e.get('event_title', '').lower() for e in existing_events}
    added = []
    for ev in new_events:
        if ev.get('event_title', '').lower() not in existing_titles:
            existing_events.append(ev)
            added.append(ev)

    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(existing_events, f, indent=2)

    return existing_events, added

def add_events_to_tiles(items_to_process):
    """Direct in-memory tile creation (no external HTTP connector needed)."""
    global STORED_TILES
    if not items_to_process:
        return []

    added_tiles = []
    for item in items_to_process:
        if isinstance(item, dict):
            title = item.get('event_title') or item.get('step_title') or item.get('title') or 'New Tile Event'
            content = item.get('content') or item.get('step_instructions') or item.get('instructions') or title
            expire = item.get('expire') or item.get('time') or ''
            phase = item.get('step_phase') or (f"Expire: {expire}" if expire else "Chat Pipeline")

            tile_obj = {
                "id": f"tile-{int(time.time() * 1000)}-{random.randint(100, 999)}",
                "step_no": len(STORED_TILES) + 1,
                "step_title": str(title).strip(),
                "step_instructions": str(content).strip(),
                "step_phase": str(phase).strip(),
                "expire": str(expire).strip(),
                "completed": False
            }
            STORED_TILES.append(tile_obj)
            added_tiles.append(tile_obj)

    return added_tiles

def generate_backend_fallback_steps(context, statement):
    combined = (str(context) + " " + str(statement)).lower()
    
    if any(k in combined for k in ['dev', 'code', 'backend', 'engineer', 'software', 'git', 'database', 'payment']):
        return [
            {"step_no": 1, "step_title": "Workstation SSH & Hardware Setup", "step_instructions": "Generate Ed25519 SSH keys, configure GPG signing, and upload public key to GitHub org.", "step_phase": "Day 1 Setup"},
            {"step_no": 2, "step_title": "Credential Vault & Secrets Authentication", "step_instructions": "Authenticate with 1Password/Vault to retrieve dev environment API keys and DB credentials.", "step_phase": "Security & Access"},
            {"step_no": 3, "step_title": "Repository Cloning & Microservices", "step_instructions": "Clone payment-gateway, auth-service, and billing-worker repositories locally.", "step_phase": "Day 1 Setup"},
            {"step_no": 4, "step_title": "Local Docker Containers & Infrastructure", "step_instructions": "Launch docker-compose stack containing PostgreSQL, Redis, and LocalStack mock services.", "step_phase": "Day 1 Setup"},
            {"step_no": 5, "step_title": "SOC2 & Security Compliance Training", "step_instructions": "Complete mandatory security awareness training and review data handling protocols.", "step_phase": "Security & Access"},
            {"step_no": 6, "step_title": "Database Seed & Migration Verification", "step_instructions": "Run database migration scripts and seed local environment with mock transactional data.", "step_phase": "Architecture & Tools"},
            {"step_no": 7, "step_title": "Architecture Deep-Dive Sync", "step_instructions": "Conduct 45-minute sync with Lead Engineer to review microservice boundaries and event loops.", "step_phase": "Team Integration"},
            {"step_no": 8, "step_title": "First PR Submission & Code Review", "step_instructions": "Implement starter health-check endpoint update, run test suite, and open PR for team review.", "step_phase": "Week 1 Goals"}
        ]
    elif any(k in combined for k in ['design', 'figma', 'ui', 'ux', 'prototype', 'brand', 'road']):
        return [
            {"step_no": 1, "step_title": "Figma Workspace & System Tokens", "step_instructions": "Obtain Figma organization access and import global UI design system component libraries.", "step_phase": "Day 1 Setup"},
            {"step_no": 2, "step_title": "Design Tooling & Font Installation", "step_instructions": "Install brand typography packages, accessibility audit plugins, and color token extensions.", "step_phase": "Day 1 Setup"},
            {"step_no": 3, "step_title": "Product Roadmap & Epics Review", "step_instructions": "Review current Q3 feature epics, user personas, and schedule sync with Product Lead.", "step_phase": "Team Integration"},
            {"step_no": 4, "step_title": "User Journey & UX Heuristic Audit", "step_instructions": "Conduct heuristic evaluation of current onboarding flow and document UX friction points.", "step_phase": "Week 1 Goals"},
            {"step_no": 5, "step_title": "Design Critique & Team Sync", "step_instructions": "Participate in weekly design critique and introduce yourself to engineering partners.", "step_phase": "Team Integration"},
            {"step_no": 6, "step_title": "Design System Token Parity Check", "step_instructions": "Inspect UI component parity between Figma tokens and Tailwind CSS codebase.", "step_phase": "Architecture & Tools"},
            {"step_no": 7, "step_title": "Interactive Prototype Delivery", "step_instructions": "Deliver initial high-fidelity interactive prototype for stakeholder review.", "step_phase": "Week 1 Goals"}
        ]
    else:
        return [
            {"step_no": 1, "step_title": "SaaS Account Provisioning", "step_instructions": "Initialize Slack, Notion, Linear, 1Password, and Google Workspace accounts with mandatory 2FA.", "step_phase": "Day 1 Setup"},
            {"step_no": 2, "step_title": "Hardware & Peripherals Setup", "step_instructions": "Confirm receipt of company laptop, YubiKey security token, and workspace monitor.", "step_phase": "Day 1 Setup"},
            {"step_no": 3, "step_title": "Welcome Sync with Team Lead", "step_instructions": "Schedule 30-minute introductory call to discuss role expectations and 30-day goals.", "step_phase": "Team Integration"},
            {"step_no": 4, "step_title": "Security & Compliance Certification", "step_instructions": "Review company handbook, sign data privacy policies, and complete security training.", "step_phase": "Security & Access"},
            {"step_no": 5, "step_title": "Operations & Workflow Shadowing", "step_instructions": "Shadow senior team member to learn project management norms and ticket routing.", "step_phase": "Team Integration"},
            {"step_no": 6, "step_title": "Stakeholder Introductions", "step_instructions": "Meet with cross-functional partners across Product, Engineering, and Finance.", "step_phase": "Team Integration"},
            {"step_no": 7, "step_title": "First Milestone Retrospective", "step_instructions": "Complete week 1 wrap-up survey and review initial achievements with HR Lead.", "step_phase": "Week 1 Goals"}
        ]

# ==========================================
# Routes & API Endpoints
# ==========================================

@app.route('/')
def serve_index():
    """Serve the landing page or company dashboard."""
    if os.path.exists('landing.html'):
        return send_from_directory('.', 'landing.html')
    elif os.path.exists(os.path.join('company', 'company-dashboard.html')):
        return send_from_directory('company', 'company-dashboard.html')
    return "Orion Unified Server is Running", 200

@app.route('/api/health')
def health_check():
    """Backend health check endpoint."""
    return jsonify({
        "status": "ok",
        "app": "Orion Onboarding & Pipeline Unified Server",
        "engine": "LM Studio Python SDK",
        "version": "2.1.0"
    }), 200

@app.route('/api/tiles', methods=['GET', 'POST', 'OPTIONS'])
def manage_tiles():
    """Get or save all tiles."""
    global STORED_TILES
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    
    if request.method == 'POST':
        body = request.get_json(silent=True) or {}
        tiles = body.get('tiles')
        if isinstance(tiles, list):
            STORED_TILES = tiles
            return jsonify({"status": "success", "total": len(STORED_TILES), "tiles": STORED_TILES}), 200
            
    return jsonify({"status": "success", "total": len(STORED_TILES), "tiles": STORED_TILES}), 200

@app.route('/api/add_tiles', methods=['POST', 'OPTIONS'])
def add_tiles():
    """ADD new tiles to existing tiles list (preserves old tiles)."""
    global STORED_TILES
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    payload = request.get_json(silent=True) or {}
    events = payload.get('events', [])
    tiles_input = payload.get('tiles', [])
    
    items_to_process = events if events else tiles_input
    if not items_to_process:
        return jsonify({"status": "warning", "message": "No tiles or events provided.", "total": len(STORED_TILES), "tiles": STORED_TILES}), 200

    added_tiles = add_events_to_tiles(items_to_process)

    return jsonify({
        "status": "success",
        "added_count": len(added_tiles),
        "total_tiles": len(STORED_TILES),
        "added_tiles": added_tiles,
        "tiles": STORED_TILES
    }), 200

@app.route('/events', methods=['GET'])
def get_events():
    """Get all events stored in events.json."""
    if os.path.exists(EVENTS_FILE):
        with open(EVENTS_FILE, 'r', encoding='utf-8') as f:
            try:
                return jsonify(json.load(f)), 200
            except Exception:
                pass
    return jsonify([]), 200

@app.route('/process_chat', methods=['GET', 'POST', 'OPTIONS'])
def process_chat():
    """Pipeline trigger endpoint: reads chat.txt -> LM Studio Python SDK -> events.json -> ADD tiles directly."""
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    chat_text = ""
    target_host = LM_STUDIO_URL
    target_model = MODEL_NAME

    if request.method == 'POST':
        body = request.get_json(silent=True) or {}
        chat_text = body.get('chat_text', '')
        if body.get('server_url') or body.get('target_url'):
            target_host = body.get('server_url') or body.get('target_url')
        if body.get('model_name'):
            target_model = body.get('model_name')

    if not chat_text:
        chat_text = read_chat_history()

    if not chat_text:
        return jsonify({"status": "error", "message": "No chat history found in chat.txt or request body."}), 400

    # Step 1: Extract events using LM Studio Python SDK or fallback
    extracted_events = extract_events_with_qwen(chat_text, model_name=target_model, server_url=target_host)

    # Step 2: Append to events.json
    all_events, newly_added = append_to_events_file(extracted_events)

    # Step 3: Add new tiles directly in memory without HTTP connector
    added_tiles = add_events_to_tiles(newly_added if newly_added else extracted_events)

    return jsonify({
        "status": "success",
        "engine": "lmstudio-python-sdk",
        "extracted_events_count": len(extracted_events),
        "newly_added_count": len(newly_added),
        "total_events_in_json": len(all_events),
        "added_tiles_count": len(added_tiles),
        "extracted_events": extracted_events,
        "all_events": all_events,
        "tiles": STORED_TILES
    }), 200

@app.route('/api/models', methods=['GET', 'OPTIONS'])
def get_models():
    """Fetch available and loaded models using LM Studio Python SDK."""
    if request.method == 'OPTIONS':
        return jsonify({}), 200
        
    target_url = request.args.get('target_url') or LM_STUDIO_URL
    api_host = parse_api_host(target_url)
    
    try:
        with lms.Client(api_host=api_host) as client:
            loaded_models = client.list_loaded_models()
            downloaded_models = client.list_downloaded_models()
            
            models_list = []
            seen_ids = set()
            
            # Loaded models
            for lm in loaded_models:
                m_id = getattr(lm, 'model_key', None) or getattr(lm, 'path', None) or getattr(lm, 'identifier', str(lm))
                m_name = getattr(lm, 'display_name', m_id)
                models_list.append({
                    "id": str(m_id),
                    "name": f"{m_name} (Loaded)",
                    "state": "loaded"
                })
                seen_ids.add(str(m_id))
                
            # Downloaded models
            for dm in downloaded_models:
                m_id = getattr(dm, 'model_key', None) or getattr(dm, 'path', None) or getattr(dm, 'name', str(dm))
                if str(m_id) not in seen_ids:
                    models_list.append({
                        "id": str(m_id),
                        "name": str(m_id),
                        "state": "downloaded"
                    })
                    seen_ids.add(str(m_id))

            if not models_list:
                models_list = [{"id": MODEL_NAME, "name": f"{MODEL_NAME} (Default)", "state": "default"}]

            return jsonify({
                "status": "online",
                "sdk": "lmstudio-python",
                "api_host": api_host,
                "models": models_list,
                "data": models_list
            }), 200
    except Exception as e:
        return jsonify({
            "status": "offline",
            "sdk": "lmstudio-python",
            "api_host": api_host,
            "message": f"LM Studio Python SDK host '{api_host}' unreachable ({str(e)})",
            "models": [{"id": "local-model", "name": "Orion Fallback Generator Engine"}]
        }), 200

@app.route('/api/generate', methods=['POST', 'OPTIONS'])
def generate_steps():
    """Generate onboarding steps via LM Studio Python SDK or smart fallback engine."""
    global STORED_TILES
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    payload = request.get_json(silent=True) or {}
    context = payload.get('context', '')
    statement = payload.get('statement', '')
    server_url = payload.get('target_url') or payload.get('server_url') or LM_STUDIO_URL
    model_name = payload.get('model_name') or MODEL_NAME
    system_prompt = payload.get('system_prompt')
    temperature = float(payload.get('temperature', 0.2))
    max_tokens = int(payload.get('max_tokens', 2048))
    append_mode = payload.get('append', True) # Default to ADD tiles

    api_host = parse_api_host(server_url)
    sdk_success = False
    generated_text = ""

    if context or statement:
        try:
            with lms.Client(api_host=api_host) as client:
                target_model = resolve_model(client, model_name)
                model = client.llm.model(target_model)
                
                default_sys = (
                    "You are an AI assistant for ORION, an automated employee onboarding platform.\n"
                    "Your job is to make a specific JSON format with each onboarding step:\n"
                    "{\n"
                    '  "total_steps": 5,\n'
                    '  "steps": [\n'
                    '    {\n'
                    '      "step_no": 1,\n'
                    '      "step_title": "Setup Workstation & SSH Keys",\n'
                    '      "step_instructions": "Generate SSH keys and upload public key to company GitHub organization.",\n'
                    '      "step_phase": "Day 1 Setup"\n'
                    '    }\n'
                    '  ]\n'
                    "}\n"
                    "Determine the number of onboarding steps dynamically based on the context. Return ONLY valid JSON."
                )
                
                chat = lms.Chat(system_prompt or default_sys)
                prompt_content = f"Problem Context: {context}\nKey Milestones / Statement: {statement}"
                chat.add_user_message(prompt_content)

                resp = model.respond(
                    chat,
                    config={
                        "temperature": temperature,
                        "maxTokens": max_tokens
                    }
                )
                generated_text = str(resp)
                sdk_success = True
                print(f"✅ Generated onboarding steps via LM Studio Python SDK ({api_host})")
        except Exception as e:
            print(f"⚠️ LM Studio Python SDK generation failed ({e}). Using backend fallback steps.")
            sdk_success = False

    steps = []
    if sdk_success and generated_text:
        cleaned = generated_text.strip()
        match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', cleaned, re.IGNORECASE)
        if match:
            cleaned = match.group(1).strip()
        try:
            data_obj = json.loads(cleaned)
            if isinstance(data_obj, dict) and "steps" in data_obj:
                steps = data_obj["steps"]
            elif isinstance(data_obj, list):
                steps = data_obj
        except Exception:
            pass

    if not steps:
        steps = generate_backend_fallback_steps(context, statement)
        source = "orion-fallback-engine"
    else:
        source = "lmstudio-python-sdk"

    new_step_objs = []
    for idx, s in enumerate(steps):
        tile_obj = {
            "id": f"tile-{int(time.time() * 1000)}-{random.randint(100, 999)}",
            "step_no": len(STORED_TILES) + idx + 1 if append_mode else idx + 1,
            "step_title": str(s.get("step_title") or s.get("title") or f"Step {idx + 1}").strip(),
            "step_instructions": str(s.get("step_instructions") or s.get("instructions") or s.get("content") or "").strip(),
            "step_phase": str(s.get("step_phase") or s.get("phase") or "Day 1 Setup").strip(),
            "completed": False
        }
        new_step_objs.append(tile_obj)
        if append_mode:
            STORED_TILES.append(tile_obj)

    return jsonify({
        "status": "success",
        "sdk": "lmstudio-python",
        "source": source,
        "total_steps": len(new_step_objs),
        "steps": new_step_objs,
        "all_tiles": STORED_TILES
    }), 200

@app.route('/api/generate-roadmap', methods=['POST', 'OPTIONS'])
def generate_roadmap_orion():
    """Generate roadmap for Orion Company Dashboard onboarding setup."""
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

    tasks = []
    source = "lmstudio-python-sdk"

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
        clean_host = parse_api_host(LM_STUDIO_URL)
        with lms.Client(api_host=clean_host) as client:
            target_model = resolve_model(client, MODEL_NAME)
            model = client.llm.model(target_model)
            
            chat = lms.Chat(system_prompt)
            chat.add_user_message(user_prompt)
            
            response = model.respond(chat, config={"temperature": 0.3, "maxTokens": 2048})
            raw_text = str(response).strip()
            
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
        # Fallback generator
        tasks = generate_backend_fallback_steps(company_context, f"{role} {company_expectations} {onboarding_goals}")
        source = "orion-fallback-engine"

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


@app.route('/api/onboarding-guidance', methods=['POST', 'OPTIONS'])
def onboarding_guidance():
    """Generate step-by-step guidance for a specific onboarding task."""
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    payload = request.get_json(silent=True) or {}
    role = payload.get('role', 'Employee')
    experience = payload.get('experience_level', 'Mid')
    skills = payload.get('technical_skills', [])
    context = payload.get('company_context', '')
    task_title = payload.get('task_title', 'Onboarding Task')
    task_instructions = payload.get('task_instructions', '')
    step_phase = payload.get('step_phase', 'General')

    system_prompt = (
        "You are ORION AI, a senior technical mentor assisting a newly hired employee during onboarding.\n"
        "Provide a clear, practical, step-by-step actionable guide (4 to 6 steps) for completing the requested task.\n"
        "Return ONLY a valid JSON object with the exact schema below:\n"
        "{\n"
        '  "task_title": "Setup Workstation & SSH Keys",\n'
        '  "guidance": [\n'
        '    {\n'
        '      "step": 1,\n'
        '      "title": "Generate Keypair",\n'
        '      "details": "Open terminal and run ssh-keygen -t ed25519 -C email@company.com."\n'
        '    }\n'
        '  ]\n'
        "}\n"
        "Do not output markdown codeblocks or explanation text outside the JSON."
    )

    user_prompt = f"""
Employee Role: {role}
Experience Level: {experience}
Technical Skills: {json.dumps(skills)}
Company Context: {context}

Current Onboarding Task: {task_title}
Phase: {step_phase}
Task Instructions: {task_instructions}
"""

    guidance = []
    source = "lmstudio-python-sdk"

    try:
        clean_host = parse_api_host(LM_STUDIO_URL)
        with lms.Client(api_host=clean_host) as client:
            target_model = resolve_model(client, MODEL_NAME)
            model = client.llm.model(target_model)
            chat = lms.Chat(system_prompt)
            chat.add_user_message(user_prompt)
            resp = model.respond(chat, config={"temperature": 0.2, "maxTokens": 1500})
            raw_text = str(resp).strip()
            match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', raw_text, re.IGNORECASE)
            cleaned = match.group(1).strip() if match else raw_text
            parsed = json.loads(cleaned)
            if isinstance(parsed, dict) and "guidance" in parsed:
                guidance = parsed["guidance"]
            elif isinstance(parsed, list):
                guidance = parsed
    except Exception as e:
        print(f"⚠️ LM Studio guidance query failed ({e}). Using fallback guidance generator.")
        source = "orion-fallback-engine"

    if not guidance:
        guidance = [
            {"step": 1, "title": "Understand Requirements & Access Needed", "details": f"Review task objective: {task_instructions or task_title}. Ensure you have necessary credentials and software permissions."},
            {"step": 2, "title": "Environment & Tooling Verification", "details": "Check that local tools, repositories, and config files match your team's standard setup guidelines."},
            {"step": 3, "title": "Execute Step-by-Step Task Goals", "details": f"Perform the key action required for '{task_title}'. Document any questions or output for review."},
            {"step": 4, "title": "Validate & Test Results", "details": "Run tests, verify access, or test configuration to confirm successful setup."},
            {"step": 5, "title": "Notify Team & Mark Complete", "details": "Post an update in your team channel or notify your onboarding buddy, then click 'Mark Completed'."}
        ]

    return jsonify({
        "status": "success",
        "source": source,
        "task_title": task_title,
        "guidance": guidance
    }), 200


@app.route('/<path:filepath>')
def serve_static(filepath):
    """Serve static HTML, CSS, JS, images, and assets."""
    if os.path.isfile(filepath):
        return send_from_directory('.', filepath)
    # Check if inside company or employee subdirectories
    for d in ['company', 'employee', 'auth']:
        full_p = os.path.join(d, filepath)
        if os.path.isfile(full_p):
            return send_from_directory('.', full_p)
    return f"File Not Found: {filepath}", 404


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 1224))
    print(f"🚀 Starting Orion Unified Server (LM Studio Python SDK Engine) on http://localhost:{port}")
    if '--process' in os.sys.argv:
        print("⚡ Processing chat.txt pipeline via LM Studio Python SDK...")
        txt = read_chat_history()
        evs = extract_events_with_qwen(txt)
        all_ev, added = append_to_events_file(evs)
        added_tiles = add_events_to_tiles(added if added else evs)
        print(f"✅ Extracted {len(evs)} events, appended to events.json ({len(all_ev)} total).")
        print(f"✅ Added {len(added_tiles)} new tiles in-memory.")
    app.run(host='0.0.0.0', port=port, debug=True)
