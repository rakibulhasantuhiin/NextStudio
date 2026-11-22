import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera,
  Check,
  FlipHorizontal,
  Loader2,
  RefreshCw,
  Timer,
  Upload,
  VideoOff,
  X,
} from 'lucide-react';

interface WebcamCaptureModalProps {
  isOpen: boolean;
  lang: 'en' | 'bn';
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
  onFallbackUpload?: (files: FileList | null) => void;
}

export const WebcamCaptureModal: React.FC<WebcamCaptureModalProps> = ({
  isOpen,
  lang,
  onClose,
  onCapture,
  onFallbackUpload,
}) => {
  const isBn = lang === 'bn';
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fallbackInputRef = useRef<HTMLInputElement | null>(null);

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isStarting, setIsStarting] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isMirrored, setIsMirrored] = useState<boolean>(true);
  const [timerSec, setTimerSec] = useState<0 | 3 | 5>(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [flashActive, setFlashActive] = useState<boolean>(false);
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState<boolean>(true);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(
    async (deviceId?: string) => {
      stopStream();
      setIsStarting(true);
      setCameraError(null);

      if (
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        setIsStarting(false);
        setCameraError(
          isBn
            ? 'এই ব্রাউজারে লাইভ ওয়েবক্যাম সাপোর্ট পাওয়া যায়নি। নিচ থেকে ছবি আপলোড করুন।'
            : 'Live webcam is not supported in this browser. Please upload a photo instead.'
        );
        return;
      }

      try {
        const videoConstraints: MediaTrackConstraints = {
          width: { ideal: 1280 },
          height: { ideal: 960 },
          ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'user' }),
        };

        const stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: false,
        });

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }

        // Enumerate all connected webcams after permission is granted
        try {
          const allDevices = await navigator.mediaDevices.enumerateDevices();
          const videoInputs = allDevices.filter((d) => d.kind === 'videoinput');
          setDevices(videoInputs);
          const activeTrack = stream.getVideoTracks()[0];
          const activeSettings = activeTrack?.getSettings?.();
          if (activeSettings?.deviceId) {
            setSelectedDeviceId(activeSettings.deviceId);
          } else if (videoInputs.length > 0 && !deviceId) {
            setSelectedDeviceId(videoInputs[0].deviceId);
          }
        } catch {
          // ignore device list error
        }
      } catch (err) {
        const name = err instanceof Error ? err.name : '';
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setCameraError(
            isBn
              ? 'ক্যামেরার অনুমতি (Permission) দেওয়া হয়নি। ব্রাউজারের অ্যাড্রেস বার থেকে ক্যামেরা Allow করে পুনরায় চেষ্টা করুন।'
              : 'Camera permission was denied. Please allow webcam access in your browser address bar and retry.'
          );
        } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
          setCameraError(
            isBn
              ? 'কোনো ওয়েবক্যাম বা ক্যামেরা পাওয়া যায়নি। ক্যামেরা সংযুক্ত করে আবার চেষ্টা করুন অথবা ছবি আপলোড করুন।'
              : 'No webcam detected on this device. Connect a camera and retry, or upload a photo.'
          );
        } else {
          setCameraError(
            isBn
              ? 'ক্যামেরা চালু করা যায়নি। অন্য অ্যাপে ক্যামেরা চালু থাকলে বন্ধ করে চেষ্টা করুন।'
              : 'Unable to start camera. Close other apps using the webcam and try again.'
          );
        }
      } finally {
        setIsStarting(false);
      }
    },
    [isBn, stopStream]
  );

  useEffect(() => {
    if (!isOpen) {
      stopStream();
      setCapturedUrl(null);
      setCountdown(null);
      return;
    }
    void startCamera();
    return () => {
      stopStream();
    };
  }, [isOpen, startCamera, stopStream]);

  const snapNow = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return;

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const canvas = document.createElement('canvas');
    canvas.width = vw;
    canvas.height = vh;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    if (isMirrored) {
      ctx.translate(vw, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, vw, vh);
    ctx.restore();

    const dataUrl = canvas.toDataURL('image/jpeg', 0.96);
    setFlashActive(true);
    window.setTimeout(() => setFlashActive(false), 180);
    setCapturedUrl(dataUrl);
  }, [isMirrored]);

  const triggerCapture = useCallback(() => {
    if (isStarting || cameraError || capturedUrl || countdown !== null) return;
    if (timerSec === 0) {
      snapNow();
      return;
    }
    setCountdown(timerSec);
  }, [cameraError, capturedUrl, countdown, isStarting, snapNow, timerSec]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      setCountdown(null);
      snapNow();
      return;
    }
    const id = window.setTimeout(() => setCountdown((c) => (c !== null ? c - 1 : null)), 1000);
    return () => window.clearTimeout(id);
  }, [countdown, snapNow]);

  // Spacebar shortcut to snap photo
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        stopStream();
        onClose();
      } else if (e.code === 'Space' && !capturedUrl && !cameraError && !isStarting) {
        e.preventDefault();
        triggerCapture();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [cameraError, capturedUrl, isOpen, isStarting, onClose, stopStream, triggerCapture]);

  if (!isOpen) return null;

  const handleConfirmCapture = () => {
    if (!capturedUrl) return;
    const url = capturedUrl;
    stopStream();
    setCapturedUrl(null);
    onCapture(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-3xl glass-modal rounded-2xl flex flex-col max-h-[95vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-slate-200/60 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <Camera className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate">
                {isBn ? 'লাইভ ওয়েবক্যাম পাসপোর্ট ক্যামেরা' : 'Live Webcam Passport Camera'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {isBn
                  ? 'মাথা ও কাঁধ সোজা রেখে ছবি তুলুন — সাথে সাথেই অটো পাসপোর্ট স্টুডিওতে প্রসেস হবে'
                  : 'Keep your head & shoulders straight inside the guide — auto-processes immediately after snap'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              stopStream();
              onClose();
            }}
            className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/10 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Stage */}
        <div className="relative bg-slate-950 flex-1 min-h-[300px] sm:min-h-[420px] flex items-center justify-center overflow-hidden select-none">
          {/* Live Video */}
          <video
            ref={videoRef}
            playsInline
            muted
            className={`w-full h-full max-h-[58vh] object-contain transition-transform ${
              isMirrored ? '-scale-x-100' : ''
            } ${capturedUrl || cameraError ? 'hidden' : 'block'}`}
          />

          {/* Captured Preview */}
          {capturedUrl && (
            <img
              src={capturedUrl}
              alt="Captured"
              className="w-full h-full max-h-[58vh] object-contain"
            />
          )}

          {/* Passport Head & Shoulders Alignment Guide Overlay */}
          {!capturedUrl && !cameraError && !isStarting && showGuide && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <svg
                viewBox="0 0 350 450"
                className="h-[88%] max-w-[90%] w-auto drop-shadow-[0_2px_10px_rgba(0,0,0,0.65)]"
                fill="none"
              >
                {/* Passport 35x45 outer frame */}
                <rect
                  x="16"
                  y="14"
                  width="318"
                  height="422"
                  rx="14"
                  stroke="rgba(59,130,246,0.9)"
                  strokeWidth="2.5"
                  strokeDasharray="10 6"
                />
                {/* Head oval guide */}
                <ellipse
                  cx="175"
                  cy="178"
                  rx="76"
                  ry="98"
                  stroke="rgba(255,255,255,0.88)"
                  strokeWidth="2.5"
                />
                {/* Eye-level horizontal line */}
                <line
                  x1="78"
                  y1="170"
                  x2="272"
                  y2="170"
                  stroke="rgba(96,165,250,0.85)"
                  strokeWidth="1.5"
                  strokeDasharray="5 5"
                />
                {/* Center vertical symmetry axis */}
                <line
                  x1="175"
                  y1="44"
                  x2="175"
                  y2="385"
                  stroke="rgba(255,255,255,0.38)"
                  strokeWidth="1.2"
                  strokeDasharray="4 5"
                />
                {/* Balanced shoulders curve */}
                <path
                  d="M42 418 C52 345, 108 318, 175 318 C242 318, 298 345, 308 418"
                  stroke="rgba(255,255,255,0.8)"
                  strokeWidth="2.2"
                  strokeDasharray="7 5"
                />
              </svg>

              <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-slate-900/75 border border-white/15 text-[11px] font-bold text-white whitespace-nowrap backdrop-blur-sm">
                {isBn
                  ? 'মুখ ওভালের ভেতরে এবং কাঁধ সোজা রাখুন'
                  : 'Align face inside oval & keep shoulders level'}
              </div>
            </div>
          )}

          {/* Starting Loader */}
          {isStarting && !cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 text-white bg-slate-950/85">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
              <span className="text-xs font-bold">
                {isBn ? 'ওয়েবক্যাম চালু হচ্ছে...' : 'Detecting & starting webcam...'}
              </span>
            </div>
          )}

          {/* Countdown Pulse */}
          {countdown !== null && countdown > 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/35 pointer-events-none">
              <div className="w-24 h-24 rounded-full bg-blue-600/90 border-4 border-white/80 text-white text-5xl font-black flex items-center justify-center shadow-2xl animate-pulse">
                {countdown}
              </div>
            </div>
          )}

          {/* Shutter Flash */}
          {flashActive && <div className="absolute inset-0 bg-white/90 pointer-events-none" />}

          {/* Camera Error / Permission Denied Fallback */}
          {cameraError && (
            <div className="p-6 max-w-md text-center space-y-4 text-white">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-red-500/15 border border-red-400/30 text-red-400 flex items-center justify-center">
                <VideoOff className="w-7 h-7" />
              </div>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
                {cameraError}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={() => void startCamera(selectedDeviceId || undefined)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{isBn ? 'আবার চেষ্টা করুন' : 'Retry Webcam'}</span>
                </button>
                {onFallbackUpload && (
                  <>
                    <input
                      ref={fallbackInputRef}
                      type="file"
                      accept="image/*"
                      capture="user"
                      className="hidden"
                      onChange={(e) => {
                        onFallbackUpload(e.target.files);
                        e.target.value = '';
                        onClose();
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => fallbackInputRef.current?.click()}
                      className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isBn ? 'ফাইল থেকে বাছাই করুন' : 'Choose File Instead'}</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Controls Bar */}
        <div className="px-4 sm:px-5 py-3.5 border-t border-slate-200/60 dark:border-white/10 bg-white/60 dark:bg-slate-900/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          {!capturedUrl ? (
            <>
              {/* Left: Webcam Selector + Mirror + Timer + Guide */}
              <div className="flex flex-wrap items-center gap-2">
                {devices.length > 1 && (
                  <select
                    value={selectedDeviceId}
                    onChange={(e) => {
                      setSelectedDeviceId(e.target.value);
                      void startCamera(e.target.value);
                    }}
                    className="glass-input px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-900 dark:text-white max-w-[180px] truncate cursor-pointer"
                  >
                    {devices.map((d, idx) => (
                      <option key={d.deviceId} value={d.deviceId} className="text-slate-900">
                        {d.label || `${isBn ? 'ক্যামেরা' : 'Camera'} ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                )}

                <button
                  type="button"
                  onClick={() => setIsMirrored((m) => !m)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition ${
                    isMirrored
                      ? 'bg-blue-600/15 text-blue-700 dark:text-blue-300 border border-blue-500/40'
                      : 'glass-tile text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <FlipHorizontal className="w-3.5 h-3.5" />
                  <span>{isBn ? 'মিরর' : 'Mirror'}</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setTimerSec((t) => (t === 0 ? 3 : t === 3 ? 5 : 0))
                  }
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition ${
                    timerSec > 0
                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/40'
                      : 'glass-tile text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <Timer className="w-3.5 h-3.5" />
                  <span>
                    {timerSec === 0
                      ? isBn
                        ? 'সাথে সাথে'
                        : 'Instant'
                      : `${timerSec}s`}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowGuide((g) => !g)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition ${
                    showGuide
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40'
                      : 'glass-tile text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {isBn ? 'গাইড লাইন' : 'Face Guide'}
                </button>
              </div>

              {/* Right: Capture Shutter Button */}
              <button
                type="button"
                disabled={isStarting || Boolean(cameraError) || countdown !== null}
                onClick={triggerCapture}
                className="glass-btn-primary px-6 py-2.5 rounded-xl text-white text-sm font-extrabold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-45"
              >
                <Camera className="w-4 h-4" />
                <span>
                  {countdown !== null
                    ? `${countdown}...`
                    : isBn
                    ? 'ছবি তুলুন (Space)'
                    : 'Snap Photo (Space)'}
                </span>
              </button>
            </>
          ) : (
            <div className="w-full flex flex-wrap items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={() => setCapturedUrl(null)}
                className="glass-tile px-4 py-2.5 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{isBn ? 'আবার তুলুন' : 'Retake Photo'}</span>
              </button>

              <button
                type="button"
                onClick={handleConfirmCapture}
                className="glass-btn-emerald px-6 py-2.5 rounded-xl text-white text-sm font-extrabold inline-flex items-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>
                  {isBn
                    ? 'অটো পাসপোর্ট তৈরি করুন →'
                    : 'Auto-Process Passport Photo →'}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
