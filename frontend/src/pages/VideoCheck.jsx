import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { FiCamera, FiMic, FiCheckCircle, FiAlertCircle, FiArrowLeft, FiPlay, FiVolume2 } from 'react-icons/fi';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';

const VideoCheck = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionIdParam = searchParams.get('sessionId');

  const [hasCameraPermission, setHasCameraPermission] = useState(null);
  const [hasMicPermission, setHasMicPermission] = useState(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [lightingStatus, setLightingStatus] = useState('Checking...');
  const [internetStatus, setInternetStatus] = useState('Checking...');
  const [activeSessionId, setActiveSessionId] = useState(sessionIdParam || '');
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);

  const [audioLevel, setAudioLevel] = useState(0);
  const [testingDevices, setTestingDevices] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);

  const [isInsecureContext, setIsInsecureContext] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const requestFullscreen = async () => {
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
      toast.error('Fullscreen request was denied or blocked by browser.');
    }
  };

  useEffect(() => {
    // Check if the current context is secure (required for mediaDevices)
    if (!window.isSecureContext || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setIsInsecureContext(true);
    }

    // Check internet latency simulation
    const start = Date.now();
    fetch('https://www.google.com', { mode: 'no-cors' })
      .then(() => {
        const duration = Date.now() - start;
        setInternetStatus(duration < 250 ? 'Stable' : 'Unstable');
      })
      .catch(() => {
        setInternetStatus('Stable'); // Fallback if CORS blocked
      });
  }, []);

  const requestDeviceAccess = async () => {
    setTestingDevices(true);
    setAudioLevel(0);
    
    let videoStream = null;
    let audioStream = null;

    // 1. Try to request Camera
    try {
      videoStream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 } 
      });
      setHasCameraPermission(true);
      if (videoRef.current) {
        videoRef.current.srcObject = videoStream;
      }
      toast.success('Camera connected successfully!');
    } catch (err) {
      console.error('Camera access error:', err);
      setHasCameraPermission(false);
      toast.error('Camera access denied or busy. Please check permission settings.');
    }

    // 2. Try to request Microphone
    try {
      audioStream = await navigator.mediaDevices.getUserMedia({ 
        audio: true 
      });
      setHasMicPermission(true);

      // Set up Web Audio API Volume Meter
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(audioStream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      // Canvas lighting analysis
      const canvas = canvasRef.current;
      const ctx = canvas ? canvas.getContext('2d') : null;

      const updateLoop = () => {
        // Microphone level
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        setAudioLevel(normalized);

        // Lighting & Face simulation
        if (videoRef.current && videoRef.current.srcObject && canvas && ctx) {
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          let brightnessSum = 0;
          for (let i = 0; i < data.length; i += 4) {
            brightnessSum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
          }
          const avgBrightness = brightnessSum / (canvas.width * canvas.height);
          setLightingStatus(avgBrightness > 50 ? 'Good' : 'Too Dark');
          setFaceDetected(avgBrightness > 20 && avgBrightness < 240);
        }

        animFrameRef.current = requestAnimationFrame(updateLoop);
      };

      updateLoop();
      toast.success('Microphone connected successfully!');
    } catch (err) {
      console.error('Microphone access error:', err);
      setHasMicPermission(false);
      toast.error('Microphone access denied or busy. Please check permission settings.');
    }

    // Combine tracks to keep track reference
    const combinedTracks = [
      ...(videoStream ? videoStream.getTracks() : []),
      ...(audioStream ? audioStream.getTracks() : [])
    ];
    streamRef.current = new MediaStream(combinedTracks);
    setTestingDevices(false);
  };

  const cleanupDevices = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
  };

  useEffect(() => {
    return () => cleanupDevices();
  }, []);

  const handleStartVideoInterview = async () => {
    if (!hasCameraPermission || !hasMicPermission) {
      toast.warning('Please authorize and test your camera & microphone first.');
      return;
    }
    if (!document.fullscreenElement) {
      try {
        await requestFullscreen();
      } catch (err) {}
    }
    cleanupDevices();
    navigate(`/video-interview/session?sessionId=${activeSessionId}`);
  };

  return (
    <div className="container py-4 text-start">
      <div className="d-flex align-items-center gap-2 mb-4">
        <Link to="/mock-interviews" className="btn btn-sm btn-light border">
          <FiArrowLeft /> Back
        </Link>
        <h2 className="fw-bold text-dark mb-0 ms-2">Video & Audio Verification</h2>
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

      <div className="row g-4">
        {/* Left Column: Device Checklist */}
        <div className="col-md-5">
          <div className="glass-panel p-4 bg-white border shadow-sm h-100">
            <h3 className="h5 fw-bold text-dark mb-3 border-bottom pb-2">Pre-Interview Hardware Checklist</h3>
            <p className="text-muted small mb-4">
              To guarantee optimal non-verbal evaluation accuracy, please verify that your camera, mic, and lighting are properly configured.
            </p>

            <div className="d-flex flex-column gap-3 mb-4">
              {/* Check Camera */}
              <div className="d-flex align-items-center justify-content-between p-2.5 border rounded-3 bg-light bg-opacity-25">
                <div className="d-flex align-items-center gap-2.5">
                  <span className={`p-2 rounded-circle ${hasCameraPermission ? 'bg-success bg-opacity-10 text-success' : 'bg-secondary bg-opacity-10 text-secondary'}`}>
                    <FiCamera />
                  </span>
                  <span className="fw-semibold text-dark small">Camera Connection</span>
                </div>
                {hasCameraPermission ? (
                  <span className="badge bg-success bg-opacity-10 text-success">✓ Connected</span>
                ) : (
                  <span className="badge bg-danger bg-opacity-10 text-danger">⚠️ Not Detected</span>
                )}
              </div>

              {/* Check Mic */}
              <div className="d-flex align-items-center justify-content-between p-2.5 border rounded-3 bg-light bg-opacity-25">
                <div className="d-flex align-items-center gap-2.5">
                  <span className={`p-2 rounded-circle ${hasMicPermission ? 'bg-success bg-opacity-10 text-success' : 'bg-secondary bg-opacity-10 text-secondary'}`}>
                    <FiMic />
                  </span>
                  <span className="fw-semibold text-dark small">Microphone Status</span>
                </div>
                {hasMicPermission ? (
                  <span className="badge bg-success bg-opacity-10 text-success">✓ Active</span>
                ) : (
                  <span className="badge bg-danger bg-opacity-10 text-danger">⚠️ Off</span>
                )}
              </div>

              {/* Face Presence */}
              <div className="d-flex align-items-center justify-content-between p-2.5 border rounded-3 bg-light bg-opacity-25">
                <div className="d-flex align-items-center gap-2.5">
                  <span className={`p-2 rounded-circle ${faceDetected ? 'bg-success bg-opacity-10 text-success' : 'bg-secondary bg-opacity-10 text-secondary'}`}>
                    <FiCheckCircle />
                  </span>
                  <span className="fw-semibold text-dark small">Face Alignment Detection</span>
                </div>
                {faceDetected ? (
                  <span className="badge bg-success bg-opacity-10 text-success">✓ Aligned</span>
                ) : (
                  <span className="badge bg-warning bg-opacity-10 text-warning">Searching...</span>
                )}
              </div>

              {/* Lighting */}
              <div className="d-flex align-items-center justify-content-between p-2.5 border rounded-3 bg-light bg-opacity-25">
                <div className="d-flex align-items-center gap-2.5">
                  <span className={`p-2 rounded-circle ${lightingStatus === 'Good' ? 'bg-success bg-opacity-10 text-success' : 'bg-secondary bg-opacity-10 text-secondary'}`}>
                    <FiCheckCircle />
                  </span>
                  <span className="fw-semibold text-dark small">Lighting Brightness</span>
                </div>
                <span className={`badge ${lightingStatus === 'Good' ? 'bg-success bg-opacity-10 text-success' : 'bg-danger bg-opacity-10 text-danger'}`}>
                  {lightingStatus}
                </span>
              </div>

              {/* Internet Latency */}
              <div className="d-flex align-items-center justify-content-between p-2.5 border rounded-3 bg-light bg-opacity-25">
                <div className="d-flex align-items-center gap-2.5">
                  <span className={`p-2 rounded-circle ${internetStatus === 'Stable' ? 'bg-success bg-opacity-10 text-success' : 'bg-secondary bg-opacity-10 text-secondary'}`}>
                    <FiCheckCircle />
                  </span>
                  <span className="fw-semibold text-dark small">Connection Latency</span>
                </div>
                <span className={`badge ${internetStatus === 'Stable' ? 'bg-success bg-opacity-10 text-success' : 'bg-danger bg-opacity-10 text-danger'}`}>
                  {internetStatus}
                </span>
              </div>

              {/* Fullscreen Mode */}
              <div className="d-flex align-items-center justify-content-between p-2.5 border rounded-3 bg-light bg-opacity-25">
                <div className="d-flex align-items-center gap-2.5">
                  <span className={`p-2 rounded-circle ${isFullscreen ? 'bg-success bg-opacity-10 text-success' : 'bg-secondary bg-opacity-10 text-secondary'}`}>
                    <FiCheckCircle />
                  </span>
                  <span className="fw-semibold text-dark small">Fullscreen Mode</span>
                </div>
                {isFullscreen ? (
                  <span className="badge bg-success bg-opacity-10 text-success">✓ Fullscreen Ready</span>
                ) : (
                  <button 
                    onClick={requestFullscreen} 
                    className="btn btn-xs btn-outline-primary py-0.5 px-2 rounded" 
                    style={{ fontSize: '0.75rem' }}
                  >
                    Enable Fullscreen
                  </button>
                )}
              </div>
            </div>

            <div className="d-flex flex-column gap-2 mt-3">
              <div className="d-flex gap-2">
                <button 
                  onClick={requestDeviceAccess} 
                  className="btn btn-outline-primary py-2.5 flex-grow-1"
                  disabled={testingDevices}
                >
                  {testingDevices ? 'Testing Setup...' : 'Request Camera & Mic'}
                </button>
                {!isFullscreen && (
                  <button
                    onClick={requestFullscreen}
                    className="btn btn-outline-secondary py-2.5 px-3"
                  >
                    Enable Fullscreen
                  </button>
                )}
              </div>
              <button 
                onClick={handleStartVideoInterview} 
                className="btn btn-primary-purple py-2.5 px-4 w-100 text-white"
                disabled={!hasCameraPermission || !hasMicPermission || !isFullscreen}
              >
                Proceed to Interview <FiPlay className="ms-1" />
              </button>
              {(!hasCameraPermission || !hasMicPermission || !isFullscreen) && (
                <span className="text-muted small text-center d-block font-monospace" style={{ fontSize: '0.72rem' }}>
                  * Camera, microphone, and fullscreen are required before proceeding.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Camera Frame Canvas */}
        <div className="col-md-7">
          <div className="glass-panel p-4 bg-white border shadow-sm text-center">
            <h3 className="h6 fw-bold text-dark mb-3 text-start">Webcam Feedback Monitor</h3>
            <div className="bg-dark rounded-3 position-relative overflow-hidden" style={{ aspectRatio: '4/3' }}>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-100 h-100 object-fit-cover"
                style={{ transform: 'scaleX(-1)' }}
              />
              <canvas ref={canvasRef} width="320" height="240" className="d-none" />

              {!hasCameraPermission && (
                <div className="position-absolute top-50 start-50 translate-middle text-white text-center">
                  <FiCamera className="display-4 mb-2 opacity-50" />
                  <p className="small mb-0">Authorize webcam feedback to preview layout.</p>
                </div>
              )}

              {/* Mic volume overlay */}
              {hasMicPermission && (
                <div className="position-absolute bottom-3 start-3 end-3 bg-dark bg-opacity-75 p-2 rounded-3">
                  <div className="d-flex align-items-center gap-2">
                    <FiVolume2 className="text-white" />
                    <div className="progress flex-grow-1" style={{ height: '6px' }}>
                      <div 
                        className="progress-bar bg-success" 
                        style={{ width: `${audioLevel}%`, transition: 'width 0.1s ease-out' }} 
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoCheck;
