const ctx = document.getElementById("candidateChart");


new Chart(ctx, {


type:"bar",


data:{


labels:[
"Technical",
"Communication",
"Problem Solving",
"AI Score"
],


datasets:[{

label:"Average Candidate Score",

data:[
90,
85,
88,
92
],


backgroundColor:"#2563eb"


}]


},


options:{


responsive:true,


scales:{


y:{
beginAtZero:true,
max:100
}


}


}


});
function scrollToSection(id){

    const section = document.getElementById(id);

    if(section){

        section.scrollIntoView({

            behavior:"smooth",
            block:"start"

        });

    }

}

function logout(){

    localStorage.removeItem("currentUser");

    window.location.href="index.html";

}