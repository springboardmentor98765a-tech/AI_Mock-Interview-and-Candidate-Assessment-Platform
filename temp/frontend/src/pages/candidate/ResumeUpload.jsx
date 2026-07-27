import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import PageHead from '../../components/PageHead';

const MAX_MB = 5;

export default function ResumeUpload() {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);

  const handleFile = (f) => {
    if (!f) return;
    if (f.type !== 'application/pdf') return setError('Only PDF files are accepted.');
    if (f.size > MAX_MB * 1024 * 1024) return setError(`File exceeds ${MAX_MB} MB limit.`);
    
    setError(null);
    setFile({ name: f.name, size: `${(f.size / (1024 * 1024)).toFixed(1)} MB` });
  };

  return (
    <AppLayout>
      <PageHead title="Resume" subtitle="Upload a PDF to match interview questions to your skills." />

      <div className="grid cols-2">
        <section className="card">
          <h2>Upload</h2>

          <div
            className="drop"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFile(e.dataTransfer.files?.[0]);
            }}
          >
            <p>Drop your resume PDF here, or choose a file. Max {MAX_MB} MB.</p>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              hidden
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <button className="btn btn-primary" onClick={() => inputRef.current?.click()}>
              Browse files
            </button>
          </div>

          {error && <p className="error">{error}</p>}

          {file ? (
            <div className="row">
              <span className="avatar">PDF</span>
              <div>
                <strong>{file.name}</strong>
                <small>{file.size}</small>
              </div>
              <span className="badge badge-ok">Ready</span>
              <button className="btn" onClick={() => setFile(null)}>Remove</button>
            </div>
          ) : (
            <p className="note">No resume uploaded yet.</p>
          )}
        </section>

        <section className="card">
          <h2>Resume status</h2>

          {!file ? (
            <p className="note">Upload your resume PDF to proceed with interview generation.</p>
          ) : (
            <>
              <p className="note">Resume <strong>{file.name}</strong> uploaded successfully.</p>
              <Link to="/interview/setup" className="btn btn-primary btn-block">
                Generate interview questions
              </Link>
            </>
          )}
        </section>
      </div>
    </AppLayout>
  );
}
