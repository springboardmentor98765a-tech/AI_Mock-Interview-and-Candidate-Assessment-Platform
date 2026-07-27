import { useEffect, useState } from 'react'

export default function ScoreRing({ score, label, color = '#6366f1', size = 120, strokeWidth = 10 }) {
  const [animatedScore, setAnimatedScore] = useState(0)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (animatedScore / 100) * circumference

  useEffect(() => {
    const timer = setTimeout(() => {
      let start = 0
      const step = score / 60
      const interval = setInterval(() => {
        start += step
        if (start >= score) {
          setAnimatedScore(score)
          clearInterval(interval)
        } else {
          setAnimatedScore(Math.floor(start))
        }
      }, 16)
      return () => clearInterval(interval)
    }, 200)
    return () => clearTimeout(timer)
  }, [score])

  const getColor = (s) => {
    if (s >= 80) return '#22c55e'
    if (s >= 60) return '#f59e0b'
    return '#ef4444'
  }

  const ringColor = color === 'dynamic' ? getColor(score) : color

  return (
    <div className="score-ring-wrap">
      <div className="progress-ring-container" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {/* Background track */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={strokeWidth}
          />
          {/* Progress arc */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.05s ease', filter: `drop-shadow(0 0 6px ${ringColor}80)` }}
          />
        </svg>
        <div className="progress-ring-text">
          <div style={{
            fontFamily: 'Outfit, sans-serif',
            fontWeight: 800,
            fontSize: size > 100 ? '1.6rem' : '1.2rem',
            color: ringColor,
            lineHeight: 1
          }}>
            {animatedScore}
          </div>
          <div style={{ fontSize: '0.65rem', color: '#606080', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>
            /100
          </div>
        </div>
      </div>
      {label && <div className="score-ring-label">{label}</div>}
    </div>
  )
}
