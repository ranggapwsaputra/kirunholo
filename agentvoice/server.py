"""
KIRUN AgentVoice — Gemini Multimodal Live API Server (Streaming Audio).

Perubahan utama vs versi lama:
- Audio di-stream per chunk langsung saat datang dari Gemini (tidak tunggu turn_complete)
- Browser bisa start play segera saat chunk pertama datang
- Tidak ada double-audio karena onmessage di voiceBridge.ts sudah tidak tangani 'audio'

Protocol WebSocket:
  Client → { "action": "ask",   "text": "...", "session_id": "..." }
  Server → { "status": "speaking" }
  Server → { "status": "audio_chunk", "data": "<base64 PCM chunk>", "sampleRate": 24000, "seq": N }
  Server → { "status": "audio_end" }             ← semua chunk sudah dikirim
  Server → { "status": "transcript", "text": "..." }
  Server → { "status": "done" }

Model: gemini-3.1-flash-live-preview (text → audio ✓)
Voice: Charon
"""

from __future__ import annotations

import asyncio
import base64
import json
import logging
import os
import struct
from pathlib import Path

import websockets
from dotenv import load_dotenv

_DIR = Path(__file__).parent
load_dotenv(_DIR / ".env")

GEMINI_API_KEY       = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_LIVE_MODEL    = os.getenv("GEMINI_LIVE_MODEL",    "gemini-3.1-flash-live-preview")
GEMINI_LIVE_FALLBACK = os.getenv("GEMINI_LIVE_FALLBACK", "gemini-2.5-flash-preview")
TTS_VOICE            = os.getenv("TTS_VOICE", "Charon")
WS_HOST              = os.getenv("WS_HOST", "127.0.0.1")
WS_PORT              = int(os.getenv("WS_PORT", "7788"))

LIVE_SAMPLE_RATE = 24000   # Gemini Live output: 24kHz 16-bit mono PCM

SYSTEM_PROMPT = (
    "Kamu adalah KIRUN, asisten hologram HITA Indonesia. "
    "WAJIB jawab MAKSIMAL 1 kalimat singkat saja. Tidak boleh panjang. "
    "Bicara Bahasa Indonesia santai. Langsung to the point. "
    "Untuk navigasi: [COMMAND:OPEN_MUSIC] [COMMAND:OPEN_RUNDOWN] "
    "[COMMAND:OPEN_PHOTOBOX] [COMMAND:OPEN_CHORDLAB] "
    "[COMMAND:OPEN_NEWS] [COMMAND:OPEN_ROBOT] [COMMAND:OPEN_HOME]."
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [KIRUN Live] %(levelname)s %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)


def _safe_bytes(raw) -> bytes | None:
    """Konversi raw (bytes/bytearray/base64 str) → bytes. Return None jika gagal."""
    if isinstance(raw, (bytes, bytearray)):
        return bytes(raw)
    if isinstance(raw, str) and raw:
        pad = (4 - len(raw) % 4) % 4
        try:
            return base64.b64decode(raw + "=" * pad)
        except Exception:
            return None
    return None


def _make_live_config():
    from google.genai import types
    return types.LiveConnectConfig(
        response_modalities=["AUDIO"],
        system_instruction=SYSTEM_PROMPT,
        output_audio_transcription=types.AudioTranscriptionConfig(),
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=TTS_VOICE)
            )
        ),
    )


async def _get_or_create_session(session_store: dict, session_id: str):
    """Ambil session yang sudah ada atau buat baru."""
    if session_id in session_store:
        return session_store[session_id][1], False

    from google import genai
    client = genai.Client(api_key=GEMINI_API_KEY)

    for model in [GEMINI_LIVE_MODEL, GEMINI_LIVE_FALLBACK]:
        try:
            log.info(f"Connecting Gemini Live ({model})...")
            ctx = client.aio.live.connect(model=model, config=_make_live_config())
            session = await ctx.__aenter__()
            session_store[session_id] = (ctx, session)
            log.info(f"✅ Connected: {model}")
            return session, True
        except Exception as exc:
            log.warning(f"Model {model} gagal: {exc}")

    return None, False


async def stream_live_response(ws, session, text: str) -> str:
    """
    Kirim text ke Gemini Live, stream audio chunks langsung ke browser.
    Return: transcript (ucapan asli model).
    """
    from google.genai import types

    await session.send_client_content(
        turns=types.Content(role="user", parts=[types.Part(text=text)]),
        turn_complete=True,
    )

    transcript_parts: list[str] = []
    seq = 0
    total_pcm = 0
    detected_rate = LIVE_SAMPLE_RATE  # will be updated if mime_type reveals real rate

    def _parse_sample_rate(mime_type: str | None) -> int:
        """Baca sample rate dari mime_type, misal 'audio/pcm;rate=16000'."""
        if mime_type and "rate=" in mime_type:
            try:
                return int(mime_type.split("rate=")[1].split(";")[0].strip())
            except Exception:
                pass
        return LIVE_SAMPLE_RATE

    async def _send_chunk(raw_chunk: bytes, rate: int):
        nonlocal seq, total_pcm
        b64 = base64.b64encode(raw_chunk).decode()
        await ws.send(json.dumps({
            "status": "audio_chunk",
            "data": b64,
            "sampleRate": rate,
            "seq": seq,
        }))
        seq += 1
        total_pcm += len(raw_chunk)

    try:
        async for response in session.receive():
            # ── Audio streaming ──────────────────────────────────────────────
            # PENTING: Gemini Live API kadang kirim audio di DUA tempat sekaligus:
            #   1) response.data  (shortcut field)
            #   2) response.server_content.model_turn.parts[].inline_data
            # Jika keduanya berisi data yang sama, kita akan dapat DOUBLE AUDIO.
            # Solusi: gunakan HANYA satu path per response object.
            #   - Prioritaskan response.data (lebih cepat, langsung).
            #   - Jika response.data ada → SKIP model_turn audio parts.
            #   - Jika response.data kosong/None → baca dari model_turn.parts.

            data_sent_this_response = False

            if response.data is not None:
                chunk = _safe_bytes(response.data)
                if chunk and len(chunk) > 0:
                    log.debug(f"  [path=response.data] chunk {len(chunk)}B")
                    await _send_chunk(chunk, detected_rate)
                    data_sent_this_response = True

            sc = response.server_content
            if sc:
                # ── Audio via modelTurn.parts (HANYA jika response.data tidak ada) ──
                if not data_sent_this_response:
                    mt = getattr(sc, "model_turn", None)
                    if mt:
                        for part in mt.parts:
                            inline = getattr(part, "inline_data", None)
                            if inline and getattr(inline, "data", None):
                                # Detect sample rate dari mime_type
                                mt_rate = _parse_sample_rate(getattr(inline, "mime_type", None))
                                if mt_rate != detected_rate:
                                    detected_rate = mt_rate
                                    log.info(f"  Audio mime_type: {getattr(inline, 'mime_type', '?')} → {detected_rate}Hz")
                                chunk = _safe_bytes(inline.data)
                                if chunk and len(chunk) > 0:
                                    log.debug(f"  [path=model_turn] chunk {len(chunk)}B")
                                    await _send_chunk(chunk, detected_rate)
                else:
                    # Cek apakah model_turn JUGA punya audio (untuk debug double-send)
                    mt = getattr(sc, "model_turn", None)
                    if mt:
                        for part in mt.parts:
                            inline = getattr(part, "inline_data", None)
                            if inline and getattr(inline, "data", None):
                                log.debug("  [SKIP] model_turn audio skipped (response.data already sent)")
                                break

                # ── Transcript dari output_transcription (ucapan asli) ────────
                ot = getattr(sc, "output_transcription", None)
                if ot and getattr(ot, "text", None):
                    transcript_parts.append(ot.text)

                if sc.turn_complete:
                    break

    except Exception as exc:
        log.warning(f"Stream loop ended: {exc}")

    transcript = "".join(transcript_parts).strip()
    dur_s = round(total_pcm / 2 / detected_rate, 2) if detected_rate else 0
    log.info(f"✅ Streamed {seq} chunks | {total_pcm}B PCM @ {detected_rate}Hz = ~{dur_s}s | '{transcript[:60]}'")
    return transcript


async def handle_client(ws) -> None:
    addr = ws.remote_address
    log.info(f"Client connect: {addr}")
    session_store: dict = {}

    await ws.send(json.dumps({
        "status": "ready",
        "live": bool(GEMINI_API_KEY),
        "model": GEMINI_LIVE_MODEL,
    }))

    # ── Pre-warm Gemini Live session saat client connect ─────────────────────
    # Supaya request pertama tidak kena cold-start delay
    async def _prewarm():
        if GEMINI_API_KEY:
            try:
                session, created = await _get_or_create_session(session_store, "kirun-main")
                if created:
                    log.info(f"[{addr}] ✅ Session pre-warmed: kirun-main")
            except Exception as exc:
                log.warning(f"[{addr}] Pre-warm gagal: {exc}")

    asyncio.create_task(_prewarm())

    try:
        async for raw in ws:
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue

            action     = msg.get("action")
            text       = (msg.get("text") or "").strip()
            session_id = msg.get("session_id", "default")

            if action in ("speak", "ask"):
                if not text:
                    await ws.send(json.dumps({"status": "done"}))
                    continue

                log.info(f"[{addr}] {action.upper()}: {text[:70]}")
                await ws.send(json.dumps({"status": "speaking"}))

                try:
                    session, _ = await _get_or_create_session(session_store, session_id)
                    if session is None:
                        raise RuntimeError("Tidak bisa connect ke Gemini Live API")

                    transcript = await stream_live_response(ws, session, text)

                    # Signal ke client bahwa semua audio sudah dikirim
                    await ws.send(json.dumps({"status": "audio_end"}))

                    if transcript:
                        await ws.send(json.dumps({"status": "transcript", "text": transcript}))

                except Exception as exc:
                    log.error(f"Error: {exc}")
                    # Reset session agar reinit berikutnya
                    entry = session_store.pop(session_id, None)
                    if entry:
                        try:
                            await entry[0].__aexit__(None, None, None)
                        except Exception:
                            pass
                    await ws.send(json.dumps({"status": "tts_failed", "message": str(exc)}))

                await ws.send(json.dumps({"status": "done"}))

            elif action == "cancel":
                await ws.send(json.dumps({"status": "done"}))

    except websockets.exceptions.ConnectionClosedOK:
        pass
    except Exception as exc:
        log.error(f"[{addr}] Error: {exc}")
    finally:
        for sid, (ctx, _) in list(session_store.items()):
            try:
                await ctx.__aexit__(None, None, None)
            except Exception:
                pass
        session_store.clear()
        log.info(f"Client disconnect: {addr}")


async def main() -> None:
    log.info(f"🚀 KIRUN Gemini Live API | {GEMINI_LIVE_MODEL} | Voice: {TTS_VOICE}")
    async with websockets.serve(handle_client, WS_HOST, WS_PORT, ping_interval=20, ping_timeout=60):
        log.info(f"✅ ONLINE → ws://{WS_HOST}:{WS_PORT}")
        await asyncio.Future()


if __name__ == "__main__":
    asyncio.run(main())
