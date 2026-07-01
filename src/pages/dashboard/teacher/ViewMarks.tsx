import { useState, useEffect } from 'react';
import { supabase, supabaseUntyped } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Loader2, Pencil, Save, X, Eye, BookOpen, Filter } from 'lucide-react';
import { toast } from 'sonner';

interface MarkEntry {
  id: string;
  student_id: string;
  subject_id: string;
  class_id: string;
  term_id: string;
  exam_id: string | null;
  marks: number;
  out_of: number;
  percentage: number;
  cbc_sublevel: string | null;
  cbc_grade: string;
  cbc_points: number | null;
  status: 'draft' | 'submitted';
  submitted_at: string;
  students: { first_name: string; last_name: string; admission_number: string } | null;
  subjects: { name: string } | null;
  classes: { name: string } | null;
  terms: { name: string; academic_year: string } | null;
}

export default function ViewMarks() {
  const { user } = useAuth();
  const [marks, setMarks] = useState<MarkEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'submitted'>('all');
  const [editingMark, setEditingMark] = useState<string | null>(null);
  const [editMarks, setEditMarks] = useState('');
  const [editOutOf, setEditOutOf] = useState('');
  const [saving, setSaving] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);

  useEffect(() => {
    fetchMarks();
  }, [user?.id]);

  const fetchMarks = async () => {
    setLoading(true);
    try {
      // Get teacher record
      const { data: teacherData } = await supabaseUntyped
        .from('teachers')
        .select('id')
        .eq('profile_id', user?.id)
        .single();

      const teacherId = teacherData?.id;
      if (!teacherId) {
        setLoading(false);
        return;
      }

      // Fetch marks with related data
      const { data: marksData, error } = await supabaseUntyped
        .from('results')
        .select(`
          *,
          students(first_name, last_name, admission_number),
          subjects(name),
          classes(name),
          terms(name, academic_year)
        `)
        .eq('teacher_id', teacherId)
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      const loadedMarks = marksData || [];
      setMarks(loadedMarks);

      // Extract unique classes and subjects for filters
      const uniqueClasses = [...new Map(loadedMarks.map((m: MarkEntry) => [m.class_id, m.classes]).filter(Boolean)).values()];
      const uniqueSubjects = [...new Map(loadedMarks.map((m: MarkEntry) => [m.subject_id, m.subjects]).filter(Boolean)).values()];
      setClasses(uniqueClasses);
      setSubjects(uniqueSubjects);
    } catch (err: any) {
      toast.error('Failed to load marks: ' + err.message);
    }
    setLoading(false);
  };

  const handleSaveEdit = async (markId: string) => {
    if (!editMarks || !editOutOf) {
      toast.error('Please enter marks and out of');
      return;
    }
    const marksVal = parseFloat(editMarks);
    const outOfVal = parseFloat(editOutOf);
    if (marksVal > outOfVal) {
      toast.error('Marks cannot exceed out of');
      return;
    }

    setSaving(true);
    try {
      const percentage = Math.round((marksVal / outOfVal) * 100);
      const { error } = await supabaseUntyped
        .from('results')
        .update({
          marks: marksVal,
          out_of: outOfVal,
          percentage: percentage,
          status: 'draft',
          submitted_at: new Date().toISOString(),
        })
        .eq('id', markId);

      if (error) throw error;
      toast.success('Marks updated successfully');
      setEditingMark(null);
      fetchMarks();
    } catch (err: any) {
      toast.error('Failed to update: ' + err.message);
    }
    setSaving(false);
  };

  const handleSubmitDraft = async (markId: string) => {
    try {
      const { error } = await supabaseUntyped
        .from('results')
        .update({ status: 'submitted', submitted_at: new Date().toISOString() })
        .eq('id', markId);

      if (error) throw error;
      toast.success('Marks submitted successfully');
      fetchMarks();
    } catch (err: any) {
      toast.error('Failed to submit: ' + err.message);
    }
  };

  const openEdit = (mark: MarkEntry) => {
    setEditingMark(mark.id);
    setEditMarks(String(mark.marks));
    setEditOutOf(String(mark.out_of));
  };

  const filteredMarks = marks.filter((m) => {
    const studentName = `${m.students?.first_name || ''} ${m.students?.last_name || ''}`.toLowerCase();
    const matchesSearch =
      studentName.includes(search.toLowerCase()) ||
      (m.students?.admission_number || '').toLowerCase().includes(search.toLowerCase()) ||
      (m.subjects?.name || '').toLowerCase().includes(search.toLowerCase());
    const matchesClass = filterClass ? m.class_id === filterClass : true;
    const matchesSubject = filterSubject ? m.subject_id === filterSubject : true;
    const matchesStatus = filterStatus === 'all' ? true : m.status === filterStatus;
    return matchesSearch && matchesClass && matchesSubject && matchesStatus;
  });

  const gradeColor = (grade: string) => {
    if (!grade) return 'bg-gray-100 text-gray-600';
    if (grade.startsWith('EE')) return 'bg-green-100 text-green-700';
    if (grade.startsWith('ME')) return 'bg-blue-100 text-blue-700';
    if (grade.startsWith('AE')) return 'bg-orange-100 text-orange-700';
    return 'bg-red-100 text-red-700';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#111111]">My Entered Marks</h1>
        <p className="text-sm text-[#666666]">View and manage marks you have entered</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 text-center">
          <div className="text-2xl font-bold text-blue-600">{marks.length}</div>
          <div className="text-xs text-gray-500">Total Entries</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 text-center">
          <div className="text-2xl font-bold text-green-600">{marks.filter(m => m.status === 'submitted').length}</div>
          <div className="text-xs text-gray-500">Submitted</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 text-center">
          <div className="text-2xl font-bold text-orange-600">{marks.filter(m => m.status === 'draft').length}</div>
          <div className="text-xs text-gray-500">Drafts</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 text-center">
          <div className="text-2xl font-bold text-purple-600">{new Set(marks.map(m => m.class_id)).size}</div>
          <div className="text-xs text-gray-500">Classes</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search learner or learning area..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white rounded-2xl text-sm border focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
          />
        </div>
        <select
          value={filterClass}
          onChange={(e) => setFilterClass(e.target.value)}
          className="px-4 py-3 bg-white rounded-2xl text-sm border focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
        >
          <option value="">All Classes</option>
          {classes.map((c: any) => (
            <option key={c.name} value={c.name}>{c.name}</option>
          ))}
        </select>
        <select
          value={filterSubject}
          onChange={(e) => setFilterSubject(e.target.value)}
          className="px-4 py-3 bg-white rounded-2xl text-sm border focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
        >
          <option value="">All Learning Areas</option>
          {subjects.map((s: any) => (
            <option key={s.name} value={s.name}>{s.name}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="px-4 py-3 bg-white rounded-2xl text-sm border focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
        </select>
      </div>

      {/* Marks Table */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Learner</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Assessment #</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Class</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Learning Area</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Term</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Marks</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">%</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Grade</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" /></td></tr>
              ) : filteredMarks.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-8 text-gray-500">No marks found</td></tr>
              ) : (
                filteredMarks.map((m) => (
                  <tr key={m.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">
                      {m.students?.first_name} {m.students?.last_name}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{m.students?.admission_number || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{m.classes?.name || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3 text-blue-500" />
                        {m.subjects?.name || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {m.terms?.name} {m.terms?.academic_year}
                    </td>
                    <td className="px-4 py-3">
                      {editingMark === m.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={editMarks}
                            onChange={(e) => setEditMarks(e.target.value)}
                            className="w-16 px-2 py-1 border rounded-lg text-sm"
                            min={0}
                          />
                          <span className="text-gray-400">/</span>
                          <input
                            type="number"
                            value={editOutOf}
                            onChange={(e) => setEditOutOf(e.target.value)}
                            className="w-16 px-2 py-1 border rounded-lg text-sm"
                            min={1}
                          />
                        </div>
                      ) : (
                        <span className="font-medium">{m.marks} / {m.out_of}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold">{m.percentage}%</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${gradeColor(m.cbc_sublevel || m.cbc_grade || '')}`}>
                        {m.cbc_sublevel || m.cbc_grade || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        m.status === 'submitted'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        {m.status === 'submitted' ? 'Submitted' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {editingMark === m.id ? (
                          <>
                            <button
                              onClick={() => handleSaveEdit(m.id)}
                              disabled={saving}
                              className="flex items-center gap-1 text-xs px-2 py-1 bg-green-50 text-green-600 rounded-lg hover:bg-green-100"
                            >
                              <Save className="w-3 h-3" /> Save
                            </button>
                            <button
                              onClick={() => setEditingMark(null)}
                              className="flex items-center gap-1 text-xs px-2 py-1 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100"
                            >
                              <X className="w-3 h-3" /> Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            {m.status === 'draft' && (
                              <button
                                onClick={() => handleSubmitDraft(m.id)}
                                className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                              >
                                Submit
                              </button>
                            )}
                            <button
                              onClick={() => openEdit(m)}
                              className="flex items-center gap-1 text-xs px-2 py-1 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100"
                            >
                              <Pencil className="w-3 h-3" /> Edit
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
