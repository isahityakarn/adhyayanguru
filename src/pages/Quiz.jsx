import { ArrowRight, CheckCircle } from "lucide-react";
import { Card, Bar, PrimaryButton } from "../components/UI";
import { c, headingFont } from "../utils/theme";

export default function QuizPage() {
  const options = [
    { letter: "A", text: "2/5" },
    { letter: "B", text: "4/5", correct: true },
    { letter: "C", text: "5/4" },
    { letter: "D", text: "3/4" },
  ];
  
  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="text-sm font-semibold mb-2" style={{ color: c.primary }}>
          Mathematics · Chapter 8 · Practice Test
        </div>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold" style={{ ...headingFont, color: c.dark }}>
            Question 4 of 10
          </h1>
          <div className="text-sm font-semibold" style={{ color: c.gray }}>
            40% Complete
          </div>
        </div>
        <Bar pct={40} color={c.primary} />
      </div>

      {/* Question Card */}
      <div className="max-w-2xl">
        <Card>
          <div className="mb-6">
            <div className="inline-block px-3 py-1 rounded-lg text-xs font-semibold mb-4"
              style={{ background: c.primaryBg, color: c.primaryDark }}>
              Multiple Choice
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ ...headingFont, color: c.dark }}>
              If sin θ = 3/5, what is the value of cos θ?
            </h2>
            <p className="text-sm" style={{ color: c.gray }}>
              Select the correct answer below
            </p>
          </div>

          {/* Options */}
          <div className="space-y-3 mb-6">
            {options.map((o) => (
              <div
                key={o.letter}
                className="flex items-center gap-4 rounded-xl px-4 py-4 cursor-pointer transition-all duration-200"
                style={
                  o.correct
                    ? { 
                        border: `2px solid ${c.accent}`, 
                        background: `${c.accent}10`,
                      }
                    : { 
                        border: `2px solid ${c.lighterGray}`,
                        background: c.white
                      }
                }
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={
                    o.correct
                      ? { background: c.accent, color: c.white }
                      : { background: c.lighterGray, color: c.darkGray }
                  }
                >
                  {o.letter}
                </div>
                <div className="flex-1 font-semibold" style={{ color: c.dark }}>
                  {o.text}
                </div>
                {o.correct && <CheckCircle size={20} color={c.accent} />}
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <PrimaryButton className="flex-1">
              Next Question <ArrowRight size={16} />
            </PrimaryButton>
            <PrimaryButton variant="outline">
              Skip
            </PrimaryButton>
          </div>
        </Card>

        {/* Helper Text */}
        <div className="mt-4 text-center text-sm" style={{ color: c.gray }}>
          💡 Hint: Use the Pythagorean identity to solve this problem
        </div>
      </div>
    </div>
  );
}
