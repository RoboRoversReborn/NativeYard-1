"use client";

import { useState, useEffect, useRef } from "react";
import { Camera, RefreshCw, Check, X, AlertTriangle, Video } from "lucide-react";

type CameraModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
  title?: string;
  subTitle?: string;
};

export function CameraModal({
  isOpen,
  onClose,
  onCapture,
  title = "Live Yard Viewfinder",
  subTitle = "Position your camera to capture the garden bed and click shutter",
}: CameraModalProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

  const startCamera = async (deviceId: string = "") => {
    stopTracks();
    setErrorMsg("");
    setCapturedBlob(null);
    setCapturedPreview(null);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera API is not supported on this browser.");
      }

      const videoConstraints: MediaTrackConstraints = deviceId
        ? { deviceId: { exact: deviceId } }
        : { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } };

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
        setErrorMsg("Camera permission was denied. Please allow camera access in your browser settings or upload an image file instead.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setErrorMsg("No camera hardware was detected on your system.");
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
    const file = new File([capturedBlob], `yard_snap_${Date.now()}.jpg`, {
      type: "image/jpeg",
    });
    stopTracks();
    onCapture(file);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-[#ede7d5] bg-[#fbfaf4] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#ede7d5] px-5 py-3.5 bg-white">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#163f2c] text-white">
              <Camera className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-[#163f2c]">{title}</h3>
              <p className="text-xs text-[#8b9182]">{subTitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-[#8b9182] hover:bg-[#ede7d5] hover:text-[#163f2c]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Viewfinder Body */}
        <div className="relative aspect-video w-full bg-black overflow-hidden flex items-center justify-center">
          {errorMsg ? (
            <div className="p-6 text-center text-white max-w-md">
              <AlertTriangle className="h-10 w-10 text-[#b6533d] mx-auto mb-2" />
              <h4 className="font-bold text-sm mb-1">Camera Unavailable</h4>
              <p className="text-xs text-white/70">{errorMsg}</p>
            </div>
          ) : capturedPreview ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={capturedPreview}
              alt="Snapshot preview"
              className="h-full w-full object-contain"
            />
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
              />
              {/* Subtle alignment crosshair */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-48 w-72 rounded-2xl border-2 border-white/30" />
              </div>
            </>
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Footer Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#ede7d5] bg-white px-5 py-3.5">
          {devices.length > 1 && !capturedBlob && (
            <div className="flex items-center gap-2 text-xs text-[#163f2c]">
              <Video className="h-3.5 w-3.5" />
              <select
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                className="rounded-lg border border-[#ede7d5] bg-[#fbfaf4] px-2 py-1 text-xs text-[#163f2c] focus:outline-none"
              >
                {devices.map((device, idx) => (
                  <option key={device.deviceId || idx} value={device.deviceId}>
                    {device.label || `Camera ${idx + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2 ml-auto">
            {capturedPreview ? (
              <>
                <button
                  type="button"
                  onClick={handleRetake}
                  className="btn bg-[#ede7d5] text-[#163f2c] hover:bg-[#e0d8bf]"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Retake Photo
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="btn bg-[#163f2c] text-[#d7f27a] hover:bg-[#1e4d37]"
                >
                  <Check className="h-3.5 w-3.5" />
                  Audit This Photo ↗
                </button>
              </>
            ) : (
              !errorMsg && (
                <button
                  type="button"
                  onClick={takeSnapshot}
                  className="btn bg-[#163f2c] text-[#d7f27a] font-bold px-6 py-2.5 text-sm hover:bg-[#1e4d37] shadow-md"
                >
                  <Camera className="h-4 w-4" />
                  Take Snapshot
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
