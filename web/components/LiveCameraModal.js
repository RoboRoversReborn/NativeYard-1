"use client";

import { useState, useEffect, useRef } from "react";

export default function LiveCameraModal({
  isOpen,
  onClose,
  onCapture,
  title = "Camera Viewfinder",
  subTitle = "Position your camera and snap a photo",
  facingMode = "environment",
}) {
  const [stream, setStream] = useState(null);
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [capturedPreview, setCapturedPreview] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Stop media stream tracks
  const stopTracks = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  // Enumerate video devices (webcams)
  const getCameraDevices = async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter((d) => d.kind === "videoinput");
      setDevices(videoDevices);
      if (videoDevices.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoDevices[0].deviceId);
      }
    } catch (err) {
      console.warn("Could not enumerate camera devices:", err);
    }
  };

  // Start live camera stream
  const startCamera = async (deviceId = null) => {
    stopTracks();
    setErrorMsg("");
    setCapturedBlob(null);
    setCapturedPreview(null);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera API is not supported on this browser.");
      }

      const videoConstraints = deviceId
        ? { deviceId: { exact: deviceId } }
        : { facingMode: { ideal: facingMode }, width: { ideal: 1920 }, height: { ideal: 1080 } };

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false,
      });

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      await getCameraDevices();
    } catch (err) {
      console.error("Camera access error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setErrorMsg("Camera permission was denied. Please allow camera access in your browser settings or upload a file instead.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setErrorMsg("No camera device was detected on your system.");
      } else {
        setErrorMsg(err.message || "Unable to start camera stream.");
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      startCamera(selectedDeviceId);
    } else {
      stopTracks();
      setCapturedBlob(null);
      setCapturedPreview(null);
      setErrorMsg("");
    }
    return () => {
      stopTracks();
    };
  }, [isOpen, selectedDeviceId]);

  // Snap photo from live video frame
  const takeSnapshot = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        setCapturedBlob(blob);
        const previewUrl = URL.createObjectURL(blob);
        setCapturedPreview(previewUrl);
        // Pause live video while reviewing snapshot
        if (videoRef.current) {
          videoRef.current.pause();
        }
      },
      "image/jpeg",
      0.92
    );
  };

  // Retake photo
  const handleRetake = () => {
    setCapturedBlob(null);
    setCapturedPreview(null);
    if (videoRef.current) {
      videoRef.current.play();
    }
  };

  // Confirm photo
  const handleConfirm = () => {
    if (!capturedBlob) return;
    const file = new File([capturedBlob], `camera_capture_${Date.now()}.jpg`, {
      type: "image/jpeg",
    });
    stopTracks();
    onCapture(file);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card camera-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">
            <span>📷</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: "16px", color: "var(--text-main)" }}>
                {title}
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "normal" }}>
                {subTitle}
              </div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close camera">
            ✕
          </button>
        </div>

        {/* Viewfinder Body */}
        <div className="camera-viewfinder-body">
          {errorMsg ? (
            <div className="camera-error-box">
              <span style={{ fontSize: "32px", display: "block", marginBottom: "8px" }}>📷⚠️</span>
              <p style={{ fontWeight: "700", color: "var(--c-invasive-text)", marginBottom: "6px" }}>
                Camera Unavailable
              </p>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: "1.4" }}>
                {errorMsg}
              </p>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => startCamera(selectedDeviceId)}
                style={{ marginTop: "14px" }}
              >
                🔄 Try Again
              </button>
            </div>
          ) : (
            <div className="camera-screen-wrap">
              {/* Live Video Preview */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`camera-video-elem ${capturedPreview ? "hidden" : ""}`}
              />

              {/* Review Snapshot Image */}
              {capturedPreview && (
                <img
                  src={capturedPreview}
                  alt="Captured review"
                  className="camera-snapshot-img"
                />
              )}

              {/* Framing target overlay */}
              {!capturedPreview && (
                <div className="camera-framing-target">
                  <div className="target-corner top-left"></div>
                  <div className="target-corner top-right"></div>
                  <div className="target-corner bottom-left"></div>
                  <div className="target-corner bottom-right"></div>
                  <span className="camera-guide-text">Align plant / yard in frame</span>
                </div>
              )}
            </div>
          )}

          {/* Hidden Canvas for Frame Capture */}
          <canvas ref={canvasRef} style={{ display: "none" }} />
        </div>

        {/* Device Switcher (if multiple cameras available) */}
        {!errorMsg && devices.length > 1 && !capturedPreview && (
          <div className="camera-device-select-row">
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Camera:</span>
            <select
              value={selectedDeviceId}
              onChange={(e) => {
                setSelectedDeviceId(e.target.value);
                startCamera(e.target.value);
              }}
              className="camera-device-select"
            >
              {devices.map((device, idx) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Camera ${idx + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Action Controls Toolbar */}
        {!errorMsg && (
          <div className="camera-controls-bar">
            {capturedPreview ? (
              <div className="camera-review-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleRetake}
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  🔄 Retake
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleConfirm}
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  ✓ Use This Photo
                </button>
              </div>
            ) : (
              <div className="camera-shutter-row">
                <button
                  type="button"
                  className="camera-shutter-btn"
                  onClick={takeSnapshot}
                  title="Capture photo"
                  aria-label="Capture photo"
                >
                  <div className="shutter-inner-ring"></div>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
