import { useState } from "react";
import { Upload, Edit, UserCheck, UserX } from "lucide-react";
import { Card, Input, PrimaryButton, Select } from "../components/UI";
import { c, headingFont } from "../utils/theme";

export default function AdminPage() {
  const [students, setStudents] = useState([
    { initials: "AS", name: "Aarav Sharma", meta: "Class 10 · CBSE · Premium", active: true },
    { initials: "PK", name: "Priya Kumari", meta: "Class 8 · CBSE · Free plan", active: true },
    { initials: "RV", name: "Rohan Verma", meta: "Class 12 · CBSE · Premium", active: false },
    { initials: "SN", name: "Sneha Nair", meta: "Class 6 · State Board · Free plan", active: true },
  ]);
  
  const books = [
    { title: "Real numbers", meta: "Class 10 · Mathematics · CBSE" },
    { title: "Trigonometry", meta: "Class 10 · Mathematics · CBSE" },
    { title: "Life processes", meta: "Class 10 · Science · CBSE" },
  ];

  const toggleStudent = (idx) => {
    setStudents(students.map((s, i) => (i === idx ? { ...s, active: !s.active } : s)));
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="text-sm font-semibold mb-2" style={{ color: c.primary }}>
          Administrator Panel
        </div>
        <h1 className="text-3xl font-bold" style={{ ...headingFont, color: c.dark }}>
          Content & User Management
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: Content Management */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold" style={{ ...headingFont, color: c.dark }}>
              Books & Chapters
            </h2>
            <PrimaryButton className="text-sm">
              + Add Book
            </PrimaryButton>
          </div>

          {/* Upload Form */}
          <Card className="mb-4">
            <h3 className="text-sm font-bold mb-4" style={{ color: c.dark }}>Upload New Chapter</h3>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <Select><option>Class 10</option></Select>
              <Select><option>CBSE</option></Select>
              <Select><option>Mathematics</option></Select>
            </div>
            <Input
              placeholder="Chapter title, e.g. Trigonometry"
              className="mb-3"
            />
            <div
              className="rounded-lg p-6 text-center mb-3 cursor-pointer hover:bg-gray-50 transition-all"
              style={{ border: `2px dashed ${c.lightGray}` }}
            >
              <Upload size={24} color={c.gray} className="mx-auto mb-2" />
              <div className="text-sm font-semibold" style={{ color: c.dark }}>
                Drop PDF here or click to upload
              </div>
              <div className="text-xs mt-1" style={{ color: c.gray }}>
                Support: PDF, max 50MB
              </div>
            </div>
            <PrimaryButton className="w-full">Upload Chapter</PrimaryButton>
          </Card>

          {/* Books List */}
          <div className="space-y-2">
            {books.map((b) => (
              <Card key={b.title} hover>
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm font-bold mb-1" style={{ color: c.dark }}>
                      {b.title}
                    </div>
                    <div className="text-xs" style={{ color: c.gray }}>
                      {b.meta}
                    </div>
                  </div>
                  <button className="flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-lg transition-all hover:bg-gray-100"
                    style={{ color: c.primary }}>
                    <Edit size={16} />
                    Edit
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* RIGHT: Student Management */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold" style={{ ...headingFont, color: c.dark }}>
              Student Access
            </h2>
            <PrimaryButton className="text-sm">
              + Add Student
            </PrimaryButton>
          </div>

          <div className="space-y-3">
            {students.map((s, i) => (
              <Card key={s.name}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                      style={{ background: s.active ? c.primaryBg : c.lighterGray, color: s.active ? c.primary : c.gray }}
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
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ 
                        background: s.active ? `${c.accent}20` : `${c.error}20`,
                        color: s.active ? c.accentDark : c.error
                      }}>
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
                        background: s.active ? c.accent : c.lightGray 
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
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
