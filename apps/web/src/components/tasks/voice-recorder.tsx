"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, Square, Trash2, Play, Pause } from "lucide-react";

// ── Voice Recorder ──

interface RecorderProps {
  onRecorded: (blob: Blob) => void;
  disabled?: boolean;
}

export function VoiceRecorder({ onRecorded, disabled }: RecorderProps) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });

      chunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;
      startTimeRef.current = Date.now();

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        onRecorded(blob);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start(100); // collect data every 100ms for better chunks
      setRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((prev) => prev + 1), 1000);
    } catch {
      // Permission denied or no mic
    }
  }, [onRecorded]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  if (recording) {
    return (
      <button
        type="button"
        onClick={stopRecording}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
        </span>
        {fmt(elapsed)}
        <Square className="h-3 w-3 fill-current" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={startRecording}
      disabled={disabled}
      title="Enregistrer un message vocal"
      className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-medium bg-[var(--surface-low)] hover:bg-[var(--surface-high)] transition-colors text-[var(--muted-foreground)] hover:text-[var(--primary)] disabled:opacity-50"
    >
      <Mic className="h-3.5 w-3.5" />
      Vocal
    </button>
  );
}

// ── Voice Player ──

interface PlayerProps {
  src: string;
  compact?: boolean;
  onRemove?: () => void;
}

export function VoicePlayer({ src, compact, onRemove }: PlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const rafRef = useRef<number>(0);

  // Create and manage audio element imperatively to avoid React lifecycle issues
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "auto";
    audio.src = src;
    audioRef.current = audio;

    const onLoadedData = () => {
      // WebM files often report Infinity duration - try to fix it
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const onDurationChange = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const onEnded = () => {
      setPlaying(false);
      setCurrentTime(0);
      audio.currentTime = 0;
      cancelAnimationFrame(rafRef.current);
    };

    const onError = () => {
      setPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("loadeddata", onLoadedData);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    return () => {
      audio.pause();
      audio.removeAttribute("src");
      audio.load(); // release resources
      audio.removeEventListener("loadeddata", onLoadedData);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      cancelAnimationFrame(rafRef.current);
      audioRef.current = null;
      setPlaying(false);
      setCurrentTime(0);
      setDuration(0);
    };
  }, [src]);

  // Use requestAnimationFrame for smooth progress tracking
  useEffect(() => {
    if (!playing) {
      cancelAnimationFrame(rafRef.current);
      return;
    }

    const tick = () => {
      const audio = audioRef.current;
      if (!audio) return;

      setCurrentTime(audio.currentTime);

      // Fallback: if duration is still unknown, detect end by checking if audio paused itself
      if (audio.paused && playing) {
        setPlaying(false);
        setCurrentTime(0);
        audio.currentTime = 0;
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().then(() => {
        setPlaying(true);
      }).catch(() => {
        // Autoplay blocked or audio error
        setPlaying(false);
      });
    }
  };

  const fmt = (s: number) => {
    if (!isFinite(s) || isNaN(s) || s < 0) return "0:00";
    return `${Math.floor(s / 60)}:${String(Math.floor(s) % 60).padStart(2, "0")}`;
  };

  const progress = duration > 0 && isFinite(duration) ? Math.min((currentTime / duration) * 100, 100) : 0;

  if (compact) {
    return (
      <button
        onClick={togglePlay}
        className="flex items-center gap-1 text-[11px] font-medium text-[var(--primary)]"
        title="Ecouter le vocal"
      >
        {playing ? <Pause className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
        {playing ? fmt(currentTime) : fmt(duration)}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--surface-low)]">
      <button
        type="button"
        onClick={togglePlay}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full gradient-primary text-white transition-all hover:shadow-md"
      >
        {playing ? (
          <Pause className="h-3.5 w-3.5" />
        ) : (
          <Play className="h-3.5 w-3.5 ml-0.5" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-[var(--surface-high)] overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--primary)] transition-[width] duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[10px] font-medium text-[var(--muted-foreground)] tabular-nums shrink-0">
            {playing ? fmt(currentTime) : fmt(duration)}
          </span>
        </div>
        <p className="text-[10px] text-[var(--muted-foreground)] mt-1 flex items-center gap-1">
          <Mic className="h-2.5 w-2.5" />
          Message vocal
        </p>
      </div>

      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            audioRef.current?.pause();
            setPlaying(false);
            onRemove();
          }}
          className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          title="Supprimer le vocal"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
