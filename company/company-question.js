/* =========================================================
   ORION COMPANY QUESTIONNAIRE
   OPTION B

   FLOW:

   LOGIN
      ↓
   Check company_profiles
      ↓
   Profile exists?
      ├── YES → Research company
      │
      └── NO
           ↓
        Ask company name
           ↓
        Create company_profiles row
           ↓
        Research company
           ↓
        Review research
           ↓
        Corrections
           ↓
        Missing information questions
           ↓
        Final profile
========================================================= */



/* =========================================================
   EDGE FUNCTION
========================================================= */

const COMPANY_RESEARCH_FUNCTION =
    `${SUPABASE_URL}/functions/v1/company-research`;


/* =========================================================
   GLOBAL STATE
========================================================= */

let currentUser = null;

let companyProfile = null;

let researchData = null;

let currentQuestionIndex = 0;

let questions = [];

let answers = {};


/* =========================================================
   DOM ELEMENTS
========================================================= */

const welcomeScreen =
    document.getElementById(
        "welcomeScreen"
    );

const companyNameScreen =
    document.getElementById(
        "companyNameScreen"
    );

const researchScreen =
    document.getElementById(
        "researchScreen"
    );

const researchReviewScreen =
    document.getElementById(
        "researchReviewScreen"
    );

const correctionScreen =
    document.getElementById(
        "correctionScreen"
    );

const questionnaireScreen =
    document.getElementById(
        "questionnaireScreen"
    );

const completionScreen =
    document.getElementById(
        "completionScreen"
    );


const startButton =
    document.getElementById(
        "startButton"
    );


const companyNameForm =
    document.getElementById(
        "companyNameForm"
    );


const companyNameInput =
    document.getElementById(
        "companyNameInput"
    );


const confirmResearchButton =
    document.getElementById(
        "confirmResearchButton"
    );


const correctResearchButton =
    document.getElementById(
        "correctResearchButton"
    );


const correctionForm =
    document.getElementById(
        "correctionForm"
    );


const continueButton =
    document.getElementById(
        "continueButton"
    );


const dashboardButton =
    document.getElementById(
        "dashboardButton"
    );


/* =========================================================
   HELPER — SHOW SCREEN
========================================================= */

function showScreen(screen) {

    document
        .querySelectorAll(".screen")
        .forEach(
            (item) => {

                item.classList.remove(
                    "active"
                );

            }
        );


    screen.classList.add(
        "active"
    );


    window.scrollTo(
        {
            top: 0,
            behavior: "smooth"
        }
    );

}


/* =========================================================
   HELPER — ERROR
========================================================= */

function showError(
    elementId,
    message
) {

    const element =
        document.getElementById(
            elementId
        );


    if (element) {

        element.textContent =
            message;

    }

}


/* =========================================================
   HELPER — CLEAR ERROR
========================================================= */

function clearError(
    elementId
) {

    const element =
        document.getElementById(
            elementId
        );


    if (element) {

        element.textContent =
            "";

    }

}


/* =========================================================
   GET LOGGED IN USER
========================================================= */

async function getCurrentUser() {

    console.log(
        "[ORION] Checking authenticated user..."
    );


    const {
        data,
        error
    } =
        await supabaseClient
            .auth
            .getUser();


    if (error) {

        console.error(
            "[ORION] Auth error:",
            error
        );

        throw error;

    }


    if (!data.user) {

        throw new Error(
            "You are not logged in. Please log in first."
        );

    }


    currentUser =
        data.user;


    console.log(
        "[ORION] Logged in user:",
        currentUser.id
    );


    return currentUser;

}


/* =========================================================
   FIND COMPANY PROFILE
========================================================= */

async function getCompanyProfile() {

    console.log(
        "[ORION] Checking company_profiles..."
    );


    const {
        data,
        error
    } =
        await supabaseClient
            .from(
                "company_profiles"
            )
            .select(
                "*"
            )
            .eq(
                "user_id",
                currentUser.id
            )
            .maybeSingle();


    if (error) {

        console.error(
            "[ORION] Failed to fetch company profile:",
            error
        );

        throw error;

    }


    companyProfile =
        data;


    console.log(
        "[ORION] Company profile:",
        companyProfile
    );


    return companyProfile;

}


/* =========================================================
   CREATE INITIAL COMPANY PROFILE
========================================================= */

async function createInitialCompanyProfile(
    companyName
) {

    console.log(
        "[ORION] Creating company profile..."
    );


    const {
        data,
        error
    } =
        await supabaseClient
            .from(
                "company_profiles"
            )
            .insert({

                user_id:
                    currentUser.id,

                company_name:
                    companyName,

                profile_generated:
                    false

            })
            .select()
            .single();


    if (error) {

        console.error(
            "[ORION] Failed to create profile:",
            error
        );

        throw error;

    }


    companyProfile =
        data;


    console.log(
        "[ORION] Created company profile:",
        companyProfile
    );


    updateCompanyNameDisplay(
        companyName
    );


    return data;

}


/* =========================================================
   UPDATE COMPANY PROFILE
========================================================= */

async function updateCompanyProfile(
    updates
) {

    console.log(
        "[ORION] Updating company profile:",
        updates
    );


    const {
        data,
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
                currentUser.id
            )
            .select()
            .single();


    if (error) {

        console.error(
            "[ORION] Profile update failed:",
            error
        );

        throw error;

    }


    companyProfile =
        data;


    return data;

}


/* =========================================================
   UPDATE NAVBAR COMPANY NAME
========================================================= */

function updateCompanyNameDisplay(
    companyName
) {

    const display =
        document.getElementById(
            "companyNameDisplay"
        );


    if (display) {

        display.textContent =
            companyName ||
            "Company Setup";

    }

}


/* =========================================================
   START BUTTON
========================================================= */

startButton.addEventListener(
    "click",
    async () => {

        console.log(
            "[ORION] Research button clicked."
        );


        clearError(
            "welcomeError"
        );


        startButton.disabled =
            true;


        try {

            /*
            =========================================
            STEP 1
            GET USER
            =========================================
            */

            await getCurrentUser();


            /*
            =========================================
            STEP 2
            FIND PROFILE
            =========================================
            */

            const profile =
                await getCompanyProfile();


            /*
            =========================================
            OPTION B

            NO PROFILE
            ASK COMPANY NAME
            =========================================
            */

            if (
                !profile ||
                !profile.company_name ||
                !profile.company_name.trim()
            ) {

                console.log(
                    "[ORION] No company name found."
                );


                companyNameInput.value =
                    "";


                showScreen(
                    companyNameScreen
                );


                companyNameInput.focus();


                return;

            }


            /*
            =========================================
            PROFILE EXISTS

            RESEARCH IMMEDIATELY
            =========================================
            */

            console.log(
                "[ORION] Company found:",
                profile.company_name
            );


            updateCompanyNameDisplay(
                profile.company_name
            );


            await researchCompany(
                profile.company_name
            );


        } catch (error) {

            console.error(
                "[ORION] Start error:",
                error
            );


            showError(
                "welcomeError",
                error.message ||
                "Something went wrong."
            );


        } finally {

            startButton.disabled =
                false;

        }

    }
);


/* =========================================================
   COMPANY NAME FORM
========================================================= */

companyNameForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        console.log(
            "[ORION] Company name submitted."
        );


        clearError(
            "companyNameError"
        );


        const companyName =
            companyNameInput
                .value
                .trim();


        if (!companyName) {

            showError(
                "companyNameError",
                "Please enter your company name."
            );


            companyNameInput.focus();


            return;

        }


        const button =
            document.getElementById(
                "saveCompanyNameButton"
            );


        button.disabled =
            true;


        button.classList.add(
            "loading"
        );


        try {

            /*
            =========================================
            CREATE PROFILE
            =========================================
            */

            await createInitialCompanyProfile(
                companyName
            );


            /*
            =========================================
            START RESEARCH
            =========================================
            */

            await researchCompany(
                companyName
            );


        } catch (error) {

            console.error(
                "[ORION] Company setup error:",
                error
            );


            showError(
                "companyNameError",
                error.message ||
                "Could not save your company."
            );


        } finally {

            button.disabled =
                false;


            button.classList.remove(
                "loading"
            );

        }

    }
);


/* =========================================================
   RESEARCH COMPANY
========================================================= */

async function researchCompany(
    companyName
) {

    console.log(
        "[ORION] Starting research for:",
        companyName
    );


    clearError(
        "researchError"
    );


    /*
    =========================================
    SHOW LOADING SCREEN IMMEDIATELY
    =========================================
    */

    showScreen(
        researchScreen
    );


    const researchStatus =
        document.getElementById(
            "researchStatus"
        );


    researchStatus.textContent =
        `Orion is researching ${companyName} using publicly available information.`;


    try {

        console.log(
            "[ORION] Calling Edge Function:",
            COMPANY_RESEARCH_FUNCTION
        );


        /*
        =========================================
        CALL SUPABASE EDGE FUNCTION

        IMPORTANT:

        Your index.ts expects:

        company_name

        NOT:

        companyName
        =========================================
        */

        const response =
            await fetch(
                COMPANY_RESEARCH_FUNCTION,
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                    },

                    body:
                        JSON.stringify({

                            company_name:
                                companyName

                        })

                }
            );


        console.log(
            "[ORION] Edge Function status:",
            response.status
        );


        const result =
            await response.json();


        console.log(
            "[ORION] Edge Function response:",
            result
        );


        if (!response.ok) {

            throw new Error(

                result.error ||

                "Company research failed."

            );

        }


        if (
            !result.success ||
            !result.profile
        ) {

            throw new Error(
                "Orion did not return a valid company profile."
            );

        }


        /*
        =========================================
        SAVE RESEARCH RESULT LOCALLY
        =========================================
        */

        researchData =
            result.profile;


        researchData.search_results =
            result.search_results ||
            [];


        console.log(
            "[ORION] Research complete:",
            researchData
        );


        /*
        =========================================
        DISPLAY RESEARCH
        =========================================
        */

        renderResearchProfile();


        renderSources();


        /*
        =========================================
        SHOW REVIEW
        =========================================
        */

        showScreen(
            researchReviewScreen
        );


    } catch (error) {

        console.error(
            "[ORION] Research failed:",
            error
        );


        showScreen(
            welcomeScreen
        );


        showError(

            "welcomeError",

            error.message ||

            "Unable to research your company."

        );

    }

}


/* =========================================================
   RENDER RESEARCH PROFILE
========================================================= */

function renderResearchProfile() {

    const container =
        document.getElementById(
            "researchProfile"
        );


    container.innerHTML =
        "";


    const profile =
        researchData;


    addProfileSection(

        container,

        "Company Name",

        profile.company_name

    );


    addProfileSection(

        container,

        "Industry",

        profile.industry?.value,

        profile.industry?.confidence

    );


    addProfileSection(

        container,

        "Company Description",

        profile.company_description?.value,

        profile.company_description?.confidence

    );


    addListSection(

        container,

        "Products & Services",

        profile.products_services?.value,

        profile.products_services?.confidence

    );


    addListSection(

        container,

        "Departments",

        profile.departments?.value,

        profile.departments?.confidence

    );


    addListSection(

        container,

        "Technologies",

        profile.technologies?.value,

        profile.technologies?.confidence

    );


    addProfileSection(

        container,

        "Onboarding Focus",

        profile.onboarding_focus?.value,

        profile.onboarding_focus?.confidence

    );

}


/* =========================================================
   PROFILE SECTION
========================================================= */

function addProfileSection(

    container,

    title,

    value,

    confidence

) {

    if (
        !value ||
        value === ""
    ) {

        return;

    }


    const section =
        document.createElement(
            "div"
        );


    section.className =
        "profile-section";


    section.innerHTML = `

        <h3>
            ${escapeHTML(title)}
        </h3>

        <div class="profile-value">
            ${escapeHTML(value)}
        </div>

        ${
            confidence
                ? `
                    <span class="confidence">
                        Confidence: ${escapeHTML(confidence)}
                    </span>
                  `
                : ""
        }

    `;


    container.appendChild(
        section
    );

}


/* =========================================================
   LIST SECTION
========================================================= */

function addListSection(

    container,

    title,

    values,

    confidence

) {

    if (
        !Array.isArray(values) ||
        values.length === 0
    ) {

        return;

    }


    const section =
        document.createElement(
            "div"
        );


    section.className =
        "profile-section";


    const tags =
        values
            .map(
                value => `

                    <span class="profile-tag">

                        ${escapeHTML(
                            String(value)
                        )}

                    </span>

                `
            )
            .join("");


    section.innerHTML = `

        <h3>
            ${escapeHTML(title)}
        </h3>

        <div class="profile-list">

            ${tags}

        </div>

        ${
            confidence
                ? `
                    <span class="confidence">
                        Confidence: ${escapeHTML(confidence)}
                    </span>
                  `
                : ""
        }

    `;


    container.appendChild(
        section
    );

}


/* =========================================================
   RENDER SOURCES
========================================================= */

function renderSources() {

    const container =
        document.getElementById(
            "sourcesList"
        );


    container.innerHTML =
        "";


    const sources =
        researchData.sources ||
        [];


    if (
        sources.length === 0
    ) {

        container.innerHTML =

            "<p>No sources were returned.</p>";

        return;

    }


    sources.forEach(
        (url) => {

            if (!url) {

                return;

            }


            const link =
                document.createElement(
                    "a"
                );


            link.className =
                "source-link";


            link.href =
                url;


            link.target =
                "_blank";


            link.rel =
                "noopener noreferrer";


            link.textContent =
                url;


            container.appendChild(
                link
            );

        }
    );

}


/* =========================================================
   CONFIRM RESEARCH
========================================================= */

confirmResearchButton.addEventListener(
    "click",
    async () => {

        console.log(
            "[ORION] Research confirmed."
        );


        try {

            await saveResearchToProfile();


            prepareQuestions();


        } catch (error) {

            console.error(
                "[ORION] Failed to save research:",
                error
            );


            showError(

                "researchError",

                error.message ||

                "Could not save research."

            );

        }

    }
);


/* =========================================================
   SAVE RESEARCH
========================================================= */

async function saveResearchToProfile() {

    const profile =
        researchData;


    await updateCompanyProfile({

        company_name:
            profile.company_name,

        industry:
            profile.industry?.value ||
            null,

        company_description:
            profile.company_description?.value ||
            null,

        products_services:
            profile.products_services?.value ||
            [],

        departments:
            profile.departments?.value ||
            [],

        technologies:
            profile.technologies?.value ||
            [],

        onboarding_focus:
            profile.onboarding_focus?.value ||
            null,

        ai_profile:
            profile,

        profile_generated:
            false

    });


    console.log(
        "[ORION] Research saved."
    );

}


/* =========================================================
   CORRECT RESEARCH
========================================================= */

correctResearchButton.addEventListener(
    "click",
    () => {

        console.log(
            "[ORION] Opening correction form."
        );


        populateCorrectionForm();


        showScreen(
            correctionScreen
        );

    }
);


/* =========================================================
   POPULATE CORRECTION FORM
========================================================= */

function populateCorrectionForm() {

    document.getElementById(
        "correctionCompanyNameInput"
    ).value =

        researchData.company_name ||
        "";


    document.getElementById(
        "industryInput"
    ).value =

        researchData.industry?.value ||
        "";


    document.getElementById(
        "descriptionInput"
    ).value =

        researchData.company_description?.value ||
        "";


    document.getElementById(
        "productsInput"
    ).value =

        (
            researchData.products_services?.value ||
            []
        ).join("\n");


    document.getElementById(
        "departmentsInput"
    ).value =

        (
            researchData.departments?.value ||
            []
        ).join("\n");


    document.getElementById(
        "technologiesInput"
    ).value =

        (
            researchData.technologies?.value ||
            []
        ).join("\n");


    document.getElementById(
        "onboardingInput"
    ).value =

        researchData.onboarding_focus?.value ||
        "";

}


/* =========================================================
   SAVE CORRECTIONS
========================================================= */

correctionForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        console.log(
            "[ORION] Saving corrections."
        );


        clearError(
            "correctionError"
        );


        try {

            const companyName =
                document
                    .getElementById(
                        "correctionCompanyNameInput"
                    )
                    .value
                    .trim();


            const industry =
                document
                    .getElementById(
                        "industryInput"
                    )
                    .value
                    .trim();


            const description =
                document
                    .getElementById(
                        "descriptionInput"
                    )
                    .value
                    .trim();


            const products =
                parseLines(
                    document
                        .getElementById(
                            "productsInput"
                        )
                        .value
                );


            const departments =
                parseLines(
                    document
                        .getElementById(
                            "departmentsInput"
                        )
                        .value
                );


            const technologies =
                parseLines(
                    document
                        .getElementById(
                            "technologiesInput"
                        )
                        .value
                );


            const onboarding =
                document
                    .getElementById(
                        "onboardingInput"
                    )
                    .value
                    .trim();


            if (!companyName) {

                throw new Error(
                    "Company name is required."
                );

            }


            /*
            =========================================
            UPDATE LOCAL RESEARCH OBJECT
            =========================================
            */

            researchData.company_name =
                companyName;


            researchData.industry = {

                value:
                    industry,

                confidence:
                    "user_confirmed"

            };


            researchData.company_description = {

                value:
                    description,

                confidence:
                    "user_confirmed"

            };


            researchData.products_services = {

                value:
                    products,

                confidence:
                    "user_confirmed"

            };


            researchData.departments = {

                value:
                    departments,

                confidence:
                    "user_confirmed"

            };


            researchData.technologies = {

                value:
                    technologies,

                confidence:
                    "user_confirmed"

            };


            researchData.onboarding_focus = {

                value:
                    onboarding,

                confidence:
                    "user_confirmed"

            };


            /*
            =========================================
            SAVE TO DATABASE
            =========================================
            */

            await updateCompanyProfile({

                company_name:
                    companyName,

                industry:
                    industry ||
                    null,

                company_description:
                    description ||
                    null,

                products_services:
                    products,

                departments:
                    departments,

                technologies:
                    technologies,

                onboarding_focus:
                    onboarding ||
                    null,

                ai_profile:
                    researchData,

                profile_generated:
                    false

            });


            updateCompanyNameDisplay(
                companyName
            );


            /*
            =========================================
            GO TO QUESTIONS
            =========================================
            */

            prepareQuestions();


        } catch (error) {

            console.error(
                "[ORION] Correction error:",
                error
            );


            showError(

                "correctionError",

                error.message ||

                "Could not save corrections."

            );

        }

    }
);


/* =========================================================
   PREPARE QUESTIONS
========================================================= */

function prepareQuestions() {

    console.log(
        "[ORION] Preparing missing information questions."
    );


    questions =
        [];


    /*
    =========================================
    ONLY ASK QUESTIONS FOR MISSING DATA
    =========================================
    */

    const profile =
        researchData;


    if (
        !profile.departments?.value ||
        profile.departments.value.length === 0
    ) {

        questions.push({

            id:
                "departments",

            text:
                "What departments exist in your company?",

            description:
                "For example: Engineering, HR, Marketing, Sales, Finance.",

            type:
                "textarea"

        });

    }


    if (
        !profile.technologies?.value ||
        profile.technologies.value.length === 0
    ) {

        questions.push({

            id:
                "technologies",

            text:
                "What technologies does your company use?",

            description:
                "List the main tools, platforms, programming languages, or systems your employees work with.",

            type:
                "textarea"

        });

    }


    if (
        !profile.onboarding_focus?.value
    ) {

        questions.push({

            id:
                "onboarding_focus",

            text:
                "What should new employees learn during onboarding?",

            description:
                "Tell Orion what a new employee should understand during their first few weeks.",

            type:
                "textarea"

        });

    }


    /*
    =========================================
    NO QUESTIONS
    =========================================
    */

    if (
        questions.length === 0
    ) {

        finishProfile();


        return;

    }


    currentQuestionIndex =
        0;


    answers =
        {};


    showScreen(
        questionnaireScreen
    );


    renderQuestion();

}


/* =========================================================
   RENDER QUESTION
========================================================= */

function renderQuestion() {

    const question =
        questions[
            currentQuestionIndex
        ];


    if (!question) {

        finishProfile();


        return;

    }


    const total =
        questions.length;


    const current =
        currentQuestionIndex + 1;


    document.getElementById(
        "questionNumber"
    ).textContent =

        `Question ${current} of ${total}`;


    document.getElementById(
        "questionText"
    ).textContent =

        question.text;


    document.getElementById(
        "questionDescription"
    ).textContent =

        question.description;


    document.getElementById(
        "progressText"
    ).textContent =

        `${current} / ${total}`;


    document.getElementById(
        "progressBar"
    ).style.width =

        `${(current / total) * 100}%`;


    const answerArea =
        document.getElementById(
            "answerArea"
        );


    answerArea.innerHTML =
        "";


    const textarea =
        document.createElement(
            "textarea"
        );


    textarea.className =
        "answer-input";


    textarea.placeholder =
        "Type your answer here...";


    textarea.value =
        answers[
            question.id
        ] ||
        "";


    answerArea.appendChild(
        textarea
    );


    clearError(
        "questionError"
    );

}


/* =========================================================
   CONTINUE QUESTION
========================================================= */

continueButton.addEventListener(
    "click",
    async () => {

        const question =
            questions[
                currentQuestionIndex
            ];


        const textarea =
            document.querySelector(
                ".answer-input"
            );


        const answer =
            textarea
                ?.value
                .trim();


        if (!answer) {

            showError(

                "questionError",

                "Please enter an answer before continuing."

            );


            return;

        }


        answers[
            question.id
        ] =
            answer;


        currentQuestionIndex++;


        if (
            currentQuestionIndex >=
            questions.length
        ) {

            await finishProfile();


            return;

        }


        renderQuestion();

    }
);


/* =========================================================
   FINISH PROFILE
========================================================= */

async function finishProfile() {

    console.log(
        "[ORION] Finalizing company profile."
    );


    try {

        /*
        =========================================
        APPLY USER ANSWERS
        =========================================
        */

        if (
            answers.departments
        ) {

            researchData.departments = {

                value:
                    parseLines(
                        answers.departments
                    ),

                confidence:
                    "user_confirmed"

            };

        }


        if (
            answers.technologies
        ) {

            researchData.technologies = {

                value:
                    parseLines(
                        answers.technologies
                    ),

                confidence:
                    "user_confirmed"

            };

        }


        if (
            answers.onboarding_focus
        ) {

            researchData.onboarding_focus = {

                value:
                    answers.onboarding_focus,

                confidence:
                    "user_confirmed"

            };

        }


        /*
        =========================================
        SAVE FINAL PROFILE
        =========================================
        */

        await updateCompanyProfile({

            company_name:
                researchData.company_name,

            industry:
                researchData.industry?.value ||
                null,

            company_description:
                researchData.company_description?.value ||
                null,

            products_services:
                researchData.products_services?.value ||
                [],

            departments:
                researchData.departments?.value ||
                [],

            technologies:
                researchData.technologies?.value ||
                [],

            onboarding_focus:
                researchData.onboarding_focus?.value ||
                null,

            ai_profile:
                researchData,

            profile_generated:
                true

        });


        console.log(
            "[ORION] Final company profile saved."
        );


        showScreen(
            completionScreen
        );


    } catch (error) {

        console.error(
            "[ORION] Final profile error:",
            error
        );


        showError(

            "questionError",

            error.message ||

            "Could not finalize your company profile."

        );

    }

}


/* =========================================================
   DASHBOARD BUTTON
========================================================= */

dashboardButton.addEventListener(
    "click",
    () => {

        console.log(
            "[ORION] Going to dashboard."
        );


        window.location.href =
            "company-dashboard.html";

    }
);


/* =========================================================
   PARSE LINES
========================================================= */

function parseLines(
    value
) {

    return value

        .split(
            "\n"
        )

        .map(
            item =>
                item.trim()
        )

        .filter(
            item =>
                item.length > 0
        );

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(
    value
) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        String(
            value ||
            ""
        );


    return div.innerHTML;

}


/* =========================================================
   INITIALIZE
========================================================= */

async function initialize() {

    console.log(
        "===================================="
    );

    console.log(
        "[ORION] Company setup initialized."
    );

    console.log(
        "===================================="
    );


    try {

        /*
        =========================================
        GET USER
        =========================================
        */

        await getCurrentUser();


        /*
        =========================================
        GET EXISTING PROFILE
        =========================================
        */

        const profile =
            await getCompanyProfile();


        /*
        =========================================
        UPDATE NAVBAR
        =========================================
        */

        if (
            profile?.company_name
        ) {

            updateCompanyNameDisplay(

                profile.company_name

            );

        }


        /*
        =========================================
        DON'T AUTO-START RESEARCH

        User must click:

        Research my company
        =========================================
        */


        console.log(
            "[ORION] Ready."
        );


    } catch (error) {

        console.error(
            "[ORION] Initialization failed:",
            error
        );


        showError(

            "welcomeError",

            error.message ||

            "Could not initialize company setup."

        );

    }

}


/* =========================================================
   START APP
========================================================= */

document.addEventListener(

    "DOMContentLoaded",

    () => {

        console.log(
            "[ORION] DOM loaded."
        );


        initialize();

    }

);