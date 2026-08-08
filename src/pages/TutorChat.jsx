import { useState } from "react";
import { Mic, Camera, Send, ChevronLeft, ChevronRight, Bot, User } from "lucide-react";
import { Card, PrimaryButton } from "../components/UI";
import { c, headingFont } from "../utils/theme";

export default function TutorChatPage() {
  const [messages, setMessages] = useState([
    { from: "ai", text: "Sin, cos aur tan — teeno ratios is page ke triangle ABC se hi aa rahe hain. Kaunsa part samajhna hai?" },
    { from: "user", text: "Sin theta ka formula kya hai?" },
    { from: "ai", text: "Page 112 par formula box mein dekhein: sin θ = Opposite ÷ Hypotenuse. Chahe toh isi triangle par ek numeric example try karte hain?" },
  ]);
  const [draft, setDraft] = useState("");

  const send = () => {
    if (!draft.trim()) return;
    setMessages([...messages, { from: "user", text: draft }]);
    setDraft("");
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="text-sm font-semibold mb-2" style={{ color: c.primary }}>
          Mathematics · Chapter 8 · Trigonometry
        </div>
        <h1 className="text-2xl font-bold" style={{ ...headingFont, color: c.dark }}>
          AI Teacher Assistant
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: Book Reader */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold" style={{ color: c.dark }}>
              Chapter Content
            </div>
            <div className="flex items-center gap-2">
              <button className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-gray-100" 
                style={{ border: `1px solid ${c.lighterGray}` }}>
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-semibold" style={{ color: c.gray }}>
                Page 112
              </span>
              <button className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-gray-100" 
                style={{ border: `1px solid ${c.lighterGray}` }}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <Card className="flex-1">
            <div className="mb-4">
              <h3 className="text-lg font-bold mb-3" style={{ ...headingFont, color: c.dark }}>
                8.2 Trigonometric Ratios
              </h3>
              <p className="text-sm leading-relaxed mb-3" style={{ color: c.darkGray }}>
                In a right-angled triangle, the trigonometric ratios of an angle are defined using the lengths of its sides. Consider triangle ABC, right-angled at B.
              </p>
              <p className="text-sm leading-relaxed mb-4" style={{ color: c.darkGray }}>
                For angle <span className="px-2 py-1 rounded font-semibold" style={{ background: c.secondaryBg, color: c.secondaryDark }}>θ</span>, the side opposite to it, the side adjacent to it, and the hypotenuse give us three basic ratios.
              </p>
            </div>

            <div className="rounded-lg p-4 mb-4" style={{ background: c.primaryBg, borderLeft: `4px solid ${c.primary}` }}>
              <div className="text-sm font-semibold mb-2" style={{ color: c.primaryDark }}>
                Formulas
              </div>
              <div className="space-y-1 text-sm font-mono" style={{ color: c.dark }}>
                <div>sin θ = Opposite / Hypotenuse</div>
                <div>cos θ = Adjacent / Hypotenuse</div>
                <div>tan θ = Opposite / Adjacent</div>
              </div>
            </div>

            <p className="text-sm leading-relaxed" style={{ color: c.darkGray }}>
              These ratios stay the same for a given angle, regardless of the triangle's size — this is what makes them useful for solving real-world height and distance problems.
            </p>
          </Card>
        </div>

        {/* RIGHT: Chat Interface */}
        <div className="flex flex-col">
          <div className="text-sm font-semibold mb-3" style={{ color: c.dark }}>
            Ask Your Questions
          </div>

          {/* Messages */}
          <Card className="flex-1 mb-4 overflow-y-auto" style={{ minHeight: '400px', maxHeight: '500px' }}>
            <div className="space-y-4">
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-3 ${m.from === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: m.from === 'ai' ? c.primaryBg : c.secondaryBg }}>
                    {m.from === 'ai' ? <Bot size={16} color={c.primary} /> : <User size={16} color={c.secondary} />}
                  </div>
                  <div className="flex-1">
                    <div className={`rounded-2xl px-4 py-3 ${m.from === 'user' ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
                      style={{ 
                        background: m.from === 'ai' ? c.lighterGray : c.primary,
                        color: m.from === 'ai' ? c.dark : c.white
                      }}>
                      <div className="text-xs font-semibold mb-1 opacity-70">
                        {m.from === 'ai' ? 'AI Teacher' : 'You'}
                      </div>
                      <div className="text-sm leading-relaxed">{m.text}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Input */}
          <div className="flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Apna doubt yahan type karein..."
              className="flex-1 px-4 py-3 rounded-lg text-sm focus:outline-none focus:ring-2 transition-all"
              style={{ 
                background: c.white, 
                border: `2px solid ${c.lighterGray}`,
              }}
              onFocus={(e) => e.target.style.borderColor = c.primary}
              onBlur={(e) => e.target.style.borderColor = c.lighterGray}
            />
            <button 
              className="w-12 h-12 rounded-lg flex items-center justify-center transition-all hover:bg-gray-100" 
              style={{ border: `2px solid ${c.lighterGray}` }}
              title="Voice input">
              <Mic size={20} color={c.gray} />
            </button>
            <button 
              className="w-12 h-12 rounded-lg flex items-center justify-center transition-all hover:bg-gray-100" 
              style={{ border: `2px solid ${c.lighterGray}` }}
              title="Attach photo">
              <Camera size={20} color={c.gray} />
            </button>
            <PrimaryButton onClick={send} className="px-4">
              <Send size={18} />
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}
