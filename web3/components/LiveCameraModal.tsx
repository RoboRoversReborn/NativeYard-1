/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect, useRef } from "react";
import { Camera, X, RefreshCw, Check, AlertCircle } from "lucide-react";

interface LiveCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
  title?: string;
  subTitle?: string;
  facingMode?: "user" | "environment";
}

export function LiveCameraModal({
  isOpen,
  onClose,
  onCapture,
  title = "Camera Viewfinder",
  subTitle = "Position your camera and snap a photo",
  facingMode = "environment",
}: LiveCameraModalProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const stopTracks = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

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

  const startCamera = async (deviceId: string | null = null) => {
    stopTracks();
    setErrorMsg("");
    setCapturedBlob(null);
    setCapturedPreview(null);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera API is not supported in this browser.");
      }

      const videoConstraints: MediaStreamConstraints["video"] = deviceId
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
    } catch (err: any) {
      console.error("Camera access error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setErrorMsg("Camera permission was denied. Please allow camera access in browser permissions or upload an image instead.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setErrorMsg("No camera device was detected on your system.");
      } else {
        setErrorMsg(err.message || "Unable to start camera stream.");
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      startCamera(selectedDeviceId || null);
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

  const takeSnapshot = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        setCapturedBlob(blob);
        const previewUrl = URL.createObjectURL(blob);
        setCapturedPreview(previewUrl);
        if (videoRef.current) {
          videoRef.current.pause();
        }
      },
      "image/jpeg",
      0.92
    );
  };

  const handleRetake = () => {
    setCapturedBlob(null);
    setCapturedPreview(null);
    if (videoRef.current) {
      videoRef.current.play();
    }
  };

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-[1.8rem] border border-[#d5cfbd] bg-[#fbfaf4] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e8e4d5] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-[#163f2c] text-[#d7f27a]">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-[1.15rem] font-semibold text-[#163f2c]">
                {title}
              </h3>
              <p className="text-[0.72rem] text-[#6b7a68]">{subTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full border border-[#d8d3bf] bg-white text-[#5d6b60] hover:bg-[#f3f0e6]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Viewfinder Body */}
        <div className="relative aspect-4/3 w-full overflow-hidden bg-black">
          {errorMsg ? (
            <div className="flex h-full flex-col items-center justify-center p-6 text-center text-white">
              <AlertCircle className="h-10 w-10 text-[#f0a38e]" />
              <p className="mt-3 font-semibold text-white">Camera Unavailable</p>
              <p className="mt-1 max-w-sm text-xs text-[#a9b59e]">{errorMsg}</p>
              <button
                type="button"
                onClick={() => startCamera(selectedDeviceId || null)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-2 text-xs font-bold text-white hover:bg-white/30"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Try Again
              </button>
            </div>
          ) : (
            <div className="relative h-full w-full">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`h-full w-full object-cover ${capturedPreview ? "hidden" : ""}`}
              />

              {capturedPreview && (
                <img
                  src={capturedPreview}
                  alt="Captured snapshot"
                  className="h-full w-full object-cover"
                />
              )}

              {/* Guide Frame Target Overlay */}
              {!capturedPreview && (
                <div className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-dashed border-white/60">
                  <div className="absolute top-2 left-2 rounded-full bg-black/60 px-2.5 py-1 text-[0.68rem] font-bold text-white backdrop-blur-xs">
                    Hold steady & align leaf in frame
                  </div>
                </div>
              )}
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Device Switcher */}
        {!errorMsg && devices.length > 1 && !capturedPreview && (
          <div className="flex items-center justify-between border-t border-[#e8e4d5] bg-[#f7f4e9] px-6 py-2.5 text-xs text-[#5d6b60]">
            <span>Select Camera:</span>
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="rounded-lg border border-[#d8d3bf] bg-white px-3 py-1 text-xs font-medium text-[#163f2c] focus:outline-hidden"
            >
              {devices.map((device, idx) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Camera ${idx + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Controls Toolbar */}
        {!errorMsg && (
          <div className="flex items-center justify-center border-t border-[#e8e4d5] bg-[#fbfaf4] px-6 py-4">
            {capturedPreview ? (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleRetake}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#d8d3bf] bg-white px-5 py-2.5 text-xs font-bold text-[#5d6b60] hover:bg-[#f3f0e6]"
                >
                  <RefreshCw className="h-4 w-4" />
                  Retake Photo
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="btn btn-dark inline-flex items-center gap-1.5 px-6 py-2.5 text-xs"
                >
                  <Check className="h-4 w-4 text-[#d7f27a]" />
                  Use This Photo
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={takeSnapshot}
                className="group relative grid h-16 w-16 place-items-center rounded-full border-4 border-[#163f2c] bg-white shadow-lg transition active:scale-95"
                aria-label="Capture photo"
              >
                <div className="h-11 w-11 rounded-full bg-[#163f2c] transition group-hover:scale-105" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
