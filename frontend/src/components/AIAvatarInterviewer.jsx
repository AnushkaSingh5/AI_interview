import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiVolume2, FiVolumeX, FiSettings, FiCheck
} from 'react-icons/fi';
import avatarImg from '../assets/avatar.png';

// Interviewer Persona Configurations
const PERSONAS = [
  {
    id: 'alex',
    name: 'Alex Rivera',
    title: 'Senior Tech Lead & AI Interviewer',
    voiceKeywords: ['Alex', 'David', 'Google US English', 'Natural', 'Male', 'en-US'],
    gender: 'male',
    accentColor: '#8b5cf6',
    glowColor: 'rgba(139, 92, 246, 0.45)'
  },
  {
    id: 'sarah',
    name: 'Sarah Chen',
    title: 'Principal Architect & System Design Evaluator',
    voiceKeywords: ['Samantha', 'Zira', 'Google UK English Female', 'Natural', 'Female', 'en-US'],
    gender: 'female',
    accentColor: '#ec4899',
    glowColor: 'rgba(236, 72, 153, 0.45)'
  },
  {
    id: 'marcus',
    name: 'Marcus Vance',
    title: 'VP of Engineering & Behavioral Expert',
    voiceKeywords: ['Daniel', 'George', 'Google UK English Male', 'Natural', 'en-GB'],
    gender: 'male',
    accentColor: '#10b981',
    glowColor: 'rgba(16, 185, 129, 0.45)'
  }
];

const AIAvatarInterviewer = ({
  questionText = '',
  questionNumber = 1,
  totalQuestions = 5,
  isRecording = false,
  isEvaluating = false,
  onSpeechStart = () => {},
  onSpeechEnd = () => {},
  autoSpeak = true,
  mode = 'video', // 'video', 'voice', or 'compact'
  showControls = true,
  showSubtitles = false,
  className = '',
  style = {}
}) => {
  // Active Persona
  const [personaId, setPersonaId] = useState('alex');
  const persona = useMemo(() => PERSONAS.find(p => p.id === personaId) || PERSONAS[0], [personaId]);

  // Speech & Voice States
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [speechRate, setSpeechRate] = useState(0.95);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(showSubtitles || mode === 'voice');
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  // Animation States
  const [headTilt, setHeadTilt] = useState(0);
  const [audioWaves, setAudioWaves] = useState([25, 55, 80, 95, 70, 40, 85, 60, 75, 45, 90, 40]);

  const utteranceRef = useRef(null);
  const waveIntervalRef = useRef(null);
  const nodTimerRef = useRef(null);
  const safetyTimeoutRef = useRef(null);
  const lastSpokenQuestionRef = useRef('');

  // 1. Populate Web Speech Voices
  useEffect(() => {
    const updateVoices = () => {
      if (!('speechSynthesis' in window)) return;
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        setAvailableVoices(voices);
        const matched = voices.find(v => 
          v.lang.startsWith('en') && persona.voiceKeywords.some(kw => v.name.toLowerCase().includes(kw.toLowerCase()))
        ) || voices.find(v => v.lang.startsWith('en')) || voices[0];
        setSelectedVoice(matched);
      }
    };

    updateVoices();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, [persona]);

  // 2. Subtle Gaze & Head Movements
  useEffect(() => {
    const gazeInterval = setInterval(() => {
      if (isSpeaking) {
        setHeadTilt((Math.random() - 0.5) * 3);
      } else if (isRecording) {
        setHeadTilt(2 * (Math.random() > 0.5 ? 1 : -1));
      } else {
        setHeadTilt(0);
      }
    }, 2800);

    return () => clearInterval(gazeInterval);
  }, [isSpeaking, isRecording]);

  // 3. Attentive Nodding Animation when Candidate is Speaking / Recording
  useEffect(() => {
    if (isRecording && !isSpeaking) {
      const scheduleNod = () => {
        setHeadTilt(prev => prev === 2.5 ? -1.5 : 2.5);
        nodTimerRef.current = setTimeout(scheduleNod, 3200 + Math.random() * 2000);
      };
      nodTimerRef.current = setTimeout(scheduleNod, 2500);
    } else {
      clearTimeout(nodTimerRef.current);
    }
    return () => clearTimeout(nodTimerRef.current);
  }, [isRecording, isSpeaking]);

  // 4. Equalizer Wave Generator synced to Speech
  useEffect(() => {
    if (isSpeaking) {
      waveIntervalRef.current = setInterval(() => {
        setAudioWaves(prev => prev.map(() => 25 + Math.floor(Math.random() * 70)));
      }, 90);
    } else {
      clearInterval(waveIntervalRef.current);
      setAudioWaves([10, 15, 20, 25, 20, 15, 10, 15, 20, 25, 20, 15]);
      setCurrentWordIndex(-1);
    }

    return () => {
      clearInterval(waveIntervalRef.current);
    };
  }, [isSpeaking]);

  // 5. Speech Synthesis Function (Speaks automatically once per question)
  const speakQuestion = (textToSpeak) => {
    if (!('speechSynthesis' in window) || !textToSpeak || isMuted) {
      setIsSpeaking(false);
      onSpeechEnd();
      return;
    }

    window.speechSynthesis.cancel();
    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current);
      safetyTimeoutRef.current = null;
    }

    const cleanedSpeech = textToSpeak
      .replace(/[#*`_~]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanedSpeech) {
      setIsSpeaking(false);
      onSpeechEnd();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanedSpeech);
    utterance.rate = speechRate;
    utterance.pitch = persona.gender === 'female' ? 1.04 : 0.98;
    utterance.lang = selectedVoice?.lang || 'en-US';

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      onSpeechStart();
    };

    utterance.onend = () => {
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
        safetyTimeoutRef.current = null;
      }
      setIsSpeaking(false);
      onSpeechEnd();
    };

    utterance.onerror = (e) => {
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
        safetyTimeoutRef.current = null;
      }
      setIsSpeaking(false);
      onSpeechEnd();
    };

    const words = cleanedSpeech.split(' ');
    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        const charIdx = event.charIndex;
        const spokenSoFar = cleanedSpeech.substring(0, charIdx + 1).trim();
        const wordCount = spokenSoFar.split(' ').length;
        setCurrentWordIndex(Math.min(wordCount - 1, words.length - 1));
      }
    };

    // Safety fallback timer so speech never hangs
    const wordCount = words.length;
    const maxDurationMs = Math.min(22000, Math.max(4000, Math.ceil(wordCount / 2.0) * 1000 + 2500));
    safetyTimeoutRef.current = setTimeout(() => {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        onSpeechEnd();
      }
    }, maxDurationMs);

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    lastSpokenQuestionRef.current = textToSpeak;
  };

  const toggleMute = () => {
    if (!isMuted) {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsSpeaking(false);
      onSpeechEnd();
      setIsMuted(true);
    } else {
      setIsMuted(false);
    }
  };

  // Auto-speak automatically ONCE when question changes
  useEffect(() => {
    if (questionText && autoSpeak && questionText !== lastSpokenQuestionRef.current) {
      const timer = setTimeout(() => {
        speakQuestion(questionText);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [questionText, autoSpeak, isMuted, selectedVoice, speechRate]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const wordsArray = useMemo(() => {
    return (questionText || '').split(/\s+/).filter(Boolean);
  }, [questionText]);

  const isVideoMode = mode === 'video';

  return (
    <div
      className={`ai-avatar-interviewer-container position-relative overflow-hidden d-flex flex-column justify-content-between ${className}`}
      style={{
        backgroundColor: '#070b14',
        borderRadius: isVideoMode ? '0px' : mode === 'compact' ? '16px' : '20px',
        border: isVideoMode ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
        height: '100%',
        minHeight: isVideoMode ? '440px' : mode === 'compact' ? '280px' : '420px',
        maxHeight: isVideoMode ? '440px' : 'none',
        ...style
      }}
    >
      {/* Studio Lighting Background with Radial Glow */}
      <div 
        className="position-absolute top-0 start-0 end-0 bottom-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 35%, ${persona.glowColor} 0%, rgba(10, 15, 30, 0.85) 60%, #050811 100%)`,
          zIndex: 1
        }}
      />

      {/* Studio Backdrop Grid */}
      <div 
        className="position-absolute top-0 start-0 end-0 bottom-0 pointer-events-none opacity-15"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          zIndex: 1
        }}
      />

      {/* Top Floating Status Overlay */}
      <div className="d-flex justify-content-between align-items-center p-3 position-absolute top-0 start-0 end-0" style={{ zIndex: 15 }}>
        {/* Live Status Badge */}
        <div className="d-flex align-items-center gap-2">
          <span 
            className="badge d-flex align-items-center gap-1.5 px-2.5 py-1 text-white fw-bold shadow-sm"
            style={{ 
              backgroundColor: isSpeaking ? '#ef4444' : isRecording ? '#10b981' : isEvaluating ? '#8b5cf6' : 'rgba(59, 130, 246, 0.9)',
              fontSize: '0.72rem',
              letterSpacing: '0.03em',
              backdropFilter: 'blur(8px)'
            }}
          >
            <span 
              className="rounded-circle bg-white" 
              style={{ 
                width: '6px', 
                height: '6px',
                animation: isSpeaking || isRecording ? 'pulse 1.2s infinite' : 'none'
              }} 
            />
            {isSpeaking ? 'AI ASKING QUESTION' : isRecording ? 'LISTENING TO YOU' : isEvaluating ? 'EVALUATING ANSWER' : 'AI READY'}
          </span>
          <span className="badge bg-dark bg-opacity-70 text-white-50 border border-secondary border-opacity-25 px-2 py-1" style={{ fontSize: '0.66rem' }}>
            1080P HD
          </span>
        </div>

        {/* Quick Audio Mute & Settings Controls (No Replay / Repeat Buttons) */}
        <div className="d-flex align-items-center gap-1.5">
          <button
            onClick={toggleMute}
            className={`btn btn-sm p-1.5 rounded-circle border border-secondary border-opacity-25 ${isMuted ? 'btn-danger text-white' : 'btn-dark bg-opacity-70 text-white'}`}
            title={isMuted ? "Unmute AI Voice" : "Mute AI Voice"}
            style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}
          >
            {isMuted ? <FiVolumeX size={13} /> : <FiVolume2 size={13} />}
          </button>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`btn btn-sm p-1.5 rounded-circle border border-secondary border-opacity-25 ${showSettings ? 'btn-primary text-white' : 'btn-dark bg-opacity-70 text-white'}`}
            title="Interviewer Settings"
            style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}
          >
            <FiSettings size={13} />
          </button>
        </div>
      </div>

      {/* Settings Modal Dropdown */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="position-absolute top-12 end-3 bg-dark border border-secondary border-opacity-50 p-3 rounded-3 shadow-lg text-start"
            style={{ zIndex: 40, width: '270px', backgroundColor: '#111827', fontSize: '0.8rem' }}
          >
            <div className="d-flex justify-content-between align-items-center mb-2 pb-1 border-bottom border-secondary border-opacity-25">
              <strong className="text-white">Interviewer Settings</strong>
              <button onClick={() => setShowSettings(false)} className="btn-close btn-close-white shadow-none" style={{ fontSize: '0.65rem' }} />
            </div>

            {/* Persona Switcher */}
            <div className="mb-2.5">
              <label className="text-muted d-block small mb-1">Interviewer Persona</label>
              <div className="d-flex flex-column gap-1">
                {PERSONAS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setPersonaId(p.id)}
                    className={`btn btn-sm text-start py-1 px-2 d-flex align-items-center justify-content-between rounded-2 ${personaId === p.id ? 'btn-primary text-white' : 'btn-outline-secondary text-white-50 border-0'}`}
                    style={{ fontSize: '0.74rem' }}
                  >
                    <span>{p.name} ({p.gender === 'female' ? 'Female' : 'Male'})</span>
                    {personaId === p.id && <FiCheck size={12} />}
                  </button>
                ))}
              </div>
            </div>

            {/* Speech Rate Slider */}
            <div className="mb-2.5">
              <div className="d-flex justify-content-between text-muted small mb-1">
                <span>Speech Speed</span>
                <span className="text-white font-monospace">{speechRate}x</span>
              </div>
              <div className="d-flex gap-1">
                {[0.85, 0.95, 1.05, 1.15].map(rate => (
                  <button
                    key={rate}
                    onClick={() => setSpeechRate(rate)}
                    className={`btn btn-sm flex-grow-1 py-0.5 rounded-1 ${speechRate === rate ? 'btn-primary text-white' : 'btn-dark text-white-50 border border-secondary border-opacity-25'}`}
                    style={{ fontSize: '0.7rem' }}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>

            {/* Subtitles Toggle */}
            <div className="d-flex justify-content-between align-items-center pt-1 border-top border-secondary border-opacity-25">
              <span className="text-muted small">Live Closed Captions</span>
              <button
                onClick={() => setSubtitlesEnabled(!subtitlesEnabled)}
                className={`btn btn-sm py-0.5 px-2 rounded-pill ${subtitlesEnabled ? 'btn-success text-white' : 'btn-secondary text-white-50'}`}
                style={{ fontSize: '0.7rem' }}
              >
                {subtitlesEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Avatar Character Stage */}
      <div 
        className="d-flex flex-column align-items-center justify-content-center flex-grow-1 position-relative"
        style={{ zIndex: 5, padding: '2.5rem 0 1rem 0' }}
      >
        {/* Holographic Concentric Pulse Rings when Speaking */}
        {isSpeaking && (
          <>
            <motion.div
              animate={{ scale: [1, 1.35, 1.5], opacity: [0.6, 0.2, 0] }}
              transition={{ repeat: Infinity, duration: 2.2, ease: "easeOut" }}
              className="position-absolute rounded-circle pointer-events-none"
              style={{
                width: isVideoMode ? '210px' : '230px',
                height: isVideoMode ? '210px' : '230px',
                border: `2px solid ${persona.accentColor}`,
                boxShadow: `0 0 30px ${persona.glowColor}`,
                zIndex: 2
              }}
            />
            <motion.div
              animate={{ scale: [1, 1.2, 1.35], opacity: [0.7, 0.3, 0] }}
              transition={{ repeat: Infinity, duration: 2.2, delay: 0.7, ease: "easeOut" }}
              className="position-absolute rounded-circle pointer-events-none"
              style={{
                width: isVideoMode ? '210px' : '230px',
                height: isVideoMode ? '210px' : '230px',
                border: `1.5px solid ${persona.accentColor}`,
                zIndex: 2
              }}
            />
          </>
        )}

        {/* Listening Ambient Aura when Candidate is speaking */}
        {isRecording && !isSpeaking && (
          <motion.div
            animate={{ scale: [1, 1.08, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
            className="position-absolute rounded-circle pointer-events-none"
            style={{
              width: isVideoMode ? '200px' : '220px',
              height: isVideoMode ? '200px' : '220px',
              border: '2px dashed #10b981',
              boxShadow: '0 0 25px rgba(16, 185, 129, 0.3)',
              zIndex: 2
            }}
          />
        )}

        {/* Clean Animated Avatar Character */}
        <motion.div
          animate={{
            y: isSpeaking ? [0, -3, 0, -2, 0] : isRecording ? [0, 2, 0] : [0, -1.5, 0],
            rotate: headTilt,
            scale: isSpeaking ? [1, 1.02, 1] : 1
          }}
          transition={{
            y: { repeat: Infinity, duration: isSpeaking ? 1.8 : 3.5, ease: "easeInOut" },
            rotate: { duration: 0.6, ease: "easeInOut" },
            scale: { repeat: Infinity, duration: 2.4, ease: "easeInOut" }
          }}
          className="position-relative d-flex flex-column align-items-center"
          style={{ zIndex: 6, transformOrigin: 'bottom center' }}
        >
          {/* Avatar Circular Frame */}
          <div 
            className="position-relative overflow-hidden shadow-2xl"
            style={{
              width: isVideoMode ? '160px' : mode === 'compact' ? '125px' : '170px',
              height: isVideoMode ? '160px' : mode === 'compact' ? '125px' : '170px',
              borderRadius: '50%',
              border: `3.5px solid ${isSpeaking ? persona.accentColor : isRecording ? '#10b981' : 'rgba(255, 255, 255, 0.25)'}`,
              boxShadow: isSpeaking 
                ? `0 0 35px ${persona.glowColor}, inset 0 0 15px ${persona.glowColor}` 
                : '0 8px 24px rgba(0,0,0,0.6)',
              backgroundColor: '#1e293b'
            }}
          >
            {/* Photorealistic Avatar Image */}
            <img
              src={avatarImg}
              alt={persona.name}
              className="w-100 h-100 object-fit-cover"
              style={{
                filter: isSpeaking 
                  ? 'brightness(1.08) contrast(1.05)' 
                  : isRecording 
                  ? 'brightness(1.02) contrast(1.02)' 
                  : 'brightness(0.95)',
                transform: 'scale(1.04)',
                transition: 'filter 0.3s ease'
              }}
            />

            {/* Glowing vignette gradient around frame */}
            <div 
              className="position-absolute top-0 start-0 end-0 bottom-0 pointer-events-none"
              style={{
                boxShadow: 'inset 0 0 20px rgba(0,0,0,0.6)',
                zIndex: 7
              }}
            />
          </div>
        </motion.div>
      </div>

      {/* Floating Subtitle Banner (Optional Live Closed Captions) */}
      {subtitlesEnabled && questionText && (
        <div className="px-3 pb-2 position-relative" style={{ zIndex: 15 }}>
          <motion.div 
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-2 rounded-3 bg-dark bg-opacity-90 border border-secondary border-opacity-30 shadow text-start"
            style={{ 
              backdropFilter: 'blur(10px)',
              backgroundColor: 'rgba(15, 23, 42, 0.9)',
              maxHeight: '56px',
              overflowY: 'auto'
            }}
          >
            <div className="text-white small" style={{ fontSize: '0.78rem', lineHeight: '1.4' }}>
              {wordsArray.map((word, wIdx) => {
                const isCurrent = isSpeaking && wIdx === currentWordIndex;
                return (
                  <span
                    key={wIdx}
                    className={`transition-all ${isCurrent ? 'fw-bold text-warning px-0.5 rounded' : 'text-white-90'}`}
                    style={{
                      backgroundColor: isCurrent ? 'rgba(234, 179, 8, 0.25)' : 'transparent',
                      textShadow: isCurrent ? '0 0 8px rgba(234, 179, 8, 0.6)' : 'none'
                    }}
                  >
                    {word}{' '}
                  </span>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}

      {/* Bottom Video Metadata Overlay Bar (Zoom / Teams Style) */}
      <div 
        className="d-flex justify-content-between align-items-center px-3 py-2 position-relative"
        style={{ zIndex: 10, backgroundColor: 'rgba(5, 8, 17, 0.85)', backdropFilter: 'blur(8px)', borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        {/* Name Tag */}
        <div className="d-flex align-items-center gap-1.5">
          <span className="rounded-circle" style={{ width: '7px', height: '7px', backgroundColor: persona.accentColor }} />
          <span className="text-white fw-semibold small" style={{ fontSize: '0.76rem' }}>
            🤖 {persona.name} <span className="text-white-50">({persona.title.split('&')[0].trim()})</span>
          </span>
        </div>

        {/* Audio Visualizer Wave */}
        <div className="d-flex align-items-end gap-1" style={{ height: '16px' }}>
          {audioWaves.slice(0, 8).map((height, idx) => (
            <motion.span
              key={idx}
              animate={{ 
                height: isSpeaking ? `${height}%` : '20%',
                backgroundColor: isSpeaking ? persona.accentColor : '#475569'
              }}
              transition={{ duration: 0.08, ease: "linear" }}
              className="rounded-pill"
              style={{
                width: '3px',
                minHeight: '3px',
                boxShadow: isSpeaking ? `0 0 6px ${persona.accentColor}` : 'none'
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default AIAvatarInterviewer;
