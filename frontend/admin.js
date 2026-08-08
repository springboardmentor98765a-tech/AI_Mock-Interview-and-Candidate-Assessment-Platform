
/* ==========================================================
            AI INTERVIEW PRO
            ADMIN DASHBOARD JS
========================================================== */



/* ===============================
        AUTH GUARD (added)
================================ */

requireAuth("admin");
wireLogoutButton("#logoutBtn");






/* ===============================
        SIDEBAR SMOOTH SCROLL
================================ */



const menuLinks =
document.querySelectorAll(
    ".admin-sidebar nav a"
);



menuLinks.forEach(link=>{


    link.addEventListener(
    "click",
    (e)=>{


        e.preventDefault();



        const section =
        document.querySelector(
            link.getAttribute("href")
        );



        if(section){


            section.scrollIntoView({

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



window.addEventListener(
"scroll",
()=>{


let current="";



sections.forEach(section=>{


    const sectionTop =
    section.offsetTop - 150;



    if(window.scrollY >= sectionTop){


        current =
        section.getAttribute("id");


    }



});






menuLinks.forEach(link=>{


    link.classList.remove(
        "active"
    );



    if(
        link.getAttribute("href")
        ===
        "#"+current
    ){


        link.classList.add(
            "active"
        );


    }



});



});










/* ===============================
        USER MANAGEMENT
================================ */



const manageButtons =
document.querySelectorAll(
    ".manage-btn"
);



manageButtons.forEach(button=>{


button.addEventListener(
"click",
()=>{


    alert(
    "Opening user management panel 👤"
    );


});


});









/* ===============================
        REPORT GENERATION
================================ */



const reportButtons =
document.querySelectorAll(
    ".report-card button"
);



reportButtons.forEach(button=>{


button.addEventListener(
"click",
()=>{


    alert(
    "Report generated successfully 📑"
    );


});


});









/* ===============================
        AI SETTINGS
================================ */



const aiSwitches =
document.querySelectorAll(
    ".switch input"
);



aiSwitches.forEach(toggle=>{


toggle.addEventListener(
"change",
()=>{


    if(toggle.checked){


        console.log(
        "AI feature enabled"
        );


    }

    else{


        console.log(
        "AI feature disabled"
        );


    }



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


saveSettings.addEventListener(
"click",
()=>{


alert(
"System settings saved successfully ✅"
);



});


}








/* ===============================
        LOGOUT
================================ */



const logoutButton =
document.querySelector(
".sidebar-footer button"
);



if(logoutButton){


logoutButton.addEventListener(
"click",
()=>{


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



window.addEventListener(
"load",
()=>{


console.log(
"Admin Dashboard Loaded Successfully 🚀"
);


});