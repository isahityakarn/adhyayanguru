import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Mic, Camera, Send, ChevronLeft, ChevronRight, Trash2, Volume2, VolumeX, Square, BookOpen, Maximize2, PanelLeftClose, Settings, RefreshCw, X, CheckCircle2, AlertTriangle, ExternalLink, Sparkles, Sliders } from "lucide-react";
import { Input, PrimaryButton } from "../components/UI";
import { speakText, stopSpeech, previewVoice, speakWithEdgeTts, HF_EDGE_TTS_URL, AVAILABLE_VOICES } from "../utils/coquiTts";
import { get, post } from "../utils/api";








function cleanMathFormatting(text) {
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

  return cleaned;
}

const TUTOR_CHAT_ENDPOINT = import.meta.env.VITE_TUTOR_CHAT_ENDPOINT || "/tutor/chat";

function getItems(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.chapters)) return response.chapters;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.results)) return response.results;
  return [];
}

function getChapterId(chapter, fallback) {
  return chapter?.id ?? chapter?.chapter_id ?? fallback;
}

function getChapterLabel(chapter, fallback) {
  const number = chapter?.chapter_number ?? chapter?.number;
  const name = chapter?.name ?? chapter?.title ?? chapter?.chapter_name;
  if (number && name) return `${number}. ${name}`;
  return name || fallback;
}

function getChapterDetail(response) {
  return response?.chapter ?? response?.data?.chapter ?? response?.data ?? response;
}

function getUserLanguage() {
  try {
    const user = JSON.parse(localStorage.getItem("studyyodha_user") || "null");
    return String(user?.language || user?.language_pref || "en").toLowerCase();
  } catch {
    return "en";
  }
}

function getGreetingMessage(voiceId = "edge_tts_hindi_female") {
  const hour = new Date().getHours();
  const isHindi = getUserLanguage().startsWith("hi");
  const isMale = voiceId === "edge_tts_hindi_male";
  const name = isMale ? (isHindi ? "अध्ययन" : "Adhyayan") : (isHindi ? "संस्कृति" : "Sanskriti");
  const verbSuffix = isMale ? "सकता हूँ" : "सकती हूँ";
  let greeting;

  if (hour >= 5 && hour < 12) {
    greeting = isHindi ? "सुप्रभात" : "Good morning";
  } else if (hour >= 12 && hour < 17) {
    greeting = isHindi ? "नमस्कार" : "Good afternoon";
  } else {
    greeting = isHindi ? "शुभ संध्या" : "Good evening";
  }

  return isHindi
    ? `${greeting}! मैं ${name} हूँ। आज मैं आपकी पढ़ाई में कैसे मदद कर ${verbSuffix}?`
    : `${greeting}! I am ${name}. How can I help you with your studies today?`;
}

function getInitialMessages(voiceId = "edge_tts_hindi_female") {
  return [{ from: "ai", text: getGreetingMessage(voiceId) }];
}

function getTutorReply(response) {
  if (typeof response === "string") return response;
  const reply = response?.reply
    ?? response?.response
    ?? response?.content
    ?? response?.text
    ?? response?.answer
    ?? response?.message
    ?? response?.data?.reply
    ?? response?.data?.response
    ?? response?.data?.content
    ?? response?.data?.answer
    ?? response?.data?.message
    ?? response?.result?.reply
    ?? response?.result?.response;
  return typeof reply === "string" ? reply : "I could not generate a response. Please try again.";
}

function cleanTextForSpeech(text) {
  if (!text || typeof text !== "string") return "";

  let cleaned = cleanMathFormatting(text);

  // 1. Remove code blocks
  cleaned = cleaned.replace(/```[\s\S]*?```/g, "");
  cleaned = cleaned.replace(/`([^`]+)`/g, "$1");

  // 2. Remove markdown images & links: ![alt](url) -> "" and [text](url) -> text
  cleaned = cleaned.replace(/!\[[^\]]*\]\([^)]*\)/g, "");
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");

  // 3. Remove Markdown headings (#, ##, ###, ####, etc.) to prevent TTS saying "हैश" (hash)
  cleaned = cleaned.replace(/^#+\s+/gm, "");
  cleaned = cleaned.replace(/\s+#+\s+/g, " ");
  cleaned = cleaned.replace(/#/g, "");

  // 4. Remove horizontal rules (---, ___, ***) to prevent "योजक चिह्न योजक चिह्न"
  cleaned = cleaned.replace(/^[-*_]{3,}\s*$/gm, "");

  // 5. Remove bold / italic markers (**text**, *text*, __text__, _text_)
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, "$1");
  cleaned = cleaned.replace(/\*([^*]+)\*/g, "$1");
  cleaned = cleaned.replace(/__([^_]+)__/g, "$1");
  cleaned = cleaned.replace(/_([^_]+)_/g, "$1");

  // 6. Remove bullet markers at line start (*, -, +, •) to prevent TTS saying "योजक चिह्न"
  cleaned = cleaned.replace(/^[\s]*[-*+•]\s+/gm, "");

  // 7. Remove blockquote markers
  cleaned = cleaned.replace(/^>\s+/gm, "");

  // 8. Replace standalone dashes/hyphens/em-dashes with comma/space for natural speech pause
  cleaned = cleaned.replace(/\s+[-–—]\s+/g, ", ");
  cleaned = cleaned.replace(/[-–—]{2,}/g, " ");
  cleaned = cleaned.replace(/(?<=\s)-(?=\s)/g, " ");

  // 9. Remove asterisks, tildes, backticks, pipe symbols
  cleaned = cleaned.replace(/[*~`|]/g, " ");

  // 10. Clean up symbols/emojis that TTS might pronounce awkwardly
  cleaned = cleaned.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, " ");

  // 11. Normalize excessive whitespace and punctuation
  cleaned = cleaned.replace(/,\s*,+/g, ",");
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  return cleaned;
}

function getChapterContent(chapter) {
  return chapter?.content
    ?? chapter?.text
    ?? chapter?.chapter_content
    ?? chapter?.extracted_text
    ?? chapter?.description
    ?? null;
}

const femaleKeywords = [
  "female", "woman", "swara", "kalpana", "neerja", "heera",
  "veena", "lekha", "kajal", "aditi", "pooja", "priya",
  "raveena", "zira", "natural", "online", "neural"
];

const realisticVoiceKeywords = [
  "natural", "neural", "online", "premium", "enhanced", "wavenet",
  "journey", "multilingual", "google", "microsoft", "edge"
];

function getBestIndianFemaleVoice() {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices?.() || [];
  if (!voices || voices.length === 0) return null;

  const scoredVoices = voices.map((voice) => {
    const name = voice.name.toLowerCase();
    const language = (voice.lang || "").toLowerCase().replace("_", "-");
    const isHindi = language.startsWith("hi") || name.includes("hindi");
    const isOnline = voice.localService === false;
    const realisticScore = realisticVoiceKeywords.filter((keyword) => name.includes(keyword)).length;
    const femaleScore = femaleKeywords.filter((keyword) => name.includes(keyword)).length;

    return {
      voice,
      score: (isHindi ? 100 : 0) + (isOnline ? 40 : 0) + realisticScore * 20 + femaleScore * 5,
    };
  });

  return scoredVoices.sort((first, second) => second.score - first.score)[0]?.voice || null;
}

export default function TutorChatPage() {
  const [searchParams] = useSearchParams();
  const subjectId = searchParams.get("subject_id");
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(subjectId || "");
  const [chapters, setChapters] = useState([]);
  const [selectedChapter, setSelectedChapter] = useState("");
  const [chapterProgress, setChapterProgress] = useState(null);
  const [completedChapterIds, setCompletedChapterIds] = useState(new Set());
  const [hideCompleted, setHideCompleted] = useState(false);
  const [chaptersLoading, setChaptersLoading] = useState(true);
  const [chaptersError, setChaptersError] = useState("");
  const [chapter, setChapter] = useState(null);
  const [chapterLoading, setChapterLoading] = useState(false);
  const [chapterError, setChapterError] = useState("");
  const [messages, setMessages] = useState(getInitialMessages);
  const [draft, setDraft] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState("");
  const [viewerMethod, setViewerMethod] = useState("direct"); // direct, google, mozilla
  const [isPadHidden, setIsPadHidden] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth <= 768;
    }
    return false;
  });
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsEngine, setTtsEngine] = useState("edge_tts");
  const [selectedVoiceId, setSelectedVoiceId] = useState("edge_tts_hindi_female");
  const [previewingVoiceId, setPreviewingVoiceId] = useState(null);
  const [showTtsModal, setShowTtsModal] = useState(false);
  const [modalTab, setModalTab] = useState("voices"); // "voices" | "hf_space" | "tester"
  const [customTestText, setCustomTestText] = useState("नमस्ते! मैं संस्कृति हूँ। आज हम गणित और विज्ञान पढ़ेंगे।");
  const [testVoiceSpeaker, setTestVoiceSpeaker] = useState("hi-IN-SwaraNeural - hi-IN (Female)");
  const [testRate, setTestRate] = useState(0);
  const [testPitch, setTestPitch] = useState(0);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const recognitionRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Fetch student's completed chapters
  useEffect(() => {
    let active = true;
    async function loadAllProgress() {
      try {
        let summaryRes = null;
        try {
          summaryRes = await get("/progress/parent-report");
        } catch (e1) {
          try {
            summaryRes = await get("/progress/summary");
          } catch (e2) {
            // progress API not deployed on remote backend yet
          }
        }
        if (active && summaryRes?.chapters) {
          const completedSet = new Set(
            summaryRes.chapters
              .filter((c) => c.status === "completed" || c.percent_complete >= 100)
              .map((c) => String(c.chapter_id))
          );
          setCompletedChapterIds(completedSet);
        }
      } catch (err) {
        // silent catch
      }
    }
    loadAllProgress();
    return () => { active = false; };
  }, []);

  // Chapter time tracking effect
  useEffect(() => {
    if (!selectedChapter) {
      setChapterProgress(null);
      return;
    }

    let active = true;

    async function fetchProgress() {
      try {
        const res = await get(`/progress/chapter/${selectedChapter}`);
        if (active && res?.progress) {
          setChapterProgress(res.progress);
          if (res.progress.status === "completed" || res.progress.percent_complete >= 100) {
            setCompletedChapterIds((prev) => new Set([...prev, String(selectedChapter)]));
          }
        }
      } catch (e) {
        // quiet catch
      }
    }

    fetchProgress();

    // Heartbeat every 10 seconds to log active study time
    const intervalId = setInterval(async () => {
      try {
        const res = await post('/progress/track-time', {
          chapter_id: selectedChapter,
          seconds: 10,
        });
        if (active && res?.progress) {
          setChapterProgress(res.progress);
        }
      } catch (err) {
        // silent catch
      }
    }, 10000);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [selectedChapter]);

  const markChapterCompleted = async () => {
    if (!selectedChapter) return;
    try {
      const res = await post('/progress/update', {
        chapter_id: selectedChapter,
        status: 'completed',
        percent_complete: 100,
      });
      if (res?.progress) {
        setChapterProgress(res.progress);
        const updatedSet = new Set(completedChapterIds);
        const doneId = String(selectedChapter);
        updatedSet.add(doneId);
        setCompletedChapterIds(updatedSet);

        // If hideCompleted is true, auto select next uncompleted chapter
        if (hideCompleted) {
          const remaining = chapters.filter((c, idx) => {
            const cid = String(getChapterId(c, idx + 1));
            return !updatedSet.has(cid);
          });
          if (remaining.length > 0) {
            setSelectedChapter(String(getChapterId(remaining[0], 1)));
          } else {
            setSelectedChapter("");
          }
        }
      }
    } catch (err) {
      console.error("Failed to mark chapter complete", err);
    }
  };

  const displayedChapters = chapters.filter((ch, index) => {
    const chId = String(getChapterId(ch, index + 1));
    if (hideCompleted && completedChapterIds.has(chId)) {
      return false;
    }
    return true;
  });

  const isSelectedChapterCompleted = selectedChapter
    ? (completedChapterIds.has(String(selectedChapter)) || chapterProgress?.status === "completed")
    : false;

  useEffect(() => {
    if (subjectId) {
      setSelectedSubject(subjectId);
    }
  }, [subjectId]);

  useEffect(() => {
    let active = true;
    async function loadSubjects() {
      try {
        const storedUser = JSON.parse(localStorage.getItem("studyyodha_user") || "null");
        const studentClassId = storedUser?.student_profile?.class_id || storedUser?.student_profile?.class?.id || storedUser?.class_id;

        const endpoint = (studentClassId && isFinite(studentClassId)) ? `/subjects?class_id=${encodeURIComponent(studentClassId)}` : "/subjects";
        let response = await get(endpoint);
        let list = response?.subjects || response?.data || (Array.isArray(response) ? response : []);

        // Fallback: If filtered returned nothing, load all available subjects
        if (Array.isArray(list) && list.length === 0 && studentClassId) {
          response = await get("/subjects");
          list = response?.subjects || response?.data || (Array.isArray(response) ? response : []);
        }

        if (active && Array.isArray(list) && list.length > 0) {
          setSubjects(list);
          if (!subjectId && !selectedSubject) {
            setSelectedSubject(String(list[0].id));
          }
        }
      } catch (err) {
        console.error("Failed to load subjects", err);
      }
    }
    loadSubjects();
    return () => { active = false; };
  }, []);

  const handlePlayVoicePreview = async (voice) => {
    setPreviewingVoiceId(voice.id);
    await previewVoice(voice, voice.sampleText, {
      onStart: () => setIsSpeaking(true),
      onEnd: () => {
        setIsSpeaking(false);
        setPreviewingVoiceId(null);
      },
      onError: () => {
        setIsSpeaking(false);
        setPreviewingVoiceId(null);
      }
    });
  };

  const stopAll = () => {
    stopSpeech();
    setIsSpeaking(false);
    setPreviewingVoiceId(null);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsSending(false);

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  const speak = (text) => {
    const activeVoice = AVAILABLE_VOICES.find(v => v.id === selectedVoiceId) || AVAILABLE_VOICES[0];
    speakText(text, {
      engine: activeVoice.engine,
      speaker: activeVoice.speaker,
      language: getUserLanguage(),
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  useEffect(() => {
    let active = true;

    async function loadChapters() {
      const activeSubjectId = selectedSubject || subjectId;
      setChaptersLoading(true);
      setChaptersError("");

      try {
        const endpoint = activeSubjectId
          ? `/chapters?subject_id=${encodeURIComponent(activeSubjectId)}`
          : "/chapters";
        const response = await get(endpoint);
        const items = getItems(response);
        if (active) {
          setChapters(items);
          if (items.length > 0) {
            setSelectedChapter((prev) => {
              const exists = items.some(ch => String(getChapterId(ch, "")) === String(prev));
              return exists ? prev : String(getChapterId(items[0], 1));
            });
          } else {
            setSelectedChapter("");
          }
        }
      } catch (error) {
        if (active) setChaptersError(error.message || "Failed to load chapters");
      } finally {
        if (active) setChaptersLoading(false);
      }
    }

    loadChapters();
    return () => { active = false; };
  }, [subjectId, selectedSubject]);

  useEffect(() => {
    let active = true;

    async function loadChapter() {
      if (!selectedChapter) {
        setChapter(null);
        setChapterError("");
        setViewerMethod("direct");
        // Reset to initial greeting when no chapter selected
        setMessages(getInitialMessages());
        return;
      }

      setChapterLoading(true);
      setChapterError("");
      setViewerMethod("direct");

      try {
        const response = await get(`/chapters/${encodeURIComponent(selectedChapter)}`);
        if (active) {
          const loadedChapter = getChapterDetail(response);
          setChapter(loadedChapter);
          
          // Add a context-aware greeting when chapter loads
          const chapterLabel = getChapterLabel(loadedChapter, selectedChapter);
          const isHindi = getUserLanguage().startsWith("hi");
          const isMale = selectedVoiceId === "edge_tts_hindi_male";
          const tutorName = isMale ? (isHindi ? "अध्ययन" : "Adhyayan") : (isHindi ? "संस्कृति" : "Sanskriti");
          const verbExplain = isMale ? "समझाऊंगा" : "समझाऊंगी";
          const greeting = isHindi
            ? `मैं ${tutorName} हूँ। मैं देख रहा हूँ कि आपने ${chapterLabel} चुना है। मैं इस अध्याय में आपकी मदद के लिए तैयार हूँ। आप मुझसे कोई भी प्रश्न पूछ सकते हैं या कह सकते हैं "इस अध्याय को पढ़ो" और मैं मुख्य अवधारणाओं को ${verbExplain}!`
            : `I am ${tutorName}. I can see you've selected ${chapterLabel}. I'm here to help you understand this chapter. You can ask me any questions, or say "read this chapter" and I'll explain the key concepts!`;
          
          setMessages([{ from: "ai", text: greeting }]);
        }
      } catch (error) {
        if (active) {
          setChapter(null);
          setChapterError(error.message);
        }
      } finally {
        if (active) setChapterLoading(false);
      }
    }

    loadChapter();
    return () => { active = false; };
  }, [selectedChapter]);

  const send = async (message = draft) => {
    const question = message.trim();
    if (!question || isSending) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const userMessage = { from: "user", text: question };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setDraft("");
    setChatError("");
    setIsSending(true);

    try {
      const chapterLabel = String(chapter ? getChapterLabel(chapter, selectedChapter) : selectedChapter || "");
      const chapterContent = getChapterContent(chapter);
      
      // Enhanced: Create a clear message about PDF availability
      let contentMessage = chapterContent;
      let systemMessage = "";
      
      if (!chapterContent && chapter?.source_file_url) {
        // No extracted text, but PDF is available
        const isHindi = getUserLanguage().startsWith("hi");
        systemMessage = isHindi
          ? `[सिस्टम संदेश: छात्र ने अध्याय "${chapterLabel}" का PDF खोला हुआ है और देख रहा है। PDF सामग्री सीधे उपलब्ध नहीं है, लेकिन छात्र इसे पढ़ सकता है। कृपया छात्र से पूछें कि वे अध्याय के किस हिस्से या अवधारणा में मदद चाहते हैं।]`
          : `[SYSTEM MESSAGE: The student has the PDF of chapter "${chapterLabel}" open and is viewing it. The PDF content is not directly extracted, but the student can see and read it. Please acknowledge the chapter and ask the student what specific part or concept they need help with. If they say "read this chapter", offer to explain the key concepts typically covered in such chapters, or ask them to point to specific sections, topics, or page numbers they'd like help with.]`;
        
        contentMessage = systemMessage;
      } else if (chapterContent) {
        // We have extracted content
        const isHindi = getUserLanguage().startsWith("hi");
        systemMessage = isHindi
          ? `[सिस्टम संदेश: अध्याय "${chapterLabel}" की सामग्री उपलब्ध है। कृपया इस सामग्री के आधार पर उत्तर दें।]\n\n${chapterContent}`
          : `[SYSTEM MESSAGE: The chapter "${chapterLabel}" content is available below. Please base your responses on this content.]\n\n${chapterContent}`;
        
        contentMessage = systemMessage;
      }
      
      const chapterContext = {
        id: selectedChapter || null,
        title: chapterLabel,
        content: contentMessage,
        chapter_content: contentMessage,
        pdf_url: chapter?.source_file_url ?? null,
        source_file_url: chapter?.source_file_url ?? null,
        has_pdf: !!chapter?.source_file_url,
        has_extracted_text: !!chapterContent,
      };
      
      const response = await post(TUTOR_CHAT_ENDPOINT, {
        question,
        message: question,
        subject_id: subjectId,
        chapter_id: selectedChapter || null,
        chapter_content: contentMessage,
        pdf_url: chapterContext.pdf_url,
        source_file_url: chapterContext.source_file_url,
        chapter: chapterLabel,
        chapter_context: chapterContext,
        context: {
          subject_id: subjectId,
          chapter_id: selectedChapter || null,
          chapter: chapterLabel,
          chapter_content: contentMessage,
          pdf_url: chapterContext.pdf_url,
          source_file_url: chapterContext.source_file_url,
          has_pdf: chapterContext.has_pdf,
          has_extracted_text: chapterContext.has_extracted_text,
          voice_id: selectedVoiceId,
        },
        language: getUserLanguage(),
        messages: nextMessages.map(({ from, text }) => ({ role: from === "ai" ? "assistant" : "user", content: text })),
      }, { signal: controller.signal });
      const reply = getTutorReply(response);
      setMessages((current) => [...current, { from: "ai", text: reply }]);
      speak(reply);
    } catch (error) {
      if (error.name === "AbortError" || error.message?.includes("aborted")) {
        return;
      }
      setChatError(error.message || "Unable to reach your AI tutor.");
    } finally {
      setIsSending(false);
      abortControllerRef.current = null;
    }
  };

  const clearMessages = () => {
    stopAll();
    setMessages([]);
    setDraft("");
    setChatError("");
  };

  const toggleVoiceInput = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError("Voice input is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-IN";
    recognition.onstart = () => {
      setVoiceError("");
      setIsListening(true);
    };
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.trim();
      if (!transcript) return;
      send(transcript);
    };
    recognition.onerror = () => {
      setVoiceError("Could not capture your voice. Please try again.");
      setIsListening(false);
      recognitionRef.current = null;
    };
    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };
    recognitionRef.current = recognition;
    setVoiceError("");
    setIsListening(true);

    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setIsListening(false);
      setVoiceError("Could not start voice input. Please try again.");
    }
  };

  useEffect(() => () => {
    recognitionRef.current?.stop();
    window.speechSynthesis?.cancel();
  }, []);

  return (
    <div className="tutor-page">
      <div className={`tutor-workspace ${isPadHidden ? "pad-hidden" : ""}`}>
        <section className={`tutor-reader ${isPadHidden ? "is-hidden" : ""}`}>
          <div className="tutor-reader-toolbar">
            <div className="tutor-reader-title-group">
              <BookOpen size={16} />
              <span>{chapter ? getChapterLabel(chapter, "Selected chapter") : "Selected chapter"}</span>
            </div>
            <div className="tutor-reader-actions">
              {chapterProgress && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#f1f5f9',
                  padding: '4px 10px',
                  borderRadius: '16px',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#0f172a',
                  border: '1px solid #cbd5e1'
                }}>
                  <span>⏱️ {chapterProgress.formatted_time_spent || '0s'} studied</span>
                  <button
                    type="button"
                    onClick={markChapterCompleted}
                    style={{
                      background: chapterProgress.status === 'completed' ? '#059669' : '#e07a3f',
                      color: '#ffffff',
                      border: 'none',
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                    title="Click to mark this chapter as completed"
                  >
                    {chapterProgress.status === 'completed' ? '✓ Completed' : 'Mark Complete'}
                  </button>
                </div>
              )}
              <div className="tutor-page-controls">
                <button type="button" title="Previous page"><ChevronLeft size={15} /></button>
                <span>Pg 112</span>
                <button type="button" title="Next page"><ChevronRight size={15} /></button>
              </div>
              <button
                type="button"
                className="tutor-hide-pad-button"
                onClick={() => setIsPadHidden(true)}
                title="Hide Pad & Expand Chat Full Screen"
                aria-label="Hide Pad and expand chat to full screen"
              >
                <PanelLeftClose size={14} />
                <span>Hide Pad</span>
              </button>
            </div>
          </div>
          <article className="tutor-paper">
            {chapterLoading && <p className="tutor-reader-status">Loading chapter PDF and extracting text...</p>}
            {!chapterLoading && (chapterError || chaptersError) && (
              <p className="tutor-reader-status tutor-reader-error">{chapterError || chaptersError}</p>
            )}
            {!chapterLoading && !chapterError && !chaptersError && chapter?.source_file_url && (
              <>
                {viewerMethod === "direct" && (
                  <iframe
                    className="tutor-pdf"
                    src={`${chapter.source_file_url}#toolbar=0&navpanes=0&scrollbar=1`}
                    title={`${getChapterLabel(chapter, "Chapter")} PDF`}
                    allow="fullscreen"
                    loading="lazy"
                  />
                )}
                {viewerMethod === "google" && (
                  <iframe
                    className="tutor-pdf"
                    src={`https://docs.google.com/viewer?url=${encodeURIComponent(chapter.source_file_url)}&embedded=true`}
                    title={`${getChapterLabel(chapter, "Chapter")} PDF`}
                    allow="fullscreen"
                    loading="lazy"
                  />
                )}
                {viewerMethod === "mozilla" && (
                  <iframe
                    className="tutor-pdf"
                    src={`https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(chapter.source_file_url)}`}
                    title={`${getChapterLabel(chapter, "Chapter")} PDF`}
                    allow="fullscreen"
                    loading="lazy"
                  />
                )}
                <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '12px', alignItems: 'center' }}>
                  {chapter.has_extracted_text && (
                    <span style={{ 
                      padding: '6px 12px', 
                      background: '#4c8b78',
                      color: '#fff',
                      borderRadius: '6px',
                      fontSize: '11px'
                    }}>
                      ✓ Text Extracted - AI can read this chapter
                    </span>
                  )}
                  <button 
                    onClick={() => setViewerMethod("direct")}
                    style={{ 
                    padding: '6px 12px', 
                    background: viewerMethod === "direct" ? '#e07a3f' : '#fff',
                    color: viewerMethod === "direct" ? '#fff' : '#33405b',
                    border: '1px solid #d7d1c2',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Direct View
                </button>
                <button 
                  onClick={() => setViewerMethod("google")}
                  style={{ 
                    padding: '6px 12px', 
                    background: viewerMethod === "google" ? '#e07a3f' : '#fff',
                    color: viewerMethod === "google" ? '#fff' : '#33405b',
                    border: '1px solid #d7d1c2',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Google Viewer
                </button>
                <button 
                  onClick={() => setViewerMethod("mozilla")}
                  style={{ 
                    padding: '6px 12px', 
                    background: viewerMethod === "mozilla" ? '#e07a3f' : '#fff',
                    color: viewerMethod === "mozilla" ? '#fff' : '#33405b',
                    border: '1px solid #d7d1c2',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  PDF.js Viewer
                </button>
                <a 
                  href={chapter.source_file_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ 
                    padding: '6px 12px', 
                    background: '#4c8b78',
                    color: '#fff',
                    border: '1px solid #4c8b78',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    display: 'inline-block'
                  }}
                >
                  Open in New Tab
                </a>
              </div>
            </>
          )}
          {!chapterLoading && !chapterError && !chaptersError && chapter && !chapter.source_file_url && (
            <p className="tutor-reader-status">This chapter does not have a PDF available yet.</p>
          )}
          {!chapterLoading && !chapterError && !chaptersError && !chapter && (
            <p className="tutor-reader-status">Select a chapter to open its PDF.</p>
          )}
        </article>
      </section>

      <aside className={`tutor-chat ${isPadHidden ? "fullscreen" : ""}`}>
        <div className="tutor-chat-header-bar">
          <div className="tutor-picker-group">
            {subjects.length > 0 && (
              <>
                <label htmlFor="subject-select" className="tutor-picker-label">Subject</label>
                <select
                  id="subject-select"
                  className="tutor-chapter-select"
                  value={selectedSubject}
                  onChange={(event) => setSelectedSubject(event.target.value)}
                >
                  <option value="">All Subjects</option>
                  {subjects.map((sub) => (
                    <option key={sub.id} value={String(sub.id)}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </>
            )}
            <label htmlFor="chapter-select" className="tutor-picker-label">Chapter</label>
            <select
              id="chapter-select"
              className="tutor-chapter-select"
              value={selectedChapter}
              onChange={(event) => setSelectedChapter(event.target.value)}
              disabled={chaptersLoading || displayedChapters.length === 0}
            >
              <option value="">
                {chaptersLoading
                  ? "Loading chapters..."
                  : (displayedChapters.length === 0
                      ? (hideCompleted && chapters.length > 0 ? "All chapters completed 🎉" : (chaptersError || "No chapters found"))
                      : "Select Chapter")}
              </option>
              {displayedChapters.map((chapter, index) => {
                const chId = String(getChapterId(chapter, index + 1));
                const isDone = completedChapterIds.has(chId);
                return (
                  <option key={chId} value={chId}>
                    {isDone ? "✓ " : ""}{getChapterLabel(chapter, `Chapter ${index + 1}`)}{isDone ? " (Completed)" : ""}
                  </option>
                );
              })}
            </select>
            {selectedChapter && (
              <button
                type="button"
                onClick={markChapterCompleted}
                style={{
                  padding: '5px 12px',
                  fontSize: '11px',
                  borderRadius: '6px',
                  border: 'none',
                  background: isSelectedChapterCompleted ? '#059669' : '#e07a3f',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontWeight: '700',
                  whiteSpace: 'nowrap',
                  marginLeft: '6px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.12)'
                }}
                title="Click to mark this selected chapter as completed"
              >
                {isSelectedChapterCompleted ? '✓ Completed' : 'Mark Complete'}
              </button>
            )}
            <button
              type="button"
              onClick={() => setHideCompleted(!hideCompleted)}
              style={{
                padding: '5px 10px',
                fontSize: '11px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: hideCompleted ? '#e07a3f' : '#ffffff',
                color: hideCompleted ? '#ffffff' : '#33405b',
                cursor: 'pointer',
                fontWeight: '600',
                whiteSpace: 'nowrap',
                marginLeft: '4px'
              }}
              title="Click to hide or show completed chapters in dropdown"
            >
              {hideCompleted ? "🙈 Hiding Completed" : "👁️ Hide Completed"}
            </button>
          </div>

          <div className="tutor-chat-header-actions">
            <div className="tutor-tts-badge" title="Select Active AI Voice Engine">
              <span className="tutor-tts-dot piper-online" />
              <select
                className="tutor-tts-select"
                value={selectedVoiceId}
                onChange={(e) => {
                  setSelectedVoiceId(e.target.value);
                  const found = AVAILABLE_VOICES.find(v => v.id === e.target.value);
                  if (found) setTtsEngine(found.engine);
                }}
                title="Select Active Voice Engine"
                aria-label="Select Active Voice Engine"
              >
                {AVAILABLE_VOICES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowTtsModal(true)}
                style={{
                  background: "#e07a3f",
                  color: "#ffffff",
                  border: "none",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  whiteSpace: "nowrap"
                }}
                title="Open Voice Preview & Selection Modal"
              >
                <Volume2 size={14} />
                <span>Voice Preview</span>
              </button>
            </div>


            {isPadHidden ? (
              <button
                type="button"
                className="tutor-toggle-pad-btn tutor-toggle-pad-btn--show"
                onClick={() => setIsPadHidden(false)}
                title="Show Study Pad (Split View)"
              >
                <BookOpen size={14} />
                <span>Show Pad</span>
              </button>
            ) : (
              <button
                type="button"
                className="tutor-toggle-pad-btn tutor-toggle-pad-btn--hide"
                onClick={() => setIsPadHidden(true)}
                title="Hide Pad & Expand Chat"
              >
                <Maximize2 size={14} />
                <span>Full Screen Chat</span>
              </button>
            )}
            <button
              type="button"
              className={`tutor-stop-btn ${isSpeaking || isSending || isListening ? "tutor-stop-btn--active" : ""}`}
              onClick={stopAll}
              title="Stop voice, reading aloud, or AI response"
              aria-label="Stop chat voice or AI response"
            >
              <Square size={13} fill="currentColor" />
              <span>Stop</span>
            </button>
            <button
              type="button"
              className="tutor-clear-chat-btn"
              onClick={clearMessages}
              title="Clear chat"
              aria-label="Clear chat"
            >
              <Trash2 size={14} />
              <span>Clear Chat</span>
            </button>
          </div>
        </div>
        {chaptersError && <p className="tutor-picker-error" style={{ marginBottom: "10px" }}>{chaptersError}</p>}

        <div className="tutor-messages">
          {messages.map((m, i) => (
            <div key={i} className={`tutor-message ${m.from === "user" ? "user-message" : "ai-message"}`}>
              <div className="tutor-message-label">{m.from === "ai" ? (selectedVoiceId === "edge_tts_hindi_female" ? "Sanskriti" : "Adhyayan") : "You"}</div>
              {m.from === "ai" ? (
                <div className="tutor-message-markdown">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {cleanMathFormatting(m.text)}
                  </ReactMarkdown>
                </div>
              ) : (
                <div>{m.text}</div>
              )}
              {m.from === "ai" && (
                <button
                  type="button"
                  className={`tutor-speak-message ${isSpeaking ? "is-speaking" : ""}`}
                  onClick={() => (isSpeaking ? stopAll() : speak(m.text))}
                  title={isSpeaking ? "Stop reading aloud" : "Read answer aloud"}
                  aria-label={isSpeaking ? "Stop reading aloud" : "Read answer aloud"}
                >
                  {isSpeaking ? <VolumeX size={13} color="#b74d3d" /> : <Volume2 size={13} />}
                </button>
              )}
            </div>
          ))}
          {isSending && <div className="tutor-message ai-message">{selectedVoiceId === "edge_tts_hindi_female" ? "Sanskriti" : "Adhyayan"} is thinking...</div>}
        </div>

        <div className="tutor-composer">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Apna doubt likhein..."
            className="tutor-message-input"
            disabled={isSending}
          />
          <div className="tutor-composer-actions">
            {(isSending || isSpeaking || isListening) && (
              <button
                type="button"
                className="tutor-composer-stop-btn"
                onClick={stopAll}
                title="Stop AI voice / response"
                aria-label="Stop AI voice or response"
              >
                <Square size={13} fill="currentColor" />
                <span>Stop</span>
              </button>
            )}
            <button
              type="button"
              className={isListening ? "voice-active" : ""}
              title={isListening ? "Stop voice input" : "Voice input"}
              onClick={toggleVoiceInput}
              aria-label={isListening ? "Stop voice input" : "Voice input"}
            >
              <Mic size={15} />
            </button>
            <button title="Attach photo" type="button"><Camera size={15} /></button>
            <PrimaryButton onClick={() => send()} disabled={isSending}>
              <Send size={15} color="white" />
            </PrimaryButton>
          </div>
          {voiceError && <p className="tutor-picker-error">{voiceError}</p>}
          {chatError && <p className="tutor-picker-error">{chatError}</p>}
        </div>
      </aside>

      {showTtsModal && (
        <div className="admin-modal-backdrop" onClick={() => setShowTtsModal(false)}>
          <div className="admin-modal-container" style={{ maxWidth: "860px", width: "95%" }} onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header" style={{ padding: "16px 22px", background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", color: "#ffffff", borderTopLeftRadius: "12px", borderTopRightRadius: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: "700", fontSize: "16px" }}>
                <Volume2 size={22} color="#e07a3f" />
                <span>Edge TTS & Voice Selection Modal (आवाज़ इंजन पूर्वावलोकन)</span>
                <span style={{ fontSize: "11px", background: "#e07a3f", color: "#fff", padding: "2px 10px", borderRadius: "12px", fontWeight: "600" }}>
                  HF Space: innoai/Edge-TTS
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowTtsModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", padding: "0 20px" }}>
              <button
                type="button"
                onClick={() => setModalTab("voices")}
                style={{
                  padding: "12px 18px",
                  border: "none",
                  borderBottom: modalTab === "voices" ? "3px solid #e07a3f" : "3px solid transparent",
                  background: "none",
                  fontWeight: modalTab === "voices" ? "700" : "600",
                  color: modalTab === "voices" ? "#e07a3f" : "#64748b",
                  cursor: "pointer",
                  fontSize: "13px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <Volume2 size={15} />
                <span>Voices Catalog (आवाज़ सूची)</span>
              </button>

              <button
                type="button"
                onClick={() => setModalTab("hf_space")}
                style={{
                  padding: "12px 18px",
                  border: "none",
                  borderBottom: modalTab === "hf_space" ? "3px solid #e07a3f" : "3px solid transparent",
                  background: "none",
                  fontWeight: modalTab === "hf_space" ? "700" : "600",
                  color: modalTab === "hf_space" ? "#e07a3f" : "#64748b",
                  cursor: "pointer",
                  fontSize: "13px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <ExternalLink size={15} />
                <span>Hugging Face Live Space</span>
              </button>

              <button
                type="button"
                onClick={() => setModalTab("tester")}
                style={{
                  padding: "12px 18px",
                  border: "none",
                  borderBottom: modalTab === "tester" ? "3px solid #e07a3f" : "3px solid transparent",
                  background: "none",
                  fontWeight: modalTab === "tester" ? "700" : "600",
                  color: modalTab === "tester" ? "#e07a3f" : "#64748b",
                  cursor: "pointer",
                  fontSize: "13px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <Sliders size={15} />
                <span>Custom Voice Synthesizer</span>
              </button>
            </div>

            <div className="admin-modal-body" style={{ padding: "20px", maxHeight: "72vh", overflowY: "auto" }}>
              {modalTab === "voices" && (
                <>
                  <p style={{ margin: "0 0 16px", fontSize: "13px", color: "#475569" }}>
                    Select your preferred AI tutor voice engine. ⚡ <strong>Edge TTS Neural Voices (Swara & Madhur)</strong> are hosted on HuggingFace Space (<code>innoai/Edge-TTS-Text-to-Speech</code>) for high-quality natural Hindi speech synthesis:
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {AVAILABLE_VOICES.map((voice) => {
                      const isSelected = selectedVoiceId === voice.id;
                      const isPreviewing = previewingVoiceId === voice.id;

                      return (
                        <div
                          key={voice.id}
                          style={{
                            padding: "16px",
                            borderRadius: "12px",
                            border: isSelected ? "2px solid #059669" : "1px solid #cbd5e1",
                            background: isSelected ? "#f0fdf4" : "#ffffff",
                            transition: "all 0.2s ease"
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <input
                                type="radio"
                                id={`voice-radio-${voice.id}`}
                                name="activeVoice"
                                checked={isSelected}
                                onChange={() => {
                                  setSelectedVoiceId(voice.id);
                                  setTtsEngine(voice.engine);
                                }}
                                style={{ cursor: "pointer", accentColor: "#059669", width: "16px", height: "16px" }}
                              />
                              <label htmlFor={`voice-radio-${voice.id}`} style={{ fontWeight: "700", color: "#0f172a", fontSize: "14px", cursor: "pointer" }}>
                                {voice.name}
                              </label>
                            </div>
                            <span style={{
                              fontSize: "11px",
                              fontWeight: "600",
                              padding: "3px 10px",
                              borderRadius: "12px",
                              color: voice.badgeColor,
                              background: voice.badgeBg
                            }}>
                              {voice.badge}
                            </span>
                          </div>

                          <p style={{ margin: "0 0 10px 24px", fontSize: "12px", color: "#64748b" }}>
                            {voice.description}
                          </p>

                          <div style={{
                            marginLeft: "24px",
                            padding: "10px 12px",
                            background: isSelected ? "#ffffff" : "#f8fafc",
                            border: "1px solid #cbd5e1",
                            borderRadius: "8px",
                            fontSize: "12px",
                            color: "#334155",
                            marginBottom: "10px"
                          }}>
                            💬 Sample: <em>"{voice.sampleText}"</em>
                          </div>

                          <div style={{ marginLeft: "24px", display: "flex", gap: "8px" }}>
                            <button
                              type="button"
                              onClick={() => handlePlayVoicePreview(voice)}
                              disabled={isPreviewing}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "6px 14px",
                                borderRadius: "6px",
                                background: isPreviewing ? "#3b82f6" : "#e07a3f",
                                color: "#ffffff",
                                border: "none",
                                fontSize: "12px",
                                fontWeight: "600",
                                cursor: isPreviewing ? "default" : "pointer"
                              }}
                            >
                              {isPreviewing ? <RefreshCw size={13} className="pipeline-spinner" /> : <Volume2 size={13} />}
                              <span>{isPreviewing ? "Playing Preview..." : "▶ Play Voice Preview"}</span>
                            </button>

                            {!isSelected && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedVoiceId(voice.id);
                                  setTtsEngine(voice.engine);
                                }}
                                style={{
                                  padding: "6px 12px",
                                  borderRadius: "6px",
                                  background: "#ffffff",
                                  color: "#059669",
                                  border: "1px solid #059669",
                                  fontSize: "12px",
                                  fontWeight: "600",
                                  cursor: "pointer"
                                }}
                              >
                                Set Active Voice
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {modalTab === "hf_space" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div style={{
                    padding: "12px 16px",
                    background: "#eff6ff",
                    border: "1px solid #bfdbfe",
                    borderRadius: "10px",
                    display: "flex",
                    justify: "space-between",
                    alignItems: "center"
                  }}>
                    <div>
                      <div style={{ fontWeight: "700", color: "#1e40af", fontSize: "13px" }}>
                        🤗 HuggingFace Space: innoai/Edge-TTS-Text-to-Speech
                      </div>
                      <div style={{ fontSize: "12px", color: "#3b82f6", marginTop: "2px" }}>
                        Directly integrated live Gradio interface for Microsoft Edge Text-to-Speech (Hindi voices & options).
                      </div>
                    </div>
                    <a
                      href="https://huggingface.co/spaces/innoai/Edge-TTS-Text-to-Speech"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "7px 14px",
                        background: "#2563eb",
                        color: "#ffffff",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: "600",
                        textDecoration: "none"
                      }}
                    >
                      <span>Open on HuggingFace</span>
                      <ExternalLink size={13} />
                    </a>
                  </div>

                  <iframe
                    src="https://innoai-edge-tts-text-to-speech.hf.space"
                    title="Hugging Face Edge-TTS Space"
                    style={{
                      width: "100%",
                      height: "540px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "12px",
                      background: "#ffffff"
                    }}
                  />
                </div>
              )}

              {modalTab === "tester" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{
                    padding: "12px 16px",
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    borderRadius: "10px",
                    fontSize: "13px",
                    color: "#166534"
                  }}>
                    ✨ <strong>Edge TTS Speech Synthesizer:</strong> Type any text in Hindi or English, choose pitch/rate adjustments, and synthesize natural speech in real time!
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>Target Hindi Voice</label>
                    <select
                      value={testVoiceSpeaker}
                      onChange={(e) => setTestVoiceSpeaker(e.target.value)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        fontSize: "13px",
                        fontWeight: "600",
                        color: "#0f172a"
                      }}
                    >
                      <option value="hi-IN-MadhurNeural - hi-IN (Male)">hi-IN-MadhurNeural - Hindi Male Teacher (अध्ययन)</option>
                      <option value="hi-IN-SwaraNeural - hi-IN (Female)">hi-IN-SwaraNeural - Hindi Female (संस्कृति)</option>
                    </select>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <label style={{ fontSize: "12px", fontWeight: "600", color: "#475569" }}>
                        Speech Rate Adjustment (%): <strong>{Number(testRate) > 0 ? `+${testRate}` : testRate}%</strong>
                      </label>
                      <input
                        type="range"
                        min="-50"
                        max="50"
                        value={testRate}
                        onChange={(e) => setTestRate(e.target.value)}
                        style={{ accentColor: "#e07a3f", cursor: "pointer" }}
                      />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <label style={{ fontSize: "12px", fontWeight: "600", color: "#475569" }}>
                        Pitch Adjustment (Hz): <strong>{Number(testPitch) > 0 ? `+${testPitch}` : testPitch} Hz</strong>
                      </label>
                      <input
                        type="range"
                        min="-20"
                        max="20"
                        value={testPitch}
                        onChange={(e) => setTestPitch(e.target.value)}
                        style={{ accentColor: "#e07a3f", cursor: "pointer" }}
                      />
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>Text to Synthesize</label>
                    <textarea
                      rows={3}
                      value={customTestText}
                      onChange={(e) => setCustomTestText(e.target.value)}
                      placeholder="हिंदी पाठ लिखें..."
                      style={{
                        padding: "10px 12px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        fontSize: "13px",
                        fontFamily: "inherit"
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <button
                      type="button"
                      onClick={() => {
                        speakText(customTestText, {
                          engine: "edge_tts",
                          speaker: testVoiceSpeaker,
                          rate: Number(testRate),
                          pitch: Number(testPitch),
                          onStart: () => setIsSpeaking(true),
                          onEnd: () => setIsSpeaking(false),
                          onError: () => setIsSpeaking(false),
                        });
                      }}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "10px 20px",
                        background: "#e07a3f",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "8px",
                        fontWeight: "700",
                        fontSize: "13px",
                        cursor: "pointer"
                      }}
                    >
                      <Volume2 size={16} />
                      <span>⚡ Synthesize & Speak with Edge TTS</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="admin-modal-footer" style={{ padding: "14px 22px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}>
              <div style={{ fontSize: "12px", color: "#059669", fontWeight: "600" }}>
                ✓ Active Voice: {AVAILABLE_VOICES.find(v => v.id === selectedVoiceId)?.name}
              </div>
              <PrimaryButton onClick={() => setShowTtsModal(false)}>
                Done & Save Voice
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

    </div>
  </div>
  );
}
