import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import '../styles/WebcamRecorder.css';

const WebcamRecorder = forwardRef(({ 
  isRecording, 
  onRecordingStart, 
  onRecordingStop, 
  onVideoBlob,
  sessionActive,
  interviewId,
  showPreview = false
}, ref) => {
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [error, setError] = useState(null);
  const [stream, setStream] = useState(null);
  const [recorder, setRecorder] = useState(null);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const timerIntervalRef = useRef(null);
  // ✅ CRITICAL: Use a ref for chunks (not React state)
  const localChunksRef = useRef([]);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    requestPermissions,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    getPermissionStatus: () => permissionGranted
  }));

  // Upload recording to server
  const uploadRecording = async (blob, interviewId, duration) => {
    console.log('📤 UPLOAD RECORDING - DEBUG:');
    console.log('  - interviewId:', interviewId);
    console.log('  - blob size:', blob?.size);
    console.log('  - duration:', duration);
    
    if (!interviewId) {
      console.error('❌ No interviewId!');
      return null;
    }

    if (!blob || blob.size === 0) {
      console.error('❌ No blob data!');
      return null;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('❌ No token!');
        setIsUploading(false);
        return null;
      }
      
      const formData = new FormData();
      formData.append('recording', blob, `recording-${Date.now()}.webm`);
      formData.append('duration', duration);

      console.log('📤 Sending upload request to:', `http://localhost:5000/api/recordings/upload/${interviewId}`);
      
      const response = await fetch(`http://localhost:5000/api/recordings/upload/${interviewId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      console.log('📊 Response status:', response.status);
      
      const data = await response.json();
      console.log('📊 Response data:', data);
      
      if (response.ok) {
        console.log('✅ Recording uploaded successfully!');
        setUploadProgress(100);
        return data;
      } else {
        console.error('❌ Upload failed:', data);
        return null;
      }
    } catch (error) {
      console.error('❌ Upload error:', error);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  // Request camera and microphone permissions
  const requestPermissions = async () => {
    try {
      setError(null);
      console.log('📷 Requesting camera and microphone permissions...');
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });

      setStream(mediaStream);
      setPermissionGranted(true);
      console.log('✅ Camera and microphone access granted');
      
      if (sessionActive) {
        console.log('🎬 Session active, starting recording...');
        setTimeout(() => startRecording(), 500);
      }
    } catch (err) {
      console.error('❌ Error accessing media devices:', err);
      
      let errorMessage = 'Unable to access camera or microphone. ';
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage += 'Please grant permission in your browser settings.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage += 'No camera or microphone found. Please connect a device.';
      } else if (err.name === 'NotReadableError') {
        errorMessage += 'Camera or microphone is in use by another application.';
      } else if (err.name === 'OverconstrainedError') {
        errorMessage += 'Camera does not meet the required constraints.';
      } else {
        errorMessage += 'Please check your device settings.';
      }
      
      setError(errorMessage);
      setPermissionGranted(false);
    }
  };

  // =============================================
  // START RECORDING - FIXED WITH LOCAL CHUNKS
  // =============================================
  const startRecording = () => {
    if (!stream) {
      console.warn('⚠️ No stream available to start recording');
      return;
    }
    
    // Check if stream has tracks
    const videoTracks = stream.getVideoTracks();
    const audioTracks = stream.getAudioTracks();
    console.log('📹 Video tracks:', videoTracks.length);
    console.log('🎤 Audio tracks:', audioTracks.length);
    
    if (videoTracks.length === 0 && audioTracks.length === 0) {
      console.error('❌ No tracks found in stream!');
      setError('No camera or microphone detected.');
      return;
    }
    
    try {
      // Reset local chunks
      localChunksRef.current = [];
      setRecordedChunks([]);
      
      // Use a simpler MIME type for better compatibility
      const mimeTypes = ['video/webm;codecs=vp8,opus', 'video/webm;codecs=vp9,opus', 'video/webm'];
      let mimeType = mimeTypes[0];
      
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          break;
        }
      }
      
      console.log('📹 Using MIME type:', mimeType);
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType
      });
      
      mediaRecorderRef.current = mediaRecorder;
      
      // ✅ FIX: Use localChunksRef for immediate data capture
      mediaRecorder.ondataavailable = (event) => {
        console.log('📊 Data available event - size:', event.data.size);
        if (event.data.size > 0) {
          // ✅ IMMEDIATE update using ref
          localChunksRef.current.push(event.data);
          console.log('📊 Total chunks captured:', localChunksRef.current.length);
          
          // Also update React state for display (optional)
          setRecordedChunks([...localChunksRef.current]);
        } else {
          console.warn('⚠️ Empty data chunk received');
        }
      };
      
      mediaRecorder.onstart = () => {
        console.log('🎥 Recording started');
        setRecordingTime(0);
        setIsPaused(false);
        onRecordingStart && onRecordingStart();
        
        timerIntervalRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
      };
      
      mediaRecorder.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event);
      };
      
      mediaRecorder.onpause = () => {
        console.log('⏸️ Recording paused');
        setIsPaused(true);
        clearInterval(timerIntervalRef.current);
      };
      
      mediaRecorder.onresume = () => {
        console.log('▶️ Recording resumed');
        setIsPaused(false);
        timerIntervalRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
      };
      
      // ✅ FIX: Use localChunksRef in onstop
      mediaRecorder.onstop = async () => {
        console.log('⏹️ Recording stopped');
        console.log('📊 Total chunks captured:', localChunksRef.current.length);
        clearInterval(timerIntervalRef.current);
        
        const finalDuration = recordingTime;
        
        // Wait a moment for any pending data
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // ✅ Use localChunksRef which has ALL the data
        if (localChunksRef.current.length > 0) {
          const videoBlob = new Blob(localChunksRef.current, { 
            type: 'video/webm' 
          });
          
          console.log('📹 Video blob size:', videoBlob.size, 'bytes');
          
          const videoUrl = URL.createObjectURL(videoBlob);
          onRecordingStop && onRecordingStop(videoUrl, videoBlob);
          onVideoBlob && onVideoBlob(videoBlob);
          
          if (interviewId) {
            console.log('📤 Uploading recording for interview:', interviewId);
            const result = await uploadRecording(videoBlob, interviewId, finalDuration);
            if (result) {
              console.log('✅ Recording saved successfully!');
            } else {
              console.error('❌ Upload failed');
            }
          } else {
            console.warn('⚠️ No interview ID, skipping upload');
          }
        } else {
          console.warn('⚠️ No recorded chunks to upload');
        }
      };
      
      // Request data every second
      mediaRecorder.start(1000);
      setRecorder(mediaRecorder);
      
    } catch (err) {
      console.error('❌ Error starting recording:', err);
      setError('Failed to start recording. Please try again.');
    }
  };

  // Pause recording
  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
    }
  };

  // Resume recording
  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      console.log('⏹️ Stopping recording...');
      console.log('📊 Current recorder state:', mediaRecorderRef.current.state);
      mediaRecorderRef.current.stop();
      clearInterval(timerIntervalRef.current);
    } else {
      console.warn('⚠️ No active recording to stop');
    }
  };

  // Auto-start recording when session becomes active
  useEffect(() => {
    if (sessionActive && permissionGranted && !recorder) {
      console.log('🎬 Auto-starting recording...');
      setTimeout(() => startRecording(), 1000);
    }
  }, [sessionActive, permissionGranted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [stream]);

  // Format time (MM:SS)
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getStatusText = () => {
    if (!permissionGranted) return '📷 Camera & Mic Off';
    if (mediaRecorderRef.current?.state === 'recording') return '🔴 Recording';
    if (mediaRecorderRef.current?.state === 'paused') return '⏸️ Paused';
    if (isUploading) return `📤 Uploading... ${uploadProgress}%`;
    return '✅ Ready';
  };

  return (
    <div className="webcam-recorder hidden-mode">
      {!permissionGranted ? (
        <div className="webcam-permission-required">
          <i className="fas fa-camera"></i>
          <p>Camera & Microphone Required for Recording</p>
          <button 
            className="btn btn-primary"
            onClick={requestPermissions}
          >
            <i className="fas fa-microphone"></i> Enable Camera & Mic
          </button>
          {error && (
            <div className="webcam-error-text">
              <i className="fas fa-exclamation-circle"></i>
              <span>{error}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="recording-status-bar">
          <div className="status-indicator">
            <span className={`status-dot ${permissionGranted ? 'active' : 'inactive'}`}></span>
            <span className="status-text">{getStatusText()}</span>
            {recordingTime > 0 && (
              <span className="recording-timer">⏱️ {formatTime(recordingTime)}</span>
            )}
          </div>
          {showPreview && (
            <video
              ref={videoRef}
              className="webcam-video hidden"
              autoPlay
              muted
              playsInline
            />
          )}
        </div>
      )}
    </div>
  );
});

WebcamRecorder.displayName = 'WebcamRecorder';

export default WebcamRecorder;