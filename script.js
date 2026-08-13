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
        // SUCCESS ALERT
        // ========================================

        alert(
            "✅ Answer Submitted Successfully!\n\n" +
            "Question " +
            questionNumber +
            " has been saved."
        );

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