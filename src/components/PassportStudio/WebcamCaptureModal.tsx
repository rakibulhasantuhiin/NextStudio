import React, { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
  lang: 'bn' | 'en';
}

export const WebcamCaptureModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onCapture,
  lang,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
      return;
    }

    let active = true;
    setErrorMsg(null);

    navigator.mediaDevices
      .getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false,
      })
      .then((mediaStream) => {
        if (!active) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      })
      .catch((err) => {
        if (!active) return;
        console.error('Webcam access error:', err);
        setErrorMsg(
          lang === 'bn'
            ? 'ওয়েবক্যাম চালু করা যায়নি। ক্যামেরা পারমিশন চেক করুন।'
            : 'Could not access webcam. Please check camera permissions.'
        );
      });

    return () => {
      active = false;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen]);

  const handleSnap = () => {
    if (!videoRef.current || !canvasRef.current || isCapturing) return;
    setIsCapturing(true);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context unavailable.');

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          setIsCapturing(false);
          if (!blob) return;
          const file = new File([blob], `webcam-snap-${Date.now()}.jpg`, {
            type: 'image/jpeg',
          });
          onCapture(file);
          onClose();
        },
        'image/jpeg',
        0.95
      );
    } catch (err) {
      setIsCapturing(false);
      console.error('Snapshot error:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-4 overflow-y-auto studio-modal-backdrop">
      <div className="w-full max-w-xl glass-modal rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-white/20 dark:border-white/10 studio-modal-enter">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/60 dark:border-white/10 bg-white/40 dark:bg-slate-900/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/30">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                {lang === 'bn' ? 'ওয়েবক্যাম থেকে ছবি তুলুন' : 'Capture from Webcam'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {lang === 'bn'
                  ? 'সামনে দাঁড়িয়ে পাসপোর্ট সাইজের ছবি ক্যাপচার করুন'
                  : 'Position yourself clearly and snap a portrait'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Viewport */}
        <div className="relative bg-black flex items-center justify-center aspect-[4/3] sm:aspect-[16/10] overflow-hidden">
          {errorMsg ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-white bg-slate-900">
              <p className="text-sm font-semibold text-red-400 mb-2">{errorMsg}</p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                {lang === 'bn' ? 'বন্ধ করুন' : 'Close'}
              </button>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover -scale-x-100"
            />
          )}

          {/* Guide Overlay for Passport Positioning */}
          {!errorMsg && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
              <div className="w-48 h-64 sm:w-56 sm:h-72 border-2 border-dashed border-white/60 rounded-full shadow-[0_0_30px_rgba(0,0,0,0.5)] flex items-center justify-center opacity-75">
                <span className="text-[10px] text-white/80 bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-xs">
                  {lang === 'bn' ? 'মুখ এখানে রাখুন' : 'Align face here'}
                </span>
              </div>
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 flex items-center justify-between gap-3 bg-white/40 dark:bg-slate-900/40 border-t border-slate-200/60 dark:border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/10 transition cursor-pointer"
          >
            {lang === 'bn' ? 'বাতিল' : 'Cancel'}
          </button>

          <button
            type="button"
            disabled={Boolean(errorMsg) || isCapturing}
            onClick={handleSnap}
            className="py-3 px-6 rounded-2xl glass-btn-primary text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-blue-600/30 transition active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {isCapturing ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Camera className="w-5 h-5" />
            )}
            <span>{lang === 'bn' ? 'ছবি তুলুন (Snap)' : 'Take Snapshot'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
