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
import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision';

const VideoSessionView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = id || searchParams.get('sessionId') || '';

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Device & Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTimeSec, setRecordingTimeSec] = useState(0);
  const [isSpeakingQuestion, setIsSpeakingQuestion] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isInsecureContext, setIsInsecureContext] = useState(false);
  const pollIntervalRef = useRef(null);

  const [timeLeftSec, setTimeLeftSec] = useState(90);

  const currentIndexRef = useRef(currentIndex);
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  const questionsCountRef = useRef(questions.length);
  useEffect(() => {
    questionsCountRef.current = questions.length;
  }, [questions.length]);

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
  const smoothedSmileRef = useRef(0);
  const smoothedFrownRef = useRef(0);
  const smoothedSurpriseRef = useRef(0);
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
  const [modelLoading, setModelLoading] = useState(false);
  const [modelError, setModelError] = useState(false);
  
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

  const expressionNeutralFramesRef = useRef(0);
  const expressionSmileFramesRef = useRef(0);
  const expressionFrownFramesRef = useRef(0);
  const expressionSurpriseFramesRef = useRef(0);

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
      console.log('[Face Analysis] Starting MediaPipe initialization...');
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
          numFaces: 1 // Simplified for debugging
        });

        console.log('[Face Analysis] FaceLandmarker model loaded');

        if (active) {
          setFaceLandmarker(landmarker);
          setPipelineStatus('READY');
          setModelLoading(false);
          console.log('[Face Analysis] FaceLandmarker ready');
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
      toast.error('Failed to load video interview configurations');
    } finally {
      setLoading(false);
    }
  };

  // Start webcam, microphone, volume meter, and start recording loop
  const initWebcamStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: true
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn('[Video AI] Programmatic video play failed:', playErr);
        }
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
      mediaRecorder.start(1000); // chunk slice every second

      // Realtime non-verbal metrics MediaPipe & Canvas loop
      const canvas = canvasRef.current;
      const ctx = canvas ? canvas.getContext('2d') : null;
      
      const NO_FACE_THRESHOLD_MS = 2000;
      const MULTIPLE_FACES_THRESHOLD_MS = 1500;
      const LOOKING_AWAY_THRESHOLD_MS = 2000;

      const prevFaceCountRef = { current: -1 };

      const processFrame = () => {
        if (!isRecordingRef.current) return;
        
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

          // 5. FACIAL EXPRESSION SIGNALS (Task 12)
          let smileScore = 0;
          let frownScore = 0;
          let surpriseScore = 0;

          if (blendshapes) {
            if (!loggedBlendshapesRef.current) {
              loggedBlendshapesRef.current = true;
              console.log('[MediaPipe Dev] Available Blendshapes:', blendshapes.map(c => c.categoryName).join(', '));
            }

            const getScore = (name) => {
              const found = blendshapes.find(c => c.categoryName === name);
              return found ? found.score : 0;
            };
            
            // Formula aggregates:
            smileScore = (getScore('mouthSmileLeft') + getScore('mouthSmileRight')) / 2;
            frownScore = (getScore('mouthFrownLeft') + getScore('mouthFrownRight') + getScore('browDownLeft') + getScore('browDownRight')) / 4;
            surpriseScore = (getScore('browOuterUpLeft') + getScore('browOuterUpRight') + getScore('jawOpen') + getScore('eyeWideLeft') + getScore('eyeWideRight')) / 5;
          }

          smoothedSmileRef.current = alpha * smileScore + (1 - alpha) * smoothedSmileRef.current;
          smoothedFrownRef.current = alpha * frownScore + (1 - alpha) * smoothedFrownRef.current;
          smoothedSurpriseRef.current = alpha * surpriseScore + (1 - alpha) * smoothedSurpriseRef.current;

          let currentExp = 'Neutral';
          if (smoothedSmileRef.current > 0.22) {
            currentExp = 'Smile';
            expressionSmileFramesRef.current++;
          } else if (smoothedFrownRef.current > 0.20) {
            currentExp = 'Frown';
            expressionFrownFramesRef.current++;
          } else if (smoothedSurpriseRef.current > 0.20) {
            currentExp = 'Surprise';
            expressionSurpriseFramesRef.current++;
          } else {
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
              
              if (currentExp === 'Neutral') qTel.expressionDistribution.neutral++;
              else if (currentExp === 'Smile') qTel.expressionDistribution.smile++;
              else if (currentExp === 'Frown') qTel.expressionDistribution.frown++;
              else if (currentExp === 'Surprise') qTel.expressionDistribution.surprise++;
            }
          }

          // Throttled Expression Debug Logging (Task 16)
          if (shouldLog) {
            console.log('[Expression Debug]', {
              smileScore: Number(smoothedSmileRef.current.toFixed(3)),
              frownScore: Number(smoothedFrownRef.current.toFixed(3)),
              surpriseScore: Number(smoothedSurpriseRef.current.toFixed(3)),
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

      // Set up visibility & focus proctoring listeners
      const handleVisibilityChange = () => {
        if (!isRecordingRef.current) return;
        if (document.visibilityState === 'hidden') {
          tabVisibilityChangesRef.current++;
          tabHiddenStartRef.current = Date.now();
        } else {
          if (tabHiddenStartRef.current) {
            const dur = Date.now() - tabHiddenStartRef.current;
            proctoringEventsRef.current.push({
              type: 'TAB_HIDDEN',
              startedAt: new Date(tabHiddenStartRef.current),
              durationMs: dur
            });
            tabHiddenStartRef.current = null;
          }
        }
      };

      const handleWindowBlur = () => {
        if (!isRecordingRef.current) return;
        windowBlurEventsRef.current++;
        windowBlurStartRef.current = Date.now();
      };

      const handleWindowFocus = () => {
        if (!isRecordingRef.current) return;
        if (windowBlurStartRef.current) {
          const dur = Date.now() - windowBlurStartRef.current;
          proctoringEventsRef.current.push({
            type: 'WINDOW_BLUR',
            startedAt: new Date(windowBlurStartRef.current),
            durationMs: dur
          });
          windowBlurStartRef.current = null;
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
    if (questions.length === 0) return;
    const currentQ = questions[currentIndex];
    
    // Stop recording state first
    stopUserRecording(false);

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeakingQuestion(true);
      const utterance = new SpeechSynthesisUtterance(currentQ.questionText);
      
      utterance.onend = () => {
        setIsSpeakingQuestion(false);
        startUserRecording();
      };
      
      utterance.onerror = (e) => {
        console.error('TTS error:', e);
        setIsSpeakingQuestion(false);
        startUserRecording();
      };

      window.speechSynthesis.speak(utterance);
    } else {
      // Browser fallback if TTS not supported
      startUserRecording();
    }
  };

  // Launch User webcam recorder and STT listener
  const startUserRecording = async () => {
    setLiveTranscript('');
    setEditedTranscript('');
    setRecordingTimeSec(0);
    setTimeLeftSec(90);
    setIsRecording(true);

    const startTime = Date.now();
    setAnswers(prev => prev.map(ans => 
      ans.questionNumber === questions[currentIndex].questionNumber
        ? { ...ans, startTime }
        : ans
    ));

    // Initialize media capture
    await initWebcamStream();

    // Start timer interval
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
        return prev - 1;
      });
    }, 1000);

    // Initialize SpeechRecognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
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
        // restart recognition if recording is still active
        if (isRecordingRef.current) {
          recognition.start();
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
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
    }
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
    }
    if (cleanupTrackingRef.current) {
      cleanupTrackingRef.current();
      cleanupTrackingRef.current = null;
    }

    if (saveAnswer && questions.length > 0) {
      const qNum = questions[currentIndex].questionNumber;
      const endTime = Date.now();
      setAnswers(prev => prev.map(ans => 
        ans.questionNumber === qNum 
          ? { ...ans, endTime, transcriptText: editedTranscript || liveTranscript || 'No verbal answer recorded.' }
          : ans
      ));
    }
  };

  const handleNextQuestion = () => {
    stopUserRecording(true);
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePreviousQuestion = () => {
    stopUserRecording(true);
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  // Speak question automatically on question index navigation change
  useEffect(() => {
    if (questions.length > 0) {
      setTimeout(() => {
        speakCurrentQuestion();
      }, 500);
    }
  }, [currentIndex, questions.length]);

  const cleanupMedia = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
  };

  // Package video recorded chunks, upload, evaluate
  const handleSubmitInterview = async () => {
    stopUserRecording(true);
    cleanupMedia();
    setSubmitting(true);

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
          surprise: facePresentFramesRef.current > 0 ? Math.round((expressionSurpriseFramesRef.current / facePresentFramesRef.current) * 100) : 0
        },
        noFaceEvents: noFaceEventsRef.current,
        multipleFaceEvents: multipleFaceEventsRef.current,
        lookingAwayEvents: lookingAwayEventsRef.current,
        tabVisibilityChanges: tabVisibilityChangesRef.current,
        windowBlurEvents: windowBlurEventsRef.current,
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
          nervous: compiledMetrics.expressionDistribution.frown
        },
        timeline: timelineEvents,
        videoMetrics: compiledMetrics
      };

      toast.info('Generating AI Behavioral & Technical Assessment...');
      const evalRes = await axiosInstance.post('/video/evaluate', finalPayload);
      if (evalRes.data.success) {
        toast.success('Interview evaluation complete!');
        navigate(`/video-interview/report/${sessionId}`);
      }
    } catch (err) {
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
        <div className="row g-0 flex-md-row flex-column align-items-stretch" style={{ minHeight: '520px' }}>
          
          {/* Left Half: AI Interviewer */}
          <div className="col-md-6 border-end border-secondary position-relative bg-dark d-flex flex-column align-items-stretch animate-fade-in" style={{ height: '520px' }}>
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
            <div className="position-absolute bottom-4 start-4 z-3 bg-dark bg-opacity-75 border border-secondary px-2.5 py-1 rounded text-white small" style={{ fontSize: '0.74rem' }}>
              🤖 AI Interviewer (Virtual Human)
            </div>

            {/* AI speaking active state waves */}
            {isSpeakingQuestion && (
              <div className="position-absolute bottom-4 end-4 z-3 d-flex align-items-end gap-1" style={{ height: '20px' }}>
                <span className="bg-primary animate-audio-bar-1" style={{ width: '3px', height: '100%', backgroundColor: 'var(--primary-purple)' }} />
                <span className="bg-primary animate-audio-bar-2" style={{ width: '3px', height: '80%', backgroundColor: 'var(--primary-purple)' }} />
                <span className="bg-primary animate-audio-bar-3" style={{ width: '3px', height: '60%', backgroundColor: 'var(--primary-purple)' }} />
              </div>
            )}
          </div>

          {/* Right Half: Candidate Webcam Feed */}
          <div className="col-md-6 position-relative bg-dark d-flex flex-column align-items-stretch animate-fade-in" style={{ height: '520px' }}>
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
            <div className="position-absolute bottom-4 start-4 z-3 bg-dark bg-opacity-75 border border-secondary px-2.5 py-1 rounded text-white small" style={{ fontSize: '0.74rem' }}>
              👤 You (Candidate) {isRecording ? <span className="text-danger animate-pulse ms-1">● REC</span> : <span className="text-muted ms-1">● STANDBY</span>}
            </div>

            {/* Posture alerts / facial cues overlays */}
            {postureWarning && (
              <div className="position-absolute top-4 start-4 end-4 z-3 bg-danger bg-opacity-90 text-white p-2 rounded-3 text-start small border border-danger d-flex align-items-center gap-2">
                <FiAlertCircle className="fs-5 flex-shrink-0" />
                <span>{postureWarning}</span>
              </div>
            )}

            {/* Live behavioral telemetry HUD in candidates view */}
            {isRecording && (
              <div className="position-absolute bottom-4 end-4 z-3 bg-dark bg-opacity-75 p-3 rounded-3 text-start text-white small border border-secondary" style={{ fontSize: '0.74rem', minWidth: '185px' }}>
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
                        {postureStatus === 'No Face Detected' ? 'Not available' : currentEmotion}
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

        {/* Bottom Banner overlay: Subtitles and Timer */}
        <div className="position-absolute bottom-0 start-0 end-0 bg-black bg-opacity-80 p-4 border-top border-secondary text-start z-3" style={{ backgroundColor: 'rgba(9, 13, 22, 0.9)' }}>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <span className="badge text-uppercase fw-bold px-2.5 py-1" style={{ fontSize: '0.68rem', backgroundColor: 'var(--primary-purple)', color: 'white' }}>
              Question {currentIndex + 1} of {questions.length}
            </span>
            
            {/* Visual Countdown Timer */}
            {isRecording && (
              <span className={`badge ${timeLeftSec <= 15 ? 'bg-danger animate-pulse' : 'bg-secondary'} fw-bold px-2.5 py-1 d-flex align-items-center gap-1.5`}>
                <FiClock /> Time Remaining: {timeLeftSec}s
              </span>
            )}
          </div>
          <p className="text-white fw-semibold mb-0" style={{ fontSize: '1rem', lineHeight: '1.4', minHeight: '44px' }}>
            {isSpeakingQuestion ? 'AI is speaking...' : currentQuestion.questionText}
          </p>

          {/* Progress Countdown Bar */}
          {isRecording && (
            <div className="progress mt-3 bg-secondary" style={{ height: '4px' }}>
              <div 
                className={`progress-bar ${timeLeftSec <= 15 ? 'bg-danger' : 'bg-primary'}`}
                style={{ 
                  width: `${(timeLeftSec / 90) * 100}%`,
                  backgroundColor: timeLeftSec <= 15 ? '' : 'var(--primary-purple)',
                  transition: 'width 1s linear'
                }} 
              />
            </div>
          )}
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
          
          <button
            onClick={speakCurrentQuestion}
            className="btn btn-outline-light border-secondary rounded-circle p-2.5 d-flex align-items-center justify-content-center"
            style={{ width: '40px', height: '40px' }}
            disabled={submitting}
            title="Replay AI Question"
          >
            <FiVolume2 />
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
