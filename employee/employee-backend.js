/* =========================================
   ORION EMPLOYEE DASHBOARD
========================================= */


/* =========================================
   SUPABASE CONFIG
========================================= */

const SUPABASE_URL =
    "https://zuwscpzwzrfmmzvelqgd.supabase.co";

const SUPABASE_ANON_KEY =
    "sb_publishable_qpAPz5OSRXgfwzliJaqJqw_Lb6AS8qS";


const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );


/* =========================================
   GLOBAL STATE
========================================= */

let currentUser = null;

let employeeProfile = null;


/* =========================================
   INITIALIZE
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        await loadCurrentUser();

        await loadOnboardingRoadmap();

        setupNavigation();

        setupSidebar();

        setupMentor();

        setupSOS();

        setupSearch();

    }
);


/* =========================================
   LOAD CURRENT USER
========================================= */

async function loadCurrentUser() {

    const {
        data,
        error
    } = await supabaseClient.auth.getUser();


    if (error || !data.user) {

        window.location.href =
            "login.html";

        return;

    }


    currentUser =
        data.user;


    await loadEmployeeProfile();

}


/* =========================================
   LOAD EMPLOYEE PROFILE
========================================= */

async function loadEmployeeProfile() {

    const {
        data,
        error
    } = await supabaseClient
        .from("employee_profiles")
        .select("*")
        .eq(
            "user_id",
            currentUser.id
        )
        .maybeSingle();


    if (error) {

        console.error(
            "Could not load employee profile:",
            error
        );

        return;

    }


    employeeProfile =
        data;


    updateEmployeeUI();

}


/* =========================================
   UPDATE USER UI
========================================= */

function updateEmployeeUI() {

    if (!currentUser) return;


    const metadata =
        currentUser.user_metadata || {};


    const firstName =
        metadata.first_name ||
        employeeProfile?.first_name ||
        "";


    const lastName =
        metadata.last_name ||
        employeeProfile?.last_name ||
        "";


    const fullName =
        `${firstName} ${lastName}`.trim();


    const displayName =
        fullName ||
        currentUser.email ||
        "Employee";


    document
        .getElementById(
            "welcomeTitle"
        )
        .textContent =
        `Welcome, ${displayName}`;


    document
        .getElementById(
            "sidebarUserName"
        )
        .textContent =
        displayName;


    document
        .getElementById(
            "sidebarUserEmail"
        )
        .textContent =
        currentUser.email ||
        "";


    const initial =
        displayName
            .charAt(0)
            .toUpperCase();


    document
        .getElementById(
            "userAvatar"
        )
        .textContent =
        initial;


    document
        .getElementById(
            "topAvatar"
        )
        .textContent =
        initial;

}


/* =========================================
   NAVIGATION
========================================= */

function setupNavigation() {

    const navButtons =
        document.querySelectorAll(
            "[data-page]"
        );


    navButtons.forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    const page =
                        button.dataset.page;


                    showPage(page);

                }
            );

        }
    );

}


/* =========================================
   SHOW PAGE
========================================= */

function showPage(pageName) {

    const pages =
        document.querySelectorAll(
            ".page"
        );


    pages.forEach(
        page => {

            page.classList.remove(
                "active"
            );

        }
    );


    const target =
        document.getElementById(
            `page-${pageName}`
        );


    if (target) {

        target.classList.add(
            "active"
        );

    }


    const navItems =
        document.querySelectorAll(
            ".nav-item"
        );


    navItems.forEach(
        item => {

            item.classList.toggle(
                "active",
                item.dataset.page ===
                pageName
            );

        }
    );


    const pageNames = {

        home:
            "Home",

        onboarding:
            "My Onboarding",

        tiles:
            "Onboarding Tiles",

        knowledge:
            "Knowledge",

        mentor:
            "Orion Mentor",

        team:
            "My Team",

        activity:
            "Activity",

        sos:
            "SOS Help"

    };


    document
        .getElementById(
            "currentPageName"
        )
        .textContent =
        pageNames[pageName] ||
        "Home";


    if (pageName === 'tiles' && typeof renderStepTiles === 'function') {
        renderStepTiles();
    }

    closeSidebar();

}


/* =========================================
   SIDEBAR
========================================= */

function setupSidebar() {

    document
        .getElementById(
            "openSidebar"
        )
        .addEventListener(
            "click",
            () => {

                document
                    .getElementById(
                        "sidebar"
                    )
                    .classList
                    .add("open");

            }
        );


    document
        .getElementById(
            "closeSidebar"
        )
        .addEventListener(
            "click",
            closeSidebar
        );

}


function closeSidebar() {

    document
        .getElementById(
            "sidebar"
        )
        .classList
        .remove("open");

}


/* =========================================
   KNOWLEDGE SEARCH
========================================= */

function setupSearch() {

    const input =
        document.getElementById(
            "knowledgeSearch"
        );


    input.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Enter"
            ) {

                searchKnowledge(
                    input.value.trim()
                );

            }

        }
    );

}


async function searchKnowledge(
    query
) {

    if (!query) return;


    console.log(
        "Knowledge search:",
        query
    );


    /*
        FUTURE:

        This will search the company
        knowledge base created by the
        Company Dashboard.

        Example sources:

        - GitHub
        - Notion
        - Slack
        - Microsoft Teams
        - PDFs
        - Company documents

        Results will be displayed
        inside #knowledgeResults.
    */

}


/* =========================================
   ORION MENTOR
========================================= */

function setupMentor() {

    const input =
        document.getElementById(
            "mentorInput"
        );


    const button =
        document.getElementById(
            "sendMentorMessage"
        );


    button.addEventListener(
        "click",
        sendMentorMessage
    );


    input.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();

                sendMentorMessage();

            }

        }
    );

}


async function sendMentorMessage() {

    const input =
        document.getElementById(
            "mentorInput"
        );


    const message =
        input.value.trim();


    if (!message) return;


    input.value = "";


    console.log(
        "Mentor question:",
        message
    );


    /*
        FUTURE AI FLOW:

        Employee question
                ↓
        Orion Mentor
                ↓
        Search company knowledge
                ↓
        Retrieve relevant sources
                ↓
        AI generates answer
                ↓
        Return answer + citations
    */

}


/* =========================================
   SOS
========================================= */

function setupSOS() {

    const button =
        document.getElementById(
            "submitSOS"
        );


    button.addEventListener(
        "click",
        submitSOS
    );

}


async function submitSOS() {

    const message =
        document
            .getElementById(
                "sosMessage"
            )
            .value
            .trim();


    const status =
        document
            .getElementById(
                "sosStatus"
            );


    if (!message) {

        status.textContent =
            "Please describe what you're stuck on.";

        return;

    }


    if (!currentUser) {

        status.textContent =
            "You must be logged in.";

        return;

    }


    /*
        FUTURE FLOW:

        1. Search company knowledge
        2. Orion attempts to solve
        3. If unresolved:
           Create SOS ticket
        4. Notify manager/mentor
        5. Track status
    */


    console.log(
        "SOS request:",
        message
    );


    status.textContent =
        "Your request will be processed once SOS support is connected.";

}
/* =========================================
   PROFILE
========================================= */

const profileButton =
    document.getElementById("profileButton");

const topAvatar =
    document.getElementById("topAvatar");

const profileOverlay =
    document.getElementById("profileOverlay");

const closeProfile =
    document.getElementById("closeProfile");


/* OPEN PROFILE */

function openProfile() {

    profileOverlay.classList.add("active");

    loadEmployeeProfile();

}


/* CLOSE PROFILE */

function closeProfilePanel() {

    profileOverlay.classList.remove("active");

}


/* PROFILE BUTTONS */

profileButton.addEventListener(
    "click",
    openProfile
);


topAvatar.addEventListener(
    "click",
    openProfile
);


closeProfile.addEventListener(
    "click",
    closeProfilePanel
);


/* CLOSE WHEN CLICKING OUTSIDE */

profileOverlay.addEventListener(
    "click",
    function(event) {

        if (
            event.target === profileOverlay
        ) {

            closeProfilePanel();

        }

    }
);


/* =========================================
   LOAD EMPLOYEE PROFILE
========================================= */

async function loadEmployeeProfile() {

    const {
        data: userData,
        error: userError
    } =
        await supabaseClient.auth.getUser();


    if (
        userError ||
        !userData.user
    ) {

        window.location.href =
            "login.html";

        return;

    }


    const user =
        userData.user;


    const {
        data: profile,
        error
    } =
        await supabaseClient
            .from("employee_profiles")
            .select("*")
            .eq(
                "user_id",
                user.id
            )
            .single();


    if (error) {

        console.error(
            "Could not load profile:",
            error
        );

        return;

    }


    /* =====================================
       BASIC USER INFORMATION
    ===================================== */

    const fullName =
        profile.full_name ||
        user.user_metadata?.full_name ||
        "Employee";


    const email =
        user.email ||
        "";


    /* =====================================
       PROFILE HEADER
    ===================================== */

    document.getElementById(
        "profileName"
    ).textContent =
        fullName;


    document.getElementById(
        "profileEmail"
    ).textContent =
        email;


    document.getElementById(
        "profileFullName"
    ).textContent =
        fullName;


    /* =====================================
       ROLE
    ===================================== */

    document.getElementById(
        "profileRole"
    ).textContent =
        profile.role ||
        "Not specified";


    /* =====================================
       EXPERIENCE
    ===================================== */

    document.getElementById(
        "profileExperience"
    ).textContent =
        profile.experience_level ||
        "Not specified";


    /* =====================================
       AVATAR
    ===================================== */

    const firstLetter =
        fullName
            .charAt(0)
            .toUpperCase();


    document.getElementById(
        "profileAvatar"
    ).textContent =
        firstLetter;


    document.getElementById(
        "userAvatar"
    ).textContent =
        firstLetter;


    document.getElementById(
        "topAvatar"
    ).textContent =
        firstLetter;


    /* =====================================
       SIDEBAR USER
    ===================================== */

    document.getElementById(
        "sidebarUserName"
    ).textContent =
        fullName;


    document.getElementById(
        "sidebarUserEmail"
    ).textContent =
        email;


    /* =====================================
       TECHNICAL SKILLS
    ===================================== */

    const skillsContainer =
        document.getElementById(
            "profileSkills"
        );


    skillsContainer.innerHTML = "";


    const skills =
        Array.isArray(
            profile.technical_skills
        )
            ? profile.technical_skills
            : [];


    if (skills.length === 0) {

        skillsContainer.innerHTML =
            "<span>None specified</span>";

    } else {

        skills.forEach(
            function(skill) {

                const tag =
                    document.createElement(
                        "span"
                    );

                tag.className =
                    "profile-tag";

                tag.textContent =
                    skill;

                skillsContainer.appendChild(
                    tag
                );

            }
        );

    }


    /* =====================================
       ONBOARDING GOALS
    ===================================== */

    const goalsContainer =
        document.getElementById(
            "profileGoals"
        );


    goalsContainer.innerHTML = "";


    const goals =
        Array.isArray(
            profile.onboarding_goals
        )
            ? profile.onboarding_goals
            : [];


    if (goals.length === 0) {

        goalsContainer.innerHTML =
            "<span>None specified</span>";

    } else {

        goals.forEach(
            function(goal) {

                const tag =
                    document.createElement(
                        "span"
                    );

                tag.className =
                    "profile-tag";

                tag.textContent =
                    goal;

                goalsContainer.appendChild(
                    tag
                );

            }
        );

    }


    /* =====================================
       ADDITIONAL INFORMATION
    ===================================== */

    document.getElementById(
        "profileAdditionalInfo"
    ).textContent =
        profile.additional_info ||
        "No additional information provided.";

}


/* =========================================
   LOGOUT
========================================= */

document
    .getElementById("logoutButton")
    .addEventListener(
        "click",
        async function() {

            await supabaseClient.auth.signOut();

            window.location.href =
                "login.html";

        }
    );

/* =========================================
   LOGOUT
========================================= */

async function logout() {

    await supabaseClient.auth.signOut();

    window.location.href =
        "login.html";

}


/* =========================================
   EMPLOYEE ONBOARDING ROADMAP
========================================= */

let employeePlan = null;
let employeeTasks = [];

async function loadOnboardingRoadmap() {
    if (!employeeProfile || !employeeProfile.id) {
        renderEmptyRoadmapState();
        return;
    }

    try {
        // Fetch approved onboarding plan for this employee
        const { data: plan, error: planErr } = await supabaseClient
            .from('onboarding_plans')
            .select('*')
            .eq('employee_id', employeeProfile.id)
            .eq('status', 'approved')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (planErr) {
            console.error('Error fetching onboarding plan:', planErr);
            renderEmptyRoadmapState();
            return;
        }

        if (!plan) {
            console.log('No approved onboarding plan found for employee.');
            renderEmptyRoadmapState();
            return;
        }

        employeePlan = plan;

        // Fetch onboarding tasks for this plan
        const { data: tasks, error: tasksErr } = await supabaseClient
            .from('onboarding_tasks')
            .select('*')
            .eq('onboarding_plan_id', plan.id)
            .order('order_index', { ascending: true });

        if (tasksErr) {
            console.error('Error fetching onboarding tasks:', tasksErr);
            renderEmptyRoadmapState();
            return;
        }

        employeeTasks = tasks || [];

        // Sync tilesState.steps directly with Supabase onboarding_tasks
        tilesState.steps = employeeTasks.map((t, idx) => ({
            id: t.id,
            step_no: t.step_no || t.order_index || (idx + 1),
            step_title: t.title || `Step ${idx + 1}`,
            step_instructions: t.instructions || '',
            step_phase: t.step_phase || 'General',
            order_index: t.order_index || (idx + 1),
            completed: t.status === 'completed' || t.status === 'complete',
            status: t.status || 'pending'
        }));

        // Render Roadmap UI, Home Progress Overview, Today's Focus & Tiles View
        renderRoadmap(employeeTasks);
        renderHomeProgress(employeeTasks);
        renderTodayFocus(employeeTasks);
        renderStepTiles();

    } catch (err) {
        console.error('loadOnboardingRoadmap unexpected error:', err);
        renderEmptyRoadmapState();
    }
}

function renderEmptyRoadmapState() {
    const emptyState = document.getElementById('roadmapEmptyState');
    if (emptyState) emptyState.style.display = 'block';

    const roadmapProgress = document.getElementById('roadmapProgress');
    if (roadmapProgress) roadmapProgress.textContent = '—';

    const progressBarWrap = document.getElementById('roadmapProgressBarWrap');
    if (progressBarWrap) progressBarWrap.style.display = 'none';

    // Reset home progress
    const progressText = document.getElementById('onboardingProgressText');
    if (progressText) progressText.textContent = 'No active roadmap';

    const progressDesc = document.getElementById('onboardingProgressDescription');
    if (progressDesc) progressDesc.textContent = 'Your company will create your personalized onboarding roadmap here.';

    const progressPct = document.getElementById('progressPercentage');
    if (progressPct) progressPct.textContent = '0%';

    const progressBar = document.getElementById('progressBar');
    if (progressBar) progressBar.style.width = '0%';
}

function renderRoadmap(tasks) {
    const container = document.getElementById('roadmap');
    if (!container) return;

    if (!tasks || tasks.length === 0) {
        renderEmptyRoadmapState();
        return;
    }

    // Hide empty state if present
    const emptyState = document.getElementById('roadmapEmptyState');
    if (emptyState) emptyState.style.display = 'none';

    // Group tasks by phase (step_phase)
    const phases = {};
    tasks.forEach(task => {
        const phase = task.step_phase || 'General Setup';
        if (!phases[phase]) phases[phase] = [];
        phases[phase].push(task);
    });

    let html = '';

    Object.keys(phases).forEach(phaseName => {
        html += `
            <div class="roadmap-phase-group">
                <div class="roadmap-phase-title">⚡ ${escapeHtml(phaseName)}</div>
                <div class="phase-tasks">
        `;

        phases[phaseName].forEach(task => {
            const isDone = task.status === 'completed' || task.status === 'complete';
            const checkIcon = isDone ? '✓' : '';

            html += `
                <div class="roadmap-task-card ${isDone ? 'completed' : ''}" id="task-card-${task.id}">
                    <div class="task-checkbox-wrap">
                        <button class="task-checkbox" onclick="toggleTaskStatus('${task.id}', '${task.status}')" title="${isDone ? 'Mark pending' : 'Mark complete'}">
                            ${checkIcon}
                        </button>
                    </div>
                    <div class="task-body">
                        <div class="task-meta-top">
                            <span class="task-step-num">Step ${task.step_no || task.order_index}</span>
                            <span class="task-phase-badge">${escapeHtml(task.step_phase || '')}</span>
                        </div>
                        <h4 class="task-title-text">${escapeHtml(task.title || '')}</h4>
                        <p class="task-instructions-text">${escapeHtml(task.instructions || '')}</p>
                    </div>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;
    });

    container.innerHTML = html;

    // Update Progress in Roadmap Header
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed' || t.status === 'complete').length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    const progressBadge = document.getElementById('roadmapProgress');
    if (progressBadge) {
        progressBadge.textContent = `${completed} / ${total} completed (${pct}%)`;
    }

    const progressBarWrap = document.getElementById('roadmapProgressBarWrap');
    const progressBarInner = document.getElementById('roadmapProgressBarInner');

    if (progressBarWrap) progressBarWrap.style.display = 'block';
    if (progressBarInner) progressBarInner.style.width = `${pct}%`;
}

function renderHomeProgress(tasks) {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed' || t.status === 'complete').length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    const progressText = document.getElementById('onboardingProgressText');
    if (progressText) {
        if (completed === total && total > 0) {
            progressText.textContent = 'Onboarding Completed! 🎉';
        } else {
            progressText.textContent = `Onboarding Progress (${completed} of ${total} tasks)`;
        }
    }

    const progressDesc = document.getElementById('onboardingProgressDescription');
    if (progressDesc) {
        if (completed === total && total > 0) {
            progressDesc.textContent = 'Congratulations! You have completed all steps in your onboarding roadmap.';
        } else {
            const nextTask = tasks.find(t => t.status !== 'completed' && t.status !== 'complete');
            progressDesc.textContent = nextTask ? `Next up: ${nextTask.title}` : 'Keep making progress on your assigned tasks.';
        }
    }

    const progressPct = document.getElementById('progressPercentage');
    if (progressPct) progressPct.textContent = `${pct}%`;

    const progressBar = document.getElementById('progressBar');
    if (progressBar) progressBar.style.width = `${pct}%`;
}

function renderTodayFocus(tasks) {
    const container = document.getElementById('todayTasks');
    if (!container) return;

    const pendingTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'complete');

    if (pendingTasks.length === 0) {
        if (tasks.length > 0) {
            container.innerHTML = `
                <div class="empty-state" style="padding:24px; text-align:center;">
                    <div class="empty-icon" style="font-size:28px; color:#3B7A57; margin-bottom:8px;">🎉</div>
                    <h4 style="font-size:16px; font-weight:700; color:#1C1B18;">Congratulations!</h4>
                    <p style="font-size:13px; color:#54524B; margin-top:4px;">You have completed your onboarding roadmap.</p>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="empty-state" style="padding:24px; text-align:center;">
                    <div class="empty-icon" style="font-size:24px; color:#8C887D; margin-bottom:8px;">○</div>
                    <h4 style="font-size:14px; font-weight:700;">Nothing assigned yet</h4>
                    <p style="font-size:12px; color:#78756C;">Your company will add your onboarding tasks here.</p>
                </div>
            `;
        }
        return;
    }

    const nextTask = pendingTasks[0];

    container.innerHTML = `
        <div class="today-focus-card" style="background:#FAF9F5; border:1px solid #E8E5DC; border-radius:14px; padding:16px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
            <div style="flex:1; min-width:220px;">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
                    <span style="padding:2px 8px; border-radius:10px; font-size:10px; font-weight:700; text-transform:uppercase; background:#F4F2EC; color:#54524B; border:1px solid #E8E5DC;">
                        ${escapeHtml(nextTask.step_phase || `Step ${nextTask.step_no || nextTask.order_index}`)}
                    </span>
                    <span style="font-size:11px; font-weight:600; color:#D96B43;">Next Task</span>
                </div>
                <h4 style="font-size:15px; font-weight:700; color:#1C1B18; margin-bottom:4px;">${escapeHtml(nextTask.title)}</h4>
                <p style="font-size:12px; color:#54524B; line-height:1.4;">${escapeHtml(nextTask.instructions || 'Follow step-by-step guidance to complete.')}</p>
            </div>
            <button class="btn-human-primary" onclick="continueTaskTile('${nextTask.id}')" style="padding:8px 16px; font-size:12px; background:#D96B43; color:white; border:none; border-radius:10px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:6px;">
                <span>Continue Task →</span>
            </button>
        </div>
    `;
}

function continueTaskTile(taskId) {
    showPage('tiles');
    const task = employeeTasks.find(t => t.id === taskId) || tilesState.steps.find(s => s.id === taskId);
    if (task) {
        openTaskGuidanceModal(task);
    }
}

async function toggleTaskStatus(taskId, currentStatus) {
    const newStatus = (currentStatus === 'completed' || currentStatus === 'complete') ? 'pending' : 'completed';
    const completedAt = newStatus === 'completed' ? new Date().toISOString() : null;

    // Optimistic UI update in state
    const task = employeeTasks.find(t => t.id === taskId);
    if (task) {
        task.status = newStatus;
        task.completed_at = completedAt;
    }

    const step = tilesState.steps.find(s => s.id === taskId);
    if (step) {
        step.completed = newStatus === 'completed';
        step.status = newStatus;
    }

    // Re-render locally immediately
    renderRoadmap(employeeTasks);
    renderHomeProgress(employeeTasks);
    renderTodayFocus(employeeTasks);
    renderStepTiles();

    try {
        const { error } = await supabaseClient
            .from('onboarding_tasks')
            .update({
                status: newStatus,
                completed_at: completedAt
            })
            .eq('id', taskId);

        if (error) {
            console.error('Error updating task status:', error);
            // Revert on error
            if (task) task.status = currentStatus;
            if (step) {
                step.completed = currentStatus === 'completed';
                step.status = currentStatus;
            }
            renderRoadmap(employeeTasks);
            renderHomeProgress(employeeTasks);
            renderTodayFocus(employeeTasks);
            renderStepTiles();
        }
    } catch (err) {
        console.error('toggleTaskStatus error:', err);
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}


/* =========================================================
   PURE JAVASCRIPT ONBOARDING TILES ENGINE & EVENT PIPELINE
========================================================= */

// Lucide Icons Helper Definition
function initLucideIcons() {
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

// Helper to generate unique step IDs
function generateStepId() {
  return 'step-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
}

// System Prompt for Dynamic Orion Onboarding Step Generation
const DEFAULT_SYSTEM_PROMPT = `You are an AI assistant for ORION, an automated employee onboarding platform. The output is given in a format {"problem_context", "problem_statement"}. If the question is not in the given format, acknowledge the user that the prompt is not in the acceptable format.
Your job is to make a specific JSON format with each onboarding step to solve that problem in the given format:
{
  "total_steps": 5,
  "steps": [
    {
      "step_no": 1,
      "step_title": "Setup Workstation & SSH Keys",
      "step_instructions": "Generate SSH keys and upload public key to company GitHub organization.",
      "step_phase": "Day 1 Setup"
    }
  ]
}
Determine the number of onboarding steps dynamically based on the context provided. State each task clearly.`;

// Orion Demo Presets
const DEMO_PRESETS = [
  {
    name: "Senior Backend Engineer Onboarding",
    context: "A newly hired Senior Backend Engineer is joining the Payments Infrastructure team. Onboarding requires setting up SSH keys, cloning 3 core microservices, setting up local PostgreSQL and Redis Docker containers, obtaining environment secrets from 1Password/Vault, completing SOC2 security compliance training, setting up staging database migrations, and submitting a first pull request.",
    statement: "Generate a comprehensive, multi-phase onboarding workflow to guide the new engineer from initial workstation configuration to validating their first production deployment."
  },
  {
    name: "Product Designer Onboarding",
    context: "Acme SaaS is onboarding a Senior Product Designer. Needs Figma organization access, design system token setup, 1-on-1 welcome syncs with Design & Product leads, review of the Q3 product roadmap, conducting a usability audit of core user journeys, and presenting first spec prototypes.",
    statement: "Provide a detailed onboarding workflow covering Figma setup, design system integration, stakeholder syncs, user journey audits, and prototype reviews."
  },
  {
    name: "Remote Operations & HR Provisioning",
    context: "Onboarding remote team members across Operations, HR, and Support. Needs SaaS account provisioning (Slack, Notion, Linear, Google Workspace), hardware delivery confirmation, welcome sync scheduling, security handbook certification, team shadow sessions, and 30-day milestone goal setting.",
    statement: "Create a complete operational onboarding workflow for remote employees to ensure workspace tools, security policies, team shadow sessions, and milestone check-ins are initialized."
  }
];

const DEMO_TILES = [
  { id: generateStepId(), step_no: 1, step_title: "SSH Keys & GitHub Access", step_instructions: "Generate Ed25519 SSH keys, configure 2FA, and join core GitHub org.", step_phase: "Day 1 Setup", completed: false },
  { id: generateStepId(), step_no: 2, step_title: "Credential Vault & Secrets Setup", step_instructions: "Authenticate with Vault/1Password to retrieve staging API tokens.", step_phase: "Security & Access", completed: false },
  { id: generateStepId(), step_no: 3, step_title: "Clone Microservices Repos", step_instructions: "Clone payment-gateway, auth-service, and billing-worker repositories.", step_phase: "Day 1 Setup", completed: false }
];

// Application State for Tiles
const tilesState = {
  serverUrl: 'http://localhost:1234/v1',
  modelName: 'qwen2.5-coder-0.5b-instruct',
  temperature: 0.2,
  maxTokens: 2048,
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  
  steps: [],
  searchQuery: '',
  activeFilter: 'all', // 'all' | 'pending' | 'completed'
  viewMode: 'grid', // 'grid' | 'list'
  
  isLoading: false
};

// Ported Client-Side Event Extraction Algorithm (formerly python extract_events_with_qwen)
function extractEventsFromChatText(chatText) {
  if (!chatText || typeof chatText !== 'string') return [];
  const lines = chatText.split('\n');
  const events = [];

  const timeRegex = /(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?|\d{1,2}:\d{2})/i;
  
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    
    if (/(?:meet|sync|meeting|deadline|call|review|due|schedule|lunch|demo)/i.test(trimmed)) {
      const match = trimmed.match(timeRegex);
      let expireTime = "18:00"; // default
      if (match) {
        let tStr = match[1].toLowerCase();
        if (tStr.includes('pm') && !tStr.includes('12')) {
          let num = parseInt(tStr);
          expireTime = (num + 12) + ":00";
        } else if (tStr.includes(':')) {
          expireTime = tStr.replace(/(am|pm)/i, '').trim();
        } else {
          expireTime = tStr.padStart(2, '0') + ":00";
        }
      }

      events.push({
        id: generateStepId(),
        step_no: events.length + 1,
        step_title: trimmed.length > 35 ? trimmed.substring(0, 32) + '...' : trimmed,
        step_instructions: trimmed,
        step_phase: `Expire: ${expireTime}`,
        expire: expireTime,
        completed: false
      });
    }
  });

  return events;
}

// Client-Side Fallback Step Generator (used if direct API fetch fails or offline)
function generateClientFallbackSteps(context, statement) {
  const text = (context + ' ' + statement).toLowerCase();
  const isDev = /backend|frontend|code|engineer|software|dev|git|payments|database/i.test(text);
  const isDesign = /design|figma|ui|ux|prototype|brand|road/i.test(text);

  let rawSteps = [];
  if (isDev) {
    rawSteps = [
      { step_no: 1, step_title: "Workstation SSH & Hardware Provisioning", step_instructions: "Configure workstation, generate Ed25519 SSH keys, and join company GitHub organization.", step_phase: "Day 1 Setup" },
      { step_no: 2, step_title: "Credential Vault & Secrets Setup", step_instructions: "Authenticate with Vault/1Password to gain dev environment staging tokens and database passwords.", step_phase: "Security & Access" },
      { step_no: 3, step_title: "Clone Microservices Repositories", step_instructions: "Clone payment-gateway, auth-service, and billing-worker repositories locally.", step_phase: "Day 1 Setup" },
      { step_no: 4, step_title: "Local Docker Stack & Microservices", step_instructions: "Configure docker-compose environment variables and launch local PostgreSQL, Redis, and LocalStack containers.", step_phase: "Day 1 Setup" },
      { step_no: 5, step_title: "SOC2 Compliance & Security Audit", step_instructions: "Complete mandatory security awareness videos and sign employee data privacy policy.", step_phase: "Security & Access" }
    ];
  } else if (isDesign) {
    rawSteps = [
      { step_no: 1, step_title: "Figma Workspace & System Tokens", step_instructions: "Obtain Figma organization access and import global UI design system component libraries.", step_phase: "Day 1 Setup" },
      { step_no: 2, step_title: "Design Tooling & Font Assets", step_instructions: "Install brand typography packages, accessibility audit plugins, and color token extensions.", step_phase: "Day 1 Setup" },
      { step_no: 3, step_title: "Product Roadmap & Epics Review", step_instructions: "Review current Q3 feature epics, user personas, and schedule sync with Product Lead.", step_phase: "Team Integration" }
    ];
  } else {
    rawSteps = [
      { step_no: 1, step_title: "SaaS Account Provisioning", step_instructions: "Initialize Slack, Notion, Linear, 1Password, and Google Workspace accounts with mandatory 2FA.", step_phase: "Day 1 Setup" },
      { step_no: 2, step_title: "Hardware & Workspace Verification", step_instructions: "Confirm receipt of company laptop, YubiKey security token, and peripherals.", step_phase: "Day 1 Setup" },
      { step_no: 3, step_title: "Welcome Sync with Team Lead", step_instructions: "Schedule 30-min introductory call to discuss role expectations and 30-day goals.", step_phase: "Team Integration" }
    ];
  }

  return rawSteps.map((s, idx) => ({
    ...s,
    id: generateStepId(),
    step_no: tilesState.steps.length + idx + 1,
    completed: false
  }));
}

// Direct Generation Function (LM Studio Direct API fetch with Client Fallback)
async function generateStepTilesDirect(context, statement) {
  let stepsResult = null;

  try {
    const backendRes = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        context: context,
        statement: statement,
        append: true,
        target_url: tilesState.serverUrl,
        model_name: tilesState.modelName,
        system_prompt: tilesState.systemPrompt,
        temperature: tilesState.temperature,
        max_tokens: tilesState.maxTokens
      })
    });

    if (backendRes.ok) {
      const data = await backendRes.json();
      if (data.steps && Array.isArray(data.steps)) {
        stepsResult = data.steps.map((s, idx) => ({
          id: s.id || generateStepId(),
          step_no: tilesState.steps.length + idx + 1,
          step_title: s.step_title || s.title || `Step ${idx + 1}`,
          step_instructions: s.step_instructions || s.instructions || 'Perform onboarding task',
          step_phase: s.step_phase || s.phase || 'Day 1 Setup',
          completed: false
        }));
      }
    }
  } catch (err) {
    console.log('Direct API call offline. Running client-side fallback tile generator.');
  }

  if (!stepsResult || stepsResult.length === 0) {
    stepsResult = generateClientFallbackSteps(context, statement);
  }

  return stepsResult;
}

// Load tiles state from LocalStorage or Backend
async function fetchTilesFromBackend() {
  try {
    const res = await fetch('/api/tiles');
    if (res.ok) {
      const data = await res.json();
      if (data.tiles && Array.isArray(data.tiles) && data.tiles.length > 0) {
        tilesState.steps = data.tiles.map((t, idx) => ({
          id: t.id || generateStepId(),
          step_no: t.step_no || (idx + 1),
          step_title: t.step_title || t.event_title || `Step ${idx + 1}`,
          step_instructions: t.step_instructions || t.content || '',
          step_phase: t.step_phase || (t.expire ? `Expire: ${t.expire}` : 'General'),
          expire: t.expire || '',
          completed: !!t.completed
        }));
        renderStepTiles();
        return;
      }
    }
  } catch (err) {}

  const saved = localStorage.getItem('orion_employee_tiles');
  if (saved) {
    try {
      tilesState.steps = JSON.parse(saved);
      renderStepTiles();
      return;
    } catch (e) {}
  }
  
  if (tilesState.steps.length === 0) {
    tilesState.steps = DEMO_TILES.map(s => ({ ...s, id: generateStepId() }));
  }
  renderStepTiles();
}

// Save/Sync tiles state
async function syncTilesToBackend() {
  localStorage.setItem('orion_employee_tiles', JSON.stringify(tilesState.steps));
  try {
    await fetch('/api/tiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tiles: tilesState.steps })
    });
  } catch (err) {}
}

// Render Step Tiles Checklist
function renderStepTiles() {
  const container = document.getElementById('tiles-grid');
  if (!container) return;

  const steps = tilesState.steps;
  const stepCountBadge = document.getElementById('step-count-badge');
  if (stepCountBadge) {
    stepCountBadge.textContent = `${steps.length} Steps`;
  }

  if (steps.length === 0) {
    container.innerHTML = `
      <div class="col-span-full human-card p-12 text-center space-y-4" style="grid-column:1/-1; padding:48px; text-align:center;">
        <div style="width:56px; height:56px; border-radius:16px; background:#FAE8E1; border:1px solid #F5D2C5; display:flex; align-items:center; justify-content:center; margin:0 auto 16px; color:#D96B43;">
          <i data-lucide="compass" class="w-7 h-7"></i>
        </div>
        <h4 style="font-size:18px; font-weight:700;">Ready to Onboard</h4>
        <p style="font-size:12px; color:#78756C; font-style:italic; max-width:400px; margin:8px auto 16px;">
          Enter details above and click <strong>"Generate Tiles"</strong> or load demo checklist steps.
        </p>
        <button id="btn-load-demo-cards-empty" class="btn-human-secondary" style="padding:8px 16px; font-size:12px; font-weight:600; cursor:pointer;">
          <i data-lucide="play" class="w-3.5 h-3.5" style="color:#D96B43; margin-right:6px;"></i>
          <span>Load Demo Checklist Steps</span>
        </button>
      </div>
    `;
    const demoBtn = document.getElementById('btn-load-demo-cards-empty');
    if (demoBtn) demoBtn.addEventListener('click', loadDemoTiles);
    initLucideIcons();
    return;
  }

  const filteredSteps = steps.filter((step) => {
    const isChecked = !!step.completed;
    if (tilesState.activeFilter === 'pending' && isChecked) return false;
    if (tilesState.activeFilter === 'completed' && !isChecked) return false;

    if (tilesState.searchQuery) {
      const q = tilesState.searchQuery;
      const matchTitle = (step.step_title || '').toLowerCase().includes(q);
      const matchInst = (step.step_instructions || '').toLowerCase().includes(q);
      const matchPhase = (step.step_phase || '').toLowerCase().includes(q);
      if (!matchTitle && !matchInst && !matchPhase) return false;
    }
    return true;
  });

  if (filteredSteps.length === 0) {
    container.innerHTML = `
      <div style="grid-column:1/-1; padding:32px; text-align:center; color:#78756C; font-size:13px; font-style:italic;">
        No onboarding steps match the filter "${tilesState.activeFilter}"${tilesState.searchQuery ? ` and query "${tilesState.searchQuery}"` : ''}.
      </div>
    `;
    return;
  }

  container.innerHTML = filteredSteps.map((step) => {
    const isChecked = !!step.completed;
    const expireTime = step.expire || (step.step_phase && step.step_phase.includes('Expire:') ? step.step_phase.replace('Expire:', '').trim() : '');

    return `
      <div class="step-tile-card ${isChecked ? 'completed' : ''}" data-id="${step.id}">
        
        <!-- Header -->
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <input type="checkbox" class="human-checkbox tile-checkbox" ${isChecked ? 'checked' : ''} data-id="${step.id}" id="tile-check-${step.id}">
            <label for="tile-check-${step.id}" style="cursor:pointer; user-select:none; display:flex; align-items:center; gap:6px;">
              <span style="padding:2px 8px; border-radius:12px; font-size:10px; font-weight:700; text-transform:uppercase; ${isChecked ? 'background:#E3EDE6; color:#2D6A4F; border:1px solid #C5DCD0;' : 'background:#F4F2EC; color:#54524B; border:1px solid #E8E5DC;'}">
                ${escapeHtml(step.step_phase || `Step 0${step.step_no}`)}
              </span>
              ${expireTime ? `
                <span style="padding:2px 6px; border-radius:12px; font-size:10px; font-weight:800; background:#fef3c7; color:#92400e; border:1px solid #fcd34d; display:inline-flex; align-items:center; gap:4px;">
                  <i data-lucide="clock" class="w-3 h-3" style="color:#d97706;"></i>
                  <span>${escapeHtml(expireTime)}</span>
                </span>
              ` : ''}
            </label>
          </div>

          <!-- Reorder Buttons -->
          <div style="display:flex; align-items:center; gap:2px;">
            <button class="move-up-btn" style="background:none; border:none; cursor:pointer; color:#8C887D; padding:4px;" data-id="${step.id}" title="Move Up">
              <i data-lucide="chevron-up" class="w-3.5 h-3.5"></i>
            </button>
            <button class="move-down-btn" style="background:none; border:none; cursor:pointer; color:#8C887D; padding:4px;" data-id="${step.id}" title="Move Down">
              <i data-lucide="chevron-down" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>

        <!-- Body -->
        <div class="step-tile-body" style="margin:8px 0 12px;">
          <h4 class="step-title" style="font-weight:700; font-size:14px; color:#1C1B18; line-height:1.3; margin-bottom:4px;">
            ${escapeHtml(step.step_title)}
          </h4>
          <p style="font-size:12px; color:#54524B; line-height:1.5;">
            ${escapeHtml(step.step_instructions)}
          </p>
        </div>

        <!-- Footer -->
        <div class="step-tile-footer" style="padding-top:10px; border-top:1px solid #E8E5DC; display:flex; align-items:center; justify-content:space-between; font-size:11px;">
          <span style="display:inline-flex; align-items:center; gap:6px; padding:2px 8px; border-radius:12px; background:#FAF9F5; border:1px solid #E8E5DC;">
            <span style="width:6px; height:6px; border-radius:50%; background:${isChecked ? '#3B7A57' : '#D96B43'};"></span>
            <span style="font-weight:600; color:#54524B;">${isChecked ? 'Completed' : 'Pending'}</span>
          </span>

          <div style="display:flex; align-items:center; gap:4px;">
            <button class="edit-tile-btn" style="background:none; border:none; cursor:pointer; color:#8C887D; padding:4px;" data-id="${step.id}" title="Edit step">
              <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
            </button>
            <button class="delete-tile-btn" style="background:none; border:none; cursor:pointer; color:#8C887D; padding:4px;" data-id="${step.id}" title="Delete step">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>

      </div>
    `;
  }).join('');

  container.querySelectorAll('.step-tile-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.human-checkbox') || e.target.closest('button') || e.target.closest('input')) {
        return;
      }
      const stepId = card.dataset.id;
      const step = tilesState.steps.find(s => s.id === stepId) || employeeTasks.find(t => t.id === stepId);
      if (step) {
        openTaskGuidanceModal(step);
      }
    });
  });

  container.querySelectorAll('.tile-checkbox').forEach(cb => {
    cb.addEventListener('change', (e) => {
      e.stopPropagation();
      toggleStepCheck(e.target.dataset.id, e.target.checked);
    });
  });

  container.querySelectorAll('.edit-tile-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openEditModal(btn.dataset.id);
    });
  });

  container.querySelectorAll('.delete-tile-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteStep(btn.dataset.id);
    });
  });

  container.querySelectorAll('.move-up-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      moveStepUp(btn.dataset.id);
    });
  });

  container.querySelectorAll('.move-down-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      moveStepDown(btn.dataset.id);
    });
  });

  initLucideIcons();
}

async function toggleStepCheck(id, isChecked) {
  const currentStatus = isChecked ? 'pending' : 'completed';
  await toggleTaskStatus(id, currentStatus);

  const step = tilesState.steps.find(s => s.id === id);
  if (step) {
    step.completed = isChecked;
    step.status = isChecked ? 'completed' : 'pending';
  }

  const total = tilesState.steps.length;
  const completedCount = tilesState.steps.filter(s => s.completed).length;

  if (total > 0 && completedCount === total) {
    triggerCompletionCelebration();
  }
}

function deleteStep(id) {
  const index = tilesState.steps.findIndex(s => s.id === id);
  if (index !== -1) {
    const title = tilesState.steps[index].step_title;
    tilesState.steps.splice(index, 1);
    reindexSteps();
    syncTilesToBackend();
    renderStepTiles();
    showAlert('info', 'Step Removed', `Deleted step "${title}".`);
  }
}

function toggleSelectAll() {
  const total = tilesState.steps.length;
  const completedCount = tilesState.steps.filter(s => s.completed).length;

  if (completedCount === total) {
    tilesState.steps.forEach(s => s.completed = false);
  } else {
    tilesState.steps.forEach(s => s.completed = true);
    triggerCompletionCelebration();
  }
  syncTilesToBackend();
  renderStepTiles();
}

function triggerCompletionCelebration() {
  if (window.confetti) {
    window.confetti({
      particleCount: 70,
      spread: 80,
      origin: { y: 0.6 }
    });
  }
}

function exportMarkdownChecklist() {
  if (tilesState.steps.length === 0) {
    showAlert('warning', 'No Steps', 'Generate an onboarding checklist first before exporting.');
    return;
  }

  const problemContext = document.getElementById('problem-context');
  const problemStatement = document.getElementById('problem-statement');
  const context = problemContext ? problemContext.value.trim() : 'General Onboarding';
  const statement = problemStatement ? problemStatement.value.trim() : 'Onboarding Workflow Goals';

  let markdown = `# Orion Employee Onboarding Checklist\n\n`;
  markdown += `**Context:** ${context}\n`;
  markdown += `**Goal:** ${statement}\n\n`;
  markdown += `## Onboarding Steps\n\n`;

  tilesState.steps.forEach((step) => {
    const box = step.completed ? '[x]' : '[ ]';
    const exp = step.expire ? ` (Expire: ${step.expire})` : '';
    markdown += `- ${box} **Step ${step.step_no}: ${step.step_title}** (${step.step_phase || 'General'})${exp}\n  ${step.step_instructions}\n\n`;
  });

  const blob = new Blob([markdown], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Orion_Onboarding_Checklist_${Date.now()}.md`;
  a.click();
  URL.revokeObjectURL(url);

  showAlert('info', 'Exported', 'Checklist downloaded as Markdown.');
}

function triggerChatPipelineClient() {
  showToastPopup('loading', 'Extracting Chat Events...', 'Scanning chat text for meetings and deadlines...');
  
  const sampleChat = `
[09:00] Natalie: Welcome to the team!
[09:15] TechLead: Remember to generate your SSH keys and upload to GitHub today.
[11:00] Security: SOC2 training video link sent. Complete by 17:00 today.
[14:30] Team: Let's meet for lunch tomorrow at 12:00.
[16:00] DevOps: Retrieve staging API tokens from Vault by 18:00.
  `;

  const extracted = extractEventsFromChatText(sampleChat);
  tilesState.steps = [...tilesState.steps, ...extracted];
  reindexSteps();
  syncTilesToBackend();
  renderStepTiles();

  showToastPopup('success', 'Events Extracted! ⚡', `Extracted ${extracted.length} events into onboarding step tiles.`);
  showAlert('info', 'Events Added', `Appended ${extracted.length} time-bound events from chat pipeline.`);
}

function loadSamplePreset(index) {
  const sample = DEMO_PRESETS[index];
  if (!sample) return;
  const contextEl = document.getElementById('problem-context');
  const statementEl = document.getElementById('problem-statement');
  if (contextEl) contextEl.value = sample.context;
  if (statementEl) statementEl.value = sample.statement;
  showAlert('info', `Preset Loaded: ${sample.name}`, 'Click "Generate Tiles from AI Prompt" to create step tiles.');
}

function loadDemoTiles() {
  tilesState.steps = DEMO_TILES.map(s => ({ ...s, id: generateStepId() }));
  syncTilesToBackend();
  renderStepTiles();
  showAlert('info', 'Demo Checklist Loaded', `Loaded ${DEMO_TILES.length} sample onboarding steps.`);
}

function setViewMode(mode) {
  tilesState.viewMode = mode;
  const tilesGrid = document.getElementById('tiles-grid');
  const viewGrid = document.getElementById('view-grid');
  const viewList = document.getElementById('view-list');
  if (!tilesGrid) return;

  if (mode === 'grid') {
    tilesGrid.classList.remove('tiles-list-view');
    if (viewGrid) { viewGrid.style.background = 'white'; viewGrid.style.color = '#1C1B18'; }
    if (viewList) { viewList.style.background = 'transparent'; viewList.style.color = '#78756C'; }
  } else {
    tilesGrid.classList.add('tiles-list-view');
    if (viewList) { viewList.style.background = 'white'; viewList.style.color = '#1C1B18'; }
    if (viewGrid) { viewGrid.style.background = 'transparent'; viewGrid.style.color = '#78756C'; }
  }
}

function setFilter(filterType) {
  tilesState.activeFilter = filterType;
  const filterAll = document.getElementById('filter-all');
  const filterPending = document.getElementById('filter-pending');
  const filterCompleted = document.getElementById('filter-completed');

  [filterAll, filterPending, filterCompleted].forEach(btn => {
    if (btn) { btn.style.background = 'transparent'; btn.style.color = '#78756C'; }
  });

  if (filterType === 'all' && filterAll) { filterAll.style.background = '#1C1B18'; filterAll.style.color = 'white'; }
  if (filterType === 'pending' && filterPending) { filterPending.style.background = '#1C1B18'; filterPending.style.color = 'white'; }
  if (filterType === 'completed' && filterCompleted) { filterCompleted.style.background = '#1C1B18'; filterCompleted.style.color = 'white'; }

  renderStepTiles();
}

function handleAddCustomStep(e) {
  e.preventDefault();
  const newStepTitle = document.getElementById('new-step-title');
  const newStepInstructions = document.getElementById('new-step-instructions');
  const newStepPhase = document.getElementById('new-step-phase');

  const title = newStepTitle ? newStepTitle.value.trim() : '';
  const instructions = newStepInstructions ? newStepInstructions.value.trim() : '';
  const phase = newStepPhase ? newStepPhase.value : 'Day 1 Setup';

  if (!title || !instructions) return;

  const newStep = {
    id: generateStepId(),
    step_no: tilesState.steps.length + 1,
    step_title: title,
    step_instructions: instructions,
    step_phase: phase,
    completed: false
  };

  tilesState.steps.push(newStep);
  syncTilesToBackend();
  renderStepTiles();
  closeModal(document.getElementById('modal-add-step'));
  const addStepForm = document.getElementById('add-step-form');
  if (addStepForm) addStepForm.reset();
  showAlert('info', 'Step Added', `Created step "${title}".`);
}

function openEditModal(stepId) {
  const step = tilesState.steps.find(s => s.id === stepId);
  if (!step) return;

  const editStepId = document.getElementById('edit-step-id');
  const editStepTitle = document.getElementById('edit-step-title');
  const editStepInstructions = document.getElementById('edit-step-instructions');
  const editStepPhase = document.getElementById('edit-step-phase');

  if (editStepId) editStepId.value = step.id;
  if (editStepTitle) editStepTitle.value = step.step_title;
  if (editStepInstructions) editStepInstructions.value = step.step_instructions;
  if (editStepPhase) editStepPhase.value = step.step_phase || 'Day 1 Setup';

  openModal(document.getElementById('modal-edit-step'));
}

function handleSaveEditStep(e) {
  e.preventDefault();
  const editStepId = document.getElementById('edit-step-id');
  const editStepTitle = document.getElementById('edit-step-title');
  const editStepInstructions = document.getElementById('edit-step-instructions');
  const editStepPhase = document.getElementById('edit-step-phase');

  const id = editStepId ? editStepId.value : '';
  const title = editStepTitle ? editStepTitle.value.trim() : '';
  const instructions = editStepInstructions ? editStepInstructions.value.trim() : '';
  const phase = editStepPhase ? editStepPhase.value : 'Day 1 Setup';

  const step = tilesState.steps.find(s => s.id === id);
  if (!step) return;

  step.step_title = title;
  step.step_instructions = instructions;
  step.step_phase = phase;

  syncTilesToBackend();
  renderStepTiles();
  closeModal(document.getElementById('modal-edit-step'));
  showAlert('info', 'Step Updated', `Updated step "${title}".`);
}

function moveStepUp(stepId) {
  const index = tilesState.steps.findIndex(s => s.id === stepId);
  if (index > 0) {
    const temp = tilesState.steps[index];
    tilesState.steps[index] = tilesState.steps[index - 1];
    tilesState.steps[index - 1] = temp;
    reindexSteps();
    syncTilesToBackend();
    renderStepTiles();
  }
}

function moveStepDown(stepId) {
  const index = tilesState.steps.findIndex(s => s.id === stepId);
  if (index >= 0 && index < tilesState.steps.length - 1) {
    const temp = tilesState.steps[index];
    tilesState.steps[index] = tilesState.steps[index + 1];
    tilesState.steps[index + 1] = temp;
    reindexSteps();
    syncTilesToBackend();
    renderStepTiles();
  }
}

function reindexSteps() {
  tilesState.steps.forEach((step, idx) => {
    step.step_no = idx + 1;
  });
}

async function handleSolveSubmit(e) {
  e.preventDefault();
  const contextEl = document.getElementById('problem-context');
  const statementEl = document.getElementById('problem-statement');

  const context = contextEl ? contextEl.value.trim() : '';
  const statement = statementEl ? statementEl.value.trim() : '';

  if (!context || !statement) {
    showAlert('warning', 'Missing Inputs', 'Please provide both Context and Key Milestones.');
    return;
  }

  setLoadingState(true);
  hideAlert();
  showToastPopup('loading', 'Adding Step Tiles...', 'Generating customized onboarding step tiles...');

  const newSteps = await generateStepTilesDirect(context, statement);
  tilesState.steps = [...tilesState.steps, ...newSteps];
  reindexSteps();
  syncTilesToBackend();
  renderStepTiles();

  showToastPopup('success', 'Tiles Generated! 🎉', `Added ${newSteps.length} new step tiles.`);
  setLoadingState(false);
}

function saveSettings() {
  const settingServerUrl = document.getElementById('setting-server-url');
  const settingModelName = document.getElementById('setting-model-name');
  const settingTemperature = document.getElementById('setting-temperature');
  const settingMaxTokens = document.getElementById('setting-max-tokens');

  if (settingServerUrl) tilesState.serverUrl = settingServerUrl.value.trim() || 'http://localhost:1234/v1';
  if (settingModelName) tilesState.modelName = settingModelName.value.trim() || 'qwen2.5-coder-0.5b-instruct';
  if (settingTemperature) tilesState.temperature = parseFloat(settingTemperature.value);
  if (settingMaxTokens) tilesState.maxTokens = parseInt(settingMaxTokens.value, 10);

  closeModal(document.getElementById('modal-settings'));
  showAlert('info', 'Settings Saved', 'Direct API configuration updated.');
}

function copySystemPrompt() {
  navigator.clipboard.writeText(tilesState.systemPrompt);
  showAlert('info', 'Copied', 'System prompt copied to clipboard.');
}

function formatRawJsonArea() {
  const rawJsonInput = document.getElementById('raw-json-input');
  if (!rawJsonInput) return;
  const val = rawJsonInput.value.trim();
  try {
    const parsed = JSON.parse(val);
    rawJsonInput.value = JSON.stringify(parsed, null, 2);
  } catch (e) {
    showAlert('error', 'Format Error', 'Invalid JSON content.');
  }
}

function parseAndRenderRawJson() {
  const rawJsonInput = document.getElementById('raw-json-input');
  if (!rawJsonInput) return;
  const val = rawJsonInput.value.trim();
  if (!val) {
    showAlert('warning', 'Empty Input', 'Please paste JSON before importing.');
    return;
  }

  try {
    const parsed = JSON.parse(val);
    const stepsList = parsed.steps || (Array.isArray(parsed) ? parsed : []);
    if (Array.isArray(stepsList) && stepsList.length > 0) {
      const imported = stepsList.map((item, idx) => ({
        id: generateStepId(),
        step_no: tilesState.steps.length + idx + 1,
        step_title: item.step_title || `Step ${idx + 1}`,
        step_instructions: item.step_instructions || item.instructions || 'Perform onboarding task',
        step_phase: item.step_phase || 'Day 1 Setup',
        completed: false
      }));
      tilesState.steps = [...tilesState.steps, ...imported];
      reindexSteps();
      syncTilesToBackend();
      renderStepTiles();
      closeModal(document.getElementById('modal-raw-json'));
      showAlert('info', 'JSON Imported', `Successfully imported ${imported.length} steps.`);
      return;
    }
  } catch (e) {}

  showAlert('error', 'Import Error', 'Could not parse JSON steps format.');
}

function openModal(modalEl) {
  if (!modalEl) return;
  modalEl.style.display = 'flex';
  modalEl.classList.remove('hidden');
  setTimeout(() => { modalEl.style.opacity = '1'; }, 10);
}

function closeModal(modalEl) {
  if (!modalEl) return;
  modalEl.style.opacity = '0';
  setTimeout(() => { modalEl.style.display = 'none'; modalEl.classList.add('hidden'); }, 150);
}

function showAlert(type, title, message) {
  const banner = document.getElementById('alert-banner');
  const alertTitle = document.getElementById('alert-title');
  const alertMessage = document.getElementById('alert-message');
  if (!banner) return;

  if (alertTitle) alertTitle.textContent = title;
  if (alertMessage) alertMessage.textContent = message;

  banner.style.display = 'flex';
  banner.classList.remove('hidden');
}

function hideAlert() {
  const banner = document.getElementById('alert-banner');
  if (banner) banner.style.display = 'none';
}

function showToastPopup(type, title, message) {
  const toast = document.getElementById('generation-toast');
  const toastTitle = document.getElementById('toast-title');
  const toastMessage = document.getElementById('toast-message');
  if (!toast) return;

  if (toastTitle) toastTitle.textContent = title;
  if (toastMessage) toastMessage.textContent = message;

  toast.style.opacity = '1';
  toast.style.pointerEvents = 'auto';

  if (type === 'success' || type === 'error') {
    setTimeout(() => { hideToastPopup(); }, 4000);
  }
}

function hideToastPopup() {
  const toast = document.getElementById('generation-toast');
  if (!toast) return;
  toast.style.opacity = '0';
  toast.style.pointerEvents = 'none';
}

function setLoadingState(isLoading) {
  tilesState.isLoading = isLoading;
  const btnSolve = document.getElementById('btn-solve');
  const solveBtnText = document.getElementById('solve-btn-text');
  if (btnSolve) btnSolve.disabled = isLoading;

  if (isLoading) {
    if (solveBtnText) solveBtnText.textContent = 'Generating Tiles...';
  } else {
    if (solveBtnText) solveBtnText.textContent = 'Generate Tiles from AI Prompt';
  }
}

// Setup Tiles Event Listeners in Employee Dashboard
function setupTilesEvents() {
  initLucideIcons();

  const btnRunPipeline = document.getElementById('btn-run-pipeline');
  if (btnRunPipeline) btnRunPipeline.addEventListener('click', triggerChatPipelineClient);

  const problemForm = document.getElementById('problem-form');
  if (problemForm) problemForm.addEventListener('submit', handleSolveSubmit);

  const btnClear = document.getElementById('btn-clear');
  if (btnClear) btnClear.addEventListener('click', () => {
    const c = document.getElementById('problem-context');
    const s = document.getElementById('problem-statement');
    if (c) c.value = '';
    if (s) s.value = '';
    hideAlert();
  });

  const btnSample1 = document.getElementById('btn-sample-1');
  const btnSample2 = document.getElementById('btn-sample-2');
  const btnSample3 = document.getElementById('btn-sample-3');
  if (btnSample1) btnSample1.addEventListener('click', () => loadSamplePreset(0));
  if (btnSample2) btnSample2.addEventListener('click', () => loadSamplePreset(1));
  if (btnSample3) btnSample3.addEventListener('click', () => loadSamplePreset(2));

  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      tilesState.searchQuery = e.target.value.toLowerCase().trim();
      renderStepTiles();
    });
  }

  const viewGrid = document.getElementById('view-grid');
  const viewList = document.getElementById('view-list');
  if (viewGrid) viewGrid.addEventListener('click', () => setViewMode('grid'));
  if (viewList) viewList.addEventListener('click', () => setViewMode('list'));

  const filterAll = document.getElementById('filter-all');
  const filterPending = document.getElementById('filter-pending');
  const filterCompleted = document.getElementById('filter-completed');
  if (filterAll) filterAll.addEventListener('click', () => setFilter('all'));
  if (filterPending) filterPending.addEventListener('click', () => setFilter('pending'));
  if (filterCompleted) filterCompleted.addEventListener('click', () => setFilter('completed'));

  const btnAddStep = document.getElementById('btn-add-step');
  if (btnAddStep) btnAddStep.addEventListener('click', () => openModal(document.getElementById('modal-add-step')));

  const closeModalAddStep = document.getElementById('close-modal-add-step');
  const btnCancelAddStep = document.getElementById('btn-cancel-add-step');
  if (closeModalAddStep) closeModalAddStep.addEventListener('click', () => closeModal(document.getElementById('modal-add-step')));
  if (btnCancelAddStep) btnCancelAddStep.addEventListener('click', () => closeModal(document.getElementById('modal-add-step')));

  const addStepForm = document.getElementById('add-step-form');
  if (addStepForm) addStepForm.addEventListener('submit', handleAddCustomStep);

  const closeModalEditStep = document.getElementById('close-modal-edit-step');
  const btnCancelEditStep = document.getElementById('btn-cancel-edit-step');
  if (closeModalEditStep) closeModalEditStep.addEventListener('click', () => closeModal(document.getElementById('modal-edit-step')));
  if (btnCancelEditStep) btnCancelEditStep.addEventListener('click', () => closeModal(document.getElementById('modal-edit-step')));

  const editStepForm = document.getElementById('edit-step-form');
  if (editStepForm) editStepForm.addEventListener('submit', handleSaveEditStep);

  const btnCheckAll = document.getElementById('btn-check-all');
  if (btnCheckAll) btnCheckAll.addEventListener('click', toggleSelectAll);

  const btnExportMarkdown = document.getElementById('btn-export-markdown');
  if (btnExportMarkdown) btnExportMarkdown.addEventListener('click', exportMarkdownChecklist);

  const btnSettings = document.getElementById('btn-settings');
  if (btnSettings) btnSettings.addEventListener('click', () => openModal(document.getElementById('modal-settings')));

  const closeModalSettings = document.getElementById('close-modal-settings');
  if (closeModalSettings) closeModalSettings.addEventListener('click', () => closeModal(document.getElementById('modal-settings')));

  const btnSaveSettings = document.getElementById('btn-save-settings');
  if (btnSaveSettings) btnSaveSettings.addEventListener('click', saveSettings);

  const btnPromptModal = document.getElementById('btn-prompt-modal');
  if (btnPromptModal) btnPromptModal.addEventListener('click', () => {
    const sysText = document.getElementById('system-prompt-text');
    if (sysText) sysText.value = tilesState.systemPrompt;
    openModal(document.getElementById('modal-prompt'));
  });

  const closeModalPrompt = document.getElementById('close-modal-prompt');
  const btnClosePromptModal = document.getElementById('btn-close-prompt-modal');
  if (closeModalPrompt) closeModalPrompt.addEventListener('click', () => closeModal(document.getElementById('modal-prompt')));
  if (btnClosePromptModal) btnClosePromptModal.addEventListener('click', () => closeModal(document.getElementById('modal-prompt')));

  const btnCopySystemPrompt = document.getElementById('btn-copy-system-prompt');
  if (btnCopySystemPrompt) btnCopySystemPrompt.addEventListener('click', copySystemPrompt);

  const btnRawJson = document.getElementById('btn-raw-json');
  if (btnRawJson) btnRawJson.addEventListener('click', () => openModal(document.getElementById('modal-raw-json')));

  const closeModalRawJson = document.getElementById('close-modal-raw-json');
  const closeModalRawJsonBtn = document.getElementById('close-modal-raw-json-btn');
  if (closeModalRawJson) closeModalRawJson.addEventListener('click', () => closeModal(document.getElementById('modal-raw-json')));
  if (closeModalRawJsonBtn) closeModalRawJsonBtn.addEventListener('click', () => closeModal(document.getElementById('modal-raw-json')));

  const btnFormatJson = document.getElementById('btn-format-json');
  if (btnFormatJson) btnFormatJson.addEventListener('click', formatRawJsonArea);

  const btnRenderRawJson = document.getElementById('btn-render-raw-json');
  if (btnRenderRawJson) btnRenderRawJson.addEventListener('click', parseAndRenderRawJson);

  const alertClose = document.getElementById('alert-close');
  if (alertClose) alertClose.addEventListener('click', hideAlert);

  const toastClose = document.getElementById('toast-close');
  if (toastClose) toastClose.addEventListener('click', hideToastPopup);

  const closeModalGuidance = document.getElementById('close-modal-task-guidance');
  const btnCloseGuidance = document.getElementById('btn-close-guidance-modal');
  if (closeModalGuidance) closeModalGuidance.addEventListener('click', () => closeModal(document.getElementById('modal-task-guidance')));
  if (btnCloseGuidance) btnCloseGuidance.addEventListener('click', () => closeModal(document.getElementById('modal-task-guidance')));

  const btnGetGuidance = document.getElementById('btn-get-ai-guidance');
  if (btnGetGuidance) btnGetGuidance.addEventListener('click', fetchAIGuidanceForCurrentTask);

  const btnModalToggleStatus = document.getElementById('btn-modal-toggle-status');
  if (btnModalToggleStatus) {
    btnModalToggleStatus.addEventListener('click', async () => {
      if (currentSelectedTask) {
        const isDone = currentSelectedTask.completed || currentSelectedTask.status === 'completed' || currentSelectedTask.status === 'complete';
        await toggleStepCheck(currentSelectedTask.id, !isDone);
        closeModal(document.getElementById('modal-task-guidance'));
      }
    });
  }

  fetchTilesFromBackend();
}

let currentSelectedTask = null;

function openTaskGuidanceModal(task) {
    currentSelectedTask = task;
    const modal = document.getElementById('modal-task-guidance');
    const titleEl = document.getElementById('guidance-task-title');
    const phaseEl = document.getElementById('guidance-task-phase');
    const instEl = document.getElementById('guidance-task-instructions');
    const container = document.getElementById('guidance-steps-container');
    const toggleBtnText = document.getElementById('btn-modal-toggle-status-text');
    const toggleBtn = document.getElementById('btn-modal-toggle-status');

    if (!modal) return;

    if (titleEl) titleEl.textContent = task.step_title || task.title || 'Task Details';
    if (phaseEl) phaseEl.textContent = task.step_phase || 'General';
    if (instEl) instEl.textContent = task.step_instructions || task.instructions || 'Perform task step-by-step.';

    const isDone = task.completed || task.status === 'completed' || task.status === 'complete';
    if (toggleBtnText) toggleBtnText.textContent = isDone ? 'Mark Pending' : 'Mark Completed';
    if (toggleBtn) {
        toggleBtn.style.background = isDone ? '#D96B43' : '#3B7A57';
    }

    if (container) {
        container.innerHTML = `
            <div style="padding:16px; text-align:center; color:#78756C; font-size:12px; font-style:italic; background:#FAF9F5; border-radius:10px; border:1px dashed #E8E5DC;">
                Click <strong>"Get AI Guidance"</strong> above to generate a tailored 5-step action plan for this task.
            </div>
        `;
    }

    openModal(modal);
}

async function fetchAIGuidanceForCurrentTask() {
    if (!currentSelectedTask) return;
    const container = document.getElementById('guidance-steps-container');
    const btn = document.getElementById('btn-get-ai-guidance');
    if (!container) return;

    if (btn) btn.disabled = true;
    container.innerHTML = `
        <div style="padding:16px; text-align:center; color:#D96B43; font-size:12px; font-style:italic;">
            ⚡ Consulting Orion AI Mentor for task guidance...
        </div>
    `;

    const payload = {
        role: employeeProfile?.role || 'Employee',
        experience_level: employeeProfile?.experience_level || 'Mid',
        technical_skills: employeeProfile?.technical_skills || [],
        company_context: employeePlan?.company_context || '',
        task_title: currentSelectedTask.step_title || currentSelectedTask.title || '',
        task_instructions: currentSelectedTask.step_instructions || currentSelectedTask.instructions || '',
        step_phase: currentSelectedTask.step_phase || ''
    };

    try {
        const res = await fetch('/api/onboarding-guidance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const data = await res.json();
            if (data.guidance && Array.isArray(data.guidance) && data.guidance.length > 0) {
                container.innerHTML = data.guidance.map(g => `
                    <div style="background:#FAF9F5; border:1px solid #E8E5DC; border-radius:10px; padding:12px; display:flex; gap:10px; align-items:flex-start;">
                        <span style="width:22px; height:22px; border-radius:50%; background:#D96B43; color:white; font-size:11px; font-weight:800; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:2px;">
                            ${g.step || 1}
                        </span>
                        <div>
                            <strong style="font-size:12px; color:#1C1B18; display:block; margin-bottom:2px;">${escapeHtml(g.title || '')}</strong>
                            <p style="font-size:12px; color:#54524B; line-height:1.4; margin:0;">${escapeHtml(g.details || '')}</p>
                        </div>
                    </div>
                `).join('');
                return;
            }
        }
    } catch (err) {
        console.error('AI Guidance fetch error:', err);
    } finally {
        if (btn) btn.disabled = false;
    }

    container.innerHTML = `
        <div style="background:#FAF9F5; border:1px solid #E8E5DC; border-radius:10px; padding:12px; margin-bottom:6px;">
            <strong style="font-size:12px; color:#1C1B18; display:block; margin-bottom:2px;">1. Review Task Requirements</strong>
            <p style="font-size:12px; color:#54524B; line-height:1.4; margin:0;">Verify your access credentials and software tools before starting.</p>
        </div>
        <div style="background:#FAF9F5; border:1px solid #E8E5DC; border-radius:10px; padding:12px; margin-bottom:6px;">
            <strong style="font-size:12px; color:#1C1B18; display:block; margin-bottom:2px;">2. Execute Step Actions</strong>
            <p style="font-size:12px; color:#54524B; line-height:1.4; margin:0;">Follow task instructions carefully and validate output locally.</p>
        </div>
        <div style="background:#FAF9F5; border:1px solid #E8E5DC; border-radius:10px; padding:12px;">
            <strong style="font-size:12px; color:#1C1B18; display:block; margin-bottom:2px;">3. Complete Task</strong>
            <p style="font-size:12px; color:#54524B; line-height:1.4; margin:0;">Click 'Mark Completed' when finished to update your progress.</p>
        </div>
    `;
}

// Hook setupTilesEvents on DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
  setupTilesEvents();
});
