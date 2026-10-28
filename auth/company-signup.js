const signupForm =
    document.getElementById("signupForm");

const signupError =
    document.getElementById("signupError");

const verificationMessage =
    document.getElementById("verificationMessage");

const verificationEmail =
    document.getElementById("verificationEmail");


signupForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();

        /*
        =========================================
        CLEAR OLD ERROR
        =========================================
        */

        signupError.textContent = "";


        /*
        =========================================
        GET FORM VALUES
        =========================================
        */

        const companyName =
            document
                .getElementById("companyName")
                .value
                .trim();


        const industry =
            document
                .getElementById("industry")
                .value
                .trim();


        const companySize =
            document
                .getElementById("companySize")
                .value;


        const website =
            document
                .getElementById("website")
                .value
                .trim();


        const adminName =
            document
                .getElementById("adminName")
                .value
                .trim();


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

        if (!companyName) {

            signupError.textContent =
                "Please enter your company name.";

            return;

        }


        if (!adminName) {

            signupError.textContent =
                "Please enter your name.";

            return;

        }


        if (!email) {

            signupError.textContent =
                "Please enter your email.";

            return;

        }


        if (password.length < 8) {

            signupError.textContent =
                "Password must contain at least 8 characters.";

            return;

        }



        /*
        =========================================
        CREATE SUPABASE AUTH ACCOUNT
        =========================================

        The send-verification Edge Function creates
        the Auth user and emails the confirmation
        link through Brevo.

        We temporarily store the signup information
        inside Supabase Auth user metadata.

        This allows us to access the company
        information after the user verifies their
        email and logs in.
        */

        const submitButton =
            signupForm.querySelector(
                'button[type="submit"]'
            );

        if (submitButton) {

            submitButton.disabled = true;

            submitButton.textContent =
                "Sending verification email...";

        }

        const redirectTo =
            new URL(
                "company-login.html",
                window.location.href
            ).href;

        let response;

        let result = {};

        try {

            response = await fetch(
                `${SUPABASE_URL}/functions/v1/send-verification`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "apikey": SUPABASE_ANON_KEY,
                        "Authorization":
                            `Bearer ${SUPABASE_ANON_KEY}`
                    },
                    body: JSON.stringify({
                        email: email,
                        password: password,
                        redirectTo: redirectTo,
                        metadata: {
                            full_name: adminName,
                            account_type: "company",
                            company_name: companyName,
                            industry: industry,
                            company_size: companySize,
                            website: website
                        }
                    })
                }
            );

            result = await response
                .json()
                .catch(() => ({}));

        } catch (networkError) {

            console.error(
                "Signup network error:",
                networkError
            );

        } finally {

            if (submitButton) {

                submitButton.disabled = false;

                submitButton.textContent =
                    "Create Company";

            }

        }



        /*
        =========================================
        CHECK SIGNUP ERROR
        =========================================
        */

        if (!response || !response.ok) {

            console.error(
                "Signup error:",
                result
            );

            signupError.textContent =
                result.error ||
                "Could not send the verification email. Please try again.";

            return;

        }



        /*
        =========================================
        SHOW EMAIL VERIFICATION MESSAGE
        =========================================
        */

        signupForm.style.display =
            "none";


        verificationMessage.classList.add(
            "active"
        );


        verificationEmail.textContent =
            email;



        /*
        =========================================
        IMPORTANT
        =========================================

        We DO NOT create company_profiles here.

        The user may still need to verify their
        email.

        The company_profiles row will be created
        after the user logs in successfully.

        The company name and signup details are
        safely stored in Auth user metadata until
        then.
        */

    }
);