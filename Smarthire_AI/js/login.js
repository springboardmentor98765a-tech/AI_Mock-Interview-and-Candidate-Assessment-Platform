// SmartHire AI Login System


let selectedRole = "admin";


// Role Selection

function selectRole(role, element){


    selectedRole = role;


    let roles = document.querySelectorAll(".role");


    roles.forEach(item=>{

        item.classList.remove("active");

    });


    element.classList.add("active");


}




// Password Strength Checker


document
.getElementById("password")
.addEventListener("input",function(){


    let password = this.value;

    let strengthText =
    document.getElementById("strengthText");



    if(password.length < 5){


        strengthText.innerHTML="Weak";


    }

    else if(password.length < 8){


        strengthText.innerHTML="Medium";


    }

    else{


        strengthText.innerHTML="Strong";


    }



});





// Login Function


function login(){


    let email =
    document.getElementById("email").value;


    let password =
    document.getElementById("password").value;



    // Admin Login


    if(
        selectedRole==="admin" &&
        email==="admin@gmail.com" &&
        password==="admin123"
    ){


        window.location.href=
        "admin-dashboard.html";


    }



    // Recruiter Login


    else if(

        selectedRole==="recruiter" &&
        email==="recruiter@gmail.com" &&
        password==="recruiter123"

    ){


        window.location.href=
        "recruiter-dashboard.html";


    }




    // Candidate Login


    else if(

        selectedRole==="candidate" &&
        email==="candidate@gmail.com" &&
        password==="candidate123"

    ){


        window.location.href=
        "candidate-dashboard.html";


    }



    else{


        alert(
        "Invalid Login Details ❌"
        );


    }



}