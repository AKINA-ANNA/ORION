const loginForm =
    document.getElementById("loginForm");

const loginError =
    document.getElementById("loginError");


/* =========================================================
   LOGIN FORM
========================================================= */

loginForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        /*
        =========================================
        CLEAR OLD ERROR
        =========================================
        */

        loginError.textContent = "";


        /*
        =========================================
        GET LOGIN VALUES
        =========================================
        */

        const email =
            document
                .getElementById("email")
                .value
                .trim()
                .toLowerCase();


        const password =
            document
                .getElementById("password")
                .value;


        /*
        =========================================
        BASIC VALIDATION
        =========================================
        */

        if (!email || !password) {

            loginError.textContent =
                "Please enter your email and password.";

            return;

        }


        /*
        =========================================
        SHOW LOADING
        =========================================
        */

        const submitButton =
            loginForm.querySelector(
                'button[type="submit"]'
            );


        if (submitButton) {

            submitButton.disabled =
                true;

            submitButton.textContent =
                "Logging in...";

        }


        try {

            /*
            =========================================
            LOGIN
            =========================================
            */

            const {
                data,
                error
            } =
                await supabaseClient.auth.signInWithPassword({

                    email,

                    password

                });


            /*
            =========================================
            LOGIN ERROR
            =========================================
            */

            if (error) {

                console.error(
                    "Login error:",
                    error
                );

                throw error;

            }


            /*
            =========================================
            GET LOGGED-IN USER
            =========================================
            */

            const user =
                data.user;


            if (!user) {

                throw new Error(
                    "Unable to load your account."
                );

            }


            console.log(
                "[ORION] Logged in user:",
                user.id
            );


            /*
            =========================================
            CHECK ACCOUNT TYPE
            =========================================

            Account type is stored in:

            auth.users.raw_user_meta_data

            which is accessible through:

            user.user_metadata
            =========================================
            */

            const accountType =
                user.user_metadata?.account_type;


            if (
                accountType &&
                accountType !== "company"
            ) {

                await supabaseClient.auth.signOut();

                throw new Error(
                    "This is not a company account."
                );

            }


            /*
            =========================================
            FIND COMPANY PROFILE
            =========================================

            Connection:

            auth.users.id
                    ↓
            company_profiles.user_id
            =========================================
            */

            console.log(
                "[ORION] Checking company profile..."
            );


            const {
                data: companyProfile,
                error: profileError
            } =
                await supabaseClient

                    .from("company_profiles")

                    .select("*")

                    .eq(
                        "user_id",
                        user.id
                    )

                    .maybeSingle();


            /*
            =========================================
            DATABASE ERROR
            =========================================
            */

            if (profileError) {

                console.error(
                    "[ORION] Company profile error:",
                    profileError
                );

                throw new Error(
                    "Unable to check your company profile."
                );

            }


            /*
            =========================================
            PROFILE DOES NOT EXIST
            =========================================

            This normally happens on the first
            login after email verification.

            Create company_profiles row using
            information stored in Auth metadata.
            =========================================
            */

            if (!companyProfile) {

                console.log(
                    "[ORION] No company profile found."
                );

                console.log(
                    "[ORION] Creating company profile..."
                );


                const metadata =
                    user.user_metadata || {};


                /*
                =========================================
                CREATE PROFILE
                =========================================
                */

                const {
                    data: newProfile,
                    error: createProfileError
                } =
                    await supabaseClient

                        .from("company_profiles")

                        .insert({

                            user_id:
                                user.id,

                            company_name:
                                metadata.company_name ||
                                "",

                            industry:
                                metadata.industry ||
                                "",

                            company_size:
                                metadata.company_size ||
                                "",

                            website:
                                metadata.website ||
                                "",

                            admin_name:
                                metadata.full_name ||
                                "",

                            profile_generated:
                                false

                        })

                        .select()

                        .single();


                /*
                =========================================
                PROFILE CREATION ERROR
                =========================================
                */

                if (createProfileError) {

                    console.error(
                        "FAILED TO CREATE COMPANY PROFILE:",
                        createProfileError
                    );


                    console.error(
                        "Full error:",
                        createProfileError
                    );


                    throw new Error(
                        "Your account was created, but we could not create your company profile. " +
                        createProfileError.message
                    );

                }


                console.log(
                    "[ORION] Company profile created:",
                    newProfile
                );


                /*
                =========================================
                FIRST LOGIN

                Send user to company setup.

                The company questionnaire will:

                1. Research company
                2. Review research
                3. Ask corrections
                4. Ask missing information
                5. Set profile_generated = true
                =========================================
                */

                window.location.href =
                    "../company/company-question.html";

                return;

            }


            /*
            =========================================
            COMPANY PROFILE EXISTS
            =========================================
            */

            console.log(
                "[ORION] Existing company profile:",
                companyProfile
            );


            /*
            =========================================
            CHECK IF SETUP IS COMPLETE
            =========================================

            IMPORTANT:

            Your database does NOT have:

            setup_completed

            Your database DOES have:

            profile_generated
            =========================================
            */

            if (
                companyProfile.profile_generated === true
            ) {

                console.log(
                    "[ORION] Company setup already completed."
                );


                /*
                =========================================
                USER HAS ALREADY FINISHED SETUP

                GO DIRECTLY TO DASHBOARD
                =========================================
                */

                window.location.href =
                    "../company/company-dashboard.html";

                return;

            }


            /*
            =========================================
            PROFILE EXISTS BUT SETUP IS NOT COMPLETE
            =========================================

            User may have:

            - Closed browser
            - Refreshed page
            - Left questionnaire halfway
            - Never finished onboarding

            Send them back to setup.
            =========================================
            */

            console.log(
                "[ORION] Company setup is not complete."
            );


            window.location.href =
                "../company/company-question.html";


        } catch (error) {

            /*
            =========================================
            FINAL ERROR HANDLER
            =========================================
            */

            console.error(
                "[ORION] Login flow failed:",
                error
            );


            loginError.textContent =
                error.message ||
                "Something went wrong while logging in.";


        } finally {

            /*
            =========================================
            RESTORE LOGIN BUTTON
            =========================================
            */

            if (submitButton) {

                submitButton.disabled =
                    false;

                submitButton.textContent =
                    "Log in";

            }

        }

    }
);