import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./RecruiterTemplates.css";

function RecruiterTemplates() {
  const navigate = useNavigate();

  const [templates, setTemplates] = useState([
    {
      id: 1,
      name: "Frontend Developer Screening",
      type: "Technical",
      difficulty: "Intermediate",
      questions: 10,
      duration: 20,
      skills: ["React", "JavaScript", "HTML", "CSS"],
      status: "Active",
      created: "10 Sep 2026",
      used: 24,
    },
    {
      id: 2,
      name: "Python Developer Assessment",
      type: "Technical",
      difficulty: "Advanced",
      questions: 15,
      duration: 30,
      skills: ["Python", "Django", "SQL", "APIs"],
      status: "Active",
      created: "08 Sep 2026",
      used: 18,
    },
    {
      id: 3,
      name: "HR & Behavioral Round",
      type: "Behavioral",
      difficulty: "Intermediate",
      questions: 10,
      duration: 20,
      skills: ["Communication", "Leadership", "Teamwork"],
      status: "Active",
      created: "05 Sep 2026",
      used: 31,
    },
    {
      id: 4,
      name: "Data Analyst Screening",
      type: "Technical",
      difficulty: "Intermediate",
      questions: 12,
      duration: 25,
      skills: ["SQL", "Excel", "Python", "Statistics"],
      status: "Inactive",
      created: "02 Sep 2026",
      used: 9,
    },
  ]);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    type: "Technical",
    difficulty: "Intermediate",
    questions: 10,
    duration: 20,
    skills: "",
    status: "Active",
  });

  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      const matchesSearch =
        template.name.toLowerCase().includes(search.toLowerCase()) ||
        template.skills.some((skill) =>
          skill.toLowerCase().includes(search.toLowerCase())
        );

      const matchesType =
        typeFilter === "All" || template.type === typeFilter;

      const matchesStatus =
        statusFilter === "All" ||
        template.status === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [templates, search, typeFilter, statusFilter]);

  const resetForm = () => {
    setFormData({
      name: "",
      type: "Technical",
      difficulty: "Intermediate",
      questions: 10,
      duration: 20,
      skills: "",
      status: "Active",
    });

    setEditingTemplate(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (template) => {
    setEditingTemplate(template);

    setFormData({
      name: template.name,
      type: template.type,
      difficulty: template.difficulty,
      questions: template.questions,
      duration: template.duration,
      skills: template.skills.join(", "),
      status: template.status,
    });

    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!formData.name.trim()) {
      alert("Please enter a template name.");
      return;
    }

    const skills = formData.skills
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean);

    if (editingTemplate) {
      setTemplates((current) =>
        current.map((template) =>
          template.id === editingTemplate.id
            ? {
                ...template,
                name: formData.name.trim(),
                type: formData.type,
                difficulty: formData.difficulty,
                questions: Number(formData.questions),
                duration: Number(formData.duration),
                skills,
                status: formData.status,
              }
            : template
        )
      );
    } else {
      const newTemplate = {
        id: Date.now(),
        name: formData.name.trim(),
        type: formData.type,
        difficulty: formData.difficulty,
        questions: Number(formData.questions),
        duration: Number(formData.duration),
        skills,
        status: formData.status,
        created: "15 Sep 2026",
        used: 0,
      };

      setTemplates((current) => [newTemplate, ...current]);
    }

    closeModal();
  };

  const toggleStatus = (id) => {
    setTemplates((current) =>
      current.map((template) =>
        template.id === id
          ? {
              ...template,
              status:
                template.status === "Active"
                  ? "Inactive"
                  : "Active",
            }
          : template
      )
    );
  };

  const deleteTemplate = (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this interview template?"
    );

    if (!confirmed) {
      return;
    }

    setTemplates((current) =>
      current.filter((template) => template.id !== id)
    );
  };

  const duplicateTemplate = (template) => {
    const duplicated = {
      ...template,
      id: Date.now(),
      name: `${template.name} Copy`,
      created: "15 Sep 2026",
      used: 0,
    };

    setTemplates((current) => [duplicated, ...current]);
  };

  const totalTemplates = templates.length;

  const activeTemplates = templates.filter(
    (template) => template.status === "Active"
  ).length;

  const technicalTemplates = templates.filter(
    (template) => template.type === "Technical"
  ).length;

  const totalUses = templates.reduce(
    (total, template) => total + template.used,
    0
  );

  return (
    <div className="recruiter-templates-page">
      {/* HEADER */}

      <header className="templates-header">
        <div className="templates-brand">
          <div className="templates-logo">S</div>

          <div>
            <h1>SmartHire AI</h1>
            <p>Interview Template Management</p>
          </div>
        </div>

        <div className="templates-header-actions">
          <button
            className="templates-back-btn"
            onClick={() => navigate("/recruiter")}
          >
            ← Dashboard
          </button>

          <button
            className="templates-create-top-btn"
            onClick={openCreateModal}
          >
            + Create Template
          </button>
        </div>
      </header>

      {/* INTRO */}

      <section className="templates-intro">
        <div>
          <span>RECRUITER WORKSPACE</span>

          <h2>Interview Templates</h2>

          <p>
            Create reusable AI interview structures for different roles,
            skills and hiring stages.
          </p>
        </div>

        <div className="templates-ai-badge">
          <span>✦</span>
          Smart Interview Builder
        </div>
      </section>

      {/* STATISTICS */}

      <section className="template-stats">
        <div className="template-stat-card">
          <div className="template-stat-icon">▦</div>

          <div>
            <span>Total Templates</span>
            <strong>{totalTemplates}</strong>
          </div>
        </div>

        <div className="template-stat-card">
          <div className="template-stat-icon">✓</div>

          <div>
            <span>Active Templates</span>
            <strong>{activeTemplates}</strong>
          </div>
        </div>

        <div className="template-stat-card">
          <div className="template-stat-icon">◈</div>

          <div>
            <span>Technical Templates</span>
            <strong>{technicalTemplates}</strong>
          </div>
        </div>

        <div className="template-stat-card">
          <div className="template-stat-icon">↗</div>

          <div>
            <span>Total Interview Uses</span>
            <strong>{totalUses}</strong>
          </div>
        </div>
      </section>

      {/* FILTERS */}

      <section className="template-controls-card">
        <div className="template-search-box">
          <span>⌕</span>

          <input
            type="text"
            placeholder="Search templates or skills..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <select
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
        >
          <option value="All">All Types</option>
          <option value="Technical">Technical</option>
          <option value="Behavioral">Behavioral</option>
          <option value="HR">HR</option>
          <option value="Aptitude">Aptitude</option>
        </select>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="All">All Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>

        <button
          className="clear-template-filters"
          onClick={() => {
            setSearch("");
            setTypeFilter("All");
            setStatusFilter("All");
          }}
        >
          Clear
        </button>
      </section>

      {/* RESULTS */}

      <section className="templates-main-card">
        <div className="templates-main-heading">
          <div>
            <span>TEMPLATE LIBRARY</span>

            <h2>
              {filteredTemplates.length} Template
              {filteredTemplates.length !== 1 ? "s" : ""}
            </h2>
          </div>

          <button
            className="create-inline-btn"
            onClick={openCreateModal}
          >
            + New Template
          </button>
        </div>

        {filteredTemplates.length === 0 ? (
          <div className="no-templates">
            <div>⌕</div>
            <h3>No templates found</h3>
            <p>
              Try changing your search or filter settings.
            </p>
          </div>
        ) : (
          <div className="template-list">
            {filteredTemplates.map((template) => (
              <article className="template-card" key={template.id}>
                <div className="template-card-top">
                  <div className="template-type-icon">
                    {template.type === "Technical"
                      ? "◈"
                      : template.type === "Behavioral"
                      ? "◎"
                      : template.type === "HR"
                      ? "♡"
                      : "▤"}
                  </div>

                  <div className="template-card-title">
                    <h3>{template.name}</h3>

                    <div className="template-meta">
                      <span>{template.type}</span>
                      <span>{template.difficulty}</span>
                      <span>{template.questions} Questions</span>
                      <span>{template.duration} min</span>
                    </div>
                  </div>

                  <span
                    className={`template-status ${
                      template.status === "Active"
                        ? "template-active"
                        : "template-inactive"
                    }`}
                  >
                    {template.status}
                  </span>
                </div>

                <div className="template-skills">
                  {template.skills.map((skill) => (
                    <span key={skill}>{skill}</span>
                  ))}
                </div>

                <div className="template-card-bottom">
                  <div className="template-created">
                    <span>Created</span>
                    <strong>{template.created}</strong>
                  </div>

                  <div className="template-used">
                    <span>Used</span>
                    <strong>{template.used} interviews</strong>
                  </div>

                  <div className="template-actions">
                    <button
                      onClick={() => openEditModal(template)}
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => duplicateTemplate(template)}
                    >
                      Duplicate
                    </button>

                    <button
                      onClick={() => toggleStatus(template.id)}
                    >
                      {template.status === "Active"
                        ? "Deactivate"
                        : "Activate"}
                    </button>

                    <button
                      className="delete-template-btn"
                      onClick={() => deleteTemplate(template.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* AI INFORMATION */}

      <section className="template-ai-info">
        <div className="template-ai-icon">✦</div>

        <div>
          <span>SMART HIRE AI</span>

          <h2>AI-Powered Interview Templates</h2>

          <p>
            Templates can be used as structured interview configurations.
            In the production version, SmartHire AI can generate
            role-specific questions based on the selected skills,
            difficulty and interview type.
          </p>
        </div>
      </section>

      {/* FOOTER */}

      <footer className="templates-footer">
        <div>
          <strong>SmartHire AI</strong>
          <span>AI-Powered Recruitment Intelligence</span>
        </div>

        <p>
          Build consistent and structured candidate assessments.
        </p>
      </footer>

      {/* CREATE / EDIT MODAL */}

      {showModal && (
        <div className="template-modal-overlay">
          <div className="template-modal">
            <div className="template-modal-header">
              <div>
                <span>
                  {editingTemplate ? "EDIT TEMPLATE" : "NEW TEMPLATE"}
                </span>

                <h2>
                  {editingTemplate
                    ? "Edit Interview Template"
                    : "Create Interview Template"}
                </h2>
              </div>

              <button
                className="template-modal-close"
                onClick={closeModal}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="template-form-group">
                <label>Template Name</label>

                <input
                  type="text"
                  name="name"
                  placeholder="e.g. Java Developer Screening"
                  value={formData.name}
                  onChange={handleFormChange}
                />
              </div>

              <div className="template-form-row">
                <div className="template-form-group">
                  <label>Interview Type</label>

                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleFormChange}
                  >
                    <option value="Technical">Technical</option>
                    <option value="Behavioral">Behavioral</option>
                    <option value="HR">HR</option>
                    <option value="Aptitude">Aptitude</option>
                  </select>
                </div>

                <div className="template-form-group">
                  <label>Difficulty</label>

                  <select
                    name="difficulty"
                    value={formData.difficulty}
                    onChange={handleFormChange}
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">
                      Intermediate
                    </option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
              </div>

              <div className="template-form-row">
                <div className="template-form-group">
                  <label>Number of Questions</label>

                  <input
                    type="number"
                    name="questions"
                    min="1"
                    max="50"
                    value={formData.questions}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="template-form-group">
                  <label>Duration (minutes)</label>

                  <input
                    type="number"
                    name="duration"
                    min="5"
                    max="120"
                    value={formData.duration}
                    onChange={handleFormChange}
                  />
                </div>
              </div>

              <div className="template-form-group">
                <label>Skills / Topics</label>

                <input
                  type="text"
                  name="skills"
                  placeholder="React, JavaScript, APIs"
                  value={formData.skills}
                  onChange={handleFormChange}
                />

                <small>
                  Separate multiple skills using commas.
                </small>
              </div>

              <div className="template-form-group">
                <label>Status</label>

                <select
                  name="status"
                  value={formData.status}
                  onChange={handleFormChange}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="template-modal-actions">
                <button
                  type="button"
                  className="template-cancel-btn"
                  onClick={closeModal}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="template-save-btn"
                >
                  {editingTemplate
                    ? "Save Changes"
                    : "Create Template"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default RecruiterTemplates;