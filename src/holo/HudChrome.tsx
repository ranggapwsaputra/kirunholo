// HudChrome.tsx — Futuristic JARVIS-style HUD chrome overlay with vector graphics & live-looking telemetry
import { useEffect, useState } from "react";

export default function HudChrome() {
  const [secVal, setSecVal] = useState(0);

  // Generate slight variance in numerical readouts to make it feel alive
  useEffect(() => {
    const t = setInterval(() => {
      setSecVal(Math.floor(Math.random() * 100));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="hud">
      {/* ── Outer Bracket Corners ── */}
      <span className="br tl" />
      <span className="br tr" />
      <span className="br bl" />
      <span className="br br2" />

      {/* ── Status Text Labels ── */}
      {/* ── Top-Left World Map / Mockup Info Panel (Fits exact red box bounds) ── */}
      <div style={{
        position: "absolute", left: 16, top: 16,
        width: 420, height: 195,
        border: "1.5px solid rgba(255,60,60,.85)",
        borderRadius: 8,
        background: "linear-gradient(135deg, rgba(28,5,8,.94), rgba(12,3,5,.96))",
        boxShadow: "0 0 22px rgba(255,40,40,.38), inset 0 0 24px rgba(255,30,30,.14)",
        backdropFilter: "blur(12px)",
        padding: "12px 14px",
        pointerEvents: "none",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        justify: "space-between",
        zIndex: 2,
      }}>
        {/* Futuristic scanline overlay */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,.02) 3px, rgba(255,255,255,.02) 4px)",
        }} />
        
        {/* Corner tech accents */}
        <div style={{ position: "absolute", top: 0, right: 0, width: 22, height: 22,
          borderTop: "2.5px solid rgba(255,90,90,.95)", borderRight: "2.5px solid rgba(255,90,90,.95)" }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, width: 22, height: 22,
          borderBottom: "2.5px solid rgba(255,90,90,.75)", borderLeft: "2.5px solid rgba(255,90,90,.75)" }} />

        {/* Header Bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{
              fontSize: 9, fontWeight: 900, letterSpacing: ".14em",
              color: "#ffffff", background: "linear-gradient(90deg, #ff2222, #ff5533)",
              borderRadius: 3, padding: "2px 7px",
              boxShadow: "0 0 10px rgba(255,40,40,.8)",
            }}>⚠️ DUMMY MOCKUP</span>
            <span style={{ fontSize: 8, color: "rgba(255,180,180,.8)", letterSpacing: ".08em", fontFamily: "monospace" }}>
              [CONCEPT_DEMO]
            </span>
          </div>
          <span style={{ fontSize: 8, color: "rgba(95,230,255,.8)", letterSpacing: ".12em", fontFamily: "monospace", fontWeight: 700 }}>
            K.I.R.U.N · v0.6 [KIRUN_CORE]
          </span>
        </div>

        {/* Main Title & Subtitle */}
        <div>
          <div style={{
            fontSize: 13, fontWeight: 900, letterSpacing: ".09em",
            color: "#ffffff", textShadow: "0 0 12px rgba(255,80,80,.7)",
            lineHeight: 1.2,
          }}>
            HOLOGRAPHIC CONCIERGE AGENT
          </div>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: "#5fe6ff", letterSpacing: ".05em", marginTop: 2 }}>
            Interactive AI Information &amp; Concierge System
          </div>
        </div>

        {/* Explicit Dummy / Mockup Disclaimer Box */}
        <div style={{
          fontSize: 9.5, color: "rgba(240,248,255,.92)", letterSpacing: ".01em",
          lineHeight: 1.45, background: "rgba(0,0,0,.42)", padding: "6px 10px",
          borderRadius: 5, borderLeft: "3px solid #ff5555"
        }}>
          📌 <b style={{ color: "#ff8b8b" }}>PROTOTYPE / DUMMY ONLY:</b> Tampilan ini adalah <b style={{ color: "#ffd278" }}>mockup demonstrasi konsep</b>. Seluruh fitur, navigasi suara, visual UI, &amp; modul dapat <b style={{ color: "#5fe6ff" }}>dikustomisasi 100%</b> menyesuaikan kebutuhan event/bisnis Anda.
        </div>

        {/* Modular Capability Tags */}
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {["🎙️ Live Voice AI", "✋ Motion FX", "⚙️ Fully Customizable", "⚡ Flexible Integration"].map((tag) => (
            <span key={tag} style={{
              fontSize: 8, fontWeight: 800, letterSpacing: ".03em",
              color: "rgba(220,245,255,.95)",
              background: "rgba(95,230,255,.14)",
              border: "1px solid rgba(95,230,255,.35)",
              borderRadius: 4, padding: "2px 6px",
            }}>{tag}</span>
          ))}
        </div>
      </div>

      {/* ── Left Sidebar: Atmospheric Analysis & Pulse Telemetry ── */}

      <div style={{
        position: "absolute", left: 24, top: "25%", bottom: "25%", width: 140,
        display: "flex", flexDirection: "column", justifyContent: "space-between",
        color: "rgba(95,230,255,.45)", fontSize: 8, fontFamily: "monospace",
        letterSpacing: ".12em", pointerEvents: "none", textShadow: "0 0 6px rgba(95,230,255,.2)",
      }}>
        <div>
          <div style={{ borderBottom: "1px solid rgba(95,230,255,.25)", paddingBottom: 4, marginBottom: 6, fontWeight: 900, color: "rgba(95,230,255,.8)" }}>ATMOSPHERIC ANALYSIS</div>
          <div>CO2: 0.04%</div>
          <div>O2: 20.9%</div>
          <div>HUMID: 52%</div>
          {/* Micro SVG Waveform */}
          <svg width="100" height="24" style={{ marginTop: 8, opacity: 0.85 }}>
            <path d="M0,12 Q15,4 30,12 T60,12 T90,12" fill="none" stroke="#5fe6ff" strokeWidth="1" strokeDasharray="3 2" />
            <path d="M0,12 Q15,2 30,12 T60,12 T90,12" fill="none" stroke="#5fe6ff" strokeWidth="1" opacity="0.5" />
          </svg>
        </div>

        <div>
          <div style={{ borderBottom: "1px solid rgba(95,230,255,.25)", paddingBottom: 4, marginBottom: 6, fontWeight: 900, color: "rgba(95,230,255,.8)" }}>RADAR SATELLITE</div>
          <div>RANGE: 4.8m</div>
          <div>SWEEP: 360°</div>
          <div style={{ display: "flex", gap: 3, marginTop: 6 }}>
            {Array.from({ length: 12 }).map((_, idx) => (
              <span key={idx} style={{
                width: 4, height: 8,
                background: idx < 8 ? "#5fe6ff" : "rgba(95,230,255,.15)",
                boxShadow: idx < 8 ? "0 0 6px #5fe6ff" : "none",
                borderRadius: 1,
              }} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Right Sidebar: Signal Strength & Data Analysis ── */}
      <div style={{
        position: "absolute", right: 24, top: "25%", bottom: "25%", width: 140,
        display: "flex", flexDirection: "column", justifyContent: "space-between",
        alignItems: "flex-end",
        color: "rgba(95,230,255,.45)", fontSize: 8, fontFamily: "monospace",
        letterSpacing: ".12em", pointerEvents: "none", textShadow: "0 0 6px rgba(95,230,255,.2)",
      }}>
        <div style={{ textAlign: "right" }}>
          <div style={{ borderBottom: "1px solid rgba(95,230,255,.25)", paddingBottom: 4, marginBottom: 6, fontWeight: 900, color: "rgba(95,230,255,.8)" }}>SENSOR FEED</div>
          <div>TF_DB: 5.86-AC</div>
          <div>FPS: 60</div>
          <div>LATENCY: 14.2ms</div>
          {/* Micro Telemetry Graph */}
          <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 28, marginTop: 8, width: 80, marginLeft: "auto" }}>
            {[12, 18, 8, 22, 14, 26, 16, 20, 10, 24].map((h, i) => (
              <div key={i} style={{
                flex: 1, height: h,
                background: "rgba(95,230,255,.45)",
                boxShadow: "0 0 4px rgba(95,230,255,.3)",
              }} />
            ))}
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ borderBottom: "1px solid rgba(95,230,255,.25)", paddingBottom: 4, marginBottom: 6, fontWeight: 900, color: "rgba(95,230,255,.8)" }}>DATA ANALYSIS</div>
          <div>CORE_T: 44.2°C</div>
          <div>LOAD: 12.8%</div>
          <div style={{ display: "flex", gap: 3, marginTop: 6, justifyContent: "flex-end" }}>
            {Array.from({ length: 8 }).map((_, idx) => (
              <span key={idx} style={{
                width: 8, height: 4,
                background: idx < 6 ? "#5fe6ff" : "rgba(95,230,255,.15)",
                boxShadow: idx < 6 ? "0 0 6px #5fe6ff" : "none",
                borderRadius: 1,
              }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
