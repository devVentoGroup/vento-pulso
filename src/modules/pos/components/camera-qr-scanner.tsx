"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, RefreshCw, VideoOff } from "lucide-react";

type CameraQRScannerProps = {
  active: boolean;
  onDetected: (value: string) => void;
};

type DetectorLike = {
  detect: (input: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>;
};

type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => DetectorLike;
type ImageCaptureLike = {
  grabFrame: () => Promise<ImageBitmap>;
};
type ImageCaptureCtor = new (track: MediaStreamTrack) => ImageCaptureLike;

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorCtor;
    ImageCapture?: ImageCaptureCtor;
  }
}

const SCAN_INTERVAL_MS = 350;

export function CameraQRScanner({ active, onDetected }: CameraQRScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const imageCaptureRef = useRef<ImageCaptureLike | null>(null);
  const timerRef = useRef<number | null>(null);
  const lastValueRef = useRef<string>("");
  const detectorRef = useRef<DetectorLike | null>(null);
  const runningRef = useRef(false);

  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!active) return;

    const Detector = window.BarcodeDetector;
    if (!Detector) {
      detectorRef.current = null;
      setError(
        "Este navegador no soporta deteccion QR por camara. Usa ingreso manual."
      );
      return;
    }

    try {
      detectorRef.current = new Detector({ formats: ["qr_code"] });
      setError(null);
    } catch {
      try {
        detectorRef.current = new Detector();
        setError(null);
      } catch {
        detectorRef.current = null;
        setError(
          "No se pudo inicializar el detector QR. Usa ingreso manual."
        );
      }
    }
  }, [active]);

  useEffect(() => {
    if (!active) {
      stopStream();
      return;
    }

    void startStream();
    return () => stopStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const clearTimer = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const stopStream = () => {
    runningRef.current = false;
    clearTimer();
    setScanning(false);
    setStarting(false);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    imageCaptureRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const scheduleNext = () => {
    if (!runningRef.current) return;
    timerRef.current = window.setTimeout(() => {
      void scanLoop();
    }, SCAN_INTERVAL_MS);
  };

  const detectWithCanvas = async () => {
    if (!videoRef.current || !canvasRef.current || !detectorRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return null;

    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return null;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;

    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(video, 0, 0, w, h);

    const results = await detectorRef.current.detect(canvas);
    return results[0]?.rawValue?.trim() ?? null;
  };

  const detectFrame = async () => {
    if (!detectorRef.current) return null;

    if (videoRef.current && videoRef.current.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      try {
        const fromVideo = await detectorRef.current.detect(videoRef.current);
        const directValue = fromVideo[0]?.rawValue?.trim() ?? null;
        if (directValue) return directValue;
      } catch {
        // continue with other strategies
      }
    }

    if (imageCaptureRef.current) {
      try {
        const bitmap = await imageCaptureRef.current.grabFrame();
        try {
          const results = await detectorRef.current.detect(bitmap);
          return results[0]?.rawValue?.trim() ?? null;
        } finally {
          bitmap.close();
        }
      } catch {
        // fallback to canvas when grabFrame fails
      }
    }

    return detectWithCanvas();
  };

  const scanLoop = async () => {
    if (!runningRef.current) return;

    try {
      const value = await detectFrame();
      if (value && value !== lastValueRef.current) {
        lastValueRef.current = value;
        onDetected(value);
        window.setTimeout(() => {
          lastValueRef.current = "";
        }, 1200);
      }
    } catch {
      // keep scanning
    } finally {
      scheduleNext();
    }
  };

  const startStream = async () => {
    try {
      stopStream();
      setStarting(true);
      setError(null);

      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Tu navegador no permite acceso a camara. Usa ingreso manual.");
        setStarting(false);
        return;
      }

      const preferredConstraints: MediaStreamConstraints = {
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      };

      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia(preferredConstraints);
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
      }

      streamRef.current = stream;
      const videoTrack = stream.getVideoTracks()[0];

      if (videoTrack && window.ImageCapture) {
        try {
          imageCaptureRef.current = new window.ImageCapture(videoTrack);
        } catch {
          imageCaptureRef.current = null;
        }
      }

      if (!videoRef.current) {
        setStarting(false);
        return;
      }

      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      runningRef.current = true;
      setScanning(true);
      setStarting(false);
      void scanLoop();
    } catch (err) {
      console.error("Error iniciando camara:", err);
      setError("No se pudo acceder a la camara. Verifica permisos.");
      setScanning(false);
      setStarting(false);
    }
  };

  if (!active) return null;

  return (
    <div className="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface-2)] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ui-text)]">
          <Camera className="h-4 w-4" />
          Camara activa
        </div>
        <button
          type="button"
          className="ui-btn ui-btn--ghost h-9 px-3 text-sm"
          onClick={() => {
            void startStream();
          }}
        >
          <RefreshCw className="h-4 w-4" />
          Reiniciar
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-[var(--ui-border)] bg-black">
        <video ref={videoRef} className="h-[280px] w-full object-cover" muted playsInline />
      </div>
      <canvas ref={canvasRef} className="hidden" />

      {starting ? <div className="mt-2 ui-body-muted">Iniciando camara...</div> : null}
      {!starting && scanning && !error ? (
        <div className="mt-2 ui-body-muted">Escaneando QR automaticamente...</div>
      ) : null}

      {error ? (
        <div className="mt-2 flex items-center gap-2 text-sm text-[var(--ui-danger)]">
          <VideoOff className="h-4 w-4" />
          {error}
        </div>
      ) : null}
    </div>
  );
}
