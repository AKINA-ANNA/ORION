/*
==================================================
   ORION COMPANY DASHBOARD
   FINAL VERSION
==================================================
*/


/*
==================================================
   STATE
==================================================
*/

let companyUser = null;

let companyProfile = null;

let employees = [];

let departments = [];

let companyProjects = [];

let selectedDepartmentId = null;

// ==========================================
// ONBOARDING STATE
// ==========================================

let currentOnboardingEmployeeId = null;   // employee_profiles.id
let currentOnboardingEmployee = null;     // full employee object
let onboardingExpectations = [];          // array of strings
let onboardingGoals = [];                 // array of strings
let generatedTasks = [];                  // array of task objects
let onboardingPlansMap = {};              // employeeId -> plan record
let companyKnowledgeDocuments = [];

const COMPANY_KNOWLEDGE_BUCKET = 'company-knowledge';


/*
==================================================
   DOM
==================================================
*/

const sidebar =
    document.getElementById("sidebar");

const sidebarOverlay =
    document.getElementById("sidebarOverlay");

const menuButton =
    document.getElementById("menuButton");

const pageTitle =
    document.getElementById("pageTitle");

const employeeModal =
    document.getElementById("employeeModal");

const departmentModal =
    document.getElementById("departmentModal");

const addEmployeeButton =
    document.getElementById("addEmployeeButton");

const addDepartmentButton =
    document.getElementById("addDepartmentButton");


/*
==================================================
   INITIALIZE DASHBOARD
==================================================
*/

async function initializeDashboard() {

    try {

        /*
        ==========================================
        GET LOGGED-IN USER
        ==========================================
        */

        const {
            data,
            error
        } = await supabaseClient.auth.getUser();


        if (
            error ||
            !data ||
            !data.user
        ) {

            window.location.href =
                "../auth/company-login.html";

            return;

        }


        companyUser =
            data.user;


        /*
        ==========================================
        LOAD COMPANY PROFILE
        ==========================================
        */

        await loadCompanyProfile();


        if (!companyProfile) {

            console.error(
                "No company profile found."
            );

            return;

        }


        /*
        ==========================================
        LOAD DEPARTMENTS FIRST
        ==========================================
        */

        await loadDepartments();


        /*
        ==========================================
        LOAD EMPLOYEES AFTER DEPARTMENTS
        ==========================================
        */

        await loadEmployees();

        /*
        ==========================================
        LOAD ONBOARDING PLANS MAP
        ==========================================
        */

        await loadOnboardingPlansMap();


        /*
        ==========================================
        UPDATE EVERYTHING
        ==========================================
        */

        updateDashboard();


    } catch (error) {

        console.error(
            "DASHBOARD INITIALIZATION ERROR:",
            error
        );

    }

}


/*
==================================================
   LOAD COMPANY PROFILE
==================================================
*/

async function loadCompanyProfile() {

    const {
        data,
        error
    } = await supabaseClient
        .from("company_profiles")
        .select("*")
        .eq(
            "user_id",
            companyUser.id
        )
        .maybeSingle();


    if (error) {

        console.error(
            "COMPANY PROFILE ERROR:",
            error
        );

        return;

    }


    companyProfile =
        data;


    if (!companyProfile) {

        return;

    }


    const companyName =
        companyProfile.company_name ||
        "Company";


    /*
    ==========================================
    SIDEBAR COMPANY NAME
    ==========================================
    */

    const sidebarCompanyName =
        document.getElementById(
            "sidebarCompanyName"
        );


    if (sidebarCompanyName) {

        sidebarCompanyName.textContent =
            companyName;

    }


    /*
    ==========================================
    WELCOME COMPANY NAME
    ==========================================
    */

    const welcomeCompanyName =
        document.getElementById(
            "welcomeCompanyName"
        );


    if (welcomeCompanyName) {

        welcomeCompanyName.textContent =
            companyName;

    }


    /*
    ==========================================
    COMPANY INITIAL
    ==========================================
    */

    const initial =
        companyName
            .charAt(0)
            .toUpperCase();


    const companyInitial =
        document.getElementById(
            "companyInitial"
        );


    if (companyInitial) {

        companyInitial.textContent =
            initial;

    }


    const userInitial =
        document.getElementById(
            "userInitial"
        );


    if (userInitial) {

        userInitial.textContent =
            initial;

    }


    /*
    ==========================================
    PROFILE FORM
    ==========================================
    */

    setInputValue(
        "profileCompanyName",
        companyProfile.company_name
    );


    setInputValue(
        "profileIndustry",
        companyProfile.industry
    );


    setInputValue(
        "profileCompanySize",
        companyProfile.company_size
    );


    setInputValue(
        "profileWebsite",
        companyProfile.website
    );

}


/*
==================================================
   LOAD DEPARTMENTS
==================================================
*/

async function loadDepartments() {

    if (!companyProfile) {

        departments = [];

        renderDepartments();

        renderDepartmentSelect();

        return;

    }


    const {
        data,
        error
    } = await supabaseClient
        .from("departments")
        .select(
            "id, company_id, name, description, created_at"
        )
        .eq(
            "company_id",
            companyProfile.id
        )
        .order(
            "name",
            {
                ascending: true
            }
        );


    if (error) {

        console.error(
            "DEPARTMENTS LOAD ERROR:",
            error
        );

        departments = [];

        renderDepartments();

        renderDepartmentSelect();

        return;

    }


    departments =
        data || [];


    renderDepartments();

    renderDepartmentSelect();

}


/*
==================================================
   LOAD EMPLOYEES
==================================================
*/

async function loadEmployees() {

    if (!companyProfile) {

        employees = [];

        return;

    }


    const {
        data,
        error
    } = await supabaseClient
        .from("employee_profiles")
        .select("*")
        .eq(
            "company_id",
            companyProfile.id
        )
        .order(
            "created_at",
            {
                ascending: false
            }
        );


    if (error) {

        console.error(
            "EMPLOYEES LOAD ERROR:",
            error
        );

        employees = [];

        return;

    }


    /*
    ==========================================
    MAP DEPARTMENT NAME
    ==========================================
    */

    employees =
        (data || []).map(
            function(employee) {

                const department =
                    departments.find(
                        function(item) {

                            return String(
                                item.id
                            ) === String(
                                employee.department_id
                            );

                        }
                    );


                return {

                    ...employee,

                    department_name:
                        department
                            ? department.name
                            : "No department"

                };

            }
        );


    console.log(
        "Employees loaded:",
        employees
    );

}


/*
==================================================
   RENDER DEPARTMENT SELECT
==================================================
*/

function renderDepartmentSelect() {

    const select =
        document.getElementById(
            "employeeDepartment"
        );


    if (!select) {

        return;

    }


    select.innerHTML = `

        <option value="">
            Select a department
        </option>

    `;


    departments.forEach(
        function(department) {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                department.id;


            option.textContent =
                department.name;


            select.appendChild(
                option
            );

        }
    );

}

/*
==================================================
   RENDER DEPARTMENTS
==================================================
*/

function renderDepartments() {

    const container =
        document.getElementById(
            "departmentsGrid"
        );


    if (!container) {

        return;

    }


    if (
        departments.length === 0
    ) {

        container.innerHTML = `

            <div class="empty-state panel">

                <div class="empty-icon">
                    ▦
                </div>

                <h4>
                    No departments yet
                </h4>

                <p>
                    Create departments to organize
                    your organization.
                </p>

            </div>

        `;

        return;

    }


    container.innerHTML =
        departments
            .map(
                function(department) {

                    const employeeCount =
                        employees.filter(
                            function(employee) {

                                return String(
                                    employee.department_id
                                ) === String(
                                    department.id
                                );

                            }
                        )
                        .length;


                    return `

                        <div
                            class="department-card"
                            data-department-id="${escapeHTML(
                                department.id
                            )}"
                        >

                            <div class="department-card-content">

                                <div class="department-icon">
                                    ▦
                                </div>

                                <h3>
                                    ${escapeHTML(
                                        department.name
                                    )}
                                </h3>

                                <p>
                                    ${escapeHTML(
                                        department.description ||
                                        "No description provided."
                                    )}
                                </p>

                                <span class="department-employee-count">

                                    ${employeeCount}

                                    employee${
                                        employeeCount === 1
                                            ? ""
                                            : "s"
                                    }

                                </span>

                            </div>


                            <!-- DELETE DEPARTMENT BUTTON -->

                            <div class="department-card-actions">

                                <button
                                    type="button"
                                    class="danger-button delete-department-button"
                                    data-department-id="${escapeHTML(
                                        department.id
                                    )}"
                                >

                                    Delete

                                </button>

                            </div>

                        </div>

                    `;

                }
            )
            .join("");


    /*
    ==========================================
    DEPARTMENT CLICK
    ==========================================
    */

    document
        .querySelectorAll(
            ".department-card"
        )
        .forEach(
            function(card) {

                card.addEventListener(
                    "click",
                    function(event) {

                        /*
                        ==========================================
                        DO NOT OPEN DEPARTMENT WHEN DELETE BUTTON
                        IS CLICKED
                        ==========================================
                        */

                        if (
                            event.target.closest(
                                ".delete-department-button"
                            )
                        ) {

                            return;

                        }


                        const departmentId =
                            this.dataset.departmentId;


                        showDepartmentEmployees(
                            departmentId
                        );

                    }
                );

            }
        );


    /*
    ==========================================
    DELETE DEPARTMENT BUTTONS
    ==========================================
    */

    container
        .querySelectorAll(
            ".delete-department-button"
        )
        .forEach(
            function(button) {

                button.addEventListener(
                    "click",
                    async function(event) {

                        event.stopPropagation();


                        const departmentId =
                            this.dataset.departmentId;


                        await deleteDepartment(
                            departmentId
                        );

                    }
                );

            }
        );

}

/*
==================================================
   DELETE DEPARTMENT
==================================================
*/

async function deleteDepartment(
    departmentId
) {

    if (!companyProfile) {

        alert(
            "Company profile not found."
        );

        return;

    }


    /*
    ==========================================
    FIND DEPARTMENT
    ==========================================
    */

    const department =
        departments.find(
            function(item) {

                return String(
                    item.id
                ) === String(
                    departmentId
                );

            }
        );


    if (!department) {

        alert(
            "Department could not be found."
        );

        return;

    }


    /*
    ==========================================
    CHECK EMPLOYEES
    ==========================================
    */

    const departmentEmployees =
        employees.filter(
            function(employee) {

                return String(
                    employee.department_id
                ) === String(
                    departmentId
                );

            }
        );


    /*
    ==========================================
    CONFIRM DELETE
    ==========================================
    */

    let confirmationMessage =

        `Are you sure you want to delete the department "${department.name}"?`;


    if (
        departmentEmployees.length > 0
    ) {

        confirmationMessage +=

            `\n\nThis department currently has ${departmentEmployees.length} employee${
                departmentEmployees.length === 1
                    ? ""
                    : "s"
            } assigned to it.` +

            `\n\nDeleting the department may fail if employees are still assigned to it.`;

    }


    confirmationMessage +=

        "\n\nThis action cannot be undone.";


    const confirmed =
        window.confirm(
            confirmationMessage
        );


    if (!confirmed) {

        return;

    }


    try {

        /*
        ==========================================
        DELETE DEPARTMENT
        ==========================================
        */

        const {
            data: deletedRows,
            error
        } =
            await supabaseClient

                .from(
                    "departments"
                )

                .delete()

                .eq(
                    "id",
                    departmentId
                )

                .eq(
                    "company_id",
                    companyProfile.id
                )

                .select();


        /*
        ==========================================
        CHECK DATABASE ERROR
        ==========================================
        */

        if (error) {

            console.error(
                "DEPARTMENT DELETE ERROR:",
                error
            );


            alert(

                "Could not delete department.\n\n" +

                error.message

            );

            return;

        }


        /*
        ==========================================
        VERIFY DELETE
        ==========================================
        */

        if (
            !deletedRows ||
            deletedRows.length === 0
        ) {

            console.error(
                "No department row was deleted."
            );


            alert(

                "The department could not be deleted.\n\n" +

                "Supabase did not delete any department record. " +

                "This may be caused by an RLS policy."

            );

            return;

        }


        /*
        ==========================================
        REMOVE FROM LOCAL STATE
        ==========================================
        */

        departments =
            departments.filter(
                function(item) {

                    return String(
                        item.id
                    ) !== String(
                        departmentId
                    );

                }
            );


        /*
        ==========================================
        CLEAR SELECTED DEPARTMENT
        ==========================================
        */

        if (
            selectedDepartmentId &&
            String(
                selectedDepartmentId
            ) === String(
                departmentId
            )
        ) {

            selectedDepartmentId =
                null;

        }


        /*
        ==========================================
        RELOAD DEPARTMENTS
        ==========================================
        */

        await loadDepartments();


        /*
        ==========================================
        RELOAD EMPLOYEES
        ==========================================
        */

        await loadEmployees();


        /*
        ==========================================
        UPDATE DASHBOARD
        ==========================================
        */

        updateDashboard();


        /*
        ==========================================
        RETURN TO DEPARTMENTS PAGE
        ==========================================
        */

        showSection(
            "departments"
        );


        alert(
            "Department deleted successfully."
        );


    } catch (error) {

        console.error(
            "DEPARTMENT DELETE ERROR:",
            error
        );


        alert(

            "Could not delete department.\n\n" +

            (
                error.message ||
                "An unexpected error occurred."
            )

        );

    }

}
/*
==================================================
   SHOW DEPARTMENT EMPLOYEES
==================================================
*/

function showDepartmentEmployees(
    departmentId
) {

    const department =
        departments.find(
            function(item) {

                return String(
                    item.id
                ) === String(
                    departmentId
                );

            }
        );


    if (!department) {

        return;

    }


    selectedDepartmentId =
        departmentId;


    /*
    ==========================================
    GET EMPLOYEES
    ==========================================
    */

    const departmentEmployees =
        employees.filter(
            function(employee) {

                return String(
                    employee.department_id
                ) === String(
                    departmentId
                );

            }
        );


    /*
    ==========================================
    SWITCH TO EMPLOYEES PAGE
    ==========================================
    */

    showSection(
        "employees"
    );


    /*
    ==========================================
    CLEAR SEARCH
    ==========================================
    */

    if (employeeSearch) {

        employeeSearch.value =
            "";

    }


    if (employeeFilter) {

        employeeFilter.value =
            "all";

    }


    /*
    ==========================================
    RENDER ONLY THIS DEPARTMENT
    ==========================================
    */

    renderEmployees(
        departmentEmployees
    );


    /*
    ==========================================
    UPDATE PAGE TITLE
    ==========================================
    */

    if (pageTitle) {

        pageTitle.textContent =
            department.name + " Employees";

    }

}


/*
==================================================
   NAVIGATION
==================================================
*/

document
    .querySelectorAll(
        ".nav-item"
    )
    .forEach(
        function(item) {

            item.addEventListener(
                "click",
                function() {

                    const section =
                        this.dataset.section;


                    if (section) {

                        selectedDepartmentId =
                            null;


                        showSection(
                            section
                        );


                        if (
                            section ===
                            "employees"
                        ) {

                            renderEmployees(
                                employees
                            );

                        }

                    }

                }
            );

        }
    );


/*
==================================================
   OTHER SECTION BUTTONS
==================================================
*/

document
    .querySelectorAll(
        "[data-section-target]"
    )
    .forEach(
        function(button) {

            button.addEventListener(
                "click",
                function() {

                    const section =
                        this.dataset.sectionTarget;


                    if (section) {

                        selectedDepartmentId =
                            null;


                        showSection(
                            section
                        );

                    }

                }
            );

        }
    );


/*
==================================================
   SHOW SECTION
==================================================
*/

function showSection(
    section
) {

    document
        .querySelectorAll(
            ".dashboard-section"
        )
        .forEach(
            function(item) {

                item.classList.remove(
                    "active"
                );

            }
        );


    const target =
        document.getElementById(
            `${section}Section`
        );


    if (!target) {

        return;

    }


    target.classList.add(
        "active"
    );


    /*
    ==========================================
    ACTIVE NAV
    ==========================================
    */

    document
        .querySelectorAll(
            ".nav-item"
        )
        .forEach(
            function(item) {

                item.classList.remove(
                    "active"
                );

            }
        );


    const activeNav =
        document.querySelector(
            `.nav-item[data-section="${section}"]`
        );


    if (activeNav) {

        activeNav.classList.add(
            "active"
        );

    }


    /*
    ==========================================
    PAGE TITLE
    ==========================================
    */

    const titles = {

        overview:
            "Overview",

        employees:
            "Employees",

        onboarding:
            "Onboarding",

        knowledge:
            "Knowledge",

        tiles:
            "Tiles",

        departments:
            "Departments",

        projects:
            "My Projects",

        analytics:
            "Analytics",

        profile:
            "Company Profile",

        settings:
            "Settings"

    };


    if (pageTitle) {

        pageTitle.textContent =
            titles[section] ||
            "Overview";

    }

    if (section === 'onboarding') {
        updateOnboardingStatsAndProgressBar();
    } else if (section === 'knowledge') {
        loadCompanyKnowledge();
    } else if (section === 'projects') {
        loadCompanyProjects();
    } else if (section === 'tiles') {
        renderStepTiles();
    }


    /*
    ==========================================
    CLOSE MOBILE SIDEBAR
    ==========================================
    */

    if (sidebar) {

        sidebar.classList.remove(
            "open"
        );

    }


    if (sidebarOverlay) {

        sidebarOverlay.classList.remove(
            "active"
        );

    }

}


/*
==================================================
   MOBILE SIDEBAR
==================================================
*/

if (menuButton) {

    menuButton.addEventListener(
        "click",
        function() {

            if (sidebar) {

                sidebar.classList.add(
                    "open"
                );

            }


            if (sidebarOverlay) {

                sidebarOverlay.classList.add(
                    "active"
                );

            }

        }
    );

}


if (sidebarOverlay) {

    sidebarOverlay.addEventListener(
        "click",
        function() {

            if (sidebar) {

                sidebar.classList.remove(
                    "open"
                );

            }


            sidebarOverlay.classList.remove(
                "active"
            );

        }
    );

}


/*
==================================================
   OPEN EMPLOYEE MODAL
==================================================
*/

if (addEmployeeButton) {

    addEmployeeButton.addEventListener(
        "click",
        function() {

            renderDepartmentSelect();


            if (employeeModal) {

                employeeModal.classList.add(
                    "active"
                );

            }

        }
    );

}


/*
==================================================
   OPEN DEPARTMENT MODAL
==================================================
*/

if (addDepartmentButton) {

    addDepartmentButton.addEventListener(
        "click",
        function() {

            if (departmentModal) {

                departmentModal.classList.add(
                    "active"
                );

            }

        }
    );

}


/*
==================================================
   CLOSE MODALS
==================================================
*/

document
    .querySelectorAll(
        ".modal-close, .modal-cancel"
    )
    .forEach(
        function(button) {

            button.addEventListener(
                "click",
                function() {

                    if (employeeModal) {

                        employeeModal.classList.remove(
                            "active"
                        );

                    }


                    if (departmentModal) {

                        departmentModal.classList.remove(
                            "active"
                        );

                    }

                }
            );

        }
    );


/*
==================================================
   SAVE COMPANY PROFILE
==================================================
*/

const saveProfileButton =
    document.getElementById(
        "saveProfileButton"
    );


if (saveProfileButton) {

    saveProfileButton.addEventListener(
        "click",
        async function() {

            const message =
                document.getElementById(
                    "profileMessage"
                );


            const updates = {

                company_name:
                    getInputValue(
                        "profileCompanyName"
                    ),

                industry:
                    getInputValue(
                        "profileIndustry"
                    ),

                company_size:
                    getInputValue(
                        "profileCompanySize"
                    ),

                website:
                    getInputValue(
                        "profileWebsite"
                    )

            };


            const {
                error
            } =
                await supabaseClient
                    .from(
                        "company_profiles"
                    )
                    .update(
                        updates
                    )
                    .eq(
                        "user_id",
                        companyUser.id
                    );


            if (error) {

                console.error(
                    "PROFILE UPDATE ERROR:",
                    error
                );


                if (message) {

                    message.textContent =
                        error.message;

                }


                return;

            }


            if (message) {

                message.textContent =
                    "Changes saved successfully.";

            }


            await loadCompanyProfile();

        }
    );

}


/*
==================================================
   CREATE DEPARTMENT
==================================================
*/

const departmentForm =
    document.getElementById(
        "departmentForm"
    );


if (departmentForm) {

    departmentForm.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();


            const name =
                getInputValue(
                    "departmentName"
                );


            const description =
                getInputValue(
                    "departmentDescription"
                );


            const message =
                document.getElementById(
                    "departmentMessage"
                );


            if (!companyProfile) {

                if (message) {

                    message.textContent =
                        "Company profile not found.";

                }

                return;

            }


            if (!name) {

                if (message) {

                    message.textContent =
                        "Please enter a department name.";

                }

                return;

            }


            const {
                data,
                error
            } =
                await supabaseClient
                    .from(
                        "departments"
                    )
                    .insert({

                        company_id:
                            companyProfile.id,

                        name:
                            name,

                        description:
                            description

                    })
                    .select()
                    .single();


            if (error) {

                console.error(
                    "DEPARTMENT CREATION ERROR:",
                    error
                );


                if (message) {

                    message.textContent =
                        error.message;

                }

                return;

            }


            /*
            ==========================================
            RELOAD FROM DATABASE
            ==========================================
            */

            await loadDepartments();

            await loadEmployees();

            updateDashboard();


            departmentForm.reset();


            if (message) {

                message.textContent =
                    "Department created successfully.";

            }


            setTimeout(
                function() {

                    if (departmentModal) {

                        departmentModal.classList.remove(
                            "active"
                        );

                    }


                    if (message) {

                        message.textContent =
                            "";

                    }

                },
                800
            );

        }
    );

}


/*
==================================================
   CREATE EMPLOYEE
==================================================
*/

const employeeForm =
    document.getElementById(
        "employeeForm"
    );


if (employeeForm) {

    employeeForm.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();


            const nameInput =
                document.getElementById(
                    "employeeName"
                );


            const emailInput =
                document.getElementById(
                    "employeeEmail"
                );


            const departmentInput =
                document.getElementById(
                    "employeeDepartment"
                );


            const message =
                document.getElementById(
                    "employeeMessage"
                );


            const createButton =
                document.getElementById(
                    "createEmployeeButton"
                );


            const full_name =
                nameInput.value.trim();


            const email =
                emailInput.value
                    .trim()
                    .toLowerCase();


            const department_id =
                departmentInput.value;


            /*
            ==========================================
            VALIDATE
            ==========================================
            */

            if (
                !full_name ||
                !email ||
                !department_id
            ) {

                if (message) {

                    message.textContent =
                        "Please fill in all required fields.";

                }

                return;

            }


            if (!companyProfile) {

                if (message) {

                    message.textContent =
                        "Company profile could not be found.";

                }

                return;

            }


            const selectedDepartment =
                departments.find(
                    function(department) {

                        return String(
                            department.id
                        ) === String(
                            department_id
                        );

                    }
                );


            if (!selectedDepartment) {

                if (message) {

                    message.textContent =
                        "Please select a valid department.";

                }

                return;

            }


            /*
            ==========================================
            DISABLE BUTTON
            ==========================================
            */

            createButton.disabled =
                true;


            createButton.textContent =
                "Creating employee...";


            if (message) {

                message.textContent =
                    "";

            }


            try {

                /*
                ======================================
                GET SESSION
                ======================================
                */

                const {
                    data: sessionData,
                    error: sessionError
                } =
                    await supabaseClient
                        .auth
                        .getSession();


                if (sessionError) {

                    throw sessionError;

                }


                if (
                    !sessionData ||
                    !sessionData.session
                ) {

                    throw new Error(
                        "Your company session has expired. Please log in again."
                    );

                }


                const accessToken =
                    sessionData
                        .session
                        .access_token;


                if (
                    typeof SUPABASE_URL ===
                    "undefined"
                ) {

                    throw new Error(
                        "SUPABASE_URL is not configured."
                    );

                }


                /*
                ======================================
                CREATE EMPLOYEE
                ======================================
                */

                const response =
                    await fetch(

                        `${SUPABASE_URL}/functions/v1/create-employee`,

                        {

                            method:
                                "POST",

                            headers: {

                                "Content-Type":
                                    "application/json",

                                "Authorization":
                                    `Bearer ${accessToken}`

                            },

                            body:
                                JSON.stringify({

                                    full_name:
                                        full_name,

                                    email:
                                        email,

                                    department_id:
                                        department_id,

                                    company_id:
                                        companyProfile.id

                                })

                        }

                    );


                let result = {};


                try {

                    result =
                        await response.json();

                } catch (error) {

                    console.warn(
                        "Could not parse response.",
                        error
                    );

                }


                if (!response.ok) {

                    throw new Error(

                        result.error ||

                        result.message ||

                        `Could not create employee. Server returned ${response.status}.`

                    );

                }


                /*
                ======================================
                SUCCESS
                ======================================
                */

                if (message) {

                    message.textContent =
                        result.message || (result.credentials_sent
                            ? `Login credentials sent successfully to ${email}`
                            : "Employee account created, but the login email could not be sent. Use Resend Login Credentials from Employees.");

                }


                employeeForm.reset();


                /*
                ======================================
                RELOAD EVERYTHING FROM DATABASE
                ======================================
                */

                await loadDepartments();

                await loadEmployees();

                updateDashboard();


                /*
                ======================================
                CLOSE MODAL
                ======================================
                */

                setTimeout(
                    function() {

                        if (employeeModal) {

                            employeeModal.classList.remove(
                                "active"
                            );

                        }


                        if (message) {

                            message.textContent =
                                "";

                        }

                    },
                    1000
                );


            } catch (error) {

                console.error(
                    "EMPLOYEE CREATION ERROR:",
                    error
                );


                if (message) {

                    message.textContent =
                        error.message ||
                        "Could not create employee account.";

                }


            } finally {

                createButton.disabled =
                    false;


                createButton.textContent =
                    "Create employee account";

            }

        }
    );

}


/*
==================================================
   EMPLOYEE SEARCH
==================================================
*/

const employeeSearch =
    document.getElementById(
        "employeeSearch"
    );


if (employeeSearch) {

    employeeSearch.addEventListener(
        "input",
        applyEmployeeFilters
    );

}


/*
==================================================
   EMPLOYEE FILTER
==================================================
*/

const employeeFilter =
    document.getElementById(
        "employeeFilter"
    );


if (employeeFilter) {

    employeeFilter.addEventListener(
        "change",
        applyEmployeeFilters
    );

}


/*
==================================================
   APPLY EMPLOYEE FILTERS
==================================================
*/

function applyEmployeeFilters() {

    const query =
        employeeSearch
            ? employeeSearch.value
                .toLowerCase()
                .trim()
            : "";


    const filter =
        employeeFilter
            ? employeeFilter.value
            : "all";


    const filtered =
        employees.filter(
            function(employee) {

                /*
                ======================================
                DEPARTMENT FILTER
                ======================================
                */

                if (
                    selectedDepartmentId &&
                    String(
                        employee.department_id
                    ) !== String(
                        selectedDepartmentId
                    )
                ) {

                    return false;

                }


                const name =
                    (
                        employee.full_name ||
                        employee.name ||
                        ""
                    )
                    .toLowerCase();


                const department =
                    (
                        employee.department_name ||
                        ""
                    )
                    .toLowerCase();


                const matchesSearch =
                    !query ||

                    name.includes(
                        query
                    ) ||

                    department.includes(
                        query
                    );


                let matchesFilter =
                    true;


                if (
                    filter ===
                    "completed"
                ) {

                    matchesFilter =
                        employee.questionnaire_completed ===
                        true;

                }


                if (
                    filter ===
                    "pending"
                ) {

                    matchesFilter =
                        employee.questionnaire_completed !==
                        true;

                }


                return (
                    matchesSearch &&
                    matchesFilter
                );

            }
        );


    renderEmployees(
        filtered
    );

}


/*
==================================================
   RENDER EMPLOYEES
==================================================
*/

function renderEmployees(
    employeeList = employees
) {

    const container =
        document.getElementById(
            "employeesTableBody"
        );


    if (!container) {

        return;

    }


    if (
        employeeList.length === 0
    ) {

        container.innerHTML = `

            <tr>

                <td
                    colspan="5"
                    class="table-empty"
                >

                    No employees found.

                </td>

            </tr>

        `;

        return;

    }


    container.innerHTML =
        employeeList
            .map(
                function(employee) {

                    /*
                    ======================================
                    FULL NAME ONLY
                    ======================================
                    */

                    const name =
                        employee.full_name ||
                        employee.name ||
                        "Employee";


                    const department =
                        employee.department_name ||
                        "No department";


                    const initial =
                        name
                            .charAt(0)
                            .toUpperCase();


                    const completed =
                        employee.questionnaire_completed ===
                        true;


                    const joined =
                        employee.created_at
                            ? new Date(
                                employee.created_at
                            ).toLocaleDateString()
                            : "Unknown";


                    // onboarding plan status
                    const plan = onboardingPlansMap[employee.id];
                    const planStatus = plan ? plan.status : 'none';


                    return `

                        <tr>

                            <td>

                                <div class="employee-table-cell">

                                    <div class="employee-avatar">

                                        ${escapeHTML(
                                            initial
                                        )}

                                    </div>

                                    <div class="employee-info">

                                        <strong>
                                            ${escapeHTML(
                                                name
                                            )}
                                        </strong>

                                    </div>

                                </div>

                            </td>


                            <td>

                                ${escapeHTML(
                                    department
                                )}

                            </td>


                            <td>

                                <span class="status-badge ${planStatus === 'approved' ? 'badge-approved' : planStatus === 'generated' ? 'badge-generated' : planStatus === 'draft' ? 'badge-draft' : 'badge-none'}">

                                    ${planStatus === 'approved' ? 'Approved' : planStatus === 'generated' ? 'Generated' : planStatus === 'draft' ? 'Draft' : 'No Plan'}

                                </span>

                            </td>


                            <td>

                                ${escapeHTML(
                                    joined
                                )}

                            </td>


                            <td>

                                <div class="employee-actions">

                                    <button
                                        type="button"
                                        class="primary-button onboard-employee-button"
                                        data-onboard-employee="${escapeHTML(
                                            employee.id
                                        )}"
                                        style="font-size:0.8rem;padding:6px 14px;"
                                    >

                                        ${planStatus === 'approved' ? '✓ Roadmap Approved' : planStatus === 'generated' ? '↻ Review Roadmap' : planStatus === 'draft' ? '… In Draft' : 'Onboard Employee'}

                                    </button>

                                    <button
                                        type="button"
                                        class="secondary-button"
                                        data-resend-credentials="${escapeHTML(
                                            employee.id
                                        )}"
                                        style="font-size:0.8rem;padding:6px 14px;"
                                    >
                                        Resend Login Credentials
                                    </button>


                                    <button
                                        type="button"
                                        class="danger-button delete-employee-button"
                                        data-delete-employee="${escapeHTML(
                                            employee.id
                                        )}"
                                    >

                                        Delete

                                    </button>

                                </div>

                            </td>

                        </tr>

                    `;

                }
            )
            .join("");


    /*
    ==========================================
    ATTACH VIEW BUTTONS
    ==========================================
    */

    container
        .querySelectorAll(
            "[data-view-employee]"
        )
        .forEach(
            function(button) {

                button.addEventListener(
                    "click",
                    function() {

                        viewEmployee(
                            this.dataset.viewEmployee
                        );

                    }
                );

            }
        );


    /*
    ==========================================
    ATTACH ONBOARD BUTTONS
    ==========================================
    */

    container
        .querySelectorAll(
            "[data-onboard-employee]"
        )
        .forEach(
            function(button) {

                button.addEventListener(
                    "click",
                    function() {

                        openOnboardingSetup(
                            this.dataset.onboardEmployee
                        );

                    }
                );

            }
        );


    /*
    ==========================================
    ATTACH DELETE BUTTONS
    ==========================================
    */

    container
        .querySelectorAll(
            "[data-delete-employee]"
        )
        .forEach(
            function(button) {

                button.addEventListener(
                    "click",
                    async function() {

                        const employeeId =
                            this.dataset.deleteEmployee;


                        await deleteEmployee(
                            employeeId
                        );

                    }
                );

            }
        );

    container.querySelectorAll("[data-resend-credentials]").forEach(function(button) {
        button.addEventListener("click", async function() {
            const employee = employees.find(item => String(item.id) === String(this.dataset.resendCredentials));
            if (!employee || !companyProfile) return;
            if (!window.confirm("Send a new temporary password to " + employee.email + "?")) return;
            this.disabled = true;
            try {
                const { data: sessionData } = await supabaseClient.auth.getSession();
                if (!sessionData.session) throw new Error("Your company session has expired. Please log in again.");
                const response = await fetch(SUPABASE_URL + "/functions/v1/create-employee", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + sessionData.session.access_token },
                    body: JSON.stringify({ full_name: employee.full_name, email: employee.email, department_id: employee.department_id, company_id: companyProfile.id })
                });
                const result = await response.json().catch(() => ({}));
                if (!response.ok || !result.credentials_sent) throw new Error(result.message || result.error || "The credentials email could not be sent.");
                alert(result.message);
                await loadEmployees();
                updateDashboard();
            } catch (error) {
                alert(error.message || "Could not resend login credentials.");
            } finally {
                this.disabled = false;
            }
        });
    });

}


/*
==================================================
   RECENT EMPLOYEES
==================================================
*/

function renderRecentEmployees() {

    const container =
        document.getElementById(
            "recentEmployees"
        );


    if (!container) {

        return;

    }


    const recent =
        employees.slice(
            0,
            5
        );


    if (
        recent.length === 0
    ) {

        container.innerHTML = `

            <div class="empty-state">

                <div class="empty-icon">
                    ◎
                </div>

                <h4>
                    No employees yet
                </h4>

                <p>
                    Add your first employee
                    to get started.
                </p>

            </div>

        `;

        return;

    }


    container.innerHTML =
        recent
            .map(
                function(employee) {

                    const name =
                        employee.full_name ||
                        employee.name ||
                        "Employee";


                    const department =
                        employee.department_name ||
                        "No department";


                    const completed =
                        employee.questionnaire_completed ===
                        true;


                    const initial =
                        name
                            .charAt(0)
                            .toUpperCase();


                    return `

                        <div class="employee-row">

                            <div class="employee-avatar">

                                ${escapeHTML(
                                    initial
                                )}

                            </div>


                            <div class="employee-info">

                                <strong>
                                    ${escapeHTML(
                                        name
                                    )}
                                </strong>

                                <span>
                                    ${escapeHTML(
                                        department
                                    )}
                                </span>

                            </div>


                            <div class="employee-status">

                                ${
                                    completed
                                        ? "Complete"
                                        : "Pending"
                                }

                            </div>

                        </div>

                    `;

                }
            )
            .join("");

}


/*
==================================================
   VIEW EMPLOYEE
==================================================
*/

function viewEmployee(
    employeeId
) {
    openOnboardingSetup(employeeId);
}


/*
==================================================
   DELETE EMPLOYEE
==================================================
*/

async function deleteEmployee(
    employeeId
) {

    if (!companyProfile) {

        alert(
            "Company profile not found."
        );

        return;

    }


    /*
    ==========================================
    FIND EMPLOYEE
    ==========================================
    */

    const employee =
        employees.find(
            function(item) {

                return String(
                    item.id
                ) === String(
                    employeeId
                );

            }
        );


    if (!employee) {

        alert(
            "Employee could not be found."
        );

        return;

    }


    const employeeName =
        employee.full_name ||
        employee.name ||
        "this employee";


    /*
    ==========================================
    CONFIRM DELETE
    ==========================================
    */

    const confirmed =
        window.confirm(

            `Are you sure you want to delete ${employeeName}?\n\n` +

            "This will permanently remove the employee account."

        );


    if (!confirmed) {

        return;

    }


    try {

        /*
        ==========================================
        GET CURRENT SESSION
        ==========================================
        */

        const {
            data: sessionData,
            error: sessionError
        } =
            await supabaseClient
                .auth
                .getSession();


        if (sessionError) {

            throw sessionError;

        }


        if (
            !sessionData ||
            !sessionData.session
        ) {

            throw new Error(
                "Your company session has expired. Please log in again."
            );

        }


        const accessToken =
            sessionData
                .session
                .access_token;


        /*
        ==========================================
        CHECK SUPABASE URL
        ==========================================
        */

        if (
            typeof SUPABASE_URL ===
            "undefined"
        ) {

            throw new Error(
                "SUPABASE_URL is not configured."
            );

        }


        /*
        ==========================================
        CALL DELETE EMPLOYEE EDGE FUNCTION
        ==========================================
        */

        const response =
            await fetch(

                `${SUPABASE_URL}/functions/v1/delete-employee`,

                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${accessToken}`

                    },

                    body:
                        JSON.stringify({

                            employee_id:
                                employee.id

                        })

                }

            );


        /*
        ==========================================
        READ RESPONSE
        ==========================================
        */

        let result = {};


        try {

            result =
                await response.json();

        } catch (error) {

            console.warn(
                "Could not parse delete response.",
                error
            );

        }


        /*
        ==========================================
        HANDLE EDGE FUNCTION ERROR
        ==========================================
        */

        if (!response.ok) {

            throw new Error(

                result.error ||

                result.message ||

                `Could not delete employee. Server returned ${response.status}.`

            );

        }


        if (
            result.success !== true
        ) {

            throw new Error(

                result.error ||

                "Employee could not be deleted."

            );

        }


        /*
        ==========================================
        REMOVE FROM LOCAL STATE
        ==========================================
        */

        employees =
            employees.filter(
                function(item) {

                    return String(
                        item.id
                    ) !== String(
                        employee.id
                    );

                }
            );


        /*
        ==========================================
        RELOAD EMPLOYEES FROM DATABASE
        ==========================================
        */

        await loadEmployees();


        /*
        ==========================================
        UPDATE DASHBOARD
        ==========================================
        */

        updateDashboard();


        /*
        ==========================================
        IF VIEWING A DEPARTMENT
        ==========================================
        */

        if (
            selectedDepartmentId
        ) {

            const departmentEmployees =
                employees.filter(
                    function(item) {

                        return String(
                            item.department_id
                        ) === String(
                            selectedDepartmentId
                        );

                    }
                );


            renderEmployees(
                departmentEmployees
            );

        }


        /*
        ==========================================
        SUCCESS
        ==========================================
        */

        alert(
            "Employee deleted successfully."
        );


    } catch (error) {

        console.error(
            "EMPLOYEE DELETE ERROR:",
            error
        );


        alert(

            "Could not delete employee.\n\n" +

            (
                error.message ||
                "An unexpected error occurred."
            )

        );

    }

}


/*
==================================================
   UPDATE DASHBOARD
==================================================
*/

function updateDashboard() {

    const total =
        employees.length;


    const completed =
        employees.filter(
            function(employee) {

                return (
                    employee.questionnaire_completed ===
                    true
                );

            }
        )
        .length;


    const pending =
        total -
        completed;


    const completionRate =
        total > 0

            ? Math.round(
                (
                    completed /
                    total
                ) *
                100
            )

            : 0;


    /*
    ==========================================
    OVERVIEW STATS
    ==========================================
    */

    setText(
        "totalEmployees",
        total
    );


    setText(
        "completedEmployees",
        completed
    );


    setText(
        "pendingEmployees",
        pending
    );


    setText(
        "completionRate",
        `${completionRate}%`
    );


    /*
    ==========================================
    ANALYTICS
    ==========================================
    */

    setText(
        "analyticsTotal",
        total
    );


    setText(
        "analyticsCompleted",
        completed
    );


    setText(
        "analyticsPending",
        pending
    );


    setText(
        "analyticsRate",
        `${completionRate}%`
    );


    /*
    ==========================================
    ANALYTICS PROGRESS
    ==========================================
    */

    const progressBar =
        document.getElementById(
            "analyticsProgressBar"
        );


    if (progressBar) {

        progressBar.style.width =
            `${completionRate}%`;

    }


    setText(
        "analyticsProgressText",
        `${completionRate}%`
    );


    /*
    ==========================================
    COMPANY PROGRESS
    ==========================================
    */

    const companyProgressBar =
        document.getElementById(
            "companyProgressBar"
        );


    if (companyProgressBar) {

        companyProgressBar.style.width =
            "100%";

    }


    /*
    ==========================================
    RENDER EVERYTHING
    ==========================================
    */

    renderEmployees();

    renderRecentEmployees();

    renderAssessmentAlerts();

    renderDepartments();

    renderDepartmentSelect();

}


/*
==================================================
   LOGOUT
==================================================
*/

async function logout() {

    const {
        error
    } =
        await supabaseClient
            .auth
            .signOut();


    if (error) {

        console.error(
            "LOGOUT ERROR:",
            error
        );

        return;

    }


    window.location.href =
        "../auth/company-login.html";

}


const logoutButton =
    document.getElementById(
        "logoutButton"
    );


if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        logout
    );

}


const settingsLogoutButton =
    document.getElementById(
        "settingsLogoutButton"
    );


if (settingsLogoutButton) {

    settingsLogoutButton.addEventListener(
        "click",
        logout
    );

}


/*
==================================================
   HELPER: SET TEXT
==================================================
*/

function setText(
    elementId,
    value
) {

    const element =
        document.getElementById(
            elementId
        );


    if (element) {

        element.textContent =
            value;

    }

}


/*
==================================================
   HELPER: SET INPUT
==================================================
*/

function setInputValue(
    elementId,
    value
) {

    const element =
        document.getElementById(
            elementId
        );


    if (element) {

        element.value =
            value || "";

    }

}


/*
==================================================
   HELPER: GET INPUT
==================================================
*/

function getInputValue(
    elementId
) {

    const element =
        document.getElementById(
            elementId
        );


    if (!element) {

        return "";

    }


    return element.value.trim();

}


/*
==================================================
   HTML ESCAPE
==================================================
*/

function escapeHTML(
    value
) {

    return String(
        value ?? ""
    )

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}


/*
==================================================
   START DASHBOARD
==================================================
*/

/*
==================================================
   LOAD ONBOARDING PLANS MAP
   Load all onboarding plan statuses for this company's employees
==================================================
*/

/*
==================================================
   COMPANY KNOWLEDGE BASE
==================================================
*/

function setCompanyKnowledgeMessage(message, isError) {
    const messageEl = document.getElementById('knowledgeUploadMessage');
    if (!messageEl) return;

    messageEl.textContent = message || '';
    messageEl.style.color = isError ? 'var(--text-danger, #ef4444)' : 'var(--text-success, #2d6a4f)';
}

function formatKnowledgeFileSize(bytes) {
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

function getKnowledgeFileDetails(file) {
    const extension = file.name.split('.').pop().toLowerCase();
    const mimeTypes = {
        pdf: 'application/pdf',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        txt: 'text/plain',
        md: 'text/markdown',
        markdown: 'text/markdown',
        csv: 'text/csv',
        json: 'application/json'
    };

    return {
        extension,
        contentType: mimeTypes[extension] || file.type
    };
}

async function extractInitialKnowledgeText(file, extension) {
    const textFormats = ['txt', 'md', 'markdown', 'csv', 'json'];
    if (textFormats.includes(extension)) {
        return (await file.text()).slice(0, 200000);
    }

    if (extension === 'docx') {
        if (!window.mammoth) throw new Error('DOCX text extraction library is unavailable.');
        const result = await window.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
        return (result.value || '').slice(0, 200000);
    }

    if (extension === 'pdf') {
        if (!window.pdfjsLib) throw new Error('PDF text extraction library is unavailable.');
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        const pdf = await window.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
        const pages = [];
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
            const page = await pdf.getPage(pageNumber);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str || '').join(' ').trim();
            if (pageText) pages.push(`[Page ${pageNumber}]\n${pageText}`);
            if (pages.join('\n').length >= 200000) break;
        }
        return pages.join('\n\n').slice(0, 200000);
    }

    return '';
}

async function loadCompanyKnowledge() {
    if (!companyProfile?.id) return;

    try {
        const { data, error } = await supabaseClient
            .from('company_knowledge')
            .select('id, file_name, file_path, file_type, file_size, created_at, processing_status')
            .eq('company_id', companyProfile.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        companyKnowledgeDocuments = data || [];
        renderCompanyKnowledge();
    } catch (error) {
        console.error('COMPANY KNOWLEDGE LOAD ERROR:', error);
        setCompanyKnowledgeMessage('Could not load company knowledge.', true);
    }
}

function renderCompanyKnowledge() {
    const tableBody = document.getElementById('companyKnowledgeTableBody');
    const searchInput = document.getElementById('companyKnowledgeSearch');
    if (!tableBody) return;

    const query = searchInput?.value.trim().toLowerCase() || '';
    const documents = companyKnowledgeDocuments.filter(function(document) {
        return !query ||
            document.file_name.toLowerCase().includes(query) ||
            document.file_type.toLowerCase().includes(query);
    });

    if (!documents.length) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5">
                    <div class="table-empty">${query ? 'No documents match your search.' : 'No company knowledge uploaded yet.'}</div>
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = documents.map(function(document) {
        const uploadedAt = document.created_at ? new Date(document.created_at).toLocaleDateString() : '—';
        return `
            <tr>
                <td><strong>${escapeHTML(document.file_name)}</strong></td>
                <td>${escapeHTML(document.file_type || 'Document')}</td>
                <td>${formatKnowledgeFileSize(Number(document.file_size))}</td>
                <td>${uploadedAt}</td>
                <td>
                    <button type="button" class="secondary-button" data-open-knowledge="${document.id}">Open</button>
                    <button type="button" class="secondary-button" data-reprocess-knowledge="${document.id}">Reprocess</button>
                    <button type="button" class="secondary-button" data-delete-knowledge="${document.id}">Delete</button>
                </td>
            </tr>
        `;
    }).join('');

    tableBody.querySelectorAll('[data-open-knowledge]').forEach(function(button) {
        button.addEventListener('click', function() {
            openCompanyKnowledgeDocument(this.dataset.openKnowledge);
        });
    });

    tableBody.querySelectorAll('[data-reprocess-knowledge]').forEach(function(button) {
        button.addEventListener('click', function() {
            reprocessCompanyKnowledgeDocument(this.dataset.reprocessKnowledge, this);
        });
    });

    tableBody.querySelectorAll('[data-delete-knowledge]').forEach(function(button) {
        button.addEventListener('click', function() {
            deleteCompanyKnowledgeDocument(this.dataset.deleteKnowledge);
        });
    });
}

async function openCompanyKnowledgeDocument(documentId) {
    const document = companyKnowledgeDocuments.find(function(item) { return item.id === documentId; });
    if (!document) return;

    try {
        const { data, error } = await supabaseClient
            .storage
            .from(COMPANY_KNOWLEDGE_BUCKET)
            .createSignedUrl(document.file_path, 300);

        if (error) throw error;
        window.open(data.signedUrl, '_blank', 'noopener');
    } catch (error) {
        console.error('COMPANY KNOWLEDGE OPEN ERROR:', error);
        setCompanyKnowledgeMessage('Could not open this document.', true);
    }
}

async function reprocessCompanyKnowledgeDocument(documentId, button) {
    const document = companyKnowledgeDocuments.find(function(item) { return item.id === documentId; });
    if (!document) return;

    const extension = (document.file_name.split('.').pop() || document.file_type || '').toLowerCase();
    const originalLabel = button?.textContent;
    if (button) {
        button.disabled = true;
        button.textContent = 'Reprocessing...';
    }
    setCompanyKnowledgeMessage(`Preparing ${document.file_name} for Orion Mentor...`, false);

    try {
        const { data: fileBlob, error: downloadError } = await supabaseClient
            .storage
            .from(COMPANY_KNOWLEDGE_BUCKET)
            .download(document.file_path);
        if (downloadError || !fileBlob) throw downloadError || new Error('The stored document could not be downloaded.');

        const extractedText = await extractInitialKnowledgeText(fileBlob, extension);
        if (!extractedText.trim()) {
            throw new Error('No readable text was found. This PDF may be scanned or password-protected and needs OCR.');
        }

        const { error: updateError } = await supabaseClient
            .from('company_knowledge')
            .update({
                extracted_text: extractedText,
                processing_status: 'processed',
                processed_at: new Date().toISOString()
            })
            .eq('id', document.id);
        if (updateError) throw updateError;

        setCompanyKnowledgeMessage(`${document.file_name} is ready for Orion Mentor.`, false);
        await loadCompanyKnowledge();
    } catch (error) {
        console.error('COMPANY KNOWLEDGE REPROCESS ERROR:', error);
        setCompanyKnowledgeMessage(error.message || 'Could not reprocess this document.', true);
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = originalLabel || 'Reprocess';
        }
    }
}

async function uploadCompanyKnowledge(file) {
    if (!file || !companyProfile?.id || !companyUser?.id) return;

    const maxFileSize = 10 * 1024 * 1024;
    const { extension, contentType } = getKnowledgeFileDetails(file);
    const allowedExtensions = ['pdf', 'docx', 'txt', 'md', 'markdown', 'csv', 'json'];

    if (!allowedExtensions.includes(extension)) {
        setCompanyKnowledgeMessage('Unsupported file type. Upload PDF, DOCX, TXT, Markdown, CSV, or JSON.', true);
        return;
    }
    if (file.size > maxFileSize) {
        setCompanyKnowledgeMessage('Files must be 10 MB or smaller.', true);
        return;
    }
    if (!contentType) {
        setCompanyKnowledgeMessage('Could not determine the document file type.', true);
        return;
    }

    const uploadButton = document.getElementById('uploadKnowledgeButton');
    const originalButtonText = uploadButton?.textContent;
    if (uploadButton) {
        uploadButton.disabled = true;
        uploadButton.textContent = 'Uploading...';
    }
    setCompanyKnowledgeMessage('Uploading document...', false);

    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${companyProfile.id}/${crypto.randomUUID()}-${safeFileName}`;

    try {
        // Extraction must never prevent the original document from being saved.
        // An empty string is intentionally stored when a document is scanned,
        // password-protected, or otherwise has no readable text.
        let extractedText = '';
        try {
            extractedText = await extractInitialKnowledgeText(file, extension);
        } catch (extractionError) {
            console.error('COMPANY KNOWLEDGE TEXT EXTRACTION ERROR:', extractionError);
        }

        const { error: uploadError } = await supabaseClient
            .storage
            .from(COMPANY_KNOWLEDGE_BUCKET)
            .upload(filePath, file, { contentType, upsert: false });

        if (uploadError) throw uploadError;

        const { error: metadataError } = await supabaseClient
            .from('company_knowledge')
            .insert({
                company_id: companyProfile.id,
                uploaded_by: companyUser.id,
                file_name: file.name,
                file_path: filePath,
                file_type: extension.toUpperCase(),
                file_size: file.size,
                extracted_text: extractedText || '',
                processing_status: extractedText ? 'processed' : 'failed',
                processed_at: new Date().toISOString()
            });

        if (metadataError) {
            await supabaseClient.storage.from(COMPANY_KNOWLEDGE_BUCKET).remove([filePath]);
            throw metadataError;
        }

        setCompanyKnowledgeMessage(
            extractedText
                ? 'Document uploaded and prepared for Orion Mentor.'
                : 'Document uploaded, but no readable text was found. Scanned files need OCR before Orion Mentor can use them.',
            false
        );
        await loadCompanyKnowledge();
    } catch (error) {
        console.error('COMPANY KNOWLEDGE UPLOAD ERROR:', error);
        setCompanyKnowledgeMessage(error.message || 'Could not upload this document.', true);
    } finally {
        if (uploadButton) {
            uploadButton.disabled = false;
            uploadButton.textContent = originalButtonText || 'Upload Knowledge';
        }
    }
}

async function deleteCompanyKnowledgeDocument(documentId) {
    const document = companyKnowledgeDocuments.find(function(item) { return item.id === documentId; });
    if (!document || !confirm(`Delete "${document.file_name}"? This cannot be undone.`)) return;

    setCompanyKnowledgeMessage('Deleting document...', false);
    let storageDeleted = false;

    try {
        const { error: storageError } = await supabaseClient
            .storage
            .from(COMPANY_KNOWLEDGE_BUCKET)
            .remove([document.file_path]);

        if (storageError) throw storageError;
        storageDeleted = true;

        const { error: metadataError } = await supabaseClient
            .from('company_knowledge')
            .delete()
            .eq('id', document.id);

        if (metadataError) throw metadataError;

        setCompanyKnowledgeMessage('Document deleted.', false);
        await loadCompanyKnowledge();
    } catch (error) {
        console.error('COMPANY KNOWLEDGE DELETE ERROR:', error);
        setCompanyKnowledgeMessage(
            storageDeleted
                ? 'The file was removed, but its metadata could not be removed. Refresh and retry deleting the document.'
                : 'Could not delete this document.',
            true
        );
    }
}

function setupCompanyKnowledgeEvents() {
    const uploadButton = document.getElementById('uploadKnowledgeButton');
    const uploadInput = document.getElementById('knowledgeUploadInput');
    const searchInput = document.getElementById('companyKnowledgeSearch');

    if (uploadButton && uploadInput) {
        uploadButton.addEventListener('click', function() { uploadInput.click(); });
        uploadInput.addEventListener('change', async function() {
            const file = this.files?.[0];
            this.value = '';
            if (file) await uploadCompanyKnowledge(file);
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', renderCompanyKnowledge);
    }
}

let onboardingTasksMap = {};

async function loadOnboardingPlansMap() {

    if (!companyProfile) return;

    try {

        const { data, error } = await supabaseClient
            .from('onboarding_plans')
            .select('id, employee_id, status, approved_at, company_context, company_expectations, onboarding_goals, additional_instructions, role, experience_level, created_at, updated_at')
            .eq('company_id', companyProfile.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('ONBOARDING PLANS LOAD ERROR:', error);
            return;
        }

        onboardingPlansMap = {};
        const planIds = [];

        (data || []).forEach(function(plan) {
            const existingPlan = onboardingPlansMap[plan.employee_id];
            const planIsActive = plan.status === 'approved' || plan.status === 'completed';
            const existingPlanIsActive = existingPlan &&
                (existingPlan.status === 'approved' || existingPlan.status === 'completed');
            if (
                !existingPlan ||
                (planIsActive && !existingPlanIsActive)
            ) {
                onboardingPlansMap[plan.employee_id] = plan;
            }
            planIds.push(plan.id);
        });

        // Load tasks for these plans to calculate exact live progress and
        // surface assessment alerts.
        onboardingTasksMap = {};
        if (planIds.length > 0) {
            const fullSelect = 'id, onboarding_plan_id, status, title, instructions, step_phase, step_no, order_index, requires_assessment, assessment_attempts, assessment_completed, assessment_score, assessment_alert_dismissed, completed_at';
            let tasks = null;
            let tasksErr = null;
            const fullResult = await supabaseClient
                .from('onboarding_tasks')
                .select(fullSelect)
                .in('onboarding_plan_id', planIds)
                .order('order_index', { ascending: true });
            tasks = fullResult.data;
            tasksErr = fullResult.error;

            if (tasksErr) {
                // Fall back for databases that have not applied the assessment
                // alert migration yet.
                const basicResult = await supabaseClient
                    .from('onboarding_tasks')
                    .select('id, onboarding_plan_id, status, title, instructions, step_phase, step_no, order_index')
                    .in('onboarding_plan_id', planIds)
                    .order('order_index', { ascending: true });
                tasks = basicResult.data;
                tasksErr = basicResult.error;
            }

            if (!tasksErr && tasks) {
                tasks.forEach(function(t) {
                    if (!onboardingTasksMap[t.onboarding_plan_id]) {
                        onboardingTasksMap[t.onboarding_plan_id] = [];
                    }
                    onboardingTasksMap[t.onboarding_plan_id].push(t);
                });
            }
        }

    } catch (err) {
        console.error('ONBOARDING PLANS MAP ERROR:', err);
    }

}


/*
==================================================
   ASSESSMENT ALERTS
==================================================
*/

function getAssessmentAlerts() {
    const alerts = [];

    employees.forEach(function(employee) {
        const plan = onboardingPlansMap[employee.id];
        if (!plan) return;

        (onboardingTasksMap[plan.id] || []).forEach(function(task) {
            const attempts = Number(task.assessment_attempts || 0);
            if (
                attempts >= 3 &&
                task.assessment_completed !== true &&
                task.assessment_alert_dismissed !== true
            ) {
                alerts.push({
                    employee: employee,
                    task: task,
                    attempts: attempts
                });
            }
        });
    });

    return alerts.sort(function(a, b) {
        return b.attempts - a.attempts;
    });
}


function renderAssessmentAlerts() {
    const panel = document.getElementById('assessmentAlertsPanel');
    const list = document.getElementById('assessmentAlertsList');
    const count = document.getElementById('assessmentAlertCount');
    const dot = document.querySelector('#notificationButton .notification-dot');

    if (!panel || !list) return;

    const alerts = getAssessmentAlerts();

    if (alerts.length === 0) {
        panel.style.display = 'none';
        list.innerHTML = '';
        if (count) count.textContent = '0 alerts';
        if (dot) dot.style.display = 'none';
        return;
    }

    panel.style.display = '';
    if (count) {
        count.textContent = alerts.length + (alerts.length === 1 ? ' alert' : ' alerts');
    }
    if (dot) dot.style.display = '';

    list.innerHTML = alerts.map(function(alert) {
        const employee = alert.employee;
        const name = employee.full_name || employee.name || 'Employee';
        const department = employee.department_name || 'No department';
        const taskTitle = alert.task.title || 'Onboarding task';
        const score = alert.task.assessment_score != null
            ? ' (last score ' + escapeHTML(String(alert.task.assessment_score)) + '%)'
            : '';

        return `
            <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px; padding:14px; border:1px solid #F5D2C5; border-radius:12px; background:#FDF2E9;">
                <div style="display:flex; gap:12px; align-items:flex-start;">
                    <span style="width:32px; height:32px; border-radius:50%; background:#D96B43; color:#fff; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:800; flex-shrink:0;">${escapeHTML(name.charAt(0).toUpperCase())}</span>
                    <div>
                        <strong style="display:block; font-size:13px; color:#1C1B18;">${escapeHTML(name)} · ${escapeHTML(department)}</strong>
                        <p style="margin:4px 0 0; font-size:12px; color:#7C2D12; line-height:1.4;">Failed the test for <strong>${escapeHTML(taskTitle)}</strong> ${alert.attempts} times${score}.</p>
                    </div>
                </div>
                <button type="button" class="dismiss-assessment-alert" data-task-id="${escapeHTML(String(alert.task.id))}" aria-label="Dismiss assessment alert" title="Dismiss alert" style="background:none; border:none; color:#9A3412; cursor:pointer; font-size:18px; line-height:1; padding:2px 4px;">×</button>
            </div>
        `;
    }).join('');

    list.querySelectorAll('.dismiss-assessment-alert').forEach(function(button) {
        button.addEventListener('click', function() {
            dismissAssessmentAlert(button.dataset.taskId);
        });
    });
}


async function dismissAssessmentAlert(taskId) {
    const { error } = await supabaseClient
        .from('onboarding_tasks')
        .update({ assessment_alert_dismissed: true })
        .eq('id', taskId);

    if (error) {
        console.error('ASSESSMENT ALERT DISMISS ERROR:', error);
        return;
    }

    Object.keys(onboardingTasksMap).forEach(function(planId) {
        (onboardingTasksMap[planId] || []).forEach(function(task) {
            if (String(task.id) === String(taskId)) {
                task.assessment_alert_dismissed = true;
            }
        });
    });

    renderAssessmentAlerts();
}


/*
==================================================
   RENDER ONBOARDING TABLE (Onboarding section)
==================================================
*/

async function renderOnboardingTable() {

    await loadOnboardingPlansMap();

    const tbody = document.getElementById('onboardingTableBody');
    if (!tbody) return;

    if (employees.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5">
                    <div class="table-empty">No employees found. Add employees first.</div>
                </td>
            </tr>
        `;
        updateOnboardingStats();
        return;
    }

    tbody.innerHTML = employees.map(function(employee) {

        const name = employee.full_name || employee.name || 'Employee';
        const dept = employee.department_name || 'No department';
        const initial = name.charAt(0).toUpperCase();
        const plan = onboardingPlansMap[employee.id];
        const planStatus = plan ? plan.status : 'none';
        const planTasks = (plan && onboardingTasksMap[plan.id]) ? onboardingTasksMap[plan.id] : [];

        // Calculate exact live progress percentage for each employee from onboarding_tasks
        const totalTasks = planTasks.length;
        const completedTasks = planTasks.filter(t => t.status === 'completed' || t.status === 'complete').length;
        
        let progressPct = 0;
        let milestoneText = "No tasks assigned";
        let progressColor = "#D96B43";

        if (totalTasks > 0) {
            progressPct = Math.round((completedTasks / totalTasks) * 100);
            milestoneText = `${completedTasks}/${totalTasks} tasks complete`;
            if (progressPct === 100) progressColor = "#3B7A57";
            else if (progressPct >= 50) progressColor = "#3B7A57";
            else if (progressPct >= 20) progressColor = "#d97706";
        } else if (planStatus === 'approved') {
            progressPct = 0;
            milestoneText = "0 tasks complete";
        }

        const statusLabel = {
            approved: progressPct === 100 ? 'Completed' : 'In Progress',
            generated: 'Reviewing',
            draft: 'Draft Plan',
            completed: 'Completed',
            none: 'Not Started'
        }[planStatus] || 'Not Started';

        const statusClass = {
            approved: 'badge-approved',
            generated: 'badge-generated',
            draft: 'badge-draft',
            completed: 'badge-approved',
            none: 'badge-none'
        }[planStatus] || 'badge-none';

        const btnLabel = planStatus === 'approved' || planStatus === 'completed'
            ? '✓ View Roadmap'
            : planStatus === 'generated'
            ? '↻ Review Roadmap'
            : planStatus === 'draft'
            ? '… Setup Plan'
            : 'Onboard Employee';

        return `
            <tr>
                <td>
                    <div class="employee-table-cell">
                        <div class="employee-avatar">${escapeHTML(initial)}</div>
                        <div class="employee-info">
                            <strong>${escapeHTML(name)}</strong>
                            <small style="display:block; color:#78756C; font-size:11px;">${escapeHTML(employee.role || 'Team Member')}</small>
                        </div>
                    </div>
                </td>
                <td>${escapeHTML(dept)}</td>
                <td style="min-width:200px;">
                    <div style="display:flex; flex-direction:column; gap:4px;">
                        <div style="display:flex; justify-content:space-between; font-size:11px; color:#54524B;">
                            <span>${milestoneText}</span>
                            <strong>${progressPct}%</strong>
                        </div>
                        <div style="height:8px; background:#E8E5DC; border-radius:6px; overflow:hidden;">
                            <div style="width:${progressPct}%; background:${progressColor}; height:100%; border-radius:6px; transition:width 0.4s ease;"></div>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="status-badge ${statusClass}">${statusLabel}</span>
                </td>
                <td>
                    <button
                        type="button"
                        class="primary-button onboard-ob-btn"
                        data-onboard-ob="${escapeHTML(employee.id)}"
                        style="font-size:0.8rem;padding:6px 14px;"
                    >${escapeHTML(btnLabel)}</button>
                </td>
            </tr>
        `;

    }).join('');

    // Attach button events
    tbody.querySelectorAll('[data-onboard-ob]').forEach(function(btn) {
        btn.addEventListener('click', function() {
            openOnboardingSetup(this.dataset.onboardOb);
        });
    });

    updateOnboardingStats();

}


function updateOnboardingStats() {

    const totalEmployees = employees.length;
    const activeOnboardings = Object.values(onboardingPlansMap).filter(function(p) {
        return p.status === 'approved' || p.status === 'generated' || p.status === 'draft';
    }).length;
    const completedPlans = Object.values(onboardingPlansMap).filter(function(p) {
        return p.status === 'completed';
    }).length;

    let totalPct = 0;
    employees.forEach(function(e) {
        const plan = onboardingPlansMap[e.id];
        if (plan) {
            if (plan.status === 'completed') totalPct += 100;
            else if (plan.status === 'approved') totalPct += 75;
            else if (plan.status === 'generated') totalPct += 40;
            else if (plan.status === 'draft') totalPct += 20;
        }
    });

    const companyAvg = totalEmployees > 0 ? Math.round(totalPct / totalEmployees) : 0;

    setText('onboardingTotalEmp', totalEmployees);
    setText('onboardingActiveEmp', activeOnboardings);
    setText('onboardingCompletedEmp', completedPlans);
    setText('onboardingCompanyRate', `${companyAvg}%`);

}


/*
==================================================
   OPEN ONBOARDING SETUP
==================================================
*/

function openOnboardingSetup(employeeId) {

    const employee = employees.find(function(e) {
        return String(e.id) === String(employeeId);
    });

    if (!employee) {
        alert('Employee not found.');
        return;
    }

    currentOnboardingEmployeeId = employeeId;
    currentOnboardingEmployee = employee;

    // Reset state
    onboardingExpectations = [];
    onboardingGoals = [];
    generatedTasks = [];

    // Populate employee info card
    const name = employee.full_name || employee.name || 'Employee';
    const role = employee.role || 'Role not specified';
    const exp = employee.experience_level || '—';
    const skills = Array.isArray(employee.technical_skills) ? employee.technical_skills : [];

    setText('obEmployeeName', name);
    setText('obEmployeeRole', role);
    setText('obEmployeeExp', 'Experience: ' + exp);

    const avatarEl = document.getElementById('obEmployeeAvatar');
    if (avatarEl) avatarEl.textContent = name.charAt(0).toUpperCase();

    const skillsEl = document.getElementById('obEmployeeSkills');
    if (skillsEl) {
        if (skills.length > 0) {
            skillsEl.innerHTML = skills.slice(0, 5).map(function(s) {
                return '<span class="ob-skill-tag">' + escapeHTML(s) + '</span>';
            }).join('');
        } else {
            skillsEl.innerHTML = '';
        }
    }

    // Check if there is an existing plan and pre-fill
    const existingPlan = onboardingPlansMap[employeeId];
    if (existingPlan) {
        // Pre-fill if this plan has data
        const ctx = document.getElementById('obCompanyContext');
        if (ctx) ctx.value = existingPlan.company_context || '';
        const addl = document.getElementById('obAdditionalInstructions');
        if (addl) addl.value = existingPlan.additional_instructions || '';

        if (Array.isArray(existingPlan.company_expectations)) {
            onboardingExpectations = [...existingPlan.company_expectations];
        }
        if (Array.isArray(existingPlan.onboarding_goals)) {
            onboardingGoals = [...existingPlan.onboarding_goals];
        }
    } else {
        const ctx = document.getElementById('obCompanyContext');
        if (ctx) ctx.value = '';
        const addl = document.getElementById('obAdditionalInstructions');
        if (addl) addl.value = '';
    }

    // If no plan-specific goals exist yet, start from the employee's own
    // questionnaire answers so the company can tailor the roadmap around them.
    if (
        onboardingGoals.length === 0 &&
        Array.isArray(employee.onboarding_goals)
    ) {
        onboardingGoals = employee.onboarding_goals.filter(function(goal) {
            return typeof goal === 'string' && goal.trim();
        });
    }

    renderExpectations();
    renderGoals();

    // Clear messages
    setText('generateMessage', '');

    // Approved roadmaps open in the live progress editor instead of asking
    // the company to generate a brand-new roadmap again.
    if (
        existingPlan &&
        (existingPlan.status === 'approved' || existingPlan.status === 'completed') &&
        (onboardingTasksMap[existingPlan.id] || []).length > 0
    ) {
        openRoadmapProgress(employeeId);
        return;
    }

    // Show step 1
    showOnboardingStep('step1');

    // Open modal
    const modal = document.getElementById('onboardingSetupModal');
    if (modal) modal.classList.add('active');

}


/*
==================================================
   ONBOARDING STEP NAVIGATION
==================================================
*/

function showOnboardingStep(stepId) {

    ['onboardingStep1', 'onboardingStep2', 'onboardingStep3', 'onboardingStep4'].forEach(function(id) {
        const el = document.getElementById(id);
        if (el) el.classList.remove('active');
    });

    const map = {
        step1: 'onboardingStep1',
        step2: 'onboardingStep2',
        step3: 'onboardingStep3',
        step4: 'onboardingStep4'
    };

    const target = document.getElementById(map[stepId]);
    if (target) target.classList.add('active');

}


function closeOnboardingModal() {

    const modal = document.getElementById('onboardingSetupModal');
    if (modal) modal.classList.remove('active');

    currentOnboardingEmployeeId = null;
    currentOnboardingEmployee = null;
    generatedTasks = [];
    onboardingExpectations = [];
    onboardingGoals = [];

}


/*
==================================================
   ROADMAP PROGRESS VIEW (approved plans)
==================================================
*/

function openRoadmapProgress(employeeId) {

    const employee = employees.find(function(e) {
        return String(e.id) === String(employeeId);
    });
    const plan = onboardingPlansMap[employeeId];

    if (!employee || !plan) {
        alert('The onboarding roadmap could not be loaded.');
        return;
    }

    currentOnboardingEmployeeId = employeeId;
    currentOnboardingEmployee = employee;

    const planTasks = (onboardingTasksMap[plan.id] || []).slice().sort(function(a, b) {
        return Number(a.order_index || 0) - Number(b.order_index || 0);
    });

    generatedTasks = planTasks.map(function(task, idx) {
        return {
            id: task.id,
            title: task.title || ('Task ' + (idx + 1)),
            instructions: task.instructions || '',
            step_phase: task.step_phase || 'General',
            step_no: task.step_no || (idx + 1),
            order_index: task.order_index || (idx + 1),
            status: task.status || 'pending',
            completed_at: task.completed_at || null,
            requires_assessment: !!task.requires_assessment,
            assessment_completed: !!task.assessment_completed,
            assessment_score: task.assessment_score,
            assessment_attempts: task.assessment_attempts || 0
        };
    });

    const name = employee.full_name || employee.name || 'Employee';
    setText('roadmapProgressTitle', 'Onboarding Roadmap — ' + name);
    setText(
        'roadmapProgressSubtitle',
        'Track this employee\'s live progress, update task details, and keep the roadmap aligned with their role.'
    );
    setText('progressMessage', '');

    renderRoadmapProgress();

    showOnboardingStep('step4');

    const modal = document.getElementById('onboardingSetupModal');
    if (modal) modal.classList.add('active');

}

function renderRoadmapProgress() {

    const container = document.getElementById('roadmapProgressTaskList');
    if (!container) return;

    const totalTasks = generatedTasks.length;
    const completedTasks = generatedTasks.filter(function(task) {
        return task.status === 'completed' || task.status === 'complete';
    }).length;
    const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    setText('roadmapProgressPct', progressPct + '%');
    setText('roadmapProgressMeta', completedTasks + ' of ' + totalTasks + ' tasks complete');

    const progressBar = document.getElementById('roadmapProgressBar');
    if (progressBar) {
        progressBar.style.width = progressPct + '%';
        progressBar.style.background = progressPct >= 50 ? '#3B7A57' : '#d97706';
    }

    if (totalTasks === 0) {
        container.innerHTML = '<div class="ob-empty-tasks">No tasks in this roadmap yet.</div>';
        return;
    }

    const statusMeta = {
        pending: { label: 'Pending', className: 'status-pending' },
        in_progress: { label: 'In progress', className: 'status-in-progress' },
        completed: { label: 'Completed', className: 'status-completed' },
        complete: { label: 'Completed', className: 'status-completed' }
    };

    container.innerHTML = generatedTasks.map(function(task, idx) {
        const meta = statusMeta[task.status] || statusMeta.pending;
        const statusValue = task.status === 'complete' ? 'completed' : task.status;

        return `
            <div class="ob-task-card ob-progress-task-card" data-progress-task-idx="${idx}">

                <div class="ob-task-card-header">

                    <div class="ob-task-step-no">${idx + 1}</div>

                    <div class="ob-task-card-inputs">

                        <input
                            type="text"
                            class="ob-task-title-input"
                            value="${escapeHTML(task.title)}"
                            placeholder="Task title..."
                            data-progress-field="title"
                            data-progress-idx="${idx}"
                        >

                        <input
                            type="text"
                            class="ob-task-phase-input"
                            value="${escapeHTML(task.step_phase)}"
                            placeholder="Phase..."
                            data-progress-field="step_phase"
                            data-progress-idx="${idx}"
                        >

                    </div>

                    <div class="ob-task-card-controls">

                        <select
                            class="ob-progress-status-select ${meta.className}"
                            data-progress-field="status"
                            data-progress-idx="${idx}"
                            title="Task status"
                        >
                            <option value="pending" ${statusValue === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="in_progress" ${statusValue === 'in_progress' ? 'selected' : ''}>In progress</option>
                            <option value="completed" ${statusValue === 'completed' ? 'selected' : ''}>Completed</option>
                        </select>

                    </div>

                </div>

                <textarea
                    class="ob-task-instructions-input"
                    rows="2"
                    placeholder="Step instructions..."
                    data-progress-field="instructions"
                    data-progress-idx="${idx}"
                >${escapeHTML(task.instructions)}</textarea>

                <label class="ob-assessment-toggle">
                    <input type="checkbox" data-progress-assessment="${idx}" ${task.requires_assessment ? 'checked' : ''}>
                    <span>Test employee before marking this task complete</span>
                </label>

                <div class="ob-progress-task-footer">

                    <span class="ob-task-status-badge ${meta.className}">${meta.label}</span>

                    ${task.assessment_completed ? `
                        <span class="ob-task-status-badge status-completed">Test passed${task.assessment_score != null ? ' · ' + escapeHTML(String(task.assessment_score)) + '%' : ''}</span>
                    ` : Number(task.assessment_attempts || 0) > 0 ? `
                        <span class="ob-task-status-badge status-in-progress">${Number(task.assessment_attempts)} failed test${Number(task.assessment_attempts) === 1 ? '' : 's'}</span>
                    ` : ''}

                    <div class="ob-progress-task-controls">
                        <button type="button" class="ob-task-ctrl-btn" data-progress-move-up="${idx}" title="Move up" ${idx === 0 ? 'disabled' : ''}>↑</button>
                        <button type="button" class="ob-task-ctrl-btn" data-progress-move-down="${idx}" title="Move down" ${idx === generatedTasks.length - 1 ? 'disabled' : ''}>↓</button>
                        <button type="button" class="ob-task-ctrl-btn ob-task-delete-btn" data-progress-delete="${idx}" title="Delete task">×</button>
                    </div>

                </div>

            </div>
        `;
    }).join('');

    container.querySelectorAll('[data-progress-field]').forEach(function(input) {
        const eventName = input.tagName === 'SELECT' ? 'change' : 'input';
        input.addEventListener(eventName, function() {
            const idx = parseInt(this.dataset.progressIdx);
            if (generatedTasks[idx] === undefined) return;
            generatedTasks[idx][this.dataset.progressField] = this.value;
            if (this.dataset.progressField === 'status') {
                renderRoadmapProgress();
            }
        });
    });

    container.querySelectorAll('[data-progress-assessment]').forEach(function(input) {
        input.addEventListener('change', function() {
            const idx = parseInt(this.dataset.progressAssessment);
            if (generatedTasks[idx] !== undefined) {
                generatedTasks[idx].requires_assessment = this.checked;
            }
        });
    });

    container.querySelectorAll('[data-progress-move-up]').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const idx = parseInt(this.dataset.progressMoveUp);
            if (idx > 0) {
                const temp = generatedTasks[idx];
                generatedTasks[idx] = generatedTasks[idx - 1];
                generatedTasks[idx - 1] = temp;
                renumberProgressTasks();
                renderRoadmapProgress();
            }
        });
    });

    container.querySelectorAll('[data-progress-move-down]').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const idx = parseInt(this.dataset.progressMoveDown);
            if (idx < generatedTasks.length - 1) {
                const temp = generatedTasks[idx];
                generatedTasks[idx] = generatedTasks[idx + 1];
                generatedTasks[idx + 1] = temp;
                renumberProgressTasks();
                renderRoadmapProgress();
            }
        });
    });

    container.querySelectorAll('[data-progress-delete]').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const idx = parseInt(this.dataset.progressDelete);
            if (confirm('Remove this task from the roadmap?')) {
                generatedTasks.splice(idx, 1);
                renumberProgressTasks();
                renderRoadmapProgress();
            }
        });
    });

}

function renumberProgressTasks() {
    generatedTasks.forEach(function(task, idx) {
        task.step_no = idx + 1;
        task.order_index = idx + 1;
    });
}

async function saveRoadmapProgress() {

    if (!currentOnboardingEmployee) {
        alert('No employee selected.');
        return;
    }

    const plan = onboardingPlansMap[currentOnboardingEmployee.id];
    if (!plan) {
        alert('The onboarding plan could not be loaded.');
        return;
    }

    const btn = document.getElementById('saveRoadmapProgressBtn');
    const msgEl = document.getElementById('progressMessage');

    // Read the latest values from the editable cards.
    document.querySelectorAll('[data-progress-task-idx]').forEach(function(card) {
        const idx = parseInt(card.dataset.progressTaskIdx);
        if (generatedTasks[idx] === undefined) return;
        card.querySelectorAll('[data-progress-field]').forEach(function(input) {
            generatedTasks[idx][input.dataset.progressField] = input.value;
        });
    });

    if (generatedTasks.length === 0) {
        if (msgEl) {
            msgEl.textContent = 'The roadmap needs at least one task.';
            msgEl.style.color = 'var(--text-danger, #ef4444)';
        }
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Saving...';
    }
    if (msgEl) {
        msgEl.textContent = '';
        msgEl.style.color = '';
    }

    try {

        const originalIds = (onboardingTasksMap[plan.id] || [])
            .map(function(task) { return task.id; })
            .filter(Boolean);
        const keptIds = new Set(
            generatedTasks
                .filter(function(task) { return task.id; })
                .map(function(task) { return task.id; })
        );
        const removedIds = originalIds.filter(function(id) { return !keptIds.has(id); });

        // Move surviving tasks out of the way first so the unique
        // (plan_id, order_index) constraint is never violated while reordering.
        for (let idx = 0; idx < generatedTasks.length; idx++) {
            const task = generatedTasks[idx];
            if (!task.id) continue;
            const { error } = await supabaseClient
                .from('onboarding_tasks')
                .update({ order_index: 5000 + idx })
                .eq('id', task.id);
            if (error) throw error;
        }

        for (let idx = 0; idx < generatedTasks.length; idx++) {
            const task = generatedTasks[idx];
            const status = ['pending', 'in_progress', 'completed'].includes(task.status)
                ? task.status
                : 'pending';
            const completedAt = status === 'completed'
                ? (task.completed_at || new Date().toISOString())
                : null;
            const payload = {
                step_no: idx + 1,
                order_index: idx + 1,
                title: (task.title || '').trim() || ('Task ' + (idx + 1)),
                instructions: task.instructions || '',
                step_phase: (task.step_phase || 'General').trim() || 'General',
                requires_assessment: !!task.requires_assessment
            };

            if (task.id) {
                const { error } = await supabaseClient
                    .from('onboarding_tasks')
                    .update({
                        ...payload,
                        status: status,
                        completed_at: completedAt
                    })
                    .eq('id', task.id);
                if (error) throw error;
            } else {
                const { error } = await supabaseClient
                    .from('onboarding_tasks')
                    .insert({
                        ...payload,
                        onboarding_plan_id: plan.id,
                        status: status,
                        completed_at: completedAt,
                        created_at: new Date().toISOString()
                    });
                if (error) throw error;
            }
        }

        if (removedIds.length > 0) {
            const { error } = await supabaseClient
                .from('onboarding_tasks')
                .delete()
                .in('id', removedIds);
            if (error) throw error;
        }

        await loadOnboardingPlansMap();
        renderEmployees(employees);
        renderOnboardingTable();
        openRoadmapProgress(currentOnboardingEmployee.id);

        const nextMsg = document.getElementById('progressMessage');
        if (nextMsg) {
            nextMsg.textContent = 'Roadmap changes saved. The employee will see the updated tasks.';
            nextMsg.style.color = 'var(--text-success, #059669)';
        }

    } catch (err) {

        console.error('SAVE ROADMAP PROGRESS ERROR:', err);
        if (msgEl) {
            msgEl.textContent = 'Could not save roadmap changes: ' + (err.message || 'Unknown error.');
            msgEl.style.color = 'var(--text-danger, #ef4444)';
        }

    } finally {

        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Save changes';
        }

    }

}


/*
==================================================
   RENDER EXPECTATIONS & GOALS (Tag list)
==================================================
*/

function renderExpectations() {

    const list = document.getElementById('expectationsList');
    if (!list) return;

    if (onboardingExpectations.length === 0) {
        list.innerHTML = '<p class="ob-empty-tags">No expectations added yet.</p>';
        return;
    }

    list.innerHTML = onboardingExpectations.map(function(exp, idx) {
        return `
            <div class="ob-tag-item">
                <span class="ob-tag-bullet">◈</span>
                <input
                    type="text"
                    class="ob-tag-edit"
                    value="${escapeHTML(exp)}"
                    data-exp-idx="${idx}"
                >
                <button type="button" class="ob-tag-remove" data-remove-exp="${idx}">×</button>
            </div>
        `;
    }).join('');

    list.querySelectorAll('[data-exp-idx]').forEach(function(input) {
        input.addEventListener('input', function() {
            onboardingExpectations[parseInt(this.dataset.expIdx)] = this.value;
        });
    });

    list.querySelectorAll('[data-remove-exp]').forEach(function(btn) {
        btn.addEventListener('click', function() {
            onboardingExpectations.splice(parseInt(this.dataset.removeExp), 1);
            renderExpectations();
        });
    });

}


function renderGoals() {

    const list = document.getElementById('goalsList');
    if (!list) return;

    if (onboardingGoals.length === 0) {
        list.innerHTML = '<p class="ob-empty-tags">No goals added yet.</p>';
        return;
    }

    list.innerHTML = onboardingGoals.map(function(goal, idx) {
        return `
            <div class="ob-tag-item">
                <span class="ob-tag-bullet">◈</span>
                <input
                    type="text"
                    class="ob-tag-edit"
                    value="${escapeHTML(goal)}"
                    data-goal-idx="${idx}"
                >
                <button type="button" class="ob-tag-remove" data-remove-goal="${idx}">×</button>
            </div>
        `;
    }).join('');

    list.querySelectorAll('[data-goal-idx]').forEach(function(input) {
        input.addEventListener('input', function() {
            onboardingGoals[parseInt(this.dataset.goalIdx)] = this.value;
        });
    });

    list.querySelectorAll('[data-remove-goal]').forEach(function(btn) {
        btn.addEventListener('click', function() {
            onboardingGoals.splice(parseInt(this.dataset.removeGoal), 1);
            renderGoals();
        });
    });

}


/*
==================================================
   GENERATE ROADMAP (Call Flask Backend)
==================================================
*/

async function generateRoadmap() {

    const employee = currentOnboardingEmployee;
    if (!employee) {
        alert('No employee selected.');
        return;
    }

    const companyContext = document.getElementById('obCompanyContext')?.value.trim() || '';

    const expectations = onboardingExpectations.filter(function(e) { return e.trim(); });

    // The employee's own questionnaire answers are part of the roadmap brief.
    // Merge them with the company's goals without duplicating entries.
    const employeeGoals = Array.isArray(employee.onboarding_goals)
        ? employee.onboarding_goals.filter(function(goal) {
            return typeof goal === 'string' && goal.trim();
        })
        : [];
    const goals = [];
    const seenGoals = new Set();
    onboardingGoals.concat(employeeGoals).forEach(function(goal) {
        const value = String(goal || '').trim();
        const key = value.toLowerCase();
        if (!value || seenGoals.has(key)) return;
        seenGoals.add(key);
        goals.push(value);
    });

    const employeeNotes = String(employee.additional_info || '').trim();
    const companyNotes = document.getElementById('obAdditionalInstructions')?.value.trim() || '';
    const additionalInstructions = [
        companyNotes ? 'Company notes: ' + companyNotes : '',
        employeeNotes ? 'Employee questionnaire notes: ' + employeeNotes : ''
    ].filter(Boolean).join('\n');

    const msgEl = document.getElementById('generateMessage');
    const btn = document.getElementById('generateRoadmapBtn');
    const btnText = document.getElementById('generateBtnText');
    const btnIcon = document.getElementById('generateBtnIcon');

    // Validate
    if (!companyContext && expectations.length === 0 && goals.length === 0 && !additionalInstructions) {
        if (msgEl) msgEl.textContent = 'Please add at least some company context, expectations, or goals before generating.';
        return;
    }

    // Loading state
    if (btn) btn.disabled = true;
    if (btnText) btnText.textContent = 'Generating roadmap...';
    if (btnIcon) btnIcon.textContent = '◷';
    if (msgEl) msgEl.textContent = '';

    const skills = Array.isArray(employee.technical_skills) ? employee.technical_skills : [];

    const payload = {
        employee_id: employee.id,
        company_id: companyProfile.id,
        employee: {
            name: employee.full_name || employee.name || 'Employee',
            role: employee.role || '',
            experience_level: employee.experience_level || '',
            technical_skills: skills,
            onboarding_goals: employeeGoals,
            additional_info: employeeNotes,
            questionnaire_completed: !!employee.questionnaire_completed
        },
        company_context: companyContext,
        company_expectations: expectations,
        onboarding_goals: goals,
        additional_instructions: additionalInstructions
    };

    try {

        const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();
        if (sessionError) throw sessionError;
        if (!sessionData?.session) {
            throw new Error('Your company session has expired. Please log in again.');
        }

        const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-onboarding-roadmap`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionData.session.access_token}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errData = await response.json().catch(function() { return {}; });
            throw new Error(
                [errData.error, errData.openRouterError]
                    .filter(Boolean)
                    .join(' ') ||
                'AI server returned ' + response.status
            );
        }

        const result = await response.json();

        if (!result.tasks || result.tasks.length === 0) {
            throw new Error('AI returned an empty roadmap. Please try again.');
        }

        generatedTasks = result.tasks.map(function(t, idx) {
            return {
                step_no: idx + 1,
                title: t.title || ('Task ' + (idx + 1)),
                instructions: t.instructions || '',
                step_phase: t.step_phase || 'General',
                order_index: idx + 1,
                status: 'pending'
            };
        });

        // Show source badge
        const badge = document.getElementById('reviewerSourceBadge');
        if (badge) {
            if (result.source === 'orion-fallback-engine') {
                badge.textContent = '⚡ Orion Fallback Engine';
                badge.className = 'ob-reviewer-source badge-fallback';
                badge.title = result.generation_warning || 'OpenRouter was unavailable. Tasks were generated by the Orion Fallback Engine.';
            } else {
                badge.textContent = '✦ Generated by Orion AI';
                badge.className = 'ob-reviewer-source badge-ai';
                badge.title = 'Tasks were generated securely by OpenRouter through Supabase.';
            }
        }

        if (result.generation_warning && msgEl) {
            msgEl.textContent = 'OpenRouter was unavailable, so Orion used its existing fallback roadmap. ' + result.generation_warning;
            msgEl.style.color = 'var(--text-warning, #a16207)';
        }

        const reviewerTitle = document.getElementById('reviewerTitle');
        if (reviewerTitle) {
            reviewerTitle.textContent = 'Onboarding Roadmap — ' + (employee.full_name || employee.name || 'Employee');
        }

        // Update subtitle with task count
        const sub = document.getElementById('reviewerSubtitle');
        if (sub) {
            sub.textContent = generatedTasks.length + ' tasks generated. Review, edit, reorder, and approve.';
        }

        renderRoadmapReviewer();

        showOnboardingStep('step2');

    } catch (err) {

        console.error('GENERATE ROADMAP ERROR:', err);
        if (msgEl) {
            msgEl.textContent = 'Could not generate the roadmap. ' + (err.message || '');
            msgEl.style.color = 'var(--text-danger, #ef4444)';
        }

    } finally {

        if (btn) btn.disabled = false;
        if (btnText) btnText.textContent = 'Generate Roadmap with Orion AI';
        if (btnIcon) btnIcon.textContent = '✦';

    }

}


/*
==================================================
   RENDER ROADMAP REVIEWER (Interactive task list)
==================================================
*/

function renderRoadmapReviewer() {

    const container = document.getElementById('roadmapTaskList');
    if (!container) return;

    if (generatedTasks.length === 0) {
        container.innerHTML = '<div class="ob-empty-tasks">No tasks yet. Generate a roadmap or add a custom task.</div>';
        return;
    }

    container.innerHTML = generatedTasks.map(function(task, idx) {
        return `
            <div class="ob-task-card" data-task-idx="${idx}">

                <div class="ob-task-card-header">

                    <div class="ob-task-step-no">${idx + 1}</div>

                    <div class="ob-task-card-inputs">

                        <input
                            type="text"
                            class="ob-task-title-input"
                            value="${escapeHTML(task.title)}"
                            placeholder="Task title..."
                            data-task-field="title"
                            data-task-idx="${idx}"
                        >

                        <input
                            type="text"
                            class="ob-task-phase-input"
                            value="${escapeHTML(task.step_phase)}"
                            placeholder="Phase..."
                            data-task-field="step_phase"
                            data-task-idx="${idx}"
                        >

                    </div>

                    <div class="ob-task-card-controls">

                        <button type="button" class="ob-task-ctrl-btn" data-move-up="${idx}" title="Move up" ${idx === 0 ? 'disabled' : ''}>↑</button>
                        <button type="button" class="ob-task-ctrl-btn" data-move-down="${idx}" title="Move down" ${idx === generatedTasks.length - 1 ? 'disabled' : ''}>↓</button>
                        <button type="button" class="ob-task-ctrl-btn ob-task-delete-btn" data-delete-task="${idx}" title="Delete task">×</button>

                    </div>

                </div>

                <textarea
                    class="ob-task-instructions-input"
                    rows="2"
                    placeholder="Step instructions..."
                    data-task-field="instructions"
                    data-task-idx="${idx}"
                >${escapeHTML(task.instructions)}</textarea>

                <label class="ob-assessment-toggle">
                    <input type="checkbox" data-task-assessment="${idx}" ${task.requires_assessment ? 'checked' : ''}>
                    <span>Test employee before marking this task complete</span>
                </label>

            </div>
        `;
    }).join('');

    // Attach field update events
    container.querySelectorAll('[data-task-field]').forEach(function(input) {
        input.addEventListener('input', function() {
            const idx = parseInt(this.dataset.taskIdx);
            const field = this.dataset.taskField;
            if (generatedTasks[idx] !== undefined) {
                generatedTasks[idx][field] = this.value;
            }
        });
    });

    container.querySelectorAll('[data-task-assessment]').forEach(function(input) {
        input.addEventListener('change', function() {
            const idx = parseInt(this.dataset.taskAssessment);
            if (generatedTasks[idx] !== undefined) generatedTasks[idx].requires_assessment = this.checked;
        });
    });

    // Move up
    container.querySelectorAll('[data-move-up]').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const idx = parseInt(this.dataset.moveUp);
            if (idx > 0) {
                const temp = generatedTasks[idx];
                generatedTasks[idx] = generatedTasks[idx - 1];
                generatedTasks[idx - 1] = temp;
                renumberTasks();
                renderRoadmapReviewer();
            }
        });
    });

    // Move down
    container.querySelectorAll('[data-move-down]').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const idx = parseInt(this.dataset.moveDown);
            if (idx < generatedTasks.length - 1) {
                const temp = generatedTasks[idx];
                generatedTasks[idx] = generatedTasks[idx + 1];
                generatedTasks[idx + 1] = temp;
                renumberTasks();
                renderRoadmapReviewer();
            }
        });
    });

    // Delete
    container.querySelectorAll('[data-delete-task]').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const idx = parseInt(this.dataset.deleteTask);
            if (confirm('Remove this task from the roadmap?')) {
                generatedTasks.splice(idx, 1);
                renumberTasks();
                renderRoadmapReviewer();
            }
        });
    });

}


function renumberTasks() {
    generatedTasks.forEach(function(task, idx) {
        task.step_no = idx + 1;
        task.order_index = idx + 1;
    });
}


/*
==================================================
   APPROVE ROADMAP — SAVE TO SUPABASE
==================================================
*/

async function approveRoadmap() {

    if (!currentOnboardingEmployee || !companyProfile) {
        alert('Missing employee or company information.');
        return;
    }

    if (generatedTasks.length === 0) {
        const msgEl = document.getElementById('approvalMessage');
        if (msgEl) {
            msgEl.textContent = 'Please add at least one task before approving.';
            msgEl.style.color = 'var(--text-danger, #ef4444)';
        }
        return;
    }

    const btn = document.getElementById('approveRoadmapBtn');
    const msgEl = document.getElementById('approvalMessage');

    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Approving...';
    }
    if (msgEl) msgEl.textContent = '';

    try {

        const employee = currentOnboardingEmployee;
        const companyContext = document.getElementById('obCompanyContext')?.value.trim() || '';
        const additionalInstructions = document.getElementById('obAdditionalInstructions')?.value.trim() || '';
        const expectations = onboardingExpectations.filter(function(e) { return e.trim(); });
        const goals = onboardingGoals.filter(function(g) { return g.trim(); });

        // Read task edits from inputs
        const taskCards = document.querySelectorAll('[data-task-idx]');
        taskCards.forEach(function(el) {
            const idx = parseInt(el.dataset.taskIdx);
            if (generatedTasks[idx] !== undefined && el.dataset.taskField) {
                generatedTasks[idx][el.dataset.taskField] = el.tagName === 'TEXTAREA' ? el.value : el.value;
            }
        });

        // Upsert onboarding_plan
        const planPayload = {
            employee_id: employee.id,
            company_id: companyProfile.id,
            status: 'approved',
            role: employee.role || '',
            experience_level: employee.experience_level || '',
            company_context: companyContext,
            company_expectations: expectations,
            onboarding_goals: goals,
            additional_instructions: additionalInstructions,
            approved_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        // Check if plan already exists for this employee
        const existingPlan = onboardingPlansMap[employee.id];

        let planId = null;

        if (existingPlan) {

            const { data: updated, error: updateErr } = await supabaseClient
                .from('onboarding_plans')
                .update({ ...planPayload })
                .eq('id', existingPlan.id)
                .select()
                .single();

            if (updateErr) throw updateErr;
            planId = updated.id;

        } else {

            const { data: created, error: createErr } = await supabaseClient
                .from('onboarding_plans')
                .insert({ ...planPayload, created_at: new Date().toISOString() })
                .select()
                .single();

            if (createErr) throw createErr;
            planId = created.id;

        }

        // Delete existing tasks for this plan (re-save fresh)
        await supabaseClient
            .from('onboarding_tasks')
            .delete()
            .eq('onboarding_plan_id', planId);

        // Insert new tasks
        const taskRows = generatedTasks.map(function(task, idx) {
            return {
                onboarding_plan_id: planId,
                step_no: idx + 1,
                title: task.title || ('Task ' + (idx + 1)),
                instructions: task.instructions || '',
                step_phase: task.step_phase || 'General',
                order_index: idx + 1,
                status: 'pending',
                requires_assessment: !!task.requires_assessment,
                created_at: new Date().toISOString()
            };
        });

        const { error: tasksErr } = await supabaseClient
            .from('onboarding_tasks')
            .insert(taskRows);

        if (tasksErr) throw tasksErr;

        // Reload plans map
        await loadOnboardingPlansMap();

        // Update views
        renderEmployees(employees);
        renderOnboardingTable();

        // Success
        const successMsg = document.getElementById('successMessage');
        if (successMsg) {
            const name = employee.full_name || employee.name || 'The employee';
            successMsg.textContent = name + '\'s onboarding roadmap has been approved and saved. They will see it when they log in to their Orion dashboard.';
        }

        showOnboardingStep('step3');

    } catch (err) {

        console.error('APPROVE ROADMAP ERROR:', err);
        if (msgEl) {
            msgEl.textContent = 'Could not approve roadmap: ' + (err.message || 'Unknown error.');
            msgEl.style.color = 'var(--text-danger, #ef4444)';
        }

    } finally {

        if (btn) {
            btn.disabled = false;
            btn.textContent = '✓ Approve Roadmap';
        }

    }

}


/*
==================================================
   ONBOARDING MODAL EVENTS
==================================================
*/

document.addEventListener('DOMContentLoaded', function() {

    setupCompanyKnowledgeEvents();

    // Close button
    const closeBtn = document.getElementById('closeOnboardingModal');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeOnboardingModal);
    }

    // Click outside modal
    const modal = document.getElementById('onboardingSetupModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) closeOnboardingModal();
        });
    }

    // Add Expectation button
    const addExpBtn = document.getElementById('addExpectationBtn');
    const expInput = document.getElementById('expectationInput');
    if (addExpBtn && expInput) {
        addExpBtn.addEventListener('click', function() {
            const val = expInput.value.trim();
            if (val) {
                onboardingExpectations.push(val);
                expInput.value = '';
                renderExpectations();
            }
        });
        expInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                addExpBtn.click();
            }
        });
    }

    // Add Goal button
    const addGoalBtn = document.getElementById('addGoalBtn');
    const goalInput = document.getElementById('goalInput');
    if (addGoalBtn && goalInput) {
        addGoalBtn.addEventListener('click', function() {
            const val = goalInput.value.trim();
            if (val) {
                onboardingGoals.push(val);
                goalInput.value = '';
                renderGoals();
            }
        });
        goalInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                addGoalBtn.click();
            }
        });
    }

    // Generate roadmap button
    const generateBtn = document.getElementById('generateRoadmapBtn');
    if (generateBtn) {
        generateBtn.addEventListener('click', generateRoadmap);
    }

    // Back to setup
    const backBtn = document.getElementById('backToSetupBtn');
    if (backBtn) {
        backBtn.addEventListener('click', function() {
            showOnboardingStep('step1');
        });
    }

    // Add custom task
    const addTaskBtn = document.getElementById('addCustomTaskBtn');
    if (addTaskBtn) {
        addTaskBtn.addEventListener('click', function() {
            generatedTasks.push({
                step_no: generatedTasks.length + 1,
                title: '',
                instructions: '',
                step_phase: 'Custom',
                order_index: generatedTasks.length + 1,
                status: 'pending'
            });
            renderRoadmapReviewer();
        });
    }

    // Approve roadmap button
    const approveBtn = document.getElementById('approveRoadmapBtn');
    if (approveBtn) {
        approveBtn.addEventListener('click', approveRoadmap);
    }

    // Progress view: add task, edit brief, save changes
    const addProgressTaskBtn = document.getElementById('addProgressTaskBtn');
    if (addProgressTaskBtn) {
        addProgressTaskBtn.addEventListener('click', function() {
            generatedTasks.push({
                step_no: generatedTasks.length + 1,
                title: '',
                instructions: '',
                step_phase: 'Custom',
                order_index: generatedTasks.length + 1,
                status: 'pending',
                completed_at: null,
                requires_assessment: false
            });
            renderRoadmapProgress();
        });
    }

    const backToProgressSetupBtn = document.getElementById('backToProgressSetupBtn');
    if (backToProgressSetupBtn) {
        backToProgressSetupBtn.addEventListener('click', function() {
            showOnboardingStep('step1');
        });
    }

    const saveRoadmapProgressBtn = document.getElementById('saveRoadmapProgressBtn');
    if (saveRoadmapProgressBtn) {
        saveRoadmapProgressBtn.addEventListener('click', saveRoadmapProgress);
    }

    // Close success button
    const closeSuccess = document.getElementById('closeSuccessBtn');
    if (closeSuccess) {
        closeSuccess.addEventListener('click', closeOnboardingModal);
    }

    // Navigate to Onboarding section: load table
    document.querySelectorAll('.nav-item[data-section="onboarding"]').forEach(function(btn) {
        btn.addEventListener('click', function() {
            renderOnboardingTable();
        });
    });

    // Notification button jumps to assessment alerts
    const notificationButton = document.getElementById('notificationButton');
    if (notificationButton) {
        notificationButton.addEventListener('click', function() {
            showSection('overview');
            const panel = document.getElementById('assessmentAlertsPanel');
            if (panel && panel.style.display !== 'none') {
                panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
    }

});


initializeDashboard();

/* =========================================
   PROJECTS
========================================= */

function projectDateLabel(deadline) {
    if (!deadline) return 'No deadline';
    const date = new Date(`${deadline}T00:00:00`);
    return Number.isNaN(date.getTime()) ? 'No deadline' : date.toLocaleDateString();
}

function projectPreview(value) {
    const text = (value || '').trim();
    return text.length > 130 ? `${text.slice(0, 130)}…` : (text || 'No problem statement provided.');
}

async function getProjectPlanFunctionError(error) {
    const response = error?.context;
    if (!response || typeof response.text !== 'function') {
        return error?.message || 'The AI project planner could not create a team plan.';
    }

    const responseText = await response.text();
    if (responseText) {
        try {
            const body = JSON.parse(responseText);
            return body.error || body.message || `${responseText} (HTTP ${response.status})`;
        } catch {
            return `${responseText.slice(0, 500)} (HTTP ${response.status})`;
        }
    }
    return `${error.message || 'The AI project planner request failed.'} (HTTP ${response.status})`;
}

async function loadCompanyProjects() {
    const grid = document.getElementById('companyProjectsGrid');
    if (!grid || !companyProfile?.id) return;
    grid.innerHTML = '<div class="empty-state panel"><h4>Loading projects...</h4></div>';
    const { data, error } = await supabaseClient
        .from('company_projects')
        .select('id, project_name, problem_statement, description, deadline, department_id, departments(name), created_at, project_members(id)')
        .eq('company_id', companyProfile.id)
        .order('created_at', { ascending: false });
    if (error) {
        console.error('PROJECTS LOAD ERROR:', error);
        grid.innerHTML = '<div class="empty-state panel"><h4>Projects could not be loaded.</h4></div>';
        return;
    }
    companyProjects = data || [];
    renderCompanyProjects();
}

function renderCompanyProjects() {
    const grid = document.getElementById('companyProjectsGrid');
    if (!grid) return;
    grid.replaceChildren();
    if (!companyProjects.length) {
        const empty = document.createElement('div');
        empty.className = 'empty-state panel';
        empty.innerHTML = '<h4>No projects yet</h4><p>Create a project and assign employees to get started.</p>';
        grid.appendChild(empty);
        return;
    }
    companyProjects.forEach(project => {
        const card = document.createElement('article');
        card.className = 'project-card';
        const title = document.createElement('h3');
        title.textContent = project.project_name;
        const statement = document.createElement('p');
        statement.textContent = projectPreview(project.problem_statement);
        const deadline = document.createElement('span');
        deadline.className = 'project-card-meta';
        deadline.textContent = `Deadline: ${projectDateLabel(project.deadline)}`;
        const members = document.createElement('span');
        members.className = 'project-card-meta';
        members.textContent = `${project.project_members?.length || 0} member${project.project_members?.length === 1 ? '' : 's'}`;
        const department = document.createElement('span');
        department.className = 'project-card-meta project-department';
        department.textContent = project.departments?.name || 'Department not set';
        const actions = document.createElement('div');
        actions.className = 'project-card-actions';
        [['View', () => viewCompanyProject(project.id)], ['Edit', () => openProjectModal(project.id)], ['Delete', () => deleteCompanyProject(project.id)]].forEach(([label, handler]) => {
            const button = document.createElement('button');
            button.type = 'button'; button.textContent = label; button.addEventListener('click', handler);
            if (label === 'Delete') button.className = 'danger-button';
            actions.appendChild(button);
        });
        card.append(title, statement, deadline, department, members, actions);
        grid.appendChild(card);
    });
}

async function openProjectModal(projectId = null) {
    const modal = document.getElementById('projectModal');
    const form = document.getElementById('projectForm');
    if (!modal || !form) return;
    form.reset();
    document.getElementById('projectId').value = projectId || '';
    document.getElementById('projectMessage').textContent = '';
    document.getElementById('projectModalTitle').textContent = projectId ? 'Edit project' : 'Create project';
    const departmentSelect = document.getElementById('projectDepartment');
    const project = projectId ? companyProjects.find(item => item.id === projectId) : null;
    if (projectId && !project) return;
    departmentSelect.replaceChildren();
    const prompt = document.createElement('option');
    prompt.value = '';
    prompt.textContent = 'Choose a department';
    prompt.disabled = true;
    prompt.selected = true;
    departmentSelect.appendChild(prompt);
    departments.forEach(department => {
        const option = document.createElement('option');
        option.value = department.id;
        option.textContent = department.name;
        departmentSelect.appendChild(option);
    });
    departmentSelect.disabled = Boolean(project?.department_id);
    document.getElementById('projectAssignmentHelp').textContent = projectId
        ? 'The project team and task assignments are preserved when editing a project.'
        : 'All employees in this department will join the project. Orion AI assigns tasks based on each person’s skills and experience.';
    if (project) {
        document.getElementById('projectName').value = project.project_name || '';
        document.getElementById('projectProblemStatement').value = project.problem_statement || '';
        document.getElementById('projectDescription').value = project.description || '';
        document.getElementById('projectDeadline').value = project.deadline || '';
        departmentSelect.value = project.department_id || '';
    }
    modal.classList.add('active');
}

function closeProjectModal() { document.getElementById('projectModal')?.classList.remove('active'); }

async function saveCompanyProject(event) {
    event.preventDefault();
    const message = document.getElementById('projectMessage');
    const button = document.getElementById('saveProjectButton');
    const {
        data: { user },
        error: userError
    } = await supabaseClient.auth.getUser();
    const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();

    console.log('Current User', user);
    console.log('Current Session', sessionData.session);
    console.log('Current Company', companyProfile);
    console.log('Dashboard Company User', companyUser);

    if (userError || !user || sessionError || !sessionData.session) {
        console.error(userError || sessionError || new Error('No authenticated company session.'));
        message.textContent = 'Your company session has expired. Please sign in again before creating a project.';
        return;
    }

    if (!companyProfile?.id) {
        console.error('PROJECT CREATE ERROR: companyProfile.id is missing.', companyProfile);
        message.textContent = 'Your company profile could not be loaded. Refresh the page and try again.';
        return;
    }

    if (companyProfile.user_id !== user.id) {
        console.error('PROJECT CREATE ERROR: authenticated user does not own the loaded company profile.', {
            authenticatedUserId: user.id,
            companyProfileUserId: companyProfile.user_id,
            companyId: companyProfile.id
        });
        message.textContent = 'Your company session no longer matches this dashboard. Refresh the page and sign in again.';
        return;
    }

    const id = document.getElementById('projectId').value;
    const payload = {
        project_name: document.getElementById('projectName').value.trim(),
        problem_statement: document.getElementById('projectProblemStatement').value.trim(),
        description: document.getElementById('projectDescription').value.trim(),
        deadline: document.getElementById('projectDeadline').value || null,
        department_id: document.getElementById('projectDepartment').value || null
    };
    const projectData = {
        ...payload,
        company_id: companyProfile.id,
        created_by: user.id
    };
    console.log('Project Data', projectData);
    if (!payload.project_name || !payload.problem_statement || !payload.department_id) {
        message.textContent = 'Enter a project name and problem statement, then choose a department.';
        return;
    }
    button.disabled = true; message.textContent = '';
    let projectId = id;
    try {
        if (id) {
            const { error } = await supabaseClient.from('company_projects').update(payload).eq('id', id).eq('company_id', companyProfile.id);
            if (error) throw error;
        } else {
            const { data, error } = await supabaseClient.from('company_projects').insert(projectData).select('id').single();
            if (error) throw error;
            projectId = data.id;
            const { data: plan, error: planError } = await supabaseClient.functions.invoke('generate-project-plan-', {
                body: {
                    department_id: payload.department_id,
                    project_name: payload.project_name,
                    problem_statement: payload.problem_statement,
                    description: payload.description,
                    deadline: payload.deadline
                }
            });
            if (planError) {
                console.error('PROJECT PLAN FUNCTION ERROR:', planError);
                if (planError.name === 'FunctionsFetchError') {
                    throw new Error(`Could not reach the project planner. Confirm generate-project-plan- is deployed to ${SUPABASE_URL} and its latest updates are published.`);
                }
                throw new Error(await getProjectPlanFunctionError(planError));
            }
            if (plan?.error) {
                throw new Error(plan.error);
            }
            if (
                plan?.department_id !== payload.department_id ||
                !Array.isArray(plan?.members) ||
                plan.members.length === 0 ||
                !Array.isArray(plan?.tasks) ||
                plan.tasks.length < 3 ||
                plan.tasks.some(task => !plan.members.includes(task.assignee_id))
            ) {
                throw new Error('The AI project planner returned an incomplete team and task plan.');
            }
            const { error: membersError } = await supabaseClient.from('project_members').insert(
                plan.members.map(employee_id => ({ project_id: projectId, employee_id }))
            );
            if (membersError) throw membersError;
            const { error: tasksError } = await supabaseClient.from('project_tasks').insert(
                plan.tasks.map(task => ({
                    project_id: projectId,
                    title: task.title,
                    description: task.description,
                    assignment_type: 'employee',
                    assigned_employee_id: task.assignee_id,
                    created_by: user.id
                }))
            );
            if (tasksError) throw tasksError;
        }
        closeProjectModal();
        await loadCompanyProjects();
    } catch (error) {
        console.error(error);
        if (!id && projectId) {
            const { error: cleanupError } = await supabaseClient.from('company_projects')
                .delete().eq('id', projectId).eq('company_id', companyProfile.id);
            if (cleanupError) {
                console.error('PROJECT CREATION CLEANUP ERROR:', cleanupError);
                message.textContent = `${error.message || 'Project creation failed.'} The project record could not be removed; refresh and review it before retrying.`;
                return;
            }
        }
        message.textContent = error.message || 'Project creation failed. Please try again.';
    } finally { button.disabled = false; }
}

async function deleteCompanyProject(projectId) {
    if (!window.confirm('Delete this project? This will remove its employee assignments.')) return;
    const { error } = await supabaseClient.from('company_projects').delete().eq('id', projectId).eq('company_id', companyProfile.id);
    if (error) { console.error('PROJECT DELETE ERROR:', error); return; }
    await loadCompanyProjects();
}

async function viewCompanyProject(projectId) {
    const modal = document.getElementById('companyProjectDetailsModal');
    const container = document.getElementById('companyProjectDetails');
    if (!modal || !container) return;
    container.textContent = 'Loading project...'; modal.classList.add('active');
    const { data: project, error } = await supabaseClient.from('company_projects')
        .select('id, project_name, problem_statement, description, deadline, department_id')
        .eq('id', projectId).maybeSingle();
    if (error || !project) {
        console.error('PROJECT DETAILS LOAD ERROR:', error);
        container.textContent = `Project details could not be loaded.${error?.message ? ` ${error.message}` : ''}`;
        return;
    }

    const [membersResult, tasksResult] = await Promise.all([
        supabaseClient.from('project_members').select('employee_id').eq('project_id', projectId),
        supabaseClient.from('project_tasks')
            .select('id, title, description, assignment_type, assigned_employee_id, status, deadline')
            .eq('project_id', projectId)
            .eq('status', 'open')
    ]);
    if (membersResult.error || tasksResult.error) {
        const detailError = membersResult.error || tasksResult.error;
        console.error('PROJECT TEAM OR TASKS LOAD ERROR:', detailError);
        container.textContent = `Project details could not be loaded. ${detailError.message}`;
        return;
    }

    const memberIds = (membersResult.data || []).map(member => member.employee_id);
    const tasks = tasksResult.data || [];
    const taskIds = tasks.map(task => task.id);
    const [employeesResult, assignmentsResult] = await Promise.all([
        memberIds.length
            ? supabaseClient.from('employee_profiles')
                .select('id, full_name, role, experience_level, department_id')
                .in('id', memberIds)
            : Promise.resolve({ data: [], error: null }),
        taskIds.length
            ? supabaseClient.from('project_task_assignments')
                .select('id, project_task_id, employee_id, status, completed_at')
                .in('project_task_id', taskIds)
            : Promise.resolve({ data: [], error: null })
    ]);
    if (employeesResult.error || assignmentsResult.error) {
        const detailError = employeesResult.error || assignmentsResult.error;
        console.error('PROJECT PEOPLE OR ASSIGNMENTS LOAD ERROR:', detailError);
        container.textContent = `Project details could not be loaded. ${detailError.message}`;
        return;
    }

    const employeesById = new Map((employeesResult.data || []).map(employee => [employee.id, employee]));
    const assignmentsByTask = new Map();
    (assignmentsResult.data || []).forEach(assignment => {
        const assignedEmployee = employeesById.get(assignment.employee_id);
        const entries = assignmentsByTask.get(assignment.project_task_id) || [];
        entries.push({ ...assignment, employee_profiles: assignedEmployee ? { full_name: assignedEmployee.full_name } : null });
        assignmentsByTask.set(assignment.project_task_id, entries);
    });
    project.project_members = memberIds.map(employee_id => ({
        employee_id,
        employee_profiles: employeesById.get(employee_id) || null
    }));
    project.project_tasks = tasks.map(task => ({
        ...task,
        project_task_assignments: assignmentsByTask.get(task.id) || []
    }));
    project.departments = {
        name: departments.find(department => department.id === project.department_id)?.name || ''
    };

    container.replaceChildren();
    [['h2', project.project_name], ['h4', 'Problem statement'], ['p', project.problem_statement], ['h4', 'Description'], ['p', project.description || 'No description provided.'], ['h4', 'Deadline'], ['p', projectDateLabel(project.deadline)], ['h4', 'Assigned employees']].forEach(([tag, value]) => { const element = document.createElement(tag); element.textContent = value; container.appendChild(element); });
    const memberList = document.createElement('div'); memberList.className = 'project-details-members';
    (project.project_members || []).forEach(member => {
        const employee = member.employee_profiles; if (!employee) return;
        const item = document.createElement('div'); item.className = 'project-details-member';
        const avatar = document.createElement('span'); avatar.className = 'project-member-avatar'; avatar.textContent = (employee.full_name || 'E').charAt(0).toUpperCase();
        const text = document.createElement('div'); text.textContent = employee.full_name || 'Employee';
        const info = document.createElement('small'); info.textContent = [employee.role, employee.departments?.name, employee.experience_level].filter(Boolean).join(' · ');
        text.appendChild(document.createElement('br')); text.appendChild(info); item.append(avatar, text); memberList.appendChild(item);
    });
    container.appendChild(memberList);
    renderCompanyProjectAnalysis(container, project);
    renderCompanyProjectFiles(container, project.id);
}

function renderCompanyProjectAnalysis(container, project) {
    const tasks = project.project_tasks || [];
    const assignments = tasks.flatMap(task => task.project_task_assignments || []);
    const completed = assignments.filter(item => item.status === 'completed').length;
    const pending = assignments.filter(item => item.status !== 'completed').length;
    const completion = assignments.length ? Math.round((completed / assignments.length) * 100) : 0;
    const overdue = assignments.filter(item => {
        const task = tasks.find(value => value.id === item.project_task_id);
        return task?.deadline && item.status !== 'completed' && new Date(task.deadline) < new Date();
    }).length;
    const section = document.createElement('section');
    section.className = 'project-analysis';
    section.innerHTML = `<h3>Project Analysis</h3>
      <div class="project-card-meta">Department: ${escapeHTML(project.departments?.name || 'Not set')} · Employees: ${project.project_members?.length || 0} · Tasks: ${tasks.length} · Completed: ${completed} · Pending: ${pending} · Completion: ${completion}% · Overdue: ${overdue}</div>
      <h4>Task completion breakdown</h4><p>${completed} completed assignments and ${pending} pending assignments.</p>
      <h4>Employee progress</h4><div id="projectEmployeeProgress"></div>
      <h4>Task ownership</h4><div class="project-task-ownership"></div>
      <h4>Create project task</h4>
      <form id="companyProjectTaskForm">
        <input id="companyProjectTaskTitle" placeholder="Task title" required>
        <textarea id="companyProjectTaskDescription" placeholder="Instructions"></textarea>
        <select id="companyProjectTaskAssignee"><option value="">Entire project team</option></select>
        <input id="companyProjectTaskDeadline" type="datetime-local">
        <button class="primary-button" type="submit">Create task</button>
        <p id="companyProjectTaskMessage" class="form-message"></p>
      </form>`;
    if (!project.project_members?.length) {
        const warning = document.createElement('p');
        warning.className = 'form-message';
        warning.textContent = 'No employees are assigned to this project, so it will not appear in employee dashboards.';
        section.insertBefore(warning, section.firstChild.nextSibling);
    } else if (!tasks.length) {
        const warning = document.createElement('p');
        warning.className = 'form-message';
        warning.textContent = 'The project team is assigned, but no project tasks are saved yet.';
        section.insertBefore(warning, section.firstChild.nextSibling);
    }
    const progress = section.querySelector('#projectEmployeeProgress');
    (project.project_members || []).forEach(member => {
        const employee = member.employee_profiles;
        const employeeAssignments = assignments.filter(item => item.employee_id === member.employee_id);
        const employeeCompleted = employeeAssignments.filter(item => item.status === 'completed').length;
        const percent = employeeAssignments.length ? Math.round(employeeCompleted / employeeAssignments.length * 100) : 0;
        const item = document.createElement('p');
        item.textContent = `${employee?.full_name || 'Employee'} — ${percent}%`;
        progress.appendChild(item);
        const option = document.createElement('option');
        option.value = member.employee_id; option.textContent = employee?.full_name || 'Employee';
        section.querySelector('#companyProjectTaskAssignee').appendChild(option);
    });
    const ownership = section.querySelector('.project-task-ownership');
    if (!tasks.length) {
        ownership.textContent = 'No tasks have been generated for this project.';
    }
    tasks.forEach(task => {
        (task.project_task_assignments || []).forEach(assignment => {
            const item = document.createElement('div');
            item.className = 'project-task-ownership-item';
            const taskName = document.createElement('strong');
            taskName.textContent = task.title;
            const assignee = document.createElement('span');
            assignee.textContent = `${assignment.employee_profiles?.full_name || 'Team member'} · ${assignment.status.replace('_', ' ')}`;
            item.append(taskName, assignee);
            ownership.appendChild(item);
        });
    });
    section.querySelector('#companyProjectTaskForm').addEventListener('submit', async event => {
        event.preventDefault();
        const message = section.querySelector('#companyProjectTaskMessage');
        const { data: { user } } = await supabaseClient.auth.getUser();
        const assignee = section.querySelector('#companyProjectTaskAssignee').value;
        const payload = {
            project_id: project.id,
            title: section.querySelector('#companyProjectTaskTitle').value.trim(),
            description: section.querySelector('#companyProjectTaskDescription').value.trim(),
            assignment_type: assignee ? 'employee' : 'project',
            assigned_employee_id: assignee || null,
            deadline: section.querySelector('#companyProjectTaskDeadline').value || null,
            created_by: user?.id
        };
        if (!payload.title || !payload.created_by) return;
        const { error } = await supabaseClient.from('project_tasks').insert(payload);
        if (error) { message.textContent = error.message; return; }
        await viewCompanyProject(project.id);
    });
    container.appendChild(section);
}

function renderCompanyProjectFiles(container, projectId) {
    const section = document.createElement('section');
    section.className = 'project-files';
    const heading = document.createElement('h3');
    heading.textContent = 'Shared project files';
    const help = document.createElement('p');
    help.textContent = 'Files shared with everyone assigned to this project.';
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp,image/gif,application/pdf,text/plain,application/zip,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    input.setAttribute('aria-label', 'Upload a shared project file');
    const status = document.createElement('p');
    status.className = 'project-files-status';
    const list = document.createElement('div');
    list.className = 'project-files-list';
    section.append(heading, help, input, status, list);
    container.appendChild(section);

    const refresh = async () => {
        list.replaceChildren();
        const { data, error } = await supabaseClient.storage.from('project-files')
            .list(projectId, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });
        if (error) {
            status.textContent = `Shared files could not be loaded: ${error.message}`;
            return;
        }
        status.textContent = data.length ? '' : 'No shared files yet.';
        for (const file of data.filter(item => item.id)) {
            const { data: signed, error: urlError } = await supabaseClient.storage.from('project-files')
                .createSignedUrl(`${projectId}/${file.name}`, 3600);
            if (urlError) {
                console.error('PROJECT FILE LINK ERROR:', urlError);
                status.textContent = 'Some shared files could not be opened. Refresh the project and try again.';
                continue;
            }
            const link = document.createElement('a');
            link.href = signed.signedUrl;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.textContent = file.name.replace(/^\d+-[a-f0-9-]+-/, '');
            list.appendChild(link);
        }
    };

    input.addEventListener('change', async () => {
        const file = input.files?.[0];
        if (!file) return;
        if (file.size > 25 * 1024 * 1024) {
            status.textContent = 'Files must be 25 MB or smaller.';
            input.value = '';
            return;
        }
        status.textContent = 'Uploading shared file...';
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `${projectId}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
        const { error } = await supabaseClient.storage.from('project-files').upload(path, file, { upsert: false });
        if (error) {
            status.textContent = `File upload failed: ${error.message}`;
            input.value = '';
            return;
        }
        input.value = '';
        status.textContent = 'File uploaded.';
        await refresh();
    });
    refresh();
}

document.getElementById('addProjectButton')?.addEventListener('click', () => openProjectModal());
document.getElementById('projectForm')?.addEventListener('submit', saveCompanyProject);
document.querySelector('[data-close-project-modal]')?.addEventListener('click', closeProjectModal);
document.querySelector('[data-close-company-project-details]')?.addEventListener('click', () => document.getElementById('companyProjectDetailsModal')?.classList.remove('active'));

/* Department-wide onboarding tasks extend, rather than replace, individual roadmaps. */
function openDepartmentOnboardingTaskModal() {
    const modal = document.getElementById('departmentOnboardingTaskModal');
    const select = document.getElementById('departmentOnboardingDepartment');
    if (!modal || !select) return;
    select.replaceChildren();
    departments.forEach(department => {
        const option = document.createElement('option');
        option.value = department.id;
        option.textContent = department.name;
        select.appendChild(option);
    });
    document.getElementById('departmentOnboardingTaskMessage').textContent = departments.length ? '' : 'Create a department before adding a department task.';
    modal.classList.add('active');
}

document.getElementById('addDepartmentOnboardingTaskButton')?.addEventListener('click', openDepartmentOnboardingTaskModal);
document.querySelector('[data-close-department-task-modal]')?.addEventListener('click', () => document.getElementById('departmentOnboardingTaskModal')?.classList.remove('active'));
document.getElementById('departmentOnboardingTaskForm')?.addEventListener('submit', async event => {
    event.preventDefault();
    const message = document.getElementById('departmentOnboardingTaskMessage');
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user || !companyProfile?.id) { message.textContent = 'Your company session has expired.'; return; }
    const payload = {
        company_id: companyProfile.id,
        department_id: document.getElementById('departmentOnboardingDepartment').value,
        title: document.getElementById('departmentOnboardingTitle').value.trim(),
        instructions: document.getElementById('departmentOnboardingInstructions').value.trim(),
        step_phase: document.getElementById('departmentOnboardingPhase').value.trim() || 'Department onboarding',
        created_by: user.id
    };
    if (!payload.department_id || !payload.title) { message.textContent = 'Choose a department and enter a title.'; return; }
    const { error } = await supabaseClient.from('department_onboarding_tasks').insert(payload);
    if (error) { console.error('DEPARTMENT ONBOARDING TASK ERROR:', error); message.textContent = error.message; return; }
    message.textContent = 'Department task saved and assigned to applicable employees.';
    event.target.reset();
});
