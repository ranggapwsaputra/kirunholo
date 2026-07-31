import { useState, useEffect, useRef } from "react";
import { Clock, Calendar, MapPin, User, Search, Layers, Radio, Activity, ChevronRight, X, Sparkles, Share2, ShieldCheck, Hand } from "lucide-react";
import { blip } from "../boot";
import { useExit } from "../useExit";
import { hand } from "../handState";

export interface RundownItem {
  id: string;
  time: string; // e.g. "09.00 – 10.00"
  title: string;
  speaker?: string;
  role?: string;
  location: string;
  stage: "Main Stage" | "Partner Session" | "Break & Expo" | "Ceremony";
  status: "upcoming" | "live" | "completed";
  description: string;
  tags: string[];
}

export const HITA_RUNDOWN: RundownItem[] = [
  {
    id: "hita-1",
    time: "09.00 – 10.00",
    title: "Registrasi & Coffee Break",
    speaker: "Panitia HITA INDONESIA",
    role: "Registration Crew",
    location: "Foyer Ballroom Angsana 2-3",
    stage: "Break & Expo",
    status: "upcoming",
    description: "Registrasi ulang peserta conference, pengambilan ID Card, dan menikmati hidangan coffee break 60 menit.",
    tags: ["Registration", "Coffee Break"]
  },
  {
    id: "hita-2",
    time: "10.00 – 10.10",
    title: "Pre Opening + DOA",
    speaker: "MC",
    role: "Master of Ceremony",
    location: "Ballroom Angsana 2-3",
    stage: "Ceremony",
    status: "upcoming",
    description: "Pembukaan acara oleh MC dilanjutkan doa bersama untuk kelancaran HITA INDONESIA IT Conference 2026.",
    tags: ["Pre-Opening", "Doa"]
  },
  {
    id: "hita-3",
    time: "10.10 – 10.15",
    title: "Opening INDONESIA RAYA Song",
    speaker: "Seluruh Peserta",
    role: "National Anthem",
    location: "Ballroom Angsana 2-3",
    stage: "Ceremony",
    status: "upcoming",
    description: "Menyanyikan lagu kebangsaan Indonesia Raya secara bersama-sama dalam khidmat.",
    tags: ["National Anthem"]
  },
  {
    id: "hita-4",
    time: "10.15 – 10.20",
    title: "Opening + Launching AI KIRUN",
    speaker: "R.A.V.A Team & AI KIRUN",
    role: "AI Spatial Launch",
    location: "Ballroom Angsana 2-3",
    stage: "Main Stage",
    status: "upcoming",
    description: "Peluncuran resmi AI KIRUN (R.A.V.A OS 0.6) sebagai asisten kecerdasan buatan terintegrasi hospitality modern.",
    tags: ["AI Launch", "KIRUN", "Highlight"]
  },
  {
    id: "hita-5",
    time: "10.20 – 10.25",
    title: "Traditional Dance Performance",
    speaker: "Sanggar Eschoda",
    role: "Cultural Dancers",
    location: "Ballroom Angsana 2-3",
    stage: "Ceremony",
    status: "upcoming",
    description: "Pertunjukan tarian tradisional sambutan khas Nusantara oleh Sanggar Eschoda selama 5 menit.",
    tags: ["Traditional Dance", "Performance"]
  },
  {
    id: "hita-6",
    time: "10.25 – 10.30",
    title: "Opening Speech by Chairman HITA INDONESIA",
    speaker: "Chairman HITA INDONESIA",
    role: "HITA Executive Board",
    location: "Ballroom Angsana 2-3",
    stage: "Main Stage",
    status: "upcoming",
    description: "Sambutan hangat dari Ketua Umum HITA INDONESIA menyambut seluruh profesional IT Hospitality.",
    tags: ["Opening Speech", "HITA Board"]
  },
  {
    id: "hita-7",
    time: "10.30 – 11.00",
    title: "Opening Speech by Advisor HITA INDONESIA",
    speaker: "Albertus & Tatang Saputra",
    role: "Advisor HITA INDONESIA",
    location: "Ballroom Angsana 2-3",
    stage: "Main Stage",
    status: "upcoming",
    description: "Keynote perihal 'Technology as The Backbone of Modern Hospitality' selama 30 menit.",
    tags: ["Keynote", "Hospitality IT"]
  },
  {
    id: "hita-8",
    time: "11.00 – 11.30",
    title: "Presentation Partner: PT. Suriah Solusi Indonesia",
    speaker: "PT. Suriah Solusi Indonesia Team",
    role: "Technology Partner",
    location: "Ballroom Angsana 2-3",
    stage: "Partner Session",
    status: "upcoming",
    description: "Presentasi solusi inovasi teknologi IT infrastruktur perhotelan modern 30 menit.",
    tags: ["Partner Presentation", "Hospitality Tech"]
  },
  {
    id: "hita-9",
    time: "11.30 – 11.45",
    title: "Presentation Partner: PT Link Net Tbk",
    speaker: "Barly Wicaksono",
    role: "Head of Core Product Management & Development Linknet",
    location: "Ballroom Angsana 2-3",
    stage: "Partner Session",
    status: "upcoming",
    description: "Paparan solusi jaringan internet berkecepatan tinggi & layanan enterprise untuk hotel.",
    tags: ["Linknet", "Connectivity"]
  },
  {
    id: "hita-10",
    time: "11.45 – 13.00",
    title: "ISHOMA & Interactive Booth Visit (Session 1)",
    speaker: "Seluruh Peserta & Sponsor",
    role: "Break & Expo",
    location: "Dining & Expo Area Ballroom Angsana 2-3",
    stage: "Break & Expo",
    status: "upcoming",
    description: "Istirahat, Sholat, Makan Siang (75 menit) serta kunjungan interaktif ke booth pameran partner teknologi.",
    tags: ["ISHOMA", "Booth Visit", "Networking"]
  },
  {
    id: "hita-11",
    time: "13.00 – 13.15",
    title: "Session 2 Opening: Traditional Dance + DoorPrize",
    speaker: "Sanggar Eschoda & MC",
    role: "Performers & MC",
    location: "Ballroom Angsana 2-3",
    stage: "Ceremony",
    status: "upcoming",
    description: "Pembukaan sesi siang dengan tari tradisional Sanggar Eschoda dan pengundian DoorPrize sesi 2.",
    tags: ["Dance", "DoorPrize"]
  },
  {
    id: "hita-12",
    time: "13.15 – 13.30",
    title: "Penyampaian VISI / MISI Calon Ketua HITA Jakarta",
    speaker: "Calon Ketua HITA Jakarta",
    role: "HITA Candidate",
    location: "Ballroom Angsana 2-3",
    stage: "Main Stage",
    status: "upcoming",
    description: "Pemaparan Visi & Misi calon Ketua HITA Jakarta periode mendatang selama 15 menit.",
    tags: ["Visi Misi", "HITA Jakarta"]
  },
  {
    id: "hita-13",
    time: "13.30 – 13.45",
    title: "Presentation Partner: MSS (Mitra Satu Solusi) Ruckus | Virtus",
    speaker: "Yanuar Gunadi",
    role: "Technical Senior Manager dari MSS (Mitra Satu Solusi)",
    location: "Ballroom Angsana 2-3",
    stage: "Partner Session",
    status: "upcoming",
    description: "Presentasi solusi enterprise Wi-Fi Ruckus & Virtus infrastruktur IT perhotelan.",
    tags: ["MSS", "Ruckus", "Wi-Fi"]
  },
  {
    id: "hita-14",
    time: "13.45 – 14.00",
    title: "Presentation Partner: PT. Varnion Technology Semesta (Varnion)",
    speaker: "Lily Tjia",
    role: "Vice President Hospitality & Property Solutions",
    location: "Ballroom Angsana 2-3",
    stage: "Partner Session",
    status: "upcoming",
    description: "Pemaparan solusi jaringan pintar Varnion khusus sektor hospitality & properti.",
    tags: ["Varnion", "Hospitality Solutions"]
  },
  {
    id: "hita-15",
    time: "14.00 – 14.20",
    title: "Presentation Partner: PT. Inovasi Kloud Konsultasi (Tridorian)",
    speaker: "Evan Febrianto",
    role: "Chief Technology Officer",
    location: "Ballroom Angsana 2-3",
    stage: "Partner Session",
    status: "upcoming",
    description: "Presentasi solusi Cloud Infrastructure & Digital Transformation Tridorian 20 menit.",
    tags: ["Cloud Tech", "Tridorian"]
  },
  {
    id: "hita-16",
    time: "14.20 – 14.25",
    title: "Fun Games + DoorPrize Sesi 3",
    speaker: "MC",
    role: "Entertainment",
    location: "Ballroom Angsana 2-3",
    stage: "Ceremony",
    status: "upcoming",
    description: "Kuis interaktif games berhadiah doorprize menarik bagi peserta aktif.",
    tags: ["Games", "DoorPrize"]
  },
  {
    id: "hita-17",
    time: "14.25 – 14.35",
    title: "Presentation Partner: PT. Makmur Abadi Senantiasa (Hiview)",
    speaker: "Hiview Indonesia Team",
    role: "Technology Partner",
    location: "Ballroom Angsana 2-3",
    stage: "Partner Session",
    status: "upcoming",
    description: "Sesi presentasi produk pengawasan pintar Hiview untuk keamanan hotel modern.",
    tags: ["Hiview", "Security Systems"]
  },
  {
    id: "hita-18",
    time: "14.35 – 14.50",
    title: "Presentation Partner: PT. Fiber Networks Indonesia (Fibernet)",
    speaker: "Ibnu Azhar",
    role: "Head of Solution",
    location: "Ballroom Angsana 2-3",
    stage: "Partner Session",
    status: "upcoming",
    description: "Paparan solusi serat optik dedicated Fibernet untuk efisiensi jaringan hotel.",
    tags: ["Fibernet", "Fiber Optics"]
  },
  {
    id: "hita-19",
    time: "14.50 – 15.05",
    title: "Presentation Partner: PT. AFC Prima Indonesia",
    speaker: "PT. AFC Prima Indonesia Team",
    role: "Technology Partner",
    location: "Ballroom Angsana 2-3",
    stage: "Partner Session",
    status: "upcoming",
    description: "Presentasi sistem integrasi perangkat keras & perangkat lunak perhotelan 15 menit.",
    tags: ["AFC Prima", "Hardware Tech"]
  },
  {
    id: "hita-20",
    time: "15.05 – 16.00",
    title: "ISHOMA & Expo Booth Exploration (Session 2)",
    speaker: "Seluruh Peserta & Partner",
    role: "Break & Expo",
    location: "Dining & Expo Area Ballroom Angsana 2-3",
    stage: "Break & Expo",
    status: "upcoming",
    description: "Istirahat sholat sore (55 menit), kopi sore, dan kesempatan berdiskusi intensif di booth pameran.",
    tags: ["ISHOMA", "Booth Exploration"]
  },
  {
    id: "hita-21",
    time: "16.00 – 16.10",
    title: "Grand DoorPrize Announcement Sesi 4",
    speaker: "MC & Panitia",
    role: "Host",
    location: "Ballroom Angsana 2-3",
    stage: "Ceremony",
    status: "upcoming",
    description: "Pengundian doorprize utama sesi sore bagi para peserta yang beruntung.",
    tags: ["DoorPrize", "Grand Draw"]
  },
  {
    id: "hita-22",
    time: "16.10 – 16.20",
    title: "Pengumuman Ketua Terpilih HITA Jakarta",
    speaker: "Panitia Pemilihan HITA",
    role: "Election Committee",
    location: "Ballroom Angsana 2-3",
    stage: "Main Stage",
    status: "upcoming",
    description: "Pengumuman resmi hasil pemungutan suara Ketua HITA Jakarta terpilih.",
    tags: ["Pengumuman Ketua", "HITA Election"]
  },
  {
    id: "hita-23",
    time: "16.20 – 16.40",
    title: "Closing Ceremony, Penyerahan Plakat & Grand DoorPrize Photo",
    speaker: "Seluruh Pengurus & Partner",
    role: "Executive Committee",
    location: "Ballroom Angsana 2-3",
    stage: "Ceremony",
    status: "upcoming",
    description: "Penutupan resmi conference, penyerahan plakat penghargaan partner, penyerahan Grand Doorprize, & foto bersama.",
    tags: ["Closing", "Plakat", "Grand Photo"]
  }
];

const STAGES = ["ALL", "Main Stage", "Partner Session", "Break & Expo", "Ceremony"] as const;

// Helper to convert "HH.MM" or "HH:MM" to total minutes of day
function parseTimeToMinutes(tStr: string): number {
  const clean = (tStr || "").trim().replace(".", ":");
  const parts = clean.split(":");
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

// Get current Date in Indonesian Time (WIB - Asia/Jakarta)
function getWibDate(): Date {
  const now = new Date();
  const wibString = now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" });
  return new Date(wibString);
}

// Automatic calculation of session status based on WIB time
function calculateSessionStatus(timeRange: string, nowWib: Date): "upcoming" | "live" | "completed" {
  const parts = timeRange.split(/–|-/);
  if (parts.length < 2) return "upcoming";

  const startMins = parseTimeToMinutes(parts[0]);
  const endMins = parseTimeToMinutes(parts[1]);
  const currentMins = nowWib.getHours() * 60 + nowWib.getMinutes();

  if (currentMins < startMins) {
    return "upcoming";
  } else if (currentMins >= startMins && currentMins < endMins) {
    return "live";
  } else {
    return "completed";
  }
}

export default function RundownApp() {
  useExit(); // fist gesture exit to home

  const [rundownList, setRundownList] = useState<RundownItem[]>(HITA_RUNDOWN);
  const [selectedStage, setSelectedStage] = useState<string>("ALL");
  const [activeItem, setActiveItem] = useState<RundownItem | null>(null);
  const activeItemRef = useRef<RundownItem | null>(null);
  activeItemRef.current = activeItem;

  const [searchTerm, setSearchTerm] = useState("");
  const [currentTimeStr, setCurrentTimeStr] = useState("");
  const [copiedNote, setCopiedNote] = useState(false);

  // Spatial Hand Tracking Camera Hover & Dwell Auto-Open State
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [pointProgress, setPointProgress] = useState(0);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Clock ticker + automatic real-time WIB status updater
  useEffect(() => {
    const updateTimeAndStatuses = () => {
      const wibNow = getWibDate();
      const h = String(wibNow.getHours()).padStart(2, "0");
      const m = String(wibNow.getMinutes()).padStart(2, "0");
      const s = String(wibNow.getSeconds()).padStart(2, "0");
      setCurrentTimeStr(`${h}:${m}:${s} WIB`);

      setRundownList((prev) =>
        prev.map((item) => {
          const autoStatus = calculateSessionStatus(item.time, wibNow);
          if (item.status !== autoStatus) {
            return { ...item, status: autoStatus };
          }
          return item;
        })
      );
    };

    updateTimeAndStatuses();
    const interval = setInterval(updateTimeAndStatuses, 1000);
    return () => clearInterval(interval);
  }, []);

  // Spatial Hand Tracking Collision Loop (Point finger on camera -> auto open hologram detail)
  useEffect(() => {
    let raf = 0;
    let currentHovered: string | null = null;
    let dwellTime = 0;
    let fired = false;
    let lastTime = performance.now();

    const loop = () => {
      raf = requestAnimationFrame(loop);
      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      // PAUSE card selection loop while a Hologram Detail Modal is open!
      if (activeItemRef.current) {
        if (currentHovered !== null) {
          currentHovered = null;
          setHoveredCardId(null);
          setPointProgress(0);
        }
        return;
      }

      if (!hand.present) {
        if (currentHovered !== null) {
          currentHovered = null;
          setHoveredCardId(null);
          setPointProgress(0);
        }
        return;
      }

      const cx = hand.x * window.innerWidth;
      const cy = hand.y * window.innerHeight;

      let detected: string | null = null;
      for (const [id, el] of Object.entries(cardRefs.current)) {
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (cx >= rect.left && cx <= rect.right && cy >= rect.top && cy <= rect.bottom) {
          detected = id;
          break;
        }
      }

      if (detected !== currentHovered) {
        currentHovered = detected;
        setHoveredCardId(currentHovered);
        dwellTime = 0;
        fired = false;
        setPointProgress(0);
        if (currentHovered) blip(400);
      }

      if (currentHovered && !fired) {
        dwellTime += dt;
        const prog = Math.min(1, dwellTime / 0.55); // 0.55 second dwell timer
        setPointProgress(prog);

        if (prog >= 1 && !fired) {
          fired = true;
          const foundItem = HITA_RUNDOWN.find((i) => i.id === currentHovered);
          if (foundItem) {
            blip(900);
            setActiveItem(foundItem);
          }
        }
      }
    };

    loop();
    return () => cancelAnimationFrame(raf);
  }, []);

  const filteredItems = rundownList.filter((item) => {
    const matchStage = selectedStage === "ALL" || item.stage === selectedStage;
    const matchSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.speaker?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.location.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStage && matchSearch;
  });

  const liveItem = rundownList.find((i) => i.status === "live");

  const copyNoteToClipboard = (item: RundownItem) => {
    const noteText = `[HITA CONF 2026] ${item.time} WIB - ${item.title}\nLocation: ${item.location}\nSpeaker: ${item.speaker || "-"}`;
    try {
      navigator.clipboard.writeText(noteText);
      setCopiedNote(true);
      blip(900);
      setTimeout(() => setCopiedNote(false), 2000);
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-between p-6 pointer-events-auto select-none overflow-hidden"
      style={{ background: "rgba(2, 10, 20, 0.25)", backdropFilter: "blur(3px)" }}>

      {/* Futuristic Transparent Static Background Grid */}
      <div className="absolute inset-0 opacity-15 pointer-events-none" style={{
        backgroundImage: "linear-gradient(rgba(56,189,248,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.4) 1px, transparent 1px)",
        backgroundSize: "80px 80px",
      }} />

      {/* Subtle scanline */}
      <div className="absolute inset-0 pointer-events-none opacity-15" style={{
        background: "linear-gradient(rgba(18,16,16,0) 50%, rgba(0, 0, 0, 0.25) 50%)",
        backgroundSize: "100% 4px"
      }} />

      {/* Top Header & Live Telemetry Bar - Translucent Glass */}
      <div className="relative z-10 flex items-center justify-between w-full max-w-7xl mx-auto pb-4 border-b border-sky-500/25 bg-slate-950/40 p-4 rounded-2xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl border border-sky-400/50 bg-sky-500/15 shadow-[0_0_25px_rgba(56,189,248,0.3)]">
            <Calendar size={26} className="text-sky-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-wider text-white font-mono uppercase bg-clip-text text-transparent bg-gradient-to-r from-sky-400 via-cyan-200 to-indigo-300">
                HITA INDONESIA IT CONFERENCE 2026
              </h1>
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center gap-1">
                <Calendar size={11} /> 1 AGUSTUS 2026
              </span>
            </div>
            <p className="text-xs text-sky-200/80 font-mono tracking-widest uppercase mt-0.5">
              Technology as The Backbone of Modern Hospitality · Ballroom Angsana 2-3
            </p>
          </div>
        </div>

        {/* Live Clock Panel (WIB) */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl border border-sky-500/40 bg-slate-950/60 backdrop-blur-md shadow-[0_0_20px_rgba(56,189,248,0.2)]">
            <Activity size={16} className="text-emerald-400 animate-spin" />
            <span className="font-mono text-xs text-slate-300">WAKTU (WIB):</span>
            <span className="font-mono text-sm font-black text-sky-400 tracking-wider">
              {currentTimeStr || "00:00:00 WIB"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Body Stage */}
      <div className="relative z-10 flex-1 flex flex-col my-4 max-w-7xl mx-auto w-full overflow-hidden">

        {/* Live Highlight Session Banner - Translucent Hologram Glass */}
        {liveItem ? (
          <div className="mb-4 p-4 rounded-2xl border border-emerald-400/80 bg-gradient-to-r from-emerald-950/40 via-slate-950/60 to-sky-950/40 backdrop-blur-md shadow-[0_0_35px_rgba(16,185,129,0.35)] flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative flex items-center justify-center">
                <span className="absolute w-4 h-4 rounded-full bg-emerald-400 animate-ping opacity-75" />
                <Radio size={24} className="relative z-10 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-black uppercase px-2.5 py-0.5 rounded bg-emerald-500/25 text-emerald-300 border border-emerald-500/60">
                    🔴 SEDANG BERLANGSUNG (LIVE NOW)
                  </span>
                  <span className="font-mono text-xs font-bold text-sky-300">{liveItem.time} WIB</span>
                </div>
                <h3 className="font-mono text-base font-black text-white mt-1">{liveItem.title}</h3>
              </div>
            </div>

            <div className="flex items-center gap-6 text-right font-mono text-xs">
              <div>
                <span className="text-slate-300 block text-[10px]">PEMBICARA / PEMBAWA:</span>
                <span className="text-sky-300 font-bold">{liveItem.speaker}</span>
              </div>
              <div>
                <span className="text-slate-300 block text-[10px]">LOKASI:</span>
                <span className="text-emerald-300 font-bold">{liveItem.location}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-4 p-3 rounded-xl border border-sky-500/30 bg-slate-950/40 backdrop-blur-md flex items-center justify-between font-mono text-xs text-sky-200/80">
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-sky-400" />
              <span>STATUS WAKTU AKUTIS: Tidak ada sesi yang sedang tayang pada menit ini.</span>
            </div>
            <span className="text-[10px] text-amber-300 font-bold">WIB (ASIA/JAKARTA) REALTIME STATUS</span>
          </div>
        )}

        {/* Filter Tabs & Search Bar */}
        <div className="flex items-center justify-between mb-4 gap-4">
          {/* Stage Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
            {STAGES.map((stg) => (
              <button
                key={stg}
                onClick={() => { blip(400); setSelectedStage(stg); }}
                className={`px-4 py-2 rounded-xl font-mono text-xs font-bold tracking-wider transition-all border whitespace-nowrap ${
                  selectedStage === stg
                    ? "bg-sky-500 text-slate-950 border-sky-300 shadow-[0_0_20px_rgba(56,189,248,0.5)] scale-105"
                    : "bg-slate-950/40 text-sky-200/80 border-sky-500/30 hover:text-white hover:border-sky-400/50 backdrop-blur-md"
                }`}
              >
                {stg}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-400/70" />
            <input
              type="text"
              placeholder="Cari acara / pembicara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl font-mono text-xs bg-slate-950/50 backdrop-blur-md border border-sky-500/40 text-sky-100 placeholder-sky-200/40 focus:outline-none focus:border-sky-400"
            />
          </div>
        </div>

        {/* Translucent Holographic Glass Cards Grid (Camera Feed Visible Behind!) */}
        <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-sky-500/40 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map((item) => {
            const isLive = item.status === "live";
            const isDone = item.status === "completed";
            const isHoveredByHand = hoveredCardId === item.id;

            return (
              <div
                key={item.id}
                ref={(el) => { cardRefs.current[item.id] = el; }}
                onClick={() => { blip(800); setActiveItem(item); }}
                className={`group relative rounded-2xl border p-5 cursor-pointer backdrop-blur-md transition-all duration-200 flex flex-col justify-between overflow-hidden ${
                  isHoveredByHand
                    ? "border-sky-300 bg-sky-500/30 shadow-[0_0_40px_rgba(56,189,248,0.6)] scale-[1.03]"
                    : isLive
                    ? "border-emerald-400/90 bg-gradient-to-br from-emerald-950/40 via-slate-950/60 to-sky-950/40 shadow-[0_0_35px_rgba(16,185,129,0.4)] hover:border-emerald-300"
                    : isDone
                    ? "border-slate-700/60 bg-slate-950/30 opacity-60 hover:opacity-100 hover:border-sky-400/60"
                    : "border-sky-500/40 bg-slate-950/35 hover:bg-slate-950/60 hover:border-sky-300 hover:shadow-[0_0_30px_rgba(56,189,248,0.4)]"
                }`}
              >
                {/* Hand Gesture Point Dwell Radial Fill Indicator */}
                {isHoveredByHand && (
                  <div
                    className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-sky-400 via-emerald-400 to-cyan-300 transition-all duration-75 shadow-[0_0_12px_#38bdf8]"
                    style={{ width: `${pointProgress * 100}%` }}
                  />
                )}

                {/* Holographic Laser Beam Overlay on Hover */}
                <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-b from-sky-400/15 via-transparent to-transparent" />

                {/* Tech Bracket Corners */}
                <div className="absolute top-2 left-2 w-3 h-3 border-t border-l border-sky-400/60 group-hover:border-sky-300 transition-colors" />
                <div className="absolute top-2 right-2 w-3 h-3 border-t border-r border-sky-400/60 group-hover:border-sky-300 transition-colors" />
                <div className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-sky-400/60 group-hover:border-sky-300 transition-colors" />
                <div className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-sky-400/60 group-hover:border-sky-300 transition-colors" />

                <div>
                  {/* Card Header Info */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 font-mono text-xs font-bold text-sky-400">
                      <Clock size={14} />
                      <span>{item.time} WIB</span>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase tracking-wider ${
                      isLive
                        ? "bg-emerald-500/30 border border-emerald-400/70 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.6)]"
                        : isDone
                        ? "bg-slate-800/60 text-slate-300 border border-slate-700"
                        : "bg-sky-500/20 border border-sky-500/40 text-sky-200"
                    }`}>
                      {isLive ? "LIVE NOW" : isDone ? "COMPLETED" : "UPCOMING"}
                    </span>
                  </div>

                  {/* Session Title */}
                  <h3 className="font-mono font-black text-base text-white group-hover:text-sky-300 transition-colors leading-snug mb-2">
                    {item.title}
                  </h3>

                  {/* Description preview */}
                  <p className="font-mono text-xs text-sky-100/70 line-clamp-2 mb-4">
                    {item.description}
                  </p>
                </div>

                <div>
                  {/* Meta Details */}
                  <div className="pt-3 border-t border-sky-500/20 space-y-1.5 font-mono text-xs">
                    {item.speaker && (
                      <div className="flex items-center gap-2 text-slate-200">
                        <User size={13} className="text-sky-400 shrink-0" />
                        <span className="truncate">{item.speaker}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-slate-300">
                      <MapPin size={13} className="text-emerald-400 shrink-0" />
                      <span className="truncate">{item.location}</span>
                    </div>
                  </div>

                  {/* Card Tags & Action Footer */}
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      {item.tags.map((tg, tIdx) => (
                        <span key={tIdx} className="px-2 py-0.5 rounded text-[9px] font-mono bg-sky-500/15 border border-sky-500/30 text-sky-200 whitespace-nowrap">
                          #{tg}
                        </span>
                      ))}
                    </div>

                    <span className="font-mono text-[10px] text-sky-300 group-hover:text-white group-hover:translate-x-1 transition-all flex items-center gap-1 shrink-0 ml-2">
                      {isHoveredByHand ? "MEMBUKA..." : "PROYEKSI 3D"} <ChevronRight size={12} />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Status Bar - Translucent Glass */}
      <div className="relative z-10 flex items-center justify-between w-full max-w-7xl mx-auto pt-3 border-t border-sky-500/25 bg-slate-950/40 p-3 rounded-xl backdrop-blur-md font-mono text-xs text-sky-200/80">
        <div className="flex items-center gap-3">
          <Layers size={14} className="text-sky-400" />
          <span>TOTAL ACARA: <strong className="text-white">{rundownList.length} SESI (1 AGUSTUS 2026 - WIB)</strong></span>
        </div>
        <div className="text-center text-[10px] tracking-widest uppercase flex items-center gap-2">
          <Hand size={13} className="text-sky-400 animate-bounce" />
          <span className="text-sky-300 font-bold">ARAHKAN JARI KE KARTU UNTUK OTOMATIS MEMBUKA HOLOGRAM · GESTUR KEPALAN ✊ UNTUK KELUAR</span>
        </div>
      </div>

      {/* WOW Interactive 3D Holographic Projection Modal */}
      {activeItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-6">
          <div className="relative max-w-3xl w-full rounded-3xl border border-sky-400/80 bg-slate-950/90 p-7 shadow-[0_0_80px_rgba(56,189,248,0.6)] overflow-hidden backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}>

            {/* Holographic Projection Rays Emitter Graphic */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-gradient-to-b from-sky-400/30 via-sky-500/10 to-transparent blur-3xl pointer-events-none" />

            {/* Corner Tech Brackets */}
            <div className="absolute top-4 left-4 w-5 h-5 border-t-2 border-l-2 border-sky-400" />
            <div className="absolute top-4 right-4 w-5 h-5 border-t-2 border-r-2 border-sky-400" />
            <div className="absolute bottom-4 left-4 w-5 h-5 border-b-2 border-l-2 border-sky-400" />
            <div className="absolute bottom-4 right-4 w-5 h-5 border-b-2 border-r-2 border-sky-400" />

            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-sky-500/25 relative z-10">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full font-mono text-xs font-black uppercase tracking-wider bg-sky-500/25 text-sky-300 border border-sky-400/50">
                  {activeItem.stage}
                </span>
                <span className="font-mono text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <Clock size={14} /> {activeItem.time} WIB
                </span>
              </div>
              <button
                onClick={() => { blip(400); setActiveItem(null); }}
                className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors border border-sky-500/30"
              >
                <X size={22} />
              </button>
            </div>

            {/* 3D Holographic Stage Radar Projection Centerpiece */}
            <div className="my-6 relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6">

              {/* Left 2 Cols: Main Info */}
              <div className="md:col-span-2 space-y-4">
                <div className="flex items-center gap-2 text-sky-400 font-mono text-[10px] tracking-widest uppercase">
                  <Sparkles size={12} /> PROYEKSI HOLOGRAM R.A.V.A SENSOR
                </div>

                <h2 className="font-mono font-black text-2xl text-white leading-snug">
                  {activeItem.title}
                </h2>

                <p className="font-mono text-xs text-slate-200 leading-relaxed bg-slate-950/70 p-4 rounded-2xl border border-sky-500/30 backdrop-blur-md shadow-inner">
                  {activeItem.description}
                </p>

                <div className="grid grid-cols-2 gap-4 font-mono text-xs">
                  <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-sky-500/30 backdrop-blur-md">
                    <span className="text-slate-400 text-[10px] block uppercase font-bold">PEMBICARA / PRESENTER</span>
                    <span className="text-sky-300 font-bold text-sm block mt-0.5">{activeItem.speaker || "-"}</span>
                    {activeItem.role && <span className="text-slate-300 text-[11px] block mt-0.5">{activeItem.role}</span>}
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-sky-500/30 backdrop-blur-md">
                    <span className="text-slate-400 text-[10px] block uppercase font-bold">LOKASI RUANGAN</span>
                    <span className="text-emerald-300 font-bold text-sm block mt-0.5">{activeItem.location}</span>
                  </div>
                </div>
              </div>

              {/* Right Col: Holographic Radar Stage Animation */}
              <div className="flex flex-col items-center justify-center p-4 rounded-2xl border border-sky-500/40 bg-slate-950/70 backdrop-blur-md relative overflow-hidden">
                <div className="relative w-36 h-36 flex items-center justify-center">
                  {/* Rotating Holographic Concentric Circles */}
                  <div className="absolute inset-0 rounded-full border border-dashed border-sky-400/60 animate-[spin_12s_linear_infinite]" />
                  <div className="absolute inset-2 rounded-full border border-sky-500/40 animate-[spin_8s_linear_infinite_reverse]" />
                  <div className="absolute inset-6 rounded-full border border-emerald-400/50" />

                  {/* Core Icon Target */}
                  <div className="relative z-10 w-14 h-14 rounded-full bg-sky-500/25 border border-sky-300 flex items-center justify-center shadow-[0_0_20px_rgba(56,189,248,0.6)]">
                    <ShieldCheck size={26} className="text-sky-300" />
                  </div>
                </div>

                <span className="font-mono text-[10px] tracking-widest text-sky-300 uppercase mt-3 font-bold">
                  BALLROOM ANGSANA 2-3
                </span>
                <span className="font-mono text-[9px] text-slate-300 mt-0.5">
                  STATUS: {activeItem.status.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Footer Action Bar */}
            <div className="pt-4 border-t border-sky-500/25 flex items-center justify-between relative z-10">
              <button
                onClick={() => copyNoteToClipboard(activeItem)}
                className="px-4 py-2 rounded-xl bg-slate-900/80 border border-sky-500/40 font-mono text-xs text-sky-300 hover:bg-slate-800 flex items-center gap-2 transition-all backdrop-blur-md"
              >
                <Share2 size={14} /> {copiedNote ? "CATATAN TERSIMPAN!" : "SALIN INFO JADWAL"}
              </button>

              <button
                onClick={() => { blip(400); setActiveItem(null); }}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-400 to-cyan-300 text-slate-950 font-mono font-black text-xs hover:brightness-110 shadow-[0_0_20px_rgba(56,189,248,0.5)] active:scale-95 transition-all"
              >
                TUTUP PROYEKSI
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
