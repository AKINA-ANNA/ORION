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



        if (
            currentStep < totalSteps
        ) {

            currentStep++;

            showStep(
                currentStep
            );

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


getCurrentUser();

showStep(1);