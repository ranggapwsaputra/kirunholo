/**
 * voiceBridge.ts — R.A.V.A TTS bridge to the Python ElevenLabs voice agent.
 *
 * Connects to ws://localhost:7788 (the jarvis.py WebSocket server) and routes
 * all speak() calls through ElevenLabs for high-quality, premium voice output.
 *
 * Fallback: if the WebSocket is not available (agent offline), automatically
 * falls back to the built-in browser Web Speech Synthesis API.
 *
 * API is fully compatible with the old ravaVoice.ts — just swap the import.
 *
 * Usage:
 *   import { speak, cancel } from "./voiceBridge";
 *   speak("Selamat datang, Om.", () => console.log("done"));
 */

// ─── Config ──────────────────────────────────────────────────────────────────

// Port can be overridden in .env: VITE_VOICE_WS_URL=ws://127.0.0.1:7788
const WS_URL = (import.meta.env.VITE_VOICE_WS_URL as string | undefined)?.trim() || "ws://127.0.0.1:7788";
const RECONNECT_DELAY_MS = 800;    // wait before retry after disconnect
const CONNECT_TIMEOUT_MS = 1500;   // if no "ready" within this time, use fallback

// ─── State ───────────────────────────────────────────────────────────────────

type WsState = "connecting" | "ready" | "disconnected";

let ws: WebSocket | null = null;
let wsState: WsState = "disconnected";
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;



/** Subscribers notified when wsState changes. */
type StatusListener = (s: WsState) => void;
const statusListeners = new Set<StatusListener>();
function _setWsState(s: WsState) {
  wsState = s;
  statusListeners.forEach(fn => fn(s));
}

/** Queue of pending speak requests waiting for WS to be ready. */
const pendingQueue: Array<{ text: string; onEnd?: () => void }> = [];

/** Callback set for the currently in-flight speak request. */
let currentOnEnd: (() => void) | null = null;

/** Counter: how many askLive() turns are in flight (prevents main done handler from firing) */
let _askInFlight = 0;

// ─── WebSocket lifecycle ──────────────────────────────────────────────────────

// ─── IMPORTANT: Auto-connect on module load so clap events are received even ─
// ─── in Standby Mode (before speak() is ever called). ────────────────────────

type ClapListener = () => void;
const clapListeners = new Set<ClapListener>();

/**
 * Register a listener to be notified when a double-clap is detected by the Python voice agent.
 */
export function onClap(callback: ClapListener): () => void {
  clapListeners.add(callback);
  return () => { clapListeners.delete(callback); };
}

/**
 * Subscribe to WebSocket connection status changes.
 * Fires immediately with the current state, then on every change.
 */
export function onStatusChange(callback: StatusListener): () => void {
  statusListeners.add(callback);
  callback(wsState); // fire immediately with current state
  return () => { statusListeners.delete(callback); };
}

function connect(): void {
  if (ws && ws.readyState <= WebSocket.OPEN) return; // already connecting/open

  wsState = "connecting";
  _setWsState("connecting");
  console.info(`[voiceBridge] Connecting to R.A.V.A Voice Agent at ${WS_URL}...`);
  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    console.info("[voiceBridge] WebSocket connected, waiting for ready handshake...");
  };

  ws.onmessage = (event: MessageEvent) => {
    let msg: { status?: string; text?: string; message?: string };
    try {
      msg = JSON.parse(event.data as string);
    } catch {
      return;
    }

    switch (msg.status) {
      case "ready":
        _setWsState("ready");
        console.info("[voiceBridge] R.A.V.A Voice Agent is ready to play premium TTS!");
        _drainQueue();
        break;

      case "tts_failed":
        // Server TTS gagal — browser fallback akan dipakai saat done diterima
        break;

      // "audio", "transcript", "done" untuk ask flow — ditangani oleh askLive() listener saja
      // "speaking" diabaikan di sini

      case "clap_detected":
        console.info("[voiceBridge] Acoustic double-clap trigger detected! Notifying", clapListeners.size, "listener(s).");
        clapListeners.forEach(cb => cb());
        break;

      case "speaking":
        // Acknowledged — playback started on the Python side
        break;

      case "done":
        // Only fire speak() callback when no askLive() turn is in flight
        if (_askInFlight === 0 && currentOnEnd) {
          const cb = currentOnEnd;
          currentOnEnd = null;
          cb();
        }
        // Process next in queue if any
        _drainQueue();
        break;

      case "error":
        console.warn("[voiceBridge] Agent error:", msg.message);
        if (currentOnEnd) {
          const cb = currentOnEnd;
          currentOnEnd = null;
          cb(); // don't block the caller
        }
        break;
    }
  };

  ws.onclose = () => {
    _setWsState("disconnected");
    ws = null;
    _flushQueueOnDisconnect();
    if (!reconnectTimer) {
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, RECONNECT_DELAY_MS);
    }
  };

  ws.onerror = () => {
    // Suppress console error noise on normal reconnect attempts
  };
}

function _drainQueue(): void {
  if (wsState !== "ready" || !ws || ws.readyState !== WebSocket.OPEN) return;
  if (currentOnEnd) return; // one in flight at a time
  const next = pendingQueue.shift();
  if (!next) return;
  currentOnEnd = next.onEnd ?? null;
  ws.send(JSON.stringify({ action: "speak", text: next.text }));
}

function _flushQueueOnDisconnect(): void {
  // Drain queue with fallback TTS so callers aren't frozen
  if (currentOnEnd) {
    const cb = currentOnEnd;
    currentOnEnd = null;
    cb();
  }
  while (pendingQueue.length > 0) {
    const item = pendingQueue.shift()!;
    _browserFallbackSpeak(item.text, item.onEnd);
  }
}

// Start connecting immediately when the module loads
connect();

// Debug helper — lets HoloPlayer log how many clap listeners are registered
(window as any).__ravaClapDebug = () => clapListeners.size;

// ─── Browser Speech Synthesis fallback ───────────────────────────────────────

function _pickFallbackVoice(): SpeechSynthesisVoice | null {
  const all = window.speechSynthesis?.getVoices() ?? [];
  if (!all.length) return null;
  const isId = (v: SpeechSynthesisVoice) => v.lang.toLowerCase().startsWith("id");
  const isEn = (v: SpeechSynthesisVoice) => v.lang.toLowerCase().startsWith("en");
  const isMale = (v: SpeechSynthesisVoice) => {
    const n = v.name.toLowerCase();
    return /\b(male|man|david|mark|james|thomas|daniel|evan|aaron|fred|alex|google uk english male|google us english|microsoft david|andika|arief)\b/.test(n)
      && !/female|woman|zira|hazel|victoria|karen|tessa|moira|fiona|ava|samantha|siri/i.test(n);
  };
  return (
    all.find(v => isId(v) && isMale(v)) ||
    all.find(v => isId(v)) ||
    all.find(v => isEn(v) && isMale(v)) ||
    all.find(v => isMale(v)) ||
    all[0]
  );
}

function _browserFallbackSpeak(
  text: string,
  onEnd?: () => void,
  opts: { pitch?: number; rate?: number } = {}
): void {
  if (!window.speechSynthesis) { onEnd?.(); return; }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang  = "id-ID";
  u.pitch = opts.pitch ?? 0.72;
  u.rate  = opts.rate  ?? 0.92;
  const trySpeak = () => {
    const voice = _pickFallbackVoice();
    if (voice) u.voice = voice;
    u.onend   = () => onEnd?.();
    u.onerror = () => onEnd?.();
    window.speechSynthesis.speak(u);
  };
  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.onvoiceschanged = null;
      trySpeak();
    };
  } else {
    trySpeak();
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Speak `text` via ElevenLabs (through the Python jarvis.py agent).
 * Falls back to browser TTS if the agent is not running.
 *
 * @param text   Text to speak.
 * @param onEnd  Optional callback fired after playback completes.
 * @param opts   Fallback pitch/rate (only used when browser TTS kicks in).
 */
export function speak(
  text: string,
  onEnd?: () => void,
  opts: { pitch?: number; rate?: number } = {}
): void {
  const clean = text.trim();
  if (!clean) { onEnd?.(); return; }

  // Ensure connected (handles reconnect after the auto-connect was dropped)
  if (wsState === "disconnected") connect();

  if (wsState === "ready" && ws && ws.readyState === WebSocket.OPEN) {
    // WebSocket is live — queue the speak request
    pendingQueue.push({ text: clean, onEnd });
    _drainQueue();
    return;
  }

  if (wsState === "connecting") {
    // Wait up to CONNECT_TIMEOUT_MS for WS; otherwise use fallback
    const deadline = Date.now() + CONNECT_TIMEOUT_MS;
    const poll = () => {
      if (wsState === "ready" && ws && ws.readyState === WebSocket.OPEN) {
        pendingQueue.push({ text: clean, onEnd });
        _drainQueue();
      } else if (Date.now() < deadline) {
        setTimeout(poll, 100);
      } else {
        // Timed out — use browser fallback
        console.info("[voiceBridge] Agent not ready — using browser TTS fallback.");
        _browserFallbackSpeak(clean, onEnd, opts);
      }
    };
    setTimeout(poll, 100);
    return;
  }

  // Disconnected — use browser fallback immediately
  console.info("[voiceBridge] Agent offline — using browser TTS fallback.");
  _browserFallbackSpeak(clean, onEnd, opts);
}

/**
 * Cancel any ongoing speech (both ElevenLabs and browser TTS).
 */
export function cancel(): void {
  window.speechSynthesis?.cancel();
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ action: "cancel" }));
  }
  if (currentOnEnd) {
    const cb = currentOnEnd;
    currentOnEnd = null;
    cb();
  }
}

/**
 * Returns the current connection status of the voice bridge.
 */
export function bridgeStatus(): WsState {
  return wsState;
}

// ─── Real-Time Web Audio API PCM Streaming Player ────────────────────────────

class StreamingPcmPlayer {
  private ctx: AudioContext | null = null;
  private nextPlayTime: number = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  public hasPlayed: boolean = false;

  constructor() {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      try {
        this.ctx = new AudioContextClass();
      } catch (e) {
        console.warn("[voiceBridge] AudioContext init error:", e);
      }
    }
  }

  private _chunkCount = 0;
  private _lastSeq = -1;

  public feedChunk(base64Data: string, sampleRate: number = 24000, seq?: number) {
    if (!this.ctx) return;

    // ── Debug: detect duplicate or out-of-order chunks ──────────────────
    this._chunkCount++;
    if (seq !== undefined) {
      if (seq <= this._lastSeq) {
        console.warn(`[voiceBridge] ⚠️ DUPLICATE/BACKWARD chunk! seq=${seq} lastSeq=${this._lastSeq} — possible double audio source!`);
      } else if (seq > this._lastSeq + 1 && this._lastSeq >= 0) {
        console.warn(`[voiceBridge] ⚠️ SKIPPED chunk! seq=${seq} lastSeq=${this._lastSeq}`);
      }
      this._lastSeq = seq;
    }
    const durationEstimateMs = Math.round((base64Data.length * 0.75) / 2 / sampleRate * 1000);
    console.debug(`[voiceBridge] 🔊 chunk #${this._chunkCount} seq=${seq ?? '?'} ~${durationEstimateMs}ms @${sampleRate}Hz lag=${Math.round(Math.max(0, this.nextPlayTime - (this.ctx?.currentTime ?? 0)) * 1000)}ms`);

    try {
      const bin = atob(base64Data);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

      // Int16Array sample decoding (16-bit signed PCM, mono)
      const int16 = new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2));
      if (int16.length === 0) return;

      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768.0;
      }

      if (this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }

      const audioBuf = this.ctx.createBuffer(1, float32.length, sampleRate);
      audioBuf.getChannelData(0).set(float32);

      const source = this.ctx.createBufferSource();
      source.buffer = audioBuf;
      source.connect(this.ctx.destination);

      const now = this.ctx.currentTime;
      const startTime = Math.max(now, this.nextPlayTime);
      source.start(startTime);
      this.nextPlayTime = startTime + audioBuf.duration;
      this.activeSources.push(source);
      this.hasPlayed = true;
    } catch (e) {
      console.warn("[voiceBridge] PCM feedChunk error:", e);
    }
  }

  public async finish(): Promise<void> {
    if (!this.ctx || !this.hasPlayed) return;
    const remainingMs = Math.max(0, (this.nextPlayTime - this.ctx.currentTime) * 1000);
    await new Promise((res) => setTimeout(res, remainingMs + 50));
    try {
      if (this.ctx.state !== "closed") this.ctx.close();
    } catch (_) {}
  }

  public stop() {
    this.activeSources.forEach((s) => { try { s.stop(); } catch (_) {} });
    this.activeSources = [];
    if (this.ctx && this.ctx.state !== "closed") {
      try { this.ctx.close(); } catch (_) {}
    }
  }
}

/**
 * Ask KIRUN AI via Gemini Live API through the Python server.
 * Streams PCM audio directly to Web Audio API for zero latency and zero double sound.
 */
export function askLive(
  text: string,
  signal?: AbortSignal
): Promise<{ reply: string; audioPlayed: boolean }> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new Error("aborted")); return; }

    if (wsState !== "ready" || !ws || ws.readyState !== WebSocket.OPEN) {
      resolve({ reply: "", audioPlayed: false });
      return;
    }

    let reply = "";
    const sessionId = "kirun-main";
    const player = new StreamingPcmPlayer();

    const onMessage = (evt: MessageEvent) => {
      try {
        const msg = JSON.parse(evt.data as string);
        switch (msg.status) {
          case "audio_chunk":
            if (msg.data && typeof msg.data === "string") {
              player.feedChunk(msg.data, msg.sampleRate || 24000, msg.seq);
            }
            break;

          case "audio_end":
            console.debug("[voiceBridge] ✅ audio_end received — all chunks sent by server");
            break;

          case "transcript":
            reply = msg.text || "";
            console.debug(`[voiceBridge] 📝 transcript: "${reply.slice(0, 60)}"`);
            break;

          case "done":
            console.debug("[voiceBridge] 🏁 done received — finishing player");
            player.finish().then(() => {
              _askInFlight = Math.max(0, _askInFlight - 1);
              ws?.removeEventListener("message", onMessage);
              resolve({ reply, audioPlayed: player.hasPlayed });
            });
            break;
          case "tts_failed":
            console.warn("[voiceBridge] ❌ tts_failed from server");
            break;
        }
      } catch { /* ignore JSON parse errors */ }
    };

    ws.addEventListener("message", onMessage);

    // Abort handler
    signal?.addEventListener("abort", () => {
      ws?.removeEventListener("message", onMessage);
      ws?.send(JSON.stringify({ action: "cancel" }));
      reject(new Error("aborted"));
    });

    _askInFlight++;
    ws.send(JSON.stringify({ action: "ask", text, session_id: sessionId }));
  });
}

// ─── Module-level auto-connect ────────────────────────────────────────────────
// Note: connect() is already called at line 173 when the module loads.
// A second call here is intentionally removed to prevent race conditions.
