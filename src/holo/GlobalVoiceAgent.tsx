// GlobalVoiceAgent — always-on voice control layer.
// Sits at the top of the HoloPlayer tree so it works from any view including the home dashboard.
// Usage: say "buka musik", "chord lab", "gesture", "meme", "jarvis" etc.

import { useEffect, useRef, useState } from "react";
import { appView } from "./appStore";
import { askLive } from "./voiceBridge";
import type { ChatMessage } from "./ravaAi";
import { toggleTrack, pauseTrack, playTrack, isPlaying } from "./audio";
import { tracks } from "./tracks";
import { player, seekCarousel } from "./store";



const SpeechRecognition =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;


function detectCommand(text: string): string | null {
  const q = text.toLowerCase();

  // ── Music playback controls (checked before nav so "putar musik" can be more specific) ──
  // Pause
  if (/pause|berhenti|stop musik|jeda|diam|mute/.test(q)) return "music:pause";
  // Next track
  if (/next|selanjutnya|lagu berikut|skip/.test(q)) return "music:next";
  // Previous track
  if (/prev|sebelumnya|lagu sebelum|back track/.test(q)) return "music:prev";
  // Specific track by artist / title match
  const trackMatch = tryMatchTrack(q);
  if (trackMatch !== null) return `music:track:${trackMatch}`;
  // Generic play / resume
  if (/putar|play|resume|lanjut musik/.test(q)) return "music:play";

  // ── Photobox snap photo trigger ──
  const isPhotobox = appView.get() === "photobox";
  if (
    isPhotobox ||
    /fotoin|take photo|take foto|take a photo|snap photo|ambil foto|cekrek|potret|tangkap foto|foto dong|1 2 3|snap|potretkan/.test(q)
  ) {
    if (/foto|photo|snap|cekrek|potret|kamera|senyum|picture|1 2 3/.test(q)) {
      // If user is NOT in photobox and explicitly says "buka photobox" or "buka kamera" (without snap intent), just open app
      if (!isPhotobox && /buka|open|lihat/.test(q) && !/ambil|take|snap|cekrek|potret|fotoin/.test(q)) {
        return "photobox";
      }
      return "photobox:snap";
    }
  }

  // ── Navigation commands (keyword-based, no AI needed) ──
  if (/buka musik|open musik|open music|aplikasi musik/.test(q)) return "music";
  if (/rundown|acara|jadwal/.test(q)) return "rundown";
  if (/photobox|foto|kamera/.test(q)) return "photobox"; // 'foto' alone still opens photobox
  if (/chord|piano|not|lab/.test(q)) return "chordlab";
  if (/news|berita|baca berita|buka berita/.test(q)) return "news";
  if (/kirun|k\.i\.r\.u\.n|rava|robot|asisten/.test(q)) return "robot";
  if (/beranda|home|dasbor|kembali|menu utama/.test(q)) return "home";

  // ── General question / conversation ──
  if (/kirun|k\.i\.r\.u\.n|rava|r\.a\.v\.a/.test(q)) return "ai";

  return null; // not a recognised command — ignore
}

// Fuzzy-match the spoken text against track titles and artists.
// Returns the track index (0-based) if found, or null.
function tryMatchTrack(q: string): number | null {
  for (let i = 0; i < tracks.length; i++) {
    const t = tracks[i];
    const title = t.title.toLowerCase();
    const artist = t.artist.toLowerCase();
    // Check if any meaningful word from the title/artist appears in q
    const words = [...title.split(/\s+/), ...artist.split(/\s+/)].filter(w => w.length > 2);
    if (words.some(w => q.includes(w))) return i;
  }
  return null;
}

// ─── Music playback command handler ─────────────────────────────────────────
function handleMusicPlayback(cmd: string): { said: string; nav?: string } {
  const currentView = appView.get();

  // music:track:N — play a specific track
  if (cmd.startsWith("music:track:")) {
    const idx = parseInt(cmd.split(":")[2], 10);
    const t = tracks[idx];
    player.playingIndex = idx;
    seekCarousel(idx);
    if (currentView !== "music") {
      setTimeout(() => { toggleTrack(t.src); }, 600);
      return { said: `Memutar ${t.title} oleh ${t.artist}, Om.`, nav: "music" };
    }
    toggleTrack(t.src);
    return { said: `Memutar ${t.title} oleh ${t.artist}, Om.` };
  }

  // music:play — resume current or play first track
  if (cmd === "music:play") {
    if (isPlaying()) return { said: "Musik sudah diputar, Om." };
    const idx = player.playingIndex >= 0 ? player.playingIndex : 0;
    const t = tracks[idx];
    player.playingIndex = idx;
    seekCarousel(idx);
    if (currentView !== "music") {
      setTimeout(() => { playTrack(t.src); }, 600);
      return { said: `Melanjutkan musik, Om.`, nav: "music" };
    }
    playTrack(t.src);
    return { said: "Melanjutkan musik, Om." };
  }

  // music:pause
  if (cmd === "music:pause") {
    pauseTrack();
    return { said: "Musik dijeda, Om." };
  }

  // music:next
  if (cmd === "music:next") {
    const next = (player.playingIndex + 1) % tracks.length;
    player.playingIndex = next;
    seekCarousel(next);
    const t = tracks[next];
    if (currentView !== "music") {
      setTimeout(() => { toggleTrack(t.src); }, 600);
      return { said: `Memutar lagu berikutnya: ${t.title}, Om.`, nav: "music" };
    }
    toggleTrack(t.src);
    return { said: `Memutar lagu berikutnya: ${t.title}, Om.` };
  }

  // music:prev
  if (cmd === "music:prev") {
    const prev = (player.playingIndex - 1 + tracks.length) % tracks.length;
    player.playingIndex = prev;
    seekCarousel(prev);
    const t = tracks[prev];
    if (currentView !== "music") {
      setTimeout(() => { toggleTrack(t.src); }, 600);
      return { said: `Memutar lagu sebelumnya: ${t.title}, Om.`, nav: "music" };
    }
    toggleTrack(t.src);
    return { said: `Memutar lagu sebelumnya: ${t.title}, Om.` };
  }

  return { said: "Perintah musik tidak dikenali, Om." };
}

// ─── TTS helper — imported from ravaVoice (male robot voice)
// speak() is imported from ./ravaVoice above


// ─── Status pill shown on dashboard ─────────────────────────────────────────
type State = "idle" | "listening" | "thinking" | "speaking";

export default function GlobalVoiceAgent({ standbyOnly = false }: { standbyOnly?: boolean } = {}) {
  const recRef = useRef<any>(null);
  const [state, setState] = useState<State>("idle");
  const [transcript, setTranscript] = useState("");
  const historyRef = useRef<ChatMessage[]>([]);
  const listeningRef = useRef(false);
  // AbortController for the in-flight AI request
  const abortRef = useRef<AbortController | null>(null);
  // Guard against overlapping parallel AI calls & mic feedback loops
  const isProcessingRef = useRef(false);
  const isSpeakingOrThinkingRef = useRef(false);

  const startListening = () => {
    if (!recRef.current || listeningRef.current || isSpeakingOrThinkingRef.current) return;
    try { recRef.current.start(); } catch (_) { /* already started */ }
  };

  const stopListening = () => {
    if (!recRef.current) return;
    listeningRef.current = false;
    try { recRef.current.stop(); } catch (_) {}
  };

  useEffect(() => {
    if (standbyOnly) return;
    if (!SpeechRecognition) return;

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = "id-ID";
    recRef.current = rec;

    rec.onstart = () => {
      listeningRef.current = true;
      if (!isSpeakingOrThinkingRef.current) {
        setState("listening");
      }
    };

    rec.onend = () => {
      listeningRef.current = false;
      // Do NOT restart listening if AI is currently thinking or speaking!
      if (!isSpeakingOrThinkingRef.current) {
        setState(s => (s === "listening" || s === "thinking") ? "idle" : s);
        setTimeout(startListening, 400);
      }
    };

    rec.onerror = (err: any) => {
      listeningRef.current = false;
      if (err?.error === "no-speech") {
        if (!isSpeakingOrThinkingRef.current) {
          setTimeout(startListening, 400);
        }
        return;
      }
      if (!isSpeakingOrThinkingRef.current) {
        setState("idle");
        isProcessingRef.current = false;
        setTimeout(startListening, 1500);
      }
    };

    rec.onresult = async (e: any) => {
      // IGNORE mic input completely if AI is currently thinking or speaking!
      if (isSpeakingOrThinkingRef.current || isProcessingRef.current) return;

      const latest = e.results[e.results.length - 1];
      const text: string = (latest[0].transcript || "").trim();
      if (!text) return;

      setTranscript(text);

      const cmd = detectCommand(text);
      // ── DEBUG: lihat di browser console kata apa yang ditangkap & command apa yang match ──
      console.info(`[KIRUN Voice] 🎙️ heard: "${text}" → cmd: ${cmd ?? 'null (→ AI)'}`);

      // === Music playback commands — instant, no AI needed ===
      if (cmd?.startsWith("music:")) {
        const result = handleMusicPlayback(cmd);
        if (result.nav) appView.set(result.nav as any);
        return;
      }

      // === Photobox snap photo command — instant ===
      if (cmd === "photobox:snap") {
        console.info("[KIRUN Voice] 📸 SNAP triggered!");
        if (appView.get() !== "photobox") {
          console.info("[KIRUN Voice] → Not in photobox, switching view first then snap in 700ms");
          appView.set("photobox");
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent("kirun:snap-photo"));
          }, 700);
        } else {
          console.info("[KIRUN Voice] → Already in photobox, snapping immediately");
          window.dispatchEvent(new CustomEvent("kirun:snap-photo"));
        }
        return;
      }

      // === Direct navigation commands — instant, no AI needed ===
      const navMap: Record<string, string> = {
        music: "music", gesturefx: "gesturefx",
        chordlab: "chordlab", meme: "meme",
        news: "news", robot: "robot", home: "home",
        photobox: "photobox", rundown: "rundown",
      };
      if (cmd && cmd !== "ai" && navMap[cmd]) {
        appView.set(navMap[cmd] as any);
        return;
      }

      // === ALL other speech → AI conversation via Gemini Live API (Python server) ===
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }

      // Mute mic & set flags IMMEDIATELY
      isSpeakingOrThinkingRef.current = true;
      isProcessingRef.current = true;
      stopListening();
      setState("thinking");

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const result = await askLive(text, controller.signal);

        if (controller.signal.aborted) {
          isProcessingRef.current = false;
          isSpeakingOrThinkingRef.current = false;
          return;
        }

        const reply = result?.reply || "";

        // Parse command nav tags
        const cmdRegex = /\[COMMAND:OPEN_(\w+)\]/;
        const match = reply.match(cmdRegex);
        const cleanReply = reply.replace(cmdRegex, "").trim();
        let navTarget: string | null = null;
        if (match) {
          const t = match[1];
          if (t === "MUSIC") navTarget = "music";
          else if (t === "RUNDOWN") navTarget = "rundown";
          else if (t === "PHOTOBOX") navTarget = "photobox";
          else if (t === "CHORDLAB") navTarget = "chordlab";
          else if (t === "NEWS") navTarget = "news";
          else if (t === "ROBOT") navTarget = "robot";
          else if (t === "HOME") navTarget = "home";
        }

        historyRef.current = [
          ...historyRef.current,
          { role: "user" as const, text },
          { role: "model" as const, text: cleanReply }
        ].slice(-6);

        setState("speaking");
        // Audio diputar real-time via Web Audio API di voiceBridge (Gemini Live API)
        // Tidak perlu lagi memanggil speak() fallback yang menyebabkan suara double!
        if (navTarget) {
          appView.set(navTarget as any);
          if (navTarget === "photobox") {
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent("kirun:snap-photo"));
            }, 600);
          }
        }
      } catch {
        // quiet error
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        setState("idle");
        isProcessingRef.current = false;
        // Wait 800ms after audio finishes before un-muting mic to avoid speaker echo
        setTimeout(() => {
          isSpeakingOrThinkingRef.current = false;
          startListening();
        }, 800);
      }
    };

    // Start listening after a short delay
    setTimeout(startListening, 2000);

    return () => {
      // Cancel any in-flight AI request
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
      isProcessingRef.current = false;
      window.speechSynthesis?.cancel();
      try { rec.stop(); } catch (_) { /* noop */ }
    };
  }, [standbyOnly]);

  // In standbyOnly mode, render nothing — just keep voiceBridge mounted
  if (standbyOnly) return null;

  // ─── Mic indicator pill (bottom-center) ─────────────────────────────────
  const colours: Record<State, string> = {
    idle: "rgba(95,230,255,.25)",
    listening: "rgba(95,230,255,.25)",
    thinking: "rgba(182,157,255,.55)",
    speaking: "rgba(255,207,90,.55)",
  };
  const labels: Record<State, string> = {
    idle: "🎙 Mendengarkan…",
    listening: "🎙 Mendengarkan…",
    thinking: "⋯ Memproses",
    speaking: "🔊 KIRUN",
  };
  const dotColour: Record<State, string> = {
    idle: "#5fe6ff",
    listening: "#5fe6ff",
    thinking: "#b69dff",
    speaking: "#ffd05a",
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: 28,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 55,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 14px",
        borderRadius: 30,
        background: colours[state],
        border: `1px solid ${dotColour[state]}55`,
        backdropFilter: "blur(8px)",
        transition: "background .3s, border-color .3s",
        pointerEvents: "none",
      }}
    >
      {/* Animated dot */}
      <span
        style={{
          width: 7, height: 7, borderRadius: "50%",
          background: dotColour[state],
          boxShadow: `0 0 8px ${dotColour[state]}`,
          animation: (state === "idle" || state === "listening") ? "pulse 2s ease-in-out infinite" : "none",
        }}
      />
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".12em", color: "#eaffff" }}>
        {labels[state]}
      </span>
      {transcript && state === "listening" && (
        <span style={{ fontSize: 10, color: "#b0e8ff", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          &nbsp;"{transcript}"
        </span>
      )}
    </div>
  );
}
