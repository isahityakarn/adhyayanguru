import React, { useState, useEffect } from 'react';
import { ChevronRight, ArrowLeft, BookOpen, FileText, LayoutList, Layers, ExternalLink, MessageCircle, PenTool, CheckCircle, Search, HelpCircle, FileQuestion, Book } from 'lucide-react';
import { get } from '../../../utils/api';
import './CurriculumExplorer.css';

export default function CurriculumExplorer({ classes, onOpenUploadModal }) {
  const [path, setPath] = useState([]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  
  // Navigation states
  const selectedClass = path.length >= 1 ? path[0] : null;
  const selectedSubject = path.length >= 2 ? path[1] : null;
  const selectedChapter = path.length >= 3 ? path[2] : null;
  const chapterDetails = path.length >= 3 ? data : null;

  const navigateTo = async (level, item) => {
    setLoading(true);
    try {
      if (level === 'class') {
        setPath([item]);
        const res = await get(`/admin/classes/${item.id}/subjects`);
        setData(res.data || res.subjects || []);
      } else if (level === 'subject') {
        setPath([selectedClass, item]);
        const res = await get(`/admin/subjects/${item.id}/chapters`);
        setData(res.data || res.chapters || []);
      } else if (level === 'chapter') {
        setPath([selectedClass, selectedSubject, item]);
        const res = await get(`/admin/chapters/${item.id}`);
        setData(res.chapter || res.data || null);
      }
    } catch (err) {
      console.error("Navigation error:", err);
      // Fallback
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const navigateBack = (index) => {
    if (index < 0) {
      setPath([]);
      setData(null);
    } else if (index === 0) {
      navigateTo('class', path[0]);
    } else if (index === 1) {
      navigateTo('subject', path[1]);
    }
  };

  const getSubjectColor = (name = "") => {
    const lName = name.toLowerCase();
    if (lName.includes('math')) return 'var(--math-bg, #e0f2fe)';
    if (lName.includes('sci')) return 'var(--sci-bg, #dcfce7)';
    if (lName.includes('eng')) return 'var(--eng-bg, #f3e8ff)';
    if (lName.includes('hin')) return 'var(--hin-bg, #ffedd5)';
    return '#f1f5f9';
  };
  
  const getSubjectIconColor = (name = "") => {
    const lName = name.toLowerCase();
    if (lName.includes('math')) return '#0284c7';
    if (lName.includes('sci')) return '#16a34a';
    if (lName.includes('eng')) return '#9333ea';
    if (lName.includes('hin')) return '#ea580c';
    return '#475569';
  };

  const renderBreadcrumbs = () => {
    return (
      <div className="ce-breadcrumbs">
        <button className={path.length === 0 ? 'active' : ''} onClick={() => navigateBack(-1)}>
          <Layers size={15} /> All Classes
        </button>
        {path.map((item, idx) => (
          <React.Fragment key={idx}>
            <ChevronRight size={14} className="ce-divider" />
            <button className={path.length === idx + 1 ? 'active' : ''} onClick={() => navigateBack(idx)}>
              {item.name || item.title || `Class ${item.id}`}
            </button>
          </React.Fragment>
        ))}
      </div>
    );
  };

  const renderClassesList = () => (
    <div className="ce-grid">
      {classes.map(cls => (
        <button key={cls.id} className="ce-card class-card" onClick={() => navigateTo('class', cls)}>
          <div className="ce-card-icon"><BookOpen size={24} /></div>
          <h3>{cls.name}</h3>
          <p>{cls.subject_count || 0} Subjects</p>
          <div className="ce-card-action">Browse Curriculum <ChevronRight size={14}/></div>
        </button>
      ))}
    </div>
  );

  const renderSubjectsList = () => (
    <div className="ce-grid">
      {data && data.length > 0 ? data.map(sub => (
        <button 
          key={sub.id} 
          className="ce-card subject-card" 
          onClick={() => navigateTo('subject', sub)}
          style={{ '--bg-color': getSubjectColor(sub.name), '--icon-color': getSubjectIconColor(sub.name) }}
        >
          <div className="ce-card-icon" style={{ color: 'var(--icon-color)' }}><Book size={24} /></div>
          <h3>{sub.name}</h3>
          <p>{sub.chapter_count || 0} Chapters</p>
          <div className="ce-card-action">View Chapters <ChevronRight size={14}/></div>
        </button>
      )) : (
        <div className="ce-empty">
          <BookOpen size={48} />
          <h3>No Subjects Found</h3>
          <p>This class doesn't have any subjects yet.</p>
          <button onClick={() => onOpenUploadModal(selectedClass.id)} className="admin-primary-button" style={{marginTop: 15}}>
            Add Subject Material
          </button>
        </div>
      )}
    </div>
  );

  const renderChaptersList = () => (
    <div className="ce-list">
      {data && data.length > 0 ? data.map(chap => (
        <div key={chap.id} className="ce-list-item" onClick={() => navigateTo('chapter', chap)}>
          <div className="ce-list-icon"><FileText size={20} /></div>
          <div className="ce-list-content">
            <h4>Chapter {chap.chapter_number}: {chap.title}</h4>
            <p>{chap.extracted_text ? 'Processed & AI Questions Generated' : 'PDF Only / Unprocessed'}</p>
          </div>
          <div className="ce-list-stats">
            <span className="ce-stat-badge"><HelpCircle size={12}/> {chap.questions_count || 0} Questions</span>
          </div>
          <ChevronRight size={18} className="ce-list-chevron" />
        </div>
      )) : (
        <div className="ce-empty">
          <FileText size={48} />
          <h3>No Chapters Found</h3>
          <p>Upload a PDF to create the first chapter.</p>
          <button onClick={() => onOpenUploadModal(selectedClass.id, selectedSubject.id)} className="admin-primary-button" style={{marginTop: 15}}>
            Upload Chapter PDF
          </button>
        </div>
      )}
    </div>
  );

  const renderChapterDetails = () => {
    if (!chapterDetails) return null;
    
    // Parse questions if they exist
    let mcqs = [];
    let written = [];
    if (chapterDetails.questions && Array.isArray(chapterDetails.questions)) {
       mcqs = chapterDetails.questions.filter(q => q.question_type === 'mcq' || (q.options && q.options.length > 0) || !q.expected_answer);
       written = chapterDetails.questions.filter(q => q.question_type === 'short_answer' || q.expected_answer);
    } else if (chapterDetails.questions && typeof chapterDetails.questions === 'string') {
       try {
           const parsed = JSON.parse(chapterDetails.questions);
           mcqs = parsed.filter(q => q.question_type === 'mcq' || (q.options && q.options.length > 0) || !q.expected_answer);
           written = parsed.filter(q => q.question_type === 'short_answer' || q.expected_answer);
       } catch (e) {}
    }

    return (
      <div className="ce-chapter-details">
        <div className="ce-chapter-header">
          <div className="ce-ch-title-box">
            <span className="ce-ch-num">Chapter {chapterDetails.chapter_number}</span>
            <h2>{chapterDetails.title}</h2>
          </div>
          <div className="ce-ch-actions">
            {chapterDetails.source_file_url && (
              <a href={chapterDetails.source_file_url} target="_blank" rel="noreferrer" className="ce-btn-outline">
                <ExternalLink size={16} /> View Original PDF
              </a>
            )}
            <button className="admin-primary-button" onClick={() => onOpenUploadModal(selectedClass.id, selectedSubject.id)}>
              Replace Material
            </button>
          </div>
        </div>

        <div className="ce-stats-row">
           <div className="ce-stat-box">
             <div className="ce-sb-icon"><LayoutList size={20}/></div>
             <div className="ce-sb-info">
                <strong>{mcqs.length}</strong>
                <span>Multiple Choice Questions</span>
             </div>
           </div>
           <div className="ce-stat-box">
             <div className="ce-sb-icon"><PenTool size={20}/></div>
             <div className="ce-sb-info">
                <strong>{written.length}</strong>
                <span>Subjective Questions</span>
             </div>
           </div>
           <div className="ce-stat-box">
             <div className="ce-sb-icon"><CheckCircle size={20}/></div>
             <div className="ce-sb-info">
                <strong>{chapterDetails.has_extracted_text ? 'Extracted' : 'Missing'}</strong>
                <span>Text Status</span>
             </div>
           </div>
        </div>

        <div className="ce-q-container">
          <div className="ce-q-section">
            <h3><LayoutList size={18} /> Multiple Choice Questions ({mcqs.length})</h3>
            {mcqs.length > 0 ? (
              <div className="ce-questions-list">
                {mcqs.map((q, i) => (
                  <div key={i} className="ce-q-card">
                    <p className="ce-q-text"><strong>Q{i+1}.</strong> {q.question_text || q.question}</p>
                    <div className="ce-q-options">
                       {q.options && Array.isArray(q.options) ? q.options.map((opt, oi) => (
                          <div key={oi} className={`ce-q-opt ${q.correct_answer === opt.letter || q.correct_answer === opt.text ? 'correct' : ''}`}>
                            <span className="ce-opt-letter">{opt.letter || String.fromCharCode(65+oi)}</span>
                            <span>{opt.text || opt.option || opt}</span>
                          </div>
                       )) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="ce-empty-text">No MCQs available for this chapter.</p>}
          </div>

          <div className="ce-q-section">
            <h3><PenTool size={18} /> Subjective Questions ({written.length})</h3>
            {written.length > 0 ? (
              <div className="ce-questions-list">
                {written.map((q, i) => (
                  <div key={i} className="ce-q-card">
                    <p className="ce-q-text"><strong>Q{i+1}.</strong> {q.question_text || q.question}</p>
                    <div className="ce-q-answer">
                       <span className="ce-ans-label">Expected Answer:</span>
                       <p>{q.expected_answer || q.answer || q.correct_answer || 'Detailed answer expected.'}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="ce-empty-text">No subjective questions available.</p>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="curriculum-explorer">
      <div className="ce-header">
        <div>
          <span className="admin-kicker">Curriculum Explorer</span>
          <h1>{path.length === 0 ? "All Classes" : (path.length === 1 ? selectedClass.name : (path.length === 2 ? `${selectedClass.name} - ${selectedSubject.name}` : chapterDetails?.title || "Chapter Details"))}</h1>
          <p>Navigate deeply into the class materials and automatically generated AI quizzes.</p>
        </div>
      </div>
      
      {renderBreadcrumbs()}

      <div className="ce-body">
        {loading ? (
           <div className="ce-loading">
             <div className="spinner"></div>
             <p>Loading curriculum data...</p>
           </div>
        ) : (
          <>
            {path.length === 0 && renderClassesList()}
            {path.length === 1 && renderSubjectsList()}
            {path.length === 2 && renderChaptersList()}
            {path.length === 3 && renderChapterDetails()}
          </>
        )}
      </div>
    </div>
  );
}
