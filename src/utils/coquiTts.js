/**
 * Voice Synthesis Engine Utility
 * Supports Edge TTS (HuggingFace innoai/Edge-TTS-Text-to-Speech Neural Voice),
 * Coqui TTS (XTTS-v2 Neural Voice), and Browser Hindi Natural Web Speech API.
 */

import { API_BASE_URL } from "./api";

export const DEFAULT_COQUI_URL = import.meta.env.VITE_COQUI_TTS_SERVER || "http://localhost:5002";
export const HF_EDGE_TTS_URL = "https://innoai-edge-tts-text-to-speech.hf.space";

let currentAudio = null;
let currentAbortController = null;

const femaleKeywords = [
  "female", "woman", "swara", "kalpana", "neerja", "heera",
  "veena", "lekha", "kajal", "aditi", "pooja", "priya",
  "raveena", "zira", "natural", "online", "neural"
];

const maleKeywords = [
  "male", "man", "madhur", "hemant", "kunal", "rahul",
  "neel", "ravi", "david", "mark", "george", "guy"
];

/**
 * Catalog of available voices for the Voice Preview Modal
 */
export const AVAILABLE_VOICES = [
  {
    id: "edge_tts_hindi_female",
    name: "Edge TTS Swara / Hindi Female (संस्कृति)",
    provider: "HuggingFace innoai / Edge-TTS",
    engine: "edge_tts",
    language: "hi",
    speaker: "hi-IN-SwaraNeural - hi-IN (Female)",
    sampleText: "नमस्ते! मैं संस्कृति हूँ। माइक्रोसॉफ्ट एज टीटीएस की प्राकृतिक स्वरा आवाज़ में आपका स्वागत है।",
    badge: "⚡ Edge TTS Swara (Female)",
    badgeColor: "#2563eb",
    badgeBg: "#eff6ff",
    description: "Ultra-clear Microsoft Edge Neural voice (Swara - Sanskriti) hosted on HuggingFace Space."
  },
  {
    id: "edge_tts_hindi_male",
    name: "Edge TTS Madhur / Hindi Male Teacher (अध्ययन)",
    provider: "HuggingFace innoai / Edge-TTS",
    engine: "edge_tts",
    language: "hi",
    speaker: "hi-IN-MadhurNeural - hi-IN (Male)",
    sampleText: "नमस्ते! मैं अध्ययन हूँ। आज हम गणित और विज्ञान का नया अध्याय विस्तार से पढ़ेंगे।",
    badge: "👨‍🏫 Edge TTS Madhur (Male)",
    badgeColor: "#7c3aed",
    badgeBg: "#f5f3ff",
    description: "Deep, natural Indian male instructional voice (Madhur - Adhyayan) for academic explanation."
  }
];

/**
 * Detects whether a string contains Hindi / Devanagari script.
 */
export function isHindiText(text) {
  if (!text || typeof text !== "string") return false;
  return /[\u0900-\u097F]/.test(text);
}

/**
 * Cleans Markdown, LaTeX, formulas, and special characters before sending to TTS.
 */
export function cleanTextForSpeech(text) {
  if (!text || typeof text !== "string") return "";

  let cleaned = text;

  // Replace \text{...}, \mathrm{...}, \mathbf{...} with inner text
  cleaned = cleaned.replace(/\\(?:text|mathrm|mathbf)\{([^}]+)\}/g, "$1");

  // Replace common LaTeX symbols
  cleaned = cleaned
    .replace(/\\times/g, "×")
    .replace(/\\div/g, "÷")
    .replace(/\\pm/g, "±")
    .replace(/\\neq/g, "≠")
    .replace(/\\approx/g, "≈")
    .replace(/\\cdot/g, "·")
    .replace(/\\degree/g, "°")
    .replace(/\\leq?/g, "≤")
    .replace(/\\geq?/g, "≥")
    .replace(/\\sqrt\{([^}]+)\}/g, "√($1)")
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1 / $2)");

  // Remove LaTeX display math ($$...$$) and inline math ($...$) dollar delimiters
  cleaned = cleaned.replace(/\$\$([\s\S]*?)\$\$/g, "$1");
  cleaned = cleaned.replace(/\$([^$\n]+)\$/g, "$1");

  // Remove code blocks
  cleaned = cleaned.replace(/```[\s\S]*?```/g, "");
  cleaned = cleaned.replace(/`([^`]+)`/g, "$1");

  // Remove markdown images & links: ![alt](url) -> "" and [text](url) -> text
  cleaned = cleaned.replace(/!\[[^\]]*\]\([^)]*\)/g, "");
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");

  // Remove Markdown headings (#, ##, ###)
  cleaned = cleaned.replace(/^#+\s+/gm, "");
  cleaned = cleaned.replace(/\s+#+\s+/g, " ");
  cleaned = cleaned.replace(/#/g, "");

  // Remove horizontal rules
  cleaned = cleaned.replace(/^[-*_]{3,}\s*$/gm, "");

  // Remove bold / italic markers
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, "$1");
  cleaned = cleaned.replace(/\*([^*]+)\*/g, "$1");
  cleaned = cleaned.replace(/__([^_]+)__/g, "$1");
  cleaned = cleaned.replace(/_([^_]+)_/g, "$1");

  // Remove bullet markers at line start
  cleaned = cleaned.replace(/^[\s]*[-*+•]\s+/gm, "");

  // Remove blockquote markers
  cleaned = cleaned.replace(/^>\s+/gm, "");

  // Replace standalone dashes/hyphens with comma for natural speech pause
  cleaned = cleaned.replace(/\s+[-–—]\s+/g, ", ");
  cleaned = cleaned.replace(/[-–—]{2,}/g, " ");

  // Remove asterisks, tildes, backticks, pipe symbols
  cleaned = cleaned.replace(/[*~`|]/g, " ");

  // Clean up emojis that TTS might pronounce awkwardly
  cleaned = cleaned.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, " ");

  // Normalize whitespace
  cleaned = cleaned.replace(/,\s*,+/g, ",").replace(/\s+/g, " ").trim();

  return cleaned;
}

/**
 * Returns the best Hindi Natural Voice matching gender preferences in browser SpeechSynthesis.
 */
export function getBestHindiNaturalVoice(preferLanguage = "hi", targetSpeaker = "") {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices?.() || [];
  if (!voices || voices.length === 0) return null;

  const isMaleRequested = (targetSpeaker || "").toLowerCase().includes("male") || (targetSpeaker || "").toLowerCase().includes("teacher");

  const scoredVoices = voices.map((voice) => {
    const name = voice.name.toLowerCase();
    const language = (voice.lang || "").toLowerCase().replace("_", "-");

    const isExplicitHindi = language.startsWith("hi") || name.includes("hindi") || name.includes("हिन्दी");
    const isGoogleSwara = (name.includes("google") || name.includes("swara")) && (name.includes("hi") || name.includes("hindi") || name.includes("हिन्दी") || language.startsWith("hi"));
    const isSwaraOrKalpana = name.includes("swara") || name.includes("kalpana") || name.includes("neerja") || name.includes("hi-in");
    const isNaturalOrNeural = name.includes("natural") || name.includes("neural") || name.includes("online");
    const isFemaleVoice = femaleKeywords.some((k) => name.includes(k));
    const isMaleVoice = maleKeywords.some((k) => name.includes(k));

    let score = 0;
    if (isExplicitHindi) score += 200;
    if (isNaturalOrNeural) score += 100;

    if (isMaleRequested) {
      if (isMaleVoice) score += 500;
      if (isFemaleVoice) score -= 200;
    } else {
      if (isGoogleSwara) score += 500;
      if (isSwaraOrKalpana) score += 150;
      if (isFemaleVoice) score += 50;
    }

    return { voice, score };
  });

  scoredVoices.sort((a, b) => b.score - a.score);
  return scoredVoices[0]?.score > 0 ? scoredVoices[0].voice : null;
}

export function getBestIndianFemaleVoice() {
  return getBestHindiNaturalVoice("hi");
}

/**
 * Stops any current playing audio.
 */
export function stopSpeech() {
  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
  }
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch {
      // ignore
    }
    currentAudio = null;
  }
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Synthesizes text using Hugging Face Edge-TTS Space (innoai/Edge-TTS-Text-to-Speech) or backend proxy.
 */
export async function speakWithEdgeTts(text, options = {}) {
  const {
    speaker = "hi-IN-SwaraNeural - hi-IN (Female)",
    rate = 0,
    pitch = 0,
    onStart,
    onEnd,
    onError,
  } = options;

  stopSpeech();
  const cleanedText = cleanTextForSpeech(text);
  if (!cleanedText) {
    onEnd?.();
    return false;
  }

  try {
    currentAbortController = new AbortController();

    const backendBase = API_BASE_URL.replace(/\/+$/, "");
    const backendProxyUrl = `${backendBase}/edge-tts`;

    let audioUrl = null;

    // Try direct Hugging Face Space endpoint first
    try {
      const postRes = await fetch(`${HF_EDGE_TTS_URL}/gradio_api/call/tts_interface`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: [cleanedText, speaker, rate, pitch]
        }),
        signal: currentAbortController.signal,
      });

      if (postRes.ok) {
        const { event_id } = await postRes.json();
        if (event_id) {
          const streamRes = await fetch(`${HF_EDGE_TTS_URL}/gradio_api/call/tts_interface/${event_id}`, {
            signal: currentAbortController.signal,
          });

          if (streamRes.ok) {
            const streamText = await streamRes.text();
            const lines = streamText.split("\n");
            for (let i = 0; i < lines.length; i++) {
              if (lines[i].startsWith("event: complete")) {
                const dataLine = lines[i + 1];
                if (dataLine && dataLine.startsWith("data: ")) {
                  const rawJson = dataLine.slice(6);
                  const parsed = JSON.parse(rawJson);
                  const audioObj = parsed[0];
                  if (audioObj && audioObj.url) {
                    audioUrl = audioObj.url;
                    break;
                  }
                }
              }
            }
          }
        }
      }
    } catch (hfErr) {
      if (hfErr.name === "AbortError") return false;
      console.warn("Direct HuggingFace Edge-TTS request failed, trying backend proxy...", hfErr);
    }

    // Fallback to backend proxy endpoint if HF Space direct request failed
    if (!audioUrl) {
      try {
        const proxyRes = await fetch(backendProxyUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: cleanedText,
            speaker: speaker,
            rate: rate,
            pitch: pitch,
          }),
          signal: currentAbortController.signal,
        });

        if (proxyRes.ok) {
          const proxyData = await proxyRes.json();
          if (proxyData.audio_url) {
            audioUrl = proxyData.audio_url;
          }
        }
      } catch (proxyErr) {
        if (proxyErr.name === "AbortError") return false;
        console.warn("Backend proxy Edge-TTS request failed:", proxyErr);
      }
    }

    if (!audioUrl) {
      return false;
    }

    const audio = new Audio(audioUrl);
    currentAudio = audio;

    return new Promise((resolve) => {
      audio.onplay = () => {
        onStart?.();
      };

      audio.onended = () => {
        currentAudio = null;
        onEnd?.();
        resolve(true);
      };

      audio.onerror = (err) => {
        console.warn("Edge-TTS Audio playback error:", err);
        currentAudio = null;
        onError?.(err);
        resolve(false);
      };

      audio.play().catch((playErr) => {
        console.warn("Edge-TTS Audio play call exception:", playErr);
        currentAudio = null;
        resolve(false);
      });
    });
  } catch (err) {
    if (err.name === "AbortError") return false;
    console.warn("Edge-TTS general exception:", err);
    return false;
  }
}

/**
 * Synthesizes text using Coqui TTS server or proxy.
 */
export async function speakWithCoqui(text, options = {}) {
  const {
    coquiUrl = DEFAULT_COQUI_URL,
    speaker = "Hindi Female",
    language = "hi",
    onStart,
    onEnd,
    onError,
  } = options;

  stopSpeech();
  const cleanedText = cleanTextForSpeech(text);
  if (!cleanedText) {
    onEnd?.();
    return false;
  }

  try {
    currentAbortController = new AbortController();

    const backendBase = import.meta.env.VITE_API_BASE_URL
      ? import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, "")
      : "http://127.0.0.1:8000/api";

    const endpoints = [
      "http://127.0.0.1:8000/api/coqui-tts",
      `${backendBase}/coqui-tts`,
      `${coquiUrl.replace(/\/+$/, "")}/api/tts`
    ].filter((v, i, a) => a.indexOf(v) === i);

    let response = null;

    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "audio/wav, audio/mpeg, application/json",
          },
          body: JSON.stringify({
            text: cleanedText,
            speaker: speaker,
            speaker_wav: speaker,
            language: language,
            language_id: language,
          }),
          signal: currentAbortController.signal,
        });

        if (res && res.ok) {
          response = res;
          break;
        }
      } catch {
        // try next endpoint
      }
    }

    if (response && response.ok) {
      const audioBlob = await response.blob();
      if (!audioBlob || audioBlob.size === 0) return false;

      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      currentAudio = audio;

      return new Promise((resolve) => {
        audio.onplay = () => {
          onStart?.();
        };

        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          currentAudio = null;
          onEnd?.();
          resolve(true);
        };

        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl);
          currentAudio = null;
          resolve(false);
        };

        audio.play().catch((playErr) => {
          console.warn("Coqui audio playback error:", playErr);
          URL.revokeObjectURL(audioUrl);
          currentAudio = null;
          resolve(false);
        });
      });
    } else {
      console.warn("Coqui TTS server unreachable, falling back...");
      return false;
    }
  } catch (err) {
    if (err.name === "AbortError") return false;
    console.warn("Coqui request exception:", err);
    return false;
  }
}

/**
 * Universal voice preview playback function for Voice Preview Modal.
 */
export async function previewVoice(voice, customText = "", options = {}) {
  const { onStart, onEnd, onError } = options;
  const textToPlay = customText || voice.sampleText;

  if (voice.engine === "edge_tts") {
    const success = await speakWithEdgeTts(textToPlay, {
      speaker: voice.speaker,
      onStart,
      onEnd,
      onError,
    });
    if (success) return true;
  }

  if (voice.engine === "coqui") {
    const success = await speakWithCoqui(textToPlay, {
      speaker: voice.speaker,
      language: voice.language,
      onStart,
      onEnd,
    });
    if (success) return true;
  }

  // Fallback to browser voice for preview
  speakWithBrowser(textToPlay, {
    speaker: voice.speaker,
    language: voice.language || "hi",
    onStart,
    onEnd,
    onError,
  });
  return true;
}

/**
 * Main speech function supporting Edge TTS, Coqui TTS, and Browser WebSpeech.
 */
export async function speakText(text, options = {}) {
  const {
    engine = "edge_tts", // "edge_tts" | "browser" | "coqui" | "auto"
    speaker = "hi-IN-SwaraNeural - hi-IN (Female)",
    language = "hi",
    onStart,
    onEnd,
    onError,
  } = options;

  stopSpeech();

  const cleanedText = cleanTextForSpeech(text);
  if (!cleanedText) {
    onEnd?.();
    return;
  }

  const isHindi = isHindiText(cleanedText) || language.startsWith("hi");

  // Try Edge TTS if requested
  if (engine === "edge_tts" || engine === "auto") {
    const edgeSuccess = await speakWithEdgeTts(cleanedText, {
      speaker,
      onStart,
      onEnd,
      onError,
    });
    if (edgeSuccess) return;
  }

  // Bypasses network calls for browser engine
  if (engine === "browser") {
    speakWithBrowser(cleanedText, { speaker, language: isHindi ? "hi" : language, onStart, onEnd, onError });
    return;
  }

  // Try Coqui TTS
  if (engine === "coqui") {
    const coquiSuccess = await speakWithCoqui(cleanedText, {
      speaker,
      language: isHindi ? "hi" : "en",
      onStart,
      onEnd,
    });

    if (coquiSuccess) return;
  }

  // Fallback to Browser Hindi Natural Web Speech API
  speakWithBrowser(cleanedText, { speaker, language: isHindi ? "hi" : language, onStart, onEnd, onError });
}

/**
 * Loads available voices, waiting for voiceschanged event if needed.
 */
function loadVoices() {
  return new Promise((resolve) => {
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      resolve(voices);
      return;
    }
    const handler = () => {
      window.speechSynthesis.removeEventListener("voiceschanged", handler);
      resolve(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.addEventListener("voiceschanged", handler);
    setTimeout(() => {
      window.speechSynthesis.removeEventListener("voiceschanged", handler);
      resolve(window.speechSynthesis.getVoices() || []);
    }, 2000);
  });
}

/**
 * Browser SpeechSynthesis runner with Hindi Male / Female voice selection.
 */
async function speakWithBrowser(text, { speaker = "Hindi Female", language = "hi", onStart, onEnd, onError }) {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    onError?.(new Error("Speech synthesis not supported in this browser"));
    return;
  }

  window.speechSynthesis.cancel();

  const isHindiContent = isHindiText(text) || language.startsWith("hi");
  const isMale = (speaker || "").toLowerCase().includes("male") || (speaker || "").toLowerCase().includes("teacher");

  const voices = await loadVoices();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = isHindiContent ? "hi-IN" : "en-IN";
  utterance.rate = isHindiContent ? 0.88 : 0.88;
  utterance.pitch = isMale ? 0.72 : 1.0;

  utterance.onstart = () => { onStart?.(); };
  utterance.onend = () => { onEnd?.(); };
  utterance.onerror = (err) => {
    console.warn("SpeechSynthesis error:", err?.error || err);
    onEnd?.(); // always unblock UI
  };

  try {
    const isMaleReq = isMale;
    const isHindi = (v) => {
      const n = v.name.toLowerCase();
      const l = (v.lang || "").toLowerCase().replace("_", "-");
      return l.startsWith("hi") || n.includes("hindi") || n.includes("हिन्दी");
    };

    const hindiVoices = voices.filter(isHindi);
    const pool = hindiVoices.length > 0 ? hindiVoices : voices;

    const maleVoice = pool.find(v => maleKeywords.some(k => v.name.toLowerCase().includes(k)));
    const femaleVoice = pool.find(v => femaleKeywords.some(k => v.name.toLowerCase().includes(k)))
      || pool.find(v => {
        const n = v.name.toLowerCase();
        return n.includes("google") || n.includes("swara");
      });

    const chosen = isMaleReq
      ? (maleVoice || femaleVoice || pool[0])
      : (femaleVoice || pool[0]);

    if (chosen) {
      utterance.voice = chosen;
      utterance.lang = chosen.lang || utterance.lang;
    }
  } catch {
    // Ignore voice selection errors
  }

  window.speechSynthesis.speak(utterance);
}
