import React, { useEffect, useState, useMemo } from 'react';
import { gpaToPercentage, gpaToGreekScale, getGreekGradeDescription, getGreekGradeColor, getLetterGrade } from '../../utils/gradeUtils';
import apiClient, { gradesAPI } from '../../api/api';
import { useLanguage } from '../../LanguageContext';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000/api/v1';

const GradingView: React.FC<{ students: any[]; courses: any[] }>=({ students, courses })=>{
  const { t } = useLanguage();
  const [studentId, setStudentId] = useState<number | ''>('');
  const [courseId, setCourseId] = useState<number | ''>('');
  const [category, setCategory] = useState('Midterm');
  const [gradeValue, setGradeValue] = useState<number | ''>('');
  const [maxGrade, setMaxGrade] = useState<number | ''>('');
  const [weight, setWeight] = useState<number | ''>('');
  const [assignmentName, setAssignmentName] = useState('');
  const [finalSummary, setFinalSummary] = useState<any>(null);
  const [grades, setGrades] = useState<any[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<any[]>(students || []);
  const [filteredCourses, setFilteredCourses] = useState<any[]>(courses || []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFinal = async ()=>{
    setFinalSummary(null); setError(null);
    if(!studentId || !courseId) return;
    try{
      const res = await fetch(`${API_BASE_URL}/analytics/student/${studentId}/course/${courseId}/final-grade`);
      if (!res.ok) {
        const txt = await res.text().catch(()=> '');
        throw new Error(txt || 'Failed to load final grade');
      }
      const data = await res.json();
      setFinalSummary(data);
    }catch(e:any){ setError(e.message || 'Failed to load final grade'); }
  };

  // Keep filters in sync
  useEffect(() => { setFilteredStudents(students || []); }, [students]);
  useEffect(() => { setFilteredCourses(courses || []); }, [courses]);

  // When course is chosen, restrict students to those enrolled in course
  useEffect(() => {
    const run = async () => {
      if (!courseId) { setFilteredStudents(students || []); return; }
      try {
        const res = await fetch(`${API_BASE_URL}/enrollments/course/${courseId}/students`);
        if (res.ok) {
          const arr = await res.json();
          const ids = new Set((arr || []).map((s: any) => s.id));
          const list = (students || []).filter((s: any) => ids.has(s.id));
          setFilteredStudents(list);
          if (studentId && !ids.has(studentId as number)) {
            setStudentId('');
          }
          return;
        }
      } catch {}
      // Fallback: leave students unfiltered
      setFilteredStudents(students || []);
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  // When student is chosen, restrict courses to those the student is enrolled in
  useEffect(() => {
    const run = async () => {
      if (!studentId) { setFilteredCourses(courses || []); return; }
      // Fallback (robust): check each course's enrolled students and see if student is present
      try {
        const results = await Promise.all((courses || []).map(async (c: any) => {
          try {
            const r = await fetch(`${API_BASE_URL}/enrollments/course/${c.id}/students`);
            if (!r.ok) return { id: c.id, has: false };
            const studs = await r.json();
            const has = Array.isArray(studs) ? studs.some((s: any) => s.id === studentId) : false;
            return { id: c.id, has };
          } catch { return { id: c.id, has: false }; }
        }));
        const allowed = new Set(results.filter(x => x.has).map(x => x.id));
        const list = (courses || []).filter((c: any) => allowed.has(c.id));
        setFilteredCourses(list);
        if (courseId && !allowed.has(courseId as number)) {
          setCourseId('');
        }
      } catch {
        setFilteredCourses(courses || []);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  useEffect(()=>{ loadFinal(); },[studentId, courseId]);

  useEffect(() => {
    const loadGrades = async () => {
      setGrades([]);
      if (!studentId) return;
      try {
        const res = await apiClient.get('/grades/', { params: { student_id: studentId, course_id: courseId || undefined } });
        setGrades(Array.isArray(res.data) ? res.data : []);
      } catch (err: any) {
        // noop; banner will show on submit errors
      }
    };
    loadGrades();
  }, [studentId, courseId]);

  const selectedCourse = useMemo(() => courses.find((c) => c.id === courseId), [courses, courseId]);
  const evaluationRules = useMemo(() => Array.isArray(selectedCourse?.evaluation_rules) ? selectedCourse!.evaluation_rules : [], [selectedCourse]);

  // Category options with display names
  const categoryOptions = useMemo(() => {
    const base = [
      { value: 'Midterm', label: t('midterm') },
      { value: 'Final Exam', label: t('finalExam') },
      { value: 'Assignment', label: t('assignment') },
      { value: 'Quiz', label: t('quiz') },
      { value: 'Project', label: t('project') },
      { value: 'Lab', label: t('lab') }
    ];
    const rules = (evaluationRules || []).map((r: any) => r?.category).filter(Boolean);
    const customRules = rules.filter((r: string) => !base.some(b => b.value === r)).map((r: string) => ({ value: r, label: r }));
    return [...base, ...customRules];
  }, [evaluationRules, t]);

  // Force Midterm/Final Exam to weight=1
  useEffect(() => {
    if (category === 'Midterm' || category === 'Final Exam') {
      setWeight(1);
    }
  }, [category]);

  const submitGrade = async (e: React.FormEvent)=>{
    e.preventDefault();
    if(!studentId || !courseId){ setError(t('selectStudentAndCourseError')); return; }
    if(!assignmentName || String(assignmentName).trim().length === 0){ setError(t('assignmentNameRequired')); return; }
    if(gradeValue === '' || maxGrade === ''){ setError(t('fillRequiredFields')); return; }
    const gv = Number(gradeValue); const mg = Number(maxGrade || 100);
    if(!Number.isFinite(gv) || !Number.isFinite(mg) || mg <= 0){ setError(t('invalidScoreMaxValues')); return; }
    if(gv < 0 || gv > mg){ setError(t('scoreMustBeBetween0AndMax')); return; }
    setSubmitting(true); setError(null);
    try{
      const payload:any = {
        student_id: Number(studentId),
        course_id: Number(courseId),
        // Backend expects raw points; if you store percentage, set max_grade=100
        grade: gv,
        max_grade: mg,
        weight: Number(category === 'Midterm' || category === 'Final Exam' ? 1 : (weight || 1)),
        date_submitted: new Date().toISOString().split('T')[0],
      };
      if (assignmentName) payload.assignment_name = assignmentName;
      if (category) payload.category = category;
      await gradesAPI.create(payload);
      await loadFinal();
      // refresh grade list
      try {
        const res2 = await apiClient.get('/grades/', { params: { student_id: studentId, course_id: courseId || undefined } });
        setGrades(Array.isArray(res2.data) ? res2.data : []);
      } catch {}
      setAssignmentName(''); setCategory('Midterm'); setGradeValue(''); setMaxGrade(''); setWeight('');
    }catch(e:any){
      const apiMsg = e?.response?.data?.detail || e?.response?.data || e?.message || 'Error';
      setError(typeof apiMsg === 'string' ? apiMsg : JSON.stringify(apiMsg));
    }
    finally{ setSubmitting(false); }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <select className="border rounded px-3 py-2" value={studentId as any} onChange={e=>setStudentId(e.target.value? Number(e.target.value): '')} aria-label={t('selectStudent')}>
          <option value="">{t('selectStudent')}</option>
          {filteredStudents.map(s=> (<option key={s.id} value={s.id}>{s.student_id} - {s.first_name} {s.last_name}</option>))}
        </select>
        <select className="border rounded px-3 py-2" value={courseId as any} onChange={e=>setCourseId(e.target.value? Number(e.target.value): '')} aria-label={t('selectCourse')}>
          <option value="">{t('selectCourse')}</option>
          {filteredCourses.map(c=> (<option key={c.id} value={c.id}>{c.course_code} - {c.course_name}</option>))}
        </select>
        <button className="border rounded px-3 py-2" onClick={loadFinal}>{t('refreshFinal')}</button>
      </div>

      <form onSubmit={submitGrade} className="bg-white border rounded-xl p-4 space-y-3">
        <h3 className="text-lg font-semibold">{t('addGrade')}</h3>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input className="border rounded px-3 py-2" placeholder={t('assignmentNamePlaceholder')} value={assignmentName} onChange={e=>setAssignmentName(e.target.value)} />
          <select className="border rounded px-3 py-2" value={category} onChange={e=>setCategory(e.target.value)} aria-label={t('categoryLabel') || 'Category'}>
            {categoryOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <input className="border rounded px-3 py-2 disabled:bg-gray-50 disabled:text-gray-400" placeholder={t('weightPlaceholder')} value={String(weight)} onChange={e=>setWeight(e.target.value? Number(e.target.value): '')} disabled={category==='Midterm' || category==='Final Exam'} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input className="border rounded px-3 py-2" placeholder={t('gradePlaceholder')} value={String(gradeValue)} onChange={e=>setGradeValue(e.target.value? Number(e.target.value): '')} />
          <input className="border rounded px-3 py-2" placeholder={t('maxGradePlaceholder')} value={String(maxGrade)} onChange={e=>setMaxGrade(e.target.value? Number(e.target.value): '')} />
          <button disabled={submitting} className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50" type="submit">{submitting? t('saving') : t('saveGrade')}</button>
        </div>
      </form>

      <div className="bg-white border rounded-xl p-4">
        <h3 className="text-lg font-semibold mb-2">{t('finalGradeSummary')}</h3>
        {!studentId || !courseId ? (
          <p className="text-sm text-gray-500">{t('selectStudentAndCourse')}</p>
        ) : finalSummary ? (
          <div className="text-sm">
            <p><span className="font-semibold">{t('final')}:</span> {finalSummary.final_grade ?? '-'}%</p>
            <p><span className="font-semibold">{t('gpa')}:</span> {finalSummary.gpa ?? '-'}</p>
            <p><span className="font-semibold">{t('letterGrade')}:</span> {finalSummary.letter_grade ?? '-'}</p>
            {typeof finalSummary.gpa === 'number' && (
              <>
                <p className={`mt-1 ${getGreekGradeColor(gpaToGreekScale(finalSummary.gpa))}`}>
                  <span className="font-semibold">{t('greek')}:</span> {gpaToGreekScale(finalSummary.gpa).toFixed(1)}/20 • {getGreekGradeDescription(gpaToGreekScale(finalSummary.gpa))}
                </p>
                <p className="text-gray-600">{gpaToPercentage(finalSummary.gpa).toFixed(1)}%</p>
              </>
            )}
            {finalSummary.category_breakdown && (
              <div className="mt-2">
                <p className="font-semibold">{t('categoryBreakdown')}</p>
                <ul className="list-disc ml-5">
                  {Object.keys(finalSummary.category_breakdown).map(k=> (
                    <li key={k}>{k}: {finalSummary.category_breakdown[k].average.toFixed(1)}% (w {finalSummary.category_breakdown[k].weight}%)</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500">{t('noData')}</p>
        )}
      </div>

      {/* Evaluation Rules Overview */}
      {selectedCourse && evaluationRules.length > 0 && (
        <div className="bg-white border rounded-xl p-4">
          <h3 className="text-lg font-semibold mb-2">{t('evaluationStructure')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {evaluationRules.map((r: any, i: number) => (
              <div key={i} className="border rounded p-3">
                <div className="font-semibold text-gray-800">{r.category}</div>
                <div className="text-sm text-gray-600">{r.weight}%</div>
                {r.description && <div className="text-xs text-gray-500 mt-1">{r.description}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grade History */}
      {studentId && courseId && (
        <div className="bg-white border rounded-xl p-4">
          <h3 className="text-lg font-semibold mb-2">{t('gradeHistory')}</h3>
          {grades.length === 0 ? (
            <p className="text-sm text-gray-500">{t('noGradesRecorded')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">{t('assignment')}</th>
                    {evaluationRules.length > 0 && (<th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">{t('category')}</th>)}
                    <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700">{t('score')}</th>
                    <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700">%</th>
                    <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700">{t('weight')}</th>
                    <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700">{t('letterGrade')}</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">{t('date')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {grades.map((g: any) => {
                    const pct = (Number(g.grade) / Number(g.max_grade || 100)) * 100;
                    const letter = getLetterGrade(pct);
                    const color = pct >= 90 ? 'text-green-600' : pct >= 80 ? 'text-blue-600' : pct >= 70 ? 'text-yellow-600' : pct >= 60 ? 'text-orange-600' : 'text-red-600';
                    return (
                      <tr key={g.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2">
                          <div className="font-medium text-gray-800">{g.assignment_name || '-'}</div>
                          {g.notes && (<div className="text-xs text-gray-500">{g.notes}</div>)}
                        </td>
                        {evaluationRules.length > 0 && (
                          <td className="px-4 py-2"><span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">{g.category || '—'}</span></td>
                        )}
                        <td className="px-4 py-2 text-center">{g.grade} / {g.max_grade || 100}</td>
                        <td className="px-4 py-2 text-center"><span className={`font-semibold ${color}`}>{pct.toFixed(1)}%</span></td>
                        <td className="px-4 py-2 text-center">×{g.weight || 1}</td>
                        <td className="px-4 py-2 text-center"><span className={`px-2 py-1 rounded-full text-xs font-bold ${color}`}>{letter}</span></td>
                        <td className="px-4 py-2 text-gray-600">{g.date_submitted || 'N/A'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GradingView;
