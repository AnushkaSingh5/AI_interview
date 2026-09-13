import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  FiCamera, FiMic, FiSquare, FiPause, FiPlay, FiCheckCircle, FiEdit3,
  FiClock, FiAlertCircle, FiArrowRight, FiActivity, FiVolume2, FiVolumeX, FiMonitor
} from 'react-icons/fi';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import avatarImg from '../assets/avatar.png';
import { FilesetResolver, FaceLandmarker, ObjectDetector } from '@mediapipe/tasks-vision';

const VideoSessionView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = id || searchParams.get('sessionId') || '';

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Strict Interview Lockdown State Machine (Task 18)
  const [interviewState, setInterviewState] = useState(document.fullscreenElement ? 'INTERVIEW_ACTIVE' : 'INTERVIEW_PAUSED');
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);
  const [fullscreenExitCount, setFullscreenExitCount] = useState(0);
  const [lockdownReason, setLockdownReason] = useState(document.fullscreenElement ? '' : 'Fullscreen mode is required to start or resume your video interview.');
  const isSpeakingRef = useRef(false);
  const speakTimeoutRef = useRef(null);

  // Device & Hardware status
  const [hasWebcam, setHasWebcam] = useState(false);
  const [hasMic, setHasMic] = useState(false);
  const [hasFace, setHasFace] = useState(false);
  const [hasEyeContact, setHasEyeContact] = useState(false);
  const [hasPose, setHasPose] = useState(false);

  // Device & Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTimeSec, setRecordingTimeSec] = useState(0);
  const [isSpeakingQuestion, setIsSpeakingQuestion] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isInsecureContext, setIsInsecureContext] = useState(false);
  const [isTerminating, setIsTerminating] = useState(false);
  const isTerminatingRef = useRef(false);
  const pollIntervalRef = useRef(null);

  const [timeLeftSec, setTimeLeftSec] = useState(90);

  const currentIndexRef = useRef(currentIndex);
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  const interviewStateRef = useRef(interviewState);
  useEffect(() => {
    interviewStateRef.current = interviewState;
  }, [interviewState]);

  const questionsCountRef = useRef(questions.length);
  useEffect(() => {
    questionsCountRef.current = questions.length;
  }, [questions.length]);

  const isSubmittingRef = useRef(false);
  const questionTelemetryRef = useRef([]);

  // Transcript answers array
  const [answers, setAnswers] = useState([]);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [editedTranscript, setEditedTranscript] = useState('');

  // Non-verbal Metrics trackers
  const [eyeContactScore, setEyeContactScore] = useState(88);
  const [cameraFacingScore, setCameraFacingScore] = useState(90);
  const [currentEmotion, setCurrentEmotion] = useState('Neutral');
  const [postureStatus, setPostureStatus] = useState('Good Posture');
  const [postureWarning, setPostureWarning] = useState('');
  const [gazeStatus, setGazeStatus] = useState('Aligned');
  const [speakingSpeedWpm, setSpeakingSpeedWpm] = useState(0);
  const [fillerCount, setFillerCount] = useState(0);

  // Exponential moving average references for smoothing telemetry data
  const smoothedYawRef = useRef(0);
  const smoothedPitchRef = useRef(0);
  const smoothedRollRef = useRef(0);
  const smoothedEyeContactRef = useRef(90);
  const smoothedCameraFacingRef = useRef(90);
  const lastLoggedSecRef = useRef(0);
  const loggedBlendshapesRef = useRef(false);
  const wasEyeContactUnavailableRef = useRef(true);

  // Accumulators for session totals
  const [eyeScoresArray, setEyeScoresArray] = useState([]);
  const [emotionsLog, setEmotionsLog] = useState({ happy: 0, neutral: 0, surprised: 0, nervous: 0 });
  const [postureLogs, setPostureLogs] = useState({ good: 0, warning: 0 });
  const [timelineEvents, setTimelineEvents] = useState([]);

  // MediaPipe Face Landmarker States
  const [faceLandmarker, setFaceLandmarker] = useState(null);
  const [objectDetector, setObjectDetector] = useState(null);
  const objectDetectorRef = useRef(null);
  const [modelLoading, setModelLoading] = useState(false);
  const [modelError, setModelError] = useState(false);
  
  // Real-time Object Identification Proctoring Alert
  const [prohibitedObjectAlert, setProhibitedObjectAlert] = useState({ active: false, label: '' });
  const consecutiveObjectDetectionsRef = useRef(0);
  const lastObjectDetectTimeRef = useRef(0);
  const lastProhibitedEventTimeRef = useRef(0);
  const prohibitedObjectEventsRef = useRef(0);
  const lastKeyToastTimeRef = useRef(0);
  const lastProhibitedToastTimeRef = useRef(0);
  const ttsFallbackTimeoutRef = useRef(null);
  
  // Internal pipeline tracking states: 'LOADING' | 'READY' | 'ERROR'
  const [pipelineStatus, setPipelineStatus] = useState('LOADING');
  const lastTimestampRef = useRef(0);

  // Dynamic metrics tracking refs
  const totalFramesRef = useRef(0);
  const facePresentFramesRef = useRef(0);
  const eyeContactFramesRef = useRef(0);
  const lookingAwayFramesRef = useRef(0);
  const centerFacingFramesRef = useRef(0);
  const totalYawRef = useRef(0);
  const totalPitchRef = useRef(0);
  const totalRollRef = useRef(0);

  // Calibration baseline states & references (Task 6)
  const [sessionEyeBaseline, setSessionEyeBaseline] = useState(null);
  const sessionEyeBaselineRef = useRef(null);
  const calibrationFramesRef = useRef(0);
  const calibrationDataRef = useRef([]);

  // Telemetry trackers (Task 14)
  const eyeContactValidFramesRef = useRef(0);
  const eyeContactUnknownFramesRef = useRef(0);
  const eyeContactRawSumRef = useRef(0);
  const eyeContactSmoothedSumRef = useRef(0);
  const blinkFramesRef = useRef(0);

  // Hysteresis & Blink state machine references (Task 7 & 10)
  const lastStableEyeContactStateRef = useRef('CONTACT'); // 'CONTACT' | 'AWAY'
  const consecutiveStateFramesRef = useRef(0);
  const isBlinkingRef = useRef(false);
  const blinkStartSecRef = useRef(0);
  const pendingIncidentRef = useRef(null);

  const expressionNeutralFramesRef = useRef(0);
  const expressionSmileFramesRef = useRef(0);
  const expressionFrownFramesRef = useRef(0);
  const expressionSurpriseFramesRef = useRef(0);
  const expressionThinkingFramesRef = useRef(0);
  const expressionSpeakingFramesRef = useRef(0);
  const expressionConfusedFramesRef = useRef(0);

  const smoothedSmileRef = useRef(0);
  const smoothedFrownRef = useRef(0);
  const smoothedSurpriseRef = useRef(0);
  const smoothedThinkingRef = useRef(0);
  const smoothedSpeakingRef = useRef(0);
  const smoothedConfusedRef = useRef(0);

  const noFaceEventsRef = useRef(0);
  const multipleFaceEventsRef = useRef(0);
  const lookingAwayEventsRef = useRef(0);
  const tabVisibilityChangesRef = useRef(0);
  const windowBlurEventsRef = useRef(0);
  const proctoringEventsRef = useRef([]);

  // Active state transitions references
  const noFaceStartRef = useRef(null);
  const multipleFacesStartRef = useRef(null);
  const lookingAwayStartRef = useRef(null);
  const faceTooCloseStartRef = useRef(null);
  const faceTooFarStartRef = useRef(null);
  const tabHiddenStartRef = useRef(null);
  const windowBlurStartRef = useRef(null);
  const cleanupTrackingRef = useRef(null);

  // MediaRecorder, Stream & Canvas Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const prevCentroidRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recognitionRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const analyserRef = useRef(null);
  const audioContextRef = useRef(null);
  const animFrameRef = useRef(null);
  const hasShownErrorRef = useRef(false);

  // Local MediaPipe tasks-vision Loader
  useEffect(() => {
    let active = true;

    const initLandmarker = async () => {
      console.log('[Face & Object Analysis] Starting MediaPipe initialization...');
      setPipelineStatus('LOADING');
      setModelLoading(true);

      try {
        console.log('[Face Analysis] Tasks Vision runtime loaded');

        // Pass local WASM files path serving from the public folder (Task 3)
        const filesetResolver = await FilesetResolver.forVisionTasks("/wasm");
        console.log('[Face Analysis] WASM initialized');

        // Pass local face_landmarker.task path serving from the public folder (Task 4)
        const landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: "/models/face_landmarker.task",
            delegate: "GPU"
          },
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true,
          runningMode: "VIDEO",
          numFaces: 1
        });

        console.log('[Face Analysis] FaceLandmarker model loaded');

        // Load ObjectDetector for Real-Time Proctoring (IMAGE mode for isolated thread execution)
        let detector = null;
        try {
          detector = await ObjectDetector.createFromOptions(filesetResolver, {
            baseOptions: {
              modelAssetPath: "/models/efficientdet_lite0.tflite",
              delegate: "CPU"
            },
            scoreThreshold: 0.18,
            runningMode: "IMAGE"
          });
          console.log('[Object Detection] MediaPipe ObjectDetector loaded from local model in IMAGE mode');
        } catch (objErr) {
          console.warn('[Object Detection] Local model load failed, attempting CDN fallback:', objErr);
          try {
            detector = await ObjectDetector.createFromOptions(filesetResolver, {
              baseOptions: {
                modelAssetPath: "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float32/1/efficientdet_lite0.tflite",
                delegate: "CPU"
              },
              scoreThreshold: 0.18,
              runningMode: "IMAGE"
            });
            console.log('[Object Detection] MediaPipe ObjectDetector loaded from CDN fallback');
          } catch (cdnErr) {
            console.warn('[Object Detection] Both local and CDN Object Detector initializations failed:', cdnErr);
          }
        }

        if (active) {
          setFaceLandmarker(landmarker);
          if (detector) {
            objectDetectorRef.current = detector;
            setObjectDetector(detector);
          }
          setPipelineStatus('READY');
          setModelLoading(false);
          console.log('[Face & Object Analysis] All models ready');
        }
      } catch (err) {
        console.error('[Face Analysis] Failed to initialize MediaPipe FaceLandmarker:', err);
        if (active) {
          setModelError(true);
          setPipelineStatus('ERROR');
          setModelLoading(false);
        }
      }
    };

    initLandmarker();
    return () => {
      active = false;
    };
  }, []);

  const faceLandmarkerRef = useRef(null);
  useEffect(() => {
    faceLandmarkerRef.current = faceLandmarker;
  }, [faceLandmarker]);

  useEffect(() => {
    objectDetectorRef.current = objectDetector;
  }, [objectDetector]);

  // Start webcam immediately on mount and keep alive
  useEffect(() => {
    initWebcamStream();
  }, []);

  // Ensure video element always binds active streamRef
  useEffect(() => {
    if (videoRef.current && streamRef.current && videoRef.current.srcObject !== streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(err => console.log('[Video AI] Video auto-sync play catch:', err));
    }
  });

  // Strict Keyboard Lock API for Escape (Chromium)
  useEffect(() => {
    if (interviewState === 'INTERVIEW_ACTIVE' && document.fullscreenElement) {
      if (navigator.keyboard && navigator.keyboard.lock) {
        navigator.keyboard.lock(['Escape']).catch(err => {
          console.log('[Lockdown] Keyboard lock for Escape not granted:', err);
        });
      }
    }
    return () => {
      if (navigator.keyboard && navigator.keyboard.unlock) {
        try {
          navigator.keyboard.unlock();
        } catch (e) {}
      }
    };
  }, [interviewState]);

  // Strict navigation & reload locking listeners (Task 9, 10, 11, 13)
  useEffect(() => {
    if (interviewState === 'INTERVIEW_ACTIVE') {
      document.body.classList.add('interview-lockdown-active');
    } else {
      document.body.classList.remove('interview-lockdown-active');
    }

    if (interviewState === 'INTERVIEW_ACTIVE') {
      const handlePopState = (e) => {
        window.history.pushState(null, '', window.location.href);
        toast.warning('Browser Back/Forward navigation is locked during the active mock interview.');
        proctoringEventsRef.current.push({
          type: 'BROWSER_NAVIGATION_ATTEMPT',
          startedAt: new Date(),
          durationMs: 0
        });
      };
      
      window.history.pushState(null, '', window.location.href);
      window.addEventListener('popstate', handlePopState);

      const handleBeforeUnload = (e) => {
        e.preventDefault();
        e.returnValue = 'Warning: Leaving or reloading the page will pause and potentially invalidate your active session.';
        proctoringEventsRef.current.push({
          type: 'PAGE_LEAVE_ATTEMPT',
          startedAt: new Date(),
          durationMs: 0
        });
        return e.returnValue;
      };
      window.addEventListener('beforeunload', handleBeforeUnload);

      const handleKeyDown = (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Ignore modifier keys so pressing Shift/Ctrl/Alt alone does not trigger alerts
        if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab'].includes(e.key)) {
          return;
        }

        const now = Date.now();
        if (now - lastKeyToastTimeRef.current > 3500) {
          lastKeyToastTimeRef.current = now;
          if (e.key === 'Escape') {
            toast.info('Use the red "Terminate Interview" button at the top to exit.', { toastId: 'esc-locked' });
          } else if ((e.ctrlKey && e.key === 'r') || (e.metaKey && e.key === 'r') || e.key === 'F5') {
            toast.warning('Page refresh is locked during the active interview.', { toastId: 'refresh-locked' });
          } else {
            toast.info('Keyboard input is disabled during the video interview.', { toastId: 'keyboard-locked' });
          }
        }
      };
      window.addEventListener('keydown', handleKeyDown, true);

      return () => {
        window.removeEventListener('popstate', handlePopState);
        window.removeEventListener('beforeunload', handleBeforeUnload);
        window.removeEventListener('keydown', handleKeyDown, true);
        document.body.classList.remove('interview-lockdown-active');
      };
    }
  }, [interviewState]);

  // Fullscreen change listener (Task 3)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const activeFullscreen = !!document.fullscreenElement;
      setIsFullscreen(activeFullscreen);
      
      if (interviewStateRef.current === 'INTERVIEW_ACTIVE' && !activeFullscreen) {
        setInterviewState('INTERVIEW_PAUSED');
        setLockdownReason('Fullscreen exited');
        
        proctoringEventsRef.current.push({
          type: 'FULLSCREEN_EXIT',
          startedAt: new Date(),
          durationMs: 0
        });
        
        pauseRecording();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (!window.isSecureContext || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setIsInsecureContext(true);
    }

    if (!sessionId) {
      if (!hasShownErrorRef.current) {
        hasShownErrorRef.current = true;
        toast.error('Missing required Interview Session ID parameter');
      }
      navigate('/mock-interviews');
      return;
    }
    fetchVideoSession();
    return () => {
      cleanupMedia();
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, [sessionId]);

  const fetchVideoSession = async () => {
    try {
      const response = await axiosInstance.get(`/video/report/${sessionId}`);
      if (response.data && response.data.success) {
        setSession(response.data.session);
        const qList = response.data.session.transcript || [];
        setQuestions(qList);

        // Pre-initialize answers array matching question numbers
        const initialAnswers = qList.map(q => ({
          questionNumber: q.questionNumber,
          transcriptText: '',
          startTime: null,
          endTime: null
        }));
        setAnswers(initialAnswers);

        questionTelemetryRef.current = qList.map(q => ({
          questionNumber: q.questionNumber,
          frames: 0,
          facePresentFrames: 0,
          eyeContactFrames: 0,
          lookingAwayFrames: 0,
          centerFacingFrames: 0,
          totalYaw: 0,
          totalPitch: 0,
          totalRoll: 0,
          expressionDistribution: { neutral: 0, smile: 0, frown: 0, surprise: 0 }
        }));

        const savedSession = localStorage.getItem(`video_interview_session_${sessionId}`);
        if (savedSession) {
          try {
            const restored = JSON.parse(savedSession);
            toast.info('Restored active mock interview session from browser storage.');
            setCurrentIndex(restored.currentIndex);
            setTimeLeftSec(restored.timeLeftSec);
            if (restored.timelineEvents) setTimelineEvents(restored.timelineEvents);
            if (restored.answers) setAnswers(restored.answers);
            
            // Restore refs
            if (restored.proctoringEvents) proctoringEventsRef.current = restored.proctoringEvents;
            eyeContactValidFramesRef.current = restored.eyeContactValidFrames || 0;
            eyeContactUnknownFramesRef.current = restored.eyeContactUnknownFrames || 0;
            eyeContactRawSumRef.current = restored.eyeContactRawSum || 0;
            eyeContactSmoothedSumRef.current = restored.eyeContactSmoothedSum || 0;
            blinkFramesRef.current = restored.blinkFrames || 0;
            totalFramesRef.current = restored.totalFrames || 0;
            facePresentFramesRef.current = restored.facePresentFrames || 0;
            eyeContactFramesRef.current = restored.eyeContactFrames || 0;
            lookingAwayFramesRef.current = restored.lookingAwayFrames || 0;
            centerFacingFramesRef.current = restored.centerFacingFrames || 0;
            totalYawRef.current = restored.totalYaw || 0;
            totalPitchRef.current = restored.totalPitch || 0;
            totalRollRef.current = restored.totalRoll || 0;
            expressionNeutralFramesRef.current = restored.expressionNeutralFrames || 0;
            expressionSmileFramesRef.current = restored.expressionSmileFrames || 0;
            expressionFrownFramesRef.current = restored.expressionFrownFrames || 0;
            expressionSurpriseFramesRef.current = restored.expressionSurpriseFrames || 0;
            noFaceEventsRef.current = restored.noFaceEvents || 0;
            multipleFaceEventsRef.current = restored.multipleFaceEvents || 0;
            lookingAwayEventsRef.current = restored.lookingAwayEvents || 0;
            tabVisibilityChangesRef.current = restored.tabVisibilityChanges || 0;
            windowBlurEventsRef.current = restored.windowBlurEvents || 0;
          } catch (e) {
            console.error('Failed to parse saved session recovery:', e);
          }
        }

        if (response.data.status === 'generating' || qList.length === 0) {
          setIsGenerating(true);
          if (!pollIntervalRef.current) {
            pollIntervalRef.current = setInterval(fetchVideoSession, 3000);
          }
        } else {
          setIsGenerating(false);
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        }
      }
    } catch (err) {
      console.error('Error loading video session:', err);
      toast.error(err.response?.data?.message || 'Failed to load video interview configurations');
      if (err.response?.status === 400 || err.response?.status === 404) {
        navigate('/mock-interviews');
      }
    } finally {
      setLoading(false);
    }
  };

  // Start webcam, microphone, volume meter, and start recording loop
  const initWebcamStream = async () => {
    try {
      let stream = streamRef.current;
      if (!stream || !stream.active) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
          audio: true
        });
        streamRef.current = stream;
        setHasWebcam(true);
        setHasMic(true);
      }

      if (videoRef.current) {
        if (videoRef.current.srcObject !== stream) {
          videoRef.current.srcObject = stream;
        }
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn('[Video AI] Programmatic video play failed:', playErr);
        }
      }

      // If already initialized analyser/tracker, don't recreate duplicate loops
      if (cleanupTrackingRef.current) {
        return;
      }

      // Web Audio level analyzer
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      // MediaRecorder initialization
      recordedChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8,opus' });
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      if (isRecordingRef.current) {
        mediaRecorder.start(1000); // chunk slice every second
      }

      // Realtime non-verbal metrics MediaPipe & Canvas loop
      const canvas = canvasRef.current;
      const ctx = canvas ? canvas.getContext('2d') : null;
      
      const NO_FACE_THRESHOLD_MS = 2000;
      const MULTIPLE_FACES_THRESHOLD_MS = 1500;
      const LOOKING_AWAY_THRESHOLD_MS = 2000;

      const prevFaceCountRef = { current: -1 };

      const processFrame = () => {
        if (interviewStateRef.current === 'INTERVIEW_PAUSED' || interviewStateRef.current === 'INTERVIEW_COMPLETED') return;
        
        const video = videoRef.current;
        const landmarkerInstance = faceLandmarkerRef.current;

        // 1. Throttled development console logging (approx once per second, Task 1)
        const currentSec = Math.floor(Date.now() / 1000);
        const shouldLog = currentSec !== lastLoggedSecRef.current;
        
        // 2. VERIFY THE VIDEO ELEMENT (Task 2)
        const videoReady = video && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0 && video.srcObject;
        const videoTracks = video && video.srcObject ? video.srcObject.getVideoTracks() : [];
        const trackActive = videoTracks.length > 0 && videoTracks[0].readyState === 'live';

        if (shouldLog) {
          lastLoggedSecRef.current = currentSec;
          console.log('[Face Analysis Debug]', {
            videoReadyState: video ? video.readyState : 'no-video',
            videoWidth: video ? video.videoWidth : 0,
            videoHeight: video ? video.videoHeight : 0,
            currentTime: video ? video.currentTime : 0,
            landmarkerAvailable: !!landmarkerInstance,
            pipelineStatus,
            videoTracksCount: videoTracks.length,
            trackActive
          });
        }

        if (!videoReady || !trackActive) {
          if (shouldLog) {
            console.log('[Face Analysis Frame Skipped] Reason:', 
              !video ? 'Video element not found' : 
              !video.srcObject ? 'video.srcObject missing' :
              video.readyState < 2 ? `readyState is ${video.readyState} (needs >= 2)` : 
              video.videoWidth === 0 ? 'videoWidth is 0' :
              videoTracks.length === 0 ? 'No video tracks found' :
              `Track readyState is "${videoTracks[0].readyState}" (needs "live")`
            );
          }
          return;
        }

        totalFramesRef.current++;
        
        let faceCount = 0;
        let landmarks = null;
        let blendshapes = null;
        let resultExists = false;
        let faceLandmarksExists = false;
        let blendshapesExists = false;
        let matrixExists = false;
        
        let yaw = 0;
        let pitch = 0;
        let roll = 0;

        // 3. RUN MEDIAPIPE FACE DETECTION PIPELINE
        if (landmarkerInstance) {
          try {
            // Ensure strictly increasing monotonically increasing timestamp (Task 6)
            const performanceNow = performance.now();
            const timestamp = performanceNow > lastTimestampRef.current ? performanceNow : lastTimestampRef.current + 1;
            lastTimestampRef.current = timestamp;

            const results = landmarkerInstance.detectForVideo(video, timestamp);
            if (results) {
              resultExists = true;
              if (results.faceLandmarks) {
                faceLandmarksExists = true;
                faceCount = results.faceLandmarks.length;
                if (faceCount > 0) {
                  landmarks = results.faceLandmarks[0];
                  if (results.faceBlendshapes && results.faceBlendshapes.length > 0) {
                    blendshapes = results.faceBlendshapes[0].categories;
                    blendshapesExists = true;
                  }

                  // Verify and use facial transformation matrix if available (Task 4)
                  const matrixes = results.facialTransformationMatrixes;
                  if (matrixes && matrixes.length > 0 && matrixes[0].data) {
                    matrixExists = true;
                    const matrix = matrixes[0].data;
                    const r10 = matrix[1];
                    const r11 = matrix[5];
                    const r02 = matrix[8];
                    const r12 = matrix[9];
                    const r22 = matrix[10];

                    pitch = Math.asin(-Math.max(-1, Math.min(1, r12))) * (180 / Math.PI);
                    yaw = Math.atan2(r02, r22) * (180 / Math.PI);
                    roll = Math.atan2(r10, r11) * (180 / Math.PI);
                  } else {
                    const dLeft = landmarks[263].x - landmarks[4].x;
                    const dRight = landmarks[4].x - landmarks[33].x;
                    yaw = (dLeft - dRight) / Math.max(0.001, dLeft + dRight) * 90;

                    const dForehead = landmarks[4].y - landmarks[10].y;
                    const dChin = landmarks[152].y - landmarks[4].y;
                    pitch = (dForehead - dChin) / Math.max(0.001, dForehead + dChin) * 90;

                    roll = Math.atan2(landmarks[263].y - landmarks[33].y, landmarks[263].x - landmarks[33].x) * (180 / Math.PI);
                  }
                }
              }
            }
          } catch (e) {
            console.warn('[Video AI] MediaPipe runtime error during frame processing:', e.message);
          }
        }

        // Log face count changes in development (Task 5)
        if (faceCount !== prevFaceCountRef.current) {
          console.log(`[Face Analysis] MediaPipe result: face count = ${faceCount}`);
          prevFaceCountRef.current = faceCount;
        }

        const faceDetected = faceCount > 0;
        setHasFace(faceDetected);

        // 1. FACE PRESENCE STATE MACHINE
        if (!faceDetected) {
          if (!noFaceStartRef.current) {
            noFaceStartRef.current = Date.now();
          } else {
            const noFaceDuration = Date.now() - noFaceStartRef.current;
            if (noFaceDuration >= NO_FACE_THRESHOLD_MS) {
              setPostureStatus('No Face Detected');
              setPostureWarning('Face not detected. Please align yourself directly in front of the camera.');
              setGazeStatus('Not available');
              setCurrentEmotion('Not available');
              setCameraFacingScore(0);
            }
          }
        } else {
          // Face is present
          facePresentFramesRef.current++;
          
          if (noFaceStartRef.current) {
            const noFaceDuration = Date.now() - noFaceStartRef.current;
            if (noFaceDuration >= NO_FACE_THRESHOLD_MS) {
              noFaceEventsRef.current++;
              proctoringEventsRef.current.push({
                type: 'NO_FACE',
                startedAt: new Date(noFaceStartRef.current),
                durationMs: noFaceDuration
              });
              addTimelineEvent('NO_FACE', 'Left the camera frame');
            }
            noFaceStartRef.current = null;
          }
          setPostureWarning('');
        }

        // 2. MULTIPLE FACES STATE MACHINE
        if (faceCount > 1) {
          if (!multipleFacesStartRef.current) {
            multipleFacesStartRef.current = Date.now();
          }
        } else {
          if (multipleFacesStartRef.current) {
            const duration = Date.now() - multipleFacesStartRef.current;
            if (duration >= MULTIPLE_FACES_THRESHOLD_MS) {
              multipleFaceEventsRef.current++;
              proctoringEventsRef.current.push({
                type: 'MULTIPLE_FACES',
                startedAt: new Date(multipleFacesStartRef.current),
                durationMs: duration
              });
              addTimelineEvent('MULTIPLE_FACES', 'Multiple faces detected');
            }
            multipleFacesStartRef.current = null;
          }
        }

        // ONLY process facial metrics if face landmarker is active (Task 11: No fake fallbacks)
        if (landmarkerInstance && faceDetected && landmarks) {
          totalYawRef.current += yaw;
          totalPitchRef.current += pitch;
          totalRollRef.current += roll;

          // Apply EMA smoothing to pose angles
          const alpha = 0.15;
          smoothedYawRef.current = alpha * yaw + (1 - alpha) * smoothedYawRef.current;
          smoothedPitchRef.current = alpha * pitch + (1 - alpha) * smoothedPitchRef.current;
          smoothedRollRef.current = alpha * roll + (1 - alpha) * smoothedRollRef.current;

          // Classify Head Alignment
          let alignment = 'Centered';
          if (smoothedYawRef.current < -15) {
            alignment = 'Looking Left';
          } else if (smoothedYawRef.current > 15) {
            alignment = 'Looking Right';
          } else if (smoothedPitchRef.current < -12) {
            alignment = 'Looking Up';
          } else if (smoothedPitchRef.current > 12) {
            alignment = 'Looking Down';
          }

          if (alignment === 'Centered') {
            centerFacingFramesRef.current++;
            setHasPose(true);
          } else {
            setHasPose(false);
          }
          setPostureStatus(alignment);

          // Proximity alerts (Face Too Close / Too Far)
          let approxFaceSize = 0.2;
          if (landmarks.length >= 152) {
            approxFaceSize = Math.abs(landmarks[10].y - landmarks[152].y);
          }
          
          if (approxFaceSize > 0.45) {
            if (!faceTooCloseStartRef.current) faceTooCloseStartRef.current = Date.now();
          } else {
            if (faceTooCloseStartRef.current) {
              const dur = Date.now() - faceTooCloseStartRef.current;
              if (dur > 2000) {
                proctoringEventsRef.current.push({ type: 'FACE_TOO_CLOSE', startedAt: new Date(faceTooCloseStartRef.current), durationMs: dur });
              }
              faceTooCloseStartRef.current = null;
            }
          }

          if (approxFaceSize < 0.12) {
            if (!faceTooFarStartRef.current) faceTooFarStartRef.current = Date.now();
          } else {
            if (faceTooFarStartRef.current) {
              const dur = Date.now() - faceTooFarStartRef.current;
              if (dur > 2000) {
                proctoringEventsRef.current.push({ type: 'FACE_TOO_FAR', startedAt: new Date(faceTooFarStartRef.current), durationMs: dur });
              }
              faceTooFarStartRef.current = null;
            }
          }

          // 4. CAMERA FACING & EYE CONTACT ESTIMATION (Tasks 1 - 10)
          const leftEyeMinX = Math.min(landmarks[33].x, landmarks[133].x);
          const leftEyeMaxX = Math.max(landmarks[33].x, landmarks[133].x);
          const leftEyeWidth = leftEyeMaxX - leftEyeMinX;
          
          const leftEyeMinY = Math.min(landmarks[159].y, landmarks[145].y);
          const leftEyeMaxY = Math.max(landmarks[159].y, landmarks[145].y);
          const leftEyeHeight = leftEyeMaxY - leftEyeMinY;
          
          const leftEAR = leftEyeHeight / Math.max(0.001, leftEyeWidth);

          const rightEyeMinX = Math.min(landmarks[263].x, landmarks[362].x);
          const rightEyeMaxX = Math.max(landmarks[263].x, landmarks[362].x);
          const rightEyeWidth = rightEyeMaxX - rightEyeMinX;
          
          const rightEyeMinY = Math.min(landmarks[386].y, landmarks[374].y);
          const rightEyeMaxY = Math.max(landmarks[386].y, landmarks[374].y);
          const rightEyeHeight = rightEyeMaxY - rightEyeMinY;
          
          const rightEAR = rightEyeHeight / Math.max(0.001, rightEyeWidth);

          // Blink Detection (Task 10)
          const isBlinkFrame = leftEAR < 0.085 && rightEAR < 0.085;
          let handleAsBlink = false;
          
          if (isBlinkFrame) {
            if (!isBlinkingRef.current) {
              isBlinkingRef.current = true;
              blinkStartSecRef.current = performance.now();
            }
            const blinkDuration = performance.now() - blinkStartSecRef.current;
            if (blinkDuration < 800) {
              handleAsBlink = true;
              blinkFramesRef.current++;
            }
          } else {
            isBlinkingRef.current = false;
          }

          // Calculate Landmark Reliability Score (Task 3)
          let eyeLandmarkReliability = 100;
          if (landmarks.length < 468) {
            eyeLandmarkReliability = 0;
          } else {
            // Plausible widths
            if (leftEyeWidth < 0.008 || leftEyeWidth > 0.08 || rightEyeWidth < 0.008 || rightEyeWidth > 0.08) {
              eyeLandmarkReliability -= 30;
            }
            // Plausible heights
            if (leftEyeHeight < 0.002 || leftEyeHeight > 0.035 || rightEyeHeight < 0.002 || rightEyeHeight > 0.035) {
              eyeLandmarkReliability -= 30;
            }
            // Symmetry check
            const widthRatio = leftEyeWidth / Math.max(0.001, rightEyeWidth);
            if (widthRatio < 0.6 || widthRatio > 1.6) {
              eyeLandmarkReliability -= 25;
            }
            // Iris check
            if (landmarks.length < 478) {
              eyeLandmarkReliability -= 25; // Minor deduction, falls back to eyelids + pose
            } else {
              // Geometrically plausible iris locations
              if (landmarks[468].x < leftEyeMinX - 0.02 || landmarks[468].x > leftEyeMaxX + 0.02) eyeLandmarkReliability -= 20;
              if (landmarks[473].x < rightEyeMinX - 0.02 || landmarks[473].x > rightEyeMaxX + 0.02) eyeLandmarkReliability -= 20;
            }
          }
          eyeLandmarkReliability = Math.max(0, Math.min(100, eyeLandmarkReliability));

          let normLeftIrisX = 0.5;
          let normLeftIrisY = 0.5;
          let normRightIrisX = 0.5;
          let normRightIrisY = 0.5;

          const hasIris = landmarks.length >= 478;

          // Normalized iris position (Task 2)
          if (hasIris) {
            const distInnerIrisLeft = Math.sqrt(Math.pow(landmarks[133].x - landmarks[468].x, 2) + Math.pow(landmarks[133].y - landmarks[468].y, 2));
            const distInnerOuterLeft = Math.sqrt(Math.pow(landmarks[133].x - landmarks[33].x, 2) + Math.pow(landmarks[133].y - landmarks[33].y, 2));
            normLeftIrisX = distInnerIrisLeft / Math.max(0.001, distInnerOuterLeft);

            const distUpperIrisLeft = Math.sqrt(Math.pow(landmarks[159].x - landmarks[468].x, 2) + Math.pow(landmarks[159].y - landmarks[468].y, 2));
            const distUpperLowerLeft = Math.sqrt(Math.pow(landmarks[159].x - landmarks[145].x, 2) + Math.pow(landmarks[159].y - landmarks[145].y, 2));
            normLeftIrisY = distUpperIrisLeft / Math.max(0.001, distUpperLowerLeft);

            const distInnerIrisRight = Math.sqrt(Math.pow(landmarks[362].x - landmarks[473].x, 2) + Math.pow(landmarks[362].y - landmarks[473].y, 2));
            const distInnerOuterRight = Math.sqrt(Math.pow(landmarks[362].x - landmarks[263].x, 2) + Math.pow(landmarks[362].y - landmarks[263].y, 2));
            normRightIrisX = distInnerIrisRight / Math.max(0.001, distInnerOuterRight);

            const distUpperIrisRight = Math.sqrt(Math.pow(landmarks[386].x - landmarks[473].x, 2) + Math.pow(landmarks[386].y - landmarks[473].y, 2));
            const distUpperLowerRight = Math.sqrt(Math.pow(landmarks[386].x - landmarks[374].x, 2) + Math.pow(landmarks[386].y - landmarks[374].y, 2));
            normRightIrisY = distUpperIrisRight / Math.max(0.001, distUpperLowerRight);
          }

          // Personal Baseline Calibration (Task 6)
          const isCenteredForCalibration = Math.abs(yaw) <= 8 && Math.abs(pitch) <= 8;
          if (!sessionEyeBaselineRef.current && eyeLandmarkReliability >= 60 && isCenteredForCalibration && hasIris) {
            calibrationDataRef.current.push({
              leftX: normLeftIrisX,
              leftY: normLeftIrisY,
              rightX: normRightIrisX,
              rightY: normRightIrisY,
              leftEAR,
              rightEAR
            });
            if (calibrationDataRef.current.length >= 20) {
              // Calculate robust mean baseline
              const sum = calibrationDataRef.current.reduce((acc, curr) => ({
                leftX: acc.leftX + curr.leftX,
                leftY: acc.leftY + curr.leftY,
                rightX: acc.rightX + curr.rightX,
                rightY: acc.rightY + curr.rightY,
                leftEAR: acc.leftEAR + curr.leftEAR,
                rightEAR: acc.rightEAR + curr.rightEAR
              }), { leftX: 0, leftY: 0, rightX: 0, rightY: 0, leftEAR: 0, rightEAR: 0 });
              
              const medianData = {
                leftX: sum.leftX / 20,
                leftY: sum.leftY / 20,
                rightX: sum.rightX / 20,
                rightY: sum.rightY / 20,
                leftEAR: sum.leftEAR / 20,
                rightEAR: sum.rightEAR / 20
              };
              sessionEyeBaselineRef.current = medianData;
              setSessionEyeBaseline(medianData);
              console.log('[Face Analysis] Personal Gaze Baseline Calibrated:', medianData);
            }
          }

          let rawCameraFacing = Math.max(0, Math.min(100, Math.round(100 - (Math.abs(yaw) * 1.6) - (Math.abs(pitch) * 2.2))));
          smoothedCameraFacingRef.current = alpha * rawCameraFacing + (1 - alpha) * smoothedCameraFacingRef.current;
          setCameraFacingScore(Math.round(smoothedCameraFacingRef.current));

          let rawEyeContact = 0;
          let isGazeContact = true;

          // Fallback Hierarchy evaluation (Task 3 & 9)
          if (handleAsBlink) {
            // Keep previous stable gaze scores during short blinks
            isGazeContact = lastStableEyeContactStateRef.current === 'CONTACT';
          } else if (eyeLandmarkReliability < 35) {
            // Level 4 fallback: Eyes completely occluded / unknown
            eyeContactUnknownFramesRef.current++;
            setEyeContactScore('Not available');
            setGazeStatus('Not available');
            setHasEyeContact(false);
          } else {
            eyeContactValidFramesRef.current++;
            const poseScore = Math.max(0, Math.min(100, Math.round(100 - (Math.abs(yaw) * 1.8) - (Math.abs(pitch) * 2.4))));
            const devEAR = Math.abs(leftEAR - rightEAR) + Math.abs((leftEAR + rightEAR) / 2 - 0.22);
            
            if (hasIris && eyeLandmarkReliability >= 75) {
              // Level 1: Fully calibrated iris comparison
              const baseline = sessionEyeBaselineRef.current || { leftX: 0.5, leftY: 0.5, rightX: 0.5, rightY: 0.5 };
              const diffLeftX = normLeftIrisX - baseline.leftX;
              const diffLeftY = normLeftIrisY - baseline.leftY;
              const diffRightX = normRightIrisX - baseline.rightX;
              const diffRightY = normRightIrisY - baseline.rightY;
              
              const devX = (Math.abs(diffLeftX) + Math.abs(diffRightX)) / 2;
              const devY = (Math.abs(diffLeftY) + Math.abs(diffRightY)) / 2;
              
              const irisGazeScore = Math.max(0, 100 - (devX * 380) - (devY * 300));
              rawEyeContact = Math.round((irisGazeScore * 0.70) + (poseScore * 0.30));
            } else {
              // Level 2: Eyelid geometry + head pose fallback
              const eyeGeoScore = Math.max(0, 100 - (devEAR * 260));
              rawEyeContact = Math.round((poseScore * 0.75) + (eyeGeoScore * 0.25));
            }

            rawEyeContact = Math.max(10, Math.min(100, rawEyeContact));
            eyeContactRawSumRef.current += rawEyeContact;

            // Reinitialize filter instantly upon recovery to avoid recovery lag
            if (wasEyeContactUnavailableRef.current) {
              smoothedEyeContactRef.current = rawEyeContact;
              wasEyeContactUnavailableRef.current = false;
            } else {
              smoothedEyeContactRef.current = alpha * rawEyeContact + (1 - alpha) * smoothedEyeContactRef.current;
            }
            eyeContactSmoothedSumRef.current += smoothedEyeContactRef.current;

            // State Hysteresis filters (Task 7)
            const targetState = smoothedEyeContactRef.current >= 62 ? 'CONTACT' : (smoothedEyeContactRef.current <= 38 ? 'AWAY' : lastStableEyeContactStateRef.current);
            if (targetState !== lastStableEyeContactStateRef.current) {
              consecutiveStateFramesRef.current++;
              if (consecutiveStateFramesRef.current >= REQUIRED_CONSECUTIVE_FRAMES) {
                lastStableEyeContactStateRef.current = targetState;
                consecutiveStateFramesRef.current = 0;
              }
            } else {
              consecutiveStateFramesRef.current = 0;
            }

            isGazeContact = lastStableEyeContactStateRef.current === 'CONTACT';
            setEyeContactScore(Math.round(smoothedEyeContactRef.current));
            setGazeStatus(isGazeContact ? 'Aligned' : 'Looking Away');
            setHasEyeContact(isGazeContact);
          }

          // 11. PROCTORING TIMELINE INTEGRATION (Transition-based debouncing)
          const isLookingAway = !handleAsBlink && eyeLandmarkReliability >= 35 && !isGazeContact;
          
          if (isLookingAway) {
            lookingAwayFramesRef.current++;
            if (!lookingAwayStartRef.current) {
              lookingAwayStartRef.current = Date.now();
            }
          } else {
            if (!handleAsBlink && eyeLandmarkReliability >= 35) {
              eyeContactFramesRef.current++;
            }
            if (lookingAwayStartRef.current) {
              const duration = Date.now() - lookingAwayStartRef.current;
              if (duration >= LOOKING_AWAY_THRESHOLD_MS) {
                lookingAwayEventsRef.current++;
                proctoringEventsRef.current.push({
                  type: 'LOOKING_AWAY',
                  startedAt: new Date(lookingAwayStartRef.current),
                  durationMs: duration,
                  reason: "Sustained gaze deviation"
                });
                addTimelineEvent('LOOKING_AWAY', 'Looking away from camera');
              }
              lookingAwayStartRef.current = null;
            }
          }

          // Throttled Eye Contact Debug Logging (Task 16)
          if (shouldLog) {
            console.log('[Eye Contact Debug]', {
              faceDetected,
              leftEyeValid: leftEyeReliable,
              rightEyeValid: rightEyeReliable,
              irisAvailable: hasIris,
              eyeLandmarkReliability: Math.round(eyeLandmarkReliability),
              leftIrisX: Number(normLeftIrisX.toFixed(3)),
              leftIrisY: Number(normLeftIrisY.toFixed(3)),
              rightIrisX: Number(normRightIrisX.toFixed(3)),
              rightIrisY: Number(normRightIrisY.toFixed(3)),
              baselineAvailable: !!sessionEyeBaselineRef.current,
              rawEyeContactScore: eyeLandmarkReliability >= 35 ? rawEyeContact : null,
              smoothedEyeContactScore: Math.round(smoothedEyeContactRef.current),
              eyeContactState: lastStableEyeContactStateRef.current,
              headYaw: Math.round(yaw),
              headPitch: Math.round(pitch),
              blinkDetected: isBlinkingRef.current
            });
          }

          // 5. REAL-TIME OBJECT IDENTIFICATION PROCTORING (IMAGE Mode via 2D Canvas Snapshot)
          const nowObj = performance.now();
          if (objectDetectorRef.current && (nowObj - lastObjectDetectTimeRef.current > 200)) {
            lastObjectDetectTimeRef.current = nowObj;
            try {
              const canvas = canvasRef.current;
              if (canvas) {
                canvas.width = 320;
                canvas.height = 240;
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                if (ctx && video) {
                  ctx.drawImage(video, 0, 0, 320, 240);

                  // Calculate candidate face bounding box in 320x240 canvas space
                  let faceBoundingBox = null;
                  if (landmarks && landmarks.length > 0) {
                    let minX = 1, maxX = 0, minY = 1, maxY = 0;
                    const keyFacePoints = [10, 152, 234, 454, 127, 356, 136, 365, 33, 263];
                    for (const idx of keyFacePoints) {
                      const pt = landmarks[idx] || landmarks[0];
                      if (pt.x < minX) minX = pt.x;
                      if (pt.x > maxX) maxX = pt.x;
                      if (pt.y < minY) minY = pt.y;
                      if (pt.y > maxY) maxY = pt.y;
                    }
                    faceBoundingBox = {
                      minX: minX * 320,
                      maxX: maxX * 320,
                      minY: minY * 240,
                      maxY: maxY * 240,
                      width: (maxX - minX) * 320,
                      height: (maxY - minY) * 240
                    };
                  }

                  const objResults = objectDetectorRef.current.detect(canvas);
                  if (objResults && objResults.detections) {
                    const PROHIBITED_KEYWORDS = ['phone', 'cell', 'mobile', 'telephone', 'laptop', 'tablet', 'remote', 'tv', 'book'];
                    const foundItems = [];
                    const frameArea = 320 * 240;

                    objResults.detections.forEach(det => {
                      const cat = det.categories?.[0];
                      if (!cat) return;
                      const catLower = (cat.categoryName || '').toLowerCase();
                      const isMatch = PROHIBITED_KEYWORDS.some(kw => catLower.includes(kw));
                      if (!isMatch) return;

                      const bb = det.boundingBox;
                      const objWidth = bb ? (bb.width || 0) : 0;
                      const objHeight = bb ? (bb.height || 0) : 0;
                      const objArea = objWidth * objHeight;

                      // Reject tiny noise specks (< 450px in 320x240)
                      if (bb && (objWidth < 16 || objHeight < 20 || objArea < 450)) {
                        return;
                      }

                      // Spatial face filter: Reject small features located entirely on the candidate's eyes/nose (e.g. eyeglasses frames)
                      if (bb && faceBoundingBox) {
                        const objCenterX = bb.originX + objWidth / 2;
                        const objCenterY = bb.originY + objHeight / 2;
                        const isInsideUpperFace = (
                          objCenterX >= faceBoundingBox.minX &&
                          objCenterX <= faceBoundingBox.maxX &&
                          objCenterY >= faceBoundingBox.minY &&
                          objCenterY <= (faceBoundingBox.minY + faceBoundingBox.height * 0.70)
                        );
                        if (isInsideUpperFace && objWidth < faceBoundingBox.width * 0.75) {
                          return;
                        }
                      }

                      // Calibrated confidence thresholds
                      const isPhone = catLower.includes('phone') || catLower.includes('cell') || catLower.includes('mobile') || catLower.includes('telephone');
                      const isRemote = catLower.includes('remote');
                      const isLaptopTablet = catLower.includes('laptop') || catLower.includes('tablet');
                      const isBook = catLower.includes('book');
                      const isTv = catLower.includes('tv');

                      const minScore = isPhone ? 0.22
                        : isRemote ? 0.24
                        : isLaptopTablet ? 0.25
                        : isBook ? 0.26
                        : isTv ? 0.35
                        : 0.25;

                      if (cat.score < minScore) return;
                      if (isTv && objArea < frameArea * 0.04) return;

                      const displayName = (isPhone || isRemote)
                        ? 'Cell Phone / Mobile Device'
                        : isBook
                        ? 'Book / Notes / Documents'
                        : (isLaptopTablet || isTv)
                        ? 'Secondary Screen / Device'
                        : cat.categoryName;

                      foundItems.push({ name: displayName, score: cat.score });
                    });

                    if (foundItems.length > 0) {
                      // Immediate activation on confirmed detection frame
                      consecutiveObjectDetectionsRef.current = 3;
                      const primaryItem = foundItems[0].name;
                      setProhibitedObjectAlert({ active: true, label: primaryItem });
                      const timeSinceLastEvent = Date.now() - lastProhibitedEventTimeRef.current;
                      if (timeSinceLastEvent > 12000) {
                        lastProhibitedEventTimeRef.current = Date.now();
                        prohibitedObjectEventsRef.current++;
                        addTimelineEvent('PROHIBITED_OBJECT', `Prohibited object detected: ${primaryItem}`);
                        toast.warn(`⚠️ Proctoring Alert: ${primaryItem} detected in webcam frame!`, { toastId: 'prohibited-object-alert' });
                      }
                    } else {
                      // Decay accumulator on clean frame
                      if (consecutiveObjectDetectionsRef.current > 0) {
                        consecutiveObjectDetectionsRef.current -= 1;
                      }
                      if (consecutiveObjectDetectionsRef.current <= 0) {
                        consecutiveObjectDetectionsRef.current = 0;
                        setProhibitedObjectAlert(prev => prev.active ? { active: false, label: '' } : prev);
                      }
                    }
                  }
                }
              }
            } catch (objErr) {
              console.warn('[Object Detection] Execution notice:', objErr);
            }
          }

          // 6. REALISTIC MULTI-DIMENSIONAL FACIAL EXPRESSION ENGINE
          let rawSmile = 0;
          let rawFrown = 0;
          let rawSurprise = 0;
          let rawThinking = 0;
          let rawSpeaking = 0;
          let rawConfused = 0;

          // A. Blendshapes calculation
          if (blendshapes) {
            const getScore = (name) => {
              const found = blendshapes.find(c => c.categoryName === name);
              return found ? found.score : 0;
            };

            const smileL = getScore('mouthSmileLeft');
            const smileR = getScore('mouthSmileRight');
            const dimpleL = getScore('mouthDimpleLeft');
            const dimpleR = getScore('mouthDimpleRight');
            const frownL = getScore('mouthFrownLeft');
            const frownR = getScore('mouthFrownRight');
            const browDownL = getScore('browDownLeft');
            const browDownR = getScore('browDownRight');
            const browInnerUp = getScore('browInnerUp');
            const jawOpen = getScore('jawOpen');
            const browOuterL = getScore('browOuterUpLeft');
            const browOuterR = getScore('browOuterUpRight');
            const eyeSquintL = getScore('eyeSquintLeft');
            const eyeSquintR = getScore('eyeSquintRight');
            const eyeLookUpL = getScore('eyeLookUpLeft');
            const eyeLookUpR = getScore('eyeLookUpRight');
            const mouthPressL = getScore('mouthPressLeft');
            const mouthPressR = getScore('mouthPressRight');
            const mouthPucker = getScore('mouthPucker');
            const mouthUpperUpL = getScore('mouthUpperUpLeft');
            const mouthUpperUpR = getScore('mouthUpperUpRight');

            // 1. Confident / Smile
            rawSmile = Math.max((smileL + smileR) / 2, Math.max(smileL, smileR) * 0.85, (dimpleL + dimpleR) * 0.65);

            // 2. Stressed / Frown
            rawFrown = Math.max((frownL + frownR) / 2, (browDownL + browDownR) / 2, Math.max(browDownL, browDownR) * 0.8);

            // 3. Genuine Surprise: MUST have BOTH high raised brows AND wide open jaw!
            if (browInnerUp > 0.28 && jawOpen > 0.35) {
              rawSurprise = (browInnerUp * 0.5) + (jawOpen * 0.5);
            } else {
              rawSurprise = 0;
            }

            // 4. Confused / Perplexed: Asymmetrical brow raise / furrow
            const browAsym = Math.abs(browOuterL - browOuterR);
            const browDownAsym = Math.abs(browDownL - browDownR);
            rawConfused = Math.max(browAsym * 1.2, browDownAsym * 1.1);

            // 5. Thinking / Reflective: Eyes looked up or squinted with pressed lips or tilted head
            const eyesUp = (eyeLookUpL + eyeLookUpR) / 2;
            const eyeSquint = (eyeSquintL + eyeSquintR) / 2;
            const lipPress = Math.max((mouthPressL + mouthPressR) / 2, mouthPucker);
            rawThinking = Math.max(eyesUp * 0.8, eyeSquint * 0.7, (lipPress > 0.15 ? 0.35 : 0));

            // 6. Speaking / Engaging: Active articulation with mouth open in speech range
            if (isRecording && jawOpen > 0.12 && jawOpen < 0.45 && rawSurprise === 0 && rawSmile < 0.35) {
              rawSpeaking = Math.max(jawOpen, (mouthUpperUpL + mouthUpperUpR) / 2);
            }
          }

          // B. Geometric Landmark calculation (3D geometry enhancement)
          if (landmarks && landmarks.length >= 468) {
            const faceWidth = Math.hypot(landmarks[454].x - landmarks[234].x, landmarks[454].y - landmarks[234].y);
            const faceHeight = Math.hypot(landmarks[152].x - landmarks[10].x, landmarks[152].y - landmarks[10].y);
            const mouthWidth = Math.hypot(landmarks[291].x - landmarks[61].x, landmarks[291].y - landmarks[61].y);
            const mouthOpen = Math.hypot(landmarks[14].y - landmarks[13].y, landmarks[14].x - landmarks[13].x);
            const innerBrows = Math.hypot(landmarks[336].x - landmarks[107].x, landmarks[336].y - landmarks[107].y);

            const mouthWidthRatio = mouthWidth / Math.max(0.001, faceWidth);
            const mouthOpenRatio = mouthOpen / Math.max(0.001, faceHeight);
            const browInnerRatio = innerBrows / Math.max(0.001, faceWidth);
            const lipCornerY = (landmarks[61].y + landmarks[291].y) / 2;
            const lipCenterY = (landmarks[0].y + landmarks[17].y) / 2;
            const lipElevation = (lipCenterY - lipCornerY) / Math.max(0.001, faceHeight);

            // Geometric boosts
            if (mouthWidthRatio > 0.46 && lipElevation > 0.010) {
              rawSmile = Math.max(rawSmile, 0.40);
            }
            if (browInnerRatio < 0.20 || lipElevation < -0.012) {
              rawFrown = Math.max(rawFrown, 0.35);
            }
            if (Math.abs(roll) > 7 && mouthOpenRatio < 0.06) {
              rawThinking = Math.max(rawThinking, 0.30);
            }
          }

          // Smoothing (Temporal Exponential Moving Average)
          smoothedSmileRef.current = 0.20 * rawSmile + 0.80 * smoothedSmileRef.current;
          smoothedFrownRef.current = 0.20 * rawFrown + 0.80 * smoothedFrownRef.current;
          smoothedSurpriseRef.current = 0.20 * rawSurprise + 0.80 * smoothedSurpriseRef.current;
          smoothedThinkingRef.current = 0.20 * rawThinking + 0.80 * smoothedThinkingRef.current;
          smoothedSpeakingRef.current = 0.20 * rawSpeaking + 0.80 * smoothedSpeakingRef.current;
          smoothedConfusedRef.current = 0.20 * rawConfused + 0.80 * smoothedConfusedRef.current;

          // Dominant Realistic Expression Resolution
          let currentExp = 'Neutral';
          if (smoothedSmileRef.current > 0.24) {
            currentExp = 'Smile';
            expressionSmileFramesRef.current++;
          } else if (smoothedSurpriseRef.current > 0.32) {
            currentExp = 'Surprise';
            expressionSurpriseFramesRef.current++;
          } else if (smoothedFrownRef.current > 0.25) {
            currentExp = 'Frown';
            expressionFrownFramesRef.current++;
          } else if (smoothedConfusedRef.current > 0.24) {
            currentExp = 'Confused';
            expressionConfusedFramesRef.current++;
          } else if (smoothedThinkingRef.current > 0.24) {
            currentExp = 'Thinking';
            expressionThinkingFramesRef.current++;
          } else if (smoothedSpeakingRef.current > 0.25) {
            currentExp = 'Speaking';
            expressionSpeakingFramesRef.current++;
          } else {
            currentExp = 'Neutral';
            expressionNeutralFramesRef.current++;
          }
          setCurrentEmotion(currentExp);

          // Accumulate question-level telemetry metrics (Task 20)
          const qIdx = currentIndexRef.current;
          if (questionTelemetryRef.current && questionTelemetryRef.current[qIdx]) {
            const qTel = questionTelemetryRef.current[qIdx];
            qTel.frames++;
            if (faceDetected) {
              qTel.facePresentFrames++;
              if (eyeLandmarkReliability >= 35) {
                if (isGazeContact) {
                  qTel.eyeContactFrames++;
                } else {
                  qTel.lookingAwayFrames++;
                }
              }
              if (alignment === 'Centered') {
                qTel.centerFacingFrames++;
              }
              qTel.totalYaw += yaw;
              qTel.totalPitch += pitch;
              qTel.totalRoll += roll;
              
              if (currentExp === 'Neutral') qTel.expressionDistribution.neutral = (qTel.expressionDistribution.neutral || 0) + 1;
              else if (currentExp === 'Smile') qTel.expressionDistribution.smile = (qTel.expressionDistribution.smile || 0) + 1;
              else if (currentExp === 'Frown') qTel.expressionDistribution.frown = (qTel.expressionDistribution.frown || 0) + 1;
              else if (currentExp === 'Surprise') qTel.expressionDistribution.surprise = (qTel.expressionDistribution.surprise || 0) + 1;
              else if (currentExp === 'Thinking') qTel.expressionDistribution.thinking = (qTel.expressionDistribution.thinking || 0) + 1;
              else if (currentExp === 'Speaking') qTel.expressionDistribution.speaking = (qTel.expressionDistribution.speaking || 0) + 1;
              else if (currentExp === 'Confused') qTel.expressionDistribution.confused = (qTel.expressionDistribution.confused || 0) + 1;
            }
          }

          // Throttled Expression Debug Logging (Task 16)
          if (shouldLog) {
            console.log('[Expression Debug]', {
              smileScore: Number(smoothedSmileRef.current.toFixed(3)),
              frownScore: Number(smoothedFrownRef.current.toFixed(3)),
              surpriseScore: Number(smoothedSurpriseRef.current.toFixed(3)),
              thinkingScore: Number(smoothedThinkingRef.current.toFixed(3)),
              speakingScore: Number(smoothedSpeakingRef.current.toFixed(3)),
              confusedScore: Number(smoothedConfusedRef.current.toFixed(3)),
              expression: currentExp,
              blendshapesAvailable: !!blendshapes
            });
          }
        } else if ((!landmarkerInstance || pipelineStatus === 'ERROR') && faceDetected) {
          setPostureStatus('Facial analysis unavailable');
          setPostureWarning('Facial analysis temporarily unavailable. The interview will continue.');
          setGazeStatus('Not available');
          setCurrentEmotion('Not available');
        }
      };

      // Set up visibility & focus proctoring listeners (Deduplicated, Task 8)
      const handleVisibilityChange = () => {
        if (interviewStateRef.current !== 'INTERVIEW_ACTIVE') return;
        const now = Date.now();
        const signal = 'visibilitychange';

        if (document.visibilityState === 'hidden') {
          tabVisibilityChangesRef.current++;
          
          if (pendingIncidentRef.current && (now - pendingIncidentRef.current.startTime < 200)) {
            if (!pendingIncidentRef.current.sourceSignals.includes(signal)) {
              pendingIncidentRef.current.sourceSignals.push(signal);
            }
            pendingIncidentRef.current.type = 'TAB_SWITCH';
          } else {
            pendingIncidentRef.current = {
              type: 'TAB_SWITCH',
              startTime: now,
              sourceSignals: [signal]
            };
            setInterviewState('INTERVIEW_PAUSED');
            setLockdownReason('Tab Switched');
            pauseRecording();
          }
        } else {
          // Visible again
          if (pendingIncidentRef.current) {
            const dur = now - pendingIncidentRef.current.startTime;
            proctoringEventsRef.current.push({
              type: pendingIncidentRef.current.type,
              startedAt: new Date(pendingIncidentRef.current.startTime),
              durationMs: dur,
              metadata: { sourceSignals: pendingIncidentRef.current.sourceSignals }
            });
            addTimelineEvent(pendingIncidentRef.current.type, `Returned after ${(dur / 1000).toFixed(1)}s`);
            pendingIncidentRef.current = null;
          }
        }
      };

      const handleWindowBlur = () => {
        if (interviewStateRef.current !== 'INTERVIEW_ACTIVE') return;
        const now = Date.now();
        const signal = 'window.blur';

        windowBlurEventsRef.current++;

        if (pendingIncidentRef.current && (now - pendingIncidentRef.current.startTime < 200)) {
          if (!pendingIncidentRef.current.sourceSignals.includes(signal)) {
            pendingIncidentRef.current.sourceSignals.push(signal);
          }
        } else {
          pendingIncidentRef.current = {
            type: 'WINDOW_BLUR',
            startTime: now,
            sourceSignals: [signal]
          };
          setInterviewState('INTERVIEW_PAUSED');
          setLockdownReason('Window Lost Focus');
          pauseRecording();
        }
      };

      const handleWindowFocus = () => {
        if (interviewStateRef.current !== 'INTERVIEW_ACTIVE' && interviewStateRef.current !== 'INTERVIEW_PAUSED') return;
        const now = Date.now();
        
        if (pendingIncidentRef.current) {
          const dur = now - pendingIncidentRef.current.startTime;
          proctoringEventsRef.current.push({
            type: pendingIncidentRef.current.type,
            startedAt: new Date(pendingIncidentRef.current.startTime),
            durationMs: dur,
            metadata: { sourceSignals: pendingIncidentRef.current.sourceSignals }
          });
          addTimelineEvent(pendingIncidentRef.current.type, `Refocused window after ${(dur / 1000).toFixed(1)}s`);
          pendingIncidentRef.current = null;
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('blur', handleWindowBlur);
      window.addEventListener('focus', handleWindowFocus);

      // Start the throttled 10 FPS processing loop
      const frameInterval = setInterval(processFrame, 100);

      // Cleanup ref so we can stop it on recording end
      cleanupTrackingRef.current = () => {
        clearInterval(frameInterval);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('blur', handleWindowBlur);
        window.removeEventListener('focus', handleWindowFocus);
      };
    } catch (err) {
      console.error('Webcam initialization failed:', err);
      toast.error('Failed to access webcam and mic hardware.');
    }
  };

  const addTimelineEvent = (eventType, description) => {
    const min = Math.floor(recordingTimeSec / 60);
    const sec = recordingTimeSec % 60;
    const timestamp = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    setTimelineEvents(prev => {
      // Limit duplicates within 3 seconds
      const exists = prev.some(e => e.eventType === eventType && Math.abs(parseInt(e.timestamp.split(':')[1]) - sec) < 3);
      if (exists) return prev;
      return [...prev, { timestamp, eventType, description }];
    });
  };

  // Speaks interview question aloud using SpeechSynthesis API
  const speakCurrentQuestion = () => {
    if (questions.length === 0 || isSubmittingRef.current || interviewStateRef.current !== 'INTERVIEW_ACTIVE') return;
    const currentQ = questions[currentIndexRef.current];
    if (!currentQ) return;
    
    // Stop recording state first
    stopUserRecording(false);

    if (ttsFallbackTimeoutRef.current) {
      clearTimeout(ttsFallbackTimeoutRef.current);
      ttsFallbackTimeoutRef.current = null;
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeakingQuestion(true);
      isSpeakingRef.current = true;
      const utterance = new SpeechSynthesisUtterance(currentQ.questionText);
      
      utterance.onend = () => {
        if (ttsFallbackTimeoutRef.current) {
          clearTimeout(ttsFallbackTimeoutRef.current);
          ttsFallbackTimeoutRef.current = null;
        }
        setIsSpeakingQuestion(false);
        isSpeakingRef.current = false;
        if (!isSubmittingRef.current && interviewStateRef.current === 'INTERVIEW_ACTIVE') {
          startUserRecording();
        }
      };
      
      utterance.onerror = (e) => {
        if (ttsFallbackTimeoutRef.current) {
          clearTimeout(ttsFallbackTimeoutRef.current);
          ttsFallbackTimeoutRef.current = null;
        }
        setIsSpeakingQuestion(false);
        isSpeakingRef.current = false;
        // Ignore cancellations/interruptions (from question skip or submit)
        if (e.error === 'canceled' || e.error === 'interrupted' || isSubmittingRef.current || interviewStateRef.current !== 'INTERVIEW_ACTIVE') {
          return;
        }
        console.error('TTS error:', e);
        startUserRecording();
      };

      // Set fallback safety timer based on question length so speech never hangs
      const wordCount = (currentQ.questionText || '').split(/\s+/).length;
      const maxSpeakMs = Math.min(18000, Math.max(5000, Math.ceil(wordCount / 2.0) * 1000 + 2000));
      ttsFallbackTimeoutRef.current = setTimeout(() => {
        if (isSpeakingRef.current && !isSubmittingRef.current && interviewStateRef.current === 'INTERVIEW_ACTIVE') {
          console.log('[TTS] Safety timer reached, transitioning to candidate answer mode');
          if ('speechSynthesis' in window) window.speechSynthesis.cancel();
          setIsSpeakingQuestion(false);
          isSpeakingRef.current = false;
          startUserRecording();
        }
      }, maxSpeakMs);

      window.speechSynthesis.speak(utterance);
    } else {
      // Browser fallback if TTS not supported
      startUserRecording();
    }
  };

  const handleStartAnsweringNow = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (ttsFallbackTimeoutRef.current) {
      clearTimeout(ttsFallbackTimeoutRef.current);
      ttsFallbackTimeoutRef.current = null;
    }
    if (speakTimeoutRef.current) {
      clearTimeout(speakTimeoutRef.current);
      speakTimeoutRef.current = null;
    }
    setIsSpeakingQuestion(false);
    isSpeakingRef.current = false;
    startUserRecording();
  };

  // Launch User webcam recorder and STT listener
  const startUserRecording = async () => {
    if (isSubmittingRef.current || interviewStateRef.current !== 'INTERVIEW_ACTIVE') {
      return;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    setLiveTranscript('');
    setEditedTranscript('');
    setRecordingTimeSec(0);
    setTimeLeftSec(90);
    setIsRecording(true);

    const qNum = questions[currentIndexRef.current]?.questionNumber;
    const startTime = Date.now();
    setAnswers(prev => prev.map(ans => 
      ans.questionNumber === qNum
        ? { ...ans, startTime }
        : ans
    ));

    // Initialize media capture
    await initWebcamStream();

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'inactive') {
      try {
        recordedChunksRef.current = [];
        mediaRecorderRef.current.start(1000);
      } catch (err) {
        console.warn('Failed to start MediaRecorder on recording start:', err);
      }
    }

    // Start timer interval
    timerIntervalRef.current = setInterval(() => {
      if (isSubmittingRef.current || interviewStateRef.current !== 'INTERVIEW_ACTIVE') {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        return;
      }
      setRecordingTimeSec(prev => prev + 1);
      setTimeLeftSec(prev => {
        if (prev <= 1) {
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
          }
          toast.warning("Time limit reached for this question!");
          setTimeout(() => {
            if (!isSubmittingRef.current) {
              if (currentIndexRef.current < questionsCountRef.current - 1) {
                handleNextQuestion();
              } else {
                handleSubmitInterview();
              }
            }
          }, 100);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Initialize SpeechRecognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let transcriptStr = '';
        for (let i = 0; i < event.results.length; i++) {
          transcriptStr += event.results[i][0].transcript + ' ';
        }
        const trimmed = transcriptStr.trim();
        setLiveTranscript(trimmed);
        setEditedTranscript(trimmed);

        // Estimate pacing WPM
        const words = trimmed.split(/\s+/).length;
        const mins = Math.max(1, recordingTimeSec) / 60;
        setSpeakingSpeedWpm(Math.round(words / mins));

        // Filler detector
        const fillers = ['um', 'uh', 'like', 'actually', 'basically', 'so'];
        const matchCount = trimmed.toLowerCase().split(/\s+/).filter(w => fillers.includes(w)).length;
        if (matchCount > fillerCount) {
          setFillerCount(matchCount);
          addTimelineEvent('filler', 'Used vocal filler word');
        }
      };

      recognition.onend = () => {
        if (isRecordingRef.current && !isSubmittingRef.current && interviewStateRef.current === 'INTERVIEW_ACTIVE') {
          try { recognition.start(); } catch (e) {}
        }
      };

      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch (e) {}
    }
  };

  // Keep a reference of recording status to avoid closure captures
  const isRecordingRef = useRef(false);
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  const stopUserRecording = (saveAnswer = true) => {
    setIsRecording(false);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      try { recognitionRef.current.stop(); } catch (e) {}
    }

    if (saveAnswer && questions.length > 0) {
      const qNum = questions[currentIndexRef.current]?.questionNumber;
      const endTime = Date.now();
      setAnswers(prev => prev.map(ans => 
        ans.questionNumber === qNum 
          ? { ...ans, endTime, transcriptText: editedTranscript || liveTranscript || ans.transcriptText || 'No verbal answer recorded.' }
          : ans
      ));
    }
  };

  const handleNextQuestion = () => {
    if (submitting || isSubmittingRef.current) return;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeakingQuestion(false);
    isSpeakingRef.current = false;
    if (speakTimeoutRef.current) {
      clearTimeout(speakTimeoutRef.current);
      speakTimeoutRef.current = null;
    }
    stopUserRecording(true);
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      handleSubmitInterview();
    }
  };

  const handlePreviousQuestion = () => {
    if (submitting || isSubmittingRef.current) return;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeakingQuestion(false);
    isSpeakingRef.current = false;
    if (speakTimeoutRef.current) {
      clearTimeout(speakTimeoutRef.current);
      speakTimeoutRef.current = null;
    }
    stopUserRecording(true);
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  // Speak question automatically on question index navigation change
  useEffect(() => {
    if (questions.length > 0 && interviewState === 'INTERVIEW_ACTIVE' && !isSubmittingRef.current) {
      if (speakTimeoutRef.current) {
        clearTimeout(speakTimeoutRef.current);
      }
      speakTimeoutRef.current = setTimeout(() => {
        if (!isSubmittingRef.current && interviewStateRef.current === 'INTERVIEW_ACTIVE') {
          speakCurrentQuestion();
        }
      }, 400);
      return () => {
        if (speakTimeoutRef.current) {
          clearTimeout(speakTimeoutRef.current);
        }
      };
    }
  }, [currentIndex, questions.length, interviewState]);

  const cleanupMedia = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (speakTimeoutRef.current) {
      clearTimeout(speakTimeoutRef.current);
      speakTimeoutRef.current = null;
    }
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    if (cleanupTrackingRef.current) {
      cleanupTrackingRef.current();
      cleanupTrackingRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
  };

  // Package video recorded chunks, upload, evaluate
  const handleSubmitInterview = async () => {
    if (isSubmittingRef.current || submitting) return;
    isSubmittingRef.current = true;
    setSubmitting(true);

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeakingQuestion(false);
    isSpeakingRef.current = false;
    if (speakTimeoutRef.current) {
      clearTimeout(speakTimeoutRef.current);
      speakTimeoutRef.current = null;
    }

    stopUserRecording(true);
    cleanupMedia();

    // Immediately exit fullscreen, unlock keyboard, and restore normal layout
    if (navigator.keyboard && navigator.keyboard.unlock) {
      try {
        navigator.keyboard.unlock();
      } catch (e) {}
    }
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch (fsErr) {
        console.warn('Exit fullscreen error on submit:', fsErr);
      }
    }
    document.body.classList.remove('interview-lockdown-active');
    setInterviewState('INTERVIEW_COMPLETED');

    try {
      // 1. Package blob
      const videoBlob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const videoFile = new File([videoBlob], `interview-${sessionId}.webm`, { type: 'video/webm' });

      // 2. Upload video
      const formData = new FormData();
      formData.append('sessionId', sessionId);
      formData.append('video', videoFile);

      toast.info('Uploading recorded interview video...');
      const uploadRes = await axiosInstance.post('/video/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // 3. Package answers mapping
      const finalAnswersList = answers.map((ans, idx) => {
        const qTel = questionTelemetryRef.current[idx] || {};
        const qFrames = qTel.frames || 1;
        const qFaceFrames = qTel.facePresentFrames || 0;
        
        // Calculate question-level percentages (Task 20)
        const questionMetrics = {
          facePresencePercentage: Math.round((qFaceFrames / qFrames) * 100),
          eyeContactPercentage: qFaceFrames > 0 ? Math.round((qTel.eyeContactFrames / qFaceFrames) * 100) : 0,
          lookingAwayPercentage: qFaceFrames > 0 ? Math.round((qTel.lookingAwayFrames / qFaceFrames) * 100) : 0,
          centerFacingPercentage: qFaceFrames > 0 ? Math.round((qTel.centerFacingFrames / qFaceFrames) * 100) : 0,
          averageYaw: qFaceFrames > 0 ? Math.round(qTel.totalYaw / qFaceFrames) : 0,
          averagePitch: qFaceFrames > 0 ? Math.round(qTel.totalPitch / qFaceFrames) : 0,
          averageRoll: qFaceFrames > 0 ? Math.round(qTel.totalRoll / qFaceFrames) : 0,
          expressionDistribution: {
            neutral: qFaceFrames > 0 ? Math.round((qTel.expressionDistribution.neutral / qFaceFrames) * 100) : 0,
            smile: qFaceFrames > 0 ? Math.round((qTel.expressionDistribution.smile / qFaceFrames) * 100) : 0,
            frown: qFaceFrames > 0 ? Math.round((qTel.expressionDistribution.frown / qFaceFrames) * 100) : 0,
            surprise: qFaceFrames > 0 ? Math.round((qTel.expressionDistribution.surprise / qFaceFrames) * 100) : 0
          }
        };

        const transcriptText = ans.questionNumber === questions[currentIndex].questionNumber
          ? (editedTranscript || liveTranscript || 'No verbal answer recorded.')
          : (ans.transcriptText || 'No verbal answer recorded.');

        return {
          ...ans,
          startTime: ans.startTime || (Date.now() - 30000), // fallback if not recorded
          endTime: ans.endTime || Date.now(),
          questionMetrics,
          transcriptText
        };
      });

      // 4. Finalize and aggregate proctoring events
      const now = Date.now();
      if (noFaceStartRef.current) {
        const dur = now - noFaceStartRef.current;
        if (dur >= 2000) {
          noFaceEventsRef.current++;
          proctoringEventsRef.current.push({ type: 'NO_FACE', startedAt: new Date(noFaceStartRef.current), durationMs: dur });
        }
      }
      if (multipleFacesStartRef.current) {
        const dur = now - multipleFacesStartRef.current;
        if (dur >= 1500) {
          multipleFaceEventsRef.current++;
          proctoringEventsRef.current.push({ type: 'MULTIPLE_FACES', startedAt: new Date(multipleFacesStartRef.current), durationMs: dur });
        }
      }
      if (lookingAwayStartRef.current) {
        const dur = now - lookingAwayStartRef.current;
        if (dur >= 2000) {
          lookingAwayEventsRef.current++;
          proctoringEventsRef.current.push({ type: 'LOOKING_AWAY', startedAt: new Date(lookingAwayStartRef.current), durationMs: dur });
        }
      }
      if (tabHiddenStartRef.current) {
        const dur = now - tabHiddenStartRef.current;
        proctoringEventsRef.current.push({ type: 'TAB_HIDDEN', startedAt: new Date(tabHiddenStartRef.current), durationMs: dur });
      }
      if (windowBlurStartRef.current) {
        const dur = now - windowBlurStartRef.current;
        proctoringEventsRef.current.push({ type: 'WINDOW_BLUR', startedAt: new Date(windowBlurStartRef.current), durationMs: dur });
      }

      // Compile final aggregate metrics
      const compiledMetrics = {
        analyzedFrames: totalFramesRef.current || 1,
        facePresencePercentage: totalFramesRef.current > 0 ? Math.round((facePresentFramesRef.current / totalFramesRef.current) * 100) : 0,
        eyeContactPercentage: facePresentFramesRef.current > 0 ? Math.round((eyeContactFramesRef.current / facePresentFramesRef.current) * 100) : 0,
        lookingAwayPercentage: facePresentFramesRef.current > 0 ? Math.round((lookingAwayFramesRef.current / facePresentFramesRef.current) * 100) : 0,
        centerFacingPercentage: facePresentFramesRef.current > 0 ? Math.round((centerFacingFramesRef.current / facePresentFramesRef.current) * 100) : 0,
        averageYaw: facePresentFramesRef.current > 0 ? Math.round(totalYawRef.current / facePresentFramesRef.current) : 0,
        averagePitch: facePresentFramesRef.current > 0 ? Math.round(totalPitchRef.current / facePresentFramesRef.current) : 0,
        averageRoll: facePresentFramesRef.current > 0 ? Math.round(totalRollRef.current / facePresentFramesRef.current) : 0,
        expressionDistribution: {
          neutral: facePresentFramesRef.current > 0 ? Math.round((expressionNeutralFramesRef.current / facePresentFramesRef.current) * 100) : 0,
          smile: facePresentFramesRef.current > 0 ? Math.round((expressionSmileFramesRef.current / facePresentFramesRef.current) * 100) : 0,
          frown: facePresentFramesRef.current > 0 ? Math.round((expressionFrownFramesRef.current / facePresentFramesRef.current) * 100) : 0,
          surprise: facePresentFramesRef.current > 0 ? Math.round((expressionSurpriseFramesRef.current / facePresentFramesRef.current) * 100) : 0,
          thinking: facePresentFramesRef.current > 0 ? Math.round((expressionThinkingFramesRef.current / facePresentFramesRef.current) * 100) : 0,
          speaking: facePresentFramesRef.current > 0 ? Math.round((expressionSpeakingFramesRef.current / facePresentFramesRef.current) * 100) : 0,
          confused: facePresentFramesRef.current > 0 ? Math.round((expressionConfusedFramesRef.current / facePresentFramesRef.current) * 100) : 0
        },
        noFaceEvents: noFaceEventsRef.current,
        multipleFaceEvents: multipleFaceEventsRef.current,
        lookingAwayEvents: lookingAwayEventsRef.current,
        tabVisibilityChanges: tabVisibilityChangesRef.current,
        windowBlurEvents: windowBlurEventsRef.current,
        prohibitedObjectEvents: prohibitedObjectEventsRef.current || 0,
        proctoringEvents: proctoringEventsRef.current,

        // Debug & Evaluation additional fields (Task 14)
        eyeContactValidFrames: eyeContactValidFramesRef.current,
        eyeContactUnknownFrames: eyeContactUnknownFramesRef.current,
        eyeContactRawAverage: eyeContactValidFramesRef.current > 0 ? Math.round(eyeContactRawSumRef.current / eyeContactValidFramesRef.current) : 0,
        eyeContactSmoothedAverage: eyeContactValidFramesRef.current > 0 ? Math.round(eyeContactSmoothedSumRef.current / eyeContactValidFramesRef.current) : 0,
        eyeContactContactFrames: eyeContactFramesRef.current,
        eyeContactAwayFrames: lookingAwayFramesRef.current,
        blinkFrames: blinkFramesRef.current
      };

      const finalPayload = {
        sessionId,
        answers: finalAnswersList,
        eyeContactScore: compiledMetrics.eyeContactPercentage,
        facialConfidence: Math.round((compiledMetrics.eyeContactPercentage * 0.4) + (compiledMetrics.centerFacingPercentage * 0.4) + (compiledMetrics.facePresencePercentage * 0.2)),
        confidenceScore: 80,
        communicationScore: 80,
        fillerWords: fillerCount,
        bodyLanguage: {
          posture: compiledMetrics.centerFacingPercentage > 75 ? 'Good Posture' : 'Leaning / Asymmetric',
          headMovement: Math.abs(compiledMetrics.averageYaw) > 10 ? 'High' : 'Normal',
          smileFrequency: compiledMetrics.expressionDistribution.smile > 20 ? 'High' : 'Normal'
        },
        speakingSpeed: speakingSpeedWpm || 125,
        emotions: {
          happy: compiledMetrics.expressionDistribution.smile,
          neutral: compiledMetrics.expressionDistribution.neutral,
          surprised: compiledMetrics.expressionDistribution.surprise,
          nervous: compiledMetrics.expressionDistribution.frown,
          thinking: compiledMetrics.expressionDistribution.thinking,
          speaking: compiledMetrics.expressionDistribution.speaking
        },
        timeline: timelineEvents,
        videoMetrics: compiledMetrics
      };

      toast.info('Generating AI Behavioral & Technical Assessment...');
      const evalRes = await axiosInstance.post('/video/evaluate', finalPayload);
      if (evalRes.data && evalRes.data.success) {
        toast.success('Interview evaluation complete!');
        localStorage.removeItem(`video_interview_session_${sessionId}`);
        
        if (document.fullscreenElement) {
          try {
            await document.exitFullscreen();
          } catch (e) {}
        }
        document.body.classList.remove('interview-lockdown-active');
        navigate(`/video-interview/report/${sessionId}`);
      }
    } catch (err) {
      isSubmittingRef.current = false;
      console.error('[Frontend Debug] Failed to submit mock interview evaluation:', {
        message: err.message,
        status: err.response ? err.response.status : 'N/A',
        data: err.response ? err.response.data : 'N/A',
        sessionId,
        payload: finalPayload
      });
      toast.error('Failed to submit mock interview evaluation.');
    } finally {
      setSubmitting(false);
    }
  };

  const saveSessionState = (timeLeft) => {
    localStorage.setItem(`video_interview_session_${sessionId}`, JSON.stringify({
      currentIndex: currentIndexRef.current,
      timeLeftSec: timeLeft,
      timelineEvents,
      answers,
      proctoringEvents: proctoringEventsRef.current || [],
      eyeContactValidFrames: eyeContactValidFramesRef.current,
      eyeContactUnknownFrames: eyeContactUnknownFramesRef.current,
      eyeContactRawSum: eyeContactRawSumRef.current,
      eyeContactSmoothedSum: eyeContactSmoothedSumRef.current,
      blinkFrames: blinkFramesRef.current,
      totalFrames: totalFramesRef.current,
      facePresentFrames: facePresentFramesRef.current,
      eyeContactFrames: eyeContactFramesRef.current,
      lookingAwayFrames: lookingAwayFramesRef.current,
      centerFacingFrames: centerFacingFramesRef.current,
      totalYaw: totalYawRef.current,
      totalPitch: totalPitchRef.current,
      totalRoll: totalRollRef.current,
      expressionNeutralFrames: expressionNeutralFramesRef.current,
      expressionSmileFrames: expressionSmileFramesRef.current,
      expressionFrownFrames: expressionFrownFramesRef.current,
      expressionSurpriseFrames: expressionSurpriseFramesRef.current,
      expressionThinkingFrames: expressionThinkingFramesRef.current,
      expressionSpeakingFrames: expressionSpeakingFramesRef.current,
      expressionConfusedFrames: expressionConfusedFramesRef.current,
      noFaceEvents: noFaceEventsRef.current,
      multipleFaceEvents: multipleFaceEventsRef.current,
      lookingAwayEvents: lookingAwayEventsRef.current,
      tabVisibilityChanges: tabVisibilityChangesRef.current,
      windowBlurEvents: windowBlurEventsRef.current,
      prohibitedObjectEvents: prohibitedObjectEventsRef.current || 0
    }));
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.pause();
        console.log('[Lockdown] MediaRecorder paused');
      } catch (e) {
        console.warn('Failed to pause MediaRecorder:', e);
      }
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      try {
        mediaRecorderRef.current.resume();
        console.log('[Lockdown] MediaRecorder resumed');
      } catch (e) {
        console.warn('Failed to resume MediaRecorder:', e);
      }
    }
    if (isRecordingRef.current && !timerIntervalRef.current) {
      timerIntervalRef.current = setInterval(() => {
        setRecordingTimeSec(prev => prev + 1);
        setTimeLeftSec(prev => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current);
            toast.warning("Time limit reached for this question!");
            setTimeout(() => {
              if (currentIndexRef.current < questionsCountRef.current - 1) {
                handleNextQuestion();
              } else {
                handleSubmitInterview();
              }
            }, 100);
            return 0;
          }
          saveSessionState(prev - 1);
          return prev - 1;
        });
      }, 1000);
    }
  };

  const handleTerminateInterview = async () => {
    if (isTerminatingRef.current) return;
    const confirmTerm = window.confirm(
      'Are you sure you want to terminate this interview? Your progress will be marked as "Terminated in between" in your interview history.'
    );
    if (!confirmTerm) return;

    isTerminatingRef.current = true;
    setIsTerminating(true);

    try {
      toast.info('Terminating interview session...');
      await axiosInstance.post('/video/terminate', { sessionId, reason: 'User terminated in between' });
    } catch (err) {
      console.warn('Error sending terminate status:', err);
    }

    cleanupMedia();
    localStorage.removeItem(`video_interview_session_${sessionId}`);
    
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch (e) {}
    }
    if (navigator.keyboard && navigator.keyboard.unlock) {
      try {
        navigator.keyboard.unlock();
      } catch (e) {}
    }
    toast.warning('Interview session terminated.');
    navigate('/mock-interviews');
  };

  const handleReturnToInterview = async () => {
    await requestInterviewFullscreen();
    if (document.fullscreenElement) {
      setInterviewState('INTERVIEW_ACTIVE');
      if (isRecordingRef.current) {
        resumeRecording();
      } else {
        speakCurrentQuestion();
      }
    }
  };

  const requestInterviewFullscreen = async () => {
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        await elem.webkitRequestFullscreen();
      } else if (elem.msRequestFullscreen) {
        await elem.msRequestFullscreen();
      }
      setIsFullscreen(true);
    } catch (err) {
      console.error('Fullscreen request rejected:', err);
      toast.error('Fullscreen request was denied. Fullscreen mode is required to proceed.');
    }
  };

  if (isGenerating || (questions.length === 0 && loading)) {
    return (
      <div className="container py-5 text-center animate-fade-in" style={{ maxWidth: '600px' }}>
        <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem', color: 'var(--primary-purple)' }} role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <h3 className="fw-bold text-dark mb-2">Preparing AI questions...</h3>
        <p className="text-muted small mb-4">Please wait a moment while Gemini generates your role-specific interview questions.</p>
        <div className="progress mb-3" style={{ height: '8px' }}>
          <div className="progress-bar progress-bar-striped progress-bar-animated bg-primary" style={{ width: '100%', backgroundColor: 'var(--primary-purple)' }} />
        </div>
      </div>
    );
  }

  if (submitting) {
    return (
      <div className="container py-5 text-center animate-fade-in" style={{ maxWidth: '600px', minHeight: '60vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <div className="spinner-border text-primary mb-3" style={{ width: '3.5rem', height: '3.5rem', color: 'var(--primary-purple)' }} role="status">
          <span className="visually-hidden">Analyzing...</span>
        </div>
        <h3 className="fw-bold text-dark mb-2">Analyzing Interview & Generating Report...</h3>
        <p className="text-muted small mb-4">Please wait while Gemini evaluates your verbal answers, proctoring integrity, and video delivery metrics.</p>
        <div className="progress w-100 mb-3" style={{ height: '8px' }}>
          <div className="progress-bar progress-bar-striped progress-bar-animated bg-success" style={{ width: '100%' }} />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading session...</span>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex] || {};

  return (
    <div className="container py-4 text-start">
      {/* Strict Lockdown Paused Overlay */}
      {interviewState === 'INTERVIEW_PAUSED' && (
        <div className="lockdown-paused-overlay">
          <div className="lockdown-card text-white">
            <FiAlertCircle className="text-warning display-3 mb-3 animate-pulse" />
            <h4 className="fw-bold mb-2">Resume Mock Interview</h4>
            <p className="text-muted small mb-4">
              {lockdownReason || 'Fullscreen mode is required to start or continue your video interview.'}
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
        <div className="d-flex align-items-center gap-2 bg-dark bg-opacity-75 px-3 py-1.5 rounded-3 border border-secondary" style={{ width: 'fit-content', fontSize: '0.72rem' }}>
          <span className="text-danger animate-pulse">● REC</span>
          <span className="text-white-50 border-start border-secondary ps-2">🔒 Interview Locked</span>
          <span className="text-success border-start border-secondary ps-2">🖥 Fullscreen Active</span>
        </div>
        <button
          onClick={handleTerminateInterview}
          disabled={isTerminating}
          className="btn btn-sm btn-danger px-3 py-1.5 rounded-3 fw-bold d-flex align-items-center gap-1.5 shadow"
          style={{ fontSize: '0.8rem' }}
          title="Terminate and exit mock interview"
        >
          <FiAlertCircle /> {isTerminating ? 'Terminating...' : 'Terminate Interview'}
        </button>
      </div>

      {isInsecureContext && (
        <div className="alert alert-warning border border-warning rounded-3 p-4 mb-4 text-start animate-fade-in shadow-sm">
          <h4 className="fw-bold text-dark d-flex align-items-center gap-2 mb-2" style={{ fontSize: '1rem' }}>
            <FiAlertCircle className="text-warning fs-4" /> 
            Browser Access Required: Secure Context Override
          </h4>
          <p className="small mb-3" style={{ lineHeight: '1.5' }}>
            Your browser treats the connection to this port as insecure, which disables local hardware access (webcam/mic) by default.
            Please follow these simple steps to authorize camera access:
          </p>
          <ol className="small ps-3 mb-0 d-flex flex-column gap-2" style={{ lineHeight: '1.4', fontSize: '0.82rem' }}>
            <li>
              Navigate to the following settings page in your browser:
              <strong className="d-block mt-1 font-monospace bg-light p-1 px-2 rounded border text-dark" style={{ width: 'fit-content' }}>
                edge://flags/#unsafely-treat-insecure-origin-as-secure
              </strong>
              (or <strong className="font-monospace text-dark">chrome://flags/#unsafely-treat-insecure-origin-as-secure</strong> if using Chrome).
            </li>
            <li>
              Locate the <strong>"Insecure origins treated as secure"</strong> setting and toggle it to <strong>Enabled</strong>.
            </li>
            <li>
              Paste your local server address into the input field: <strong className="font-monospace text-dark">http://localhost:5173</strong>
            </li>
            <li>
              Click the <strong>Relaunch</strong> button at the bottom-right of your browser to refresh your site permissions.
            </li>
          </ol>
        </div>
      )}

      {/* Main split video call container */}
      <div className="glass-panel p-0 border border-secondary shadow-lg overflow-hidden position-relative animate-fade-in" style={{ borderRadius: '24px', backgroundColor: '#090d16' }}>
        
        {/* Split Screen Grid */}
        <div className="row g-0 flex-md-row flex-column align-items-stretch" style={{ height: '440px', minHeight: '440px' }}>
          
          {/* Left Half: AI Interviewer */}
          <div className="col-md-6 border-end border-secondary position-relative bg-dark d-flex flex-column align-items-stretch animate-fade-in" style={{ height: '100%', minHeight: '440px' }}>
            <img 
              src={avatarImg} 
              alt="AI Interviewer" 
              className="w-100 h-100 object-fit-cover"
              style={{ filter: isSpeakingQuestion ? 'brightness(1.05) contrast(1.02)' : 'brightness(0.95)' }}
            />
            
            {/* Pulsing overlay frame when AI is speaking */}
            {isSpeakingQuestion && (
              <div 
                className="position-absolute top-0 start-0 end-0 bottom-0 pointer-events-none z-2"
                style={{ 
                  border: '4px solid var(--primary-purple)', 
                  boxShadow: 'inset 0 0 20px rgba(124, 58, 237, 0.4)',
                  pointerEvents: 'none'
                }}
              />
            )}

            {/* AI Avatar metadata labels */}
            <div className="bg-dark bg-opacity-75 border border-secondary px-2.5 py-1 rounded text-white small" style={{ position: 'absolute', bottom: '12px', left: '12px', zIndex: 10, fontSize: '0.74rem' }}>
              🤖 AI Interviewer (Virtual Human)
            </div>

            {/* AI speaking active state waves */}
            {isSpeakingQuestion && (
              <div className="d-flex align-items-end gap-1" style={{ position: 'absolute', bottom: '12px', right: '12px', zIndex: 10, height: '20px' }}>
                <span className="bg-primary animate-audio-bar-1" style={{ width: '3px', height: '100%', backgroundColor: 'var(--primary-purple)' }} />
                <span className="bg-primary animate-audio-bar-2" style={{ width: '3px', height: '80%', backgroundColor: 'var(--primary-purple)' }} />
                <span className="bg-primary animate-audio-bar-3" style={{ width: '3px', height: '60%', backgroundColor: 'var(--primary-purple)' }} />
              </div>
            )}
          </div>

          {/* Right Half: Candidate Webcam Feed */}
          <div className="col-md-6 position-relative bg-dark d-flex flex-column align-items-stretch animate-fade-in" style={{ height: '100%', minHeight: '440px' }}>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-100 h-100 object-fit-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
            <canvas ref={canvasRef} width="320" height="240" className="d-none" />

            {/* Candidate metadata label */}
            <div className="bg-dark bg-opacity-75 border border-secondary px-2.5 py-1 rounded text-white small" style={{ position: 'absolute', bottom: '12px', left: '12px', zIndex: 10, fontSize: '0.74rem' }}>
              👤 You (Candidate) {isRecording ? <span className="text-danger animate-pulse ms-1">● REC</span> : <span className="text-muted ms-1">● STANDBY</span>}
            </div>

            {/* Prohibited Object Detection Proctoring Alert */}
            {prohibitedObjectAlert.active && (
              <div 
                className="bg-danger bg-opacity-95 text-white p-2.5 rounded-3 text-start small border border-danger d-flex align-items-center gap-2 shadow-lg animate-pulse" 
                style={{ position: 'absolute', top: '12px', left: '12px', right: '12px', zIndex: 25, boxShadow: '0 4px 20px rgba(220, 38, 38, 0.6)' }}
              >
                <FiAlertCircle className="fs-4 flex-shrink-0 text-warning" />
                <div>
                  <div className="fw-bold" style={{ fontSize: '0.78rem' }}>⚠️ Proctoring Alert: Prohibited Object Detected</div>
                  <div className="small opacity-90" style={{ fontSize: '0.72rem' }}>
                    <strong className="text-warning">{prohibitedObjectAlert.label}</strong> detected in camera view. Please remove all secondary devices and materials immediately.
                  </div>
                </div>
              </div>
            )}

            {/* Posture alerts / facial cues overlays */}
            {postureWarning && (
              <div 
                className="bg-danger bg-opacity-90 text-white p-2 rounded-3 text-start small border border-danger d-flex align-items-center gap-2 shadow"
                style={{ position: 'absolute', top: prohibitedObjectAlert.active ? '70px' : '12px', left: '12px', right: '12px', zIndex: 20 }}
              >
                <FiAlertCircle className="fs-5 flex-shrink-0" />
                <span>{postureWarning}</span>
              </div>
            )}

            {/* Live behavioral telemetry HUD in candidates view */}
            {isRecording && (
              <div 
                className="p-3 rounded-3 text-start text-white small border border-secondary shadow-lg" 
                style={{ position: 'absolute', bottom: '12px', right: '12px', zIndex: 10, fontSize: '0.74rem', minWidth: '190px', backgroundColor: 'rgba(15, 23, 42, 0.88)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)' }}
              >
                {pipelineStatus === 'LOADING' ? (
                  <div className="text-center text-info py-1">
                    <span className="spinner-border spinner-border-sm me-2" role="status" style={{ width: '0.8rem', height: '0.8rem' }} />
                    Facial analysis initializing...
                  </div>
                ) : pipelineStatus === 'ERROR' ? (
                  <div className="text-center text-danger py-1 fw-bold">
                    Facial analysis unavailable
                  </div>
                ) : (
                  <>
                    <div className="d-flex align-items-center justify-content-between mb-1.5">
                      <span className="text-muted">Face:</span>
                      <span className={`fw-bold ${postureStatus === 'No Face Detected' ? 'text-danger' : 'text-success'}`}>
                        {postureStatus === 'No Face Detected' ? 'Not detected' : 'Detected'}
                      </span>
                    </div>
                    <div className="d-flex align-items-center justify-content-between mb-1.5">
                      <span className="text-muted">Camera Alignment:</span>
                      <span className="fw-bold text-success">
                        {postureStatus === 'No Face Detected' ? 'Not available' : `${cameraFacingScore}%`}
                      </span>
                    </div>
                    <div className="d-flex align-items-center justify-content-between mb-1.5">
                      <span className="text-muted">Eye Contact:</span>
                      <span className="fw-bold text-info">
                        {postureStatus === 'No Face Detected' || eyeContactScore === 'Not available' ? 'Not available' : `${eyeContactScore}%`}
                      </span>
                    </div>
                    <div className="d-flex align-items-center justify-content-between mb-1.5">
                      <span className="text-muted">Expression:</span>
                      <span className="fw-bold text-info">
                        {postureStatus === 'No Face Detected' 
                          ? 'Not available' 
                          : currentEmotion === 'Smile' ? '😊 Confident'
                          : currentEmotion === 'Thinking' ? '🤔 Thinking'
                          : currentEmotion === 'Speaking' ? '🗣️ Speaking'
                          : currentEmotion === 'Confused' ? '🤨 Perplexed'
                          : currentEmotion === 'Frown' ? '😟 Stressed'
                          : currentEmotion === 'Surprise' ? '😲 Surprised'
                          : '😐 Focused'}
                      </span>
                    </div>
                    <div className="d-flex align-items-center justify-content-between">
                      <span className="text-muted">Head:</span>
                      <span className={`fw-bold ${postureStatus === 'Centered' ? 'text-success' : 'text-warning'}`}>
                        {postureStatus}
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Question Subtitle & Timer Bar (Non-overlapping structured card footer) */}
        <div className="p-3.5 p-md-4 border-top border-secondary text-start" style={{ backgroundColor: 'rgba(9, 13, 22, 0.96)' }}>
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
            <div className="d-flex align-items-center gap-2">
              <span className="badge text-uppercase fw-bold px-2.5 py-1" style={{ fontSize: '0.72rem', backgroundColor: 'var(--primary-purple)', color: 'white' }}>
                Question {currentIndex + 1} of {questions.length}
              </span>
              {isSpeakingQuestion ? (
                <span className="badge bg-warning bg-opacity-20 text-warning border border-warning border-opacity-25 px-2.5 py-1 d-inline-flex align-items-center gap-1.5" style={{ fontSize: '0.72rem' }}>
                  <FiVolume2 className="animate-pulse" /> AI is asking the question...
                </span>
              ) : isRecording ? (
                <span className="badge bg-danger bg-opacity-20 text-danger border border-danger border-opacity-25 px-2.5 py-1 d-inline-flex align-items-center gap-1.5" style={{ fontSize: '0.72rem' }}>
                  <span className="text-danger animate-pulse">●</span> Your Turn to Answer
                </span>
              ) : null}
            </div>

            {/* Timer & Action buttons */}
            <div className="d-flex align-items-center gap-2">
              {isSpeakingQuestion ? (
                <button
                  onClick={handleStartAnsweringNow}
                  className="btn btn-sm btn-outline-info rounded-pill px-3 py-1 fw-bold text-white d-inline-flex align-items-center gap-1.5 shadow-sm"
                  style={{ fontSize: '0.76rem' }}
                  title="Skip speech and start recording your answer now"
                >
                  <FiMic /> Start Answering Now
                </button>
              ) : isRecording ? (
                <span className={`badge ${timeLeftSec <= 15 ? 'bg-danger animate-pulse' : 'bg-primary'} fw-bold px-3 py-1.5 d-inline-flex align-items-center gap-1.5 shadow`} style={{ fontSize: '0.84rem' }}>
                  <FiClock /> Time Remaining: {timeLeftSec}s
                </span>
              ) : (
                <span className="badge bg-secondary fw-bold px-2.5 py-1 d-inline-flex align-items-center gap-1" style={{ fontSize: '0.72rem' }}>
                  <FiClock /> 90s Answer Limit
                </span>
              )}
            </div>
          </div>

          {/* Question Text */}
          <p className="text-white fw-bold mb-2 mt-1" style={{ fontSize: '1.04rem', lineHeight: '1.45' }}>
            {currentQuestion?.questionText}
          </p>

          {/* Live speech transcription subtitle preview */}
          {isRecording && liveTranscript && (
            <div className="text-info small fst-italic mb-2 text-truncate" style={{ opacity: 0.92, fontSize: '0.84rem' }}>
              “{liveTranscript}”
            </div>
          )}

          {/* Countdown / Audio Progress Bar */}
          {isRecording ? (
            <div className="progress mt-2 bg-dark border border-secondary" style={{ height: '5px' }}>
              <div 
                className={`progress-bar ${timeLeftSec <= 15 ? 'bg-danger' : 'bg-success'}`}
                style={{ 
                  width: `${(timeLeftSec / 90) * 100}%`,
                  transition: 'width 1s linear'
                }} 
              />
            </div>
          ) : isSpeakingQuestion ? (
            <div className="progress mt-2 bg-dark" style={{ height: '3px' }}>
              <div className="progress-bar progress-bar-striped progress-bar-animated bg-warning" style={{ width: '100%' }} />
            </div>
          ) : null}
        </div>

      </div>

      {/* Zoom-style Floating Control Action Bar */}
      <div className="d-flex justify-content-center align-items-center mt-4">
        <div 
          className="d-flex flex-wrap align-items-center gap-3 bg-dark bg-opacity-90 px-4 py-3 rounded-pill border shadow-lg position-relative z-3"
          style={{ borderColor: 'rgba(255,255,255,0.15)', minWidth: '420px', justifyContent: 'center' }}
        >
          {/* Navigation Controls */}
          <button
            onClick={handlePreviousQuestion}
            disabled={currentIndex === 0 || submitting}
            className="btn btn-outline-light border-secondary rounded-circle p-2.5 d-flex align-items-center justify-content-center"
            style={{ width: '40px', height: '40px' }}
            title="Previous Question"
          >
            ←
          </button>

          {currentIndex < questions.length - 1 ? (
            <button
              onClick={handleNextQuestion}
              disabled={submitting}
              className="btn btn-primary-purple px-4 py-2 rounded-pill fw-bold"
            >
              Next Question <FiArrowRight className="ms-1" />
            </button>
          ) : (
            <button
              onClick={handleSubmitInterview}
              disabled={submitting}
              className="btn btn-success px-4 py-2 rounded-pill fw-bold text-white d-flex align-items-center gap-1.5"
            >
              {submitting ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                  Analyzing...
                </>
              ) : (
                <>
                  Submit Interview <FiCheckCircle />
                </>
              )}
            </button>
          )}

          {/* Telemetry Indicator Pills */}
          <div className="border-start border-secondary ps-3 ms-2 d-none d-sm-flex align-items-center gap-3">
            <span className="text-white-50 small font-monospace" style={{ fontSize: '0.72rem' }}>
              Speed: <strong className="text-white">{speakingSpeedWpm} WPM</strong>
            </span>
            <span className="text-white-50 small font-monospace" style={{ fontSize: '0.72rem' }}>
              Fillers: <strong className="text-danger">{fillerCount}</strong>
            </span>
          </div>
        </div>
      </div>

    </div>
  );
};

export default VideoSessionView;
