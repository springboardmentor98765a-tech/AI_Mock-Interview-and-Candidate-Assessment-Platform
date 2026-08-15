import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Sparkles, Volume2, Mic, Bot, MessageSquare, Loader2, CheckCircle2, Clock } from 'lucide-react'

export default function AiAvatar({ state = 'idle', roleTitle = '' }) {
  const stateConfig = {
    thinking: {
      label: roleTitle ? `${roleTitle} is thinking...` : 'AI is thinking...',
      badgeIcon: Loader2,
      mainIcon: Brain,
      auraGradient1: 'radial-gradient(circle, rgba(245,158,11,0.5) 0%, rgba(147,51,234,0.35) 50%, rgba(0,0,0,0) 75%)',
      auraGradient2: 'radial-gradient(circle, rgba(147,51,234,0.4) 0%, rgba(245,158,11,0.25) 60%, rgba(0,0,0,0) 80%)',
      sphereBg: 'radial-gradient(circle at 30% 30%, #fbbf24, #9333ea 55%, #1e1b4b)',
      glowShadow: '0 0 55px rgba(245, 158, 11, 0.65), 0 0 25px rgba(147, 51, 234, 0.45), inset 0 0 30px rgba(255, 255, 255, 0.45)',
      accentColor: '#f59e0b',
      secondaryAccent: '#c084fc',
      badgeBg: 'rgba(245, 158, 11, 0.18)',
      badgeText: '#fef08a',
      badgeBorder: 'rgba(245, 158, 11, 0.4)',
      ringSpeed: 5,
      iconSpin: true
    },
    speaking: {
      label: roleTitle ? `${roleTitle} is speaking...` : 'AI is speaking...',
      badgeIcon: Volume2,
      mainIcon: Bot,
      auraGradient1: 'radial-gradient(circle, rgba(59,130,246,0.5) 0%, rgba(99,102,241,0.35) 50%, rgba(0,0,0,0) 75%)',
      auraGradient2: 'radial-gradient(circle, rgba(99,102,241,0.4) 0%, rgba(168,85,247,0.25) 60%, rgba(0,0,0,0) 80%)',
      sphereBg: 'radial-gradient(circle at 30% 30%, #60a5fa, #4338ca 55%, #1e1b4b)',
      glowShadow: '0 0 55px rgba(99, 102, 241, 0.75), inset 0 0 30px rgba(255, 255, 255, 0.5)',
      accentColor: '#60a5fa',
      secondaryAccent: '#a855f7',
      badgeBg: 'rgba(99, 102, 241, 0.18)',
      badgeText: '#e0e7ff',
      badgeBorder: 'rgba(99, 102, 241, 0.4)',
      ringSpeed: 4,
      talkingBounce: true
    },
    listening: {
      label: 'Listening to your answer...',
      badgeIcon: Mic,
      mainIcon: MessageSquare,
      auraGradient1: 'radial-gradient(circle, rgba(16,185,129,0.5) 0%, rgba(52,211,153,0.35) 50%, rgba(0,0,0,0) 75%)',
      auraGradient2: 'radial-gradient(circle, rgba(52,211,153,0.4) 0%, rgba(16,185,129,0.25) 60%, rgba(0,0,0,0) 80%)',
      sphereBg: 'radial-gradient(circle at 30% 30%, #34d399, #059669 55%, #064e3b)',
      glowShadow: '0 0 55px rgba(16, 185, 129, 0.75), inset 0 0 30px rgba(255, 255, 255, 0.5)',
      accentColor: '#34d399',
      secondaryAccent: '#10b981',
      badgeBg: 'rgba(16, 185, 129, 0.18)',
      badgeText: '#a7f3d0',
      badgeBorder: 'rgba(16, 185, 129, 0.4)',
      ringSpeed: 6
    },
    waiting: {
      label: 'Ready for your response',
      badgeIcon: Clock,
      mainIcon: CheckCircle2,
      auraGradient1: 'radial-gradient(circle, rgba(6,182,212,0.45) 0%, rgba(20,184,166,0.3) 50%, rgba(0,0,0,0) 75%)',
      auraGradient2: 'radial-gradient(circle, rgba(20,184,166,0.35) 0%, rgba(6,182,212,0.2) 60%, rgba(0,0,0,0) 80%)',
      sphereBg: 'radial-gradient(circle at 30% 30%, #22d3ee, #0d9488 55%, #134e4a)',
      glowShadow: '0 0 45px rgba(6, 182, 212, 0.65), inset 0 0 25px rgba(255, 255, 255, 0.45)',
      accentColor: '#22d3ee',
      secondaryAccent: '#14b8a6',
      badgeBg: 'rgba(6, 182, 212, 0.18)',
      badgeText: '#cffafe',
      badgeBorder: 'rgba(6, 182, 212, 0.4)',
      ringSpeed: 8
    },
    idle: {
      label: roleTitle ? `${roleTitle} (AI Interviewer)` : 'AI Interviewer',
      badgeIcon: Sparkles,
      mainIcon: Bot,
      auraGradient1: 'radial-gradient(circle, rgba(99,102,241,0.3) 0%, rgba(129,140,248,0.18) 50%, rgba(0,0,0,0) 75%)',
      auraGradient2: 'radial-gradient(circle, rgba(129,140,248,0.22) 0%, rgba(99,102,241,0.12) 60%, rgba(0,0,0,0) 80%)',
      sphereBg: 'radial-gradient(circle at 30% 30%, #818cf8, #4f46e5 55%, #1e1b4b)',
      glowShadow: '0 0 35px rgba(99, 102, 241, 0.5), inset 0 0 22px rgba(255, 255, 255, 0.4)',
      accentColor: '#818cf8',
      secondaryAccent: '#6366f1',
      badgeBg: 'rgba(99, 102, 241, 0.15)',
      badgeText: '#c7d2fe',
      badgeBorder: 'rgba(99, 102, 241, 0.35)',
      ringSpeed: 12
    }
  }

  const current = stateConfig[state] || stateConfig.idle
  const MainIcon = current.mainIcon
  const BadgeIcon = current.badgeIcon

  const waveformBars = [
    { duration: 0.5, maxH: 34, delay: 0 },
    { duration: 0.4, maxH: 44, delay: 0.08 },
    { duration: 0.65, maxH: 26, delay: 0.16 },
    { duration: 0.45, maxH: 50, delay: 0.04 },
    { duration: 0.6, maxH: 36, delay: 0.12 },
    { duration: 0.38, maxH: 46, delay: 0.2 },
    { duration: 0.52, maxH: 28, delay: 0.06 }
  ]

  const showAudioVisualizer = state === 'speaking' || state === 'listening'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', userSelect: 'none' }}>
      <div style={{ position: 'relative', width: 280, height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div
          animate={{
            scale: state === 'idle' ? [1, 1.08, 1] : state === 'waiting' ? [1, 1.1, 1] : [1, 1.25, 1],
            opacity: state === 'idle' ? [0.35, 0.55, 0.35] : [0.5, 0.88, 0.5]
          }}
          transition={{ duration: current.ringSpeed / 2, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            width: 270,
            height: 270,
            borderRadius: '50%',
            background: current.auraGradient1,
            pointerEvents: 'none'
          }}
        />

        <motion.div
          animate={{
            scale: state === 'idle' ? [1, 1.12, 1] : [1, 1.32, 1],
            opacity: state === 'idle' ? [0.25, 0.45, 0.25] : [0.4, 0.78, 0.4]
          }}
          transition={{ duration: current.ringSpeed / 1.4, repeat: Infinity, ease: 'easeInOut', delay: 0.25 }}
          style={{
            position: 'absolute',
            width: 235,
            height: 235,
            borderRadius: '50%',
            background: current.auraGradient2,
            pointerEvents: 'none'
          }}
        />

        <motion.svg
          animate={{ rotate: 360 }}
          transition={{ duration: current.ringSpeed, repeat: Infinity, ease: 'linear' }}
          style={{ position: 'absolute', width: 250, height: 250, pointerEvents: 'none' }}
          viewBox="0 0 250 250"
        >
          <circle cx="125" cy="125" r="116" fill="none" stroke={current.accentColor} strokeWidth="2" strokeDasharray="8 16" strokeOpacity="0.5" />
          <circle cx="125" cy="9" r="4.5" fill={current.accentColor} opacity="0.95" />
          <circle cx="241" cy="125" r="4.5" fill={current.accentColor} opacity="0.95" />
          <circle cx="125" cy="241" r="4.5" fill={current.accentColor} opacity="0.95" />
          <circle cx="9" cy="125" r="4.5" fill={current.accentColor} opacity="0.95" />
        </motion.svg>

        <motion.svg
          animate={{ rotate: -360 }}
          transition={{ duration: current.ringSpeed * 1.3, repeat: Infinity, ease: 'linear' }}
          style={{ position: 'absolute', width: 215, height: 215, pointerEvents: 'none' }}
          viewBox="0 0 215 215"
        >
          <circle cx="107.5" cy="107.5" r="98" fill="none" stroke={current.secondaryAccent} strokeWidth="1.5" strokeDasharray="4 12" strokeOpacity="0.55" />
          <circle cx="107.5" cy="9.5" r="3.5" fill={current.secondaryAccent} opacity="0.85" />
          <circle cx="205.5" cy="107.5" r="3.5" fill={current.secondaryAccent} opacity="0.85" />
          <circle cx="107.5" cy="205.5" r="3.5" fill={current.secondaryAccent} opacity="0.85" />
          <circle cx="9.5" cy="107.5" r="3.5" fill={current.secondaryAccent} opacity="0.85" />
        </motion.svg>

        <motion.div
          animate={{
            scale: state === 'thinking' ? [0.97, 1.06, 0.97] : state === 'speaking' ? [0.97, 1.08, 0.97] : state === 'listening' ? [0.96, 1.07, 0.96] : state === 'waiting' ? [0.98, 1.04, 0.98] : [0.98, 1.03, 0.98]
          }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'relative',
            width: 175,
            height: 175,
            borderRadius: '50%',
            background: current.sphereBg,
            boxShadow: current.glowShadow,
            border: '2px solid rgba(255, 255, 255, 0.42)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '8%',
              left: '14%',
              width: '36%',
              height: '36%',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0) 70%)',
              pointerEvents: 'none'
            }}
          />

          <AnimatePresence mode="wait">
            <motion.div
              key={state}
              initial={{ scale: 0.5, opacity: 0, rotate: -15 }}
              animate={{
                scale: 1,
                opacity: 1,
                rotate: current.iconSpin ? 360 : 0,
                y: current.talkingBounce ? [0, -6, 0, -4, 0] : 0
              }}
              exit={{ scale: 0.5, opacity: 0, rotate: 15 }}
              transition={
                current.iconSpin
                  ? { rotate: { duration: 3, repeat: Infinity, ease: 'linear' }, scale: { duration: 0.3 }, opacity: { duration: 0.3 } }
                  : current.talkingBounce
                  ? { y: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' }, scale: { duration: 0.3 }, opacity: { duration: 0.3 } }
                  : { duration: 0.3 }
              }
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <MainIcon size={74} color="#ffffff" style={{ filter: 'drop-shadow(0 3px 12px rgba(0,0,0,0.4))' }} />
            </motion.div>
          </AnimatePresence>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            style={{
              position: 'absolute',
              bottom: 4,
              right: 4,
              width: 46,
              height: 46,
              borderRadius: '50%',
              background: 'rgba(15, 23, 42, 0.92)',
              border: `2px solid ${current.accentColor}`,
              boxShadow: `0 0 16px ${current.accentColor}`,
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 3
            }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={state}
                initial={{ scale: 0 }}
                animate={{
                  scale: 1,
                  rotate: current.iconSpin ? 360 : 0
                }}
                exit={{ scale: 0 }}
                transition={
                  current.iconSpin
                    ? { rotate: { duration: 2, repeat: Infinity, ease: 'linear' }, scale: { duration: 0.2 } }
                    : { duration: 0.2 }
                }
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <BadgeIcon size={22} color={current.accentColor} />
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          marginTop: 18,
          padding: '8px 22px',
          borderRadius: 9999,
          background: current.badgeBg,
          border: `1px solid ${current.badgeBorder}`,
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)'
        }}
      >
        <motion.span
          animate={{ scale: [1, 1.45, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            backgroundColor: current.accentColor,
            boxShadow: `0 0 10px ${current.accentColor}`
          }}
        />
        <span style={{ fontSize: 15, fontWeight: 600, color: current.badgeText, letterSpacing: '0.3px' }}>
          {current.label}
        </span>
      </motion.div>

      <AnimatePresence>
        {showAudioVisualizer && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 50, marginTop: 16 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              overflow: 'hidden'
            }}
          >
            {waveformBars.map((bar, index) => (
              <motion.div
                key={index}
                animate={{
                  height: [8, bar.maxH, 8]
                }}
                transition={{
                  duration: state === 'speaking' ? bar.duration : bar.duration * 1.5,
                  repeat: Infinity,
                  repeatType: 'reverse',
                  ease: 'easeInOut',
                  delay: bar.delay
                }}
                style={{
                  width: 5,
                  borderRadius: 5,
                  background: `linear-gradient(to top, ${current.accentColor}, #ffffff)`
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
