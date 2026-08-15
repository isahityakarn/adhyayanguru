import { useState } from "react";
import { Upload, Users, BookOpen, Sparkles, UserCheck, UserX, Plus, Shield } from "lucide-react";
import AdminUploadPage from "./AdminUpload";
import { Card, PrimaryButton } from "../components/UI";
import { c, headingFont } from "../utils/theme";

export default function AdminPage() {
  const [activeAdminTab, setActiveAdminTab] = useState("content"); // 'content' | 'users'

  const [students, setStudents] = useState([
    { initials: "AS", name: "Aarav Sharma", meta: "Class 10 · CBSE · Premium", active: true },
    { initials: "PK", name: "Priya Kumari", meta: "Class 8 · CBSE · Free plan", active: true },
    { initials: "RV", name: "Rohan Verma", meta: "Class 12 · CBSE · Premium", active: false },
    { initials: "SN", name: "Sneha Nair", meta: "Class 6 · State Board · Free plan", active: true },
  ]);

  const toggleStudent = (idx) => {
    setStudents(students.map((s, i) => (i === idx ? { ...s, active: !s.active } : s)));
  };

  return (
    <div>
      {/* Top Admin Bar Switcher */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white">
            <Shield size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ ...headingFont, color: c.dark }}>
              AdhyayanGuru Admin Portal
            </h1>
            <p className="text-xs text-gray-500">
              Manage curriculum content, automated PDF text & question extraction, and student permissions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveAdminTab("content")}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
              activeAdminTab === "content"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <BookOpen size={14} color={c.primary} />
            PDF & Question Ingestion
          </button>

          <button
            onClick={() => setActiveAdminTab("users")}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
              activeAdminTab === "users"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Users size={14} color={c.accent} />
            Student Access ({students.length})
          </button>
        </div>
      </div>

      {/* Content Tab: Full PDF Upload & Question Extraction Dashboard */}
      {activeAdminTab === "content" ? (
        <AdminUploadPage />
      ) : (
        /* Users Tab: Student Management */
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold" style={{ ...headingFont, color: c.dark }}>
                Student Access & Permissions
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Control active student subscriptions and platform access
              </p>
            </div>
            <PrimaryButton className="text-xs flex items-center gap-1.5">
              <Plus size={14} /> Add Student
            </PrimaryButton>
          </div>

          <div className="space-y-3">
            {students.map((s, i) => (
              <Card key={s.name}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                      style={{
                        background: s.active ? c.primaryBg : c.lighterGray,
                        color: s.active ? c.primary : c.gray,
                      }}
                    >
                      {s.initials}
                    </div>
                    <div>
                      <div className="text-sm font-bold" style={{ color: c.dark }}>
                        {s.name}
                      </div>
                      <div className="text-xs mt-1" style={{ color: c.gray }}>
                        {s.meta}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{
                        background: s.active ? `${c.accent}20` : `${c.error}20`,
                        color: s.active ? c.accentDark : c.error,
                      }}
                    >
                      {s.active ? <UserCheck size={14} /> : <UserX size={14} />}
                      {s.active ? "Active" : "Blocked"}
                    </div>

                    <div
                      onClick={() => toggleStudent(i)}
                      className="relative cursor-pointer flex-shrink-0 transition-all"
                      style={{
                        width: 44,
                        height: 24,
                        borderRadius: 24,
                        background: s.active ? c.accent : c.lightGray,
                      }}
                    >
                      <div
                        className="absolute rounded-full"
                        style={{
                          width: 18,
                          height: 18,
                          top: 3,
                          left: s.active ? 23 : 3,
                          background: c.white,
                          transition: "left .2s ease",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                        }}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
