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

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorCtor;
  }
}

export function CameraQRScanner({ active, onDetected }: CameraQRScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastValueRef = useRef<string>("");
  const detectorRef = useRef<DetectorLike | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string>("");
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (!active) return;

    const loadDevices = async () => {
      try {
        const all = await navigator.mediaDevices.enumerateDevices();
        const videos = all.filter((d) => d.kind === "videoinput");
        setDevices(videos);
        if (!deviceId && videos[0]?.deviceId) {
          setDeviceId(videos[0].deviceId);
        }
      } catch {
        // no-op
      }
    };

    void loadDevices();
  }, [active, deviceId]);

  useEffect(() => {
    if (!active) return;

    const Detector = window.BarcodeDetector;
    if (!Detector) {
      setError("Tu navegador no soporta escaneo nativo de QR. Usa el modo manual.");
      return;
    }

    detectorRef.current = new Detector({ formats: ["qr_code"] });
    setError(null);
  }, [active]);

  useEffect(() => {
    if (!active) {
      stopStream();
      return;
    }

    void startStream();

    return () => {
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, deviceId]);

  const stopStream = () => {
    setScanning(false);
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const scanLoop = async () => {
    if (!active || !videoRef.current || !canvasRef.current || !detectorRef.current) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        try {
          const results = await detectorRef.current.detect(canvas);
          const value = results[0]?.rawValue?.trim();
          if (value && value !== lastValueRef.current) {
            lastValueRef.current = value;
            onDetected(value);
            setTimeout(() => {
              lastValueRef.current = "";
            }, 1200);
          }
        } catch {
          // keep scanning
        }
      }
    }

    frameRef.current = requestAnimationFrame(() => {
      void scanLoop();
    });
  };

  const startStream = async () => {
    try {
      stopStream();
      setError(null);

      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : { facingMode: { ideal: "environment" } },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setScanning(true);
      frameRef.current = requestAnimationFrame(() => {
        void scanLoop();
      });
    } catch (err) {
      console.error("Error iniciando camara:", err);
      setError("No se pudo acceder a la camara. Verifica permisos.");
      setScanning(false);
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

      {devices.length > 1 ? (
        <select
          className="ui-input mb-2 h-11"
          value={deviceId}
          onChange={(e) => setDeviceId(e.target.value)}
        >
          {devices.map((d, idx) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label || `Camara ${idx + 1}`}
            </option>
          ))}
        </select>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-[var(--ui-border)] bg-black">
        <video ref={videoRef} className="h-[280px] w-full object-cover" muted playsInline />
      </div>
      <canvas ref={canvasRef} className="hidden" />

      {!scanning && !error ? (
        <div className="mt-2 ui-body-muted">Preparando camara...</div>
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
