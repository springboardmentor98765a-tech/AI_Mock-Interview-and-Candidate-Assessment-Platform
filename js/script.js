const loginForm = document.getElementById("loginForm");

loginForm.addEventListener("submit", function(event) {

    event.preventDefault();

    const role = document.getElementById("role").value;

    if(role === "candidate"){
        window.location.href = "pages/candidate.html";
    }

    else if(role === "recruiter"){
        window.location.href = "pages/recruiter.html";
    }

    else if(role === "admin"){
        window.location.href = "pages/admin.html";
    }

    else{
        alert("Please select a role.");
    }

});
function uploadResume(){

    const file = document.getElementById("resumeFile");

    const message = document.getElementById("uploadMessage");

    if(file.files.length > 0){

        message.innerHTML = "✅ Resume uploaded successfully (Frontend Demo)";

        message.style.color = "green";

    }else{

        message.innerHTML = "❌ Please choose a PDF file.";

        message.style.color = "red";

    }

}
function startInterview(){

    const questions = document.getElementById("questions");

    questions.innerHTML = `
        <br>

        <strong>Sample Interview Questions</strong>

        <ol>
            <li>Tell me about yourself.</li>
            <li>What is HTML?</li>
            <li>What is CSS?</li>
            <li>What is JavaScript?</li>
            <li>Why should we hire you?</li>
        </ol>
    `;

}
function showDemo(feature){

    alert(feature + "\n\nFrontend Demo\n\nThis feature will be connected to the backend in the complete application.");

}