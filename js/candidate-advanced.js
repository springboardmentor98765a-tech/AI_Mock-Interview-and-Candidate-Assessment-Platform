(function () {
    if (!document.querySelector(".sidebar")) {
        return;
    }

    var API_BASE = (window.smartHireApi && window.smartHireApi.baseUrl)
        ? window.smartHireApi.baseUrl + "/api/interviews"
        : "http://localhost:8080/api/interviews";
    var userId = Number(localStorage.getItem("userId") || "0");

    var showToastSafe = function (message) {
        if (typeof window.showToast === "function") {
            window.showToast(message);
            return;
        }
        console.log(message);
    };

    var normalizeList = function (items) {
        if (!Array.isArray(items)) {
            return [];
        }
        return items
            .map(function (item) { return typeof item === "string" ? item.trim() : ""; })
            .filter(function (item) { return item.length > 0; });
    };

    var setList = function (id, items, emptyText) {
        var el = document.getElementById(id);
        if (!el) {
            return;
        }
        el.innerHTML = "";
        var safeItems = normalizeList(items);
        if (!safeItems.length) {
            var li = document.createElement("li");
            li.textContent = emptyText;
            el.appendChild(li);
            return;
        }
        safeItems.forEach(function (item) {
            var li = document.createElement("li");
            li.textContent = item;
            el.appendChild(li);
        });
    };

    var clamp = function (value, min, max) {
        var number = Number(value);
        if (!Number.isFinite(number)) {
            return min;
        }
        if (number < min) {
            return min;
        }
        if (number > max) {
            return max;
        }
        return Math.round(number);
    };

    var setPill = function (id, text, on) {
        var el = document.getElementById(id);
        if (!el) {
            return;
        }
        el.textContent = text;
        el.classList.remove("on", "off");
        el.classList.add(on ? "on" : "off");
    };

    var setValidation = function (message) {
        var el = document.getElementById("liveAdvancedValidation");
        if (!el) {
            return;
        }
        if (!message) {
            el.style.display = "none";
            el.textContent = "";
            return;
        }
        el.style.display = "block";
        el.textContent = message;
    };

    var apiRequest = async function (url, options) {
        if (window.smartHireApi && typeof window.smartHireApi.requestJson === "function") {
            return window.smartHireApi.requestJson(url, Object.assign({ retries: 1 }, options || {}));
        }
        var response = await fetch(url, options || {});
        if (!response.ok) {
            throw new Error("HTTP " + response.status);
        }
        return response.json();
    };

    var recordNotification = async function (type, title, message) {
        if (userId <= 0) {
            return;
        }
        try {
            await apiRequest(API_BASE + "/candidate/" + userId + "/notifications", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: type,
                    title: title,
                    message: message
                })
            });
        } catch (error) {
        }
    };

    var applyTheme = function (theme) {
        var dark = theme === "dark";
        document.body.classList.toggle("dark-mode", dark);
        var toggleBtn = document.getElementById("candidateThemeToggle");
        if (toggleBtn) {
            toggleBtn.textContent = dark ? "Light Mode" : "Dark Mode";
        }
    };

    var initTheme = function () {
        var storedTheme = localStorage.getItem("smarthire.theme") || "light";
        applyTheme(storedTheme);
        var toggleBtn = document.getElementById("candidateThemeToggle");
        if (!toggleBtn) {
            return;
        }
        toggleBtn.addEventListener("click", function () {
            var next = document.body.classList.contains("dark-mode") ? "light" : "dark";
            localStorage.setItem("smarthire.theme", next);
            applyTheme(next);
        });
    };

    var AI_API_BASE = (window.smartHireApi && window.smartHireApi.baseUrl)
        ? window.smartHireApi.baseUrl + "/api/ai"
        : "http://localhost:8080/api/ai";

    var EmotionProvider = function () {};
    EmotionProvider.prototype.detect = async function () {
        return {
            dominantEmotion: "Neutral",
            confidence: 50,
            scores: {
                Happy: 15,
                Neutral: 40,
                Sad: 10,
                Angry: 5,
                Surprised: 15,
                Nervous: 15
            },
            provider: "base",
            simulated: true
        };
    };

    var BackendEmotionProvider = function () {};
    BackendEmotionProvider.prototype = Object.create(EmotionProvider.prototype);
    BackendEmotionProvider.prototype.detect = async function (videoActive, transcript) {
        try {
            var response = await fetch(AI_API_BASE + "/emotion", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ image: (function(){var v=document.getElementById("liveInterviewVideo"); if(!v||!v.videoWidth||!v.videoHeight)return ""; var c=document.createElement("canvas"); var s=Math.min(1,640/v.videoWidth); c.width=Math.round(v.videoWidth*s); c.height=Math.round(v.videoHeight*s); c.getContext("2d").drawImage(v,0,0,c.width,c.height); return c.toDataURL("image/jpeg",0.72);})() })
            });
            if (response.ok) {
                var data = await response.json();
                return {
                    dominantEmotion: data.dominantEmotion || "Neutral",
                    confidence: data.confidence || 50,
                    scores: data.scores || {},
                    provider: data.provider || "backend",
                    simulated: data.simulated || false
                };
            }
        } catch (error) {
        }
        // Fallback to base
        return EmotionProvider.prototype.detect.call(this);
    };

    var SimulatedEmotionProvider = function () {
        this.emotions = ["Happy", "Neutral", "Sad", "Angry", "Surprised", "Nervous"];
        this.index = 1;
    };
    SimulatedEmotionProvider.prototype = Object.create(EmotionProvider.prototype);
    SimulatedEmotionProvider.prototype.detect = async function (videoActive, transcript) {
        this.index = (this.index + 1) % this.emotions.length;
        var emotion = videoActive ? this.emotions[this.index] : "Neutral";
        var transcriptWords = typeof transcript === "string" ? transcript.trim().split(/\s+/).filter(Boolean).length : 0;
        var confidence = clamp(45 + transcriptWords / 2 + (videoActive ? 12 : -8), 25, 98);
        return {
            dominantEmotion: emotion,
            confidence: confidence,
            scores: {
                Happy: clamp(10 + (emotion === "Happy" ? 45 : 0), 0, 100),
                Neutral: clamp(30 + (emotion === "Neutral" ? 35 : 0), 0, 100),
                Sad: clamp(8 + (emotion === "Sad" ? 40 : 0), 0, 100),
                Angry: clamp(5 + (emotion === "Angry" ? 42 : 0), 0, 100),
                Surprised: clamp(10 + (emotion === "Surprised" ? 40 : 0), 0, 100),
                Nervous: clamp(10 + (emotion === "Nervous" ? 42 : 0), 0, 100)
            },
            provider: "simulated-emotion",
            simulated: true
        };
    };

    var EyeContactProvider = function () {};
    EyeContactProvider.prototype.analyze = async function () {
        return {
            eyeContactPercentage: 0,
            lookingAway: true,
            attentionLevel: "Low",
            engagementLevel: "Low",
            provider: "base",
            simulated: true
        };
    };

    var BackendEyeContactProvider = function () {};
    BackendEyeContactProvider.prototype = Object.create(EyeContactProvider.prototype);
    BackendEyeContactProvider.prototype.analyze = async function (videoActive, transcript) {
        try {
            var response = await fetch(AI_API_BASE + "/eye-tracking", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ image: (function(){var v=document.getElementById("liveInterviewVideo"); if(!v||!v.videoWidth||!v.videoHeight)return ""; var c=document.createElement("canvas"); var s=Math.min(1,640/v.videoWidth); c.width=Math.round(v.videoWidth*s); c.height=Math.round(v.videoHeight*s); c.getContext("2d").drawImage(v,0,0,c.width,c.height); return c.toDataURL("image/jpeg",0.72);})() })
            });
            if (response.ok) {
                var data = await response.json();
                return {
                    eyeContactPercentage: data.eyeContactPercentage || 0,
                    lookingAway: (data.eyeContactPercentage || 0) < 45,
                    attentionLevel: data.attentionLevel || "Low",
                    engagementLevel: (data.eyeContactPercentage || 0) >= 70 ? "High" : (data.eyeContactPercentage || 0) >= 45 ? "Medium" : "Low",
                    provider: data.provider || "backend",
                    simulated: data.simulated || false
                };
            }
        } catch (error) {
        }
        // Fallback to base
        return EyeContactProvider.prototype.analyze.call(this);
    };

    var SimulatedEyeContactProvider = function () {
        this.last = 65;
    };
    SimulatedEyeContactProvider.prototype = Object.create(EyeContactProvider.prototype);
    SimulatedEyeContactProvider.prototype.analyze = async function (videoActive, transcript) {
        var words = typeof transcript === "string" ? transcript.trim().split(/\s+/).filter(Boolean).length : 0;
        var drift = Math.random() * 8 - 4;
        var next = clamp(this.last + drift + (videoActive ? 4 : -9) + Math.min(8, words / 20), 15, 97);
        this.last = next;
        var attention = next >= 75 ? "High" : (next >= 50 ? "Medium" : "Low");
        var engagement = next >= 70 && words > 40 ? "High" : (next >= 45 ? "Medium" : "Low");
        return {
            eyeContactPercentage: next,
            lookingAway: next < 45,
            attentionLevel: attention,
            engagementLevel: engagement,
            provider: "simulated-eye",
            simulated: true
        };
    };

    var liveSignalState = {
        emotionProvider: new BackendEmotionProvider(),
        eyeProvider: new BackendEyeContactProvider(),
        running: false,
        intervalId: null,
        latest: {
            emotion: null,
            eye: null
        }
    };

    var currentTranscript = function () {
        var transcriptEl = document.getElementById("liveTranscriptText");
        if (!transcriptEl) {
            return "";
        }
        var value = transcriptEl.textContent || "";
        if (value.indexOf("Your speech will appear here") >= 0) {
            return "";
        }
        return value.trim();
    };

    var updateLiveSignalUI = function () {
        var emotion = liveSignalState.latest.emotion;
        var eye = liveSignalState.latest.eye;

        if (emotion) {
            setPill("liveEmotionLabel", emotion.dominantEmotion, true);
        }

        if (eye) {
            setPill("liveEyeContactPct", eye.eyeContactPercentage + "%", eye.eyeContactPercentage >= 50);
            setPill("liveAttentionLevel", eye.attentionLevel, eye.attentionLevel !== "Low");
            setPill("liveEngagementLevel", eye.engagementLevel, eye.engagementLevel !== "Low");
        }
    };

    var pushSignalsToSessionStorage = function () {
        var payload = {
            emotion: liveSignalState.latest.emotion,
            eyeContact: liveSignalState.latest.eye,
            capturedAt: new Date().toISOString(),
            architecture: {
                emotionProvider: liveSignalState.latest.emotion ? liveSignalState.latest.emotion.provider : "backend",
                eyeProvider: liveSignalState.latest.eye ? liveSignalState.latest.eye.provider : "backend",
                replaceableWith: ["DeepFace", "TensorFlow.js", "MediaPipe"]
            }
        };
        localStorage.setItem("smarthire.liveSignals", JSON.stringify(payload));
    };

    var runLiveSignalCycle = async function () {
        var videoEl = document.getElementById("liveInterviewVideo");
        var videoActive = Boolean(videoEl && videoEl.srcObject);

        if (!videoActive) {
            setValidation("Camera unavailable: running simulation architecture for emotion and eye-contact metrics.");
        } else {
            setValidation("");
        }

        var transcript = currentTranscript();
        liveSignalState.latest.emotion = await liveSignalState.emotionProvider.detect(videoActive, transcript);
        liveSignalState.latest.eye = await liveSignalState.eyeProvider.analyze(videoActive, transcript);
        updateLiveSignalUI();
        pushSignalsToSessionStorage();
    };

    var startLiveSignals = function () {
        if (liveSignalState.running) {
            return;
        }
        liveSignalState.running = true;
        runLiveSignalCycle();
        liveSignalState.intervalId = window.setInterval(runLiveSignalCycle, 2500);
    };

    var stopLiveSignals = function () {
        liveSignalState.running = false;
        if (liveSignalState.intervalId) {
            window.clearInterval(liveSignalState.intervalId);
            liveSignalState.intervalId = null;
        }
    };

    var initLiveSignalArchitecture = function () {
        if (!document.getElementById("liveEmotionLabel")) {
            return;
        }

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setValidation("Unsupported browser: camera/microphone APIs are not available. Simulation mode is active.");
            recordNotification("Interview", "Unsupported browser", "Simulation mode enabled for live metrics.");
        }

        var joinBtn = document.getElementById("liveJoinBtn");
        var leaveBtn = document.getElementById("liveLeaveBtn");

        if (joinBtn) {
            joinBtn.addEventListener("click", function () {
                startLiveSignals();
            });
        }

        if (leaveBtn) {
            leaveBtn.addEventListener("click", function () {
                stopLiveSignals();
            });
        }

        startLiveSignals();
    };

    var analyzeTranscript = function (transcript) {
        var text = typeof transcript === "string" ? transcript.trim() : "";
        if (!text) {
            return {
                grammarQuality: 0,
                speakingPaceWpm: 0,
                fillerWords: 0,
                averageResponseLength: 0,
                insights: "Empty transcript: speech analysis will update once candidate responses are captured."
            };
        }

        var words = text.split(/\s+/).filter(Boolean);
        var wordCount = words.length;
        var sentenceParts = text.split(/[.!?]+/).map(function (item) { return item.trim(); }).filter(Boolean);
        var responseCount = Math.max(1, sentenceParts.length);
        var averageResponseLength = Math.round(wordCount / responseCount);

        var fillerCatalog = ["um", "uh", "like", "you know", "basically", "actually", "literally", "kind of", "sort of"];
        var lower = text.toLowerCase();
        var fillerWords = 0;
        fillerCatalog.forEach(function (phrase) {
            var regex = new RegExp("\\b" + phrase.replace(/\s+/g, "\\s+") + "\\b", "g");
            var match = lower.match(regex);
            fillerWords += match ? match.length : 0;
        });

        var grammarPenalty = fillerWords * 3 + (wordCount < 40 ? 12 : 0);
        var grammarQuality = clamp(92 - grammarPenalty, 20, 99);

        var estimatedMinutes = Math.max(1, Math.round(wordCount / 130));
        var speakingPaceWpm = Math.round(wordCount / estimatedMinutes);

        var insight;
        if (fillerWords > 10) {
            insight = "High filler-word usage detected. Slow down and use short pauses between key points.";
        } else if (speakingPaceWpm > 165) {
            insight = "Speaking pace is fast. Aim for 120-150 WPM to improve clarity.";
        } else if (averageResponseLength < 12) {
            insight = "Responses are short. Add one concrete example to each answer for better impact.";
        } else {
            insight = "Communication quality is stable with balanced pace and useful response detail.";
        }

        return {
            grammarQuality: grammarQuality,
            speakingPaceWpm: speakingPaceWpm,
            fillerWords: fillerWords,
            averageResponseLength: averageResponseLength,
            insights: insight
        };
    };

    var renderSpeechAnalysis = function (analysis) {
        var grammarEl = document.getElementById("speechGrammarQuality");
        var paceEl = document.getElementById("speechPace");
        var fillerEl = document.getElementById("speechFillerWords");
        var avgEl = document.getElementById("speechAvgResponseLength");
        var insightEl = document.getElementById("speechCommunicationInsights");

        if (grammarEl) {
            grammarEl.textContent = analysis.grammarQuality + "%";
        }
        if (paceEl) {
            paceEl.textContent = analysis.speakingPaceWpm + " WPM";
        }
        if (fillerEl) {
            fillerEl.textContent = String(analysis.fillerWords);
        }
        if (avgEl) {
            avgEl.textContent = analysis.averageResponseLength + " words";
        }
        if (insightEl) {
            insightEl.textContent = analysis.insights;
        }

        localStorage.setItem("smarthire.speechInsights", JSON.stringify(analysis));
    };

    var initSpeechAnalysis = function () {
        var transcriptEl = document.getElementById("liveTranscriptText");
        if (!transcriptEl) {
            return;
        }

        var update = function () {
            var analysis = analyzeTranscript(currentTranscript());
            renderSpeechAnalysis(analysis);
        };

        update();

        var observer = new MutationObserver(update);
        observer.observe(transcriptEl, { childList: true, subtree: true, characterData: true });
    };

    var renderRoadmap = function (data) {
        var summaryEl = document.getElementById("careerRoadmapSummary");
        if (summaryEl) {
            summaryEl.textContent = (data && data.summary) ? data.summary : "No roadmap generated yet.";
        }

        setList("careerRoadmapList", data ? data.careerRoadmap : [], "No roadmap milestones yet.");
        setList("careerRoadmapSkills", data ? data.recommendedSkills : [], "No recommended skills yet.");
        setList("careerRoadmapCertifications", data ? data.certifications : [], "No certifications yet.");
        setList("careerRoadmapResources", data ? data.learningResources : [], "No learning resources yet.");
        setList("careerRoadmapProjects", data ? data.practiceProjects : [], "No practice projects yet.");
    };

    var initCareerRoadmap = function () {
        var button = document.getElementById("generateCareerRoadmapBtn");
        if (!button) {
            return;
        }

        button.addEventListener("click", async function () {
            if (userId <= 0) {
                showToastSafe("User ID not found. Please login again.");
                return;
            }

            var statusEl = document.getElementById("careerRoadmapStatus");
            if (statusEl) {
                statusEl.textContent = "Generating roadmap...";
            }

            button.disabled = true;
            var payload = {
                userId: userId,
                currentRole: (document.getElementById("roadmapCurrentRole") || {}).value || "Candidate",
                targetRole: (document.getElementById("roadmapTargetRole") || {}).value || "Software Engineer",
                experienceLevel: (document.getElementById("roadmapExperienceLevel") || {}).value || "Mid",
                currentSkills: ((document.getElementById("roadmapSkills") || {}).value || "")
                    .split(",")
                    .map(function (item) { return item.trim(); })
                    .filter(function (item) { return item.length > 0; })
            };

            try {
                var roadmap = await apiRequest(API_BASE + "/candidate/" + userId + "/career-roadmap/generate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });

                renderRoadmap(roadmap || {});
                if (statusEl) {
                    statusEl.textContent = "Roadmap updated.";
                }
                showToastSafe("Career roadmap generated");
                await recordNotification("Career", "Roadmap generated", "Your latest AI roadmap is now available.");
            } catch (error) {
                if (statusEl) {
                    statusEl.textContent = "Gemini failure fallback applied.";
                }
                showToastSafe("Unable to generate roadmap from API right now");
            } finally {
                button.disabled = false;
            }
        });
    };

    var codingState = {
        questions: [
            {
                title: "Two Sum",
                prompt: "Given an array of integers and a target, return indices of two numbers such that they add up to target.",
                keywords: ["hash", "map", "index", "target"]
            },
            {
                title: "Reverse String",
                prompt: "Write a function that reverses a string in-place or returns a reversed copy.",
                keywords: ["reverse", "loop", "swap"]
            },
            {
                title: "Merge Intervals",
                prompt: "Merge all overlapping intervals and return the merged list.",
                keywords: ["sort", "interval", "overlap", "merge"]
            }
        ],
        answers: {},
        current: 0,
        timer: 30 * 60,
        timerId: null,
        active: false
    };

    var renderCodingQuestion = function () {
        var box = document.getElementById("codingQuestionBox");
        var editor = document.getElementById("codingEditor");
        var prevBtn = document.getElementById("codingPrevBtn");
        var nextBtn = document.getElementById("codingNextBtn");

        if (!box || !editor) {
            return;
        }

        if (!codingState.active) {
            box.textContent = "Start the test to load questions.";
            editor.value = "";
            return;
        }

        var q = codingState.questions[codingState.current];
        box.innerHTML = "<strong>Question " + (codingState.current + 1) + ": " + q.title + "</strong><p style='margin-top:8px; color:#334155;'>" + q.prompt + "</p>";
        editor.value = codingState.answers[codingState.current] || "";

        if (prevBtn) {
            prevBtn.disabled = codingState.current === 0;
        }
        if (nextBtn) {
            nextBtn.disabled = codingState.current >= codingState.questions.length - 1;
        }
    };

    var renderCodingTimer = function () {
        var timerEl = document.getElementById("codingTimer");
        if (!timerEl) {
            return;
        }
        var mins = Math.floor(codingState.timer / 60);
        var secs = codingState.timer % 60;
        timerEl.textContent = String(mins).padStart(2, "0") + ":" + String(secs).padStart(2, "0");
    };

    var finishCodingTest = async function () {
        if (!codingState.active) {
            return;
        }

        var editor = document.getElementById("codingEditor");
        if (editor) {
            codingState.answers[codingState.current] = editor.value || "";
        }

        window.clearInterval(codingState.timerId);
        codingState.timerId = null;
        codingState.active = false;

        var score = 0;
        var insights = [];
        codingState.questions.forEach(function (q, index) {
            var answer = String(codingState.answers[index] || "").toLowerCase();
            var hit = q.keywords.filter(function (keyword) {
                return answer.indexOf(keyword) >= 0;
            }).length;
            var qScore = Math.round((hit / q.keywords.length) * 100);
            score += qScore;
            insights.push("Q" + (index + 1) + " keyword coverage: " + qScore + "%");
        });

        var average = Math.round(score / codingState.questions.length);
        var statusEl = document.getElementById("codingSummaryStatus");
        if (statusEl) {
            statusEl.textContent = "Coding Test Score: " + average + "%";
        }
        setList("codingSummaryInsights", insights, "No insights available.");

        document.getElementById("codingSubmitBtn").disabled = true;
        document.getElementById("codingPrevBtn").disabled = true;
        document.getElementById("codingNextBtn").disabled = true;

        if (userId > 0) {
            try {
                await apiRequest(API_BASE + "/candidate/" + userId + "/assessments", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        assessmentType: "coding",
                        score: average,
                        total: 100,
                        durationSeconds: (30 * 60) - codingState.timer,
                        insights: insights
                    })
                });
            } catch (error) {
            }
        }

        showToastSafe("Coding test submitted");
    };

    var initCodingTest = function () {
        var startBtn = document.getElementById("codingStartBtn");
        var prevBtn = document.getElementById("codingPrevBtn");
        var nextBtn = document.getElementById("codingNextBtn");
        var submitBtn = document.getElementById("codingSubmitBtn");
        var editor = document.getElementById("codingEditor");

        if (!startBtn || !prevBtn || !nextBtn || !submitBtn || !editor) {
            return;
        }

        startBtn.addEventListener("click", function () {
            codingState.active = true;
            codingState.current = 0;
            codingState.timer = 30 * 60;
            codingState.answers = {};
            submitBtn.disabled = false;
            prevBtn.disabled = false;
            nextBtn.disabled = false;
            renderCodingQuestion();
            renderCodingTimer();

            if (codingState.timerId) {
                window.clearInterval(codingState.timerId);
            }
            codingState.timerId = window.setInterval(function () {
                if (!codingState.active) {
                    return;
                }
                codingState.timer -= 1;
                renderCodingTimer();
                if (codingState.timer <= 0) {
                    finishCodingTest();
                }
            }, 1000);
        });

        prevBtn.addEventListener("click", function () {
            if (!codingState.active || codingState.current <= 0) {
                return;
            }
            codingState.answers[codingState.current] = editor.value || "";
            codingState.current -= 1;
            renderCodingQuestion();
        });

        nextBtn.addEventListener("click", function () {
            if (!codingState.active || codingState.current >= codingState.questions.length - 1) {
                return;
            }
            codingState.answers[codingState.current] = editor.value || "";
            codingState.current += 1;
            renderCodingQuestion();
        });

        submitBtn.addEventListener("click", finishCodingTest);
    };

    var aptitudeState = {
        questions: [
            {
                type: "Logical",
                question: "If all A are B and some B are C, which statement is always true?",
                options: ["All A are C", "Some A may be C", "No A are C", "All C are A"],
                correct: 1
            },
            {
                type: "Quantitative",
                question: "A train travels 120 km in 2 hours. What is its average speed?",
                options: ["40 km/h", "50 km/h", "60 km/h", "70 km/h"],
                correct: 2
            },
            {
                type: "Verbal",
                question: "Choose the correct synonym for 'concise'.",
                options: ["Verbose", "Brief", "Unclear", "Slow"],
                correct: 1
            }
        ],
        answers: {},
        current: 0,
        timer: 20 * 60,
        timerId: null,
        active: false
    };

    var renderAptitudeTimer = function () {
        var timerEl = document.getElementById("aptitudeTimer");
        if (!timerEl) {
            return;
        }
        var mins = Math.floor(aptitudeState.timer / 60);
        var secs = aptitudeState.timer % 60;
        timerEl.textContent = String(mins).padStart(2, "0") + ":" + String(secs).padStart(2, "0");
    };

    var renderAptitudeQuestion = function () {
        var box = document.getElementById("aptitudeQuestionBox");
        var optionsEl = document.getElementById("aptitudeOptionsBox");
        var prevBtn = document.getElementById("aptitudePrevBtn");
        var nextBtn = document.getElementById("aptitudeNextBtn");

        if (!box || !optionsEl) {
            return;
        }

        if (!aptitudeState.active) {
            box.textContent = "Start the test to load aptitude questions.";
            optionsEl.innerHTML = "";
            return;
        }

        var q = aptitudeState.questions[aptitudeState.current];
        box.innerHTML = "<strong>" + q.type + " - Question " + (aptitudeState.current + 1) + "</strong><p style='margin-top:8px;'>" + q.question + "</p>";

        optionsEl.innerHTML = "";
        q.options.forEach(function (opt, index) {
            var id = "aptitudeOpt" + aptitudeState.current + "_" + index;
            var wrapper = document.createElement("label");
            wrapper.style.display = "block";
            wrapper.style.padding = "8px";
            wrapper.style.border = "1px solid #dbe3ef";
            wrapper.style.borderRadius = "10px";
            wrapper.style.marginBottom = "8px";
            wrapper.style.cursor = "pointer";
            wrapper.innerHTML = "<input type='radio' name='aptitudeOption' id='" + id + "' style='margin-right:8px;'>" + opt;
            var input = wrapper.querySelector("input");
            if (aptitudeState.answers[aptitudeState.current] === index) {
                input.checked = true;
            }
            input.addEventListener("change", function () {
                aptitudeState.answers[aptitudeState.current] = index;
            });
            optionsEl.appendChild(wrapper);
        });

        if (prevBtn) {
            prevBtn.disabled = aptitudeState.current === 0;
        }
        if (nextBtn) {
            nextBtn.disabled = aptitudeState.current >= aptitudeState.questions.length - 1;
        }
    };

    var finishAptitudeTest = async function () {
        if (!aptitudeState.active) {
            return;
        }

        aptitudeState.active = false;
        if (aptitudeState.timerId) {
            window.clearInterval(aptitudeState.timerId);
            aptitudeState.timerId = null;
        }

        var correct = 0;
        var insights = [];
        aptitudeState.questions.forEach(function (q, index) {
            var ok = aptitudeState.answers[index] === q.correct;
            if (ok) {
                correct += 1;
            }
            insights.push(q.type + " question: " + (ok ? "Correct" : "Needs improvement"));
        });

        var percentage = Math.round((correct / aptitudeState.questions.length) * 100);
        var statusEl = document.getElementById("aptitudeSummaryStatus");
        if (statusEl) {
            statusEl.textContent = "Aptitude Score: " + percentage + "% (" + correct + "/" + aptitudeState.questions.length + ")";
        }
        setList("aptitudeSummaryInsights", insights, "No insights available.");

        document.getElementById("aptitudeSubmitBtn").disabled = true;
        document.getElementById("aptitudePrevBtn").disabled = true;
        document.getElementById("aptitudeNextBtn").disabled = true;

        if (userId > 0) {
            try {
                await apiRequest(API_BASE + "/candidate/" + userId + "/assessments", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        assessmentType: "aptitude",
                        score: percentage,
                        total: 100,
                        durationSeconds: (20 * 60) - aptitudeState.timer,
                        insights: insights
                    })
                });
            } catch (error) {
            }
        }

        showToastSafe("Aptitude test submitted");
    };

    var initAptitudeTest = function () {
        var startBtn = document.getElementById("aptitudeStartBtn");
        var prevBtn = document.getElementById("aptitudePrevBtn");
        var nextBtn = document.getElementById("aptitudeNextBtn");
        var submitBtn = document.getElementById("aptitudeSubmitBtn");

        if (!startBtn || !prevBtn || !nextBtn || !submitBtn) {
            return;
        }

        startBtn.addEventListener("click", function () {
            aptitudeState.active = true;
            aptitudeState.current = 0;
            aptitudeState.timer = 20 * 60;
            aptitudeState.answers = {};

            submitBtn.disabled = false;
            prevBtn.disabled = false;
            nextBtn.disabled = false;

            renderAptitudeQuestion();
            renderAptitudeTimer();

            if (aptitudeState.timerId) {
                window.clearInterval(aptitudeState.timerId);
            }
            aptitudeState.timerId = window.setInterval(function () {
                if (!aptitudeState.active) {
                    return;
                }
                aptitudeState.timer -= 1;
                renderAptitudeTimer();
                if (aptitudeState.timer <= 0) {
                    finishAptitudeTest();
                }
            }, 1000);
        });

        prevBtn.addEventListener("click", function () {
            if (!aptitudeState.active || aptitudeState.current <= 0) {
                return;
            }
            aptitudeState.current -= 1;
            renderAptitudeQuestion();
        });

        nextBtn.addEventListener("click", function () {
            if (!aptitudeState.active || aptitudeState.current >= aptitudeState.questions.length - 1) {
                return;
            }
            aptitudeState.current += 1;
            renderAptitudeQuestion();
        });

        submitBtn.addEventListener("click", finishAptitudeTest);
    };

    var modeHints = {
        technical: "Technical mode focuses on implementation depth, architecture, and trade-offs.",
        hr: "HR mode focuses on communication, motivation, conflict handling, and workplace professionalism.",
        behavioral: "Behavioral mode focuses on STAR-based storytelling, leadership moments, and decision-making."
    };

    var initInterviewModes = function () {
        var select = document.getElementById("interviewModeSelect");
        var hint = document.getElementById("interviewModeHint");
        if (!select || !hint) {
            return;
        }

        var stored = localStorage.getItem("smarthire.interviewMode") || "technical";
        select.value = stored;
        hint.textContent = modeHints[stored] || modeHints.technical;

        select.addEventListener("change", function () {
            var value = select.value || "technical";
            localStorage.setItem("smarthire.interviewMode", value);
            hint.textContent = modeHints[value] || modeHints.technical;
        });
    };

    var profileChecklistDefaults = [
        "Add profile headline",
        "Add key skills",
        "Upload resume",
        "Add project portfolio link",
        "Complete one mock interview"
    ];

    var renderProfileCompletion = function (profileData) {
        var listEl = document.getElementById("profileChecklist");
        var percentEl = document.getElementById("profileCompletionPercent");
        var barEl = document.getElementById("profileCompletionBar");
        var missingEl = document.getElementById("profileMissingInfo");

        if (!listEl || !percentEl || !barEl || !missingEl) {
            return;
        }

        var items = normalizeList((profileData && profileData.checklist) || profileChecklistDefaults);
        if (!items.length) {
            items = profileChecklistDefaults.slice();
        }

        var missing = normalizeList((profileData && profileData.missingItems) || []);
        var completion = clamp(profileData && profileData.completionPercentage, 0, 100);

        listEl.innerHTML = "";
        items.forEach(function (item) {
            var checked = missing.indexOf(item) === -1;
            var wrapper = document.createElement("label");
            wrapper.style.display = "flex";
            wrapper.style.alignItems = "center";
            wrapper.style.gap = "8px";
            wrapper.style.marginBottom = "8px";
            wrapper.innerHTML = "<input type='checkbox' " + (checked ? "checked" : "") + ">" + item;
            listEl.appendChild(wrapper);
        });

        percentEl.textContent = completion + "%";
        barEl.style.width = completion + "%";
        missingEl.textContent = missing.length ? "Missing: " + missing.join(", ") : "Profile is complete.";
    };

    var collectAndSaveProfileCompletion = async function () {
        var listEl = document.getElementById("profileChecklist");
        if (!listEl || userId <= 0) {
            return;
        }

        var rows = Array.prototype.slice.call(listEl.querySelectorAll("label"));
        var checklist = [];
        var missing = [];

        rows.forEach(function (row) {
            var text = row.textContent.trim();
            var checkbox = row.querySelector("input[type='checkbox']");
            checklist.push(text);
            if (!checkbox || !checkbox.checked) {
                missing.push(text);
            }
        });

        var completion = checklist.length ? Math.round(((checklist.length - missing.length) / checklist.length) * 100) : 0;

        renderProfileCompletion({
            completionPercentage: completion,
            checklist: checklist,
            missingItems: missing
        });

        try {
            await apiRequest(API_BASE + "/candidate/" + userId + "/profile-completion", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    completionPercentage: completion,
                    checklist: checklist,
                    missingItems: missing
                })
            });
        } catch (error) {
        }
    };

    var initProfileCompletion = function () {
        var listEl = document.getElementById("profileChecklist");
        if (!listEl) {
            return;
        }

        listEl.addEventListener("change", function () {
            collectAndSaveProfileCompletion();
        });
    };

    var renderNotifications = function (items) {
        var container = document.getElementById("advancedNotificationList");
        if (!container) {
            return;
        }

        var notifications = Array.isArray(items) ? items : [];
        container.innerHTML = "";

        if (!notifications.length) {
            container.innerHTML = "<div class='notify-box info'>No notifications available.</div>";
            return;
        }

        notifications.forEach(function (item) {
            var div = document.createElement("div");
            var type = (item && item.type ? String(item.type) : "Update").toLowerCase();
            var cssType = type.indexOf("resume") >= 0 ? "success" : (type.indexOf("interview") >= 0 ? "info" : "warning");
            var title = item && item.title ? item.title : "Update";
            var message = item && item.message ? item.message : "";
            div.className = "notify-box " + cssType;
            div.style.marginTop = "10px";
            div.innerHTML = "<strong>" + title + "</strong><div style='margin-top:5px; color:#334155;'>" + message + "</div>";
            container.appendChild(div);
        });
    };

    var updateText = function (id, text) {
        var el = document.getElementById(id);
        if (!el) {
            return;
        }
        el.textContent = text;
    };

    var hydrateDashboardMetrics = async function () {
        if (userId <= 0) {
            return;
        }

        var localAts = clamp(Number(localStorage.getItem("smarthire.lastAtsScore") || "0"), 0, 100);
        updateText("candidateAtsScoreValue", String(localAts));
        updateText("candidateAtsScoreHint", localAts > 0 ? "From latest ATS analysis" : "Run ATS analysis");

        var localResumeScore = clamp(Number(localStorage.getItem("smarthire.lastResumeScore") || String(localAts)), 0, 100);
        updateText("candidateResumeScoreValue", String(localResumeScore));
        updateText("candidateResumeScoreHint", localResumeScore > 0 ? "From latest resume analysis" : "Upload and analyze resume");

        try {
            var history = await apiRequest(API_BASE + "/history/" + userId);
            var items = Array.isArray(history) ? history : [];
            var latest = items.length ? items[0] : null;
            var scores = items
                .map(function (item) { return Number(item && item.overallScore); })
                .filter(function (value) { return Number.isFinite(value); });
            var avg = scores.length ? Math.round(scores.reduce(function (sum, value) { return sum + value; }, 0) / scores.length) : 0;

            updateText("candidateInterviewCountValue", String(items.length));
            updateText("candidateInterviewCountHint", items.length ? "Completed" : "No completed interviews");
            updateText("candidateOverallPerformanceValue", String(avg));
            updateText("candidateOverallPerformanceHint", scores.length ? "From interview history" : "Pending interview data");
            updateText("candidatePlacementReadyValue", String(Math.max(avg, 0)));
            updateText("candidatePlacementReadyHint", scores.length ? "Calculated from evaluation trend" : "Pending data");
            updateText("candidateAiRatingValue", scores.length ? (avg >= 85 ? "A+" : avg >= 70 ? "A" : avg >= 55 ? "B" : "C") : "-");
            updateText("candidateAiRatingHint", scores.length ? "Based on interview evaluation" : "No rating yet");

            var role = latest && latest.jobRole ? latest.jobRole : "Not scheduled";
            var dateText = latest && latest.interviewDate ? new Date(latest.interviewDate).toLocaleDateString() : "TBD";
            var timeText = latest && latest.interviewDate ? new Date(latest.interviewDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "TBD";

            updateText("candidateUpcomingRole", role);
            updateText("candidateUpcomingCompany", "SmartHire Interview Team");
            updateText("candidateUpcomingDate", dateText);
            updateText("candidateUpcomingTime", timeText);

            updateText("candidateInterviewCenterRole", role);
            updateText("candidateInterviewCenterCompany", "SmartHire Interview Team");
            updateText("candidateInterviewCenterDate", dateText);
            updateText("candidateInterviewCenterTime", timeText);
        } catch (error) {
            updateText("candidateInterviewCountHint", "Unable to load");
            updateText("candidateOverallPerformanceHint", "Unable to load");
            updateText("candidatePlacementReadyHint", "Unable to load");
            updateText("candidateAiRatingHint", "Unable to load");
        }
    };

    var hydrateIdentity = function () {
        var name = localStorage.getItem("userName") || "Candidate";
        var email = localStorage.getItem("userEmail") || "";
        updateText("dashboardUserName", name);
        updateText("dashboardUserRole", "Candidate");
        updateText("welcomeHeading", "Welcome " + name + " 👋");
        updateText("welcomeSubtitle", email ? ("Signed in as " + email + ". Track your interview preparation and placement progress.") : "Track your interview preparation and placement progress.");
    };

    var setEnhancementLoading = function (loading, message) {
        var statusEl = document.getElementById("careerRoadmapStatus");
        if (!statusEl) {
            return;
        }
        statusEl.textContent = loading ? (message || "Loading...") : (message || "");
    };

    var showEnhancementRetry = function () {
        var container = document.getElementById("advancedNotificationList");
        if (!container) {
            return;
        }
        container.innerHTML = "<div class='notify-box warning'>Failed to load enhancement data. <button id='retryEnhancementLoadBtn' class='secondary-btn' type='button' style='margin-left:8px; padding:6px 10px;'>Retry</button></div>";
        var retry = document.getElementById("retryEnhancementLoadBtn");
        if (retry) {
            retry.addEventListener("click", function () {
                hydrateEnhancementSnapshot();
            });
        }
    };

    var hydrateEnhancementSnapshot = async function () {
        if (userId <= 0) {
            renderProfileCompletion({
                completionPercentage: 40,
                checklist: profileChecklistDefaults,
                missingItems: ["Add project portfolio link", "Complete one mock interview"]
            });
            renderNotifications([]);
            return;
        }

        setEnhancementLoading(true, "Loading enhancement data...");
        try {
            var snapshot = await apiRequest(API_BASE + "/candidate/" + userId + "/enhancements");
            renderRoadmap(snapshot.careerRoadmap || {});
            renderNotifications(snapshot.notifications || []);
            renderProfileCompletion(snapshot.profileCompletion || {});
            setEnhancementLoading(false, "");
        } catch (error) {
            showToastSafe("Unable to load enhancement snapshot");
            setEnhancementLoading(false, "Unable to load enhancement data.");
            showEnhancementRetry();
        }
    };

    var initValidationHooks = function () {
        var transcriptBtn = document.getElementById("liveTranscriptDownloadBtn");
        if (transcriptBtn) {
            transcriptBtn.addEventListener("click", function () {
                if (!currentTranscript()) {
                    setValidation("Empty transcript: start listening and answer at least one question.");
                }
            });
        }

        var joinBtn = document.getElementById("liveJoinBtn");
        if (joinBtn) {
            joinBtn.addEventListener("click", function () {
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    setValidation("Camera unavailable: your browser cannot access media devices.");
                }
            });
        }
    };

    initTheme();
    hydrateIdentity();
    initInterviewModes();
    initLiveSignalArchitecture();
    initSpeechAnalysis();
    initCareerRoadmap();
    initCodingTest();
    initAptitudeTest();
    initProfileCompletion();
    initValidationHooks();
    hydrateEnhancementSnapshot();
    hydrateDashboardMetrics();
})();
