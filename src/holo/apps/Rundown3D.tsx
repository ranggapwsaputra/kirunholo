import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { hand, ui } from "../handState";
import { fx, startThrow, endThrow, appView } from "../appStore";
import type { RundownItem } from "./RundownApp";

const R = 5.8; // 3D spatial carousel radius
const HOLD = 0.85;
const POINT_HOLD = 0.4;
const POINT_MAXV = 0.02;
const GAIN_MULT = 3.5;

export const rundownRig = { rotY: 0, targetRotY: 0, focusIndex: 0 };
const wrapN = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

function RundownController3D({ count, onSelect }: { count: number; onSelect: (i: number) => void }) {
  const held = useRef(0);
  const pointHeld = useRef(0);
  const fired = useRef(false);
  const grabbing = useRef(false);
  const grabX0 = useRef(0);
  const grabRot0 = useRef(0);
  const STEP = (Math.PI * 2) / count;
  const GAIN = GAIN_MULT * STEP;

  useFrame(({ camera }, dt) => {
    // Fist hold -> exit to home
    if (!fx.closing) {
      if (hand.present && hand.grab) {
        held.current += dt;
        ui.exitProgress = Math.min(1, held.current / HOLD);
        if (held.current >= HOLD) startThrow();
      } else {
        held.current = 0;
        ui.exitProgress = 0;
      }
    }

    // Pinch-drag / gesture drag to spin the 3D hologram ring
    if (!fx.closing && grabbing.current && (!hand.present || hand.pinchDist > 0.1)) {
      grabbing.current = false;
      rundownRig.targetRotY = Math.round(rundownRig.targetRotY / STEP) * STEP;
    } else if (!fx.closing && !grabbing.current && hand.present && hand.pinch && hand.pinchDist < 0.06) {
      grabbing.current = true;
      grabX0.current = hand.x;
      grabRot0.current = rundownRig.targetRotY;
    }

    if (grabbing.current) {
      rundownRig.targetRotY = grabRot0.current - (hand.x - grabX0.current) * GAIN;
      pointHeld.current = 0;
      ui.pointProgress = 0;
      fired.current = false;
    }

    // Smooth rotation lerp
    rundownRig.rotY += (rundownRig.targetRotY - rundownRig.rotY) * 0.16;

    // Determine focused 3D card
    let best = 0, bd = 99;
    for (let i = 0; i < count; i++) {
      const d = Math.abs(wrapN((i / count) * Math.PI * 2 + rundownRig.rotY));
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    rundownRig.focusIndex = best;

    // Camera gently follows hand Y
    const ty = hand.present ? (0.5 - hand.y) * 0.5 : 0;
    camera.position.y += (ty - camera.position.y) * 0.06;
    camera.lookAt(0, camera.position.y * 0.4, -R);

    // Point gesture selection
    if (!fx.closing) {
      const speed = Math.hypot(hand.vx, hand.vy);
      const steady = hand.present && hand.point && !hand.grab && !hand.pinch && !grabbing.current && speed < POINT_MAXV;
      if (steady) {
        pointHeld.current += dt;
        ui.pointProgress = Math.min(1, pointHeld.current / POINT_HOLD);
        if (pointHeld.current >= POINT_HOLD && !fired.current) {
          fired.current = true;
          onSelect(best);
        }
      } else {
        pointHeld.current = 0;
        ui.pointProgress = 0;
        fired.current = false;
      }
    } else if (performance.now() - fx.t0 > 520) {
      endThrow();
      ui.exitProgress = 0;
      appView.set("home");
    }
  });

  return null;
}

function RundownCard3D({ item, i, count, onSelect }: { item: RundownItem; i: number; count: number; onSelect: (i: number) => void }) {
  const group = useRef<THREE.Group>(null);
  const el = useRef<HTMLDivElement>(null);
  const scl = useRef(0.48);
  const base = (i / count) * Math.PI * 2;

  useFrame(({ camera }) => {
    const g = group.current;
    if (!g) return;
    const a = base + rundownRig.rotY;

    if (fx.closing) {
      const e = Math.min(1, (performance.now() - fx.t0) / 520);
      g.position.set(Math.sin(a) * R, 0, -Math.cos(a) * R);
      g.lookAt(camera.position);
      g.scale.setScalar(Math.max(0.001, (1 - e) * scl.current));
      if (el.current) el.current.style.opacity = String(1 - e);
      return;
    }

    g.position.set(Math.sin(a) * R, 0, -Math.cos(a) * R);
    g.lookAt(camera.position);

    const focused = rundownRig.focusIndex === i;
    const isLive = item.status === "live";
    const target = focused ? (isLive ? 0.95 : 0.86) : 0.44;
    scl.current += (target - scl.current) * 0.14;
    g.scale.setScalar(scl.current);
  });

  const isLive = item.status === "live";
  const isDone = item.status === "completed";

  return (
    <group ref={group}>
      <Html transform distanceFactor={9} zIndexRange={[10, 0]} style={{ pointerEvents: "auto" }}>
        <div
          ref={el}
          onClick={() => onSelect(i)}
          className={`rd3d-card ${isLive ? "live" : isDone ? "done" : ""}`}
          style={{
            width: 290,
            borderRadius: 20,
            padding: 16,
            background: isLive
              ? "linear-gradient(155deg, rgba(6, 40, 28, 0.92), rgba(3, 12, 22, 0.96))"
              : "linear-gradient(155deg, rgba(8, 20, 36, 0.90), rgba(3, 8, 16, 0.94))",
            border: isLive ? "2px solid #10b981" : "1.5px solid rgba(56, 189, 248, 0.4)",
            boxShadow: isLive
              ? "0 0 35px rgba(16, 185, 129, 0.5), inset 0 0 25px rgba(16, 185, 129, 0.2)"
              : "0 0 25px rgba(56, 189, 248, 0.25), inset 0 0 15px rgba(56, 189, 248, 0.1)",
            color: "#fff",
            fontFamily: "monospace",
            cursor: "pointer",
            backdropFilter: "blur(12px)",
            userSelect: "none"
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: "bold", color: isLive ? "#34d399" : "#38bdf8" }}>
              ⏰ {item.time} WIB
            </span>
            <span
              style={{
                fontSize: 9,
                fontWeight: "bold",
                padding: "2px 8px",
                borderRadius: 10,
                background: isLive ? "rgba(16, 185, 129, 0.25)" : isDone ? "rgba(255, 255, 255, 0.1)" : "rgba(56, 189, 248, 0.2)",
                color: isLive ? "#34d399" : isDone ? "#94a3b8" : "#7dd3fc",
                border: isLive ? "1px solid #10b981" : "1px solid rgba(56, 189, 248, 0.3)"
              }}
            >
              {isLive ? "🔴 LIVE NOW" : isDone ? "COMPLETED" : "UPCOMING"}
            </span>
          </div>

          {/* Title */}
          <h3 style={{ fontSize: 13, fontWeight: "bold", lineHeight: 1.35, color: "#fff", marginBottom: 6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {item.title}
          </h3>

          {/* Speaker */}
          {item.speaker && (
            <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 8 }}>
              👤 <strong style={{ color: "#e2e8f0" }}>{item.speaker}</strong>
            </div>
          )}

          {/* Location & Stage */}
          <div style={{ fontSize: 9, color: "#38bdf8", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
            <span>📍 {item.location}</span>
            <span style={{ color: "#a5f3fc" }}>PROYEKSI 3D ➔</span>
          </div>
        </div>
      </Html>
    </group>
  );
}

export default function Rundown3D({ items, onSelect }: { items: RundownItem[]; onSelect: (item: RundownItem) => void }) {
  if (items.length === 0) return null;

  return (
    <>
      <ambientLight intensity={1.2} />
      <directionalLight position={[0, 5, 10]} intensity={1.5} />
      <RundownController3D count={items.length} onSelect={(i) => onSelect(items[i])} />
      {items.map((it, i) => (
        <RundownCard3D key={it.id || i} item={it} i={i} count={items.length} onSelect={() => onSelect(it)} />
      ))}
    </>
  );
}
