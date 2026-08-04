let selectedRole = "";


// Open Modal

function openModal(role){

    selectedRole = role;

    document.getElementById("loginModal").style.display = "flex";

    document.getElementById("roleTitle").innerText = role + " Login";

    showLogin();
}



// Close Modal

function closeModal(){

    document.getElementById("loginModal").style.display = "none";

}



// Show Login

function showLogin(){

    document.getElementById("loginForm").style.display = "block";

    document.getElementById("registerForm").style.display = "none";

    document.getElementById("roleTitle").innerText = selectedRole + " Login";

}



// Show Register

function showRegister(){

    document.getElementById("loginForm").style.display = "none";

    document.getElementById("registerForm").style.display = "block";

    document.getElementById("roleTitle").innerText = selectedRole + " Register";

}





// Register User

async function handleRegister(){


    const name =
    document.getElementById("regName").value;


    const email =
    document.getElementById("regEmail").value;


    const password =
    document.getElementById("regPassword").value;


    const confirmPassword =
    document.getElementById("regConfirmPassword").value;



    if(password !== confirmPassword){

        alert("Passwords do not match");

        return;
    }



    try{


        const response = await fetch(

            "http://127.0.0.1:8000/register",

            {

                method:"POST",

                headers:{
                    "Content-Type":"application/json"
                },


                body:JSON.stringify({

                    name:name,

                    email:email,

                    password:password,

                    role:selectedRole

                })

            }

        );



        const data = await response.json();



        if(response.ok){


            alert("Registration successful");


            showLogin();


        }

        else{


            alert(data.detail || "Registration failed");


        }


    }


    catch(error){

        console.log(error);

        alert("Backend server not running");

    }


}






// Login User


async function handleLogin(){



    const email =
    document.getElementById("loginEmail").value;



    const password =
    document.getElementById("loginPassword").value;




    try{


        const response = await fetch(

            "http://127.0.0.1:8000/login",

            {

                method:"POST",

                headers:{
                    "Content-Type":"application/json"
                },


                body:JSON.stringify({

                    email:email,

                    password:password

                })

            }

        );




        const data = await response.json();



if(response.ok){

    alert("Login successful");


    // Save login details
    localStorage.setItem(
        "token",
        data.access_token
    );


    localStorage.setItem(
        "user",
        JSON.stringify(data.user)
    );


    const role = data.user.role.toLowerCase();




            if(role === "candidate"){


                window.location.href = "Candidate.html";


            }



            else if(role === "recruiter"){


                window.location.href = "Recruiter.html";


            }




            else if(role === "admin"){


                window.location.href = "Admin.html";


            }


        }



        else{


            alert(data.detail || "Invalid email or password");


        }



    }



    catch(error){


        console.log(error);

        alert("Backend server not running");


    }



}