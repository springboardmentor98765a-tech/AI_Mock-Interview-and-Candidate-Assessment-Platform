import { useNavigate } from 'react-router-dom'
import { Brain, Zap, FileSearch, BarChart2, Users2, Clock, Star, ArrowRight, ChevronRight, Sparkles, Target, Shield } from 'lucide-react'

const FEATURES = [
  {
    icon: Zap,
    title: 'AI-Powered Interviews',
    description: 'Conduct realistic mock interviews with adaptive AI that responds dynamically to your answers.',
    color: '#6366f1',
    gradient: 'linear-gradient(135deg, #6366f1, #a855f7)',
  },
  {
    icon: FileSearch,
    title: 'Resume Analysis',
    description: 'Instant deep analysis of your resume with keyword matching, gap detection, and ATS scoring.',
    color: '#06b6d4',
    gradient: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
  },
  {
    icon: BarChart2,
    title: 'Smart Scoring',
    description: 'Get detailed scores on communication, confidence, technical skills, and soft skills.',
    color: '#22c55e',
    gradient: 'linear-gradient(135deg, #22c55e, #06b6d4)',
  },
  {
    icon: Users2,
    title: 'Recruiter Insights',
    description: 'Powerful dashboards for recruiters to evaluate candidates with AI-generated summaries.',
    color: '#a855f7',
    gradient: 'linear-gradient(135deg, #a855f7, #6366f1)',
  },
  {
    icon: Clock,
    title: 'Real-time Feedback',
    description: 'Receive instant, actionable feedback during and after every interview session.',
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)',
  },
  {
    icon: Target,
    title: 'Admin Analytics',
    description: 'Comprehensive platform analytics, user management, and performance monitoring.',
    color: '#ef4444',
    gradient: 'linear-gradient(135deg, #ef4444, #f59e0b)',
  },
]

const STATS = [
  { value: '50K+', label: 'Candidates Assessed' },
  { value: '98%', label: 'Accuracy Rate' },
  { value: '2.3x', label: 'Faster Hiring' },
  { value: '500+', label: 'Companies Trust Us' },
]

export default function HomePage() {
  const navigate = useNavigate()

  return (
    <div className="page-wrapper" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* ===== NAVBAR ===== */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 60px',
        position: 'sticky', top: 0, zIndex: 200,
        background: 'rgba(7,7,17,0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(99,102,241,0.5)',
          }}>
            <Brain size={22} color="white" />
          </div>
          <div>
            <span style={{ fontFamily: 'Outfit', fontWeight: 900, fontSize: '1.2rem', color: '#f0f0ff' }}>SmartHire</span>
            <span style={{ fontFamily: 'Outfit', fontWeight: 900, fontSize: '1.2rem', background: 'linear-gradient(135deg, #6366f1, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}> AI</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          {['Features', 'About', 'Pricing', 'Blog'].map(item => (
            <a key={item} href="#" style={{ fontSize: '0.875rem', color: '#a0a0c0', fontWeight: 500, transition: 'color 0.2s' }}
              onMouseEnter={e => e.target.style.color = '#f0f0ff'}
              onMouseLeave={e => e.target.style.color = '#a0a0c0'}>
              {item}
            </a>
          ))}
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/login')}>
          Get Started <ArrowRight size={14} />
        </button>
      </nav>

      {/* ===== HERO ===== */}
      <section style={{
        minHeight: '92vh',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '80px 24px',
        position: 'relative',
        background: 'radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.12) 0%, transparent 55%), radial-gradient(ellipse at 80% 30%, rgba(168,85,247,0.1) 0%, transparent 50%), radial-gradient(ellipse at 50% 90%, rgba(6,182,212,0.07) 0%, transparent 50%)',
      }}>
        {/* Decorative orbs */}
        <div className="orb orb-indigo" style={{ width: 500, height: 500, top: -100, left: -150, opacity: 0.25, animation: 'float 8s ease-in-out infinite' }} />
        <div className="orb orb-purple" style={{ width: 400, height: 400, bottom: -100, right: -100, opacity: 0.2, animation: 'float 10s ease-in-out infinite reverse' }} />
        <div className="orb orb-cyan"   style={{ width: 300, height: 300, top: '30%', right: '5%', opacity: 0.15, animation: 'float 6s ease-in-out infinite' }} />

        {/* Pill badge */}
        <div className="animate-fadeInUp" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)',
          borderRadius: 9999, padding: '8px 18px', marginBottom: 28,
          animation: 'fadeInUp 0.6s ease forwards',
        }}>
          <Sparkles size={14} color="#6366f1" />
          <span style={{ fontSize: '0.8rem', color: '#a5b4fc', fontWeight: 600, letterSpacing: '0.04em' }}>
            AI-Powered Interview Platform
          </span>
          <span style={{
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            borderRadius: 9999, padding: '2px 8px', fontSize: '0.68rem', color: 'white', fontWeight: 700
          }}>NEW</span>
        </div>

        {/* Headline */}
        <h1 className="animate-fadeInUp delay-100" style={{
          fontFamily: 'Outfit', fontWeight: 900, fontSize: 'clamp(2.8rem, 6vw, 5.5rem)',
          lineHeight: 1.05, maxWidth: 900, marginBottom: 24, color: '#f0f0ff',
        }}>
          Hire Smarter with{' '}
          <span style={{
            background: 'linear-gradient(135deg, #6366f1 20%, #a855f7 50%, #06b6d4 80%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'
          }}>
            AI-Powered
          </span>{' '}
          Assessments
        </h1>

        {/* Subtitle */}
        <p className="animate-fadeInUp delay-200" style={{
          fontSize: 'clamp(1rem, 2vw, 1.25rem)', color: '#a0a0c0', maxWidth: 620,
          lineHeight: 1.7, marginBottom: 44,
        }}>
          Automate candidate screening, conduct intelligent mock interviews, and make data-driven hiring decisions — all in one unified platform.
        </p>

        {/* CTA Buttons */}
        <div className="animate-fadeInUp delay-300" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 72 }}>
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/login')} id="hero-cta-login">
            <Zap size={18} /> Start Free Trial
          </button>
          <button className="btn btn-outline btn-lg" id="hero-cta-demo">
            Watch Demo <ArrowRight size={18} />
          </button>
        </div>

        {/* Stats */}
        <div className="animate-fadeInUp delay-400" style={{
          display: 'flex', gap: 48, flexWrap: 'wrap', justifyContent: 'center',
          padding: '32px 48px',
          background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20,
        }}>
          {STATS.map((s, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'Outfit', fontWeight: 900, fontSize: '2rem', background: 'linear-gradient(135deg, #6366f1, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {s.value}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#606080', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 4 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section id="features" style={{ padding: '100px 60px' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)',
            borderRadius: 9999, padding: '6px 16px', marginBottom: 20,
          }}>
            <Star size={12} color="#06b6d4" />
            <span style={{ fontSize: '0.75rem', color: '#67e8f9', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Core Features</span>
          </div>
          <h2 style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: 'clamp(1.8rem, 4vw, 3rem)', color: '#f0f0ff', marginBottom: 16 }}>
            Everything you need to{' '}
            <span style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              hire better
            </span>
          </h2>
          <p style={{ color: '#a0a0c0', fontSize: '1rem', maxWidth: 560, margin: '0 auto' }}>
            From automated assessments to deep candidate insights, SmartHire AI covers every stage of your hiring pipeline.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, maxWidth: 1200, margin: '0 auto' }}>
          {FEATURES.map((f, i) => {
            const Icon = f.icon
            return (
              <div key={i} className="card" style={{ cursor: 'default' }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: f.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 18, boxShadow: `0 4px 16px ${f.color}40`
                }}>
                  <Icon size={22} color="white" />
                </div>
                <h3 style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '1.1rem', color: '#f0f0ff', marginBottom: 10 }}>
                  {f.title}
                </h3>
                <p style={{ color: '#a0a0c0', fontSize: '0.875rem', lineHeight: 1.65 }}>
                  {f.description}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 18, color: f.color, fontSize: '0.8rem', fontWeight: 600 }}>
                  Learn more <ChevronRight size={14} />
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ===== CTA BANNER ===== */}
      <section style={{ padding: '60px', textAlign: 'center' }}>
        <div style={{
          maxWidth: 800, margin: '0 auto', padding: '64px 48px',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(168,85,247,0.08))',
          border: '1px solid rgba(99,102,241,0.2)', borderRadius: 24,
          position: 'relative', overflow: 'hidden'
        }}>
          <div className="orb orb-indigo" style={{ width: 300, height: 300, top: -100, right: -50, opacity: 0.15 }} />
          <Shield size={40} color="#6366f1" style={{ marginBottom: 20 }} />
          <h2 style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '2rem', color: '#f0f0ff', marginBottom: 16 }}>
            Ready to transform your hiring process?
          </h2>
          <p style={{ color: '#a0a0c0', marginBottom: 32, fontSize: '1rem' }}>
            Join 500+ companies using SmartHire AI to find the best talent faster.
          </p>
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/login')} id="cta-login">
            Get Started Today <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer style={{
        padding: '48px 60px', borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 24
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#6366f1,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Brain size={16} color="white" />
          </div>
          <span style={{ fontFamily: 'Outfit', fontWeight: 800, color: '#f0f0ff', fontSize: '1rem' }}>SmartHire AI</span>
        </div>
        <div style={{ display: 'flex', gap: 32 }}>
          {['Privacy', 'Terms', 'Security', 'Contact'].map(l => (
            <a key={l} href="#" style={{ fontSize: '0.82rem', color: '#606080', transition: 'color 0.2s' }}
              onMouseEnter={e => e.target.style.color = '#a0a0c0'}
              onMouseLeave={e => e.target.style.color = '#606080'}>{l}</a>
          ))}
        </div>
        <div style={{ fontSize: '0.78rem', color: '#404060' }}>
          © 2026 SmartHire AI. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
