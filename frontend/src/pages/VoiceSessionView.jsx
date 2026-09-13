import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FiMic, FiSquare, FiPause, FiPlay, FiCheckCircle, FiEdit3,
  FiClock, FiAlertCircle, FiArrowRight, FiActivity, FiArrowLeft,
  FiVolume2, FiVolumeX
} from 'react-icons/fi';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import AIAvatarInterviewer from '../components/AIAvatarInterviewer';
import TypewriterQuestion from '../components/TypewriterQuestion';

const VoiceSessionView = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Strict Lockdown & Proctoring states
  const [interviewState, setInterviewState] = useState(document.fullscreenElement ? 'INTERVIEW_ACTIVE' : 'INTERVIEW_PAUSED');
  const [lockdownReason, setLockdownReason] = useState(document.fullscreenElement ? '' : 'Fullscreen mode is required to participate in this voice interview.');
  const [tabSwitchStrikes, setTabSwitchStrikes] = useState(0);
  const [isTerminating, setIsTerminating] = useState(false);
  const isTerminatingRef = useRef(false);
  const interviewStateRef = useRef('INTERVIEW_ACTIVE');
  const tabSwitchStrikesRef = useRef(0);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    interviewStateRef.current = interviewState;
  }, [interviewState]);

  useEffect(() => {
    tabSwitchStrikesRef.current = tabSwitchStrikes;
  }, [tabSwitchStrikes]);

  // Recording & Speech Recognition states
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTimeSec, setRecordingTimeSec] = useState(0);

  const [liveTranscript, setLiveTranscript] = useState('');
  const [editedTranscript, setEditedTranscript] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // AI Voice Text-to-Speech (TTS) state
  const [isSpeakingQuestion, setIsSpeakingQuestion] = useState(false);

  // Refs for stale-closure free state access
  const isRecordingRef = useRef(false);
  const isPausedRef = useRef(false);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Recognition ref & Timer ref
  const recognitionRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const autoSaveDebounceRef = useRef(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const pollIntervalRef = useRef(null);
  const isFetchingRef = useRef(false);
  const fetchedIdRef = useRef(null);

  // Strict Interview Lockdown & Fullscreen Enforcer
  useEffect(() => {
    document.body.classList.add('interview-lockdown-active');

    const requestFullscreenSafe = async () => {
      try {
        if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } catch (err) {
        console.warn('Fullscreen request deferred until user gesture:', err);
      }
    };

    requestFullscreenSafe();

    const handleFullscreenChange = () => {
      if (isSubmittingRef.current) return;
      if (!document.fullscreenElement && interviewStateRef.current === 'INTERVIEW_ACTIVE') {
        setInterviewState('INTERVIEW_PAUSED');
        setLockdownReason('Fullscreen mode was exited. Fullscreen is strictly required during mock interviews.');
        if (isRecordingRef.current) {
          pauseRecording();
        }
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
      }
    };

    const handleVisibilityChange = () => {
      if (isSubmittingRef.current) return;
      if (document.hidden) {
        tabSwitchStrikesRef.current += 1;
        const currentStrikes = tabSwitchStrikesRef.current;
        setTabSwitchStrikes(currentStrikes);
        setInterviewState('INTERVIEW_PAUSED');
        setLockdownReason(`⚠️ Tab Switch / Window Blur detected (Strike ${currentStrikes}/3). Switching tabs or minimizing the window is prohibited.`);
        if (isRecordingRef.current) {
          pauseRecording();
        }
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
        toast.warn(`Proctoring Strike ${currentStrikes}/3: Tab switched or minimized!`);
      }
    };

    const handleWindowBlur = () => {
      if (isSubmittingRef.current) return;
      if (interviewStateRef.current === 'INTERVIEW_ACTIVE') {
        tabSwitchStrikesRef.current += 1;
        const currentStrikes = tabSwitchStrikesRef.current;
        setTabSwitchStrikes(currentStrikes);
        setInterviewState('INTERVIEW_PAUSED');
        setLockdownReason(`⚠️ Window focus lost (Strike ${currentStrikes}/3). You must remain focused on the interview window.`);
        if (isRecordingRef.current) {
          pauseRecording();
        }
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
      }
    };

    const handleKeyDown = (e) => {
      if (isSubmittingRef.current) return;
      // Intercept ESC
      if (e.key === 'Escape' || e.code === 'Escape' || e.keyCode === 27) {
        e.preventDefault();
        e.stopPropagation();
        if (interviewStateRef.current === 'INTERVIEW_ACTIVE') {
          setInterviewState('INTERVIEW_PAUSED');
          setLockdownReason('Fullscreen exit intercepted. Please stay in fullscreen to complete your interview.');
          if (isRecordingRef.current) pauseRecording();
          if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        }
        return false;
      }

      // Block F11, F12, Ctrl+Shift+I, Alt+Tab / Win
      if (
        e.key === 'F11' || 
        e.key === 'F12' || 
        ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) ||
        ((e.ctrlKey || e.metaKey) && (e.key === 'r' || e.key === 'R' || e.key === 'w' || e.key === 'W'))
      ) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
      return false;
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.body.classList.remove('interview-lockdown-active');
      if (document.fullscreenElement) {
        try {
          document.exitFullscreen();
        } catch (e) {}
      }
    };
  }, []);

  const handleReturnToInterview = async () => {
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      setInterviewState('INTERVIEW_ACTIVE');
      setLockdownReason('');
    } catch (err) {
      console.warn('Fullscreen request failed:', err);
      setInterviewState('INTERVIEW_ACTIVE');
      setLockdownReason('');
    }
  };

  const handleTerminateInterview = async () => {
    if (isTerminatingRef.current) return;
    if (!window.confirm('Are you sure you want to terminate this voice interview? The session will be marked as Terminated.')) {
      return;
    }
    isTerminatingRef.current = true;
    setIsTerminating(true);
    isSubmittingRef.current = true;
    try {
      const sessionKey = session?.sessionId || session?._id || id;
      await axiosInstance.post('/voice/terminate', { sessionId: sessionKey });
      toast.info('Voice interview has been terminated.');
    } catch (e) {
      console.warn('Termination API notice:', e.message);
    } finally {
      if (document.fullscreenElement) {
        try { await document.exitFullscreen(); } catch (e) {}
      }
      document.body.classList.remove('interview-lockdown-active');
      navigate('/mock-interviews');
    }
  };

  useEffect(() => {
    if (fetchedIdRef.current === id) return;
    fetchVoiceSession();
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, [id]);

  const fetchVoiceSession = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const response = await axiosInstance.get(`/voice/report/${id}`);
      if (response.data && response.data.success) {
        setSession(response.data.report);
        const qList = response.data.report.questions || [];
        setQuestions(qList);

        if (response.data.status === 'generating' || qList.length === 0) {
          setIsGenerating(true);
          if (!pollIntervalRef.current) {
            pollIntervalRef.current = setInterval(fetchVoiceSession, 3000);
          }
        } else {
          setIsGenerating(false);
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          fetchedIdRef.current = id;

          const firstUnanswered = qList.findIndex(q => !q.editedTranscriptText && q.wordCount === 0);
          if (firstUnanswered !== -1) {
            setCurrentIndex(firstUnanswered);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching voice session:', err);
      toast.error(err.response?.data?.message || 'Failed to load voice interview session');
      if (err.response?.status === 400 || err.response?.status === 404) {
        navigate('/mock-interviews');
      }
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  const currentQ = questions[currentIndex];

  const handleStartAnsweringNow = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeakingQuestion(false);
    startRecording();
  };

  // Initialize SpeechRecognition instance once
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        console.log('[Voice Pipeline] Recognition Started');
      };

      recognition.onspeechstart = () => {
        console.log('[Voice Pipeline] Speech Detected');
      };

      recognition.onsoundstart = () => {
        console.log('[Voice Pipeline] Sound Detected');
      };

      recognition.onresult = (event) => {
        let transcriptStr = '';
        for (let i = 0; i < event.results.length; i++) {
          transcriptStr += event.results[i][0].transcript + ' ';
        }
        const trimmed = transcriptStr.trim();
        setLiveTranscript(trimmed);
        setEditedTranscript(trimmed);
        console.log(`[Voice Pipeline] Transcript Updated: "${trimmed.substring(0, 50)}..."`);
      };

      recognition.onerror = (event) => {
        console.warn(`[Voice Pipeline] Speech Error: ${event.error}`);
        switch (event.error) {
          case 'not-allowed':
            toast.error('Microphone permission denied. Please enable microphone access in browser settings.');
            break;
          case 'audio-capture':
            toast.error('No microphone detected. Please connect a microphone.');
            break;
          case 'network':
            toast.warning('Network issue with Speech Recognition. You can type or edit transcript manually.');
            break;
          case 'aborted':
            console.log('[Voice Pipeline] Recognition aborted.');
            break;
          case 'no-speech':
            console.log('[Voice Pipeline] No speech detected for a while.');
            break;
          default:
            console.warn(`[Voice Pipeline] Recognition error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        console.log('[Voice Pipeline] Recognition Ended.');
        if (isRecordingRef.current && !isPausedRef.current) {
          console.log('[Voice Pipeline] Auto-restarting Speech Recognition...');
          setTimeout(() => {
            if (recognitionRef.current && isRecordingRef.current && !isPausedRef.current) {
              try {
                recognitionRef.current.start();
                console.log('[Voice Pipeline] Recognition Restarted successfully.');
              } catch (e) {
                console.warn('[Voice Pipeline] Auto-restart exception:', e.message);
              }
            }
          }, 300);
        }
      };

      recognitionRef.current = recognition;
    } else {
      toast.warning('Browser Web Speech API not supported. You can type answers manually.');
    }

    return () => stopRecordingCleanup();
  }, []);

  // Restore transcript on question change or page refresh
  useEffect(() => {
    if (!currentQ) return;

    const storageKey = `voice_transcript_${id}_${currentIndex}`;
    const savedLocal = localStorage.getItem(storageKey);

    if (savedLocal) {
      setLiveTranscript(savedLocal);
      setEditedTranscript(savedLocal);
    } else if (currentQ.editedTranscriptText || currentQ.transcriptText) {
      const val = currentQ.editedTranscriptText || currentQ.transcriptText;
      setLiveTranscript(val);
      setEditedTranscript(val);
    } else {
      setLiveTranscript('');
      setEditedTranscript('');
    }
  }, [currentIndex, currentQ, id]);

  // Debounced Auto-Save to LocalStorage & Backend
  useEffect(() => {
    if (!editedTranscript) return;

    const storageKey = `voice_transcript_${id}_${currentIndex}`;
    localStorage.setItem(storageKey, editedTranscript);

    if (autoSaveDebounceRef.current) clearTimeout(autoSaveDebounceRef.current);

    autoSaveDebounceRef.current = setTimeout(async () => {
      try {
        const sessionKey = session?.sessionId || session?._id || id;
        await axiosInstance.post('/voice/save-transcript', {
          sessionId: sessionKey,
          questionIndex: currentIndex,
          transcriptText: liveTranscript,
          editedTranscriptText: editedTranscript,
          audioDurationSec: Math.max(1, recordingTimeSec)
        });
        console.log(`[Voice Pipeline] Transcript Saved for Question ${currentIndex + 1}`);
      } catch (err) {
        console.warn('[Voice Pipeline] Auto-save failed:', err.message);
      }
    }, 1000);

    return () => {
      if (autoSaveDebounceRef.current) clearTimeout(autoSaveDebounceRef.current);
    };
  }, [editedTranscript, id, currentIndex, session, liveTranscript, recordingTimeSec]);

  const startRecording = () => {
    // If AI voice is currently reading the question, stop it before recording
    if ('speechSynthesis' in window && isSpeakingQuestion) {
      window.speechSynthesis.cancel();
      setIsSpeakingQuestion(false);
    }

    setIsRecording(true);
    setIsPaused(false);
    setRecordingTimeSec(0);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.warn('[Voice Pipeline] Start exception:', e.message);
      }
    }

    timerIntervalRef.current = setInterval(() => {
      setRecordingTimeSec(prev => {
        if (prev >= 179) {
          stopRecording();
          toast.info('Maximum 3-minute recording limit reached.');
          return 180;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const pauseRecording = () => {
    setIsPaused(true);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
  };

  const resumeRecording = () => {
    setIsPaused(false);
    if (recognitionRef.current) {
      try { recognitionRef.current.start(); } catch (e) {}
    }
    timerIntervalRef.current = setInterval(() => {
      setRecordingTimeSec(prev => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    setIsRecording(false);
    setIsPaused(false);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
  };

  const stopRecordingCleanup = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
  };

  // Estimate WPM & Fillers
  const currentWordCount = editedTranscript.trim().split(/\s+/).filter(Boolean).length;
  const estimatedWpm = recordingTimeSec > 3 ? Math.round((currentWordCount / recordingTimeSec) * 60) : 0;

  const fillerList = ['um', 'uh', 'like', 'you know', 'basically', 'actually', 'so'];
  const fillerCount = editedTranscript.toLowerCase().split(/\s+/).filter(w => fillerList.includes(w.replace(/[^a-z]/g, ''))).length;

  const handleSubmitAnswer = async () => {
    if (!editedTranscript.trim()) {
      toast.warning('Please record or enter a response transcript before submitting.');
      return;
    }

    // Stop TTS if active
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();

    stopRecording();
    setSubmitting(true);
    console.log(`[Voice Pipeline] Question Submitted for Question ${currentIndex + 1}`);

    try {
      const sessionKey = session.sessionId || session._id;
      const response = await axiosInstance.post('/voice/evaluate', {
        sessionId: sessionKey,
        questionIndex: currentIndex,
        transcriptText: liveTranscript,
        editedTranscriptText: editedTranscript,
        audioDurationSec: Math.max(5, recordingTimeSec)
      });

      if (response.data && response.data.success) {
        toast.success('Verbal answer evaluated by AI!');
        const updatedQ = response.data.question;
        setQuestions(prev => prev.map((q, idx) => idx === currentIndex ? updatedQ : q));

        localStorage.removeItem(`voice_transcript_${id}_${currentIndex}`);

        if (currentIndex < questions.length - 1) {
          console.log(`[Voice Pipeline] Next Question Loaded: Index ${currentIndex + 1}`);
          setCurrentIndex(prev => prev + 1);
          setLiveTranscript('');
          setEditedTranscript('');
          setRecordingTimeSec(0);
        } else {
          console.log('[Voice Pipeline] Interview Finished');
          console.log('[Voice Pipeline] Evaluation Started');
          toast.info('Compiling overall Voice Communication Report...');
          isSubmittingRef.current = true;
          const repRes = await axiosInstance.post('/voice/compile-report', { sessionId: sessionKey });
          if (repRes.data && repRes.data.success) {
            if (document.fullscreenElement) {
              try {
                await document.exitFullscreen();
              } catch (e) {}
            }
            document.body.classList.remove('interview-lockdown-active');
            navigate(`/voice-interview/report/${sessionKey}`);
          }
        }
      }
    } catch (err) {
      console.error('Error evaluating voice question:', err);
      toast.error('Failed to evaluate voice answer.');
    } finally {
      setSubmitting(false);
    }
  };

  if (isGenerating || (questions.length === 0 && loading)) {
    return (
      <div className="container py-5 text-center" style={{ maxWidth: '600px' }}>
        <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }} role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <h3 className="fw-bold text-dark mb-2">Preparing AI questions...</h3>
        <p className="text-muted small mb-4">Please wait a moment while Gemini generates your role-specific interview questions.</p>
        <div className="progress mb-3" style={{ height: '8px' }}>
          <div className="progress-bar progress-bar-striped progress-bar-animated bg-primary" style={{ width: '100%' }} />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container py-4 text-start">
        <div className="skeleton-pulse mb-3" style={{ width: '180px', height: '30px' }} />
        <div className="glass-panel p-4 mb-4 skeleton-pulse" style={{ height: '180px' }} />
        <div className="glass-panel p-4 skeleton-pulse" style={{ height: '320px' }} />
      </div>
    );
  }

  if (!currentQ || questions.length === 0) {
    return (
      <div className="container py-5 text-center">
        <h4 className="fw-bold text-dark mb-2">Preparing AI questions...</h4>
        <p className="text-muted small mb-4">Gemini AI is finalizing your questions. Please click refresh below.</p>
        <button onClick={fetchVoiceSession} className="btn btn-outline-primary me-2">Refresh Questions</button>
        <Link to="/mock-interviews" className="btn btn-primary-purple text-white">Return to Mock Interviews</Link>
      </div>
    );
  }

  return (
    <div className="container py-4 text-start">
      {/* Strict Lockdown Paused Overlay */}
      {interviewState === 'INTERVIEW_PAUSED' && (
        <div className="lockdown-paused-overlay">
          <div className="lockdown-card text-white">
            <FiAlertCircle className="text-warning display-3 mb-3 animate-pulse" />
            <h4 className="fw-bold mb-2">Resume Voice Mock Interview</h4>
            <p className="text-muted small mb-4">
              {lockdownReason || 'Fullscreen mode is required to start or continue your voice interview.'}
            </p>
            <div className="d-flex flex-column gap-2">
              <button 
                onClick={handleReturnToInterview}
                className="btn btn-info w-100 fw-bold py-2 rounded-3 text-white"
              >
                Resume Interview (Enter Fullscreen)
              </button>
              <button 
                onClick={handleTerminateInterview}
                disabled={isTerminating}
                className="btn btn-outline-danger w-100 fw-bold py-2 rounded-3"
              >
                {isTerminating ? 'Terminating...' : 'Terminate Interview'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Header Bar with Indicators and Terminate Button */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex align-items-center gap-2 bg-dark px-3 py-1.5 rounded-pill border border-secondary border-opacity-40 shadow-sm" style={{ width: 'fit-content', fontSize: '0.75rem', backgroundColor: '#111827' }}>
          <span className={`${isRecording ? 'text-danger fw-bold d-flex align-items-center gap-1' : 'text-muted d-flex align-items-center gap-1'}`}>
            <span className={`rounded-circle ${isRecording ? 'bg-danger animate-pulse' : 'bg-secondary'}`} style={{ width: '6px', height: '6px' }} />
            {isRecording ? 'REC' : 'STANDBY'}
          </span>
          <span className="text-white-50 border-start border-secondary border-opacity-40 ps-2">🔒 Interview Locked</span>
          <span className="text-success fw-semibold border-start border-secondary border-opacity-40 ps-2 d-flex align-items-center gap-1">
            <span className="rounded-circle bg-success" style={{ width: '6px', height: '6px' }} /> Fullscreen Active
          </span>
          {tabSwitchStrikes > 0 && (
            <span className="text-warning fw-semibold border-start border-secondary border-opacity-40 ps-2">⚠️ Strikes: {tabSwitchStrikes}/3</span>
          )}
        </div>
        <button
          onClick={handleTerminateInterview}
          disabled={isTerminating}
          className="btn btn-sm btn-danger px-3 py-1.5 rounded-3 fw-bold d-flex align-items-center gap-1.5 shadow"
          style={{ fontSize: '0.8rem' }}
          title="Terminate and exit voice mock interview"
        >
          <FiAlertCircle /> {isTerminating ? 'Terminating...' : 'Terminate Interview'}
        </button>
      </div>

      {/* Session Title and Question Indicator Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold text-dark mb-0">{session?.sessionTitle || 'Voice Mock Interview'}</h2>
        </div>
        <div className="d-flex align-items-center gap-2">
          <span className="badge bg-primary bg-opacity-10 text-primary fw-bold px-3 py-2">
            Question {currentIndex + 1} of {questions.length}
          </span>
        </div>
      </div>

      {/* Main Studio Row with Avatar & Answering Console */}
      <div className="row g-4 mb-4">
        {/* Left: Animated AI Interviewer Avatar Stage */}
        <div className="col-lg-5">
          <AIAvatarInterviewer
            questionText={currentQ?.questionText || ''}
            questionNumber={currentIndex + 1}
            totalQuestions={questions.length}
            isRecording={isRecording}
            isEvaluating={submitting}
            onSpeechStart={() => {
              setIsSpeakingQuestion(true);
            }}
            onSpeechEnd={() => {
              setIsSpeakingQuestion(false);
              if (!isRecording && interviewStateRef.current === 'INTERVIEW_ACTIVE') {
                startRecording();
              }
            }}
            mode="voice"
            showControls={true}
            showSubtitles={true}
            style={{ minHeight: '440px' }}
          />
        </div>

        {/* Right: Question details & Voice Controls Bar */}
        <div className="col-lg-7 d-flex flex-column gap-3">
          {/* Question Card */}
          <div className="glass-panel p-4 bg-white border shadow-sm">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
              <div className="d-flex align-items-center gap-2">
                <span className="badge bg-info bg-opacity-10 text-info fw-semibold">{currentQ?.topic || 'General'}</span>
                <span className="badge bg-secondary bg-opacity-10 text-secondary">{session?.difficulty}</span>
              </div>
            </div>

            <div className="h5 fw-bold text-dark mb-2" style={{ lineHeight: '1.5' }}>
              <TypewriterQuestion
                text={currentQ?.questionText || ''}
                isSpeaking={isSpeakingQuestion}
              />
            </div>
            <p className="text-muted small mb-0">
              {isSpeakingQuestion ? '🎙️ AI interviewer is asking the question. Listen closely or click "Start Answering Now" below.' : 'Click Start Recording or Speak into your mic when you are ready to answer.'}
            </p>
          </div>

          {/* Voice Recording Controls */}
          <div className="glass-panel p-4 bg-white border shadow-sm">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
              <div className="d-flex align-items-center gap-2">
                {isSpeakingQuestion ? (
                  <button onClick={handleStartAnsweringNow} className="btn btn-info text-white py-2 px-4 d-flex align-items-center gap-2 rounded-pill shadow-sm fw-bold">
                    <FiMic className="fs-5" /> Start Answering Now
                  </button>
                ) : !isRecording ? (
                  <button onClick={startRecording} className="btn btn-danger py-2 px-4 d-flex align-items-center gap-2 rounded-pill shadow-sm">
                    <FiMic className="fs-5" /> Start Recording
                  </button>
                ) : (
                  <>
                    {!isPaused ? (
                      <button onClick={pauseRecording} className="btn btn-warning py-2 px-3 d-flex align-items-center gap-2">
                        <FiPause /> Pause
                      </button>
                    ) : (
                      <button onClick={resumeRecording} className="btn btn-success py-2 px-3 d-flex align-items-center gap-2">
                        <FiPlay /> Resume
                      </button>
                    )}
                    <button onClick={stopRecording} className="btn btn-outline-danger py-2 px-3 d-flex align-items-center gap-2">
                      <FiSquare /> Stop
                    </button>
                  </>
                )}
              </div>

              <div className="d-flex align-items-center gap-3">
                <span className="badge bg-dark bg-opacity-10 text-dark font-monospace py-2 px-3" style={{ fontSize: '0.9rem' }}>
                  ⏱️ {Math.floor(recordingTimeSec / 60)}:{(recordingTimeSec % 60).toString().padStart(2, '0')} / 3:00
                </span>
                {isRecording && !isPaused && (
                  <span className="badge bg-danger text-white py-2 px-3 d-flex align-items-center gap-1.5 animate-pulse">
                    <span className="rounded-circle bg-white" style={{ width: '8px', height: '8px' }} /> Recording...
                  </span>
                )}
              </div>
            </div>

            {/* Live Vocal Metrics Banner */}
            <div className="row g-2 pt-2 border-top text-muted small">
              <div className="col-4 text-center border-end">
                <span>Words Spoken: <strong>{currentWordCount}</strong></span>
              </div>
              <div className="col-4 text-center border-end">
                <span>Estimated Speed: <strong>{estimatedWpm} WPM</strong></span>
              </div>
              <div className="col-4 text-center">
                <span>Filler Words: <strong className={fillerCount > 3 ? 'text-danger' : 'text-success'}>{fillerCount}</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Transcript & Editable Text Area */}
      <div className="glass-panel p-4 bg-white border shadow-sm mb-4">
        <label className="form-label small fw-semibold text-muted d-flex justify-content-between align-items-center mb-2">
          <span><FiEdit3 /> Live Transcript (Edit to fix any misrecognized words before submitting)</span>
          <span className="text-muted" style={{ fontSize: '0.72rem' }}>Real-time Speech-to-Text</span>
        </label>
        <textarea
          rows={6}
          value={editedTranscript}
          onChange={(e) => setEditedTranscript(e.target.value)}
          placeholder="Speak into your microphone or type your response..."
          className="form-control mb-3"
        />

        <div className="d-flex justify-content-between align-items-center">
          <button
            disabled={currentIndex === 0 || isSpeakingQuestion || submitting}
            onClick={() => {
              setIsSpeakingQuestion(true);
              setCurrentIndex(prev => prev - 1);
              stopRecording();
            }}
            className="btn btn-sm btn-outline-secondary"
            style={{ opacity: (currentIndex === 0 || isSpeakingQuestion || submitting) ? 0.4 : 1 }}
          >
            Previous Question
          </button>

          <button
            onClick={handleSubmitAnswer}
            disabled={submitting || isSpeakingQuestion || !editedTranscript.trim()}
            className="btn btn-primary-purple text-white py-2 px-4 shadow-sm"
            style={{ opacity: (submitting || isSpeakingQuestion || !editedTranscript.trim()) ? 0.5 : 1, cursor: isSpeakingQuestion ? 'not-allowed' : 'pointer' }}
            title={isSpeakingQuestion ? "Please wait for AI to finish asking the question or click 'Start Answering Now'" : ""}
          >
            {submitting ? 'Evaluating Verbal Answer...' : currentIndex < questions.length - 1 ? 'Submit & Next Question' : 'Submit & Finish Voice Interview'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceSessionView;
