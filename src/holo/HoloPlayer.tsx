import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Canvas } from "@react-three/fiber";
import Home from "./Home";
import MusicApp from "./apps/MusicApp";
import RobotApp from "./apps/RobotApp";
import PhotoboxApp from "./apps/PhotoboxApp";
import RundownApp from "./apps/RundownApp";
import ChordLabApp from "./apps/ChordLabApp";
import NewsApp from "./apps/NewsApp";
import NewsCarousel from "./apps/NewsCarousel";
import { newsStore, newsEvents } from "./newsStore";
import type { NewsItem } from "./newsStore";
import WindowMenu, { WINDOW_MENU } from "./WindowMenu";
import Overlay from "./Overlay";
import HudChrome from "./HudChrome";
import HandFX from "./HandFX";
import BootSequence from "./BootSequence";
import { hand, multiHand } from "./handState";
import { resumeAudio } from "./audio";
import { powerOn } from "./boot";
import { appView } from "./appStore";
import GlobalVoiceAgent from "./GlobalVoiceAgent";
import { onClap, onStatusChange } from "./voiceBridge";

let _lastX = 0.5, _lastY = 0.5;
const d2 = (a: any, b: any) => Math.hypot(a.x - b.x, a.y - b.y);
function onResults(res: any) {
  multiHand.list = res.multiHandLandmarks || [];
  const lm = res.multiHandLandmarks?.[0];
  if (!lm) { hand.present = false; hand.point = false; hand.grab = false; hand.open = false; hand.vx = 0; hand.vy = 0; hand.landmarks = null; return; }
  hand.present = true;
  const x = 1 - lm[9].x, y = lm[9].y;
  hand.vx = x - _lastX; _lastX = x;
  hand.vy = y - _lastY; _lastY = y;
  hand.x = x; hand.y = y;
  hand.landmarks = lm;
  const ext = (tip: number, pip: number) => d2(lm[tip], lm[0]) > d2(lm[pip], lm[0]) * 1.08;
  const idx = ext(8, 6), mid = ext(12, 10), rng = ext(16, 14), pnk = ext(20, 18);
  hand.point = idx && !mid && !rng && !pnk;
  hand.grab = !idx && !mid && !rng && !pnk;
  hand.open = idx && mid && rng && pnk;
  hand.pinchDist = d2(lm[4], lm[8]);           // thumb tip ↔ index tip
  hand.pinch = !hand.grab && hand.pinchDist < 0.06; // tips pinched, but not a full fist
}

export default function HoloPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(true);
  const [booting, setBooting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [_wsStatus, setWsStatus] = useState<"connecting" | "ready" | "disconnected">("disconnected");
  const startedRef = useRef(true);
  const trackingRef = useRef(false);
  const view = useSyncExternalStore(appView.sub, appView.get);

  // Subscribe to WS status so UI shows live connection state
  useEffect(() => onStatusChange(setWsStatus), []);

  // Subscribe to news items (written by NewsApp outside Canvas, read here + passed to NewsCarousel)
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  useEffect(() => { return newsEvents.sub(() => setNewsItems([...newsStore.items])); }, []);



  // start the camera + hand-tracking on load
  async function startTracking() {
    if (trackingRef.current) return;
    trackingRef.current = true;
    const v = videoRef.current!;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720, facingMode: "user" } });
      v.srcObject = stream;
      await v.play();
    } catch { setErr("Allow camera to use hand gestures."); }
    const H = (window as any).Hands, C = (window as any).Camera;
    if (!H || !C) { setErr("Hand-tracking failed to load."); return; }
    const hands = new H({ locateFile: (f: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}` });
    hands.setOptions({ maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: 0.6, minTrackingConfidence: 0.6 });
    hands.onResults(onResults);
    const cam = new C(v, { onFrame: async () => { await hands.send({ image: v }); }, width: 640, height: 480 });
    cam.start();
  }

  useEffect(() => {
    startTracking();
  }, []);

  function enter() {
    if (startedRef.current) return;
    try { resumeAudio(); } catch (e) { console.warn("[HoloPlayer] resumeAudio failed:", e); }
    try { powerOn(); } catch (e) { console.warn("[HoloPlayer] powerOn failed:", e); }
    setBooting(true);
    setStarted(true);
    startedRef.current = true;
  }

  const enterRef = useRef(enter);
  enterRef.current = enter;
  const startTrackingRef = useRef(startTracking);
  startTrackingRef.current = startTracking;

  useEffect(() => {
    const unsubscribe = onClap(() => {
      console.info("[HoloPlayer] 👏 Clap received — listeners active...");
      try { startTrackingRef.current(); } catch (e) { console.warn("[HoloPlayer] startTracking error:", e); }
      enterRef.current();
    });
    return unsubscribe;
  }, []);

  // Web Audio starts suspended without a user gesture — resume on the first interaction.
  useEffect(() => {
    const resume = () => resumeAudio();
    window.addEventListener("pointerdown", resume, { once: true });
    window.addEventListener("keydown", resume, { once: true });
    return () => { window.removeEventListener("pointerdown", resume); window.removeEventListener("keydown", resume); };
  }, []);

  const dim = view !== "home" && view !== "music" && view !== "news" && view !== "rundown";

  // Face-HUD framing (Level 1): a fixed face "window" the HUD wraps around.
  // Tune these to fit your framing — Level 2 will drive them live from FaceMesh.
  const faceVars = {
    ["--face-x" as any]: "50%",   // horizontal center of your face
    ["--face-y" as any]: "44%",   // vertical center (lower = further down)
    ["--face-rx" as any]: "15%",  // half-width of the clear window
    ["--face-ry" as any]: "23%",  // half-height of the clear window
  };
  const faceMask = "radial-gradient(ellipse var(--face-rx) var(--face-ry) at var(--face-x) var(--face-y), transparent 30%, rgba(0,0,0,.5) 70%, #000 100%)";

  return (
    <div className="fixed inset-0 bg-black overflow-hidden" style={faceVars}>
      {/* webcam — lightly graded so the face reads as "lit by the HUD" */}
      <video ref={videoRef} id="holo-cam" className="absolute inset-0 w-full h-full object-cover" style={{ transform: "scaleX(-1)", filter: "brightness(1.06) contrast(1.06) saturate(1.06)" }} playsInline muted />

      {/* spotlight: keep the face bright in the center, darken the surround so the peripheral HUD glows */}
      <div className="absolute inset-0 transition-all duration-500" style={{
        background: dim
          ? "rgba(2,6,12,.72)"
          : "radial-gradient(ellipse 62% 74% at var(--face-x) var(--face-y), transparent 34%, rgba(2,8,14,.55) 78%, rgba(1,5,10,.82) 100%)",
      }} />

      {/* holographic HUD video — screen blend drops the black; the radial mask punches a clear window over the face so the UI frames it instead of covering it */}
      <video
        src={import.meta.env.BASE_URL + "hud-bg.mp4"}
        autoPlay loop muted playsInline
        className="absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-500"
        style={{
          mixBlendMode: "screen",
          opacity: dim ? 0.18 : 0.62,
          // soft-focus the AI-generated HUD so its fake/garbled micro-text reads as glow, not nonsense words
          filter: "blur(1.1px) saturate(1.12)",
          maskImage: faceMask,
          WebkitMaskImage: faceMask,
        }}
      />

      {/* Dynamic tracking orbital rings around the face (hidden inside apps) */}
      {!dim && (
        <>
          {/* Inner solid pulsating ring */}
          <div className="absolute pointer-events-none transition-opacity duration-500" style={{
            left: "var(--face-x)", top: "var(--face-y)", width: "27vw", height: "40.5vh",
            transform: "translate(-50%, -50%)", borderRadius: "50%",
            border: "1.5px solid rgba(95,230,255,.32)",
            boxShadow: "inset 0 0 60px rgba(95,230,255,.16), 0 0 40px rgba(95,230,255,.10)",
            animation: "pulseGlow 2.5s ease-in-out infinite",
          }} />
          {/* Middle dashed clockwise ring */}
          <div className="absolute pointer-events-none transition-opacity duration-500" style={{
            left: "var(--face-x)", top: "var(--face-y)", width: "31vw", height: "46.5vh",
            transform: "translate(-50%, -50%)", borderRadius: "50%",
            border: "1px dashed rgba(95,230,255,.24)",
            animation: "rotateCW 24s linear infinite",
          }} />
          {/* Outer dotted counter-clockwise ring */}
          <div className="absolute pointer-events-none transition-opacity duration-500" style={{
            left: "var(--face-x)", top: "var(--face-y)", width: "35vw", height: "52.5vh",
            transform: "translate(-50%, -50%)", borderRadius: "50%",
            border: "1.2px dotted rgba(168,85,247,.22)",
            animation: "rotateCCW 32s linear infinite",
          }} />
          {/* Tech crosshairs targeting ticks overlay */}
          <div className="absolute pointer-events-none transition-opacity duration-500" style={{
            left: "var(--face-x)", top: "var(--face-y)", width: "33vw", height: "49.5vh",
            transform: "translate(-50%, -50%)", borderRadius: "50%",
            border: "3px double rgba(95,230,255,.12)",
            clipPath: "polygon(48% 0%, 52% 0%, 52% 100%, 48% 100%, 0% 48%, 0% 52%, 100% 52%, 100% 48%)",
          }} />
        </>
      )}

      {started && view !== "rundown" && view !== "chordlab" && <HandFX />}

      <Canvas camera={{ position: [0, 0, 0.12], fov: 74 }} dpr={[1, 2]} gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }} className="absolute inset-0 z-10">
        {!WINDOW_MENU && view === "home" && <Home />}
        {view === "music" && <MusicApp />}
        {view === "news" && <NewsCarousel items={newsItems} />}
      </Canvas>

      {started && WINDOW_MENU && view === "home" && <WindowMenu />}

      {booting && <BootSequence onDone={() => setBooting(false)} />}
      {started && <HudChrome />}
      {started && <Overlay view={view} />}
      {started && <GlobalVoiceAgent />}

      {started && view === "robot" && <RobotApp />}
      {started && view === "photobox" && <PhotoboxApp />}
      {started && view === "rundown" && <RundownApp />}
      {started && view === "chordlab" && <ChordLabApp />}
      {started && view === "news" && <NewsApp />}



      {err && (
        <div style={{
          position: "absolute", bottom: 18, left: "50%", transform: "translateX(-50%)", zIndex: 60,
          color: "#9fe8ff", background: "rgba(2,8,14,.72)", border: "1px solid rgba(95,230,255,.3)",
          borderRadius: 20, padding: "8px 16px", fontSize: 13, letterSpacing: ".04em"
        }}>{err} ✋</div>
      )}
    </div>
  );
}
