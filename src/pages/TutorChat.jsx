import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Mic, Camera, Send, ChevronLeft, ChevronRight } from "lucide-react";
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
  const [messages, setMessages] = useState([
    { from: "ai", text: "Sin, cos aur tan — teeno ratios is page ke triangle ABC se hi aa rahe hain. Kaunsa part samajhna hai?" },
    { from: "user", text: "Sin theta ka formula kya hai?" },
    { from: "ai", text: "Page 112 par formula box mein dekhein: sin θ = Opposite ÷ Hypotenuse. Chahe toh isi triangle par ek numeric example try karte hain?" },
  ]);
  const [draft, setDraft] = useState("");

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
                <div className="tutor-message-label">{m.from === "ai" ? "AI" : "You"}</div>
                <div>{m.text}</div>
              </div>
            ))}
          </div>
          <div className="tutor-composer">
            <Input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Apna doubt likhein..." className="tutor-message-input" />
            <div className="tutor-composer-actions">
              <button title="Voice input"><Mic size={15} /></button>
              <button title="Attach photo"><Camera size={15} /></button>
              <PrimaryButton onClick={send}><Send size={15} color="white" /></PrimaryButton>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
