import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { FiMic, FiCheckCircle, FiAlertCircle, FiArrowLeft, FiPlay, FiVolume2, FiRefreshCw } from 'react-icons/fi';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';

const VoiceCheck = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionIdParam = searchParams.get('sessionId');

  const [hasMicPermission, setHasMicPermission] = useState(null);
  const [hasSttSupport, setHasSttSupport] = useState(true);
  const [audioLevel, setAudioLevel] = useState(0);
  const [testingMic, setTestingMic] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);

  const [loading, setLoading] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState(sessionIdParam || '');

  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);

  useEffect(() => {
    // Check Web Speech API browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setHasSttSupport(false);
    }
  }, []);

  const requestMicrophoneAccess = async () => {
    setTestingMic(true);
    setAudioLevel(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setHasMicPermission(true);

      // Set up Web Audio API Volume Meter
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateVolume = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        setAudioLevel(normalized);

        if (normalized > 15) {
          setTestSuccess(true);
        }

        animFrameRef.current = requestAnimationFrame(updateVolume);
      };

      updateVolume();
      toast.success('Microphone connected successfully!');
    } catch (err) {
      console.error('Microphone access error:', err);
      setHasMicPermission(false);
      toast.error('Microphone access denied or unreadable. Please check permissions.');
    } finally {
      setTestingMic(false);
    }
  };

  const cleanupAudio = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
  };

  useEffect(() => {
    return () => cleanupAudio();
  }, []);

  const handleStartVoiceInterview = async () => {
    if (!hasMicPermission) {
      toast.warning('Please test and allow microphone access first.');
      return;
    }

    setLoading(true);
    try {
      const response = await axiosInstance.post('/voice/start', {
        sessionId: activeSessionId || undefined,
        role: 'Software Engineer',
        difficulty: 'Medium',
        questionCount: 5
      });

      if (response.data && response.data.success) {
        cleanupAudio();
        const targetId = response.data.session.sessionId || response.data.session._id;
        navigate(`/voice-interview/session/${targetId}`);
      }
    } catch (err) {
      console.error('Error starting voice session:', err);
      toast.error('Failed to initialize voice interview.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5 text-start" style={{ maxWidth: '720px' }}>
      <Link to="/mock-interviews" className="text-muted small text-decoration-none d-flex align-items-center gap-1 mb-3">
        <FiArrowLeft /> Back to Mock Interviews
      </Link>

      <div className="glass-panel p-4 p-md-5 bg-white border shadow-sm rounded-4">
        <div className="text-center mb-4">
          <div className="p-3 rounded-circle d-inline-flex mb-3" style={{ color: 'var(--primary-purple)', backgroundColor: 'var(--primary-purple-light)' }}>
            <FiMic className="display-5" />
          </div>
          <h2 className="fw-bold text-dark mb-1">Microphone & Audio System Check</h2>
          <p className="text-muted small">Verify your microphone and speech-to-text recognition before launching your AI voice interview.</p>
        </div>

        {/* Compatibility Alert */}
        {!hasSttSupport && (
          <div className="alert alert-warning border-0 small mb-4">
            ⚠️ <strong>Browser Speech Notice:</strong> Web Speech API is not fully supported in this browser. We recommend using Google Chrome or Microsoft Edge for optimal real-time transcription.
          </div>
        )}

        {/* Status Checklist Grid */}
        <div className="row g-3 mb-4">
          <div className="col-md-6">
            <div className="border rounded-3 p-3 bg-light d-flex align-items-center justify-content-between">
              <div>
                <strong className="d-block text-dark small">Microphone Access</strong>
                <span className="text-muted small" style={{ fontSize: '0.74rem' }}>
                  {hasMicPermission === true ? 'Granted & Active' : hasMicPermission === false ? 'Denied / Unavailable' : 'Not Tested'}
                </span>
              </div>
              {hasMicPermission === true ? (
                <FiCheckCircle className="text-success fs-4" />
              ) : hasMicPermission === false ? (
                <FiAlertCircle className="text-danger fs-4" />
              ) : (
                <FiMic className="text-muted fs-4" />
              )}
            </div>
          </div>

          <div className="col-md-6">
            <div className="border rounded-3 p-3 bg-light d-flex align-items-center justify-content-between">
              <div>
                <strong className="d-block text-dark small">Speech Recognition (STT)</strong>
                <span className="text-muted small" style={{ fontSize: '0.74rem' }}>
                  {hasSttSupport ? 'Supported by browser' : 'Fallback Manual Mode'}
                </span>
              </div>
              <FiCheckCircle className="text-success fs-4" />
            </div>
          </div>
        </div>

        {/* Live Audio Level Meter */}
        <div className="bg-light p-4 rounded-3 border mb-4 text-center">
          <span className="d-block text-muted small fw-semibold mb-2">Live Audio Volume Level</span>
          <div className="progress mb-2" style={{ height: '14px' }}>
            <div
              className={`progress-bar transition-all ${audioLevel > 60 ? 'bg-danger' : audioLevel > 20 ? 'bg-success' : 'bg-primary-purple'}`}
              style={{ width: `${audioLevel}%`, transition: 'width 0.1s ease-out' }}
            />
          </div>
          <span className="text-muted small" style={{ fontSize: '0.72rem' }}>
            {hasMicPermission ? (audioLevel > 10 ? '🎙️ Speaking detected!' : 'Say something to test volume...') : 'Click Test Microphone below to start'}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="d-flex flex-column flex-sm-row gap-3">
          <button
            onClick={requestMicrophoneAccess}
            disabled={testingMic}
            className="btn btn-outline-primary py-2.5 px-4 flex-grow-1 d-flex align-items-center justify-content-center gap-2"
          >
            <FiVolume2 /> {hasMicPermission ? 'Re-Test Microphone' : 'Test Microphone'}
          </button>

          <button
            onClick={handleStartVoiceInterview}
            disabled={loading || !hasMicPermission}
            className="btn btn-primary-purple text-white py-2.5 px-4 flex-grow-1 d-flex align-items-center justify-content-center gap-2 shadow-sm"
          >
            <FiPlay style={{ fill: 'white' }} />
            <span>{loading ? 'Initializing...' : 'Launch Voice Interview'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceCheck;
