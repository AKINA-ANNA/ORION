/* =========================================
   ORION LANDING PAGE
========================================= */


/* =========================================
   MOBILE MENU
========================================= */

function toggleMenu() {

    const navLinks =
        document.querySelector(".nav-links");

    navLinks.classList.toggle("mobile-active");

}


/* =========================================
   CLOSE MOBILE MENU WHEN LINK IS CLICKED
========================================= */

const navLinks =
    document.querySelectorAll(".nav-links a");


navLinks.forEach(function(link) {

    link.addEventListener(
        "click",
        function() {

            const menu =
                document.querySelector(".nav-links");

            menu.classList.remove(
                "mobile-active"
            );

        }
    );

});


/* =========================================
   CLOSE MOBILE MENU WHEN CLICKING OUTSIDE
========================================= */

document.addEventListener(
    "click",
    function(event) {

        const menu =
            document.querySelector(".nav-links");

        const mobileButton =
            document.querySelector(".mobile-menu");


        if (
            !menu.contains(event.target) &&
            !mobileButton.contains(event.target)
        ) {

            menu.classList.remove(
                "mobile-active"
            );

        }

    }
);