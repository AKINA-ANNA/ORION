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
                .trim();


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

        We temporarily store the signup information
        inside Supabase Auth user metadata.

        This allows us to access the company
        information after the user verifies their
        email and logs in.

        The actual company_profiles row will be
        created after login.
        */

        const {

            data,

            error

        } = await supabaseClient.auth.signUp({

            email: email,

            password: password,

            options: {

                emailRedirectTo:
                    window.location.origin +
                    "/auth/company-login.html",
data: {

    full_name:
        adminName,

    account_type:
        "company",

    company_name:
        companyName,

    industry:
        industry,

    company_size:
        companySize,

    website:
        website

}

            }

        });



        /*
        =========================================
        CHECK SIGNUP ERROR
        =========================================
        */

        if (error) {

            console.error(
                "Signup error:",
                error
            );

            signupError.textContent =
                error.message;

            return;

        }



        /*
        =========================================
        CHECK USER
        =========================================
        */

        const user =
            data.user;


        if (!user) {

            signupError.textContent =
                "Unable to create your account.";

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