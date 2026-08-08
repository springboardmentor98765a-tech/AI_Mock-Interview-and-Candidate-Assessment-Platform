
/* ==========================================================
            AI INTERVIEW PRO
            RECRUITER DASHBOARD JS
========================================================== */



/* ===============================
        AUTH GUARD (added)
================================ */

requireAuth("recruiter");
wireLogoutButton("#logoutBtn");



/* ===============================
        SIDEBAR SMOOTH SCROLL
================================ */


const sidebarLinks = document.querySelectorAll(
    ".recruiter-sidebar nav a"
);



sidebarLinks.forEach(link => {


    link.addEventListener("click",(e)=>{


        e.preventDefault();


        const target =
        document.querySelector(
            link.getAttribute("href")
        );



        if(target){


            target.scrollIntoView({

                behavior:"smooth"

            });


        }



    });


});







/* ===============================
        ACTIVE SIDEBAR
================================ */


const sections =
document.querySelectorAll(".section");



window.addEventListener("scroll",()=>{


    let current="";



    sections.forEach(section=>{


        const top =
        section.offsetTop - 150;



        if(window.scrollY >= top){


            current =
            section.getAttribute("id");


        }


    });





    sidebarLinks.forEach(link=>{


        link.classList.remove("active");



        if(
            link.getAttribute("href")
            ===
            "#"+current
        ){


            link.classList.add("active");


        }


    });



});









/* ===============================
        CANDIDATE ACTIONS
================================ */



const viewButtons =
document.querySelectorAll(".view-btn");



viewButtons.forEach(button=>{


    button.addEventListener("click",()=>{


        alert(
            "Opening candidate profile..."
        );


    });


});







const scheduleButtons =
document.querySelectorAll(".schedule-btn");



scheduleButtons.forEach(button=>{


    button.addEventListener("click",()=>{


        alert(
            "Interview scheduling opened 📅"
        );


    });


});








/* ===============================
        RESUME SCREENING
================================ */



const shortlistButtons =
document.querySelectorAll(".shortlist");



shortlistButtons.forEach(button=>{


    button.addEventListener("click",()=>{


        button.innerHTML="Shortlisted ✓";


        button.style.background="#16a34a";


        alert(
            "Candidate shortlisted successfully"
        );


    });


});







const rejectButtons =
document.querySelectorAll(".reject");



rejectButtons.forEach(button=>{


    button.addEventListener("click",()=>{


        button.innerHTML="Rejected";


        button.style.background="#dc2626";


        alert(
            "Candidate rejected"
        );


    });


});








/* ===============================
        REPORT GENERATION
================================ */



const reportButtons =
document.querySelectorAll(".report-card button");



reportButtons.forEach(button=>{


    button.addEventListener("click",()=>{


        alert(
            "Report generated successfully 📄"
        );


    });


});








/* ===============================
        SAVE SETTINGS
================================ */



const saveSettings =
document.querySelector(
    ".settings-panel button"
);



if(saveSettings){


saveSettings.addEventListener("click",()=>{


    alert(
        "Recruiter settings saved successfully"
    );


});


}









/* ===============================
        LOGOUT
================================ */



const logout =
document.querySelector(
    ".sidebar-footer button"
);



if(logout){


logout.addEventListener("click",()=>{


    const confirmLogout =
    confirm(
        "Are you sure you want to logout?"
    );



    if(confirmLogout){


        window.location.href="index.html";


    }



});


}









/* ===============================
        PAGE LOAD
================================ */


window.addEventListener("load",()=>{


    console.log(
        "Recruiter Dashboard Loaded Successfully"
    );


});