import { useState, useEffect, useRef } from "react";
import { Camera, Download, Trash2, Sliders, Image as ImageIcon } from "lucide-react";
import { blip } from "../boot";
import { useExit } from "../useExit";

export type FrameFilter = "cyber" | "iron" | "synthwave" | "matrix" | "stealth";

interface FilterOption {
  id: FrameFilter;
  name: string;
  color: string;
  borderStyle: string;
  bgGlow: string;
}

const FILTERS: FilterOption[] = [
  { id: "cyber", name: "Cyber HUD", color: "#00d4ff", borderStyle: "rgba(0, 212, 255, 0.7)", bgGlow: "rgba(0, 212, 255, 0.15)" },
  { id: "iron", name: "Iron Core", color: "#ff4500", borderStyle: "rgba(255, 69, 0, 0.75)", bgGlow: "rgba(255, 69, 0, 0.18)" },
  { id: "synthwave", name: "Synthwave", color: "#e056fd", borderStyle: "rgba(224, 86, 253, 0.75)", bgGlow: "rgba(224, 86, 253, 0.18)" },
  { id: "matrix", name: "Matrix", color: "#2ed573", borderStyle: "rgba(46, 213, 115, 0.75)", bgGlow: "rgba(46, 213, 115, 0.18)" },
  { id: "stealth", name: "Stealth Mono", color: "#ffffff", borderStyle: "rgba(255, 255, 255, 0.6)", bgGlow: "rgba(255, 255, 255, 0.1)" },
];

export default function PhotoboxApp() {
  useExit(); // Allows holding fist gesture to exit to home

  const [filter, setFilter] = useState<FrameFilter>("cyber");
  const [photos, setPhotos] = useState<string[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [flash, setFlash] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);

  const curFilter = FILTERS.find((f) => f.id === filter) || FILTERS[0];

  // Shutter sound generator using Web Audio
  const playShutterSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.13);
    } catch {
      blip(800);
    }
  };

  // Beep sound for countdown
  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } catch {}
  };

  // Draw photo onto canvas with selected filter frame
  const captureFrame = (): string | null => {
    const videoEl = document.getElementById("holo-cam") as HTMLVideoElement;
    if (!videoEl || videoEl.readyState < 2) return null;

    const canvas = document.createElement("canvas");
    const w = 1280, h = 720;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Draw mirrored camera feed
    ctx.save();
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoEl, 0, 0, w, h);
    ctx.restore();

    // Overlay Frame Graphics
    const color = curFilter.color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 6;

    // Frame border
    ctx.strokeRect(16, 16, w - 32, h - 32);

    // Corner brackets
    const bLen = 40;
    ctx.lineWidth = 10;
    // Top-Left
    ctx.beginPath(); ctx.moveTo(16, 16 + bLen); ctx.lineTo(16, 16); ctx.lineTo(16 + bLen, 16); ctx.stroke();
    // Top-Right
    ctx.beginPath(); ctx.moveTo(w - 16 - bLen, 16); ctx.lineTo(w - 16, 16); ctx.lineTo(w - 16, 16 + bLen); ctx.stroke();
    // Bottom-Left
    ctx.beginPath(); ctx.moveTo(16, h - 16 - bLen); ctx.lineTo(16, h - 16); ctx.lineTo(16 + bLen, h - 16); ctx.stroke();
    // Bottom-Right
    ctx.beginPath(); ctx.moveTo(w - 16 - bLen, h - 16); ctx.lineTo(w - 16, h - 16); ctx.lineTo(w - 16, h - 16 - bLen); ctx.stroke();

    // Reticle Target in Center
    ctx.lineWidth = 2;
    ctx.strokeStyle = color + "aa";
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 45, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 8, 0, Math.PI * 2);
    ctx.stroke();

    // Timestamp & Watermark
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" }).toUpperCase();
    const timeStr = now.toLocaleTimeString("en-US", { hour12: false });

    ctx.fillStyle = color;
    ctx.font = "bold 20px monospace";
    ctx.fillText(`KIRUN PHOTOBOX // [${filter.toUpperCase()}]`, 40, 50);

    ctx.font = "16px monospace";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`${dateStr} ${timeStr}`, w - 240, 50);

    ctx.fillStyle = color + "cc";
    ctx.font = "14px monospace";
    ctx.fillText("HOLOGRAPHIC SNAP // 1080P CYBER CAM", 40, h - 35);

    return canvas.toDataURL("image/png");
  };

  const triggerSnap = async () => {
    if (isCapturing) {
      console.warn("[PhotoboxApp] triggerSnap called but isCapturing=true — ignored");
      return;
    }
    console.info("[PhotoboxApp] 📸 triggerSnap starting 3-2-1 countdown...");
    setIsCapturing(true);

    // 3 second countdown for single snap
    for (let c = 3; c > 0; c--) {
      setCountdown(c);
      playBeep();
      await new Promise((res) => setTimeout(res, 800));
    }

    setCountdown(null);
    setFlash(true);
    playShutterSound();
    setTimeout(() => setFlash(false), 250);

    const dataUrl = captureFrame();
    if (dataUrl) {
      setPhotos((prev) => [dataUrl, ...prev]);
      console.info("[PhotoboxApp] ✅ Photo captured and saved to gallery!");
    } else {
      console.warn("[PhotoboxApp] ⚠️ captureFrame returned null — camera not ready?");
    }

    setIsCapturing(false);
  };

  // Voice Event Listener for snapping photo via voice command ("take photo", "fotoin dong", etc.)
  const triggerSnapRef = useRef(triggerSnap);
  triggerSnapRef.current = triggerSnap;

  useEffect(() => {
    const handleVoiceSnap = () => {
      console.info("[PhotoboxApp] 🎙️ kirun:snap-photo event received! Calling triggerSnap...");
      triggerSnapRef.current();
    };
    window.addEventListener("kirun:snap-photo", handleVoiceSnap);
    console.info("[PhotoboxApp] ✅ kirun:snap-photo listener registered");
    return () => {
      window.removeEventListener("kirun:snap-photo", handleVoiceSnap);
      console.info("[PhotoboxApp] 🔇 kirun:snap-photo listener removed (unmounted)");
    };
  }, []);

  const downloadSinglePhoto = (url: string, idx: number) => {
    const a = document.createElement("a");
    a.download = `KIRUN_Photo_${idx + 1}_${Date.now()}.png`;
    a.href = url;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-between p-6 pointer-events-auto select-none overflow-hidden"
      style={{ background: "radial-gradient(ellipse at center, rgba(3,11,23,0.85) 0%, rgba(1,5,12,0.95) 100%)" }}>

      {/* Screen Flash FX */}
      {flash && (
        <div className="fixed inset-0 z-50 bg-white opacity-90 transition-opacity duration-200 pointer-events-none" />
      )}

      {/* Top Header */}
      <div className="flex items-center justify-between w-full max-w-6xl mx-auto z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl border" style={{ borderColor: curFilter.borderStyle, background: curFilter.bgGlow }}>
            <Camera size={24} style={{ color: curFilter.color }} />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-wider text-white uppercase font-mono">
              KIRUN PHOTOBOX
            </h1>
            <p className="text-xs text-cyan-200/50 font-mono tracking-widest uppercase">
              Holographic Studio & Cyber Snap
            </p>
          </div>
        </div>

        {/* Mode Tag */}
        <div className="px-4 py-1.5 rounded-full border border-cyan-500/40 bg-cyan-500/15 text-cyan-300 font-mono font-bold text-xs tracking-wider">
          📸 SINGLE SNAP MODE
        </div>
      </div>

      {/* Main Studio Viewport */}
      <div className="relative flex-1 flex items-center justify-center my-4 max-w-6xl mx-auto w-full gap-6">

        {/* Live Camera Viewfinder Window */}
        <div className="relative flex-1 h-full max-h-[560px] rounded-2xl overflow-hidden border-2 flex items-center justify-center"
          style={{ borderColor: curFilter.borderStyle, boxShadow: `0 0 40px ${curFilter.bgGlow}` }}>

          {/* Viewfinder Decorative Frame */}
          <div className="absolute inset-0 pointer-events-none border border-cyan-500/20 m-2 rounded-xl" />

          {/* Corner Tech Brackets */}
          <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 pointer-events-none" style={{ borderColor: curFilter.color }} />
          <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 pointer-events-none" style={{ borderColor: curFilter.color }} />
          <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 pointer-events-none" style={{ borderColor: curFilter.color }} />
          <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 pointer-events-none" style={{ borderColor: curFilter.color }} />

          {/* HUD Center Crosshair Target */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
            <div className="w-32 h-32 rounded-full border border-dashed animate-[spin_20s_linear_infinite]" style={{ borderColor: curFilter.color }} />
            <div className="absolute w-3 h-3 rounded-full" style={{ background: curFilter.color }} />
          </div>

          {/* Live Telemetry Info */}
          <div className="absolute top-6 left-6 font-mono text-[10px] tracking-widest uppercase text-cyan-200/70">
            CAM_FEED: 1080P // ISO: AUTO // FRAME: {curFilter.name.toUpperCase()}
          </div>

          {/* Countdown Number Overlay */}
          {countdown !== null && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <span className="text-9xl font-black font-mono animate-ping" style={{ color: curFilter.color }}>
                {countdown}
              </span>
            </div>
          )}

          {/* Main Shutter Trigger Button (Centered Overlay at Bottom) */}
          <div className="absolute bottom-6 z-20 flex items-center gap-4">
            <button
              onClick={triggerSnap}
              disabled={isCapturing}
              className="group relative flex items-center justify-center px-8 py-3.5 rounded-full font-mono font-black text-sm uppercase tracking-widest transition-all transform active:scale-95 disabled:opacity-50"
              style={{
                background: `linear-gradient(135deg, ${curFilter.color}, #000)`,
                color: "#ffffff",
                boxShadow: `0 0 25px ${curFilter.color}aa`,
                border: `1.5px solid ${curFilter.color}`
              }}
            >
              <Camera size={20} className="mr-2 group-hover:rotate-12 transition-transform" />
              {isCapturing ? "CAPTURING..." : "TAKE PHOTO"}
            </button>
          </div>
        </div>

        {/* Gallery Panel (Right Side) */}
        <div className="w-80 h-full max-h-[560px] rounded-2xl border border-cyan-500/20 bg-slate-950/70 backdrop-blur-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-cyan-500/15">
              <span className="font-mono text-xs font-bold tracking-wider text-cyan-100 flex items-center gap-2">
                <ImageIcon size={14} className="text-cyan-400" /> GALLERY ({photos.length})
              </span>
              {photos.length > 0 && (
                <button
                  onClick={() => setPhotos([])}
                  className="text-[10px] font-mono text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
                >
                  <Trash2 size={12} /> HAPUS
                </button>
              )}
            </div>

            {/* Photo Gallery List */}
            <div className="space-y-2.5 overflow-y-auto max-h-[420px] pr-1 scrollbar-thin scrollbar-thumb-cyan-500/30">
              {photos.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center p-4 border border-dashed border-cyan-500/20 rounded-xl">
                  <Camera size={36} className="text-cyan-500/30 mb-2 animate-pulse" />
                  <p className="font-mono text-xs text-cyan-200/40">Belum ada foto.</p>
                  <p className="font-mono text-[10px] text-cyan-200/30 mt-1">
                    Tekan tombol TAKE PHOTO untuk mengambil foto!
                  </p>
                </div>
              ) : (
                photos.map((url, idx) => (
                  <div
                    key={idx}
                    onClick={() => setActivePhotoIndex(idx)}
                    className="group relative rounded-lg overflow-hidden border border-cyan-500/30 cursor-pointer hover:border-cyan-400 transition-all"
                  >
                    <img src={url} alt={`Snap ${idx + 1}`} className="w-full h-32 object-cover" />
                    <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); downloadSinglePhoto(url, idx); }}
                        className="p-2 rounded-full bg-cyan-500 text-black hover:scale-110 transition-transform"
                        title="Download Photo"
                      >
                        <Download size={16} />
                      </button>
                    </div>
                    <span className="absolute bottom-1 right-2 font-mono text-[9px] text-cyan-300 bg-slate-950/80 px-1.5 py-0.5 rounded border border-cyan-500/30">
                      PHOTO #{photos.length - idx}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Frame Selector Controls (Bottom Bar) */}
      <div className="flex items-center justify-between w-full max-w-6xl mx-auto z-10 pt-2 border-t border-cyan-500/15">
        <div className="flex items-center gap-2 font-mono text-xs text-cyan-200/50">
          <Sliders size={14} className="text-cyan-400" /> FRAME THEME:
        </div>

        <div className="flex items-center gap-3">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => { blip(600); setFilter(f.id); }}
              className={`px-3.5 py-1.5 rounded-lg font-mono text-xs font-bold transition-all border flex items-center gap-2 ${
                filter === f.id
                  ? "bg-slate-900 text-white shadow-lg"
                  : "bg-slate-950/60 text-cyan-200/50 hover:text-white"
              }`}
              style={{
                borderColor: filter === f.id ? f.color : "rgba(255,255,255,0.1)",
                boxShadow: filter === f.id ? `0 0 12px ${f.bgGlow}` : "none"
              }}
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: f.color }} />
              {f.name}
            </button>
          ))}
        </div>

        <div className="font-mono text-[10px] tracking-widest text-cyan-200/40 uppercase">
          FIST GESTURE ✊ TO EXIT
        </div>
      </div>

      {/* Expanded Modal Preview for Single Photo */}
      {activePhotoIndex !== null && photos[activePhotoIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
          onClick={() => setActivePhotoIndex(null)}
        >
          <div className="relative max-w-3xl w-full rounded-2xl overflow-hidden border border-cyan-500/40 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <img src={photos[activePhotoIndex]} alt="Enlarged snap" className="w-full h-auto" />
            <div className="p-4 bg-slate-950 flex items-center justify-between">
              <span className="font-mono text-xs text-cyan-300">
                KIRUN PHOTOBOX · {curFilter.name} FRAME
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => downloadSinglePhoto(photos[activePhotoIndex!], activePhotoIndex!)}
                  className="px-4 py-1.5 rounded-lg bg-cyan-500 text-black font-mono text-xs font-bold flex items-center gap-1.5 hover:brightness-110"
                >
                  <Download size={14} /> UNDUH FOTO
                </button>
                <button
                  onClick={() => setActivePhotoIndex(null)}
                  className="px-3 py-1.5 rounded-lg border border-cyan-500/30 text-cyan-200 font-mono text-xs hover:bg-cyan-500/10"
                >
                  TUTUP
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
