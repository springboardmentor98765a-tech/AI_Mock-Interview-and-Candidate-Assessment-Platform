import { useRef, useState } from 'react'
import { FileText, LoaderCircle, Sparkles, Upload } from 'lucide-react'
import { candidateApi } from '../auth/api'

export default function ResumeUploader({ resume, onUploaded }) {
  const input = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const upload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    setBusy(true); setError('')
    try { onUploaded(await candidateApi.uploadResume(file)) } catch (err) { setError(err.message) } finally { setBusy(false); event.target.value = '' }
  }
  const clear = async () => {
    if (!window.confirm('Clear the saved resume analysis? This cannot be undone.')) return
    setBusy(true); setError('')
    try { await candidateApi.clearResume(); onUploaded(null) } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  const data = resume?.extracted_data
  return <section className="card" id="candidate-resume" style={{ marginBottom: 32 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 16, flexWrap: 'wrap' }}><div><h3 style={{ color: '#f0f0ff', fontFamily: 'Outfit' }}>Resume analysis</h3><p style={{ color: '#a0a0c0', fontSize: '.82rem', marginTop: 5 }}>Upload a PDF or DOCX to extract your skills, projects, education, and experience.</p></div><div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}><button className="btn btn-primary" onClick={() => input.current?.click()} disabled={busy}><Upload size={16} />{busy ? 'Analysing...' : resume ? 'Replace resume' : 'Upload resume'}</button>{resume && <button className="btn btn-outline" onClick={clear} disabled={busy} style={{ color: '#fca5a5', borderColor: 'rgba(248,113,113,.45)' }}>Clear analysis</button>}</div><input ref={input} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" style={{ display: 'none' }} onChange={upload} /></div>{error && <p style={{ color: '#f87171', fontSize: '.84rem', marginTop: 14 }}>{error}</p>}{busy && <p style={{ color: '#67e8f9', fontSize: '.84rem', marginTop: 14, display: 'flex', gap: 7, alignItems: 'center' }}><LoaderCircle size={15} className="spin" /> Extracting resume data with Gemini...</p>}{data && <div style={{ marginTop: 20 }}><div style={{ padding: 13, borderRadius: 12, background: 'rgba(99,102,241,.09)', border: '1px solid rgba(129,140,248,.2)' }}><p style={{ color: '#818cf8', fontSize: '.76rem', display: 'flex', alignItems: 'center', gap: 6 }}><FileText size={14} /> {resume.file_name}</p><p style={{ color: '#dadaeb', fontSize: '.85rem', lineHeight: 1.55, marginTop: 7 }}>{data.summary}</p></div><div className="grid-cols-2" style={{ marginTop: 14, gap: 14 }}><Insight title="Skills" values={data.skills} /><Insight title="Projects" values={(data.projects || []).map((project) => `${project.name}${project.technologies?.length ? ` — ${project.technologies.join(', ')}` : ''}${project.description ? `: ${project.description}` : ''}`)} /><Insight title="Education" values={data.education} /><Insight title="Experience" values={data.experience} /></div></div>}</section>
}

function Insight({ title, values }) { return <div style={{ padding: 14, borderRadius: 12, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)' }}><h4 style={{ color: '#f0f0ff', fontSize: '.86rem', display: 'flex', gap: 6, alignItems: 'center' }}><Sparkles size={14} color="#818cf8" /> {title}</h4>{values?.length ? <ul style={{ color: '#bdbdd1', fontSize: '.8rem', lineHeight: 1.55, paddingLeft: 18, marginTop: 9 }}>{values.slice(0, 6).map((item, index) => <li key={index}>{item}</li>)}</ul> : <p style={{ color: '#74748f', fontSize: '.8rem', marginTop: 9 }}>Not found in this resume.</p>}</div> }
