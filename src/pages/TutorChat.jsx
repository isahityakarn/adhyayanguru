import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Mic, Camera, Send, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { Input, PrimaryButton } from "../components/UI";
import { get } from "../utils/api";

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

function getGreetingMessage() {
  const hour = new Date().getHours();
  const isHindi = getUserLanguage().startsWith("hi");
  let greeting;

  if (hour >= 5 && hour < 12) {
    greeting = isHindi ? "सुप्रभात" : "Good morning";
  } else if (hour >= 12 && hour < 17) {
    greeting = isHindi ? "नमस्कार" : "Good afternoon";
  } else {
    greeting = isHindi ? "शुभ संध्या" : "Good evening";
  }

  return isHindi
    ? `${greeting} मैं अध्ययन हूँ। आज मैं आपकी पढ़ाई में कैसे मदद कर सकता हूँ?`
    : `${greeting}! I am Adhyayan. How can I help you with your studies today?`;
}

function getInitialMessages() {
  return [{ from: "ai", text: getGreetingMessage() }];
}

export default function TutorChatPage() {
  const [searchParams] = useSearchParams();
  const subjectId = searchParams.get("subject_id");
  const [chapters, setChapters] = useState([]);
  const [selectedChapter, setSelectedChapter] = useState("");
  const [chaptersLoading, setChaptersLoading] = useState(true);
  const [chaptersError, setChaptersError] = useState("");
  const [chapter, setChapter] = useState(null);
  const [chapterLoading, setChapterLoading] = useState(false);
  const [chapterError, setChapterError] = useState("");
  const [messages, setMessages] = useState(getInitialMessages);
  const [draft, setDraft] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const recognitionRef = useRef(null);

  useEffect(() => {
    let active = true;

    async function loadChapters() {
      if (!subjectId) {
        setChaptersError("No subject selected.");
        setChaptersLoading(false);
        return;
      }

      try {
        const response = await get(`/chapters?subject_id=${encodeURIComponent(subjectId)}`);
        const items = getItems(response);
        if (active) {
          setChapters(items);
          setSelectedChapter(items.length ? String(getChapterId(items[0], 1)) : "");
        }
      } catch (error) {
        if (active) setChaptersError(error.message);
      } finally {
        if (active) setChaptersLoading(false);
      }
    }

    loadChapters();
    return () => { active = false; };
  }, [subjectId]);

  useEffect(() => {
    let active = true;

    async function loadChapter() {
      if (!selectedChapter) {
        setChapter(null);
        setChapterError("");
        return;
      }

      setChapterLoading(true);
      setChapterError("");

      try {
        const response = await get(`/chapters/${encodeURIComponent(selectedChapter)}`);
        if (active) setChapter(getChapterDetail(response));
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

  const send = () => {
    if (!draft.trim()) return;
    setMessages([...messages, { from: "user", text: draft }]);
    setDraft("");
  };

  const clearMessages = () => {
    setMessages([]);
    setDraft("");
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
      setMessages((current) => [...current, { from: "user", text: transcript }]);
      setDraft("");
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
  }, []);

  return (
    <div className="tutor-page">


      <div className="tutor-workspace">
        <section className="tutor-reader">
          <div className="tutor-reader-toolbar">
            <span>{chapter ? getChapterLabel(chapter, "Selected chapter") : "Selected chapter"}</span>
            <div className="tutor-page-controls">
              <button title="Previous page"><ChevronLeft size={15} /></button>
              <span>Pg 112</span>
              <button title="Next page"><ChevronRight size={15} /></button>
            </div>
          </div>
          <article className="tutor-paper">
            {chapterLoading && <p className="tutor-reader-status">Loading chapter PDF...</p>}
            {!chapterLoading && (chapterError || chaptersError) && (
              <p className="tutor-reader-status tutor-reader-error">{chapterError || chaptersError}</p>
            )}
            {!chapterLoading && !chapterError && !chaptersError && chapter?.source_file_url && (
              <iframe
                className="tutor-pdf"
                src={chapter.source_file_url}
                title={`${getChapterLabel(chapter, "Chapter")} PDF`}
              />
            )}
            {!chapterLoading && !chapterError && !chaptersError && chapter && !chapter.source_file_url && (
              <p className="tutor-reader-status">This chapter does not have a PDF available yet.</p>
            )}
            {!chapterLoading && !chapterError && !chaptersError && !chapter && (
              <p className="tutor-reader-status">Select a chapter to open its PDF.</p>
            )}
          </article>
        </section>

        <aside className="tutor-chat">

          <div className="tutor-picker">
            <div className="tutor-picker-row">
              <select
                id="chapter-select"
                className="tutor-chapter-select"
                value={selectedChapter}
                onChange={(event) => setSelectedChapter(event.target.value)}
                disabled={chaptersLoading || chapters.length === 0}
              >
                <option value="">
                  {chaptersLoading ? "Loading chapters..." : chaptersError || "No chapters found"}
                </option>
                {chapters.map((chapter, index) => (
                  <option key={getChapterId(chapter, index + 1)} value={getChapterId(chapter, index + 1)}>
                    {getChapterLabel(chapter, `Chapter ${index + 1}`)}
                  </option>
                ))}
              </select>
            </div>
            {chaptersError && <p className="tutor-picker-error">{chaptersError}</p>}
          </div>


          <div className="tutor-messages">
            {messages.map((m, i) => (
              <div key={i} className={`tutor-message ${m.from === "user" ? "user-message" : "ai-message"}`}>
                <div className="tutor-message-label">{m.from === "ai" ? "Adhyayan" : "You"}</div>
                <div>{m.text}</div>
              </div>
            ))}
          </div>
          <button type="button" className="tutor-clear-chat" onClick={clearMessages} title="Clear chat" aria-label="Clear chat">
            <Trash2 size={15} />
            <span>Clear chat</span>
          </button>
          <div className="tutor-composer">
            <Input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Apna doubt likhein..." className="tutor-message-input" />
            <div className="tutor-composer-actions">
              <button type="button" className={isListening ? "voice-active" : ""} title={isListening ? "Stop voice input" : "Voice input"} onClick={toggleVoiceInput} aria-label={isListening ? "Stop voice input" : "Voice input"}>
                <Mic size={15} />
              </button>
              <button title="Attach photo"><Camera size={15} /></button>
              <PrimaryButton onClick={send}><Send size={15} color="white" /></PrimaryButton>
            </div>
            {voiceError && <p className="tutor-picker-error">{voiceError}</p>}
          </div>
        </aside>
      </div>
    </div>
  );
}
