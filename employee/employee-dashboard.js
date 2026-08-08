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

let employeeProjects = [];

let employeeKnowledgeDocuments = [];
let activeKnowledgeFilter = 'all';
let mentorConversation = [];
let mentorRequestInFlight = false;

const COMPANY_KNOWLEDGE_BUCKET = 'company-knowledge';


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
   UPDATE USER UI
========================================= */

function updateEmployeeUI() {

    if (!currentUser) return;


    const metadata =
        currentUser.user_metadata || {};


    const displayName =
        employeeProfile?.full_name?.trim() ||
        metadata.full_name ||
        `${metadata.first_name || ""} ${metadata.last_name || ""}`.trim() ||
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

        projects:
            "My Projects",

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

    if (pageName === 'knowledge') {
        loadEmployeeKnowledge();
    }

    if (pageName === 'team') {
        loadDepartmentTeam();
    }

    if (pageName === 'projects') {
        loadEmployeeProjects();
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


    if (!input) return;

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

    input.addEventListener(
        "input",
        () => renderEmployeeKnowledge()
    );

    document.querySelectorAll('[data-knowledge-filter]').forEach(button => {
        button.addEventListener('click', () => {
            activeKnowledgeFilter = button.dataset.knowledgeFilter || 'all';
            document.querySelectorAll('[data-knowledge-filter]').forEach(filter => {
                filter.classList.toggle('active', filter.dataset.knowledgeFilter === activeKnowledgeFilter);
            });
            renderEmployeeKnowledge();
        });
    });

}


async function searchKnowledge(
    query
) {
    const input = document.getElementById('knowledgeSearch');
    if (input && typeof query === 'string') input.value = query;
    renderEmployeeKnowledge();

}

function renderDepartmentTeam(members, message) {
    const grid = document.getElementById('teamGrid');
    if (!grid) return;

    grid.replaceChildren();
    if (!members.length) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        const title = document.createElement('h4');
        title.textContent = message || 'No teammates found in your department.';
        const description = document.createElement('p');
        description.textContent = 'Coworkers assigned to your department will appear here.';
        empty.append(title, description);
        grid.appendChild(empty);
        return;
    }

    members.forEach(function(member) {
        const card = document.createElement('article');
        card.className = 'team-member-card';
        const avatar = document.createElement('div');
        avatar.className = 'team-member-avatar';
        avatar.textContent = (member.full_name || member.email || 'E').trim().charAt(0).toUpperCase();
        const name = document.createElement('h3');
        name.textContent = member.full_name || 'Team member';
        const role = document.createElement('p');
        role.className = 'team-member-role';
        role.textContent = member.role || 'Employee';
        const experience = document.createElement('p');
        experience.className = 'team-member-experience';
        experience.textContent = member.experience_level || 'Experience level not specified';
        const department = document.createElement('p');
        department.className = 'team-member-experience';
        department.textContent = member.departments?.name || 'Department not specified';
        card.append(avatar, name, role, department, experience);

        if (member.email) {
            const email = document.createElement('p');
            email.className = 'team-member-experience';
            email.textContent = member.email;
            card.appendChild(email);
        }
        grid.appendChild(card);
    });
}

async function loadDepartmentTeam() {
    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !userData.user) {
        renderDepartmentTeam([], 'Your department team could not be loaded');
        return;
    }

    const { data: profile, error: profileError } = await supabaseClient
        .from('employee_profiles')
        .select('id, company_id, department_id')
        .eq('user_id', userData.user.id)
        .maybeSingle();

    if (profileError || !profile) {
        console.error('DEPARTMENT TEAM PROFILE LOAD ERROR:', profileError);
        renderDepartmentTeam([], 'Your department team could not be loaded');
        return;
    }

    employeeProfile = { ...employeeProfile, ...profile };

    if (!profile.company_id || !profile.department_id) {
        renderDepartmentTeam([], 'You have not been assigned to a department yet');
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from('employee_profiles')
            .select('id, full_name, email, role, experience_level, department_id, departments(name)')
            .eq('company_id', profile.company_id)
            .eq('department_id', profile.department_id)
            .neq('id', profile.id)
            .order('full_name', { ascending: true });
        if (error) throw error;
        renderDepartmentTeam(data || []);
    } catch (error) {
        console.error('DEPARTMENT TEAM LOAD ERROR:', error);
        renderDepartmentTeam([], 'Your department team could not be loaded');
    }
}

async function loadEmployeeKnowledge() {
    const results = document.getElementById('knowledgeResults');
    if (!results) return;

    if (!employeeProfile?.company_id) {
        employeeKnowledgeDocuments = [];
        renderEmployeeKnowledge('Your employee profile is not linked to a company.');
        return;
    }

    results.innerHTML = '<div class="empty-state"><h4>Loading company knowledge...</h4></div>';

    try {
        const { data, error } = await supabaseClient
            .from('company_knowledge')
            .select('id, file_name, file_path, file_type, file_size, created_at')
            .eq('company_id', employeeProfile.company_id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        employeeKnowledgeDocuments = data || [];
        renderEmployeeKnowledge();
    } catch (error) {
        console.error('EMPLOYEE KNOWLEDGE LOAD ERROR:', error);
        employeeKnowledgeDocuments = [];
        renderEmployeeKnowledge('Could not load your company knowledge.');
    }
}

function formatEmployeeKnowledgeSize(bytes) {
    if (!Number.isFinite(bytes) || bytes < 1024) return `${bytes || 0} B`;
    const units = ['KB', 'MB', 'GB'];
    let value = bytes / 1024;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex += 1;
    }
    return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

function renderEmployeeKnowledge(errorMessage = '') {
    const results = document.getElementById('knowledgeResults');
    const searchInput = document.getElementById('knowledgeSearch');
    if (!results) return;

    const query = searchInput?.value.trim().toLowerCase() || '';
    const documents = employeeKnowledgeDocuments.filter(document => {
        const matchesSearch = !query ||
            document.file_name.toLowerCase().includes(query) ||
            document.file_type.toLowerCase().includes(query);
        const matchesFilter = activeKnowledgeFilter === 'all' ||
            (activeKnowledgeFilter === 'documents') ||
            document.file_type.toLowerCase() === activeKnowledgeFilter;
        return matchesSearch && matchesFilter;
    });

    if (!documents.length) {
        const message = errorMessage || (query ? 'No documents match your search.' : 'Your knowledge base is empty');
        results.innerHTML = `
            <div class="empty-state" style="padding:56px 24px; text-align:center;">
                <div class="empty-icon">⌕</div>
                <h4>${escapeHtml(message)}</h4>
                <p>${errorMessage ? 'Please try again later.' : 'Company documentation will appear here when it is uploaded.'}</p>
            </div>
        `;
        return;
    }

    results.innerHTML = documents.map(document => `
        <article style="display:flex; align-items:center; justify-content:space-between; gap:16px; padding:18px 20px; border-bottom:1px solid var(--border);">
            <div style="min-width:0;">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:5px;">
                    <strong style="font-size:14px; overflow-wrap:anywhere;">${escapeHtml(document.file_name)}</strong>
                    <span style="font-size:11px; color:var(--muted); border:1px solid var(--border); padding:2px 7px; border-radius:10px;">${escapeHtml(document.file_type)}</span>
                </div>
                <span style="font-size:12px; color:var(--muted);">${formatEmployeeKnowledgeSize(Number(document.file_size))} · Uploaded ${document.created_at ? new Date(document.created_at).toLocaleDateString() : 'recently'}</span>
            </div>
            <button type="button" class="btn-human-secondary" data-open-employee-knowledge="${document.id}" style="flex-shrink:0; padding:7px 12px; font-size:12px;">Open</button>
        </article>
    `).join('');

    results.querySelectorAll('[data-open-employee-knowledge]').forEach(button => {
        button.addEventListener('click', () => openEmployeeKnowledgeDocument(button.dataset.openEmployeeKnowledge));
    });
}

async function openEmployeeKnowledgeDocument(documentId) {
    const document = employeeKnowledgeDocuments.find(item => item.id === documentId);
    if (!document) return;

    try {
        const { data, error } = await supabaseClient
            .storage
            .from(COMPANY_KNOWLEDGE_BUCKET)
            .createSignedUrl(document.file_path, 300);

        if (error) throw error;
        window.open(data.signedUrl, '_blank', 'noopener');
    } catch (error) {
        console.error('EMPLOYEE KNOWLEDGE OPEN ERROR:', error);
        renderEmployeeKnowledge('Could not open this document.');
    }
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


    if (!input || !button) return;

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


    const message = input?.value.trim();


    if (!message) return;
    if (mentorRequestInFlight) return;


    input.value = "";
    appendMentorMessage('user', message);
    const historyForRequest = mentorConversation.slice(-8);
    mentorConversation.push({ role: 'user', content: message });
    mentorConversation = mentorConversation.slice(-10);

    const button = document.getElementById('sendMentorMessage');
    mentorRequestInFlight = true;
    if (button) button.disabled = true;
    const thinking = appendMentorMessage('assistant', 'Orion is thinking…', [], true);

    try {
        const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();
        if (sessionError) throw sessionError;
        if (!sessionData?.session) throw new Error('Your session has expired. Please log in again.');

        const response = await fetch(`${SUPABASE_URL}/functions/v1/mentor-chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionData.session.access_token}`
            },
            body: JSON.stringify({ message, history: historyForRequest })
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Orion Mentor is temporarily unavailable. Please try again.');

        thinking?.remove();
        appendMentorMessage('assistant', result.answer, result.sources || []);
        mentorConversation.push({ role: 'assistant', content: result.answer });
        mentorConversation = mentorConversation.slice(-10);
    } catch (error) {
        console.error('MENTOR CHAT ERROR:', error);
        thinking?.remove();
        appendMentorMessage('assistant', 'Orion Mentor is temporarily unavailable. Please try again.');
    } finally {
        mentorRequestInFlight = false;
        if (button) button.disabled = false;
    }

}

function appendMentorMessage(role, content, sources = [], isThinking = false) {
    const container = document.getElementById('chatMessages');
    if (!container) return null;

    const emptyState = container.querySelector('.mentor-empty');
    if (emptyState) emptyState.remove();

    const message = document.createElement('div');
    message.className = `mentor-message ${role === 'user' ? 'mentor-message-user' : 'mentor-message-assistant'}${isThinking ? ' mentor-message-thinking' : ''}`;

    const body = document.createElement('p');
    body.textContent = content || '';
    message.appendChild(body);

    if (Array.isArray(sources) && sources.length > 0) {
        const sourceList = document.createElement('div');
        sourceList.className = 'mentor-sources';
        const labels = sources.map(source => {
            if (typeof source === 'string') return source;
            if (!source || typeof source !== 'object') return '';
            return `${source.document || 'Company document'}${source.page ? ` · Page ${source.page}` : ''}`;
        }).filter(Boolean);
        sourceList.textContent = `Company Knowledge · Source${labels.length > 1 ? 's' : ''}: ${labels.join(', ')}`;
        message.appendChild(sourceList);
    }

    container.appendChild(message);
    container.scrollTop = container.scrollHeight;
    return message;
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

    // This shared profile state is used by the onboarding-plan query below.
    // Keeping it here avoids a second auth/profile fetch and ensures the
    // dashboard uses the authenticated employee's assigned plan.
    currentUser = user;
    employeeProfile = profile;
    updateEmployeeUI();


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
    employeePlan = null;
    employeeTasks = [];
    tilesState.steps = [];

    if (!employeeProfile || !employeeProfile.id) {
        renderEmptyRoadmapState();
        renderStepTiles();
        return;
    }

    try {
        // Fetch approved onboarding plan for this employee
        const { data: plan, error: planErr } = await supabaseClient
            .from('onboarding_plans')
            .select('*')
            .eq('employee_id', employeeProfile.id)
            .in('status', ['approved', 'completed'])
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (planErr) {
            console.error('Error fetching onboarding plan:', planErr);
            renderEmptyRoadmapState();
            renderStepTiles();
            return;
        }

        if (!plan) {
            console.log('No approved onboarding plan found for employee.');
            renderEmptyRoadmapState();
            renderStepTiles();
            return;
        }

        employeePlan = plan;

        // Fetch onboarding tasks for this plan
        const { data: tasks, error: tasksErr } = await supabaseClient
            .from('onboarding_tasks')
            .select('*')
            .eq('onboarding_plan_id', plan.id)
            .eq('is_required', true)
            .order('order_index', { ascending: true });

        if (tasksErr) {
            console.error('Error fetching onboarding tasks:', tasksErr);
            renderEmptyRoadmapState();
            renderStepTiles();
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
            status: t.status || 'pending',
            requires_assessment: !!t.requires_assessment,
            assessment_completed: !!t.assessment_completed,
            assessment_score: t.assessment_score,
            assessment_attempts: t.assessment_attempts || 0
        }));

        // Render Roadmap UI, Home Progress Overview, Today's Focus & Tiles View
        renderRoadmap(employeeTasks);
        renderHomeProgress(employeeTasks);
        renderTodayFocus(employeeTasks);
        renderStepTiles();

    } catch (err) {
        console.error('loadOnboardingRoadmap unexpected error:', err);
        renderEmptyRoadmapState();
        renderStepTiles();
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

    if (isOnboardingComplete(tasks)) {
        renderCompletedRoadmapState();
        return;
    }

    const roadmapTitle = document.getElementById('roadmapTitle');
    if (roadmapTitle) roadmapTitle.textContent = 'Your journey';

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
    const onboardingComplete = isOnboardingComplete(tasks);
    const pct = onboardingComplete ? 0 : (total > 0 ? Math.round((completed / total) * 100) : 0);

    const progressBadge = document.getElementById('roadmapProgress');
    if (progressBadge) {
        progressBadge.textContent = `${completed} / ${total} completed (${pct}%)`;
    }

    const progressBarWrap = document.getElementById('roadmapProgressBarWrap');
    const progressBarInner = document.getElementById('roadmapProgressBarInner');

    if (progressBarWrap) progressBarWrap.style.display = 'block';
    if (progressBarInner) progressBarInner.style.width = `${pct}%`;
}

function isOnboardingComplete(tasks) {
    return tasks.length > 0 && tasks.every(task => task.status === 'completed' || task.status === 'complete');
}

function renderCompletedRoadmapState() {
    const container = document.getElementById('roadmap');
    if (container) container.innerHTML = `
        <div class="empty-state" style="padding:48px 24px; text-align:center;">
            <div class="empty-icon" style="color:#3B7A57; font-size:30px;">✓</div>
            <h4>Your onboarding is complete</h4>
            <p>Your project work is now your primary workspace.</p>
        </div>`;
    const title = document.getElementById('roadmapTitle');
    if (title) title.textContent = 'Onboarding complete';
    const progress = document.getElementById('roadmapProgress');
    if (progress) progress.textContent = 'Onboarding complete';
    const progressBarWrap = document.getElementById('roadmapProgressBarWrap');
    if (progressBarWrap) progressBarWrap.style.display = 'none';
}

function renderHomeProgress(tasks) {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed' || t.status === 'complete').length;
    const onboardingComplete = isOnboardingComplete(tasks);
    const pct = onboardingComplete ? 0 : (total > 0 ? Math.round((completed / total) * 100) : 0);

    const progressText = document.getElementById('onboardingProgressText');
    if (progressText) {
        if (onboardingComplete) {
            progressText.textContent = 'Onboarding Completed! 🎉';
        } else {
            progressText.textContent = `Onboarding Progress (${completed} of ${total} tasks)`;
        }
    }

    const progressDesc = document.getElementById('onboardingProgressDescription');
    if (progressDesc) {
        if (onboardingComplete) {
            progressDesc.textContent = 'All onboarding tasks are done. Your project work is now your primary workspace.';
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

    const onboardingComplete = isOnboardingComplete(tasks);
    const label = document.getElementById('home-focus-label');
    const title = document.getElementById('home-focus-title');
    const action = document.getElementById('home-focus-action');
    if (label) label.textContent = onboardingComplete ? 'MY PROJECTS' : 'TODAY';
    if (title) title.textContent = onboardingComplete ? 'Projects overview' : "Today's focus";
    if (action) {
        action.dataset.page = onboardingComplete ? 'projects' : 'onboarding';
        action.textContent = onboardingComplete ? 'View projects →' : 'View roadmap →';
    }

    const pendingTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'complete');

    if (pendingTasks.length === 0) {
        if (tasks.length > 0) {
            renderCompletedProjectsOverview(container);
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

async function renderCompletedProjectsOverview(container) {
    container.innerHTML = '<div class="empty-state" style="padding:24px; text-align:center;"><p>Loading your projects...</p></div>';
    const profile = await getCurrentEmployeeProjectProfile();
    if (!profile?.id || !isOnboardingComplete(employeeTasks)) return;

    const { data, error } = await supabaseClient
        .from('project_members')
        .select('project_id, company_projects(id, project_name, problem_statement, deadline)')
        .eq('employee_id', profile.id);
    if (!isOnboardingComplete(employeeTasks)) return;
    if (error) {
        console.error('HOME PROJECTS LOAD ERROR:', error);
        container.innerHTML = '<div class="empty-state" style="padding:24px; text-align:center;"><h4>Projects overview unavailable</h4><p>Please open My Projects to try again.</p></div>';
        return;
    }

    const projects = (data || []).map(item => item.company_projects).filter(Boolean);
    employeeProjects = projects;
    if (!projects.length) {
        container.innerHTML = '<div class="empty-state" style="padding:24px; text-align:center;"><div class="empty-icon">○</div><h4>No projects assigned yet</h4><p>Your projects will appear here when your company assigns them.</p></div>';
        return;
    }

    container.replaceChildren();
    const list = document.createElement('div');
    list.style.cssText = 'display:grid; gap:10px;';
    projects.slice(0, 3).forEach(project => {
        const card = document.createElement('div');
        card.style.cssText = 'background:#FAF9F5; border:1px solid #E8E5DC; border-radius:12px; padding:14px;';
        const name = document.createElement('h4');
        name.style.cssText = 'margin:0 0 4px; font-size:14px; color:#1C1B18;';
        name.textContent = project.project_name;
        const detail = document.createElement('p');
        detail.style.cssText = 'margin:0; font-size:12px; color:#54524B;';
        detail.textContent = project.problem_statement || `Deadline: ${employeeProjectDateLabel(project.deadline)}`;
        card.append(name, detail);
        list.appendChild(card);
    });
    container.appendChild(list);
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
    const taskToComplete = employeeTasks.find(t => t.id === taskId);
    if (newStatus === 'completed' && taskToComplete?.requires_assessment && !taskToComplete.assessment_completed) {
        await openOnboardingAssessment(taskToComplete);
        return false;
    }
    const completedAt = newStatus === 'completed' ? new Date().toISOString() : null;

    // Optimistic UI update in state
    const task = employeeTasks.find(t => t.id === taskId);
    const previousCompletedAt = task?.completed_at ?? null;
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
        const { data, error } = await supabaseClient
            .from('onboarding_tasks')
            .update({
                status: newStatus,
                completed_at: completedAt
            })
            .eq('id', taskId)
            .select('id')
            .maybeSingle();

        if (error) throw error;
        if (!data) throw new Error('The onboarding task is no longer available to this employee.');
        return true;
    } catch (err) {
        console.error('toggleTaskStatus error:', err);
        // Revert the optimistic state when RLS, connectivity, or the update
        // itself fails. Supabase remains the source of truth.
        if (task) {
            task.status = currentStatus;
            task.completed_at = previousCompletedAt;
        }
        if (step) {
            step.completed = currentStatus === 'completed' || currentStatus === 'complete';
            step.status = currentStatus;
        }
        renderRoadmap(employeeTasks);
        renderHomeProgress(employeeTasks);
        renderTodayFocus(employeeTasks);
        renderStepTiles();
        showAlert('error', 'Could Not Update Task', 'Your task status was not saved. Please try again.');
        return false;
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

// Legacy client-side generator retained for compatibility with the tiles engine.
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

// Compatibility bridge for the legacy tiles engine. Assigned onboarding tasks
// are loaded by loadOnboardingRoadmap() from Supabase, never from /api/tiles
// or demo/localStorage data.
async function fetchTilesFromBackend() {
  if (employeeProfile?.id) {
    await loadOnboardingRoadmap();
  }
}

// Legacy callers remain intact, but employee task progress must be written by
// toggleTaskStatus() directly to onboarding_tasks rather than /api/tiles.
async function syncTilesToBackend() {
  return Promise.resolve();
}

function isSupabaseAssignedTask(step) {
  return !!employeePlan && employeeTasks.some(task => task.id === step.id);
}

function ensureEmployeeTaskEditingAllowed() {
  // Actively hide all editing modals
  ["modal-add-step", "modal-edit-step", "modal-raw-json", "modal-settings", "modal-prompt"].forEach((id) => {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.style.opacity = '0';
    modal.style.display = 'none';
    modal.classList.add('hidden');
  });
  showAlert('info', 'Company-Managed Tasks', 'Your assigned onboarding tasks can be completed here, but only your company can add, edit, delete, or reorder them.');
  document.getElementById('alert-banner')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  return false;
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
          Your company will publish your personalized onboarding tasks here.
        </p>
      </div>
    `;
    initLucideIcons();
    return;
  }

  if (steps.every((step) => step.completed || step.status === 'completed' || step.status === 'complete')) {
    container.innerHTML = `
      <div class="col-span-full human-card p-12 text-center" style="grid-column:1/-1; padding:48px; text-align:center;">
        <div style="width:56px; height:56px; border-radius:50%; background:#E3EDE6; border:1px solid #C5DCD0; display:flex; align-items:center; justify-content:center; margin:0 auto 16px; color:#2D6A4F; font-size:26px; font-weight:800;">
          ✓
        </div>
        <h4 style="font-size:18px; font-weight:700; color:#1C1B18;">Your onboarding is done!</h4>
        <p style="font-size:13px; color:#54524B; max-width:400px; margin:8px auto 0; line-height:1.5;">
          The company will be notified shortly.
        </p>
      </div>
    `;
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
    const isAssignedTask = isSupabaseAssignedTask(step);
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

          <!-- Reorder controls do not apply to company-assigned Supabase tasks. -->
          ${isAssignedTask ? '' : `<div style="display:flex; align-items:center; gap:2px;">
            <button class="move-up-btn" style="background:none; border:none; cursor:pointer; color:#8C887D; padding:4px;" data-id="${step.id}" title="Move Up">
              <i data-lucide="chevron-up" class="w-3.5 h-3.5"></i>
            </button>
            <button class="move-down-btn" style="background:none; border:none; cursor:pointer; color:#8C887D; padding:4px;" data-id="${step.id}" title="Move Down">
              <i data-lucide="chevron-down" class="w-3.5 h-3.5"></i>
            </button>
          </div>`}
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

          ${isAssignedTask ? '' : `<div style="display:flex; align-items:center; gap:4px;">
            <button class="edit-tile-btn" style="background:none; border:none; cursor:pointer; color:#8C887D; padding:4px;" data-id="${step.id}" title="Edit step">
              <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
            </button>
            <button class="delete-tile-btn" style="background:none; border:none; cursor:pointer; color:#8C887D; padding:4px;" data-id="${step.id}" title="Delete step">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </div>`}
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
  const step = tilesState.steps.find(s => s.id === id);
  const currentStatus = step?.status || (isChecked ? 'pending' : 'completed');
  const wasSaved = await toggleTaskStatus(id, currentStatus);
  if (!wasSaved) return false;

  const total = tilesState.steps.length;
  const completedCount = tilesState.steps.filter(s => s.completed).length;

  return true;
}

function deleteStep(id) {
  if (!ensureEmployeeTaskEditingAllowed()) return;
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

async function toggleSelectAll() {
  const total = tilesState.steps.length;
  const completedCount = tilesState.steps.filter(s => s.completed).length;
  const shouldComplete = completedCount !== total;
  const changes = tilesState.steps.filter(step => !!step.completed !== shouldComplete);

  await Promise.all(changes.map(step => toggleStepCheck(step.id, shouldComplete)));
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
  if (!ensureEmployeeTaskEditingAllowed()) return;
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
  if (!ensureEmployeeTaskEditingAllowed()) return;
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
  if (!ensureEmployeeTaskEditingAllowed()) return;
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
  if (!ensureEmployeeTaskEditingAllowed()) return;
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
  if (!ensureEmployeeTaskEditingAllowed()) return;
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
  if (!ensureEmployeeTaskEditingAllowed()) return;
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
  if (!ensureEmployeeTaskEditingAllowed()) return;
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
  if (!ensureEmployeeTaskEditingAllowed()) return;
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

  const closeAssessment = document.getElementById('btn-close-assessment');
  if (closeAssessment) closeAssessment.addEventListener('click', closeOnboardingAssessment);
  const assessmentPrevious = document.getElementById('btn-assessment-previous');
  if (assessmentPrevious) assessmentPrevious.addEventListener('click', () => changeAssessmentQuestion(-1));
  const assessmentNext = document.getElementById('btn-assessment-next');
  if (assessmentNext) assessmentNext.addEventListener('click', () => changeAssessmentQuestion(1));
  const assessmentSubmit = document.getElementById('btn-assessment-submit');
  if (assessmentSubmit) assessmentSubmit.addEventListener('click', submitOnboardingAssessment);

  // loadOnboardingRoadmap() is called during dashboard initialization. Do not
  // replace that Supabase state with legacy /api/tiles or local demo data here.
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
        const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();
        if (sessionError) throw sessionError;
        if (!sessionData?.session) {
            throw new Error('Your session has expired. Please log in again.');
        }

        const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-onboarding-roadmap`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionData.session.access_token}`
            },
            body: JSON.stringify({
                ...payload,
                action: 'task-guidance',
                task_id: currentSelectedTask.id
            })
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

/* =========================================
   MY PROJECTS
========================================= */

function employeeProjectDateLabel(deadline) {
    if (!deadline) return 'No deadline';
    const date = new Date(`${deadline}T00:00:00`);
    return Number.isNaN(date.getTime()) ? 'No deadline' : date.toLocaleDateString();
}

let assessmentState = { task: null, questions: [], answers: [], index: 0, submitting: false, active: false, stopped: false, fullscreenRequested: false };

function exitAssessmentFullscreen() {
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
}

function stopOnboardingAssessment(reason) {
    if (!assessmentState.active || assessmentState.stopped || assessmentState.submitting) return;
    assessmentState.active = false;
    assessmentState.stopped = true;
    exitAssessmentFullscreen();
    const container = document.getElementById('assessment-question-container');
    const actions = document.getElementById('assessment-actions');
    if (container) container.textContent = reason;
    if (actions) actions.style.display = 'none';
}

function startAssessmentFocusGuard() {
    assessmentState.active = true;
    assessmentState.stopped = false;
    document.addEventListener('visibilitychange', handleAssessmentVisibilityChange);
    document.addEventListener('fullscreenchange', handleAssessmentFullscreenChange);
}

function stopAssessmentFocusGuard() {
    assessmentState.active = false;
    document.removeEventListener('visibilitychange', handleAssessmentVisibilityChange);
    document.removeEventListener('fullscreenchange', handleAssessmentFullscreenChange);
}

function handleAssessmentVisibilityChange() {
    if (document.hidden) stopOnboardingAssessment('Assessment stopped because you switched away from this tab. Start it again when you are ready to stay on this page.');
}

function handleAssessmentFullscreenChange() {
    if (assessmentState.active && assessmentState.fullscreenRequested && !document.fullscreenElement) {
        stopOnboardingAssessment('Assessment stopped because full screen was exited. Start it again when you are ready.');
    }
}

function closeOnboardingAssessment() {
    stopAssessmentFocusGuard();
    exitAssessmentFullscreen();
    closeModal(document.getElementById('modal-onboarding-assessment'));
}

async function assessmentRequest(payload) {
    const { data: sessionData, error } = await supabaseClient.auth.getSession();
    if (error || !sessionData.session) throw new Error('Your session has expired. Please sign in again.');
    const response = await fetch(`${SUPABASE_URL}/functions/v1/onboarding-assessment`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionData.session.access_token}` }, body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Unable to run the assessment.');
    return data;
}

async function openOnboardingAssessment(task) {
    const modal = document.getElementById('modal-onboarding-assessment');
    const container = document.getElementById('assessment-question-container');
    if (!modal || !container) return;
    assessmentState = { task, questions: [], answers: [], index: 0, submitting: false, active: false, stopped: false, fullscreenRequested: false };
    document.getElementById('assessment-task-title').textContent = task.title || task.step_title || 'Task assessment';
    document.getElementById('assessment-result').hidden = true;
    document.getElementById('assessment-actions').style.display = 'flex';
    container.textContent = 'Preparing your assessment with Orion AI...'; openModal(modal);
    if (document.documentElement.requestFullscreen) {
        assessmentState.fullscreenRequested = true;
        document.documentElement.requestFullscreen().catch(() => { assessmentState.fullscreenRequested = false; });
    }
    try {
        const data = await assessmentRequest({ action: 'generate', task_id: task.id });
        assessmentState.questions = data.questions || []; assessmentState.answers = new Array(assessmentState.questions.length).fill('');
        if (assessmentState.questions.length !== 5) throw new Error('The assessment could not be prepared. Please try again.');
        startAssessmentFocusGuard();
        renderAssessmentQuestion();
    } catch (error) { exitAssessmentFullscreen(); container.textContent = error.message || 'Unable to prepare the assessment.'; document.getElementById('assessment-actions').style.display = 'none'; }
}

function renderAssessmentQuestion() {
    const question = assessmentState.questions[assessmentState.index]; const container = document.getElementById('assessment-question-container');
    if (!question || !container) return;
    container.replaceChildren(); const prompt = document.createElement('p'); prompt.className = 'assessment-question'; prompt.textContent = question.question; container.appendChild(prompt);
    if (question.type === 'short_answer') {
        const input = document.createElement('textarea'); input.className = 'assessment-short-answer'; input.placeholder = 'Write your answer...'; input.value = assessmentState.answers[assessmentState.index] || '';
        input.addEventListener('input', () => assessmentState.answers[assessmentState.index] = input.value); container.appendChild(input);
    } else (question.options || []).forEach(option => {
        const label = document.createElement('label'); label.className = 'assessment-option'; const input = document.createElement('input'); input.type = 'radio'; input.name = 'assessment-answer'; input.value = option; input.checked = assessmentState.answers[assessmentState.index] === option;
        input.addEventListener('change', () => assessmentState.answers[assessmentState.index] = option); const text = document.createElement('span'); text.textContent = option; label.append(input, text); container.appendChild(label);
    });
    document.getElementById('assessment-progress-label').textContent = `Question ${assessmentState.index + 1} of ${assessmentState.questions.length}`;
    document.getElementById('assessment-progress-bar').style.width = `${((assessmentState.index + 1) / assessmentState.questions.length) * 100}%`;
    document.getElementById('btn-assessment-previous').disabled = assessmentState.index === 0;
    document.getElementById('btn-assessment-next').style.display = assessmentState.index === 4 ? 'none' : 'inline-flex';
    document.getElementById('btn-assessment-submit').style.display = assessmentState.index === 4 ? 'inline-flex' : 'none';
}

function changeAssessmentQuestion(delta) { const index = assessmentState.index + delta; if (index >= 0 && index < 5) { assessmentState.index = index; renderAssessmentQuestion(); } }

async function submitOnboardingAssessment() {
    if (assessmentState.submitting || assessmentState.stopped) return;
    if (assessmentState.answers.some(answer => !String(answer).trim())) { alert('Please answer every question before submitting.'); return; }
    assessmentState.submitting = true; stopAssessmentFocusGuard(); const submit = document.getElementById('btn-assessment-submit'); submit.disabled = true; submit.textContent = 'Grading...';
    try {
        const result = await assessmentRequest({ action: 'grade', task_id: assessmentState.task.id, questions: assessmentState.questions, answers: assessmentState.answers });
        const resultEl = document.getElementById('assessment-result'); resultEl.hidden = false;
        resultEl.innerHTML = result.passed ? `<strong>Congratulations!</strong><br>You passed this assessment with ${result.score}%.` : `You scored ${result.score}%.<br>You need at least 80% to complete this task. Please review the material and try again.${result.feedback?.length ? `<br><br>${result.feedback.map(escapeHtml).join('<br>')}` : ''}`;
        if (result.passed) { await loadOnboardingRoadmap(); setTimeout(closeOnboardingAssessment, 1800); } else document.getElementById('assessment-actions').style.display = 'none';
    } catch (error) { alert(error.message || 'Unable to grade the assessment. Please try again.'); }
    finally { assessmentState.submitting = false; submit.disabled = false; submit.textContent = 'Submit assessment'; }
}

function employeeProjectPreview(value) {
    const text = (value || '').trim();
    return text.length > 130 ? `${text.slice(0, 130)}…` : (text || 'No problem statement provided.');
}

async function getCurrentEmployeeProjectProfile() {
    if (employeeProfile?.id) return employeeProfile;
    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !userData.user) return null;
    const { data, error } = await supabaseClient.from('employee_profiles')
        .select('id, company_id').eq('user_id', userData.user.id).maybeSingle();
    if (error) { console.error('PROJECT PROFILE LOAD ERROR:', error); return null; }
    employeeProfile = { ...employeeProfile, ...data };
    return employeeProfile;
}

async function loadEmployeeProjects() {
    const grid = document.getElementById('employeeProjectsGrid');
    if (!grid) return;
    grid.innerHTML = '<div class="empty-state"><h4>Loading projects...</h4></div>';
    const profile = await getCurrentEmployeeProjectProfile();
    if (!profile?.id) { renderEmployeeProjects([], 'Projects could not be loaded.'); return; }
    const { data, error } = await supabaseClient.from('project_members')
        .select('project_id, company_projects(id, project_name, problem_statement, description, deadline, project_members(id), project_tasks(id, title, description, deadline, project_task_assignments(id, employee_id, status, completed_at)))')
        .eq('employee_id', profile.id);
    if (error) { console.error('EMPLOYEE PROJECTS LOAD ERROR:', error); renderEmployeeProjects([], 'Projects could not be loaded.'); return; }
    employeeProjects = (data || []).map(item => item.company_projects).filter(Boolean);
    renderEmployeeProjects(employeeProjects);
}

function renderEmployeeProjects(projects, errorMessage = '') {
    const grid = document.getElementById('employeeProjectsGrid');
    if (!grid) return;
    grid.replaceChildren();
    if (!projects.length) {
        const empty = document.createElement('div'); empty.className = 'empty-state';
        const title = document.createElement('h4'); title.textContent = errorMessage || (isOnboardingComplete(employeeTasks) ? 'You’re fully onboarded! No projects have been assigned to you yet.' : 'You have not been assigned to any projects yet.');
        empty.appendChild(title); grid.appendChild(empty); return;
    }
    projects.forEach(project => {
        const card = document.createElement('article'); card.className = 'project-card';
        const title = document.createElement('h3'); title.textContent = project.project_name;
        const statement = document.createElement('p'); statement.textContent = employeeProjectPreview(project.problem_statement);
        const deadline = document.createElement('span'); deadline.className = 'project-card-meta'; deadline.textContent = `Deadline: ${employeeProjectDateLabel(project.deadline)}`;
        const team = document.createElement('span'); team.className = 'project-card-meta'; team.textContent = `Team size: ${project.project_members?.length || 0}`;
        const assignments = (project.project_tasks || []).flatMap(task => task.project_task_assignments || []);
        const completed = assignments.filter(item => item.status === 'completed').length;
        const work = document.createElement('span'); work.className = 'project-card-meta'; work.textContent = `Pending tasks: ${assignments.length - completed} · Progress: ${assignments.length ? Math.round(completed / assignments.length * 100) : 0}%`;
        const actions = document.createElement('div'); actions.className = 'project-card-actions';
        const view = document.createElement('button'); view.type = 'button'; view.textContent = 'View'; view.addEventListener('click', () => viewEmployeeProject(project.id)); actions.appendChild(view);
        card.append(title, statement, deadline, team, work, actions); grid.appendChild(card);
    });
}

function showEmployeeProjectModal() {
    const modal = document.getElementById('employeeProjectDetailsModal');
    if (!modal) return;
    modal.style.display = 'flex'; modal.classList.remove('hidden'); modal.classList.add('active');
}

function closeEmployeeProjectModal() {
    const modal = document.getElementById('employeeProjectDetailsModal');
    if (!modal) return;
    modal.style.display = 'none'; modal.classList.add('hidden'); modal.classList.remove('active');
}

async function viewEmployeeProject(projectId) {
    const container = document.getElementById('employeeProjectDetails');
    if (!container) return;
    container.textContent = 'Loading project...'; showEmployeeProjectModal();
    const { data: project, error } = await supabaseClient.from('company_projects')
        .select('id, project_name, problem_statement, description, deadline, project_members(employee_id, employee_profiles(full_name, email, role, experience_level, department_id, departments(name))), project_tasks(id, title, description, deadline, project_task_assignments(id, employee_id, status, completed_at))')
        .eq('id', projectId).maybeSingle();
    if (error || !project) { console.error('PROJECT DETAILS LOAD ERROR:', error); container.textContent = 'Project details could not be loaded.'; return; }
    container.replaceChildren();
    [['h2', project.project_name], ['h4', 'Problem statement'], ['p', project.problem_statement], ['h4', 'Description'], ['p', project.description || 'No description provided.'], ['h4', 'Deadline'], ['p', employeeProjectDateLabel(project.deadline)], ['h4', 'Team members']].forEach(([tag, value]) => { const element = document.createElement(tag); element.textContent = value; container.appendChild(element); });
    const members = document.createElement('div'); members.className = 'project-details-members';
    (project.project_members || []).forEach(member => {
        const employee = member.employee_profiles; if (!employee) return;
        const item = document.createElement('div'); item.className = 'project-details-member';
        const avatar = document.createElement('span'); avatar.className = 'project-member-avatar'; avatar.textContent = (employee.full_name || 'E').charAt(0).toUpperCase();
        const details = document.createElement('div');
        const name = document.createElement('strong'); name.textContent = employee.full_name || 'Employee';
        const info = document.createElement('small'); info.textContent = [employee.role || 'Employee', employee.departments?.name || 'Department not specified', employee.experience_level || 'Experience not specified'].join(' · ');
        details.append(name, document.createElement('br'), info);
        if (employee.email) {
            const email = document.createElement('small'); email.textContent = employee.email;
            details.append(document.createElement('br'), email);
        }
        item.append(avatar, details); members.appendChild(item);
    });
    container.appendChild(members);
    const taskHeading = document.createElement('h4'); taskHeading.textContent = 'Project tasks'; container.appendChild(taskHeading);
    const tasks = project.project_tasks || [];
    if (!tasks.length) {
        const empty = document.createElement('p'); empty.textContent = 'No project tasks are assigned to you yet.'; container.appendChild(empty);
    }
    tasks.forEach(task => {
        const assignment = (task.project_task_assignments || [])[0];
        if (!assignment) return;
        const item = document.createElement('div'); item.className = 'project-details-member';
        const details = document.createElement('div');
        const title = document.createElement('strong'); title.textContent = task.title;
        const description = document.createElement('small'); description.textContent = task.description || 'No instructions provided.';
        const status = document.createElement('small'); status.textContent = 'Status: ' + assignment.status;
        const button = document.createElement('button'); button.type = 'button'; button.textContent = assignment.status === 'completed' ? 'Mark pending' : 'Mark completed';
        button.addEventListener('click', async () => {
            button.disabled = true;
            const nextStatus = assignment.status === 'completed' ? 'pending' : 'completed';
            const { error } = await supabaseClient.from('project_task_assignments').update({
                status: nextStatus, completed_at: nextStatus === 'completed' ? new Date().toISOString() : null
            }).eq('id', assignment.id);
            if (error) { alert(error.message); button.disabled = false; return; }
            await viewEmployeeProject(project.id);
            await loadEmployeeProjects();
        });
        details.append(title, document.createElement('br'), description, document.createElement('br'), status, document.createElement('br'), button);
        item.append(details); container.appendChild(item);
    });
}

document.getElementById('closeEmployeeProjectDetails')?.addEventListener('click', closeEmployeeProjectModal);
