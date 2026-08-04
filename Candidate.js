const ctx = document.getElementById("performanceChart");

new Chart(ctx, {
    type: "line",

    data: {
        labels: ["HR", "Technical", "SQL", "Java", "Final"],

        datasets: [{
            label: "Interview Score",
            data: [70, 82, 78, 91, 95],

            borderColor: "#2563eb",
            backgroundColor: "rgba(37,99,235,0.15)",

            fill: true,
            tension: 0.4,
            borderWidth: 3,
            pointRadius: 5,
            pointHoverRadius: 7,
            pointBackgroundColor: "#2563eb"
        }]
    },

    options: {
        responsive: true,
        maintainAspectRatio: false,

        plugins: {
            legend: {
                display: false
            }
        },

        scales: {
            y: {
                beginAtZero: true,
                max: 100,
                grid: {
                    color: "#e5e7eb"
                }
            },
            x: {
                grid: {
                    display: false
                }
            }
        }
    }
});
// =============================
// Sidebar Navigation
// =============================

function scrollToSection(id){

    document.getElementById(id).scrollIntoView({

        behavior:"smooth"

    });

}

// =============================
// Logout
// =============================

function logout(){

    if(confirm("Are you sure you want to logout?")){

        localStorage.removeItem("currentUser");

        window.location.href="index.html";

    }

}