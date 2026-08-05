let currentStep = 1;

const totalSteps = 5;


const answers = {

    role: "",

    experience_level: "",

    technical_skills: [],

    onboarding_goals: [],

    additional_info: ""

};



const steps =
    document.querySelectorAll(
        ".question-step"
    );


const nextButton =
    document.getElementById(
        "nextButton"
    );


const backButton =
    document.getElementById(
        "backButton"
    );


const stepNumber =
    document.getElementById(
        "stepNumber"
    );


const errorElement =
    document.getElementById(
        "questionError"
    );



/* ==========================================
   GET CURRENT USER
========================================== */


async function getCurrentUser() {

    const {
        data,
        error
    } =
        await supabaseClient.auth.getUser();


    if (
        error ||
        !data.user
    ) {

        window.location.href =
            "login.html";

        return null;

    }


    return data.user;

}

async function requestAdaptiveQuestion(targetStep) {
    const { data: sessionData, error } = await supabaseClient.auth.getSession();
    if (error || !sessionData?.session) throw new Error('Your session has expired. Please sign in again.');
    const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-onboarding-roadmap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionData.session.access_token}` },
        body: JSON.stringify({ action: 'adaptive-question', target_step: targetStep, previous_answers: answers })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Could not tailor this question.');
    return data;
}

function bindAdaptiveOptions(step, grid, options) {
    grid.replaceChildren();
    options.forEach(value => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = step === 2 ? 'option' : step === 3 ? 'skill' : 'goal';
        button.dataset.value = value;
        if (step === 2) {
            const strong = document.createElement('strong'); strong.textContent = value;
            const hint = document.createElement('span'); hint.textContent = 'Choose the option that fits you best.';
            button.append(strong, hint);
        } else {
            button.textContent = value;
        }
        button.addEventListener('click', () => {
            if (step === 2) {
                grid.querySelectorAll('.option').forEach(item => item.classList.remove('selected'));
                button.classList.add('selected');
                answers.experience_level = value;
                return;
            }
            const key = step === 3 ? 'technical_skills' : 'onboarding_goals';
            button.classList.toggle('selected');
            answers[key] = answers[key].includes(value)
                ? answers[key].filter(item => item !== value)
                : [...answers[key], value];
        });
        grid.appendChild(button);
    });
}

async function adaptNextQuestion(step) {
    if (![2, 3, 4].includes(step)) return;
    const section = document.querySelector(`[data-step="${step}"]`);
    const grid = section?.querySelector(step === 2 ? '.option-grid' : step === 3 ? '.skill-grid' : '.goal-grid');
    if (!section || !grid) return;
    try {
        const data = await requestAdaptiveQuestion(step);
        if (!data.question || !Array.isArray(data.options) || data.options.length < 4) return;
        section.querySelector('h1').textContent = data.question;
        if (data.description) section.querySelector('.question-description').textContent = data.description;
        bindAdaptiveOptions(step, grid, data.options);
    } catch (error) {
        console.warn('Using the standard questionnaire options:', error);
    }
}



/* ==========================================
   SHOW STEP
========================================== */


function showStep(step) {

    steps.forEach(
        function(element) {

            element.classList.remove(
                "active"
            );

        }
    );


    const current =
        document.querySelector(
            `[data-step="${step}"]`
        );


    if (current) {

        current.classList.add(
            "active"
        );

    }


    stepNumber.textContent =
        step;


    backButton.style.visibility =
        step === 1
            ? "hidden"
            : "visible";


    nextButton.textContent =
        step === totalSteps
            ? "Build my roadmap →"
            : "Continue →";


    errorElement.textContent =
        "";

}



/* ==========================================
   VALIDATE STEP
========================================== */


function validateStep() {


    errorElement.textContent =
        "";


    if (currentStep === 1) {

        const role =
            document
                .getElementById("role")
                .value
                .trim();


        if (!role) {

            errorElement.textContent =
                "Tell us your role to continue.";

            return false;

        }


        answers.role =
            role;

    }



    if (currentStep === 2) {

        if (
            !answers.experience_level
        ) {

            errorElement.textContent =
                "Choose an experience level.";

            return false;

        }

    }



    if (currentStep === 3) {

        if (
            answers.technical_skills.length === 0
        ) {

            errorElement.textContent =
                "Select at least one skill.";

            return false;

        }

    }



    if (currentStep === 4) {

        if (
            answers.onboarding_goals.length === 0
        ) {

            errorElement.textContent =
                "Choose at least one goal.";

            return false;

        }

    }



    return true;

}



/* ==========================================
   NEXT
========================================== */


nextButton.addEventListener(
    "click",
    async function() {


        if (
            !validateStep()
        ) {

            return;

        }



        if (currentStep < totalSteps) {
            nextButton.disabled = true;
            nextButton.textContent = 'Tailoring your next question...';
            currentStep++;
            await adaptNextQuestion(currentStep);
            showStep(currentStep);
            nextButton.disabled = false;

            return;

        }



        /*
            LAST STEP
            SAVE EVERYTHING
        */


        answers.additional_info =
            document
                .getElementById(
                    "additionalInfo"
                )
                .value
                .trim();



        nextButton.disabled =
            true;


        nextButton.textContent =
            "Building your roadmap...";



        await saveProfile();

    }
);



/* ==========================================
   BACK
========================================== */


backButton.addEventListener(
    "click",
    function() {


        if (
            currentStep > 1
        ) {

            currentStep--;

            showStep(
                currentStep
            );

        }

    }
);



/* ==========================================
   EXPERIENCE OPTIONS
========================================== */


document
    .querySelectorAll(
        ".option"
    )
    .forEach(
        function(button) {


            button.addEventListener(
                "click",
                function() {


                    document
                        .querySelectorAll(
                            ".option"
                        )
                        .forEach(
                            btn =>
                                btn.classList.remove(
                                    "selected"
                                )
                        );


                    this.classList.add(
                        "selected"
                    );


                    answers.experience_level =
                        this.dataset.value;

                }
            );

        }
    );



/* ==========================================
   SKILLS
========================================== */


document
    .querySelectorAll(
        ".skill"
    )
    .forEach(
        function(button) {


            button.addEventListener(
                "click",
                function() {


                    const value =
                        this.dataset.value;


                    this.classList.toggle(
                        "selected"
                    );


                    if (
                        answers.technical_skills
                            .includes(value)
                    ) {

                        answers.technical_skills =
                            answers.technical_skills
                                .filter(
                                    skill =>
                                        skill !== value
                                );

                    } else {

                        answers.technical_skills.push(
                            value
                        );

                    }

                }
            );

        }
    );



/* ==========================================
   GOALS
========================================== */


document
    .querySelectorAll(
        ".goal"
    )
    .forEach(
        function(button) {


            button.addEventListener(
                "click",
                function() {


                    const value =
                        this.dataset.value;


                    this.classList.toggle(
                        "selected"
                    );


                    if (
                        answers.onboarding_goals
                            .includes(value)
                    ) {

                        answers.onboarding_goals =
                            answers.onboarding_goals
                                .filter(
                                    goal =>
                                        goal !== value
                                );

                    } else {

                        answers.onboarding_goals.push(
                            value
                        );

                    }

                }
            );

        }
    );



/* ==========================================
   SAVE PROFILE
========================================== */


async function saveProfile() {


    const user =
        await getCurrentUser();


    if (!user) {

        return;

    }



    const {
        error
    } =
        await supabaseClient
            .from(
                "employee_profiles"
            )
            .upsert({

                user_id:
                    user.id,

                full_name:
                    user.user_metadata
                        ?.full_name || "",

                role:
                    answers.role,

                experience_level:
                    answers.experience_level,

                technical_skills:
                    answers.technical_skills,

                onboarding_goals:
                    answers.onboarding_goals,

                additional_info:
                    answers.additional_info,

                questionnaire_completed:
                    true

            }, {

                onConflict:
                    "user_id"

            });



    if (error) {

        console.error(
            error
        );


        errorElement.textContent =
            "Something went wrong saving your answers.";


        nextButton.disabled =
            false;


        nextButton.textContent =
            "Build my roadmap →";


        return;

    }



    /*
        Everything saved.

        Later, this is where we can call
        your AI onboarding generation backend.

        For now → dashboard.
    */


    window.location.href =
        "employee-dashboard.html";

}



/* ==========================================
   INITIALIZE
========================================== */


async function initializeQuestionnaire() {
    const user = await getCurrentUser();
    if (!user) return;
    const { data: profile, error } = await supabaseClient
        .from('employee_profiles')
        .select('questionnaire_completed')
        .eq('user_id', user.id)
        .maybeSingle();
    if (error || !profile) {
        errorElement.textContent = 'Your employee profile could not be loaded.';
        return;
    }
    if (profile.questionnaire_completed) {
        window.location.href = 'employee-dashboard.html';
        return;
    }
    showStep(1);
}

initializeQuestionnaire();
