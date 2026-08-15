import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { Mic, Camera, Send, ChevronLeft, ChevronRight, Trash2, Volume2 } from "lucide-react";
import { Input, PrimaryButton } from "../components/UI";
import { get, post } from "../utils/api";

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

  let cleaned = text;

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
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState("");
  const [viewerMethod, setViewerMethod] = useState("direct"); // direct, google, mozilla
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
          const greeting = isHindi
            ? `मैं अध्ययन हूँ। मैं देख रहा हूँ कि आपने ${chapterLabel} चुना है। मैं इस अध्याय में आपकी मदद के लिए तैयार हूँ। आप मुझसे कोई भी प्रश्न पूछ सकते हैं या कह सकते हैं "इस अध्याय को पढ़ो" और मैं मुख्य अवधारणाओं को समझाऊंगा।`
            : `I am Adhyayan. I can see you've selected ${chapterLabel}. I'm here to help you understand this chapter. You can ask me any questions, or say "read this chapter" and I'll explain the key concepts!`;
          
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

  const speak = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const speechText = cleanTextForSpeech(text);
    if (!speechText) return;

    const utterance = new SpeechSynthesisUtterance(speechText);
    const isHindi = getUserLanguage().startsWith("hi");
    utterance.lang = isHindi ? "hi-IN" : "en-IN";
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    // Pick best matching available voice
    try {
      const voices = window.speechSynthesis.getVoices?.() || [];
      if (voices.length > 0) {
        const langPrefix = isHindi ? "hi" : "en";
        const voice = voices.find((v) => v.lang?.toLowerCase().startsWith(langPrefix)) || voices[0];
        if (voice) utterance.voice = voice;
      }
    } catch {
      // Use browser default voice
    }

    window.speechSynthesis.speak(utterance);
  };

  const send = async (message = draft) => {
    const question = message.trim();
    if (!question || isSending) return;

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
        },
        language: getUserLanguage(),
        messages: nextMessages.map(({ from, text }) => ({ role: from === "ai" ? "assistant" : "user", content: text })),
      });
      const reply = getTutorReply(response);
      setMessages((current) => [...current, { from: "ai", text: reply }]);
      speak(reply);
    } catch (error) {
      setChatError(error.message || "Unable to reach your AI tutor.");
    } finally {
      setIsSending(false);
    }
  };

  const clearMessages = () => {
    setMessages([]);
    setDraft("");
    setChatError("");
    window.speechSynthesis?.cancel();
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


      <div className="tutor-workspace">                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  <section className="tutor-reader">
          <div className="tutor-reader-toolbar">
            <span>{chapter ? getChapterLabel(chapter, "Selected chapter") : "Selected chapter"}</span>
            <div className="tutor-page-controls">
              <button title="Previous page"><ChevronLeft size={15} /></button>
              <span>Pg 112</span>
              <button title="Next page"><ChevronRight size={15} /></button>
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
                {m.from === "ai" ? (
                  <div className="tutor-message-markdown">
                    <ReactMarkdown>{m.text}</ReactMarkdown>
                  </div>
                ) : (
                  <div>{m.text}</div>
                )}
                {m.from === "ai" && (
                  <button type="button" className="tutor-speak-message" onClick={() => speak(m.text)} title="Read answer aloud" aria-label="Read answer aloud">
                    <Volume2 size={13} />
                  </button>
                )}
              </div>
            ))}
            {isSending && <div className="tutor-message ai-message">Adhyayan is thinking...</div>}
          </div>
          <button type="button" className="tutor-clear-chat" onClick={clearMessages} title="Clear chat" aria-label="Clear chat">
            <Trash2 size={15} />
            <span>Clear chat</span>
          </button>
          <div className="tutor-composer">
            <Input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Apna doubt likhein..." className="tutor-message-input" disabled={isSending} />
            <div className="tutor-composer-actions">
              <button type="button" className={isListening ? "voice-active" : ""} title={isListening ? "Stop voice input" : "Voice input"} onClick={toggleVoiceInput} aria-label={isListening ? "Stop voice input" : "Voice input"}>
                <Mic size={15} />
              </button>
              <button title="Attach photo"><Camera size={15} /></button>
              <PrimaryButton onClick={() => send()} disabled={isSending}><Send size={15} color="white" /></PrimaryButton>
            </div>
            {voiceError && <p className="tutor-picker-error">{voiceError}</p>}
            {chatError && <p className="tutor-picker-error">{chatError}</p>}
          </div>
        </aside>
      </div>
    </div>
  );
}
