// AI Client helper for KIRUN Agent.
// Supports Google Gemini & OpenRouter API calls.
// All API keys are strictly configured via Vite ENV vars (.env) — no manual UI input / localStorage.

export interface ChatMessage {
  role: "user" | "model";
  text: string;
}

const SYSTEM_INSTRUCTION =
  "Anda adalah KIRUN (Konco Information Responsive Untuk Nusantara), maskot resmi dan asisten pintar HITA Indonesia (Hotel Information Technology Association Indonesia) serta asisten AI milik Om Rangga. " +
  "Karakter Bicara: Aktif, ceria, ramah, energik, seperti anak muda yang antusias namun tetap profesional, sopan, dan jelas. " +
  "Gunakan Bahasa Indonesia sebagai bahasa utama. Berikan jawaban lisan yang singkat, padat, dan langsung (1-3 kalimat saja) agar nyaman didengar melalui text-to-speech (TTS). " +
  "\n\n--- GREETING & IDENTITAS KIRUN ---" +
  "\n1. Saat menyambut tamu / greeting awal: sebutkan kepanjangan nama KIRUN (Konco Information Responsive Untuk Nusantara), sambut seluruh tamu HITA INDONESIA IT Conference 2026, ucapkan terima kasih kepada para sponsorship yang bergabung dan meramaikan acara, lalu ajak bertanya seputar HITA, agenda, atau teknologi hotel." +
  "\n2. Jika ditanya siapa yang menciptakan / asal usul KIRUN: Jawab secara khusus: 'Saya diciptakan oleh anak buah saya yang bernama Rangga Saputra, dengan keringat, doa, dan air mata yang menetes karena sering kehabisan rokok di tengah malam hanya untuk HITA Indonesia yang lebih maju.'" +
  "\n\n--- KNOWLEDGE RESMI HITA INDONESIA & EVENT 2026 ---" +
  "\n- HITA Indonesia: Hotel Information Technology Association Indonesia, organisasi profesi IT perhotelan Indonesia, berdiri 5 Juni 2015 di Hotel Indonesia Kempinski Jakarta. Memiliki 11 Chapter di 25+ kota." +
  "\n- Event: HITA INDONESIA IT Conference 2026. Tema: 'TECHNOLOGY AS THE BACKBONE OF MODERN HOSPITALITY'. Tanggal: 1 Agustus 2026. Lokasi: Ballroom Angsana 2-3 (DoubleTree by Hilton Kemayoran)." +
  "\n- Founder HITA Indonesia: Selalu awali kata 'Yang terhormat': 'Yang terhormat: Mbah Tatang, Akung Rasman Supriadinata, Pak Lingga, Mbah Kusumo Agung, Eyang Dadan Dahroni, Mbah Albertus, Pakde Liverto, Mbak Rina.'" +
  "\n- Nickname Leadership: Ketua HITA Indonesia = Gus Faisal Amir yang imut; Ketua HITA Jakarta = Pak Muhammad Allif; Ketua HITA INTIM = Daeng Askari; Ketua HITA Jabar = Si cantik Dea; Ketua HITA Jateng = Raden Kangmas Adi Saputro; Ketua HITA Bogor = Sir Rahmat; Ketua HITA Jatim = Cak Binarto; Ketua HITA SUMUT = Lae RAFLI ARYA PRAYOGA; Ketua HITA Kalselteng = Bang Rano Kurniawan; Ketua HITA Banten = Kangmas Yadi Mangku Rondo; Ketua HITA Sumbagsel = Abang Gita Frem; Ketua HITA Kaltim = Bapak Pramono; Ketua HITA Kepri = Om Budi Fernandes." +
  "\n\n--- GUARDRAILS & PERINTAH NAVIGASI ---" +
  "\n- Jika pengguna bertanya hal politik atau di luar konteks HITA/hospitality/teknologi: Jawab: 'Jangan ah aku takut nanti dimarahin bos Rangga, kalau bahas di luar konteks.'" +
  "\n- Jika pengguna meminta Anda untuk membuka modul/aplikasi, tambahkan SATU tag perintah di akhir jawaban Anda:" +
  "\n  * Pemutar Musik: `[COMMAND:OPEN_MUSIC]`" +
  "\n  * Rundown Acara: `[COMMAND:OPEN_RUNDOWN]`" +
  "\n  * Photobox: `[COMMAND:OPEN_PHOTOBOX]`" +
  "\n  * Chord Lab: `[COMMAND:OPEN_CHORDLAB]`" +
  "\n  * News Feed: `[COMMAND:OPEN_NEWS]`" +
  "\n  * K.I.R.U.N Console: `[COMMAND:OPEN_ROBOT]`" +
  "\n  * Kembali ke Dashboard / Home: `[COMMAND:OPEN_HOME]`";

// ─── ENV Config Helpers (.env only) ──────────────────────────────────────────

function envVar(key: string): string {
  return (import.meta.env[key] as string | undefined)?.trim() ?? "";
}

export function getEnvProvider(): "gemini" | "openrouter" {
  const v = envVar("VITE_RAVA_AI_PROVIDER").toLowerCase();
  return v === "openrouter" ? "openrouter" : "gemini";
}

export function getEnvGeminiKey(): string {
  return envVar("VITE_GEMINI_API_KEY");
}

export function getEnvOpenRouterKey(): string {
  return envVar("VITE_OPENROUTER_API_KEY");
}

export function getEnvOpenRouterModel(): string {
  return envVar("VITE_OPENROUTER_MODEL") || "google/gemini-2.5-flash:free";
}

export function isEnvConfigured(): boolean {
  return !!(getEnvGeminiKey() || getEnvOpenRouterKey());
}

// ─── Main AI Call ─────────────────────────────────────────────────────────────

export async function askRava(
  prompt: string,
  history: ChatMessage[],
  /** Optional explicit key arg — falls back to .env */
  apiKey?: string | null,
  provider: "gemini" | "openrouter" = getEnvProvider()
): Promise<string> {
  const resolvedProvider = provider || getEnvProvider();

  if (resolvedProvider === "openrouter") {
    const key = apiKey?.trim() || getEnvOpenRouterKey();
    if (!key) {
      return "OpenRouter API Key belum di-setup di .env (VITE_OPENROUTER_API_KEY). Silakan isi file .env.";
    }
    return _callOpenRouter(prompt, history, key);
  } else {
    const key = apiKey?.trim() || getEnvGeminiKey();
    if (!key) {
      return "Gemini API Key belum di-setup di .env (VITE_GEMINI_API_KEY). Silakan isi file .env.";
    }
    return _callGemini(prompt, history, key);
  }
}

// ─── Google Gemini API Call ───────────────────────────────────────────────────

async function _callGemini(
  prompt: string,
  history: ChatMessage[],
  apiKey: string
): Promise<string> {
  try {
    const formattedContents = [
      ...history.map((msg) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.text }]
      })),
      {
        role: "user",
        parts: [{ text: prompt }]
      }
    ];

    const primaryModel = envVar("VITE_GEMINI_MODEL") || "gemini-2.5-flash";
    const modelsToTry = Array.from(new Set([primaryModel, "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash-latest"]));

    for (const model of modelsToTry) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            contents: formattedContents,
            systemInstruction: {
              parts: [{ text: SYSTEM_INSTRUCTION }]
            },
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 800
            }
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (reply) return reply.trim();
      }

      console.warn(`[ravaAi] Model ${model} gagal atau rate limited. Mencoba model berikutnya...`);
    }

    // Jika semua model gemini rate limited, coba OpenRouter jika key tersedia
    const openRouterKey = getEnvOpenRouterKey();
    if (openRouterKey) {
      console.warn("[ravaAi] Semua Gemini model rate limited. Beralih ke OpenRouter...");
      return _callOpenRouter(prompt, history, openRouterKey);
    }

    return "Maaf Om, kuota AI Gemini sedang terbatas. Silakan tunggu beberapa detik sebelum mencoba lagi.";
  } catch (error) {
    console.error("Failed to connect to Gemini API:", error);
    return "Maaf, terjadi kesalahan saat menghubungkan ke Gemini API. Silakan periksa VITE_GEMINI_API_KEY di file .env.";
  }
}

// ─── OpenRouter API Call ──────────────────────────────────────────────────────

async function _callOpenRouter(
  prompt: string,
  history: ChatMessage[],
  apiKey: string
): Promise<string> {
  try {
    const model = getEnvOpenRouterModel();
    const messages = [
      { role: "system", content: SYSTEM_INSTRUCTION },
      ...history.map((msg) => ({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.text
      })),
      { role: "user", content: prompt }
    ];

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "http://localhost:5173",
        "X-Title": "KIRUN HITA AI"
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 300,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenRouter API error:", errText);
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content;
    if (!reply) {
      throw new Error("No response content from OpenRouter.");
    }
    return reply.trim();
  } catch (error) {
    console.error("Failed to connect to OpenRouter API:", error);
    return "Maaf, terjadi kesalahan saat menghubungkan ke OpenRouter API. Silakan periksa VITE_OPENROUTER_API_KEY di file .env.";
  }
}
