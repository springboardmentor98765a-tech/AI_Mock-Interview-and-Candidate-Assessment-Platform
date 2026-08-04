const ctx = document.getElementById("platformChart");


new Chart(ctx, {

type:"line",


data:{


labels:[
"Jan",
"Feb",
"Mar",
"Apr",
"May",
"Jun"
],


datasets:[{


label:"Platform Users",


data:[
500,
700,
850,
1000,
1150,
1250
],


borderColor:"#2563eb",

backgroundColor:"rgba(37,99,235,0.2)",

fill:true,

tension:0.4


}]


},


options:{


responsive:true,
scales:{
y:{

beginAtZero:true
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

// =============================
// Real dashboard data
// =============================

async function loadAdminStats(){

    try{

        const response = await fetch("http://127.0.0.1:8000/admin/stats");
        const data = await response.json();

        document.getElementById("totalUsers").innerText = data.total_users;
        document.getElementById("totalRecruiters").innerText = data.total_recruiters;
        document.getElementById("totalCandidates").innerText = data.total_candidates;

    }
    catch(error){

        console.log(error);

    }

}

async function loadAdminUsers(){

    try{

        const response = await fetch("http://127.0.0.1:8000/admin/users");
        const users = await response.json();

        const tbody = document.getElementById("usersTableBody");
        tbody.innerHTML = "";

        if(users.length === 0){
            tbody.innerHTML = "<tr><td colspan='4'>No users found</td></tr>";
            return;
        }

        users.forEach(user => {

            const row = document.createElement("tr");

            row.innerHTML = `
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>${user.role}</td>
                <td>${user.provider}</td>
            `;

            tbody.appendChild(row);

        });

    }
    catch(error){

        console.log(error);

        document.getElementById("usersTableBody").innerHTML =
            "<tr><td colspan='4'>Failed to load users. Is the backend running?</td></tr>";

    }

}

loadAdminStats();
loadAdminUsers();