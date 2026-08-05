/*
==================================================
   ORION EMPLOYEE LOGIN
==================================================
*/

const loginForm =
    document.getElementById("loginForm");

const loginError =
    document.getElementById("loginError");


/*
==================================================
   LOGIN FORM
==================================================
*/

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            loginError.textContent = "";


            /*
            ==========================================
            GET LOGIN VALUES
            ==========================================
            */

            const email =
                document
                    .getElementById("loginEmail")
                    .value
                    .trim()
                    .toLowerCase();


            const password =
                document
                    .getElementById("loginPassword")
                    .value;


            /*
            ==========================================
            BASIC VALIDATION
            ==========================================
            */

            if (
                !email ||
                !password
            ) {

                loginError.textContent =
                    "Please enter your email and password.";

                return;

            }


            /*
            ==========================================
            DISABLE LOGIN BUTTON
            ==========================================
            */

            const loginButton =
                loginForm.querySelector(
                    'button[type="submit"]'
                );


            if (loginButton) {

                loginButton.disabled =
                    true;

                loginButton.textContent =
                    "Logging in...";

            }


            try {


                /*
                ======================================
                LOGIN THROUGH SUPABASE AUTH
                ======================================
                */

                const {
                    data,
                    error
                } =
                    await supabaseClient
                        .auth
                        .signInWithPassword({

                            email:
                                email,

                            password:
                                password

                        });


                /*
                ======================================
                AUTH LOGIN ERROR
                ======================================
                */

                if (error) {

                    console.error(
                        "LOGIN ERROR:",
                        error
                    );

                    throw new Error(
                        error.message ||
                        "Invalid email or password."
                    );

                }


                /*
                ======================================
                GET LOGGED-IN USER
                ======================================
                */

                const user =
                    data.user;


                if (!user) {

                    throw new Error(
                        "Unable to retrieve your account."
                    );

                }


                console.log(
                    "Authenticated employee user:",
                    user.id
                );


                /*
                ======================================
                CHECK EMPLOYEE PROFILE
                ======================================

                The employee account must have
                a matching employee_profiles row.

                employee_profiles.user_id
                =
                Supabase Auth user.id
                ======================================
                */

                const {
                    data: employeeProfile,
                    error: employeeProfileError
                } =
                    await supabaseClient

                        .from(
                            "employee_profiles"
                        )

                        .select(
                            "*"
                        )

                        .eq(
                            "user_id",
                            user.id
                        )

                        .maybeSingle();


                /*
                ======================================
                EMPLOYEE PROFILE ERROR
                ======================================
                */

                if (
                    employeeProfileError
                ) {

                    console.error(
                        "EMPLOYEE PROFILE ERROR:",
                        employeeProfileError
                    );

                    throw new Error(
                        "Could not verify your employee account."
                    );

                }


                /*
                ======================================
                EMPLOYEE PROFILE NOT FOUND
                ======================================
                */

                if (
                    !employeeProfile
                ) {

                    await supabaseClient
                        .auth
                        .signOut();


                    throw new Error(
                        "This account is not registered as an employee account."
                    );

                }


                /*
                ======================================
                VERIFY COMPANY ID
                ======================================

                This makes sure the employee actually
                belongs to a company.

                employee_profiles.company_id
                should point to
                company_profiles.id
                ======================================
                */

                if (
                    !employeeProfile.company_id
                ) {

                    console.error(
                        "Employee has no company_id:",
                        employeeProfile
                    );


                    await supabaseClient
                        .auth
                        .signOut();


                    throw new Error(
                        "Your employee account is not linked to a company."
                    );

                }


                /*
                ======================================
                LOGIN SUCCESSFUL
                ======================================
                */

                console.log(
                    "Employee login successful:",
                    employeeProfile
                );


                /*
                ======================================
                STORE EMPLOYEE INFORMATION
                ======================================

                This is optional but useful if your
                employee dashboard needs quick access
                to the employee profile.
                ======================================
                */

                sessionStorage.setItem(

                    "orionEmployeeProfile",

                    JSON.stringify({

                        id:
                            employeeProfile.id,

                        user_id:
                            employeeProfile.user_id,

                        company_id:
                            employeeProfile.company_id,

                        full_name:
                            employeeProfile.full_name ||
                            "",

                        email:
                            employeeProfile.email ||
                            email,

                        department:
                            employeeProfile.department ||
                            ""

                    })

                );


                /*
                ======================================
                REDIRECT TO EMPLOYEE QUESTIONS
                ======================================
                */

                window.location.href =
                    employeeProfile.questionnaire_completed
                        ? "../employee/employee-dashboard.html"
                        : "../employee/questions.html";


            } catch (
                error
            ) {


                /*
                ======================================
                HANDLE LOGIN ERROR
                ======================================
                */

                console.error(
                    "EMPLOYEE LOGIN ERROR:",
                    error
                );


                loginError.textContent =
                    error.message ||
                    "Could not log in.";


            } finally {


                /*
                ======================================
                RE-ENABLE LOGIN BUTTON
                ======================================
                */

                if (loginButton) {

                    loginButton.disabled =
                        false;

                    loginButton.textContent =
                        "Log in";

                }

            }

        }
    );

}
