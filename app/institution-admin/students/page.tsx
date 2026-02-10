'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Plus, Upload, Search, Trash2, Ban, CheckCircle, RefreshCw, Eye, EyeOff, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { AuthService } from '@/lib/services/authService';
import * as XLSX from 'xlsx';
import { useLoading } from '@/lib/context/LoadingContext';

export default function StudentManagerPage() {
    const [students, setStudents] = useState<any[]>([]);
    const { setLoading: setGlobalLoading, isLoading: loading } = useLoading();
    const [search, setSearch] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [adminInstitutionId, setAdminInstitutionId] = useState<number | null>(null);
    const [passwordVisible, setPasswordVisible] = useState<Record<string, boolean>>({});
    const fileInputRef = useRef<HTMLInputElement>(null);

    // New Student Form
    const [newStudent, setNewStudent] = useState({
        studentId: '', // Roll Number
        name: '',
        password: '',
    });

    const creating = loading;
    const uploading = loading;

    useEffect(() => {
        loadStudents();
    }, []);

    const loadStudents = async () => {
        setGlobalLoading(true, 'Accessing Student Directory...');
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const instId = await AuthService.getInstitutionId(user.id);
            setAdminInstitutionId(instId);

            if (!instId) {
                toast.error("Institution link missing. You cannot manage students yet.");
            }

            if (instId) {
                const { data, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('role', 'student')
                    .eq('institution_id', instId)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setStudents(data || []);
            }
        } catch (err: any) {
            console.error(err);
            toast.error("Failed to load students: " + err.message);
        } finally {
            setGlobalLoading(false);
        }
    };

    const handleCreateStudent = async (e: React.FormEvent) => {
        e.preventDefault();

        let currentInstId = adminInstitutionId;

        // Final fallback if state is somehow lost or not yet set
        if (!currentInstId) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                currentInstId = await AuthService.getInstitutionId(user.id);
                if (currentInstId) setAdminInstitutionId(currentInstId);
            }
        }

        if (!currentInstId) {
            toast.error("Institution ID missing. Please refresh the page.");
            return;
        }

        setGlobalLoading(true, 'Enrolling Student...');
        await createSingleStudent(newStudent.name, newStudent.studentId, newStudent.password, currentInstId);
        setGlobalLoading(false);
        setShowAddModal(false);
        setNewStudent({ studentId: '', name: '', password: '' });
        loadStudents(); // Refresh list
    };

    const createSingleStudent = async (name: string, studentId: string, password?: string, manualInstId?: number) => {
        const instIdToUse = manualInstId || adminInstitutionId;
        if (!instIdToUse) {
            toast.error("Institution ID missing");
            return false;
        }

        try {
            const finalPassword = password || Math.random().toString(36).slice(-8);

            const response = await fetch('/api/create-student', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentId: studentId.toString(),
                    name,
                    password: finalPassword,
                    institutionId: instIdToUse
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to create student');
            }

            toast.success(`Created: ${name}`);
            return true;
        } catch (error: any) {
            toast.error(`Error (${name}): ${error.message}`);
            return false;
        }
    };

    const downloadTemplate = () => {
        const ws = XLSX.utils.json_to_sheet([
            { Name: 'John Doe', RollNo: '2024-001', Password: 'securePass123' },
            { Name: 'Jane Smith', RollNo: '2024-002', Password: '' }
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Students");
        XLSX.writeFile(wb, "Student_Upload_Template.xlsx");
    };

    const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setGlobalLoading(true, 'Consulting Pedagogical Records...');
        const reader = new FileReader();

        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws) as any[];

                if (data.length === 0) {
                    toast.error("Excel file is empty");
                    setGlobalLoading(false);
                    return;
                }

                let currentInstId = adminInstitutionId;
                if (!currentInstId) {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                        const { data: profile } = await supabase.from('users').select('institution_id').eq('id', user.id).single();
                        currentInstId = profile?.institution_id;
                        if (!currentInstId) {
                            const { data: adminLink } = await supabase.from('institution_admins').select('institution_id').eq('user_id', user.id).maybeSingle();
                            currentInstId = adminLink?.institution_id;
                        }
                    }
                }

                if (!currentInstId) {
                    toast.error("Institution ID missing. Cannot process bulk upload.");
                    setGlobalLoading(false);
                    return;
                }

                toast.info(`Processing ${data.length} students...`);
                let successCount = 0;

                for (const row of data) {
                    const name = row['Name'] || row['name'] || row['Full Name'];
                    const rollNo = row['RollNo'] || row['rollno'] || row['Roll Number'] || row['Student ID'];
                    const password = row['Password'] || row['password'];

                    if (name && rollNo) {
                        const success = await createSingleStudent(name, rollNo, password, currentInstId);
                        if (success) successCount++;
                    }
                }

                toast.success(`Bulk upload complete. Added ${successCount} students.`);
                loadStudents();

            } catch (error: any) {
                toast.error("Failed to parse Excel: " + error.message);
            } finally {
                setGlobalLoading(false);
                if (fileInputRef.current) fileInputRef.current.value = ''; // Reset
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleToggleStatus = async (studentId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'active' ? 'blocked' : 'active';
        const action = newStatus === 'active' ? 'Unblock' : 'Block';

        if (!confirm(`Are you sure you want to ${action} this student?`)) return;

        try {
            const { error } = await supabase
                .from('users')
                .update({ status: newStatus })
                .eq('id', studentId);

            if (error) throw error;
            toast.success(`Student ${newStatus} successfully`);

            // Optimistic update
            setStudents(students.map(s => s.id === studentId ? { ...s, status: newStatus } : s));
        } catch (error: any) {
            toast.error("Failed to update status: " + error.message);
        }
    };

    const handleDelete = async (userId: string) => {
        if (!confirm('Are you sure you want to delete this student?')) return;
        try {
            const { error } = await supabase.from('users').delete().eq('id', userId);
            if (error) throw error;
            toast.success('Student deleted');
            setStudents(students.filter(s => s.id !== userId));
        } catch (error: any) {
            toast.error("Failed to delete: " + error.message);
        }
    };

    const togglePassword = (id: string) => {
        setPasswordVisible(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const filteredStudents = students.filter(s =>
        (s.full_name || s.name)?.toLowerCase().includes(search.toLowerCase()) ||
        s.student_id_code?.toLowerCase().includes(search.toLowerCase()) ||
        s.email?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="max-w-[1400px] mx-auto">
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6 mb-8">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-black text-slate-900 leading-tight">Student Manager</h1>
                    <p className="text-slate-500 text-base lg:text-lg">Manage accounts, status, and access.</p>
                </div>
                <div className="grid grid-cols-2 lg:flex lg:items-center gap-2 lg:gap-3">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleBulkUpload}
                        accept=".xlsx,.xls,.csv"
                        className="hidden"
                    />
                    <button
                        onClick={downloadTemplate}
                        className="flex items-center justify-center gap-2 px-3 lg:px-4 py-2 bg-white border border-gray-200 text-slate-700 rounded-xl hover:bg-gray-50 font-bold transition-all shadow-sm text-xs sm:text-sm"
                        title="Download Excel Template"
                    >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        <span>Template</span>
                    </button>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="flex items-center justify-center gap-2 px-3 lg:px-4 py-2 bg-white border border-gray-200 text-slate-700 rounded-xl hover:bg-gray-50 font-bold transition-all shadow-sm text-xs sm:text-sm"
                    >
                        <FileSpreadsheet className="w-4 h-4" />
                        <span className="whitespace-nowrap">{uploading ? 'Processing...' : 'Bulk Upload'}</span>
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="col-span-2 lg:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-xl hover:bg-teal-700 font-black shadow-lg shadow-teal-100 transition-all hover:scale-[1.02] active:scale-95 text-sm"
                    >
                        <Plus className="w-5 h-5" />
                        Add Student Account
                    </button>
                </div>
            </div>

            {/* Tool Bar */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="relative w-full sm:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Search name, roll no, or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 text-sm transition-all shadow-inner"
                    />
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3 text-[10px] lg:text-sm font-black uppercase tracking-widest text-slate-400">
                    <div>Total: <span className="text-slate-900">{students.length}</span></div>
                    <div className="w-1 h-1 rounded-full bg-slate-200" />
                    <div>Active: <span className="text-emerald-600">{students.filter(s => s.status !== 'blocked').length}</span></div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm overflow-x-auto no-scrollbar">
                <table className="w-full min-w-[800px]">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="text-left py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Student</th>
                            <th className="text-left py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Roll No</th>
                            <th className="text-left py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Initial Password</th>
                            <th className="text-left py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Email (Login)</th>
                            <th className="text-left py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                            <th className="text-right py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading && students.length === 0 ? (
                            <tr><td colSpan={6} className="p-8 text-center text-gray-400 font-bold uppercase tracking-widest text-[10px]">Consulting Database...</td></tr>
                        ) : filteredStudents.length === 0 ? (
                            <tr><td colSpan={6} className="p-12 text-center text-gray-400">
                                {adminInstitutionId ? "No students found." : "Waiting for connection..."}
                            </td></tr>
                        ) : filteredStudents.map((student) => (
                            <tr key={student.id} className={`hover:bg-gray-50/50 transition-colors ${student.status === 'blocked' ? 'bg-red-50/30' : ''}`}>
                                <td className="py-4 px-6">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${student.status === 'blocked' ? 'bg-red-100 text-red-600' : 'bg-teal-100 text-teal-600'
                                            }`}>
                                            {(student.full_name || student.name || 'S')[0]}
                                        </div>
                                        <div className="font-bold text-slate-900">{student.full_name || student.name}</div>
                                    </div>
                                </td>
                                <td className="py-4 px-6">
                                    <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded text-slate-600">
                                        {student.student_id_code || 'N/A'}
                                    </span>
                                </td>
                                <td className="py-4 px-6">
                                    <div className="flex items-center gap-2">
                                        <span className={`font-mono text-sm ${!student.initial_password ? 'text-gray-400 italic' : 'text-slate-600'}`}>
                                            {passwordVisible[student.id]
                                                ? (student.initial_password || 'Not Set')
                                                : (student.initial_password ? '••••••••' : 'Not Set')}
                                        </span>
                                        {student.initial_password && (
                                            <button
                                                onClick={() => togglePassword(student.id)}
                                                className="text-gray-400 hover:text-teal-600"
                                            >
                                                {passwordVisible[student.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        )}
                                    </div>
                                </td>
                                <td className="py-4 px-6 text-sm text-slate-500">
                                    {student.email}
                                </td>
                                <td className="py-4 px-6">
                                    <button
                                        onClick={() => handleToggleStatus(student.id, student.status || 'active')}
                                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold cursor-pointer hover:opacity-80 transition-opacity ${student.status === 'blocked'
                                            ? 'bg-red-100 text-red-800'
                                            : 'bg-emerald-100 text-emerald-800'
                                            }`}>
                                        {student.status === 'blocked' ? 'Blocked' : 'Active'}
                                    </button>
                                </td>
                                <td className="py-4 px-6 text-right flex justify-end gap-2">
                                    <button
                                        onClick={() => handleToggleStatus(student.id, student.status || 'active')}
                                        title={student.status === 'blocked' ? "Unblock" : "Block"}
                                        className={`p-2 rounded-lg transition-colors ${student.status === 'blocked'
                                            ? 'text-emerald-600 hover:bg-green-50'
                                            : 'text-orange-500 hover:bg-orange-50'
                                            }`}
                                    >
                                        {student.status === 'blocked' ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                                    </button>
                                    <button
                                        onClick={() => handleDelete(student.id)}
                                        title="Delete"
                                        className="text-gray-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* ADD STUDENT MODAL */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                            <h2 className="text-xl font-bold text-slate-900">Add New Student</h2>
                            <p className="text-slate-500 text-sm mt-1">Create a student account manually.</p>
                        </div>
                        <form onSubmit={handleCreateStudent} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Full Name</label>
                                <input
                                    required
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                                    placeholder="e.g. John Smith"
                                    value={newStudent.name}
                                    onChange={e => setNewStudent({ ...newStudent, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Roll Number (ID)</label>
                                <input
                                    required
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                                    placeholder="e.g. 2024-001"
                                    value={newStudent.studentId}
                                    onChange={e => setNewStudent({ ...newStudent, studentId: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Passsword</label>
                                <input
                                    required
                                    type="text"
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                                    placeholder="Initial password"
                                    value={newStudent.password}
                                    onChange={e => setNewStudent({ ...newStudent, password: e.target.value })}
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 py-3 bg-gray-100 text-slate-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="flex-1 py-3 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                                >
                                    {creating ? 'Creating...' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
