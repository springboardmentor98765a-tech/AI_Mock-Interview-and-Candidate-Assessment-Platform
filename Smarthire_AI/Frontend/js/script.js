// SmartHire AI Frontend Script

const API_URL = "http://localhost:5000/api";


// ================= REGISTER =================

const registerForm = document.getElementById("registerForm");

if (registerForm) {

    registerForm.addEventListener("submit", async (e) => {

        e.preventDefault();


        const userData = {

            name: document.getElementById("registerName").value,

            email: document.getElementById("registerEmail").value,

            password: document.getElementById("registerPassword").value,

            role: document.getElementById("registerRole").value

        };


        try {

            const response = await fetch(
                `${API_URL}/auth/register`,
                {

                    method:"POST",

                    headers:{
                        "Content-Type":"application/json"
                    },

                    body:JSON.stringify(userData)

                }
            );


            const data = await response.json();


            alert(data.message);


            if(data.success){

                document.getElementById("registerForm").reset();

            }


        }

        catch(error){

            console.log(error);

            alert("Server connection failed");

        }


    });

}



// ================= LOGIN =================


const loginForm = document.getElementById("loginForm");


if(loginForm){


loginForm.addEventListener("submit", async(e)=>{


e.preventDefault();



const loginData = {


email:
document.getElementById("loginEmail").value,


password:
document.getElementById("loginPassword").value


};



try{


const response = await fetch(

`${API_URL}/auth/login`,

{


method:"POST",


headers:{

"Content-Type":"application/json"

},


body:JSON.stringify(loginData)


}

);



const data = await response.json();



if(data.success){


localStorage.setItem(
"token",
data.token
);



localStorage.setItem(
"user",
JSON.stringify(data.user)
);



alert("Login Successful 🎉");



// Role based redirect

if(data.role==="USER"){

window.location.href="candidate.html";

}


else if(data.role==="RECRUITER"){

window.location.href="recruiter.html";

}


else if(data.role==="ADMIN"){

window.location.href="admin.html";

}



}


else{


alert(data.message);

}



}


catch(error){

console.log(error);

alert("Backend not connected");

}


});


}



// ================= GOOGLE LOGIN =================


function googleLogin(){


window.location.href =
"http://localhost:5000/api/auth/google";


}



// ================= SHOW REGISTER =================


function showRegister(){


const box =
document.getElementById("registerBox");


if(box.style.display==="block"){

box.style.display="none";

}

else{

box.style.display="block";

}


}