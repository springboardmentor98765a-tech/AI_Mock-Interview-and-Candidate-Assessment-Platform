import { useState } from "react";
import { useNavigate } from "react-router-dom";

import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

import "./ResumeUpload.css";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

function ResumeUpload() {
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [analysis, setAnalysis] = useState(null);

  // =====================================================
  // SUPPORTED SKILLS
  // =====================================================

  const skillDatabase = [
    "Python",
    "Java",
    "JavaScript",
    "TypeScript",
    "C",
    "C++",
    "C#",
    "HTML",
    "CSS",
    "React",
    "React.js",
    "Angular",
    "Vue",
    "Node.js",
    "Express",
    "Django",
    "Flask",
    "FastAPI",
    "SQL",
    "MySQL",
    "PostgreSQL",
    "MongoDB",
    "Oracle",
    "Firebase",
    "AWS",
    "Azure",
    "Google Cloud",
    "Docker",
    "Git",
    "GitHub",
    "Machine Learning",
    "Deep Learning",
    "Artificial Intelligence",
    "AI",
    "Data Science",
    "Data Analytics",
    "Power BI",
    "Tableau",
    "TensorFlow",
    "PyTorch",
    "Keras",
    "OpenCV",
    "NLP",
    "Natural Language Processing",
    "CNN",
    "REST API",
    "REST APIs",
    "Bootstrap",
    "Tailwind CSS",
    "Figma",
    "Communication",
    "Leadership",
    "Problem Solving",
    "Teamwork",
  ];

  // =====================================================
  // TECHNOLOGIES
  // =====================================================

  const technologyDatabase = [
    "React",
    "React.js",
    "Angular",
    "Vue",
    "Node.js",
    "Express",
    "Django",
    "Flask",
    "FastAPI",
    "Python",
    "Java",
    "JavaScript",
    "TypeScript",
    "C++",
    "C#",
    "HTML",
    "CSS",
    "SQL",
    "MySQL",
    "PostgreSQL",
    "MongoDB",
    "Firebase",
    "AWS",
    "Azure",
    "Docker",
    "Git",
    "GitHub",
    "TensorFlow",
    "PyTorch",
    "Keras",
    "OpenCV",
    "Power BI",
    "Tableau",
    "Bootstrap",
    "Tailwind CSS",
  ];

  // =====================================================
  // PDF TEXT EXTRACTION
  // =====================================================

  const extractPDFText = async (pdfFile) => {
    const arrayBuffer = await pdfFile.arrayBuffer();

    const pdf = await pdfjsLib.getDocument({
      data: arrayBuffer,
    }).promise;

    let completeText = "";

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);

      const textContent = await page.getTextContent();

      const pageText = textContent.items
        .map((item) => item.str)
        .join(" ");

      completeText += pageText + "\n";
    }

    return completeText;
  };

  // =====================================================
  // FIND SKILLS
  // =====================================================

  const extractSkills = (text) => {
    const lowerText = text.toLowerCase();

    const foundSkills = [];

    skillDatabase.forEach((skill) => {
      const skillLower = skill.toLowerCase();

      if (lowerText.includes(skillLower)) {
        if (!foundSkills.includes(skill)) {
          foundSkills.push(skill);
        }
      }
    });

    return foundSkills;
  };

  // =====================================================
  // FIND TECHNOLOGIES
  // =====================================================

  const extractTechnologies = (text) => {
    const lowerText = text.toLowerCase();

    const foundTechnologies = [];

    technologyDatabase.forEach((technology) => {
      if (lowerText.includes(technology.toLowerCase())) {
        if (!foundTechnologies.includes(technology)) {
          foundTechnologies.push(technology);
        }
      }
    });

    return foundTechnologies;
  };

  // =====================================================
  // EXPERIENCE EXTRACTION
  // =====================================================

  const extractExperience = (text) => {
    const experiencePatterns = [
      /(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)\s*(?:of)?\s*experience/gi,
      /(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)/gi,
    ];

    let years = null;

    for (const pattern of experiencePatterns) {
      const match = pattern.exec(text);

      if (match) {
        years = match[1];
        break;
      }
    }

    const lowerText = text.toLowerCase();

    const roles = [];

    const jobTitles = [
      "software developer",
      "software engineer",
      "web developer",
      "frontend developer",
      "backend developer",
      "full stack developer",
      "full-stack developer",
      "data analyst",
      "data scientist",
      "machine learning engineer",
      "project manager",
      "intern",
      "developer",
      "engineer",
      "analyst",
      "designer",
    ];

    jobTitles.forEach((title) => {
      if (lowerText.includes(title)) {
        if (!roles.includes(title)) {
          roles.push(title);
        }
      }
    });

    return {
      years,
      roles,
    };
  };

  // =====================================================
  // EDUCATION EXTRACTION
  // =====================================================

  const extractEducation = (text) => {
    const education = [];

    const educationPatterns = [
      "BCA",
      "B.Tech",
      "B.E",
      "BE",
      "Bachelor of Technology",
      "Bachelor of Engineering",
      "Bachelor of Computer Applications",
      "MCA",
      "M.Tech",
      "MBA",
      "M.E",
      "Master of Computer Applications",
      "Master of Technology",
      "Bachelor's",
      "Master's",
      "B.Sc",
      "M.Sc",
      "B.Com",
      "M.Com",
      "PhD",
      "Ph.D",
    ];

    educationPatterns.forEach((degree) => {
      if (text.toLowerCase().includes(degree.toLowerCase())) {
        if (!education.includes(degree)) {
          education.push(degree);
        }
      }
    });

    return education;
  };

  // =====================================================
  // RESUME SUMMARY
  // =====================================================

  const generateSummary = (
    text,
    skills,
    technologies,
    experience,
    education
  ) => {
    const cleanText = text
      .replace(/\s+/g, " ")
      .trim();

    if (!cleanText) {
      return "No readable text was found in this PDF.";
    }

    let summary = "SmartHire AI analyzed this resume";

    if (education.length > 0) {
      summary += ` and detected ${education[0]} education`;
    }

    if (experience.years) {
      summary += ` with approximately ${experience.years} years of experience`;
    }

    if (skills.length > 0) {
      summary += ` and skills including ${skills
        .slice(0, 5)
        .join(", ")}`;
    }

    if (technologies.length > 0) {
      summary += `. Technology exposure includes ${technologies
        .slice(0, 5)
        .join(", ")}`;
    }

    return summary + ".";
  };

  // =====================================================
  // ANALYZE RESUME
  // =====================================================

  const analyzeResume = async (pdfFile) => {
    setLoading(true);
    setError("");
    setAnalysis(null);

    try {
      const text = await extractPDFText(pdfFile);

      if (!text.trim()) {
        throw new Error(
          "This PDF does not contain readable text. Please upload a text-based resume PDF."
        );
      }

      const skills = extractSkills(text);

      const technologies = extractTechnologies(text);

      const experience = extractExperience(text);

      const education = extractEducation(text);

      const summary = generateSummary(
        text,
        skills,
        technologies,
        experience,
        education
      );

      setAnalysis({
        skills,
        technologies,
        experience,
        education,
        summary,
        textLength: text.length,
      });
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Unable to analyze this resume. Please try another PDF."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // FILE HANDLER
  // =====================================================

  const handleFile = (selectedFile) => {
    if (!selectedFile) return;

    if (selectedFile.type !== "application/pdf") {
      setError("Please upload a PDF resume only.");
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("Resume must be smaller than 10 MB.");
      return;
    }

    setFile(selectedFile);
    setError("");
    setAnalysis(null);

    analyzeResume(selectedFile);
  };

  // =====================================================
  // INPUT
  // =====================================================

  const handleFileInput = (event) => {
    const selectedFile = event.target.files?.[0];

    handleFile(selectedFile);
  };

  // =====================================================
  // DRAG & DROP
  // =====================================================

  const handleDrop = (event) => {
    event.preventDefault();

    setDragging(false);

    const droppedFile = event.dataTransfer.files?.[0];

    handleFile(droppedFile);
  };

  return (
    <div className="resume-page">

      {/* HEADER */}

      <header className="resume-header">

        <button
          className="resume-brand"
          onClick={() => navigate("/candidate")}
        >
          <div className="resume-logo">S</div>

          <span>
            SmartHire <b>AI</b>
          </span>
        </button>

        <button
          className="resume-back"
          onClick={() => navigate("/candidate")}
        >
          ← Candidate Dashboard
        </button>

      </header>

      {/* MAIN */}

      <main className="resume-container">

        <section className="resume-title">

          <div className="resume-badge">
            ✨ AI Resume Intelligence
          </div>

          <h1>
            Resume Upload &
            <span> Skill Extraction</span>
          </h1>

          <p>
            Upload your resume and SmartHire AI will analyze your
            skills, experience, technologies, education, and create
            an intelligent resume summary.
          </p>

        </section>

        {/* UPLOAD */}

        <section className="upload-card">

          <div
            className={`upload-zone ${
              dragging ? "dragging" : ""
            }`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >

            <input
              id="resume-file"
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileInput}
              hidden
            />

            <label htmlFor="resume-file">

              <div className="upload-icon">
                📄
              </div>

              <h2>
                {file
                  ? file.name
                  : "Upload your resume"}
              </h2>

              <p>
                Drag & drop your PDF here or
                <strong> browse files</strong>
              </p>

              <span>
                PDF only • Maximum 10 MB
              </span>

            </label>

          </div>

          {file && (
            <div className="selected-file">

              <div className="selected-file-icon">
                PDF
              </div>

              <div className="selected-file-info">

                <strong>{file.name}</strong>

                <span>
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </span>

              </div>

              <div className="file-status">
                {loading ? "Analyzing..." : "✓ Ready"}
              </div>

            </div>
          )}

          {loading && (
            <div className="analysis-loading">

              <div className="loading-spinner"></div>

              <div>
                <strong>
                  SmartHire AI is analyzing your resume...
                </strong>

                <span>
                  Extracting skills, experience, technology
                  and education
                </span>
              </div>

            </div>
          )}

          {error && (
            <div className="resume-error">
              ⚠ {error}
            </div>
          )}

        </section>

        {/* RESULTS */}

        {analysis && !loading && (

          <section className="analysis-section">

            <div className="analysis-heading">

              <div>
                <span>
                  ✨ Analysis Complete
                </span>

                <h2>
                  Resume Intelligence Report
                </h2>

                <p>
                  SmartHire AI has analyzed your resume.
                </p>
              </div>

              <div className="analysis-score">
                <strong>
                  ✓
                </strong>

                <span>
                  Resume
                  <br />
                  Analyzed
                </span>
              </div>

            </div>

            {/* SUMMARY */}

            <div className="analysis-card summary-card">

              <div className="analysis-card-title">
                <div className="analysis-card-icon">
                  🧠
                </div>

                <div>
                  <h3>AI Resume Summary</h3>
                  <span>Smart profile overview</span>
                </div>
              </div>

              <p className="summary-text">
                {analysis.summary}
              </p>

            </div>

            {/* SKILLS */}

            <div className="analysis-grid">

              <div className="analysis-card">

                <div className="analysis-card-title">

                  <div className="analysis-card-icon pink-icon">
                    🎯
                  </div>

                  <div>
                    <h3>Extracted Skills</h3>
                    <span>
                      {analysis.skills.length} skills detected
                    </span>
                  </div>

                </div>

                <div className="tag-container">

                  {analysis.skills.length > 0 ? (
                    analysis.skills.map((skill, index) => (
                      <span
                        className="skill-tag"
                        key={`${skill}-${index}`}
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <p className="empty-result">
                      No matching skills detected.
                    </p>
                  )}

                </div>

              </div>

              {/* TECHNOLOGY */}

              <div className="analysis-card">

                <div className="analysis-card-title">

                  <div className="analysis-card-icon purple-icon">
                    💻
                  </div>

                  <div>
                    <h3>Technology Detection</h3>
                    <span>
                      {analysis.technologies.length}
                      {" "}
                      technologies detected
                    </span>
                  </div>

                </div>

                <div className="tag-container">

                  {analysis.technologies.length > 0 ? (
                    analysis.technologies.map(
                      (technology, index) => (
                        <span
                          className="technology-tag"
                          key={`${technology}-${index}`}
                        >
                          {technology}
                        </span>
                      )
                    )
                  ) : (
                    <p className="empty-result">
                      No technologies detected.
                    </p>
                  )}

                </div>

              </div>

            </div>

            {/* EXPERIENCE + EDUCATION */}

            <div className="analysis-grid">

              <div className="analysis-card">

                <div className="analysis-card-title">

                  <div className="analysis-card-icon blue-icon">
                    💼
                  </div>

                  <div>
                    <h3>Experience Parsing</h3>
                    <span>
                      Professional experience analysis
                    </span>
                  </div>

                </div>

                <div className="experience-result">

                  <div className="experience-number">

                    <strong>
                      {analysis.experience.years || "0"}
                    </strong>

                    <span>
                      years
                    </span>

                  </div>

                  <div className="experience-roles">

                    <strong>
                      Detected Roles
                    </strong>

                    {analysis.experience.roles.length > 0 ? (
                      analysis.experience.roles.map(
                        (role, index) => (
                          <span key={`${role}-${index}`}>
                            ✓ {role}
                          </span>
                        )
                      )
                    ) : (
                      <span>
                        No specific role detected
                      </span>
                    )}

                  </div>

                </div>

              </div>

              {/* EDUCATION */}

              <div className="analysis-card">

                <div className="analysis-card-title">

                  <div className="analysis-card-icon violet-icon">
                    🎓
                  </div>

                  <div>
                    <h3>Education Analysis</h3>
                    <span>
                      Academic qualifications detected
                    </span>
                  </div>

                </div>

                <div className="education-result">

                  {analysis.education.length > 0 ? (
                    analysis.education.map(
                      (degree, index) => (
                        <div
                          className="education-item"
                          key={`${degree}-${index}`}
                        >
                          <div>
                            🎓
                          </div>

                          <span>
                            {degree}
                          </span>
                        </div>
                      )
                    )
                  ) : (
                    <p className="empty-result">
                      No recognized qualification detected.
                    </p>
                  )}

                </div>

              </div>

            </div>

            {/* STATS */}

            <div className="analysis-footer">

              <div>
                <strong>
                  {analysis.skills.length}
                </strong>

                <span>
                  Skills
                </span>
              </div>

              <div>
                <strong>
                  {analysis.technologies.length}
                </strong>

                <span>
                  Technologies
                </span>
              </div>

              <div>
                <strong>
                  {analysis.experience.roles.length}
                </strong>

                <span>
                  Roles
                </span>
              </div>

              <div>
                <strong>
                  {analysis.education.length}
                </strong>

                <span>
                  Qualifications
                </span>
              </div>

            </div>

          </section>

        )}

      </main>

    </div>
  );
}

export default ResumeUpload;