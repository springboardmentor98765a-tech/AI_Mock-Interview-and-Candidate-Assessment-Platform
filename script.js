// =========================================
// Save JWT from URL
// =========================================
const params = new URLSearchParams(window.location.search);

const urlToken = params.get("token");

if (urlToken) {

    localStorage.setItem("token", urlToken);

    // Remove token from URL
    window.history.replaceState({}, document.title, "candidate.html");
}


// =========================================
// Greeting
// =========================================



window.onload = () => {

    const greeting = document.getElementById("greeting");

    if (greeting) {

        const hour = new Date().getHours();

        if (hour < 12)
            greeting.innerHTML = "🌞 Good Morning";

        else if (hour < 17)
            greeting.innerHTML = "☀️ Good Afternoon";

        else
            greeting.innerHTML = "🌙 Good Evening";
    }

};

// =========================================
// Show / Hide Password
// =========================================
function togglePassword() {

    const password = document.getElementById("password");

    password.type =
        password.type === "password"
            ? "text"
            : "password";

}

// =========================================
// Login
// =========================================
async function login() {

    const email = document.getElementById("email").value;

    const password = document.getElementById("password").value;

    const role = document.getElementById("role").value;

    if (!email || !password || !role) {

        alert("Please fill all fields");

        return;

    }

    try {

        const response = await fetch(
            "http://localhost:5000/api/auth/login",
            {

                method: "POST",

                headers: {

                    "Content-Type": "application/json"

                },

                body: JSON.stringify({

                    email,

                    password

                })

            }
        );

        const data = await response.json();

        if (!data.success) {

            alert(data.message);

            return;

        }

        // Save JWT
        localStorage.setItem("token", data.token);

        // Save User
        localStorage.setItem(
            "user",
            JSON.stringify(data.user)
        );

        alert(data.message);

        // Redirect according to role
        if (data.user.role === "USER") {

            window.location.href = "candidate.html";

        }

        else if (data.user.role === "RECRUITER") {

            window.location.href = "recruiter.html";

        }

        else {

            window.location.href = "admin.html";

        }

    }

    catch (err) {

        console.log(err);

        alert("Server Error");

    }

}

// =========================================
// Upload Resume
// =========================================
async function uploadResume() {

    const fileInput =
        document.getElementById("resumeFile");

    if (!fileInput.files.length) {

        alert("Please select a PDF");

        return;

    }

    const token = localStorage.getItem("token");

    if (!token) {

        alert("Please login first");

        return;

    }

    const formData = new FormData();

    formData.append(
        "resume",
        fileInput.files[0]
    );

    try {

        const response = await fetch(
            "http://localhost:5000/api/resume/upload",
            {

                method: "POST",

                headers: {

                    Authorization: `Bearer ${token}`

                },

                body: formData

            }
        );

        const data = await response.json();

console.log(data);

if (data.success) {

    alert(data.message);

    document.getElementById("uploadStatus").innerHTML =
        "<span style='color:green;'>✅ " + data.message + "</span>";

    document.getElementById("resumeFile").value = "";

}
else {

    alert(data.message);

    document.getElementById("uploadStatus").innerHTML =
        "<span style='color:red;'>❌ " + data.message + "</span>";

}
    }

    catch (err) {

        console.log(err);

    }

}
// =========================================
// AI Skill Extraction
// =========================================
async function extractAISkills() {

    const token = localStorage.getItem("token");

    if (!token) {

        alert("Please Login");

        return;

    }

    try {

        const response = await fetch(
            "http://localhost:5000/api/ai/extract-skills",
            {
                method: "GET",

                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const data = await response.json();

        console.log("AI Response:", data);

        if (!data.success) {

            alert(data.message);

            return;

        }

        // ========================================
        // Convert AI skills response to array
        // ========================================

        let skills = data.skills;

        if (typeof skills === "string") {

            try {

                // Remove markdown JSON formatting if present
                skills = skills
                    .replace(/```json/gi, "")
                    .replace(/```/g, "")
                    .trim();

                const parsed = JSON.parse(skills);

                skills = parsed.skills || [];

            }

            catch (error) {

                console.log(
                    "Skills JSON parsing failed:",
                    error
                );

                // If AI returned plain text
                skills = [skills];

            }

        }

        if (!Array.isArray(skills)) {

            skills = [String(skills)];

        }

        // ========================================
        // Display Skills
        // ========================================

        document.getElementById(
            "skillsOutput"
        ).innerHTML = `

            <ul>

                ${skills.map(skill => `

                    <li>
                        ✅ ${skill}
                    </li>

                `).join("")}

            </ul>

        `;

        // Store skills for interview generation
        window.extractedSkills = skills.join(", ");

        alert(
            "✅ AI Skill Extraction Successful"
        );

    }

    catch (error) {

        console.error(
            "AI Skill Extraction Error:",
            error
        );

        alert(
            "AI Skill Extraction Failed"
        );

    }

}
// ============================================
// GLOBAL VARIABLES
// ============================================

let currentSessionId = null;

let sessionStatus = "CREATED";

let sessionTimer = null;

let sessionSeconds = 0;

let remainingSeconds = 30 * 60;

let questionStartTime = null;

let questionTimes = {};

let questionsCompleted = 0;

let currentQuestionIndex = 0;

let interviewQuestions = [];

let mediaStream = null;

let mediaRecorder = null;

let recordedChunks = [];
// ============================================
// MODULE 5 - SPEECH TO TEXT
// ============================================

let speechRecognition = null;
let isSpeechRecognitionActive = false;
let speechTranscript = "";
let speechStartTime = null;
let speechEndTime = null;


// ============================================
// INTERVIEW TIMER SETTINGS
// ============================================

const TOTAL_INTERVIEW_SECONDS = 30 * 60;


// ============================================
// UPDATE SESSION STATUS
// ============================================

function updateSessionStatus() {

    const statusElement =
        document.getElementById("sessionStatus");

    if (statusElement) {

        statusElement.innerHTML =
            `Status: <strong>${sessionStatus}</strong>`;

    }

}


// ============================================
// START INTERVIEW TIMER
// ============================================

function startTimer() {

    if (sessionTimer) {
        return;
    }

    sessionTimer = setInterval(() => {

        sessionSeconds++;

        if (remainingSeconds > 0) {

            remainingSeconds--;

        }

        updateInterviewTimer();


        // ========================================
        // TIME OVER
        // ========================================

        if (remainingSeconds <= 0) {

            stopTimer();

            alert(
                "⏰ Interview time is over!"
            );

            if (
                typeof endInterviewSession ===
                "function"
            ) {

                endInterviewSession();

            }

        }

    }, 1000);

}


// ============================================
// STOP TIMER
// ============================================

function stopTimer() {

    if (sessionTimer) {

        clearInterval(
            sessionTimer
        );

        sessionTimer = null;

    }

}


// ============================================
// UPDATE INTERVIEW TIMER
// ============================================

function updateInterviewTimer() {

    const timer =
        document.getElementById(
            "sessionTimer"
        );

    if (!timer) {
        return;
    }


    const elapsedMinutes =
        Math.floor(
            sessionSeconds / 60
        )
        .toString()
        .padStart(2, "0");


    const elapsedSeconds =
        (sessionSeconds % 60)
        .toString()
        .padStart(2, "0");


    const remainingMinutes =
        Math.floor(
            remainingSeconds / 60
        )
        .toString()
        .padStart(2, "0");


    const remainingSecs =
        (remainingSeconds % 60)
        .toString()
        .padStart(2, "0");


    timer.innerHTML = `

        <div>
            ⏱️ Elapsed:
            <strong>
                ${elapsedMinutes}:${elapsedSeconds}
            </strong>
        </div>

        <div>
            ⏳ Remaining:
            <strong>
                ${remainingMinutes}:${remainingSecs}
            </strong>
        </div>

    `;

}


// ============================================
// RECORD QUESTION TIME
// ============================================

function recordQuestionTime() {

    if (!questionStartTime) {
        return;
    }


    const now =
        Date.now();


    const timeSpent =
        Math.floor(
            (now - questionStartTime)
            / 1000
        );


    const questionNumber =
        currentQuestionIndex + 1;


    questionTimes[
        questionNumber
    ] =
        (
            questionTimes[
                questionNumber
            ] || 0
        ) + timeSpent;


    questionStartTime =
        Date.now();


    console.log(
        `Question ${questionNumber} time:`,
        questionTimes[questionNumber],
        "seconds"
    );

}


// ============================================
// UPDATE QUESTIONS COMPLETED
// ============================================

function updateQuestionsCompleted() {

    const element =
        document.getElementById(
            "questionsCompleted"
        );


    if (element) {

        element.innerHTML = `

            ✅ Questions Completed:
            <strong>
                ${questionsCompleted}
            </strong>

        `;

    }

}
// ============================================
// GENERATE INTERVIEW + CREATE SESSION
// ============================================

async function generateInterview() {

    const token =
        localStorage.getItem("token");

    if (!token) {

        alert("Please Login");

        return;
    }


    // ========================================
    // GET SKILLS
    // ========================================

    const skills =
        window.extractedSkills ||
        document
            .getElementById("skillsOutput")
            .innerText
            .trim();


    if (!skills) {

        alert(
            "Please analyze your resume and extract skills first."
        );

        return;
    }


    // ========================================
    // GET INTERVIEW OPTIONS
    // ========================================

    const type =
        document
            .getElementById("interviewType")
            .value;


    const difficulty =
        document
            .getElementById("difficulty")
            .value;


    const domain =
        document
            .getElementById("domain")
            .value;


    try {

        // ========================================
        // STEP 1: GENERATE AI QUESTIONS
        // ========================================

        const response =
            await fetch(

                "http://localhost:5000/api/interview/generate",

                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${token}`

                    },

                    body: JSON.stringify({

                        skills,

                        type,

                        difficulty,

                        domain

                    })

                }

            );


        const data =
            await response.json();


        console.log(
            "INTERVIEW GENERATE RESPONSE:",
            data
        );


        if (
            !response.ok ||
            !data.success
        ) {

            alert(
                data.message ||
                "Failed to generate interview."
            );

            return;
        }


        // ========================================
        // SAVE QUESTIONS
        // ========================================

        interviewQuestions =
            data.questions || [];


        currentQuestionIndex = 0;


        if (
            interviewQuestions.length === 0
        ) {

            alert(
                "No interview questions were generated."
            );

            return;
        }


        // ========================================
        // STEP 2: CREATE DATABASE SESSION
        // ========================================

        const sessionResponse =
            await fetch(

                "http://localhost:5000/api/interview/session",

                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${token}`

                    },

                    body: JSON.stringify({

                        interviewId:
                            data.sessionId

                    })

                }

            );


        const sessionData =
            await sessionResponse.json();


        console.log(
            "SESSION CREATE RESPONSE:",
            sessionData
        );


        if (
            !sessionResponse.ok ||
            !sessionData.success
        ) {

            alert(
                sessionData.message ||
                "Failed to create interview session."
            );

            return;
        }


        // ========================================
        // SAVE DATABASE SESSION ID
        // ========================================

        currentSessionId =
    sessionData.session.id;

localStorage.setItem(
    "sessionId",
    currentSessionId
);

resetEmotionHistory();


        sessionStatus =
            sessionData.session.status ||
            "CREATED";


        // ========================================
        // RESET SESSION VARIABLES
        // ========================================

        sessionSeconds = 0;

        remainingSeconds =
            TOTAL_INTERVIEW_SECONDS;

        currentQuestionIndex = 0;

        questionsCompleted = 0;

        questionTimes = {};

        questionStartTime = null;


        updateQuestionsCompleted();

        updateInterviewTimer();


        // ========================================
        // DISPLAY SESSION
        // ========================================

        displayInterviewSession();


        alert(
            "✅ Interview Generated Successfully"
        );

    }

    catch (error) {

        console.error(
            "Interview Generation Error:",
            error
        );


        alert(
            "❌ Failed to generate interview."
        );

    }

}
// ============================================
// CREATE INTERVIEW SESSION
// ============================================

async function createInterviewSession() {

    const token =
        localStorage.getItem("token");

    if (!token) {

        alert("Please Login");

        return;

    }


    if (!interviewQuestions.length) {

        alert(
            "Please generate the interview first."
        );

        return;

    }


    try {

        const response =
            await fetch(

                "http://localhost:5000/api/interview/session",

                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${token}`

                    },

                    body: JSON.stringify({

                        interviewId:
                            window.currentInterviewId ||
                            null

                    })

                }

            );


        const data =
            await response.json();


        console.log(
            "CREATE SESSION:",
            data
        );


        if (
            !response.ok ||
            !data.success
        ) {

            alert(
                data.message ||
                "Failed to create interview session."
            );

            return;

        }


        currentSessionId =
            data.sessionId ||
            data.session?.id;

            localStorage.setItem(
    "sessionId",
    currentSessionId
);


        sessionStatus =
            data.status ||
            "CREATED";


        sessionSeconds = 0;

        remainingSeconds =
            TOTAL_INTERVIEW_SECONDS;

        currentQuestionIndex = 0;

        questionsCompleted = 0;

        questionTimes = {};

        questionStartTime = null;


        updateSessionStatus();

        updateQuestionsCompleted();

        updateInterviewTimer();


        displayInterviewSession();


        console.log(
            "Session created:",
            currentSessionId
        );


    }

    catch (error) {

        console.error(
            "Create Session Error:",
            error
        );

        alert(
            "❌ Failed to create interview session."
        );

    }

}


// ============================================
// DISPLAY INTERVIEW SESSION
// ============================================

function displayInterviewSession() {

    const output =
        document.getElementById(
            "interviewOutput"
        );


    if (!output) {

        console.error(
            "interviewOutput not found"
        );

        return;

    }


    output.innerHTML = `

        <div class="session-card">

            <h3>
                🎯 Interview Session
            </h3>

            <p>
                Session ID:
                <strong>
                    ${currentSessionId}
                </strong>
            </p>

            <p id="sessionStatus">
                Status:
                <strong>
                    ${sessionStatus}
                </strong>
            </p>

            <div
                id="sessionTimer"
                style="
                    margin-top:15px;
                    font-size:18px;
                "
            >
                ⏱️ Elapsed:
                <strong>
                    00:00
                </strong>

                <br>

                ⏳ Remaining:
                <strong>
                    30:00
                </strong>
            </div>

            <p
                id="questionsCompleted"
                style="margin-top:10px;"
            >
                ✅ Questions Completed:
                <strong>0</strong>
            </p>


            <div
                class="session-buttons"
                style="
                    display:flex;
                    gap:10px;
                    flex-wrap:wrap;
                    margin-top:20px;
                "
            >

                <button
                    type="button"
                    class="btn"
                    onclick="startInterviewSession()"
                >
                    ▶ Start
                </button>


                <button
                    type="button"
                    class="btn"
                    onclick="pauseInterviewSession()"
                >
                    ⏸ Pause
                </button>


                <button
                    type="button"
                    class="btn"
                    onclick="resumeInterviewSession()"
                >
                    ▶ Resume
                </button>


                <button
                    type="button"
                    class="btn"
                    onclick="endInterviewSession()"
                >
                    🛑 End
                </button>

            </div>


            <div
                id="questionContainer"
                style="margin-top:25px;"
            >
            </div>

        </div>

    `;


    updateSessionStatus();

    updateQuestionsCompleted();

    updateInterviewTimer();


    showQuestion();

}


// ============================================
// START INTERVIEW SESSION
// ============================================

async function startInterviewSession() {

    if (!currentSessionId) {

        alert(
            "Create an interview session first."
        );

        return;

    }


    if (sessionStatus !== "CREATED") {

        alert(
            "This interview session has already been started."
        );

        return;

    }


    const token =
        localStorage.getItem("token");


    if (!token) {

        alert("Please Login");

        return;

    }


    try {

        const response =
            await fetch(

                `http://localhost:5000/api/interview/session/${currentSessionId}/start`,

                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${token}`

                    }

                }

            );


        const data =
            await response.json();


        console.log(
            "START SESSION:",
            data
        );


        if (
            !response.ok ||
            !data.success
        ) {

            alert(
                data.message ||
                "Failed to start interview."
            );

            return;

        }


        sessionStatus =
            "STARTED";


        questionStartTime =
            Date.now();


        updateSessionStatus();


        startTimer();


        showQuestion();


        alert(
            "▶ Interview Started Successfully"
        );

    }

    catch (error) {

        console.error(
            "Start Session Error:",
            error
        );

        alert(
            "❌ Failed to start interview."
        );

    }

}


// ============================================
// PAUSE INTERVIEW SESSION
// ============================================

async function pauseInterviewSession() {

    if (!currentSessionId) {

        alert(
            "No interview session found."
        );

        return;

    }


    if (
        sessionStatus !== "STARTED" &&
        sessionStatus !== "RESUMED"
    ) {

        alert(
            "Interview must be running to pause."
        );

        return;

    }


    const token =
        localStorage.getItem("token");


    try {

        const response =
            await fetch(

                `http://localhost:5000/api/interview/session/${currentSessionId}/pause`,

                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${token}`

                    }

                }

            );


        const data =
            await response.json();


        console.log(
            "PAUSE SESSION:",
            data
        );


        if (
            !response.ok ||
            !data.success
        ) {

            alert(
                data.message ||
                "Failed to pause interview."
            );

            return;

        }


        // Save current question time
        recordQuestionTime();


        sessionStatus =
            "PAUSED";


        updateSessionStatus();


        stopTimer();


        alert(
            "⏸ Interview Paused"
        );

    }

    catch (error) {

        console.error(
            "Pause Session Error:",
            error
        );

        alert(
            "❌ Failed to pause interview."
        );

    }

}


// ============================================
// RESUME INTERVIEW SESSION
// ============================================

async function resumeInterviewSession() {

    if (!currentSessionId) {

        alert(
            "No interview session found."
        );

        return;

    }


    if (sessionStatus !== "PAUSED") {

        alert(
            "Interview is not paused."
        );

        return;

    }


    const token =
        localStorage.getItem("token");


    if (!token) {

        alert(
            "Please Login"
        );

        return;

    }


    try {

        const response =
            await fetch(

                `http://localhost:5000/api/interview/session/${currentSessionId}/resume`,

                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${token}`

                    }

                }

            );


        const data =
            await response.json();


        console.log(
            "RESUME SESSION:",
            data
        );


        if (
            !response.ok ||
            !data.success
        ) {

            alert(
                data.message ||
                "Failed to resume interview."
            );

            return;

        }


        sessionStatus =
            "RESUMED";


        questionStartTime =
            Date.now();


        updateSessionStatus();


        startTimer();


        alert(
            "▶ Interview Resumed"
        );

    }

    catch (error) {

        console.error(
            "Resume Session Error:",
            error
        );

        alert(
            "❌ Failed to resume interview."
        );

    }

}


// ============================================
// END INTERVIEW SESSION
// ============================================

async function endInterviewSession() {

    if (!currentSessionId) {

        alert(
            "No interview session found."
        );

        return;

    }


    const token =
        localStorage.getItem("token");


    try {

        // Record final question time
        recordQuestionTime();


        stopTimer();


        const response =
            await fetch(

                `http://localhost:5000/api/interview/session/${currentSessionId}/end`,

                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${token}`

                    },

                    body: JSON.stringify({

                        duration:
                            sessionSeconds,

                        questionsAttempted:
                            questionsCompleted,

                        questionTimes:
                            questionTimes

                    })

                }

            );


        const data =
            await response.json();


        console.log(
            "END SESSION:",
            data
        );


        if (
            !response.ok ||
            !data.success
        ) {

            alert(
                data.message ||
                "Failed to end interview."
            );

            return;

        }


        sessionStatus =
            "COMPLETED";


        updateSessionStatus();


        alert(
            "✅ Interview Completed Successfully"
        );


    }

    catch (error) {

        console.error(
            "End Session Error:",
            error
        );

        alert(
            "❌ Failed to end interview."
        );

    }

}
// ============================================
// SUBMIT & SAVE ANSWER
// ============================================

async function submitAnswer() {

    if (!currentSessionId) {
        alert("❌ No interview session found.");
        return;
    }

    if (
        sessionStatus !== "STARTED" &&
        sessionStatus !== "RESUMED"
    ) {
        alert("▶ Please start or resume the interview first.");
        return;
    }

    const answerBox =
        document.getElementById("candidateAnswer");

    if (!answerBox) {
        alert("❌ Answer box not found.");
        return;
    }

    const answer =
        answerBox.value.trim();

    if (!answer) {
        alert("⚠️ Please enter your answer first.");
        answerBox.focus();
        return;
    }

    const token =
        localStorage.getItem("token");

    if (!token) {
        alert("❌ Please login first.");
        return;
    }

    // Record time spent on this question
    recordQuestionTime();

    const questionNumber =
        currentQuestionIndex + 1;

    const question =
        interviewQuestions[currentQuestionIndex];

    const timeSpent =
        questionTimes[questionNumber] || 0;

    try {

        const response = await fetch(
            `http://localhost:5000/api/interview/session/${currentSessionId}/answer`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },

                body: JSON.stringify({
                    questionNumber,
                    question,
                    answer,
                    timeSpent
                })
            }
        );

        const data =
            await response.json();

        console.log(
            "ANSWER SAVE RESPONSE:",
            data
        );

        if (!response.ok || !data.success) {

            alert(
                "❌ Answer submission failed!\n\n" +
                (data.message || "Server error")
            );

            return;
        }

        questionsCompleted++;

updateQuestionsCompleted();


// ========================================
// MODULE 5 - COMMUNICATION ANALYSIS
// ========================================

try {

    const analysisResponse =
        await fetch(
            "http://localhost:5000/api/ai/analyze-communication",
            {

                method: "POST",

                headers: {

                    "Content-Type":
                        "application/json",

                    "Authorization":
                        `Bearer ${token}`

                },

                body: JSON.stringify({

                    answerId:
                        data.answer.id,

                    sessionId:
                        currentSessionId,

                    transcript:
                        answer

                })

            }
        );


    const analysisData =
        await analysisResponse.json();


    console.log(
        "COMMUNICATION ANALYSIS:",
        analysisData
    );


    if (
        !analysisResponse.ok ||
        !analysisData.success
    ) {

        console.error(
            "Communication analysis failed:",
            analysisData
        );

        alert(
            "✅ Answer saved successfully!\n\n" +
            "⚠️ Communication analysis could not be completed."
        );

        return;

    }


    const analysis =
        analysisData.analysis;


    // ========================================
    // DISPLAY RESULTS
    // ========================================

    displayCommunicationAnalysis(
        analysis
    );


    alert(
        "✅ Answer Submitted Successfully!\n\n" +
        "Question " +
        questionNumber +
        " has been saved.\n\n" +
        "📝 Grammar analysis completed!\n" +
        "🚫 Filler-word analysis completed!"
    );

}
catch (analysisError) {

    console.error(
        "Communication Analysis Error:",
        analysisError
    );

    alert(
        "✅ Answer saved successfully!\n\n" +
        "⚠️ Communication analysis failed."
    );

}

    }
    catch (error) {

        console.error(
            "Submit Answer Error:",
            error
        );

        alert(
            "❌ Unable to submit answer!\n\n" +
            "Please check whether the backend server is running."
        );
    }
}
// ============================================
// MODULE 5 - DISPLAY COMMUNICATION ANALYSIS
// ============================================

function displayCommunicationAnalysis(
    analysis
) {

    if (!analysis) {
        return;
    }


    const container =
        document.getElementById(
            "questionContainer"
        );


    if (!container) {
        return;
    }


    const existing =
        document.getElementById(
            "communicationAnalysis"
        );


    if (existing) {
        existing.remove();
    }


    const fillerWords =
        analysis.filler_words
            ? analysis.filler_words
            : "None detected";


    const analysisHTML = `

        <div
            id="communicationAnalysis"
            style="
                margin-top:20px;
                padding:20px;
                border-radius:15px;
                background:#111827;
                border:1px solid rgba(255,255,255,.10);
            "
        >

            <h3>
                📊 Communication Analysis
            </h3>


            <div style="
                margin-top:15px;
                line-height:1.8;
            ">

                <p>
                    ✍️ <strong>Grammar Score:</strong>
                    ${analysis.grammar_score || 0}%
                </p>

                <p>
                    🚫 <strong>Filler Words:</strong>
                    ${analysis.filler_word_count || 0}
                </p>

                <p>
                    🔎 <strong>Detected:</strong>
                    ${fillerWords}
                </p>

                <p>
                    💬 <strong>Grammar Feedback:</strong><br>
                    ${analysis.grammar_feedback || "No feedback available."}
                </p>

                <p>
                    🗣️ <strong>Communication Feedback:</strong><br>
                    ${analysis.communication_feedback || "No feedback available."}
                </p>
                <p>
    ⚡ <strong>Speech Pace:</strong>
    ${analysis.speech_rate || 0} WPM
</p>

<p>
    📈 <strong>Pace Category:</strong>
    ${analysis.speech_rate_category || "NORMAL"}
</p>

            </div>

        </div>

    `;


    container.insertAdjacentHTML(
        "beforeend",
        analysisHTML
    );
}
// ============================================
// SHOW CURRENT QUESTION
// ============================================

function showQuestion() {

    const container =
        document.getElementById(
            "questionContainer"
        );


    if (!container) {

        console.error(
            "questionContainer not found"
        );

        return;

    }


    if (
        !Array.isArray(
            interviewQuestions
        )
    ) {

        console.error(
            "interviewQuestions is not an array"
        );

        return;

    }


    if (
        interviewQuestions.length === 0
    ) {

        container.innerHTML = `

            <div class="question-box">

                <p>
                    No interview questions available.
                </p>

            </div>

        `;

        return;

    }


    // Keep index valid

    if (
        currentQuestionIndex < 0
    ) {

        currentQuestionIndex = 0;

    }


    if (
        currentQuestionIndex >=
        interviewQuestions.length
    ) {

        currentQuestionIndex =
            interviewQuestions.length - 1;

    }


    const question =
        interviewQuestions[
            currentQuestionIndex
        ];


    container.innerHTML = `

        <div class="question-box">

            <div
                style="
                    display:flex;
                    justify-content:space-between;
                    align-items:center;
                    margin-bottom:15px;
                "
            >

                <strong>

                    Question
                    ${currentQuestionIndex + 1}
                    of
                    ${interviewQuestions.length}

                </strong>


                <span>

                    ⏱️
                    <span id="questionTime">
                        0
                    </span>
                    sec

                </span>

            </div>


            <h3>

                ${question}

            </h3>


            <textarea

                id="candidateAnswer"

                placeholder="Type your answer here..."

                rows="6"

                style="
                    width:100%;
                    margin-top:18px;
                    padding:14px;
                    border-radius:10px;
                    border:1px solid #334155;
                    background:#0f172a;
                    color:white;
                    resize:vertical;
                    box-sizing:border-box;
                "

            ></textarea>
<div
    style="
        display:flex;
        gap:10px;
        flex-wrap:wrap;
        margin-top:12px;
        align-items:center;
    "
>

    <button
        type="button"
        class="btn"
        onclick="startSpeechToText()"
    >
        🎤 Start Speaking
    </button>

    <button
        type="button"
        class="btn"
        onclick="stopSpeechToText()"
    >
        ⏹️ Stop Speaking
    </button>

    <button
        type="button"
        class="btn"
        onclick="clearSpeechTranscript()"
    >
        🗑️ Clear Transcript
    </button>

</div>

<p
    id="speechStatus"
    style="
        margin-top:10px;
        color:#94a3b8;
        font-size:14px;
    "
>
    🎤 Speech-to-Text ready
</p>

            <div class="question-navigation">

    ${
        currentQuestionIndex > 0
        ?
        `<button
            type="button"
            class="btn"
            onclick="previousQuestion()">
            ← Previous
        </button>`
        :
        ""
    }

    <button
        type="button"
        class="btn"
        onclick="submitAnswer()">
        💾 Submit & Save
    </button>

    <button
        type="button"
        class="btn"
        onclick="nextQuestion()">
        ${
            currentQuestionIndex ===
            interviewQuestions.length - 1
            ?
            "Finish Questions"
            :
            "Next →"
        }
    </button>

</div>

        </div>

    `;


    // Start timing the newly displayed question

    questionStartTime =
        Date.now();


    startQuestionTimer();

}
// ============================================
// MODULE 5 - REAL-TIME SPEECH TO TEXT
// ============================================

function initializeSpeechRecognition() {

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        console.warn("Speech Recognition is not supported.");
        return false;
    }

    speechRecognition = new SpeechRecognition();

    speechRecognition.continuous = true;
    speechRecognition.interimResults = true;
    speechRecognition.lang = "en-US";

    speechRecognition.onstart = () => {

        isSpeechRecognitionActive = true;
        speechStartTime = Date.now();

        updateSpeechStatus(
            "🎤 Listening... Start speaking"
        );
    };

    speechRecognition.onresult = (event) => {

        let finalTranscript = "";
        let interimTranscript = "";

        for (
            let i = event.resultIndex;
            i < event.results.length;
            i++
        ) {

            const transcript =
                event.results[i][0].transcript;

            if (event.results[i].isFinal) {

                finalTranscript += transcript + " ";

            } else {

                interimTranscript += transcript;

            }
        }

        if (finalTranscript) {

            speechTranscript += finalTranscript;

        }

        const answerBox =
            document.getElementById(
                "candidateAnswer"
            );

        if (!answerBox) {
            return;
        }

        answerBox.value =
            speechTranscript +
            interimTranscript;

        answerBox.scrollTop =
            answerBox.scrollHeight;
    };

    speechRecognition.onerror = (event) => {

        console.error(
            "Speech Recognition Error:",
            event.error
        );

        if (event.error === "not-allowed") {

            updateSpeechStatus(
                "❌ Microphone permission denied."
            );

        } else {

            updateSpeechStatus(
                "❌ Speech recognition error: " +
                event.error
            );

        }
    };

    speechRecognition.onend = () => {

        isSpeechRecognitionActive = false;
        speechEndTime = Date.now();

        updateSpeechStatus(
            "⏹️ Speech recognition stopped."
        );
    };

    return true;
}


// ============================================
// START SPEECH RECOGNITION
// ============================================

function startSpeechToText() {

    if (
        sessionStatus !== "STARTED" &&
        sessionStatus !== "RESUMED"
    ) {

        alert(
            "▶ Please start or resume the interview first."
        );

        return;
    }

    const answerBox =
        document.getElementById(
            "candidateAnswer"
        );

    if (!answerBox) {

        alert(
            "❌ Answer box not found."
        );

        return;
    }

    if (
        !window.SpeechRecognition &&
        !window.webkitSpeechRecognition
    ) {

        alert(
            "❌ Speech-to-Text is not supported in this browser.\n\nPlease use Google Chrome or Microsoft Edge."
        );

        return;
    }

    if (!speechRecognition) {

        if (!initializeSpeechRecognition()) {

            alert(
                "❌ Unable to initialize Speech-to-Text."
            );

            return;
        }
    }

    if (isSpeechRecognitionActive) {

        alert(
            "🎤 Speech recognition is already running."
        );

        return;
    }

    speechTranscript =
        answerBox.value.trim();

    if (speechTranscript) {

        speechTranscript += " ";

    }

    try {

        speechRecognition.start();

    } catch (error) {

        console.error(
            "Speech Start Error:",
            error
        );

        alert(
            "❌ Unable to start Speech-to-Text."
        );
    }
}


// ============================================
// STOP SPEECH RECOGNITION
// ============================================

function stopSpeechToText() {

    if (
        !speechRecognition ||
        !isSpeechRecognitionActive
    ) {

        updateSpeechStatus(
            "⏹️ Speech recognition is not running."
        );

        return;
    }

    try {

        speechRecognition.stop();

    } catch (error) {

        console.error(
            "Speech Stop Error:",
            error
        );

    }

}


// ============================================
// CLEAR TRANSCRIPT
// ============================================

function clearSpeechTranscript() {

    const answerBox =
        document.getElementById(
            "candidateAnswer"
        );

    if (answerBox) {

        answerBox.value = "";

    }

    speechTranscript = "";

    updateSpeechStatus(
        "📝 Transcript cleared."
    );
}


// ============================================
// UPDATE SPEECH STATUS
// ============================================

function updateSpeechStatus(message) {

    const status =
        document.getElementById(
            "speechStatus"
        );

    if (status) {

        status.innerText = message;

    }

}

// ============================================
// QUESTION TIMER
// ============================================

let questionTimer = null;


function startQuestionTimer() {

    if (questionTimer) {

        clearInterval(
            questionTimer
        );

        questionTimer = null;

    }


    questionTimer =
        setInterval(() => {

            if (!questionStartTime) {
                return;
            }


            const seconds =
                Math.floor(
                    (
                        Date.now() -
                        questionStartTime
                    ) / 1000
                );


            const element =
                document.getElementById(
                    "questionTime"
                );


            if (element) {

                element.innerText =
                    seconds;

            }

        }, 1000);

}


// ============================================
// STOP QUESTION TIMER
// ============================================

function stopQuestionTimer() {

    if (questionTimer) {

        clearInterval(
            questionTimer
        );

        questionTimer = null;

    }

}


// ============================================
// NEXT QUESTION
// ============================================

function nextQuestion() {

    console.log(
        "Next clicked:",
        currentQuestionIndex
    );


    if (
        sessionStatus !== "STARTED" &&
        sessionStatus !== "RESUMED"
    ) {

        alert(
            "▶ Please start or resume the interview first."
        );

        return;

    }


    if (
        currentQuestionIndex >=
        interviewQuestions.length - 1
    ) {

        alert(
            "🎉 All interview questions completed!"
        );

        return;

    }


    // Save time spent on current question

    recordQuestionTime();


    // Count completed question

    questionsCompleted++;


    updateQuestionsCompleted();


    // Move to next question

    currentQuestionIndex++;


    showQuestion();

}


// ============================================
// PREVIOUS QUESTION
// ============================================

function previousQuestion() {

    console.log(
        "Previous clicked:",
        currentQuestionIndex
    );


    if (
        currentQuestionIndex <= 0
    ) {

        alert(
            "This is the first question."
        );

        return;

    }


    // Save time spent on current question

    recordQuestionTime();


    // Move backward

    currentQuestionIndex--;


    showQuestion();

}


// ============================================
// SAVE CURRENT ANSWER
// ============================================

function getCurrentAnswer() {

    const answerElement =
        document.getElementById(
            "candidateAnswer"
        );


    if (!answerElement) {

        return "";

    }


    return answerElement.value.trim();

}
// ============================================
// WEBCAM + MICROPHONE
// ============================================

async function startMediaDevices() {

    const status =
        document.getElementById(
            "deviceStatus"
        );

    try {

        if (
            !navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia
        ) {

            if (status) {

                status.innerHTML =
                    "❌ Your browser does not support camera/microphone access.";

            }

            return;

        }


        mediaStream =
            await navigator.mediaDevices.getUserMedia({

                video: true,

                audio: true

            });


        const video =
            document.getElementById(
                "webcamPreview"
            );


        if (video) {

            video.srcObject =
                mediaStream;

            video.muted = true;

            video.playsInline = true;

            await video.play();

        }


        if (status) {

            status.innerHTML =
                "✅ Camera and microphone enabled";

        }


    }

    catch (error) {

        console.error(
            "Media Device Error:",
            error
        );


        if (!status) {
            return;
        }


        if (
            error.name ===
            "NotAllowedError"
        ) {

            status.innerHTML =
                "❌ Camera/microphone permission denied. Please allow access in browser settings.";

        }

        else if (
            error.name ===
            "NotFoundError"
        ) {

            status.innerHTML =
                "❌ Camera or microphone not found.";

        }

        else if (
            error.name ===
            "NotReadableError"
        ) {

            status.innerHTML =
                "❌ Camera or microphone is already being used by another application.";

        }

        else {

            status.innerHTML =
                "❌ Unable to access camera or microphone.";

        }

    }

}


// ============================================
// START RECORDING
// ============================================

function startRecording() {

    if (!mediaStream) {

        alert(
            "Please enable camera and microphone first."
        );

        return;

    }


    if (!currentSessionId) {

        alert(
            "Please create an interview session first."
        );

        return;

    }


    if (
        sessionStatus !== "STARTED" &&
        sessionStatus !== "RESUMED"
    ) {

        alert(
            "Please start or resume the interview first."
        );

        return;

    }


    if (
        mediaRecorder &&
        mediaRecorder.state !== "inactive"
    ) {

        alert(
            "Recording is already running."
        );

        return;

    }


    recordedChunks = [];


    // ========================================
    // SELECT SUPPORTED FORMAT
    // ========================================

    let mimeType =
        "video/webm";


    if (
        MediaRecorder.isTypeSupported(
            "video/webm;codecs=vp8,opus"
        )
    ) {

        mimeType =
            "video/webm;codecs=vp8,opus";

    }

    else if (
        MediaRecorder.isTypeSupported(
            "video/webm"
        )
    ) {

        mimeType =
            "video/webm";

    }

    else {

        alert(
            "Your browser does not support video recording."
        );

        return;

    }


    console.log(
        "MediaRecorder MIME:",
        mimeType
    );


    // ========================================
    // CREATE MEDIA RECORDER
    // ========================================

    try {

        mediaRecorder =
            new MediaRecorder(

                mediaStream,

                {
                    mimeType: mimeType
                }

            );

    }

    catch (error) {

        console.error(
            "MediaRecorder Error:",
            error
        );

        alert(
            "❌ Unable to start recording."
        );

        return;

    }


    // ========================================
    // COLLECT RECORDING CHUNKS
    // ========================================

    mediaRecorder.ondataavailable =
        (event) => {

            console.log(
                "Recording chunk:",
                event.data.type,
                event.data.size
            );


            if (
                event.data &&
                event.data.size > 0
            ) {

                recordedChunks.push(
                    event.data
                );

            }

        };


    // ========================================
    // RECORDING STOPPED
    // ========================================

    mediaRecorder.onstop = () => {
        displayEmotionAnalysis();
        console.log(
    "✅ Recording saved:",
    data.recording
);

// Save recording reference
updateVideoReferenceFromResponse(
    data.recording
);

// Update session storage
saveSessionDetails();

    };


    // ========================================
    // RECORDING ERROR
    // ========================================

    mediaRecorder.onerror =
        (event) => {

            console.error(
                "MediaRecorder Error:",
                event.error
            );

            const status =
                document.getElementById(
                    "recordingStatus"
                );

            if (status) {

                status.innerHTML =
                    "❌ Recording error.";

            }

        };


    // ========================================
    // START
    // ========================================

    mediaRecorder.start(1000);
    showSessionAlert(
    "🎥 Interview Started",
    "Your interview recording session has started."
);
    startEmotionAI();
    startEyeTracking();


    const status =
        document.getElementById(
            "recordingStatus"
        );


    if (status) {

        status.innerHTML =
            "🔴 Recording in progress...";

    }

}


// ============================================
// STOP RECORDING
// ============================================

function stopRecording() {

    if (!mediaRecorder) {

        alert(
            "Recording has not been started."
        );

        return;

    }


    if (
        mediaRecorder.state ===
        "inactive"
    ) {

        alert(
            "Recording is not currently running."
        );

        return;

    }


    mediaRecorder.stop();
    showSessionAlert(
    "✅ Interview Session Completed",
    "Your interview recording session has ended."
);
    stopEmotionAI();
    stopEyeTracking();
   console.log("🛑 Recording stop requested.");

    const status =
        document.getElementById(
            "recordingStatus"
        );


    if (status) {

        status.innerHTML =
            "⏳ Processing recording...";

    }

}


// ============================================
// UPLOAD RECORDING
// ============================================

async function uploadRecording() {

    if (
        !recordedChunks ||
        recordedChunks.length === 0
    ) {

        alert(
            "No recording available."
        );

        return;

    }


    if (!currentSessionId) {

        alert(
            "Interview session not found."
        );

        return;

    }


    const token =
        localStorage.getItem("token");


    if (!token) {

        alert(
            "Please login again."
        );

        return;

    }


    try {

        // ========================================
        // CREATE VIDEO BLOB
        // ========================================

        const blob =
            new Blob(

                recordedChunks,

                {
                    type: "video/webm"
                }

            );


        console.log(
            "FINAL RECORDING MIME:",
            blob.type
        );


        console.log(
            "FINAL RECORDING SIZE:",
            blob.size
        );


        if (blob.size === 0) {

            alert(
                "Recording is empty."
            );

            return;

        }


        // ========================================
        // CREATE FORM DATA
        // ========================================

        const formData =
            new FormData();


        formData.append(

            "recording",

            blob,

            `interview-${currentSessionId}.webm`

        );


        formData.append(

            "sessionId",

            String(currentSessionId)

        );


        formData.append(

            "recordingType",

            "VIDEO"

        );


        console.log(
            "Uploading recording for session:",
            currentSessionId
        );


        // ========================================
        // UPLOAD TO BACKEND
        // ========================================

        const response =
            await fetch(

                `http://localhost:5000/api/interview/recording`,

                {

                    method: "POST",

                    headers: {

                        "Authorization":
                            `Bearer ${token}`

                    },

                    body: formData

                }

            );


        const responseText =
            await response.text();


        console.log(
            "Upload HTTP Status:",
            response.status
        );


        console.log(
            "Upload Response:",
            responseText
        );


        let data;


        try {

            data =
                JSON.parse(
                    responseText
                );

        }

        catch (error) {

            console.error(
                "Invalid backend response:",
                responseText
            );

            alert(
                `Upload failed (${response.status})`
            );

            return;

        }


        if (
            !response.ok ||
            !data.success
        ) {

            console.error(
                "Recording upload failed:",
                data
            );

            alert(

                data.message ||
                "Recording upload failed."

            );

            return;

        }


        const status =
            document.getElementById(
                "recordingStatus"
            );


        if (status) {

            status.innerHTML =
                "✅ Recording securely stored";

        }


        console.log(
            "✅ Recording saved:",
            data.recording
        );


    }

    catch (error) {

        console.error(
            "Recording Upload Error:",
            error
        );


        const status =
            document.getElementById(
                "recordingStatus"
            );


        if (status) {

            status.innerHTML =
                "❌ Failed to upload recording";

        }

    }

}


// ============================================
// STOP CAMERA + MICROPHONE
// ============================================

function stopMediaDevices() {

    if (!mediaStream) {
        return;
    }


    mediaStream
        .getTracks()
        .forEach(
            track => track.stop()
        );


    mediaStream = null;


    const video =
        document.getElementById(
            "webcamPreview"
        );


    if (video) {

        video.srcObject =
            null;

    }


    const status =
        document.getElementById(
            "deviceStatus"
        );


    if (status) {

        status.innerHTML =
            "Camera and microphone stopped.";

    }

}
// ============================================
// STOP RECORDING
// ============================================

function stopRecording() {

    if (
        !mediaRecorder ||
        mediaRecorder.state === "inactive"
    ) {

        return;

    }


    mediaRecorder.stop();


    document.getElementById(
        "recordingStatus"
    ).innerHTML =
        "⏳ Processing recording...";

}
// ============================================
// MODULE 4 - SESSION STORAGE
// ============================================

// Store recording references for the session
let videoRecordingReference = null;
let audioRecordingReference = null;


// ============================================
// SAVE SESSION DETAILS
// ============================================

async function saveSessionDetails() {

    if (!currentSessionId) {

        console.error(
            "No session ID available."
        );

        return;

    }


    const token =
        localStorage.getItem("token");


    if (!token) {

        console.error(
            "Authentication token missing."
        );

        return;

    }


    try {

        const response =
            await fetch(

                `http://localhost:5000/api/interview/session/${currentSessionId}/details`,

                {

                    method: "PUT",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${token}`

                    },

                    body: JSON.stringify({

                        duration:
                            sessionSeconds,

                        status:
                            sessionStatus,

                        questionsAttempted:
                            questionsCompleted,

                        questionTimes:
                            questionTimes,

                        videoRecordingReference:
                            videoRecordingReference,

                        audioRecordingReference:
                            audioRecordingReference

                    })

                }

            );


        const data =
            await response.json();


        console.log(
            "SESSION DETAILS RESPONSE:",
            data
        );


        if (
            !response.ok ||
            !data.success
        ) {

            console.error(
                "Failed to save session details:",
                data.message
            );

            return;

        }


        console.log(
            "✅ Session details stored successfully."
        );


    }

    catch (error) {

        console.error(
            "Session Storage Error:",
            error
        );

    }

}


// ============================================
// STORE VIDEO RECORDING REFERENCE
// ============================================

function setVideoRecordingReference(
    recording
) {

    if (!recording) {
        return;
    }


    videoRecordingReference =

        recording.file_path ||

        recording.filePath ||

        recording.id ||

        null;


    console.log(
        "Video recording reference:",
        videoRecordingReference
    );

}


// ============================================
// STORE AUDIO RECORDING REFERENCE
// ============================================

function setAudioRecordingReference(
    recording
) {

    if (!recording) {
        return;
    }


    audioRecordingReference =

        recording.file_path ||

        recording.filePath ||

        recording.id ||

        null;


    console.log(
        "Audio recording reference:",
        audioRecordingReference
    );

}


// ============================================
// UPDATED RECORDING UPLOAD REFERENCE
// ============================================

// After successful video recording upload,
// save the reference in the session.

function updateVideoReferenceFromResponse(
    recording
) {

    if (!recording) {
        return;
    }


    videoRecordingReference =

        recording.file_path ||

        recording.filePath ||

        recording.id ||

        null;


    console.log(
        "✅ Video reference saved:",
        videoRecordingReference
    );

}


// ============================================
// SESSION SUMMARY
// ============================================

function getSessionSummary() {

    return {

        candidateId:
            localStorage.getItem(
                "candidateId"
            ),

        interviewId:
            window.currentInterviewId ||
            null,

        sessionId:
            currentSessionId,

        startTime:
            window.interviewStartTime ||
            null,

        endTime:
            sessionStatus === "COMPLETED"
            ? new Date().toISOString()
            : null,

        duration:
            sessionSeconds,

        sessionStatus:
            sessionStatus,

        videoRecordingReference:
            videoRecordingReference,

        audioRecordingReference:
            audioRecordingReference,

        questionsAttempted:
            questionsCompleted,

        questionTimes:
            questionTimes

    };

}


// ============================================
// DISPLAY SESSION SUMMARY
// ============================================

function displaySessionSummary() {

    const output =
        document.getElementById(
            "interviewOutput"
        );


    if (!output) {
        return;
    }


    const summary =
        getSessionSummary();


    output.innerHTML += `

        <div
            class="session-summary"
            style="
                margin-top:20px;
                padding:20px;
                border-radius:15px;
                background:#111827;
                border:1px solid rgba(255,255,255,.08);
            "
        >

            <h3>
                📊 Interview Session Summary
            </h3>

            <p>
                Candidate ID:
                <strong>
                    ${summary.candidateId || "N/A"}
                </strong>
            </p>

            <p>
                Interview ID:
                <strong>
                    ${summary.interviewId || "N/A"}
                </strong>
            </p>

            <p>
                Session ID:
                <strong>
                    ${summary.sessionId}
                </strong>
            </p>

            <p>
                Duration:
                <strong>
                    ${summary.duration} seconds
                </strong>
            </p>

            <p>
                Status:
                <strong>
                    ${summary.sessionStatus}
                </strong>
            </p>

            <p>
                Questions Attempted:
                <strong>
                    ${summary.questionsAttempted}
                </strong>
            </p>

            <p>
                Video Recording:
                <strong>
                    ${
                        summary.videoRecordingReference
                        || "Not available"
                    }
                </strong>
            </p>

            <p>
                Audio Recording:
                <strong>
                    ${
                        summary.audioRecordingReference
                        || "Included with video recording"
                    }
                </strong>
            </p>

        </div>

    `;

}
// =========================================
// Logout
// =========================================
function logout() {

    localStorage.removeItem("token");

    localStorage.removeItem("user");

    window.location.href = "login.html";

}
// ============================================================
// SMART HIRE AI - LIVE EMOTION DETECTION
// ============================================================

let emotionInterval = null;
let emotionCanvas = null;
let emotionRunning = false;


// START EMOTION AI
async function startEmotionAI() {

    if (emotionRunning) {
        return;
    }

    const video =
        document.getElementById("webcamPreview");

    if (!video) {
        alert("Webcam not found!");
        return;
    }

    if (!video.srcObject) {
        alert("Please enable Camera & Microphone first!");
        return;
    }

    emotionCanvas =
        document.createElement("canvas");

    emotionCanvas.width = 320;
    emotionCanvas.height = 240;

    emotionRunning = true;

    const status =
        document.getElementById("emotionStatus");

    if (status) {
        status.innerText =
            "🟢 Emotion detection running...";
    }

    console.log("🧠 Emotion AI started");

    emotionInterval =
        setInterval(
            captureAndPredictEmotion,
            1000
        );

    captureAndPredictEmotion();
}


// CAPTURE WEBCAM FRAME
async function captureAndPredictEmotion() {

    if (!emotionRunning) {
        return;
    }

    const video =
        document.getElementById("webcamPreview");

    if (!video || video.readyState < 2) {
        return;
    }

    try {

        const ctx =
            emotionCanvas.getContext("2d");

        ctx.drawImage(
            video,
            0,
            0,
            320,
            240
        );

        const blob =
            await new Promise(resolve => {

                emotionCanvas.toBlob(
                    resolve,
                    "image/jpeg",
                    0.75
                );

            });

        if (!blob) {
            return;
        }

        const formData =
            new FormData();

        formData.append(
            "image",
            blob,
            "webcam.jpg"
        );


        // SEND IMAGE TO PYTHON API
        const response =
            await fetch(
                "http://127.0.0.1:5001/predict",
                {
                    method: "POST",
                    body: formData
                }
            );


        const data =
            await response.json();

        console.log(
            "Emotion API Response:",
            data
        );


        if (!data.success) {
            console.error(data);
            return;
        }


        // UPDATE UI
        updateEmotionUI(data);

    }

    catch (error) {

        console.error(
            "Emotion detection error:",
            error
        );

    }
}


// UPDATE EMOTION DISPLAY
function updateEmotionUI(data) {
    saveEmotionReading(data);
    const emotion =
        document.getElementById(
            "currentEmotion"
        );

    const confidence =
        document.getElementById(
            "emotionConfidence"
        );


    if (emotion) {

        emotion.innerText =
            data.emotion;
    }


    if (confidence) {

        confidence.innerText =
            data.confidence + "%";
    }


    // SHOW ALL EMOTIONS
    const probabilities =
        document.getElementById(
            "emotionProbabilities"
        );


    if (
        probabilities &&
        data.emotions
    ) {

        probabilities.innerHTML =
            Object.entries(data.emotions)
                .map(
                    ([emotion, value]) => `
                        <div>
                            ${emotion} :
                            ${value}%
                        </div>
                    `
                )
                .join("");
    }
}


// STOP EMOTION AI
function stopEmotionAI() {

    emotionRunning = false;

    if (emotionInterval) {

        clearInterval(
            emotionInterval
        );

        emotionInterval = null;
    }


    const status =
        document.getElementById(
            "emotionStatus"
        );

    if (status) {

        status.innerText =
            "⚪ Emotion detection stopped.";
    }

    console.log(
        "🛑 Emotion AI stopped"
    );
}
// ============================================================
// SMART HIRE AI - INTERVIEW EMOTION ANALYTICS
// ============================================================

let emotionHistory = [];
let emotionAnalysis = null;


// ============================================================
// RESET EMOTION DATA FOR NEW INTERVIEW
// ============================================================

function resetEmotionHistory() {

    emotionHistory = [];
    emotionAnalysis = null;

    console.log("🧠 Emotion history reset");
}


// ============================================================
// SAVE EVERY EMOTION READING
// ============================================================

function saveEmotionReading(data) {

    if (!data || !data.success) {
        return;
    }

    emotionHistory.push({
        time: new Date().toISOString(),

        emotion: data.emotion,

        confidence:
            Number(data.confidence) || 0,

        emotions: {
            ...(data.emotions || {})
        }
    });

    console.log(
        "📊 Emotion reading saved:",
        data.emotion,
        data.confidence + "%"
    );
}


// ============================================================
// CALCULATE FINAL BEHAVIOR ANALYSIS
// ============================================================

function calculateEmotionAnalysis() {
    const eyeAttention = calculateEyeAttentionScores();
    if (emotionHistory.length === 0) {

        return {
            totalReadings: 0,
            dominantEmotion: "No data",
            dominantPercentage: 0,
            averageConfidence: 0,
            engagementScore: 0,
            positiveScore: 0,
            neutralScore: 0,
            stressScore: 0
        };
    }


    // --------------------------------------------------------
    // Count emotions
    // --------------------------------------------------------

    const emotionCounts = {};

    emotionHistory.forEach(item => {

        emotionCounts[item.emotion] =
            (emotionCounts[item.emotion] || 0) + 1;

    });


    // --------------------------------------------------------
    // Dominant emotion
    // --------------------------------------------------------

    let dominantEmotion = "Unknown";
    let highestCount = 0;

    Object.entries(emotionCounts)
        .forEach(([emotion, count]) => {

            if (count > highestCount) {

                highestCount = count;
                dominantEmotion = emotion;
            }

        });


    const dominantPercentage =
        (
            highestCount /
            emotionHistory.length
        ) * 100;


    // --------------------------------------------------------
    // Average confidence
    // --------------------------------------------------------

    const averageConfidence =
        emotionHistory.reduce(
            (sum, item) =>
                sum + item.confidence,
            0
        ) / emotionHistory.length;


    // --------------------------------------------------------
    // Emotion categories
    // --------------------------------------------------------

    let positiveCount = 0;
    let neutralCount = 0;
    let stressCount = 0;


    emotionHistory.forEach(item => {

        const emotion =
            item.emotion.toLowerCase();


        if (
            emotion === "happiness"
        ) {

            positiveCount++;
        }


        if (
            emotion === "neutral"
        ) {

            neutralCount++;
        }


        if (
            emotion === "fear" ||
            emotion === "anger" ||
            emotion === "disgust" ||
            emotion === "sadness"
        ) {

            stressCount++;
        }

    });


    // --------------------------------------------------------
    // Scores
    // --------------------------------------------------------

    const positiveScore =
        Math.round(
            (
                positiveCount /
                emotionHistory.length
            ) * 100
        );


    const neutralScore =
        Math.round(
            (
                neutralCount /
                emotionHistory.length
            ) * 100
        );


    const stressScore =
        Math.round(
            (
                stressCount /
                emotionHistory.length
            ) * 100
        );


    // --------------------------------------------------------
    // Engagement score
    //
    // Higher positive + neutral presence
    // Lower stress presence
    // --------------------------------------------------------

    const engagementScore =
        Math.max(
            0,
            Math.min(
                100,
                Math.round(
                    (
                        positiveScore * 0.55 +
                        neutralScore * 0.30 +
                        (100 - stressScore) * 0.15
                    )
                )
            )
        );


    return {
    totalReadings:
        emotionHistory.length,

    dominantEmotion,

    dominantPercentage:
        Math.round(
            dominantPercentage * 100
        ) / 100,

    averageConfidence:
        Math.round(
            averageConfidence * 100
        ) / 100,

    engagementScore,

    positiveScore,

    neutralScore,

    stressScore,

    eyeContactScore:
        eyeAttention.eyeContactScore,

    attentionScore:
        eyeAttention.attentionScore
};
}


// ============================================================
// DISPLAY FINAL BEHAVIOR REPORT
// ============================================================

function displayEmotionAnalysis() {

    emotionAnalysis =
        calculateEmotionAnalysis();


    const output =
        document.getElementById(
            "emotionAnalysisOutput"
        );


    if (!output) {

        console.error(
            "emotionAnalysisOutput not found"
        );

        return;
    }


    output.innerHTML = `

        <div class="emotion-report">

            <h2>
                🧠 AI Behavioral Analysis
            </h2>

            <p class="analysis-subtitle">
                Based on live facial-emotion observations
                collected during the interview.
            </p>


           <div class="emotion-stats">

    <!-- EXISTING CARDS -->

    <div class="emotion-stat">

        <span>
            🎯 Dominant Emotion
        </span>

        <strong>
            ${emotionAnalysis.dominantEmotion}
        </strong>

    </div>


    <div class="emotion-stat">

        <span>
            📊 Dominant Percentage
        </span>

        <strong>
            ${emotionAnalysis.dominantPercentage}%
        </strong>

    </div>


    <div class="emotion-stat">

        <span>
            🧠 Average Confidence
        </span>

        <strong>
            ${emotionAnalysis.averageConfidence}%
        </strong>

    </div>


    <div class="emotion-stat">

        <span>
            🎯 Engagement Score
        </span>

        <strong>
            ${emotionAnalysis.engagementScore}%
        </strong>

    </div>


    <!-- ⭐ ADD THESE -->

    <div class="emotion-stat">

        <span>
            👁️ Eye Contact
        </span>

        <strong>
            ${emotionAnalysis.eyeContactScore}%
        </strong>

    </div>


    <div class="emotion-stat">

        <span>
            🎯 Attention
        </span>

        <strong>
            ${emotionAnalysis.attentionScore}%
        </strong>

    </div>

</div>


            <div class="emotion-breakdown">

                <h3>
                    Emotion Breakdown
                </h3>


                <p>
                    😊 Positive:
                    <strong>
                        ${emotionAnalysis.positiveScore}%
                    </strong>
                </p>


                <p>
                    😐 Neutral:
                    <strong>
                        ${emotionAnalysis.neutralScore}%
                    </strong>
                </p>


                <p>
                    ⚠️ Stress Indicators:
                    <strong>
                        ${emotionAnalysis.stressScore}%
                    </strong>
                </p>
                <p>
    👁️ Eye Contact:
    <strong>
        ${emotionAnalysis.eyeContactScore}%
    </strong>
</p>

<p>
    🎯 Attention:
    <strong>
        ${emotionAnalysis.attentionScore}%
    </strong>
</p>


                <p>
                    📸 Total AI Readings:
                    <strong>
                        ${emotionAnalysis.totalReadings}
                    </strong>
                </p>

            </div>


            <div class="analysis-message">

                ${
                    emotionAnalysis.engagementScore >= 75

                    ?

                    "🟢 Strong engagement detected during the interview."

                    :

                    emotionAnalysis.engagementScore >= 50

                    ?

                    "🟡 Moderate engagement detected during the interview."

                    :

                    "🟠 The candidate showed variable engagement during the interview."
                }

            </div>

        </div>

    `;


    console.log(
        "FINAL EMOTION ANALYSIS:",
        emotionAnalysis
    );
    saveEmotionAnalysisToDatabase();

}
// ============================================================
// SAVE FINAL EMOTION ANALYSIS TO DATABASE
// ============================================================

async function saveEmotionAnalysisToDatabase() {

    if (!currentSessionId) {

        console.error(
            "❌ Cannot save analysis: session ID missing"
        );

        return;

    }


    if (!emotionAnalysis) {

        emotionAnalysis =
            calculateEmotionAnalysis();

    }


    const token =
        localStorage.getItem("token");


    if (!token) {

        console.error(
            "❌ Cannot save analysis: token missing"
        );

        return;

    }


    try {

        const response =
            await fetch(

                "http://localhost:5000/api/ai/save-behavior-analysis",

                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${token}`

                    },

                    body:
                    
    JSON.stringify({

        sessionId:
            currentSessionId,

        engagementScore:
            emotionAnalysis.engagementScore,

        positiveScore:
            emotionAnalysis.positiveScore,

        neutralScore:
            emotionAnalysis.neutralScore,

        stressScore:
            emotionAnalysis.stressScore,

        dominantEmotion:
            emotionAnalysis.dominantEmotion,

        dominantPercentage:
            emotionAnalysis.dominantPercentage,

        averageConfidence:
            emotionAnalysis.averageConfidence,

        totalReadings:
            emotionAnalysis.totalReadings,

        // Module 6 → Module 7
        eyeContactScore:
            emotionAnalysis.eyeContactScore,

        attentionScore:
            emotionAnalysis.attentionScore,

        // Technical score will be generated separately
        domainScore:
            0

    })

                }

            );


        const data =
            await response.json();


        if (!response.ok || !data.success) {

            console.error(
                "❌ Failed to save behavior analysis:",
                data
            );

            return;

        }


        console.log(
            "✅ Behavior analysis saved to PostgreSQL",
            data.analysis
        );
        // Refresh dashboard with the newly completed interview result
await loadLatestInterviewPerformance();


    }

    catch (error) {

        console.error(
            "❌ Behavior analysis database error:",
            error
        );

    }

}

// Analyze the webcam image using face position.
// This is a practical camera-facing estimate, not medical-grade gaze tracking.


// ============================================================
// MODULE 6 - REAL EYE CONTACT / IRIS TRACKING
// MediaPipe Face Mesh
// ============================================================

let faceMesh = null;
let eyeTrackingRunning = false;

let attentionHistory = [];
let eyeContactHistory = [];


// MediaPipe eye landmark indexes
const LEFT_EYE = {
    outer: 33,
    inner: 133,
    top: 159,
    bottom: 145,
    iris: [468, 469, 470, 471, 472]
};

const RIGHT_EYE = {
    outer: 263,
    inner: 362,
    top: 386,
    bottom: 374,
    iris: [473, 474, 475, 476, 477]
};


// ------------------------------------------------------------
// Calculate distance
// ------------------------------------------------------------

function landmarkDistance(a, b) {

    const dx = a.x - b.x;
    const dy = a.y - b.y;

    return Math.sqrt(
        dx * dx + dy * dy
    );
}


// ------------------------------------------------------------
// Calculate iris center
// ------------------------------------------------------------

function getIrisCenter(landmarks, indexes) {

    let x = 0;
    let y = 0;

    indexes.forEach(index => {

        x += landmarks[index].x;
        y += landmarks[index].y;

    });

    return {
        x: x / indexes.length,
        y: y / indexes.length
    };
}


// ------------------------------------------------------------
// Calculate eye gaze position
// ------------------------------------------------------------

function getEyeGaze(
    landmarks,
    eye
) {

    const outer =
        landmarks[eye.outer];

    const inner =
        landmarks[eye.inner];

    const top =
        landmarks[eye.top];

    const bottom =
        landmarks[eye.bottom];

    const iris =
        getIrisCenter(
            landmarks,
            eye.iris
        );


    // Eye horizontal center
    const eyeCenterX =
        (outer.x + inner.x) / 2;


    // Eye vertical center
    const eyeCenterY =
        (top.y + bottom.y) / 2;


    // Eye dimensions
    const eyeWidth =
        landmarkDistance(
            outer,
            inner
        );

    const eyeHeight =
        landmarkDistance(
            top,
            bottom
        );


    if (
        eyeWidth === 0 ||
        eyeHeight === 0
    ) {

        return null;
    }


    // Normalize iris position
    const horizontal =
        (
            iris.x -
            eyeCenterX
        ) / eyeWidth;


    const vertical =
        (
            iris.y -
            eyeCenterY
        ) / eyeHeight;


    return {
        horizontal,
        vertical
    };
}


// ------------------------------------------------------------
// Analyze whether candidate is looking toward camera
// ------------------------------------------------------------

function analyzeEyeContact(
    landmarks
) {

    const left =
        getEyeGaze(
            landmarks,
            LEFT_EYE
        );

    const right =
        getEyeGaze(
            landmarks,
            RIGHT_EYE
        );


    if (!left || !right) {

        return {
            eyeContact: false,
            attention: false
        };
    }


    const horizontal =
        (
            Math.abs(left.horizontal) +
            Math.abs(right.horizontal)
        ) / 2;


    const vertical =
        (
            Math.abs(left.vertical) +
            Math.abs(right.vertical)
        ) / 2;


    /*
       Looking at camera:
       iris should remain reasonably close
       to the eye center.

       These thresholds can be adjusted later.
    */

    const lookingHorizontal =
        horizontal < 0.22;

    const lookingVertical =
        vertical < 0.25;


    const eyeContact =
        lookingHorizontal &&
        lookingVertical;


    return {

        eyeContact,

        attention: eyeContact

    };
}


// ------------------------------------------------------------
// MediaPipe result
// ------------------------------------------------------------

function onFaceMeshResults(results) {

    if (!eyeTrackingRunning) {
        return;
    }


    if (
        !results.multiFaceLandmarks ||
        results.multiFaceLandmarks.length === 0
    ) {

        attentionHistory.push(0);
        eyeContactHistory.push(0);

        return;
    }


    const landmarks =
        results.multiFaceLandmarks[0];


    const result =
        analyzeEyeContact(
            landmarks
        );


    eyeContactHistory.push(
        result.eyeContact ? 1 : 0
    );


    attentionHistory.push(
        result.attention ? 1 : 0
    );


    // Keep arrays from becoming huge
    if (eyeContactHistory.length > 3000) {
        eyeContactHistory.shift();
    }

    if (attentionHistory.length > 3000) {
        attentionHistory.shift();
    }
}


// ------------------------------------------------------------
// Initialize MediaPipe
// ------------------------------------------------------------

async function initializeEyeTracking() {

    if (typeof FaceMesh === "undefined") {

        console.error(
            "MediaPipe Face Mesh was not loaded."
        );

        return false;
    }


    faceMesh =
        new FaceMesh({

            locateFile: (file) => {

                return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;

            }

        });


    faceMesh.setOptions({

        maxNumFaces: 1,

        refineLandmarks: true,

        minDetectionConfidence: 0.5,

        minTrackingConfidence: 0.5

    });


    faceMesh.onResults(
        onFaceMeshResults
    );


    console.log(
        "✅ Real eye tracking initialized"
    );


    return true;
}


// ------------------------------------------------------------
// Start eye tracking
// ------------------------------------------------------------

async function startEyeTracking() {

    resetEyeTracking();


    const initialized =
        await initializeEyeTracking();


    if (!initialized) {
        return;
    }


    eyeTrackingRunning = true;


    const video =
        document.getElementById(
            "webcamPreview"
        );


    if (!video) {

        console.error(
            "❌ webcamPreview video element not found"
        );

        return;
    }


    if (
        window.eyeTrackingInterval
    ) {

        clearInterval(
            window.eyeTrackingInterval
        );

    }


    window.eyeTrackingInterval =
        setInterval(
            async () => {

                if (
                    !eyeTrackingRunning ||
                    !faceMesh ||
                    video.readyState < 2
                ) {

                    return;
                }


                try {

                    await faceMesh.send({
                        image: video
                    });

                } catch (error) {

                    console.error(
                        "Eye tracking error:",
                        error
                    );

                }

            },
            150
        );


    console.log(
        "👁️ REAL eye-contact tracking started"
    );
}


// ------------------------------------------------------------
// Stop eye tracking
// ------------------------------------------------------------

function stopEyeTracking() {

    eyeTrackingRunning = false;


    if (
        window.eyeTrackingInterval
    ) {

        clearInterval(
            window.eyeTrackingInterval
        );

        window.eyeTrackingInterval =
            null;

    }


    console.log(
        "👁️ REAL eye-contact tracking stopped"
    );
}


// ------------------------------------------------------------
// Reset tracking
// ------------------------------------------------------------

function resetEyeTracking() {

    attentionHistory = [];

    eyeContactHistory = [];

}


// ------------------------------------------------------------
// Calculate final scores
// ------------------------------------------------------------

function calculateEyeAttentionScores() {

    const eyeTotal =
        eyeContactHistory.length;


    const attentionTotal =
        attentionHistory.length;


    if (
        eyeTotal === 0 ||
        attentionTotal === 0
    ) {

        return {

            eyeContactScore: 0,

            attentionScore: 0

        };

    }


    const eyeContactFrames =
        eyeContactHistory.filter(
            value => value === 1
        ).length;


    const attentionFrames =
        attentionHistory.filter(
            value => value === 1
        ).length;


    const eyeContactScore =
        Math.round(
            (
                eyeContactFrames /
                eyeTotal
            ) * 100
        );


    const attentionScore =
        Math.round(
            (
                attentionFrames /
                attentionTotal
            ) * 100
        );


    return {

        eyeContactScore,

        attentionScore

    };

}

// Calculate final scores
function calculateEyeAttentionScores() {

    const total =
        attentionHistory.length;

    if (!total) {

        return {
            eyeContactScore: 0,
            attentionScore: 0
        };
    }

    const attentiveFrames =
        attentionHistory.filter(
            x => x === 1
        ).length;

    const score =
        Math.round(
            (attentiveFrames / total) * 100
        );

    return {

        eyeContactScore: score,

        attentionScore: score

    };
}
// ============================================================
// MODULE 6 - LIVE WEBCAM AI OVERLAY
// Face + Eye Contact + Attention
// ============================================================

let liveFaceMesh = null;
let liveTrackingActive = false;
let liveLastEyeContact = 0;
let liveLastAttention = 0;


// ------------------------------------------------------------
// GET WEBCAM ELEMENTS
// ------------------------------------------------------------

const liveVideo = document.getElementById("webcamPreview");
const liveCanvas = document.getElementById("eyeTrackingCanvas");

const liveCtx = liveCanvas
    ? liveCanvas.getContext("2d")
    : null;


// ------------------------------------------------------------
// UPDATE LIVE AI TEXT
// ------------------------------------------------------------

function updateLiveAIOverlay() {

    // Existing emotion values from your working AI system
    const emotionElement =
        document.getElementById("currentEmotion");

    const confidenceElement =
        document.getElementById("emotionConfidence");

    const liveEmotion =
        document.getElementById("liveEmotion");

    const liveConfidence =
        document.getElementById("liveConfidence");

    const liveEyeContact =
        document.getElementById("liveEyeContact");

    const liveAttention =
        document.getElementById("liveAttention");


    // Emotion
    if (emotionElement && liveEmotion) {

        let emotion =
            emotionElement.innerText.trim();

        if (
            emotion &&
            emotion !== "Waiting..." &&
            emotion !== "Waiting"
        ) {
            liveEmotion.innerText =
                "😊 Emotion: " + emotion;
        }
    }


    // Confidence
    if (confidenceElement && liveConfidence) {

        let confidence =
            confidenceElement.innerText.trim();

        if (confidence) {

            liveConfidence.innerText =
                "📊 Confidence: " + confidence;
        }
    }


    // Eye contact
    if (liveEyeContact) {

        liveEyeContact.innerText =
            "👁 Eye Contact: " +
            Math.round(liveLastEyeContact) +
            "%";
    }


    // Attention
    if (liveAttention) {

        liveAttention.innerText =
            "🎯 Attention: " +
            Math.round(liveLastAttention) +
            "%";
    }
}


// ------------------------------------------------------------
// RESIZE CANVAS
// ------------------------------------------------------------

function resizeLiveCanvas() {

    if (!liveVideo || !liveCanvas) return;

    if (liveVideo.videoWidth === 0) return;

    liveCanvas.width =
        liveVideo.videoWidth;

    liveCanvas.height =
        liveVideo.videoHeight;
}


// ------------------------------------------------------------
// MEDIAPIPE FACE MESH RESULT
// ------------------------------------------------------------

function handleLiveFaceResults(results) {

    if (!liveCanvas || !liveCtx || !liveVideo) {
        return;
    }

    resizeLiveCanvas();

    liveCtx.clearRect(
        0,
        0,
        liveCanvas.width,
        liveCanvas.height
    );


    // No face
    if (
        !results.multiFaceLandmarks ||
        results.multiFaceLandmarks.length === 0
    ) {

        liveLastEyeContact = 0;
        liveLastAttention = 0;

        updateLiveAIOverlay();

        return;
    }


    const landmarks =
        results.multiFaceLandmarks[0];


    // --------------------------------------------------------
    // FACE BOUNDING BOX
    // --------------------------------------------------------

    let minX = 1;
    let minY = 1;
    let maxX = 0;
    let maxY = 0;

    landmarks.forEach(point => {

        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);

        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);

    });


    const boxX =
        minX * liveCanvas.width;

    const boxY =
        minY * liveCanvas.height;

    const boxWidth =
        (maxX - minX) * liveCanvas.width;

    const boxHeight =
        (maxY - minY) * liveCanvas.height;


    // Green face box
    liveCtx.strokeStyle = "#00ff66";
    liveCtx.lineWidth = 3;

    liveCtx.strokeRect(
        boxX,
        boxY,
        boxWidth,
        boxHeight
    );


    // --------------------------------------------------------
    // FACE CONFIDENCE LABEL
    // --------------------------------------------------------

    liveCtx.fillStyle = "#00ff66";
    liveCtx.font = "bold 18px Arial";

    liveCtx.fillText(
        "Face detected",
        boxX,
        Math.max(25, boxY - 8)
    );


    // --------------------------------------------------------
    // EYE / IRIS TRACKING
    // MediaPipe Face Mesh iris landmarks
    // --------------------------------------------------------

    const leftIris = [468, 469, 470, 471, 472];
    const rightIris = [473, 474, 475, 476, 477];


    function getCenter(indices) {

        let x = 0;
        let y = 0;

        indices.forEach(index => {

            if (landmarks[index]) {

                x += landmarks[index].x;
                y += landmarks[index].y;
            }
        });

        return {
            x: x / indices.length,
            y: y / indices.length
        };
    }


    const leftCenter =
        getCenter(leftIris);

    const rightCenter =
        getCenter(rightIris);


    // --------------------------------------------------------
    // DRAW IRIS POINTS
    // --------------------------------------------------------

    function drawIris(point) {

        const x =
            point.x * liveCanvas.width;

        const y =
            point.y * liveCanvas.height;

        liveCtx.beginPath();

        liveCtx.arc(
            x,
            y,
            5,
            0,
            Math.PI * 2
        );

        liveCtx.fillStyle = "#00ffff";

        liveCtx.fill();
    }


    drawIris(leftCenter);
    drawIris(rightCenter);


    // --------------------------------------------------------
    // ESTIMATE EYE CONTACT
    // --------------------------------------------------------

    const faceCenterX =
        (minX + maxX) / 2;

    const faceCenterY =
        (minY + maxY) / 2;


    const irisCenterX =
        (leftCenter.x + rightCenter.x) / 2;

    const irisCenterY =
        (leftCenter.y + rightCenter.y) / 2;


    const horizontalDifference =
        Math.abs(irisCenterX - faceCenterX);

    const verticalDifference =
        Math.abs(irisCenterY - faceCenterY);


    /*
       Camera-facing estimate:

       Smaller difference =
       candidate looking toward camera.
    */

    let eyeScore = 100;

    eyeScore -=
        horizontalDifference * 500;

    eyeScore -=
        verticalDifference * 250;


    eyeScore =
        Math.max(
            0,
            Math.min(100, eyeScore)
        );


    liveLastEyeContact =
        eyeScore;


    // --------------------------------------------------------
    // ATTENTION SCORE
    // --------------------------------------------------------

    let attentionScore =
        eyeScore;


    // Face size also contributes slightly
    const faceArea =
        boxWidth * boxHeight;


    if (faceArea > 0.08) {

        attentionScore += 5;
    }


    attentionScore =
        Math.max(
            0,
            Math.min(100, attentionScore)
        );


    liveLastAttention =
        attentionScore;


    // --------------------------------------------------------
    // LIVE STATUS ON WEBCAM
    // --------------------------------------------------------

    liveCtx.font =
        "bold 16px Arial";

    liveCtx.fillStyle =
        "#00ffff";


    liveCtx.fillText(
        "Eye Contact: " +
        Math.round(liveLastEyeContact) +
        "%",
        boxX,
        boxY + boxHeight + 25
    );


    liveCtx.fillText(
        "Attention: " +
        Math.round(liveLastAttention) +
        "%",
        boxX,
        boxY + boxHeight + 48
    );


    updateLiveAIOverlay();
}


// ------------------------------------------------------------
// INITIALIZE MEDIAPIPE
// ------------------------------------------------------------

async function initializeLiveFaceMesh() {

    if (liveFaceMesh) {
        return;
    }


    if (
        typeof FaceMesh ===
        "undefined"
    ) {

        console.error(
            "MediaPipe Face Mesh is not loaded."
        );

        return;
    }


    liveFaceMesh =
        new FaceMesh({

            locateFile: (file) => {

                return (
                    "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/" +
                    file
                );
            }

        });


    liveFaceMesh.setOptions({

        maxNumFaces: 1,

        refineLandmarks: true,

        minDetectionConfidence: 0.5,

        minTrackingConfidence: 0.5

    });


    liveFaceMesh.onResults(
        handleLiveFaceResults
    );


    console.log(
        "✅ Live Face Mesh initialized"
    );
}


// ------------------------------------------------------------
// PROCESS WEBCAM FRAMES
// ------------------------------------------------------------

async function processLiveFaceFrame() {

    if (!liveTrackingActive) {
        return;
    }


    if (!liveVideo) {
        return;
    }


    if (
        liveVideo.readyState >= 2 &&
        liveVideo.videoWidth > 0
    ) {

        try {

            await liveFaceMesh.send({
                image: liveVideo
            });

        } catch (error) {

            console.error(
                "Live Face Mesh error:",
                error
            );
        }
    }


    requestAnimationFrame(
        processLiveFaceFrame
    );
}


// ------------------------------------------------------------
// START LIVE TRACKING
// ------------------------------------------------------------

async function startLiveWebcamAI() {

    if (!liveVideo) {
        console.error(
            "webcamPreview not found"
        );

        return;
    }


    await initializeLiveFaceMesh();


    liveTrackingActive = true;


    processLiveFaceFrame();


    updateLiveAIOverlay();


    console.log(
        "🟢 Live webcam AI tracking started"
    );
}


// ------------------------------------------------------------
// STOP LIVE TRACKING
// ------------------------------------------------------------

function stopLiveWebcamAI() {

    liveTrackingActive = false;


    if (liveCtx && liveCanvas) {

        liveCtx.clearRect(
            0,
            0,
            liveCanvas.width,
            liveCanvas.height
        );
    }


    liveLastEyeContact = 0;
    liveLastAttention = 0;


    console.log(
        "⏹ Live webcam AI tracking stopped"
    );
}


// ------------------------------------------------------------
// AUTOMATICALLY START WHEN CAMERA STARTS
// ------------------------------------------------------------

if (liveVideo) {

    liveVideo.addEventListener(
        "loadedmetadata",
        () => {

            resizeLiveCanvas();

        }
    );


    liveVideo.addEventListener(
        "playing",
        () => {

            if (!liveTrackingActive) {

                startLiveWebcamAI();
            }

        }
    );
}


// ------------------------------------------------------------
// KEEP EMOTION VALUES SYNCHRONIZED
// ------------------------------------------------------------

setInterval(
    updateLiveAIOverlay,
    500
);
// ============================================================
// MODULE 7 - LOAD LATEST INTERVIEW PERFORMANCE
// ============================================================

async function loadLatestInterviewPerformance() {

    const token = localStorage.getItem("token");

    if (!token) {
        console.log("No authentication token found.");
        return;
    }

    try {

        const response = await fetch(
            "http://localhost:5000/api/ai/latest-interview-performance",
            {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );

        const data = await response.json();

        if (!data.success) {

            document.getElementById(
                "dashboardAnalysisStatus"
            ).innerText =
                "⚪ No interview assessment available yet.";

            return;
        }

        const analysis = data.analysis;

        // Scores
        document.getElementById(
            "dashboardOverallScore"
        ).innerText =
            `${Number(analysis.overall_score || 0).toFixed(1)}%`;

        document.getElementById(
            "dashboardTechnicalScore"
        ).innerText =
            `${Number(analysis.technical_relevance_score || 0).toFixed(1)}%`;

        document.getElementById(
            "dashboardCommunicationScore"
        ).innerText =
            `${Number(analysis.communication_score || 0).toFixed(1)}%`;

        document.getElementById(
            "dashboardConfidenceScore"
        ).innerText =
            `${Number(analysis.confidence_score || 0).toFixed(1)}%`;

        document.getElementById(
            "dashboardProfessionalismScore"
        ).innerText =
            `${Number(analysis.professionalism_score || 0).toFixed(1)}%`;

        // Rating
        document.getElementById(
            "dashboardPerformanceRating"
        ).innerText =
            analysis.performance_rating || "--";
        // ==========================================
// MODULE 9 - PERFORMANCE SUMMARY
// ==========================================

document.getElementById(
    "summaryOverallScore"
).innerText =
    `${Number(analysis.overall_score || 0).toFixed(1)}%`;

document.getElementById(
    "summaryTechnicalScore"
).innerText =
    `${Number(
        analysis.technical_relevance_score || 0
    ).toFixed(1)}%`;

document.getElementById(
    "summaryCommunicationScore"
).innerText =
    `${Number(
        analysis.communication_score || 0
    ).toFixed(1)}%`;

document.getElementById(
    "summaryConfidenceScore"
).innerText =
    `${Number(
        analysis.confidence_score || 0
    ).toFixed(1)}%`;

document.getElementById(
    "summaryPerformanceRating"
).innerText =
    analysis.performance_rating || "--";

document.getElementById(
    "performanceSummaryStatus"
).innerText =
    "✅ Latest interview performance summary loaded.";

        // Strengths
        displayDashboardList(
            "dashboardStrengths",
            analysis.strengths
        );

        // Weaknesses
        displayDashboardList(
            "dashboardWeaknesses",
            analysis.weaknesses
        );

        // Improvements
        displayDashboardList(
            "dashboardImprovements",
            analysis.improvement_suggestions
        );

        document.getElementById(
            "dashboardAnalysisStatus"
        ).innerText =
            "✅ Latest interview assessment loaded successfully.";

    }
    catch (error) {

        console.error(
            "Load Interview Performance Error:",
            error
        );

        document.getElementById(
            "dashboardAnalysisStatus"
        ).innerText =
            "❌ Failed to load interview assessment.";
    }
}


// Display array data inside dashboard boxes
function displayDashboardList(elementId, items) {

    const container =
        document.getElementById(elementId);

    if (!container) return;

    if (!items) {

        container.innerHTML =
            "<p>No data available.</p>";

        return;
    }

    if (!Array.isArray(items)) {

        container.innerHTML =
            `<p>${items}</p>`;

        return;
    }

    if (items.length === 0) {

        container.innerHTML =
            "<p>No data available.</p>";

        return;
    }

    container.innerHTML =
        `<ul>
            ${items.map(item =>
                `<li>${item}</li>`
            ).join("")}
        </ul>`;
}


// Module 7 performance is loaded only after a new interview
// is completed and its analysis is saved.
// ============================================================
// MODULE 8 - CANDIDATE RANKING DASHBOARD
// ============================================================

async function loadCandidateRanking() {

    const token = localStorage.getItem("token");

    if (!token) {
        alert("Please login first");
        return;
    }

    const output =
        document.getElementById("candidateRankingOutput");

    output.innerHTML =
        "<p>⏳ Loading candidate rankings...</p>";

    try {

        const response = await fetch(
            "http://localhost:5000/api/ai/candidate-ranking",
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const data = await response.json();

        if (!data.success) {

            output.innerHTML =
                `<p style="color:red;">
                    ❌ ${data.message}
                </p>`;

            return;
        }

        if (
            !data.rankings ||
            data.rankings.length === 0
        ) {

            output.innerHTML =
                "<p>No candidate ranking data available.</p>";

            return;
        }

        let html = `
            <div style="overflow-x:auto;">

                <table style="
                    width:100%;
                    border-collapse:collapse;
                    margin-top:15px;
                ">

                    <thead>
                        <tr>
                            <th style="padding:12px;">Rank</th>
                            <th style="padding:12px;">Candidate</th>
                            <th style="padding:12px;">Interviews</th>
                            <th style="padding:12px;">Overall</th>
                            <th style="padding:12px;">Technical</th>
                            <th style="padding:12px;">Communication</th>
                            <th style="padding:12px;">Confidence</th>
                            <th style="padding:12px;">Professionalism</th>
                        </tr>
                    </thead>

                    <tbody>
        `;

        data.rankings.forEach(candidate => {

            html += `
                <tr style="
                    border-top:1px solid #ddd;
                ">

                    <td style="
                        padding:12px;
                        text-align:center;
                        font-weight:bold;
                    ">
                        ${candidate.rank}
                    </td>

                    <td style="padding:12px;">
                        <strong>
                            ${candidate.name}
                        </strong>
                        <br>
                        <small>
                            ${candidate.email}
                        </small>
                    </td>

                    <td style="
                        padding:12px;
                        text-align:center;
                    ">
                        ${candidate.interviewCount}
                    </td>

                    <td style="
                        padding:12px;
                        text-align:center;
                        font-weight:bold;
                    ">
                        ${candidate.overallScore}%
                    </td>

                    <td style="
                        padding:12px;
                        text-align:center;
                    ">
                        ${candidate.technicalScore}%
                    </td>

                    <td style="
                        padding:12px;
                        text-align:center;
                    ">
                        ${candidate.communicationScore}%
                    </td>

                    <td style="
                        padding:12px;
                        text-align:center;
                    ">
                        ${candidate.confidenceScore}%
                    </td>

                    <td style="
                        padding:12px;
                        text-align:center;
                    ">
                        ${candidate.professionalismScore}%
                    </td>

                </tr>
            `;
        });

        html += `
                    </tbody>

                </table>

            </div>
        `;

        // Top candidate
        if (data.topCandidate) {

            html = `
                <div style="
                    padding:18px;
                    margin-bottom:20px;
                    border-radius:10px;
                    background:rgba(255,193,7,0.12);
                ">

                    <h3>
                        🥇 Top Candidate
                    </h3>

                    <p>
                        <strong>
                            ${data.topCandidate.name}
                        </strong>
                    </p>

                    <p>
                        Overall Score:
                        <strong>
                            ${data.topCandidate.overallScore}%
                        </strong>
                    </p>

                </div>
            ` + html;
        }

        output.innerHTML = html;

    }
    catch (error) {

        console.error(
            "Candidate Ranking Error:",
            error
        );

        output.innerHTML =
            `<p style="color:red;">
                ❌ Failed to load candidate rankings.
            </p>`;
    }
}
// ============================================================
// MODULE 8 - SKILL-WISE ANALYTICS DASHBOARD
// ============================================================

async function loadSkillWiseAnalytics() {

    const token = localStorage.getItem("token");

    if (!token) {
        alert("Please login first");
        return;
    }

    const output =
        document.getElementById(
            "skillWiseAnalyticsOutput"
        );

    output.innerHTML =
        "<p>⏳ Loading skill-wise analytics...</p>";

    try {

        // Get current interview session
const sessionId =
    currentSessionId;

if (!sessionId) {

    output.innerHTML =
        `<p style="color:red;">
            ❌ No interview session found.
        </p>`;

    return;
}

        if (!sessionId) {

            output.innerHTML =
                `<p style="color:red;">
                    ❌ No interview session found.
                </p>`;

            return;
        }

        const response = await fetch(
            `http://localhost:5000/api/ai/skill-wise-analytics?sessionId=${sessionId}`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const data =
            await response.json();

        if (!data.success) {

            output.innerHTML =
                `<p style="color:red;">
                    ❌ ${data.message}
                </p>`;

            return;
        }

        if (
            !data.skillAnalytics ||
            data.skillAnalytics.length === 0
        ) {

            output.innerHTML =
                `<p>
                    No skill analytics available.
                </p>`;

            return;
        }

        let html = `
            <div style="overflow-x:auto;">

                <table style="
                    width:100%;
                    border-collapse:collapse;
                    margin-top:15px;
                ">

                    <thead>
                        <tr>

                            <th style="padding:12px;">
                                Skill
                            </th>

                            <th style="padding:12px;">
                                Category
                            </th>

                            <th style="padding:12px;">
                                Questions
                            </th>

                            <th style="padding:12px;">
                                Score
                            </th>

                        </tr>
                    </thead>

                    <tbody>
        `;

        data.skillAnalytics.forEach(item => {

            html += `
                <tr style="
                    border-top:1px solid #ddd;
                ">

                    <td style="
                        padding:12px;
                        font-weight:bold;
                    ">
                        ${item.skill}
                    </td>

                    <td style="
                        padding:12px;
                    ">
                        ${item.category}
                    </td>

                    <td style="
                        padding:12px;
                        text-align:center;
                    ">
                        ${item.questions}
                    </td>

                    <td style="
                        padding:12px;
                        text-align:center;
                        font-weight:bold;
                    ">
                        ${item.score}%
                    </td>

                </tr>
            `;

        });

        html += `
                    </tbody>

                </table>

            </div>
        `;

        // Strongest and weakest skills
        if (
            data.strongestSkill ||
            data.weakestSkill
        ) {

            html = `
                <div style="
                    display:grid;
                    grid-template-columns:
                        repeat(auto-fit,minmax(200px,1fr));
                    gap:15px;
                    margin-bottom:20px;
                ">

                    ${
                        data.strongestSkill
                        ? `
                        <div style="
                            padding:18px;
                            border-radius:10px;
                            background:rgba(40,167,69,0.12);
                        ">

                            <h3>
                                💪 Strongest Skill
                            </h3>

                            <p>
                                <strong>
                                    ${data.strongestSkill.skill}
                                </strong>
                            </p>

                            <p>
                                Score:
                                <strong>
                                    ${data.strongestSkill.score}%
                                </strong>
                            </p>

                        </div>
                        `
                        : ""
                    }

                    ${
                        data.weakestSkill
                        ? `
                        <div style="
                            padding:18px;
                            border-radius:10px;
                            background:rgba(220,53,69,0.12);
                        ">

                            <h3>
                                📚 Skill to Improve
                            </h3>

                            <p>
                                <strong>
                                    ${data.weakestSkill.skill}
                                </strong>
                            </p>

                            <p>
                                Score:
                                <strong>
                                    ${data.weakestSkill.score}%
                                </strong>
                            </p>

                        </div>
                        `
                        : ""
                    }

                </div>
            ` + html;
        }

        output.innerHTML = html;

    }
    catch (error) {

        console.error(
            "Skill-wise Analytics Error:",
            error
        );

        output.innerHTML =
            `<p style="color:red;">
                ❌ Failed to load skill-wise analytics.
            </p>`;
    }
}
// ============================================================
// MODULE 9 - DOWNLOADABLE REPORTS
// ============================================================

// Download Resume Report
function downloadResumeReport() {

    const report = `
========================================
          SMART HIRE AI
          RESUME REPORT
========================================

Candidate: ${document.getElementById("greeting")?.innerText || "Candidate"}

Resume Analysis
----------------------------------------

Skills:
${document.getElementById("skillsOutput")?.innerText || "No resume analysis available."}

Experience:
${document.getElementById("experienceOutput")?.innerText || "No experience information available."}

Technologies:
${document.getElementById("technologyOutput")?.innerText || "No technology information available."}

Education:
${document.getElementById("educationOutput")?.innerText || "No education information available."}

Resume Summary:
${document.getElementById("summaryOutput")?.innerText || "No resume summary available."}

========================================
Generated by SmartHire AI
========================================
`;

    downloadTextFile(
        report,
        "SmartHire_Resume_Report.txt"
    );
}


// Download Interview Report
function downloadInterviewReport() {

    const overall =
        document.getElementById("dashboardOverallScore")?.innerText || "--";

    const technical =
        document.getElementById("dashboardTechnicalScore")?.innerText || "--";

    const communication =
        document.getElementById("dashboardCommunicationScore")?.innerText || "--";

    const confidence =
        document.getElementById("dashboardConfidenceScore")?.innerText || "--";

    const professionalism =
        document.getElementById("dashboardProfessionalismScore")?.innerText || "--";

    const rating =
        document.getElementById("dashboardPerformanceRating")?.innerText || "--";

    const strengths =
        document.getElementById("dashboardStrengths")?.innerText ||
        "No assessment available.";

    const weaknesses =
        document.getElementById("dashboardWeaknesses")?.innerText ||
        "No assessment available.";

    const improvements =
        document.getElementById("dashboardImprovements")?.innerText ||
        "No improvement suggestions available.";

    const report = `
========================================
          SMART HIRE AI
        INTERVIEW REPORT
========================================

Candidate: ${document.getElementById("greeting")?.innerText || "Candidate"}

INTERVIEW PERFORMANCE
----------------------------------------

Overall Score:
${overall}

Technical Relevance:
${technical}

Communication:
${communication}

Confidence:
${confidence}

Professionalism:
${professionalism}

Performance Rating:
${rating}


STRENGTHS
----------------------------------------
${strengths}


AREAS TO IMPROVE
----------------------------------------
${weaknesses}


IMPROVEMENT SUGGESTIONS
----------------------------------------
${improvements}


========================================
Generated by SmartHire AI
========================================
`;

    downloadTextFile(
        report,
        "SmartHire_Interview_Report.txt"
    );
}


// Common download function
function downloadTextFile(content, filename) {

    const blob =
        new Blob(
            [content],
            {
                type: "text/plain"
            }
        );

    const url =
        URL.createObjectURL(blob);

    const link =
        document.createElement("a");

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}
// ============================================================
// MODULE 9 - SESSION ALERTS
// ============================================================

function showSessionAlert(
    title = "🔔 Session Alert",
    message = "Interview session alert."
) {

    const alertBox =
        document.getElementById("sessionAlert");

    const alertTitle =
        document.getElementById("sessionAlertTitle");

    const alertMessage =
        document.getElementById("sessionAlertMessage");

    if (!alertBox) return;

    alertTitle.innerText = title;
    alertMessage.innerText = message;

    alertBox.style.display = "block";

    // Automatically hide after 4 seconds
    setTimeout(() => {

        alertBox.style.display = "none";

    }, 4000);
}
// ============================================================
// MODULE 9 - INTERVIEW REMINDER API
// ============================================================

async function createInterviewReminder() {

    const token =
        localStorage.getItem("token");

    if (!token) {

        alert("Please login first.");
        return;

    }

    const interviewDate =
        document.getElementById(
            "interviewDate"
        ).value;

    const interviewTime =
        document.getElementById(
            "interviewTime"
        ).value;

    const status =
        document.getElementById(
            "interviewReminderStatus"
        );

    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------

    if (!interviewDate || !interviewTime) {

        status.innerHTML =
            `<p style="color:red;">
                ❌ Please select interview date and time.
            </p>`;

        return;

    }

    status.innerHTML =
        `<p>
            ⏳ Creating interview reminder...
        </p>`;

    try {

        const response =
            await fetch(
                "http://localhost:5000/api/ai/interview-reminder",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${token}`
                    },

                    body: JSON.stringify({
                        interviewDate,
                        interviewTime
                    })
                }
            );

        const data =
            await response.json();

        if (!data.success) {

            status.innerHTML =
                `<p style="color:red;">
                    ❌ ${data.message}
                </p>`;

            return;

        }

        status.innerHTML =
            `<p style="color:green;">
                ✅ Interview reminder created successfully.
                <br>
                📅 Date: ${interviewDate}
                <br>
                ⏰ Time: ${interviewTime}
            </p>`;
            // ========================================================
// Schedule reminder 30 minutes before interview
// ========================================================

const interviewDateTime =
    new Date(
        `${interviewDate}T${interviewTime}`
    );

const reminderTime =
    interviewDateTime.getTime()
    - (30 * 60 * 1000);

const currentTime =
    Date.now();

const delay =
    reminderTime - currentTime;

if (delay > 0) {

    // Ask browser permission for notification
    if (
        "Notification" in window &&
        Notification.permission === "default"
    ) {
        await Notification.requestPermission();
    }

    setTimeout(() => {

        if (
            "Notification" in window &&
            Notification.permission === "granted"
        ) {

            new Notification(
                "🔔 SmartHire AI Interview Reminder",
                {
                    body:
                        `Your interview starts in 30 minutes at ${interviewTime}.`,
                    icon: "https://cdn-icons-png.flaticon.com/512/1827/1827392.png"
                }
            );

        } else {

            alert(
                `🔔 SmartHire AI Interview Reminder\n\n` +
                `Your interview starts in 30 minutes at ${interviewTime}.`
            );

        }

    }, delay);

    status.innerHTML +=
        `<p style="color:#8b5cf6;">
            🔔 Reminder scheduled for 30 minutes before your interview.
        </p>`;

}
else {

    status.innerHTML +=
        `<p style="color:#f59e0b;">
            ⚠️ Interview time is too close to schedule a 30-minute reminder.
        </p>`;

}

    }
    catch (error) {

        console.error(
            "Interview Reminder Error:",
            error
        );

        status.innerHTML =
            `<p style="color:red;">
                ❌ Failed to connect to reminder API.
            </p>`;

    }

}
// ============================================================
// MODULE 10 - LOAD INTERVIEW HISTORY
// ============================================================

async function loadInterviewHistory() {

    const token = localStorage.getItem("token");

    const status =
        document.getElementById("interviewHistoryStatus");

    const container =
        document.getElementById("interviewHistoryContainer");

    if (!status || !container) return;

    if (!token) {
        status.innerHTML =
            "❌ Please login again.";
        return;
    }

    try {

        const response = await fetch(
            "http://localhost:5000/api/interview/candidate/interview-history",
            {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {

            status.innerHTML =
                `❌ ${data.message || "Unable to load interview history."}`;

            return;
        }

        if (!data.history || data.history.length === 0) {

            status.innerHTML =
                "ℹ️ No completed interviews found.";

            container.innerHTML = "";

            return;
        }

        status.innerHTML =
            "✅ Interview history loaded.";

        container.innerHTML = "";

        data.history.forEach((interview, index) => {

            const card = document.createElement("div");

            card.style.cssText = `
                padding:20px;
                margin-bottom:15px;
                border-radius:10px;
                background:#f8fafc;
                border:1px solid #e5e7eb;
            `;

            const date = interview.start_time
                ? new Date(interview.start_time)
                    .toLocaleString()
                : "N/A";

            const duration = interview.duration
                ? `${Math.round(interview.duration / 60)} min`
                : "N/A";

            const overallScore =
                interview.overall_score !== null &&
                interview.overall_score !== undefined
                    ? `${Number(interview.overall_score).toFixed(1)}%`
                    : "--";

            card.innerHTML = `
                <h3>
                    🎤 Interview ${data.history.length - index}
                </h3>

                <p>
                    📅 <strong>Date:</strong> ${date}
                </p>

                <p>
                    ⏱️ <strong>Duration:</strong> ${duration}
                </p>

                <p>
                    📝 <strong>Questions Attempted:</strong>
                    ${interview.questions_attempted || 0}
                </p>

                <p>
                    🎯 <strong>Overall Score:</strong>
                    ${overallScore}
                </p>

                <p>
                    💻 <strong>Technical:</strong>
                    ${interview.technical_relevance_score != null
                        ? Number(interview.technical_relevance_score).toFixed(1) + "%"
                        : "--"}
                </p>

                <p>
                    🗣️ <strong>Communication:</strong>
                    ${interview.communication_score != null
                        ? Number(interview.communication_score).toFixed(1) + "%"
                        : "--"}
                </p>

                <p>
                    😎 <strong>Confidence:</strong>
                    ${interview.confidence_score != null
                        ? Number(interview.confidence_score).toFixed(1) + "%"
                        : "--"}
                </p>

                <p>
                    ⭐ <strong>Rating:</strong>
                    ${interview.performance_rating || "Not analyzed"}
                </p>
            `;

            container.appendChild(card);

        });

    } catch (error) {

        console.error(
            "Interview History Error:",
            error
        );

        status.innerHTML =
            "❌ Failed to connect to the server.";
    }
}


// ============================================================
// MODULE 10 - LOAD PERFORMANCE TRENDS
// ============================================================

async function loadPerformanceTrends() {

    const token = localStorage.getItem("token");

    const status =
        document.getElementById("performanceTrendsStatus");

    const container =
        document.getElementById("performanceTrendsContainer");

    if (!status || !container) return;

    if (!token) {
        status.innerHTML =
            "❌ Please login again.";
        return;
    }

    try {

        const response = await fetch(
            "http://localhost:5000/api/interview/candidate/performance-trends",
            {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {

            status.innerHTML =
                `❌ ${data.message || "Unable to load performance trends."}`;

            return;
        }

        if (!data.trends || data.trends.length === 0) {

            status.innerHTML =
                "ℹ️ Complete an interview to see your performance trends.";

            container.innerHTML = "";

            return;
        }

        status.innerHTML =
            "✅ Performance trends loaded.";

        container.innerHTML = "";

        data.trends.forEach((trend, index) => {

            const date = trend.analyzed_at
                ? new Date(trend.analyzed_at)
                    .toLocaleDateString()
                : `Interview ${index + 1}`;

            const overall =
                Number(trend.overall_score || 0);

            const technical =
                Number(trend.technical_relevance_score || 0);

            const communication =
                Number(trend.communication_score || 0);

            const confidence =
                Number(trend.confidence_score || 0);

            const professionalism =
                Number(trend.professionalism_score || 0);

            const card = document.createElement("div");

            card.style.cssText = `
                margin-bottom:18px;
                padding:18px;
                border-radius:10px;
                background:#f8fafc;
                border:1px solid #e5e7eb;
            `;

            card.innerHTML = `
                <h3>
                    📅 ${date}
                </h3>

                <p>
                    🎯 Overall Performance:
                    <strong>${overall.toFixed(1)}%</strong>
                </p>

                <div style="
                    margin:10px 0;
                    height:10px;
                    background:#e5e7eb;
                    border-radius:10px;
                    overflow:hidden;
                ">
                    <div style="
                        width:${Math.min(overall, 100)}%;
                        height:100%;
                        background:#2563eb;
                    "></div>
                </div>

                <div class="analysis-grid">

                    <div class="analysis-box">
                        💻 Technical
                        <strong>
                            ${technical.toFixed(1)}%
                        </strong>
                    </div>

                    <div class="analysis-box">
                        🗣️ Communication
                        <strong>
                            ${communication.toFixed(1)}%
                        </strong>
                    </div>

                    <div class="analysis-box">
                        😎 Confidence
                        <strong>
                            ${confidence.toFixed(1)}%
                        </strong>
                    </div>

                    <div class="analysis-box">
                        👔 Professionalism
                        <strong>
                            ${professionalism.toFixed(1)}%
                        </strong>
                    </div>

                </div>

                <p style="margin-top:12px;">
                    ⭐ Rating:
                    <strong>
                        ${trend.performance_rating || "--"}
                    </strong>
                </p>
            `;

            container.appendChild(card);

        });

    } catch (error) {

        console.error(
            "Performance Trends Error:",
            error
        );

        status.innerHTML =
            "❌ Failed to connect to the server.";
    }
}


// ============================================================
// MODULE 10 - LOAD CANDIDATE ANALYTICS
// ============================================================

window.addEventListener("load", () => {

    loadInterviewHistory();
    loadPerformanceTrends();

});