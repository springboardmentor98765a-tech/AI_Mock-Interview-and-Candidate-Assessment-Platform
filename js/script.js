// ============================================================
// SMART HIRE AI - MAIN JAVASCRIPT
// ============================================================


// ============================================================
// GENERAL NAVIGATION
// ============================================================

function showSection(sectionId) {

    const sections =
        document.querySelectorAll(".dashboard-section");

    sections.forEach(function(section) {
        section.classList.add("hidden");
    });

    const selectedSection =
        document.getElementById(sectionId);

    if (selectedSection) {

        selectedSection.classList.remove("hidden");

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }
}
document.addEventListener("DOMContentLoaded", function () {

    const loginForm = document.getElementById("loginForm");

    if (!loginForm) {
        return;
    }

    loginForm.addEventListener("submit", async function (event) {

        event.preventDefault();

        const email =
            document.getElementById("email").value.trim();

        const password =
            document.getElementById("password").value;

        try {

            const response = await fetch(
                "http://127.0.0.1:8001/login",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        email: email,
                        password: password
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                alert(
                    data.detail ||
                    "Invalid email or password."
                );
                return;
            }

            localStorage.setItem(
                "access_token",
                data.access_token
            );

            const payload = JSON.parse(
                atob(
                    data.access_token
                        .split(".")[1]
                        .replace(/-/g, "+")
                        .replace(/_/g, "/")
                )
            );

            const role = payload.role;

            if (role === "admin") {
                window.location.href = "admin.html";
            }
            else if (role === "recruiter") {
                window.location.href = "recruiter.html";
            }
            else {
                window.location.href = "candidate.html";
            }

        }
        catch (error) {

            console.error("Login error:", error);

            alert(
                "Unable to connect to the server."
            );
        }

    });

});
// ============================================================
// RESUME UPLOAD
// ============================================================

async function uploadResume() {

    const file =
        document.getElementById("resumeFile").files[0];


    const message =
        document.getElementById("uploadMessage");


    if (!file) {

        message.textContent =
            "Please select a resume first.";

        return;

    }


    // Check file type

    const allowedTypes = [

        "application/pdf",

        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

    ];


    if (!allowedTypes.includes(file.type)) {

        message.textContent =
            "Please upload a PDF or DOCX file.";

        return;

    }


    // Get JWT token

    const token =
        localStorage.getItem("access_token");


    if (!token) {

        message.textContent =
            "You are not logged in. Please login again.";

        return;

    }


    // Create form data

    const formData =
        new FormData();


    formData.append(
        "file",
        file
    );


    message.textContent =
        "Uploading resume...";


    try {

        const response =
            await fetch(
                "http://127.0.0.1:8001/resume/upload",
                {
                    method: "POST",

                    headers: {
                        "Authorization":
                            "Bearer " + token
                    },

                    body: formData
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            message.textContent =
                data.detail ||
                "Resume upload failed.";

            return;

        }


        // ====================================================
        // STORE EXACTLY THE RESUME THAT WAS JUST UPLOADED
        // ====================================================

        if (data.resume_id) {

            localStorage.setItem(
                "current_resume_id",
                data.resume_id.toString()
            );

        }


        if (data.filename) {

            localStorage.setItem(
                "current_resume_filename",
                data.filename
            );

        }


        // ====================================================
        // CLEAR OLD AI ANALYSIS
        // ====================================================

        const resultContainer =
            document.getElementById(
                "aiResumeResult"
            );


        if (resultContainer) {

            resultContainer.style.display =
                "none";

        }


        const aiMessage =
            document.getElementById(
                "aiResumeMessage"
            );


        if (aiMessage) {

            aiMessage.textContent =
                "New resume uploaded. Click 'Analyze Resume with AI'.";

        }


        message.textContent =
            "Resume uploaded successfully!";


        console.log(
            "Resume upload response:",
            data
        );


        console.log(
            "Current resume ID:",
            data.resume_id
        );


    } catch (error) {

        console.error(
            "Resume upload error:",
            error
        );


        message.textContent =
            "Unable to connect to SmartHire AI backend.";

    }

}


// ============================================================
// OLD INTERVIEW PLACEHOLDER
// ============================================================

function startInterview() {

    const message =
        document.getElementById(
            "interviewMessage"
        );


    if (message) {

        message.textContent =
            "Please configure and generate your AI interview first.";

    }

}
// ============================================================
// REAL INTERVIEW REPORT
// ============================================================
// Stores the latest report received from the backend
let latestReportData = null;
async function generateReport() {

    // Find the Reports card already present in candidate.html
    const reportContainer =
        document.getElementById("reportContainer");

    // Stop if the Reports card does not exist
    if (!reportContainer) {

        console.error(
            "Report container is missing."
        );

        return;

    }

    // Get the logged-in user's JWT token
    const token =
        localStorage.getItem("access_token");

    // Check whether the user is logged in
    if (!token) {

        reportContainer.innerHTML =
            "<h2>Interview Assessment</h2>" +
            "<p>Please login again to view your report.</p>";

        return;

    }

    // Show loading message
    reportContainer.innerHTML =
        "<h2>Interview Assessment</h2>" +
        "<p>Loading your latest interview report...</p>";

    try {

        // ====================================================
        // CALL BACKEND REPORT ENDPOINT
        // ====================================================

        const response =
            await fetch(
                "http://127.0.0.1:8001/interviews/reports/latest",
                {
                    method: "GET",

                    headers: {
                        "Authorization":
                            "Bearer " + token
                    }
                }
            );

        // Convert backend response to JavaScript object
        const data =
            await response.json();
        // Save the latest report so it can be downloaded
        latestReportData = data;
        // Check for backend errors
        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Unable to load interview report."
            );

        }

        // Show complete response in console
        console.log(
            "Interview report received:",
            data
        );

        // ====================================================
        // BASIC INFORMATION
        // ====================================================

        const date =
            data.date
                ? new Date(data.date).toLocaleString()
                : "--";

        const overall =
            data.overall_score != null
                ? data.overall_score
                : "--";

        const recommendation =
            data.recommendation ||
            "No recommendation available.";

        // ====================================================
        // BUILD REPORT HTML
        // ====================================================

        let html = "";

        html +=
            "<h2>Interview Assessment</h2>";

        html +=
            "<div class='report-section'>";

        html +=
            "<h3>Interview Details</h3>";

        html +=
            "<p><strong>Session ID:</strong> " +
            escapeHtml(
                data.session_id != null
                    ? data.session_id
                    : "--"
            ) +
            "</p>";

        html +=
            "<p><strong>Interview ID:</strong> " +
            escapeHtml(
                data.interview_id != null
                    ? data.interview_id
                    : "--"
            ) +
            "</p>";

        html +=
            "<p><strong>Date:</strong> " +
            escapeHtml(date) +
            "</p>";

        html +=
            "<p><strong>Type:</strong> " +
            escapeHtml(
                data.type || "Interview"
            ) +
            "</p>";

        html +=
            "</div>";

        // ====================================================
        // OVERALL SCORE
        // ====================================================

        html +=
            "<div class='report-section'>";

        html +=
            "<h3>Overall Score</h3>";

        html +=
            "<p class='big-number'>" +
            escapeHtml(overall) +
            "/100</p>";

        html +=
            "</div>";

        // ====================================================
        // SCORE BREAKDOWN
        // ====================================================

        html +=
            "<div class='report-section'>";

        html +=
            "<h3>Performance Breakdown</h3>";

        html +=
            "<p><strong>Technical Score:</strong> " +
            escapeHtml(
                data.technical_score != null
                    ? data.technical_score
                    : "--"
            ) +
            "/100</p>";

        html +=
            "<p><strong>Answer Quality:</strong> " +
            escapeHtml(
                data.answer_quality_score != null
                    ? data.answer_quality_score
                    : "--"
            ) +
            "/100</p>";

        html +=
            "<p><strong>Relevance:</strong> " +
            escapeHtml(
                data.relevance_score != null
                    ? data.relevance_score
                    : "--"
            ) +
            "/100</p>";

        html +=
            "</div>";
        // ====================================================
        // VISUAL AI ANALYSIS
        // ====================================================

        const visual =
            data.visual_analysis || {};

        const eyeContact =
            visual.eye_contact_percentage != null
                ? visual.eye_contact_percentage
                : 0;

        const attention =
            visual.attention_score != null
                ? visual.attention_score
                : 0;

        const facialEngagement =
            visual.facial_engagement_score != null
                ? visual.facial_engagement_score
                : 0;

        const dominantEmotion =
            visual.dominant_emotion ||
            "neutral";

        const emotions =
            visual.emotion_distribution || {};

        html +=
            "<div class='report-section'>";

        html +=
            "<h3>Visual AI Analysis</h3>";

        html +=
            "<p><strong>Eye Contact:</strong> " +
            escapeHtml(eyeContact) +
            "%</p>";

        html +=
            "<p><strong>Attention Score:</strong> " +
            escapeHtml(attention) +
            "/100</p>";

        html +=
            "<p><strong>Facial Engagement:</strong> " +
            escapeHtml(facialEngagement) +
            "%</p>";

        html +=
            "<p><strong>Dominant Emotion:</strong> " +
            escapeHtml(dominantEmotion) +
            "</p>";

        html +=
            "<h4>Emotion Distribution</h4>";

        html +=
            "<p><strong>Happy:</strong> " +
            escapeHtml(
                emotions.happy != null
                    ? Number(emotions.happy).toFixed(2)
                    : "0.00"
            ) +
            "%</p>";

        html +=
            "<p><strong>Fear:</strong> " +
            escapeHtml(
                emotions.fear != null
                    ? Number(emotions.fear).toFixed(2)
                    : "0.00"
            ) +
            "%</p>";

        html +=
            "<p><strong>Surprise:</strong> " +
            escapeHtml(
                emotions.surprise != null
                    ? Number(emotions.surprise).toFixed(2)
                    : "0.00"
            ) +
            "%</p>";

        html +=
            "<p><strong>Neutral:</strong> " +
            escapeHtml(
                emotions.neutral != null
                    ? Number(emotions.neutral).toFixed(2)
                    : "0.00"
            ) +
            "%</p>";

        html +=
            "</div>";
        // ====================================================
        // QUESTION EVALUATIONS
        // ====================================================

        html +=
            "<div class='report-section'>";

        html +=
            "<h3>Question-wise Evaluation</h3>";

        if (
            Array.isArray(data.evaluations) &&
            data.evaluations.length > 0
        ) {

            data.evaluations.forEach(
                function(item, index) {

                    html +=
                        "<div class='card'>";

                    html +=
                        "<h4>Question " +
                        (index + 1) +
                        "</h4>";

                    html +=
                        "<p><strong>Relevance:</strong> " +
                        escapeHtml(
                            item.relevance_score != null
                                ? item.relevance_score
                                : "--"
                        ) +
                        "/100</p>";

                    html +=
                        "<p><strong>Technical:</strong> " +
                        escapeHtml(
                            item.technical_score != null
                                ? item.technical_score
                                : "--"
                        ) +
                        "/100</p>";

                    html +=
                        "<p><strong>Answer Quality:</strong> " +
                        escapeHtml(
                            item.answer_quality_score != null
                                ? item.answer_quality_score
                                : "--"
                        ) +
                        "/100</p>";

                    html +=
                        "<p><strong>Feedback:</strong><br>" +
                        escapeHtml(
                            item.feedback ||
                            "No feedback available."
                        ) +
                        "</p>";

                    html +=
                        "</div>";

                }
            );

        } else {

            html +=
                "<p>Question-level evaluation details are not available in this report.</p>";

        }

        html +=
            "</div>";
        
        // ====================================================
        // AI FEEDBACK
        // ====================================================

        if (
            Array.isArray(data.evaluations) &&
            data.evaluations.length > 0
        ) {

            html +=
                "<div class='report-section'>";

            html +=
                "<h3>AI Feedback & Recommendations</h3>";

            data.evaluations.forEach(
                function(item, index) {

                    html +=
                        "<div class='card'>";

                    html +=
                        "<h4>Question " +
                        (index + 1) +
                        "</h4>";

                    html +=
                        "<p><strong>Strengths:</strong><br>" +
                        escapeHtml(
                            item.strengths ||
                            "No specific strengths identified."
                        ) +
                        "</p>";

                    html +=
                        "<p><strong>Weaknesses:</strong><br>" +
                        escapeHtml(
                            item.weaknesses ||
                            "No specific weaknesses identified."
                        ) +
                        "</p>";

                    html +=
                        "<p><strong>Improvement Suggestions:</strong><br>" +
                        escapeHtml(
                            item.improvement_suggestions ||
                            "No improvement suggestions available."
                        ) +
                        "</p>";

                    html +=
                        "<p><strong>Practice Recommendations:</strong><br>" +
                        escapeHtml(
                            item.practice_recommendations ||
                            "No practice recommendations available."
                        ) +
                        "</p>";

                    html +=
                        "<p><strong>Learning Resources:</strong><br>" +
                        escapeHtml(
                            item.learning_resources ||
                            "No learning resources available."
                        ) +
                        "</p>";

                    html +=
                        "</div>";
                }
            );

            html +=
                "</div>";
        }
        // ====================================================
        // RECOMMENDATION
        // ====================================================

        html +=
            "<div class='report-section'>";

        html +=
            "<h3>Recommendation</h3>";

        html +=
            "<p>" +
            escapeHtml(
                recommendation
            ) +
            "</p>";

        html +=
            "</div>";

        // ====================================================
        // REFRESH BUTTON
        // ====================================================

        html +=
            "<button " +
            "class='primary-btn' " +
            "onclick='downloadReport()'>" +
            "Download Report" +
            "</button> " +

            "<button " +
            "class='primary-btn' " +
            "onclick='generateReport()'>" +
            "Refresh Latest Report" +
            "</button>";

        // ====================================================
        // DISPLAY REPORT
        // ====================================================

        reportContainer.innerHTML =
            html;

        // Console confirmation
        console.log(
            "Interview report displayed:",
            data
        );

    } catch (error) {

        // Print error in console
        console.error(
            "Report error:",
            error
        );

        // Show error on Reports page
        reportContainer.innerHTML =
            "<h2>Interview Assessment</h2>" +
            "<p>Unable to load interview report.</p>" +
            "<p>" +
            escapeHtml(
                error.message ||
                "Unknown error"
            ) +
            "</p>" +

            "<button " +
            "class='primary-btn' " +
            "onclick='generateReport()'>" +
            "Try Again" +
            "</button>";

    }

}

// ============================================================
// DOWNLOAD INTERVIEW REPORT
// ============================================================

function downloadReport() {

    // Check whether a report has been loaded
    if (!latestReportData) {
        alert("Please click 'View Latest Report' first.");
        return;
    }

    const data = latestReportData;

    const date = data.date
        ? new Date(data.date).toLocaleString()
        : "--";

    const visual = data.visual_analysis || {};
    const emotions = visual.emotion_distribution || {};

    const reportHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">

    <title>SmartHire AI - Interview Report</title>

    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 40px;
            color: #222;
            line-height: 1.6;
        }

        h1 {
            text-align: center;
        }

        h2 {
            border-bottom: 1px solid #ccc;
            padding-bottom: 5px;
        }

        .section {
            margin-bottom: 25px;
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 8px;
        }

        .score {
            font-size: 28px;
            font-weight: bold;
        }

        .question {
            margin-top: 15px;
            padding: 12px;
            background: #f5f5f5;
            border-radius: 6px;
        }
    </style>
</head>

<body>

    <h1>SmartHire AI</h1>
    <h2 style="text-align:center;">Interview Assessment Report</h2>

    <div class="section">
        <h2>Interview Details</h2>

        <p><strong>Session ID:</strong>
            ${data.session_id ?? "--"}
        </p>

        <p><strong>Interview ID:</strong>
            ${data.interview_id ?? "--"}
        </p>

        <p><strong>Date:</strong>
            ${date}
        </p>

        <p><strong>Type:</strong>
            ${data.type || "Interview"}
        </p>
    </div>

    <div class="section">
        <h2>Overall Score</h2>

        <p class="score">
            ${data.overall_score ?? "--"} / 100
        </p>

        <p>
            <strong>Recommendation:</strong>
            ${data.recommendation || "--"}
        </p>
    </div>

    <div class="section">
        <h2>Performance Breakdown</h2>

        <p>
            <strong>Technical Score:</strong>
            ${data.technical_score ?? "--"} / 100
        </p>

        <p>
            <strong>Answer Quality:</strong>
            ${data.answer_quality_score ?? "--"} / 100
        </p>

        <p>
            <strong>Relevance:</strong>
            ${data.relevance_score ?? "--"} / 100
        </p>
    </div>

    <div class="section">
        <h2>Visual AI Analysis</h2>

        <p>
            <strong>Eye Contact:</strong>
            ${visual.eye_contact_percentage ?? 0}%
        </p>

        <p>
            <strong>Attention Score:</strong>
            ${visual.attention_score ?? 0}/100
        </p>

        <p>
            <strong>Facial Engagement:</strong>
            ${visual.facial_engagement_score ?? 0}%
        </p>

        <p>
            <strong>Dominant Emotion:</strong>
            ${visual.dominant_emotion || "neutral"}
        </p>

        <h3>Emotion Distribution</h3>

        <p>Happy: ${Number(emotions.happy || 0).toFixed(2)}%</p>
        <p>Fear: ${Number(emotions.fear || 0).toFixed(2)}%</p>
        <p>Surprise: ${Number(emotions.surprise || 0).toFixed(2)}%</p>
        <p>Neutral: ${Number(emotions.neutral || 0).toFixed(2)}%</p>
    </div>

    <div class="section">
        <h2>Question-wise Evaluation</h2>

        ${
            Array.isArray(data.evaluations) &&
            data.evaluations.length > 0

            ? data.evaluations.map((item, index) => `
                <div class="question">

                    <h3>Question ${index + 1}</h3>

                    <p>
                        <strong>Relevance:</strong>
                        ${item.relevance_score ?? "--"} / 100
                    </p>

                    <p>
                        <strong>Technical:</strong>
                        ${item.technical_score ?? "--"} / 100
                    </p>

                    <p>
                        <strong>Answer Quality:</strong>
                        ${item.answer_quality_score ?? "--"} / 100
                    </p>

                    <p>
                        <strong>Feedback:</strong><br>
                        ${item.feedback || "No feedback available."}
                    </p>

                </div>
            `).join("")

            : "<p>No question-level evaluation available.</p>"
        }
    </div>

    <div class="section">
        <h2>Recommendation</h2>

        <p>
            ${data.recommendation || "No recommendation available."}
        </p>
    </div>

    <hr>

    <p style="text-align:center;">
        Generated by SmartHire AI
    </p>

</body>
</html>
`;

    // Create downloadable HTML file
    const blob = new Blob(
        [reportHTML],
        { type: "text/html" }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download =
        "SmartHire_AI_Interview_Report.html";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}
// ============================================================
// VIEW REAL CANDIDATE REPORT
// ============================================================

async function viewCandidateReport(candidateId, candidateName) {

    const token =
        localStorage.getItem("access_token");

    if (!token) {
        alert("Recruiter session expired. Please login again.");
        return;
    }

    try {

        const response =
            await fetch(
                "http://127.0.0.1:8001/recruiter/candidates/" +
                candidateId +
                "/report",
                {
                    method: "GET",

                    headers: {
                        "Authorization":
                            "Bearer " + token
                    }
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            alert(
                data.detail ||
                "Unable to load candidate report."
            );

            return;
        }

        // Display the real report
        alert(
            "Candidate Report\n\n" +

            "Candidate: " +
            candidateName +

            "\n\nOverall Score: " +
            data.overall_score + "%" +

            "\n\nCommunication: " +
            data.communication_score + "%" +

            "\nConfidence: " +
            data.confidence_score + "%" +

            "\nTechnical Relevance: " +
            data.technical_relevance_score + "%" +

            "\nProfessionalism: " +
            data.professionalism_score + "%" +

            "\n\nRecommendation: " +
            data.recommendation
        );

    } catch (error) {

        console.error(
            "Error loading candidate report:",
            error
        );

        alert(
            "Unable to connect to SmartHire AI backend."
        );
    }
}

// ============================================================
// RECRUITER TEMPLATE
// ============================================================

function createTemplate() {

    const name =
        document.getElementById("templateName").value.trim();

    const role =
        document.getElementById("templateRole").value;

    const difficulty =
        document.getElementById("templateDifficulty").value;

    const questions =
        document.getElementById("templateQuestions").value;

    const message =
        document.getElementById("templateMessage");

    if (!name) {
        message.textContent =
            "Please enter a template name.";
        return;
    }

    let templates =
        JSON.parse(
            localStorage.getItem("interview_templates")
        ) || [];

    templates.push({
        name: name,
        role: role,
        difficulty: difficulty,
        questions: questions
    });

    localStorage.setItem(
        "interview_templates",
        JSON.stringify(templates)
    );

    document.getElementById("templateName").value = "";

    message.textContent =
        "Interview template '" +
        name +
        "' created successfully.";

    loadInterviewTemplates();
}


// ============================================================
// LOAD INTERVIEW TEMPLATES
// ============================================================

function loadInterviewTemplates() {

    const templatesBody =
        document.getElementById("templatesBody");

    if (!templatesBody) {
        return;
    }

    const templates =
        JSON.parse(
            localStorage.getItem("interview_templates")
        ) || [];

    templatesBody.innerHTML = "";

    if (templates.length === 0) {

        templatesBody.innerHTML = `
            <tr>
                <td colspan="4">
                    No templates created yet.
                </td>
            </tr>
        `;

        return;
    }

    templates.forEach(function(template) {

        const row =
            document.createElement("tr");

        row.innerHTML = `
            <td>${template.name}</td>
            <td>${template.role}</td>
            <td>${template.difficulty}</td>
            <td>${template.questions}</td>
        `;

        templatesBody.appendChild(row);

    });
}
document.addEventListener(
    "DOMContentLoaded",
    function() {

        loadInterviewTemplates();

    }
);
// ============================================================
// LOGOUT
// ============================================================

function logout() {

    localStorage.removeItem(
        "access_token"
    );


    // Remove resume selection too

    localStorage.removeItem(
        "current_resume_id"
    );


    localStorage.removeItem(
        "current_resume_filename"
    );


    window.location.href =
        "login.html";

}


// ============================================================
// INTERVIEW STATE
// ============================================================

let generatedInterview = null;

let currentQuestionIndex = 0;

let interviewAnswers = [];

let currentInterviewSession = null;

// ============================================================
// SPEECH ANALYSIS DATA
// ============================================================

let interviewSpeechAnalysis = {
    totalWords: 0,
    fillerCount: 0,
    fillerWords: {},
    fillerPercentage: 0
};
// ============================================================
// VISUAL ANALYSIS DATA
// ============================================================

let interviewVisualAnalysis = {

    eyeContactPercentage: 0,

    attentionScore: 0,

    facialEngagementScore: 0,

    dominantEmotion: "neutral",

    emotionDistribution: {
        happy: 0,
        fear: 0,
        surprise: 0,
        neutral: 0
    }

};
// ============================================================
// VISUAL AI SAMPLE COUNTERS
// ============================================================
let visualSampleCount = 0;
let visualEyeContactCount = 0;

let visualEmotionCounts = {
    happy: 0,
    fear: 0,
    surprise: 0,
    neutral: 0
};

// ============================================================
// GENERATE INTERVIEW
// ============================================================

async function generateInterview() {

    const interviewType =
        document.getElementById(
            "interviewType"
        ).value;


    const domain =
        document.getElementById(
            "interviewDomain"
        ).value;


    const difficulty =
        document.getElementById(
            "interviewDifficulty"
        ).value;


    const numberOfQuestions =
        parseInt(
            document.getElementById(
                "questionCount"
            ).value
        );


    const message =
        document.getElementById(
            "interviewMessage"
        );


    message.textContent =
        "Generating your personalized interview...";


    const token =
        localStorage.getItem(
            "access_token"
        );


    if (!token) {

        message.textContent =
            "Please login again.";

        return;

    }


    try {

        const response =
            await fetch(
                "http://127.0.0.1:8001/interviews/generate",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Authorization":
                            "Bearer " + token
                    },

                    body: JSON.stringify({

                        interview_type:
                            interviewType,

                        domain:
                            domain,

                        difficulty:
                            difficulty,

                        number_of_questions:
                            numberOfQuestions

                    })
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            message.textContent =
                data.detail ||
                "Failed to generate interview.";

            return;

        }


        // Store the real generated interview

        generatedInterview =
            data;


        displayGeneratedInterview(
            data
        );


        message.textContent =
            "Interview generated successfully!";


    } catch (error) {

        console.error(error);


        message.textContent =
            "Could not connect to the backend.";

    }

}


// ============================================================
// DISPLAY GENERATED INTERVIEW
// ============================================================

function displayGeneratedInterview(data) {

    const interviewSetup =
        document.getElementById(
            "interviewSetup"
        );


    const generatedInterviewSection =
        document.getElementById(
            "generatedInterview"
        );


    const details =
        document.getElementById(
            "interviewDetails"
        );


    const questionContainer =
        document.getElementById(
            "questionContainer"
        );


    if (
        !interviewSetup ||
        !generatedInterviewSection ||
        !details ||
        !questionContainer
    ) {

        console.error(
            "Interview UI elements are missing."
        );

        return;

    }


    interviewSetup.classList.add(
        "hidden"
    );


    generatedInterviewSection.classList.remove(
        "hidden"
    );


    details.textContent =
        data.interview_type.toUpperCase() +
        " • " +
        data.domain +
        " • " +
        data.difficulty.toUpperCase();


    questionContainer.innerHTML =
        "";


    data.questions.forEach(
        function(question, index) {

            const questionElement =
                document.createElement(
                    "div"
                );


            questionElement.className =
                "card";


            questionElement.innerHTML =
                "<h3>Question " +
                (index + 1) +
                "</h3>" +
                "<p>" +
                question +
                "</p>";


            questionContainer.appendChild(
                questionElement
            );

        }
    );

}


// ============================================================
// START REAL INTERVIEW SESSION
// ============================================================

async function startInterviewSession() {

    if (
        !generatedInterview ||
        !generatedInterview.interview_id
    ) {

        alert(
            "Please generate an interview first."
        );

        return;

    }


    const token =
        localStorage.getItem(
            "access_token"
        );


    if (!token) {

        alert(
            "Please login again."
        );

        return;

    }


    try {

        const response =
            await fetch(
                "http://127.0.0.1:8001/interviews/" +
                generatedInterview.interview_id +
                "/start",
                {
                    method: "POST",

                    headers: {
                        "Authorization":
                            "Bearer " + token
                    }
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            console.error(data);


            alert(
                data.detail ||
                "Unable to start interview."
            );

            return;

        }


        currentInterviewSession =
            data;


        console.log(
            "Interview session started:",
            data
        );


        currentQuestionIndex =
            0;


        interviewAnswers =
            [];

        interviewSpeechAnalysis = {
        totalWords: 0,
        fillerCount: 0,
        fillerWords: {},
        fillerPercentage: 0
        };
        // ============================================================
        // RESET VISUAL ANALYSIS FOR NEW INTERVIEW
        // ============================================================

        interviewVisualAnalysis = {

            eyeContactPercentage: 0,

            attentionScore: 0,

            facialEngagementScore: 0,

            dominantEmotion: "neutral",

            emotionDistribution: {
                happy: 0,
                fear: 0,
                surprise: 0,
                neutral: 0
            }
        };
        visualSampleCount = 0;
            visualEyeContactCount = 0;

            visualEmotionCounts = {
                happy: 0,
                fear: 0,
                surprise: 0,
                neutral: 0
            };

        document
            .getElementById(
                "generatedInterview"
            )
            .classList.add(
                "hidden"
            );


        document
            .getElementById(
                "activeInterview"
            )
            .classList.remove(
                "hidden"
            );


        document
            .getElementById(
                "answerBox"
            )
            .classList.remove(
                "hidden"
            );


        const actionButton =
            document.getElementById(
                "interviewActionButton"
            );


        if (actionButton) {

            actionButton.textContent =
                "Next Question";

            actionButton.onclick =
                nextInterviewQuestion;

        }


        // Start camera and microphone before showing the first question
        await startInterviewMedia();

        // Show the first interview question only after media access
        showCurrentQuestion();


    } catch (error) {

        console.error(error);


        alert(
            "Unable to connect to SmartHire AI backend."
        );

    }

}


// ============================================================
// SHOW CURRENT QUESTION
// ============================================================

function showCurrentQuestion() {

    if (
        !generatedInterview ||
        !generatedInterview.questions
    ) {

        return;

    }


    const questions =
        generatedInterview.questions;


    const questionNumber =
        document.getElementById(
            "questionNumber"
        );


    const currentQuestion =
        document.getElementById(
            "currentQuestion"
        );


    const answerBox =
        document.getElementById(
            "answerBox"
        );


    const sessionMessage =
        document.getElementById(
            "sessionMessage"
        );


    if (questionNumber) {

        questionNumber.textContent =
            "Question " +
            (currentQuestionIndex + 1) +
            " of " +
            questions.length;

    }


    if (currentQuestion) {

        currentQuestion.textContent =
            questions[
                currentQuestionIndex
            ];

    }


    if (answerBox) {

        answerBox.value =
            "";

        answerBox.classList.remove(
            "hidden"
        );

    }


    if (sessionMessage) {

        sessionMessage.textContent =
            "";

    }


    const actionButton =
        document.getElementById(
            "interviewActionButton"
        );


    if (actionButton) {

        actionButton.textContent =
            "Next Question";

        actionButton.onclick =
            nextInterviewQuestion;

    }

}


// ============================================================
// SAVE ANSWER TO DATABASE
// ============================================================

async function saveInterviewAnswer(
    questionNumber,
    questionText,
    answerText
) {

    const token =
        localStorage.getItem(
            "access_token"
        );


    if (!token) {

        throw new Error(
            "Authentication token missing."
        );

    }


    if (
        !currentInterviewSession ||
        !currentInterviewSession.session_id
    ) {

        throw new Error(
            "Interview session not found."
        );

    }


    const params =
        new URLSearchParams({

            question_number:
                questionNumber.toString(),

            question_text:
                questionText,

            answer_text:
                answerText

        });


    const response =
        await fetch(
            "http://127.0.0.1:8001/interviews/sessions/" +
            currentInterviewSession.session_id +
            "/answers?" +
            params.toString(),
            {
                method: "POST",

                headers: {
                    "Authorization":
                        "Bearer " + token
                }
            }
        );


    const data =
        await response.json();


    if (!response.ok) {

        console.error(
            "Answer save failed:",
            data
        );


        throw new Error(
            data.detail ||
            "Unable to save answer."
        );

    }


    console.log(
        "Answer saved:",
        data
    );


    return data;

}


// ============================================================
// NEXT QUESTION / SAVE ANSWER
// ============================================================

async function nextInterviewQuestion() {

    if (
        !generatedInterview ||
        !generatedInterview.questions
    ) {

        return;

    }


    const answerBox =
        document.getElementById(
            "answerBox"
        );


    const answer =
        answerBox
            ? answerBox.value.trim()
            : "";


    const question =
        generatedInterview.questions[
            currentQuestionIndex
        ];


    if (!answer) {

        alert(
            "Please enter your answer before continuing."
        );

        return;

    }


    const actionButton =
        document.getElementById(
            "interviewActionButton"
        );


    if (actionButton) {

        actionButton.disabled =
            true;

        actionButton.textContent =
            "Saving...";

    }


    try {

        await saveInterviewAnswer(
            currentQuestionIndex + 1,
            question,
            answer
        );


        interviewAnswers.push({

            question:
                question,

            answer:
                answer

        });
        // Analyze speech/filler words for this answer
const speechAnalysis =
    analyzeFillerWords(answer);


// Add this answer's speech statistics
interviewSpeechAnalysis.totalWords +=
    speechAnalysis.totalWords;

interviewSpeechAnalysis.fillerCount +=
    speechAnalysis.fillerCount;


// Combine filler-word counts
Object.keys(
    speechAnalysis.fillerWords
).forEach(function(filler) {

    if (
        !interviewSpeechAnalysis.fillerWords[filler]
    ) {

        interviewSpeechAnalysis.fillerWords[filler] =
            0;

    }


    interviewSpeechAnalysis.fillerWords[filler] +=
        speechAnalysis.fillerWords[filler];

});


// Recalculate overall filler percentage
if (
    interviewSpeechAnalysis.totalWords > 0
) {

    interviewSpeechAnalysis.fillerPercentage =
        Number(
            (
                interviewSpeechAnalysis.fillerCount /
                interviewSpeechAnalysis.totalWords
            * 100
            ).toFixed(2)
        );

}


        currentQuestionIndex++;


        if (
            currentQuestionIndex >=
            generatedInterview.questions.length
        ) {

            await finishInterviewSession();

            return;

        }


        showCurrentQuestion();


    } catch (error) {

        console.error(
            "Error saving interview answer:",
            error
        );


        alert(
            error.message ||
            "Unable to save your answer."
        );


    } finally {

        if (actionButton) {

            actionButton.disabled =
                false;


            if (
                currentQuestionIndex <
                generatedInterview.questions.length
            ) {

                actionButton.textContent =
                    "Next Question";

            }

        }

    }

}


// ============================================================
// FINISH REAL INTERVIEW SESSION
// ============================================================

async function finishInterviewSession() {

    const token =
        localStorage.getItem(
            "access_token"
        );


    if (
        !token ||
        !currentInterviewSession ||
        !currentInterviewSession.session_id
    ) {

        alert(
            "Interview session information is missing."
        );

        return;

    }

    // Stop Visual AI and calculate final visual metrics
    stopVisualAnalysis();
    try {

        const response =
    await fetch(
        "http://127.0.0.1:8001/interviews/sessions/" +
        currentInterviewSession.session_id +
        "/finish?questions_attempted=" +
        interviewAnswers.length,
        {
            method: "POST",

            headers: {

                "Authorization":
                    "Bearer " + token,

                "Content-Type":
                    "application/json"

            },

            body: JSON.stringify({

                speech_analysis: interviewSpeechAnalysis,
                visual_analysis: interviewVisualAnalysis
            })

        }
    );

        const data =
            await response.json();


        if (!response.ok) {

            console.error(data);


            alert(
                data.detail ||
                "Unable to finish interview."
            );

            return;

        }


        console.log(
            "Interview session completed:",
            data
        );
        // ============================================================
        // ============================================================
        // EVALUATE COMPLETED INTERVIEW
        // ============================================================

        console.log(
            "Starting AI evaluation for session:",
            data.session_id
        );

        const evaluationResponse = await fetch(
            "http://127.0.0.1:8001/interviews/sessions/" +
            data.session_id +
            "/evaluate",
            {
                method: "POST",

                headers: {
                    "Authorization":
                        "Bearer " + token
                }
            }
        );

        const evaluationData =
            await evaluationResponse.json();

        if (!evaluationResponse.ok) {

            console.error(
                "Interview evaluation failed:",
                evaluationData
            );

            alert(
                "Interview was completed, but AI evaluation failed.\n\n" +
                (
                    evaluationData.detail ||
                    "Unknown evaluation error."
                )
            );

            return;
        }

        console.log(
            "AI evaluation completed:",
            evaluationData
        );

        currentInterviewSession =
            data;


        const questionNumber =
            document.getElementById(
                "questionNumber"
            );


        const currentQuestion =
            document.getElementById(
                "currentQuestion"
            );


        const answerBox =
            document.getElementById(
                "answerBox"
            );


        const actionButton =
            document.getElementById(
                "interviewActionButton"
            );


        const sessionMessage =
            document.getElementById(
                "sessionMessage"
            );


        if (questionNumber) {

            questionNumber.textContent =
                "Completed";

        }


        if (currentQuestion) {

            currentQuestion.textContent =
                "🎉 Interview completed!";

        }


        if (answerBox) {

            answerBox.classList.add(
                "hidden"
            );

        }


        if (actionButton) {

            actionButton.textContent =
                "View Report";

            actionButton.onclick =
                viewInterviewReport;

        }


        if (sessionMessage) {

            sessionMessage.textContent =
                "Session saved successfully. " +
                "Duration: " +
                data.duration_seconds +
                " seconds.";

        }


    } catch (error) {

        console.error(error);


        alert(
            "Unable to connect to SmartHire AI backend."
        );

    }

}


// ============================================================
// VIEW INTERVIEW REPORT
// ============================================================

function viewInterviewReport() {

    // Open the Reports section
    const reportsSection =
        document.getElementById("reports");

    if (reportsSection) {

        // Hide other dashboard sections
        document
            .querySelectorAll(".dashboard-section")
            .forEach(function(section) {

                section.classList.add("hidden");

            });

        // Show Reports section
        reportsSection.classList.remove("hidden");

    }

    // Generate and display the real report
    generateReport();

}

// ============================================================
// AI RESUME ANALYSIS - GEMINI
// ============================================================

async function analyzeResumeWithAI() {

    const message =
        document.getElementById(
            "aiResumeMessage"
        );


    const resultContainer =
        document.getElementById(
            "aiResumeResult"
        );


    const skillsContainer =
        document.getElementById(
            "skillsContainer"
        );


    const experienceContainer =
        document.getElementById(
            "experienceContainer"
        );


    const educationContainer =
        document.getElementById(
            "educationContainer"
        );


    const summaryContainer =
        document.getElementById(
            "resumeSummary"
        );


    if (!message || !resultContainer) {

        console.error(
            "AI Resume UI elements are missing."
        );

        return;

    }


    message.textContent =
        "🤖 Gemini is analyzing your resume...";


    resultContainer.style.display =
        "none";


    // ====================================================
    // GET AUTH TOKEN
    // ====================================================

    const token =
        localStorage.getItem(
            "access_token"
        );


    if (!token) {

        message.textContent =
            "Please login again.";

        return;

    }


    // ====================================================
    // GET EXACT CURRENT RESUME ID
    // ====================================================

    const resumeId =
        localStorage.getItem(
            "current_resume_id"
        );


    if (!resumeId) {

        message.textContent =
            "Please upload a resume first.";

        return;

    }


    console.log(
        "Analyzing resume ID:",
        resumeId
    );


    try {

        // ====================================================
        // CALL BACKEND WITH EXACT RESUME ID
        // ====================================================

        const response =
            await fetch(
                "http://127.0.0.1:8001/resume/ai-analysis?resume_id=" +
                encodeURIComponent(resumeId),
                {
                    method: "GET",

                    headers: {
                        "Authorization":
                            "Bearer " + token
                    }
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "AI resume analysis failed."
            );

        }


        console.log(
            "AI analysis response:",
            data
        );


        const analysis =
            data.analysis;


        if (!analysis) {

            throw new Error(
                "No AI analysis was returned."
            );

        }


        // ====================================================
        // SKILLS
        // ====================================================

        if (skillsContainer) {

            skillsContainer.innerHTML =
                "";


            if (
                Array.isArray(
                    analysis.skills
                ) &&
                analysis.skills.length > 0
            ) {

                analysis.skills.forEach(
                    function(skill) {

                        const skillElement =
                            document.createElement(
                                "span"
                            );


                        skillElement.textContent =
                            skill;


                        skillElement.style.display =
                            "inline-block";


                        skillElement.style.padding =
                            "8px 14px";


                        skillElement.style.margin =
                            "5px";


                        skillElement.style.borderRadius =
                            "20px";


                        skillElement.style.background =
                            "#eef2ff";


                        skillElement.style.color =
                            "#3730a3";


                        skillsContainer.appendChild(
                            skillElement
                        );

                    }
                );


            } else {

                skillsContainer.innerHTML =
                    "<p>No skills detected.</p>";

            }

        }


        // ====================================================
        // EXPERIENCE
        // ====================================================

        if (experienceContainer) {

            experienceContainer.innerHTML =
                "";


            if (
                Array.isArray(
                    analysis.experience
                ) &&
                analysis.experience.length > 0
            ) {

                const list =
                    document.createElement(
                        "ul"
                    );


                analysis.experience.forEach(
                    function(item) {

                        const li =
                            document.createElement(
                                "li"
                            );


                        if (
                            typeof item ===
                            "string"
                        ) {

                            li.textContent =
                                item;

                        } else if (
                            item &&
                            typeof item ===
                            "object"
                        ) {

                            const parts = [];


                            if (item.title) {
                                parts.push(
                                    item.title
                                );
                            }


                            if (item.role) {
                                parts.push(
                                    item.role
                                );
                            }


                            if (item.company) {
                                parts.push(
                                    item.company
                                );
                            }


                            if (item.organization) {
                                parts.push(
                                    item.organization
                                );
                            }


                            if (item.description) {
                                parts.push(
                                    item.description
                                );
                            }


                            if (item.details) {
                                parts.push(
                                    item.details
                                );
                            }


                            if (item.project) {
                                parts.push(
                                    item.project
                                );
                            }


                            li.textContent =
                                parts.length > 0
                                    ? parts.join(" — ")
                                    : JSON.stringify(item);

                        }


                        list.appendChild(
                            li
                        );

                    }
                );


                experienceContainer.appendChild(
                    list
                );


            } else {

                experienceContainer.innerHTML =
                    "<p>No experience information found.</p>";

            }

        }


        // ====================================================
        // EDUCATION
        // ====================================================

        if (educationContainer) {

            educationContainer.innerHTML =
                "";


            if (
                Array.isArray(
                    analysis.education
                ) &&
                analysis.education.length > 0
            ) {

                const list =
                    document.createElement(
                        "ul"
                    );


                analysis.education.forEach(
                    function(item) {

                        const li =
                            document.createElement(
                                "li"
                            );


                        if (
                            typeof item ===
                            "string"
                        ) {

                            li.textContent =
                                item;

                        } else if (
                            item &&
                            typeof item ===
                            "object"
                        ) {

                            const parts = [];


                            if (item.degree) {
                                parts.push(
                                    item.degree
                                );
                            }


                            if (item.course) {
                                parts.push(
                                    item.course
                                );
                            }


                            if (item.institution) {
                                parts.push(
                                    item.institution
                                );
                            }


                            if (item.university) {
                                parts.push(
                                    item.university
                                );
                            }


                            if (item.college) {
                                parts.push(
                                    item.college
                                );
                            }


                            if (item.year) {
                                parts.push(
                                    item.year
                                );
                            }


                            if (item.start_year) {
                                parts.push(
                                    item.start_year
                                );
                            }


                            if (item.end_year) {
                                parts.push(
                                    item.end_year
                                );
                            }


                            if (item.details) {
                                parts.push(
                                    item.details
                                );
                            }


                            li.textContent =
                                parts.length > 0
                                    ? parts.join(" — ")
                                    : JSON.stringify(item);

                        }


                        list.appendChild(
                            li
                        );

                    }
                );


                educationContainer.appendChild(
                    list
                );


            } else {

                educationContainer.innerHTML =
                    "<p>No education information found.</p>";

            }

        }


        // ====================================================
        // SUMMARY
        // ====================================================

        if (summaryContainer) {

            summaryContainer.textContent =
                analysis.summary ||
                "No summary generated.";

        }


        // ====================================================
        // SHOW RESULTS
        // ====================================================

        resultContainer.style.display =
            "block";


        message.textContent =
            "✅ Resume analyzed successfully using Gemini AI.";


    } catch (error) {

        console.error(
            "AI Resume Analysis Error:",
            error
        );


        message.textContent =
            "❌ " +
            error.message;

    }

}

// ============================================================
// INTERVIEW HISTORY + ANALYTICS
// ============================================================

async function loadCandidateInterviewData() {

    // Get the logged-in user's JWT token
    const token = localStorage.getItem("access_token");

    // Find the interview history table body
    const body = document.getElementById("historyTableBody");

    // Stop if the user is not logged in
    if (!token) return;

    // Show loading message in Interview History
    if (body) {
        body.innerHTML =
            "<tr><td colspan='4'>Loading interview history...</td></tr>";
    }

    try {

        // Call the candidate interview-data endpoint
        const response = await fetch(
            "http://127.0.0.1:8001/candidate/interview-data",
            {
                headers: {
                    "Authorization": "Bearer " + token
                }
            }
        );

        // Convert the response into JavaScript data
        const data = await response.json();

        // Check whether the backend returned an error
        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Unable to load candidate interview data."
            );

        }

        // ====================================================
        // INTERVIEW HISTORY
        // ====================================================

        // Get interview history from the backend
        const history = data.history || [];

        // Only update the history table if it exists on this page
        if (body) {

            // If there are no interviews
            if (!history.length) {

                body.innerHTML =
                    "<tr><td colspan='4'>No completed interviews yet.</td></tr>";

            } else {

                // Create one table row for every interview
                body.innerHTML = history.map(function (item) {

                    // Convert stored date into readable date/time
                    const date = item.date
                        ? new Date(item.date).toLocaleString()
                        : "--";

                    // Show overall score if available
                    const score =
                        item.overall_score != null
                            ? item.overall_score + "/100"
                            : "Not evaluated";

                    // Create the table row
                    return (
                        "<tr>" +

                        "<td>" +
                        date +
                        "</td>" +

                        "<td>" +
                        (item.type || "Interview") +
                        "</td>" +

                        "<td>" +
                        score +
                        "</td>" +

                        "<td>" +
                        (item.status || "--") +
                        "</td>" +

                        "</tr>"
                    );

                }).join("");

            }

            // Print history in console
            console.log(
                "Interview history displayed:",
                history
            );

        }

        // ====================================================
        // ANALYTICS
        // ====================================================

        // Get the latest Analytics data directly from backend
        const analyticsResponse =
            await fetch(
                "http://127.0.0.1:8001/interviews/analytics",
                {
                    method: "GET",

                    headers: {
                        "Authorization":
                            "Bearer " +
                            localStorage.getItem("access_token")
                    }
                }
            );

        const analytics =
            await analyticsResponse.json();

        if (!analyticsResponse.ok) {
            throw new Error(
                analytics.detail ||
                "Unable to load interview analytics."
            );
        }

        console.log(
            "Analytics data received:",
            analytics
        );

        // ====================================================
        // GET ANALYTICS CARDS
        // ====================================================

        const technicalScore =
            document.getElementById("technicalScore");

        const communicationScore =
            document.getElementById("communicationScore");

        const problemSolvingScore =
            document.getElementById("problemSolvingScore");

        const confidenceScore =
            document.getElementById("confidenceScore");

        // ====================================================
        // MODULE 7 + QUESTION ANALYTICS
        // ====================================================

        const module7 =
            analytics.module7 || {};

        const questionAnalysis =
            analytics.question_analysis || {};
        // Question Analysis cards
        const questionTechnicalDepth =
            document.getElementById("questionTechnicalDepth");

        const questionAnswerQuality =
            document.getElementById("questionAnswerQuality");

        const questionRelevance =
            document.getElementById("questionRelevance");
        
        // ====================================================
        // IMPROVEMENT PROGRESS
        // ====================================================

        const technicalProgressCurrent =
            document.getElementById("technicalProgressCurrent");

        const technicalProgressBar =
            document.getElementById("technicalProgressBar");

        const communicationProgressCurrent =
            document.getElementById("communicationProgressCurrent");

        const communicationProgressBar =
            document.getElementById("communicationProgressBar");

        // Technical Development Progress
        if (
            technicalProgressCurrent &&
            questionAnalysis.technical_depth != null
        ) {
            technicalProgressCurrent.textContent =
                "Current: " +
                questionAnalysis.technical_depth +
                "/100";
        }

        if (
            technicalProgressBar &&
            questionAnalysis.technical_depth != null
        ) {
            technicalProgressBar.value =
                questionAnalysis.technical_depth;
        }

        // Behavioral Communication Progress
        if (
            communicationProgressCurrent &&
            module7.communication != null
        ) {
            communicationProgressCurrent.textContent =
                "Current: " +
                module7.communication +
                "/100";
        }

        if (
            communicationProgressBar &&
            module7.communication != null
        ) {
            communicationProgressBar.value =
                module7.communication;
        }

        // Technical Depth
        if (
            questionTechnicalDepth &&
            questionAnalysis.technical_depth != null
        ) {
            questionTechnicalDepth.textContent =
                questionAnalysis.technical_depth + "/100";
        }

        // Answer Quality
        if (
            questionAnswerQuality &&
            questionAnalysis.answer_quality != null
        ) {
            questionAnswerQuality.textContent =
                questionAnalysis.answer_quality + "/100";
        }

        // Relevance
        if (
            questionRelevance &&
            questionAnalysis.relevance != null
        ) {
            questionRelevance.textContent =
                questionAnalysis.relevance + "/100";
        }
        // Technical Depth
        if (
            technicalScore &&
            questionAnalysis.technical_depth != null
        ) {
            technicalScore.textContent =
                questionAnalysis.technical_depth +
                "/100";
        }

        // Communication
        if (
            communicationScore &&
            module7.communication != null
        ) {
            communicationScore.textContent =
                module7.communication +
                "/100";
        }

        // Overall score
        if (
            problemSolvingScore &&
            module7.overall != null
        ) {
            problemSolvingScore.textContent =
                module7.overall +
                "/100";
        }

        // Confidence
        if (
            confidenceScore &&
            module7.confidence != null
        ) {
            confidenceScore.textContent =
                module7.confidence +
                "/100";
        }

        // ====================================================
        // VISUAL AI ANALYTICS
        // ====================================================

        const visualAnalysis =
            analytics.visual_analysis || {};

        console.log(
            "Visual AI Analytics:",
            visualAnalysis
        );
        // Visual AI Analytics cards
        const eyeContactAnalytics =
            document.getElementById("eyeContactAnalytics");

        const attentionAnalytics =
            document.getElementById("attentionAnalytics");

        const facialEngagementAnalytics =
            document.getElementById("facialEngagementAnalytics");

        // Eye Contact
        if (
            eyeContactAnalytics &&
            visualAnalysis.eye_contact != null
        ) {
            eyeContactAnalytics.textContent =
                visualAnalysis.eye_contact + "/100";
        }

        // Attention
        if (
            attentionAnalytics &&
            visualAnalysis.attention != null
        ) {
            attentionAnalytics.textContent =
                visualAnalysis.attention + "/100";
        }

        // Facial Engagement
        if (
            facialEngagementAnalytics &&
            visualAnalysis.facial_engagement != null
        ) {
            facialEngagementAnalytics.textContent =
                visualAnalysis.facial_engagement + "/100";
        }
        // ====================================================
        // PERFORMANCE TRENDS
        // ====================================================

        const trendOverallScore =
            document.getElementById("trendOverallScore");

        const trendPreviousScore =
            document.getElementById("trendPreviousScore");

        const trendScoreChange =
            document.getElementById("trendScoreChange");

        const performanceTrendText =
            document.getElementById("performanceTrendText");


        // Get completed interviews that have scores
        const scoredInterviews = history
            .filter(function(item) {
                return (
                    item.status === "completed" &&
                    item.overall_score != null
                );
            })
            .sort(function(a, b) {
                return new Date(b.date) - new Date(a.date);
            });


        // Latest interview score
        if (scoredInterviews.length >= 1) {

            const latestScore =
                Number(scoredInterviews[0].overall_score);

            if (trendOverallScore) {
                trendOverallScore.textContent =
                    latestScore + "/100";
            }

            // Previous interview score
            if (scoredInterviews.length >= 2) {

                const previousScore =
                    Number(scoredInterviews[1].overall_score);

                const change =
                    latestScore - previousScore;

                if (trendPreviousScore) {
                    trendPreviousScore.textContent =
                        previousScore + "/100";
                }

                if (trendScoreChange) {

                    const sign =
                        change > 0 ? "+" : "";

                    trendScoreChange.textContent =
                        sign + change.toFixed(1);
                }


                // Determine performance trend
                if (performanceTrendText) {

                    if (change > 2) {

                        performanceTrendText.textContent =
                            "Your performance is improving compared with your previous interview.";

                    } else if (change < -2) {

                        performanceTrendText.textContent =
                            "Your performance has decreased compared with your previous interview. Focus on the weaker areas below.";

                    } else {

                        performanceTrendText.textContent =
                            "Your performance is relatively stable compared with your previous interview.";
                    }
                }

            } else {

                if (trendPreviousScore) {
                    trendPreviousScore.textContent =
                        "N/A";
                }

                if (trendScoreChange) {
                    trendScoreChange.textContent =
                        "N/A";
                }

                if (performanceTrendText) {
                    performanceTrendText.textContent =
                        "Complete another interview to compare your performance trend.";
                }
            }

        } else {

            if (trendOverallScore) {
                trendOverallScore.textContent =
                    "N/A";
            }

            if (trendPreviousScore) {
                trendPreviousScore.textContent =
                    "N/A";
            }

            if (trendScoreChange) {
                trendScoreChange.textContent =
                    "N/A";
            }
        }


        // ====================================================
        // WEAK AREA PREDICTION
        // ====================================================

        const weakAreasContainer =
            document.getElementById("weakAreasContainer");

        if (weakAreasContainer) {

            const weakAreas = [];


            // Technical performance
            if (
                questionAnalysis.technical_depth != null &&
                Number(questionAnalysis.technical_depth) < 60
            ) {
                weakAreas.push(
                    "Technical Knowledge"
                );
            }


            // Answer quality
            if (
                questionAnalysis.answer_quality != null &&
                Number(questionAnalysis.answer_quality) < 60
            ) {
                weakAreas.push(
                    "Answer Quality"
                );
            }


            // Relevance
            if (
                questionAnalysis.relevance != null &&
                Number(questionAnalysis.relevance) < 60
            ) {
                weakAreas.push(
                    "Answer Relevance"
                );
            }


            // Communication
            if (
                module7.communication != null &&
                Number(module7.communication) < 60
            ) {
                weakAreas.push(
                    "Communication"
                );
            }


            // Confidence
            if (
                module7.confidence != null &&
                Number(module7.confidence) < 60
            ) {
                weakAreas.push(
                    "Confidence"
                );
            }


            // Visual AI: eye contact
            if (
                visualAnalysis.eye_contact != null &&
                Number(visualAnalysis.eye_contact) < 60
            ) {
                weakAreas.push(
                    "Eye Contact"
                );
            }


            // Visual AI: attention
            if (
                visualAnalysis.attention != null &&
                Number(visualAnalysis.attention) < 60
            ) {
                weakAreas.push(
                    "Attention"
                );
            }


            // Display weak areas
            if (weakAreas.length === 0) {

                weakAreasContainer.innerHTML =
                    "<p><strong>Good performance!</strong> No major weak areas detected in the latest interview.</p>";

            } else {

                weakAreasContainer.innerHTML =
                    "<ul>" +
                    weakAreas.map(function(area) {
                        return "<li>" + area + "</li>";
                    }).join("") +
                    "</ul>";
            }
        }
        // Print final analytics
        console.log(
            "Analytics displayed:",
            analytics
        );
    }
    catch (error) {
        console.error(
            "Error loading candidate interview data:",
            error
        );
    }

} // End of loadCandidateInterviewData()
// ============================================================
// INTERVIEW HISTORY
// ============================================================

function loadInterviewHistory(
    interviews
) {

    // Find the table body from candidate.html
    const tableBody =
        document.getElementById(
            "historyTableBody"
        );


    // Stop if the element does not exist
    if (!tableBody) {

        return;
    }


    // Clear existing rows
    tableBody.innerHTML =
        "";


    // Show message if there are no interviews
    if (
        !Array.isArray(interviews) ||
        interviews.length === 0
    ) {

        tableBody.innerHTML =
            `
            <tr>
                <td colspan="4">
                    No completed interviews yet.
                </td>
            </tr>
            `;

        return;
    }


    // Add every interview to the table
    interviews.forEach(
        function(interview) {

            // Create a table row
            const row =
                document.createElement("tr");


            // Format the date
            let formattedDate =
                "--";


            if (interview.end_time) {

                formattedDate =
                    new Date(
                        interview.end_time
                    ).toLocaleString();

            }


            // Create the table row
            row.innerHTML =
                `
                <td>
                    ${formattedDate}
                </td>

                <td>
                    ${interview.interview_type || "--"}
                </td>

                <td>
                    ${interview.overall_score ?? "--"}
                </td>

                <td>
                    ${interview.status || "--"}
                </td>
                `;


            // Add the row to the table
            tableBody.appendChild(
                row
            );

        }
    );

}

// ============================================================
// ANALYTICS
// ============================================================

function loadCandidateAnalytics(
    analytics
) {

    // Technical score
    const technicalScore =
        document.getElementById(
            "technicalScore"
        );


    // Communication score
    const communicationScore =
        document.getElementById(
            "communicationScore"
        );


    // Problem solving score
    const problemSolvingScore =
        document.getElementById(
            "problemSolvingScore"
        );


    // Confidence score
    const confidenceScore =
        document.getElementById(
            "confidenceScore"
        );


    // ========================================================
    // TECHNICAL SCORE
    // ========================================================

    if (technicalScore) {

        technicalScore.textContent =
            analytics.technical_score ??
            "--";

    }


    // ========================================================
    // COMMUNICATION SCORE
    // ========================================================

    if (communicationScore) {

        communicationScore.textContent =
            analytics.communication_score ??
            "--";

    }


    // ========================================================
    // PROBLEM SOLVING SCORE
    // ========================================================

    if (problemSolvingScore) {

        problemSolvingScore.textContent =
            analytics.problem_solving_score ??
            "--";

    }


    // ========================================================
    // CONFIDENCE SCORE
    // ========================================================

    if (confidenceScore) {

        confidenceScore.textContent =
            analytics.confidence_score ??
            "--";

    }

}


// ============================================================
// REPORT
// ============================================================

function loadCandidateReport(
    report
) {

    // Find report container
    const container =
        document.getElementById(
            "reportContainer"
        );


    // Stop if the element does not exist
    if (!container) {

        return;
    }


    // If no report exists
    if (
        !report ||
        Object.keys(report).length === 0
    ) {

        return;
    }


    // Display real report information
    container.innerHTML =
        `
        <h2>
            Interview Assessment
        </h2>

        <p>
            Your latest interview assessment is ready.
        </p>

        <div class="card-grid">

            <div class="card">

                <h3>
                    Overall Score
                </h3>

                <p class="big-number">
                    ${report.overall_score ?? "--"}
                </p>

            </div>


            <div class="card">

                <h3>
                    Technical Score
                </h3>

                <p class="big-number">
                    ${report.technical_score ?? "--"}
                </p>

            </div>


            <div class="card">

                <h3>
                    Answer Quality
                </h3>

                <p class="big-number">
                    ${report.answer_quality_score ?? "--"}
                </p>

            </div>


            <div class="card">

                <h3>
                    Relevance
                </h3>

                <p class="big-number">
                    ${report.relevance_score ?? "--"}
                </p>

            </div>

        </div>

        <br>

        <h3>
            Feedback
        </h3>

        <p>
            ${report.feedback || "No feedback available."}
        </p>
        `;

}


// ============================================================
// PROGRESS
// ============================================================

function loadCandidateProgress(
    progress
) {

    // Get all progress cards
    const progressCards =
        document.querySelectorAll(
            "#progress .large-card"
        );


    // Stop if there are no cards
    if (
        !progressCards ||
        progressCards.length === 0
    ) {

        return;
    }


    // ========================================================
    // SYSTEM DESIGN
    // ========================================================

    if (progressCards[0]) {

        const current =
            progressCards[0].querySelector(
                "p:nth-of-type(1)"
            );


        const target =
            progressCards[0].querySelector(
                "p:nth-of-type(2)"
            );


        const progressBar =
            progressCards[0].querySelector(
                "progress"
            );


        if (current) {

            current.textContent =
                "Current: " +
                (
                    progress.system_design_current ??
                    "--"
                );

        }


        if (target) {

            target.textContent =
                "Target: " +
                (
                    progress.system_design_target ??
                    "--"
                );

        }


        if (progressBar) {

            progressBar.value =
                Number(
                    progress.system_design_current ||
                    0
                );

        }

    }


    // ========================================================
    // BEHAVIORAL COMMUNICATION
    // ========================================================

    if (progressCards[1]) {

        const current =
            progressCards[1].querySelector(
                "p:nth-of-type(1)"
            );


        const target =
            progressCards[1].querySelector(
                "p:nth-of-type(2)"
            );


        const progressBar =
            progressCards[1].querySelector(
                "progress"
            );


        if (current) {

            current.textContent =
                "Current: " +
                (
                    progress.behavioral_current ??
                    "--"
                );

        }


        if (target) {

            target.textContent =
                "Target: " +
                (
                    progress.behavioral_target ??
                    "--"
                );

        }


        if (progressBar) {

            progressBar.value =
                Number(
                    progress.behavioral_current ||
                    0
                );

        }

    }

}


// ============================================================
// LOAD DATA WHEN CANDIDATE PAGE OPENS
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    function() {

        // Check whether this is the candidate page
        const historyTable =
            document.getElementById(
                "historyTableBody"
            );


        // Only load candidate data
        // when candidate.html is open
        if (historyTable) {

            loadCandidateInterviewData();

        }

    }
);

function escapeHtml(value) {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ============================================================
// INTERVIEW CAMERA + MICROPHONE
// ============================================================

let interviewMediaStream = null;


// ============================================================
// START CAMERA + MICROPHONE
// ============================================================

async function startInterviewMedia() {

    const video =
        document.getElementById(
            "interviewCamera"
        );

    const status =
        document.getElementById(
            "mediaStatus"
        );

    if (!video || !status) {

        console.error(
            "Camera elements not found."
        );

        return;
    }

    try {

        // Request camera and microphone permission
        interviewMediaStream =
            await navigator.mediaDevices.getUserMedia(
                {
                    video: true,
                    audio: true
                }
            );

        // Connect camera stream to video element
        video.srcObject =
            interviewMediaStream;
        // Start Visual AI frame capture
        startVisualAnalysis();
        // Update status
        status.textContent =
            "✅ Camera and microphone are active.";

        console.log(
            "Interview media started successfully."
        );

    } catch (error) {

        console.error(
            "Camera/microphone error:",
            error
        );

        status.textContent =
            "❌ Camera or microphone permission was denied or unavailable.";

    }
}
// ============================================================
// VISUAL AI FRAME CAPTURE
// ============================================================
let visualAnalysisInterval = null;

function startVisualAnalysis() {
    const video = document.getElementById("interviewCamera");
    const canvas = document.getElementById("visualAnalysisCanvas");

    if (!video || !canvas) {
        console.error("Visual AI elements not found.");
        return;
    }

    video.addEventListener("loadedmetadata", function () {

        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;

        console.log("Visual AI continuous analysis started.");

        // Capture a frame every 2 seconds
        visualAnalysisInterval = setInterval(() => {

            // Make sure the camera is still active
            if (video.readyState < 2) {
                return;
            }

            const context = canvas.getContext("2d");

            context.drawImage(
                video,
                0,
                0,
                canvas.width,
                canvas.height
            );

            const frameData = canvas.toDataURL(
                "image/jpeg",
                0.7
            );

            console.log(
                "Visual AI frame captured:",
                frameData.length
            );

            sendVisualFrame(frameData);

        }, 2000);

    }, { once: true });
}
// ============================================================
// SEND VISUAL FRAME TO BACKEND
// ============================================================
async function sendVisualFrame(frameData) {
    const token = localStorage.getItem("access_token");

    if (!token || !currentInterviewSession || !currentInterviewSession.session_id) {
        console.error("Visual AI: session information is missing.");
        return;
    }

    try {
        const response = await fetch(
            "http://127.0.0.1:8001/interviews/sessions/" +
            currentInterviewSession.session_id +
            "/visual-analysis",
            {
                method: "POST",
                headers: {
                    "Authorization": "Bearer " + token,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    image: frameData
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error("Visual AI analysis failed:", data);
            return;
        }

        console.log("Visual AI result:", data);
        // ============================================================
        // ACCUMULATE VISUAL AI RESULTS
        // ============================================================

        visualSampleCount++;

        if (data.eyeContact === true) {
            visualEyeContactCount++;
        }

        // Count detected emotion
        const detectedEmotion = (data.emotion || "neutral").toLowerCase();

        if (visualEmotionCounts.hasOwnProperty(detectedEmotion)) {
            visualEmotionCounts[detectedEmotion]++;
        }

        console.log("Visual AI samples:", visualSampleCount);
        console.log("Eye contact samples:", visualEyeContactCount);
        console.log("Emotion counts:", visualEmotionCounts);

    } catch (error) {
        console.error("Visual AI connection error:", error);
    }
}
// ============================================================
// STOP CAMERA + MICROPHONE
// ============================================================

function stopInterviewMedia() {

    const video =
        document.getElementById(
            "interviewCamera"
        );

    const status =
        document.getElementById(
            "mediaStatus"
        );

    if (interviewMediaStream) {

        // Stop every camera/microphone track
        interviewMediaStream
            .getTracks()
            .forEach(
                function(track) {
                    track.stop();
                }
            );

        interviewMediaStream = null;

    }

    // Remove video preview
    if (video) {

        video.srcObject = null;

    }

    // Update status
    if (status) {

        status.textContent =
            "Camera and microphone are stopped.";

    }

    console.log(
        "Interview media stopped."
    );
}
// ============================================================
// SPEECH TO TEXT
// ============================================================

let speechRecognition = null;
let isSpeechRecognizing = false;


// ============================================================
// START SPEECH RECOGNITION
// ============================================================

function startSpeechRecognition() {

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;


    if (!SpeechRecognition) {

        alert(
            "Speech recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge."
        );

        return;

    }


    if (isSpeechRecognizing) {

        return;

    }


    speechRecognition =
        new SpeechRecognition();


    speechRecognition.continuous = true;

    speechRecognition.interimResults = true;

    speechRecognition.lang = "en-IN";


    speechRecognition.onstart = function () {

        isSpeechRecognizing = true;


        const status =
            document.getElementById(
                "speechStatus"
            );


        if (status) {

            status.textContent =
                "🎤 Listening... Speak your answer.";

        }


        const startButton =
            document.getElementById(
                "speechStartButton"
            );


        const stopButton =
            document.getElementById(
                "speechStopButton"
            );


        if (startButton) {

            startButton.disabled = true;

        }


        if (stopButton) {

            stopButton.disabled = false;

        }

    };


    speechRecognition.onresult =
        function (event) {

            let finalTranscript = "";


            for (
                let i = event.resultIndex;
                i < event.results.length;
                i++
            ) {

                if (
                    event.results[i].isFinal
                ) {

                    finalTranscript +=
                        event.results[i][0].transcript;

                }

            }


            if (finalTranscript) {

                const answerBox =
                    document.getElementById(
                        "answerBox"
                    );


                if (answerBox) {

                    const existingText =
                        answerBox.value.trim();


                    answerBox.value =
                        existingText
                            ? existingText +
                              " " +
                              finalTranscript.trim()
                            : finalTranscript.trim();

                }

            }

        };


    speechRecognition.onerror =
        function (event) {

            console.error(
                "Speech recognition error:",
                event.error
            );


            const status =
                document.getElementById(
                    "speechStatus"
                );


            if (status) {

                status.textContent =
                    "Speech recognition error: " +
                    event.error;

            }

        };


    speechRecognition.onend =
        function () {

            isSpeechRecognizing =
                false;


            const startButton =
                document.getElementById(
                    "speechStartButton"
                );


            const stopButton =
                document.getElementById(
                    "speechStopButton"
                );


            if (startButton) {

                startButton.disabled =
                    false;

            }


            if (stopButton) {

                stopButton.disabled =
                    true;

            }


            const status =
                document.getElementById(
                    "speechStatus"
                );


            if (status) {

                status.textContent =
                    "Speech recognition stopped.";

            }

        };


    speechRecognition.start();

}


// ============================================================
// STOP SPEECH RECOGNITION
// ============================================================

function stopSpeechRecognition() {

    if (
        speechRecognition &&
        isSpeechRecognizing
    ) {

        speechRecognition.stop();

    }

}
// ============================================================
// FILLER WORD ANALYSIS
// ============================================================

function analyzeFillerWords(text) {

    if (!text || !text.trim()) {

        return {
            totalWords: 0,
            fillerCount: 0,
            fillerWords: {},
            fillerPercentage: 0
        };

    }


    const fillerList = [
        "um",
        "uh",
        "er",
        "ah",
        "like",
        "actually",
        "basically",
        "literally",
        "you know",
        "i mean",
        "sort of",
        "kind of"
    ];


    const lowerText =
        text.toLowerCase();


    const words =
        lowerText.match(/\b[\w']+\b/g) || [];


    const totalWords =
        words.length;


    const fillerWords = {};

    let fillerCount = 0;


    // Count single-word fillers
    fillerList.forEach(function(filler) {

        if (filler.includes(" ")) {

            return;

        }


        const pattern =
            new RegExp(
                "\\b" + filler + "\\b",
                "gi"
            );


        const matches =
            lowerText.match(pattern);


        if (matches && matches.length > 0) {

            fillerWords[filler] =
                matches.length;

            fillerCount +=
                matches.length;

        }

    });


    // Count multi-word fillers
    [
        "you know",
        "i mean",
        "sort of",
        "kind of"
    ].forEach(function(filler) {

        const pattern =
            new RegExp(
                "\\b" +
                filler.replace(/ /g, "\\s+") +
                "\\b",
                "gi"
            );


        const matches =
            lowerText.match(pattern);


        if (matches && matches.length > 0) {

            fillerWords[filler] =
                matches.length;

            fillerCount +=
                matches.length;

        }

    });


    const fillerPercentage =
        totalWords > 0
            ? ((fillerCount / totalWords) * 100)
                .toFixed(2)
            : 0;


    return {

        totalWords:
            totalWords,

        fillerCount:
            fillerCount,

        fillerWords:
            fillerWords,

        fillerPercentage:
            Number(fillerPercentage)

    };

}
// ============================================================
// STOP VISUAL AI ANALYSIS AND CALCULATE FINAL METRICS
// ============================================================
function stopVisualAnalysis() {

    // Stop the 2-second frame capture
    if (visualAnalysisInterval) {
        clearInterval(visualAnalysisInterval);
        visualAnalysisInterval = null;
    }

    // Avoid division by zero
    if (visualSampleCount === 0) {
        console.warn("No Visual AI samples were collected.");
        return;
    }

    // --------------------------------------------------------
    // Eye Contact Percentage
    // --------------------------------------------------------
    const eyeContactPercentage =
        (visualEyeContactCount / visualSampleCount) * 100;

    // --------------------------------------------------------
    // Attention Score
    // For now, attention is based on eye contact.
    // --------------------------------------------------------
    const attentionScore = eyeContactPercentage;

    // --------------------------------------------------------
    // Emotion Distribution
    // --------------------------------------------------------
    const emotionDistribution = {};

    Object.keys(visualEmotionCounts).forEach((emotion) => {
        emotionDistribution[emotion] =
            (visualEmotionCounts[emotion] / visualSampleCount) * 100;
    });

    // --------------------------------------------------------
    // Facial Engagement
    // Non-neutral emotions indicate visible facial engagement.
    // --------------------------------------------------------
    const engagedSamples =
        visualEmotionCounts.happy +
        visualEmotionCounts.fear +
        visualEmotionCounts.surprise;

    const facialEngagementScore =
        (engagedSamples / visualSampleCount) * 100;

    // --------------------------------------------------------
    // Dominant Emotion
    // --------------------------------------------------------
    let dominantEmotion = "neutral";
    let highestCount = -1;

    Object.keys(visualEmotionCounts).forEach((emotion) => {
        if (visualEmotionCounts[emotion] > highestCount) {
            highestCount = visualEmotionCounts[emotion];
            dominantEmotion = emotion;
        }
    });

    // --------------------------------------------------------
    // Store final Visual AI results
    // --------------------------------------------------------
    interviewVisualAnalysis = {
        eyeContactPercentage: Number(
            eyeContactPercentage.toFixed(2)
        ),

        attentionScore: Number(
            attentionScore.toFixed(2)
        ),

        facialEngagementScore: Number(
            facialEngagementScore.toFixed(2)
        ),

        dominantEmotion: dominantEmotion,

        emotionDistribution: emotionDistribution
    };

    console.log(
        "Final Visual AI Analysis:",
        interviewVisualAnalysis
    );
    }
// ============================================================
// RECRUITER DASHBOARD
// ============================================================

async function loadRecruiterDashboard() {

    const token = localStorage.getItem("access_token");

    if (!token) {
        console.error("No recruiter token found.");
        return;
    }

    try {

        const response = await fetch(
            "http://127.0.0.1:8001/recruiter/dashboard",
            {
                method: "GET",
                headers: {
                    "Authorization": "Bearer " + token
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error(
                "Recruiter dashboard error:",
                data
            );
            return;
        }

        document.getElementById("totalCandidates").textContent =
            data.total_candidates;

        document.getElementById("totalInterviews").textContent =
            data.total_completed_interviews;

        document.getElementById("averageScore").textContent =
            data.average_candidate_score + "%";
        // ============================================================
        // RECRUITER CANDIDATE ANALYTICS
        // ============================================================

        const technicalScore =
            document.getElementById("recruiterTechnicalScore");

        const communicationScore =
            document.getElementById("recruiterCommunicationScore");

        const problemSolvingScore =
            document.getElementById("recruiterProblemSolvingScore");

        const confidenceScore =
            document.getElementById("recruiterConfidenceScore");

        // Calculate averages from all candidates
        const candidates = data.candidates || [];

        function calculateAverage(field) {

            const values = candidates
                .map(candidate => Number(candidate[field]))
                .filter(value => !isNaN(value) && value > 0);

            if (values.length === 0) {
                return "--";
            }

            return (
                values.reduce(
                    (sum, value) => sum + value,
                    0
                ) / values.length
            ).toFixed(1) + "%";
        }

        // Technical Skills
        if (technicalScore) {
            technicalScore.textContent =
                calculateAverage("technical_score");
        }

        // Communication
        if (communicationScore) {
            communicationScore.textContent =
                calculateAverage("communication_score");
        }

        // Problem Solving
        if (problemSolvingScore) {
            problemSolvingScore.textContent =
                calculateAverage("overall_score");
        }

        // Confidence
        if (confidenceScore) {
            confidenceScore.textContent =
                calculateAverage("confidence_score");
        }

        // Display recent candidates
        const candidatesBody =
            document.getElementById("recentCandidatesBody");

        if (candidatesBody) {

            candidatesBody.innerHTML = "";

            if (data.candidates.length === 0) {

                candidatesBody.innerHTML = `
                    <tr>
                        <td colspan="4">
                            No candidates found.
                        </td>
                    </tr>
                `;

            } else {

                data.candidates.forEach(function(candidate) {

                    const row =
                        document.createElement("tr");

                    let statusClass = "status-warning";

                    if (candidate.latest_score >= 75) {
                        statusClass = "status-good";
                    } else if (candidate.latest_score >= 60) {
                        statusClass = "status-review";
                    }

                    row.innerHTML = `
                        <td>${candidate.candidate_name}</td>
                        <td>Candidate</td>
                        <td>${candidate.latest_score}%</td>
                        <td>
                            <span class="${statusClass}">
                                ${candidate.status}
                            </span>
                        </td>
                    `;

                    candidatesBody.appendChild(row);

                });
            }
        }

        console.log(
            "Recruiter dashboard loaded:",
            data
        );

    } catch (error) {

        console.error(
            "Error loading recruiter dashboard:",
            error
        );

    }
}


// ============================================================
// AUTO LOAD RECRUITER DASHBOARD
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        if (
            document.getElementById(
                "totalCandidates"
            )
        ) {
            loadRecruiterDashboard();
        }
        if (
            document.getElementById(
                "interviewSessionsBody"
            )
        ) {
            loadInterviewSessions();
        }

    }
);




// ============================================================
// LOAD RECRUITER INTERVIEW SESSIONS
// ============================================================

async function loadInterviewSessions() {

    const token =
        localStorage.getItem("access_token");

    if (!token) {
        console.error(
            "No recruiter token found."
        );
        return;
    }

    try {

        const response =
            await fetch(
                "http://127.0.0.1:8001/recruiter/dashboard",
                {
                    method: "GET",

                    headers: {
                        "Authorization":
                            "Bearer " + token
                    }
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            console.error(
                "Interview sessions error:",
                data
            );

            throw new Error(
                "Failed to load interview sessions"
            );
        }

        const tbody =
            document.getElementById(
                "interviewSessionsBody"
            );

        if (!tbody) {
            return;
        }

        tbody.innerHTML = "";

        if (
            !data.sessions ||
            data.sessions.length === 0
        ) {

            tbody.innerHTML = `
                <tr>
                    <td colspan="7">
                        No interview sessions found.
                    </td>
                </tr>
            `;

            return;
        }

        data.sessions.forEach(
            function (session) {

                const row =
                    document.createElement("tr");

                // ----------------------------------------
                // DATE
                // ----------------------------------------

                let formattedDate = "-";

                if (session.date) {

                    formattedDate =
                        new Date(
                            session.date
                        ).toLocaleDateString(
                            "en-IN"
                        );
                }

                // ----------------------------------------
                // DURATION
                // ----------------------------------------

                let durationText = "-";

                if (
                    session.duration !== null &&
                    session.duration !== undefined
                ) {

                    const totalSeconds =
                        Number(
                            session.duration
                        );

                    const minutes =
                        Math.floor(
                            totalSeconds / 60
                        );

                    const seconds =
                        Math.floor(
                            totalSeconds % 60
                        );

                    durationText =
                        `${minutes}m ${seconds}s`;
                }

                // ----------------------------------------
                // TABLE ROW
                // ----------------------------------------

                row.innerHTML = `

                    <td>
                        ${session.candidate_name || "-"}
                    </td>

                    <td>
                        ${session.role || "-"}
                    </td>

                    <td>
                        ${formattedDate}
                    </td>

                    <td>
                        ${session.type || "-"}
                    </td>

                    <td>
                        ${session.status || "-"}
                    </td>

                    <td>
                        ${durationText}
                    </td>

                    <td>

                        <button
                            class="small-btn"
                            onclick="viewCandidateReport(
                                ${session.candidate_id},
                                '${session.candidate_name}'
                            )"
                        >
                            View Report
                        </button>

                    </td>

                `;

                tbody.appendChild(row);
            }
        );

        console.log(
            "Interview sessions loaded:",
            data.sessions
        );

    }

    catch (error) {

        console.error(
            "Interview sessions error:",
            error
        );

        const tbody =
            document.getElementById(
                "interviewSessionsBody"
            );

        if (tbody) {

            tbody.innerHTML = `
                <tr>
                    <td colspan="7">
                        Unable to load interview sessions.
                    </td>
                </tr>
            `;
        }
    }
}
// ============================================================
// RECRUITER CANDIDATE REPORTS
// ============================================================

async function loadCandidateReports() {

    const token = localStorage.getItem("access_token");

    if (!token) {
        console.error("No recruiter token found.");
        return;
    }

    try {

        const response = await fetch(
            "http://127.0.0.1:8001/recruiter/dashboard",
            {
                method: "GET",
                headers: {
                    "Authorization": "Bearer " + token
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error(
                "Candidate reports error:",
                data
            );
            return;
        }

        const reportsBody =
            document.getElementById(
                "candidateReportsBody"
            );

        if (!reportsBody) {
            return;
        }

        reportsBody.innerHTML = "";

        if (data.candidates.length === 0) {

            reportsBody.innerHTML = `
                <tr>
                    <td colspan="5">
                        No candidate reports available.
                    </td>
                </tr>
            `;

            return;
        }

        data.candidates.forEach(function(candidate) {

            const row =
                document.createElement("tr");

            let recommendation = "Needs Review";

            if (candidate.latest_score >= 75) {

                recommendation = "Strong Candidate";

            } else if (candidate.latest_score >= 60) {

                recommendation = "Consider";

            }

            row.innerHTML = `

                <td>
                    ${candidate.candidate_name}
                </td>

                <td>
                    Candidate
                </td>

                <td>
                    ${candidate.latest_score}%
                </td>

                <td>
                    ${recommendation}
                </td>

                <td>

                    <button
                        class="small-btn"
                        onclick="viewCandidateReport(${candidate.candidate_id}, '${candidate.candidate_name}')"
                    >
                        View
                    </button>

                </td>

            `;

            reportsBody.appendChild(row);

        });

    } catch (error) {

        console.error(
            "Error loading candidate reports:",
            error
        );
    }
}
// ============================================================
// LOAD RECRUITER CANDIDATE ANALYTICS
// ============================================================

async function loadRecruiterCandidateAnalytics() {

    const token =
        localStorage.getItem("access_token");

    if (!token) {
        console.error("No recruiter token found.");
        return;
    }

    try {

        const response =
            await fetch(
                "http://127.0.0.1:8001/recruiter/dashboard",
                {
                    method: "GET",
                    headers: {
                        "Authorization":
                            "Bearer " + token
                    }
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            console.error(
                "Recruiter analytics error:",
                data
            );

            return;
        }

        // ----------------------------------------------------
        // ANALYTICS TABLE
        // ----------------------------------------------------

        const analyticsBody =
            document.getElementById(
                "candidateAnalyticsBody"
            );

        if (!analyticsBody) {
            return;
        }

        analyticsBody.innerHTML = "";

        if (!data.candidates.length) {

            analyticsBody.innerHTML = `
                <tr>
                    <td colspan="4">
                        No candidate analytics available.
                    </td>
                </tr>
            `;

            return;
        }

        data.candidates.forEach(function(candidate) {

            const row =
                document.createElement("tr");

            row.innerHTML = `
                <td>
                    ${candidate.candidate_name}
                </td>

                <td>
                    ${candidate.technical_score}%
                </td>

                <td>
                    ${candidate.communication_score}%
                </td>

                <td>
                    ${candidate.average_score}%
                </td>
            `;

            analyticsBody.appendChild(row);

        });

        // ----------------------------------------------------
        // ANALYTICS CARDS
        // ----------------------------------------------------

        const candidatesWithScores =
            data.candidates.filter(function(candidate) {
                return candidate.completed_interviews > 0;
            });

        if (candidatesWithScores.length) {

            function average(values) {

                if (!values.length) {
                    return 0;
                }

                return (
                    values.reduce(
                        function(sum, value) {
                            return sum + Number(value);
                        },
                        0
                    ) / values.length
                ).toFixed(1);
            }

            const technicalAverage =
                average(
                    candidatesWithScores.map(
                        candidate =>
                            candidate.technical_score
                    )
                );

            const communicationAverage =
                average(
                    candidatesWithScores.map(
                        candidate =>
                            candidate.communication_score
                    )
                );

            const confidenceAverage =
                average(
                    candidatesWithScores.map(
                        candidate =>
                            candidate.confidence_score
                    )
                );

            const technicalElement =
                document.getElementById(
                    "analyticsTechnical"
                );

            const communicationElement =
                document.getElementById(
                    "analyticsCommunication"
                );

            const confidenceElement =
                document.getElementById(
                    "analyticsConfidence"
                );
            const technicalRelevanceElement =
                document.getElementById(
                    "analyticsTechnicalRelevance"
                );

            if (technicalElement) {
                technicalElement.textContent =
                    technicalAverage + "%";
            }

            if (communicationElement) {
                communicationElement.textContent =
                    communicationAverage + "%";
            }

            if (confidenceElement) {
                confidenceElement.textContent =
                    confidenceAverage + "%";
            }
            if (technicalRelevanceElement) {
                technicalRelevanceElement.textContent =
                    technicalAverage + "%";
            }
        }

        console.log(
            "Recruiter candidate analytics loaded:",
            data
        );

    } catch (error) {

        console.error(
            "Error loading recruiter analytics:",
            error
        );

    }
}
// ============================================================
// RECRUITER — COMPARE CANDIDATES
// ============================================================

let recruiterCandidates = [];

async function loadCompareCandidates() {

    const token =
        localStorage.getItem("access_token");

    if (!token) {
        console.error("No recruiter token found.");
        return;
    }

    try {

        const response =
            await fetch(
                "http://127.0.0.1:8001/recruiter/dashboard",
                {
                    method: "GET",
                    headers: {
                        "Authorization":
                            "Bearer " + token
                    }
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            console.error(
                "Compare candidates error:",
                data
            );

            return;
        }

        recruiterCandidates =
            data.candidates || [];

        const select1 =
            document.getElementById(
                "compareCandidate1"
            );

        const select2 =
            document.getElementById(
                "compareCandidate2"
            );

        if (!select1 || !select2) {
            return;
        }

        recruiterCandidates.forEach(
            function(candidate) {

                const option1 =
                    document.createElement("option");

                option1.value =
                    candidate.candidate_id;

                option1.textContent =
                    candidate.candidate_name;

                select1.appendChild(option1);


                const option2 =
                    document.createElement("option");

                option2.value =
                    candidate.candidate_id;

                option2.textContent =
                    candidate.candidate_name;

                select2.appendChild(option2);

            }
        );


        // Update comparison when selection changes

        select1.addEventListener(
            "change",
            updateCandidateComparison
        );

        select2.addEventListener(
            "change",
            updateCandidateComparison
        );


        console.log(
            "Compare candidates loaded:",
            recruiterCandidates
        );

    } catch (error) {

        console.error(
            "Error loading compare candidates:",
            error
        );

    }
}


// ============================================================
// UPDATE COMPARISON TABLE
// ============================================================

function updateCandidateComparison() {

    const id1 =
        document.getElementById(
            "compareCandidate1"
        ).value;

    const id2 =
        document.getElementById(
            "compareCandidate2"
        ).value;


    const candidate1 =
        recruiterCandidates.find(
            function(candidate) {
                return String(
                    candidate.candidate_id
                ) === String(id1);
            }
        );


    const candidate2 =
        recruiterCandidates.find(
            function(candidate) {
                return String(
                    candidate.candidate_id
                ) === String(id2);
            }
        );


    if (!candidate1 || !candidate2) {
        return;
    }


    // Candidate names

    document.getElementById(
        "compareName1"
    ).textContent =
        candidate1.candidate_name;


    document.getElementById(
        "compareName2"
    ).textContent =
        candidate2.candidate_name;


    // Technical

    document.getElementById(
        "compareTechnical1"
    ).textContent =
        candidate1.technical_score + "%";


    document.getElementById(
        "compareTechnical2"
    ).textContent =
        candidate2.technical_score + "%";


    // Communication

    document.getElementById(
        "compareCommunication1"
    ).textContent =
        candidate1.communication_score + "%";


    document.getElementById(
        "compareCommunication2"
    ).textContent =
        candidate2.communication_score + "%";


    // Technical Relevance

    document.getElementById(
        "compareRelevance1"
    ).textContent =
        candidate1.technical_score + "%";


    document.getElementById(
        "compareRelevance2"
    ).textContent =
        candidate2.technical_score + "%";


    // Confidence

    document.getElementById(
        "compareConfidence1"
    ).textContent =
        candidate1.confidence_score + "%";


    document.getElementById(
        "compareConfidence2"
    ).textContent =
        candidate2.confidence_score + "%";


    // Professionalism

    document.getElementById(
        "compareProfessionalism1"
    ).textContent =
        candidate1.professionalism_score + "%";


    document.getElementById(
        "compareProfessionalism2"
    ).textContent =
        candidate2.professionalism_score + "%";


    // Overall

    document.getElementById(
        "compareOverall1"
    ).textContent =
        candidate1.average_score + "%";


    document.getElementById(
        "compareOverall2"
    ).textContent =
        candidate2.average_score + "%";
}


// ============================================================
// AUTO LOAD COMPARE CANDIDATES
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    function() {

        if (
            document.getElementById(
                "compareCandidate1"
            )
        ) {

            loadCompareCandidates();

        }

    }
);
// ============================================================
// AUTO LOAD CANDIDATE REPORTS
// ============================================================

document.addEventListener("DOMContentLoaded", function () {

    if (document.getElementById("candidateReportsBody")) {
        loadCandidateReports();
    }
    loadUpcomingInterview();
    startInterviewReminder();

});
// ============================================================
// AUTO LOAD RECRUITER ANALYTICS
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    function() {

        if (
            document.getElementById(
                "candidateAnalyticsBody"
            )
        ) {
            loadRecruiterCandidateAnalytics();
        }

    }
);
// ============================================================
// ADMIN DASHBOARD
// ============================================================

async function loadAdminDashboard() {

    const token =
        localStorage.getItem("access_token");

    if (!token) {
        return;
    }

    try {

        const response =
            await fetch(
                "http://127.0.0.1:8001/admin/dashboard",
                {
                    method: "GET",

                    headers: {
                        "Authorization":
                            "Bearer " + token
                    }
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            console.error(
                "Admin dashboard error:",
                data
            );

            return;
        }

        // ====================================================
        // DASHBOARD STATISTICS
        // ====================================================

        const totalUsers =
            document.getElementById(
                "adminTotalUsers"
            );

        const totalCandidates =
            document.getElementById(
                "adminTotalCandidates"
            );

        const totalInterviews =
            document.getElementById(
                "adminTotalInterviews"
            );

        const totalEvaluations =
            document.getElementById(
                "adminTotalEvaluations"
            );


        if (totalUsers) {

            totalUsers.textContent =
                data.total_users;
        }


        if (totalCandidates) {

            totalCandidates.textContent =
                data.total_candidates;
        }


        if (totalInterviews) {

            totalInterviews.textContent =
                data.total_interviews;
        }


        if (totalEvaluations) {

            totalEvaluations.textContent =
                data.total_evaluations;
        }


        // ====================================================
        // USER MANAGEMENT TABLE
        // ====================================================

        const usersBody =
            document.getElementById(
                "adminUsersBody"
            );

        if (!usersBody) {
            return;
        }


        usersBody.innerHTML = "";


        if (!data.users ||
            data.users.length === 0) {

            usersBody.innerHTML =
                `
                <tr>
                    <td colspan="4">
                        No users found.
                    </td>
                </tr>
                `;

            return;
        }


        data.users.forEach(function(user) {

            const row =
                document.createElement("tr");


            let role =
                user.role || "unknown";

            role =
                role.charAt(0).toUpperCase()
                + role.slice(1);


            row.innerHTML =
                `
                <td>${user.name}</td>

                <td>${user.email}</td>

                <td>${role}</td>

                <td>
                    <span class="status-good">
                        Registered
                    </span>
                </td>
                `;


            usersBody.appendChild(row);

        });

    }

    catch (error) {

        console.error(
            "Admin dashboard loading error:",
            error
        );

    }
}


// ============================================================
// LOAD ADMIN DATA WHEN PAGE OPENS
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    function() {

        if (
            document.getElementById(
                "adminUsersBody"
            )
        ) {

            loadAdminDashboard();

        }

    }
);
// ============================================================
// ADMIN SYSTEM ACTIVITY
// ============================================================

async function loadAdminActivity() {

    const token = localStorage.getItem("access_token");

    if (!token) return;

    try {

        const response = await fetch(
            "http://127.0.0.1:8001/admin/activity",
            {
                method: "GET",
                headers: {
                    "Authorization": "Bearer " + token
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error("Admin activity error:", data);
            return;
        }

        const activityBody =
            document.getElementById("adminActivityBody");

        if (!activityBody) return;

        activityBody.innerHTML = "";

        if (!data.activities || data.activities.length === 0) {

            activityBody.innerHTML =
                `<tr>
                    <td colspan="5">No system activity found.</td>
                </tr>`;

            return;
        }

        data.activities.forEach(function(activity) {

            const row = document.createElement("tr");

            const timestamp = activity.timestamp
                ? new Date(activity.timestamp).toLocaleString()
                : "--";

            row.innerHTML = `
                <td>${timestamp}</td>
                <td>${activity.user}</td>
                <td>${activity.role}</td>
                <td>${activity.action}</td>
                <td>
                    <span class="status-good">
                        ${activity.status}
                    </span>
                </td>
            `;

            activityBody.appendChild(row);
        });

    } catch (error) {

        console.error(
            "Admin activity loading error:",
            error
        );
    }
}


if (document.getElementById("adminActivityBody")) {
    loadAdminActivity();
}
// ============================================================
// CANDIDATE DASHBOARD - REAL DATA
// ============================================================

async function loadCandidateDashboard() {

    const token = localStorage.getItem("access_token");

    if (!token) {
        return;
    }

    try {

        const response = await fetch(
            "http://127.0.0.1:8001/candidate/dashboard",
            {
                headers: {
                    "Authorization": "Bearer " + token
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error("Dashboard API error:", data);
            return;
        }

        console.log("Candidate dashboard data:", data);

        const resumeStatus =
            document.getElementById("resumeStatusScore");

        const averageScore =
            document.getElementById("averageScore");

        const completed =
            document.getElementById("completedInterviews");

        const readiness =
            document.getElementById("readinessScore");

        const atsScore = localStorage.getItem("ats_match_score");

        if (resumeStatus) {
            resumeStatus.textContent =
                atsScore !== null ? atsScore + "%" : "Not Checked";
        }

        if (averageScore) {
            averageScore.textContent =
                data.average_score != null
                    ? data.average_score + "/100"
                    : "--";
        }

        if (completed) {
            completed.textContent =
                data.completed_interviews ?? 0;
        }

        if (readiness) {
            readiness.textContent =
                data.readiness_score != null
                    ? data.readiness_score + "/100"
                    : "--";
        }

    } catch (error) {

        console.error(
            "Dashboard loading error:",
            error
        );

    }
}


document.addEventListener(
    "DOMContentLoaded",
    function () {

        // Find the dashboard cards by their headings
        const headings = document.querySelectorAll("h3");

        headings.forEach(function (heading) {

            const text = heading.textContent.trim();
            const valueElement = heading.nextElementSibling;

            if (!valueElement) return;

            if (text === "Resume Match") {
                valueElement.id = "resumeStatusScore";
            }

            if (text === "Average Score") {
                valueElement.id = "averageScore";
            }

            if (text === "Interviews") {
                valueElement.id = "completedInterviews";
            }

            if (text === "Readiness") {
                valueElement.id = "readinessScore";
            }

        });

        // Now load real PostgreSQL data
        loadCandidateDashboard();

    }
);
// ============================================================
// SCHEDULE INTERVIEW
// ============================================================

async function scheduleInterview() {

    const date =
        document.getElementById("scheduledInterviewDate").value;

    const time =
        document.getElementById("scheduledInterviewTime").value;

    const message =
        document.getElementById("scheduleMessage");

    if (!date || !time) {

        message.textContent =
            "Please select both date and time.";

        return;
    }

    const token =
        localStorage.getItem("access_token");

    if (!token) {

        message.textContent =
            "You are not logged in.";

        return;
    }

    message.textContent =
        "Scheduling interview...";

    try {

        const response = await fetch(
            `http://127.0.0.1:8001/interviews/schedule?scheduled_date=${encodeURIComponent(date)}&scheduled_time=${encodeURIComponent(time)}`,
            {
                method: "POST",

                headers: {
                    "Authorization": "Bearer " + token
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {

            message.textContent =
                data.detail || "Unable to schedule interview.";

            return;
        }

        message.textContent =
            "✅ Interview scheduled successfully!";
        // ====================================================
        // REQUEST BROWSER NOTIFICATION PERMISSION
        // ====================================================

        if ("Notification" in window) {

            if (Notification.permission === "default") {

                await Notification.requestPermission();

            }

            if (Notification.permission === "granted") {

                new Notification("SmartHire AI", {
                    body: `Your interview is scheduled for ${date} at ${time}.`,
                    icon: "https://cdn-icons-png.flaticon.com/512/2910/2910791.png"
                });

            }
        }

        console.log(
            "Scheduled interview:",
            data
        );

    } catch (error) {

        console.error(
            "Scheduling error:",
            error
        );

        message.textContent =
            "Unable to connect to SmartHire AI backend.";
    }
}
// ============================================================
// LOAD UPCOMING INTERVIEW
// ============================================================

async function loadUpcomingInterview() {

    const container =
        document.getElementById("upcomingInterview");

    const token =
        localStorage.getItem("access_token");

    if (!container || !token) {
        return;
    }

    try {

        const response = await fetch(
            "http://127.0.0.1:8001/interviews/scheduled",
            {
                headers: {
                    "Authorization": "Bearer " + token
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {

            container.innerHTML =
                "<p>Unable to load scheduled interview.</p>";

            return;
        }

        if (!data.scheduled) {

            container.innerHTML =
                "<p>No upcoming interview scheduled.</p>";

            return;
        }

        container.innerHTML = `
            <p><strong>📅 Date:</strong> ${data.scheduled_date}</p>
            <p><strong>⏰ Time:</strong> ${data.scheduled_time}</p>
            <p><strong>🔔 Status:</strong> ${data.status}</p>
        `;

    } catch (error) {

        console.error(
            "Upcoming interview error:",
            error
        );

        container.innerHTML =
            "<p>Unable to connect to the server.</p>";
    }
}
// ============================================================
// ATS RESUME MATCH
// ============================================================

async function checkATSMatch() {

    const jobDescription =
        document.getElementById("jobDescription").value.trim();

    const message =
        document.getElementById("atsMessage");

    if (!jobDescription) {
        message.textContent =
            "Please paste a job description first.";
        return;
    }

    const token =
        localStorage.getItem("access_token");

    if (!token) {
        message.textContent =
            "You are not logged in.";
        return;
    }

    message.textContent =
        "Analyzing resume match...";

    try {

        // Get skills from the uploaded resume
        const response = await fetch(
            "http://127.0.0.1:8001/resume/skills",
            {
                headers: {
                    "Authorization": "Bearer " + token
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {
            message.textContent =
                data.detail || "Resume analysis failed.";
            return;
        }

        const resumeSkills =
            data.skills || [];

        // Skills commonly used in ATS matching
        const jdSkills = [
            "Python", "Java", "C", "C++",
            "JavaScript", "TypeScript",
            "HTML", "CSS", "React",
            "Node.js", "FastAPI", "Django",
            "Flask", "SQL", "PostgreSQL",
            "MySQL", "MongoDB",
            "Firebase", "Supabase",
            "Git", "GitHub", "Docker",
            "AWS", "Azure",
            "Machine Learning",
            "Deep Learning",
            "Artificial Intelligence",
            "Data Science",
            "Data Analysis",
            "Natural Language Processing",
            "Computer Vision",
            "Pandas", "NumPy",
            "Matplotlib", "TensorFlow",
            "PyTorch", "Keras",
            "OpenCV", "Power BI",
            "Tableau", "Excel"
        ];

        // Find skills mentioned in the job description
        const requiredSkills =
            jdSkills.filter(skill =>
                jobDescription
                    .toLowerCase()
                    .includes(skill.toLowerCase())
            );

        // Find matching resume skills
        const matchedSkills =
            requiredSkills.filter(skill =>
                resumeSkills.some(resumeSkill =>
                    resumeSkill.toLowerCase() === skill.toLowerCase()
                )
            );

        let score = 0;

        if (requiredSkills.length > 0) {
            score = Math.round(
                (matchedSkills.length /
                    requiredSkills.length) * 100
            );
        } else {
            score = 50;
        }

        // Save score for dashboard
        localStorage.setItem(
            "ats_match_score",
            score
        );

        localStorage.setItem(
            "ats_matched_skills",
            JSON.stringify(matchedSkills)
        );

        localStorage.setItem(
            "ats_required_skills",
            JSON.stringify(requiredSkills)
        );

        message.textContent =
            `✅ ATS Match Score: ${score}%`;

        console.log("ATS Score:", score);
        console.log("Matched Skills:", matchedSkills);
        console.log("Required Skills:", requiredSkills);

        // Update dashboard immediately
        const resumeMatch =
            document.getElementById("resumeStatusScore");

        if (resumeMatch) {
            resumeMatch.textContent =
                score + "%";
        }

    } catch (error) {

        console.error("ATS error:", error);

        message.textContent =
            "Unable to calculate ATS score.";
    }
}
// ============================================================
// TIMED INTERVIEW REMINDER
// ============================================================

function startInterviewReminder() {

    const token =
        localStorage.getItem("access_token");

    if (!token) return;

    // Check every 30 seconds
    setInterval(async function () {

        try {

            const response = await fetch(
                "http://127.0.0.1:8001/interviews/scheduled",
                {
                    headers: {
                        "Authorization": "Bearer " + token
                    }
                }
            );

            const data = await response.json();

            if (!response.ok || !data.scheduled) {
                return;
            }

            const interviewDateTime =
                new Date(
                    data.scheduled_date +
                    "T" +
                    data.scheduled_time
                );

            const now = new Date();

            const difference =
                interviewDateTime.getTime() -
                now.getTime();

            // 10 minutes = 600000 milliseconds
            if (
                difference > 0 &&
                difference <= 600000
            ) {

                // Prevent repeated notifications
                const reminderKey =
                    "reminder_sent_" +
                    data.schedule_id;

                if (
                    localStorage.getItem(reminderKey)
                    === "true"
                ) {
                    return;
                }

                if (
                    "Notification" in window &&
                    Notification.permission === "granted"
                ) {

                    const minutesLeft =
                        Math.ceil(difference / 60000);

                    let reminderText;

                    if (minutesLeft === 1) {
                        reminderText =
                            "Your interview starts in 1 minute.";
                    } else if (minutesLeft > 1) {
                        reminderText =
                            `Your interview starts in ${minutesLeft} minutes.`;
                    } else {
                        reminderText =
                            "Your interview starts soon.";
                    }

                    new Notification(
                        "🔔 SmartHire AI Interview Reminder",
                        {
                            body: reminderText
                        }
                    );}

            }

        } catch (error) {

            console.error(
                "Reminder check error:",
                error
            );

        }

    }, 30000);
}