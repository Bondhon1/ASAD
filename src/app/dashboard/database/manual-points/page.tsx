"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useCachedUserProfile } from "@/hooks/useCachedUserProfile";
import React from "react";
import { useModal } from '@/components/ui/ModalProvider';

function VolunteerIDChipInput({ volunteerIds, onChange }: { volunteerIds: string[]; onChange: (ids: string[]) => void }) {
  const [inputValue, setInputValue] = useState("");
  const [warning, setWarning] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isValidVolunteerId = (id: string): boolean => {
    const trimmed = id.trim();
    // Must be numeric and not empty
    return /^\d+$/.test(trimmed) && trimmed.length > 0;
  };

  const addIds = (value: string) => {
    // Split by comma, space, or newline
    const entries = value.split(/[,\s\n\r]+/).map(s => s.trim()).filter(Boolean);
    const validIds: string[] = [];
    const invalidIds: string[] = [];

    entries.forEach(entry => {
      if (isValidVolunteerId(entry)) {
        // Avoid duplicates
        if (!volunteerIds.includes(entry) && !validIds.includes(entry)) {
          validIds.push(entry);
        }
      } else {
        invalidIds.push(entry);
      }
    });

    if (invalidIds.length > 0) {
      setWarning(`Invalid volunteer ID(s): ${invalidIds.join(', ')}. Only numeric IDs are accepted.`);
      setTimeout(() => setWarning(null), 4000);
    } else {
      setWarning(null);
    }

    if (validIds.length > 0) {
      onChange([...volunteerIds, ...validIds]);
    }

    setInputValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (inputValue.trim()) {
        addIds(inputValue);
      }
    } else if (e.key === 'Backspace' && inputValue === '' && volunteerIds.length > 0) {
      // Remove last chip on backspace when input is empty
      onChange(volunteerIds.slice(0, -1));
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    addIds(pastedText);
  };

  const removeId = (idToRemove: string) => {
    onChange(volunteerIds.filter(id => id !== idToRemove));
  };

  return (
    <div>
      <div
        className="min-h-[120px] p-3 border-2 border-slate-300 rounded-lg bg-white hover:border-blue-400 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200 transition-all cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        <div className="flex flex-wrap gap-2 mb-2">
          {volunteerIds.map((id, idx) => (
            <div
              key={idx}
              className="inline-flex items-center gap-1 px-2 py-1 bg-[#0b2545] text-white rounded text-xs font-medium shadow-sm hover:shadow-md transition-shadow group"
            >
              <span className="font-mono">{id}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeId(id);
                }}
                className="ml-0.5 hover:bg-white/20 rounded p-0.5 transition-colors"
                aria-label="Remove ID"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={() => {
            if (inputValue.trim()) {
              addIds(inputValue);
            }
          }}
          className="w-full outline-none bg-transparent text-sm"
          placeholder={volunteerIds.length === 0 ? "Type volunteer IDs (numeric only) - press Enter or comma to add..." : "Add more IDs..."}
        />
      </div>

      {/* Stats and Helper Text */}
      <div className="mt-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-4 text-slate-600">
          <span className="flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            Press <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-xs font-mono">Enter</kbd> or <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-xs font-mono">,</kbd> to add
          </span>
        </div>
        <span className="font-semibold text-blue-600">
          {volunteerIds.length} ID{volunteerIds.length !== 1 ? 's' : ''} added
        </span>
      </div>

      {/* Warning Message */}
      {warning && (
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 animate-in slide-in-from-top-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600 flex-shrink-0 mt-0.5">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <div className="flex-1">
            <div className="font-semibold text-amber-900 text-sm">Invalid Input</div>
            <div className="text-xs text-amber-700 mt-0.5">{warning}</div>
          </div>
        </div>
      )}
    </div>
  );
}

type Result = {
  ident: string;
  ok: boolean;
  error?: string;
  newPoints?: number;
  rankChanged?: boolean;
  newRankName?: string;
};

type NegativeDeductionSummary = {
  negativePoints: number;
  totalAffected: number;
  skippedOnLeave: number;
  skippedInIdList: number;
  rankChangedCount: number;
  failed: number;
};

function ResultsModal({
  results,
  negativeDeductionSummary,
  onClose,
}: {
  results: Result[];
  negativeDeductionSummary?: NegativeDeductionSummary | null;
  onClose: () => void;
}) {
  const successCount = results.filter(r => r.ok).length;
  const failCount = results.length - successCount;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4">
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Operation Results</h2>
              <p className="text-sm text-slate-600 mt-1">
                <span className="text-green-600 font-semibold">{successCount} succeeded</span> · 
                <span className="text-red-600 font-semibold ml-1">{failCount} failed</span>
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white rounded-lg transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
              </svg>
            </button>
          </div>
        </div>
        
        <div className="overflow-y-auto max-h-[calc(80vh-140px)] p-6">
          {/* Success Section */}
          {successCount > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-green-100 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                </div>
                <h3 className="font-semibold text-green-900">Successful Updates ({successCount})</h3>
              </div>
              <div className="space-y-2">
                {results.filter(r => r.ok).map((r, idx) => (
                  <div key={idx} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-mono text-sm text-green-900 font-medium">{r.ident}</div>
                        <div className="text-xs text-green-700 mt-1">
                          New Points: <span className="font-semibold">{r.newPoints}</span>
                          {r.rankChanged && (
                            <span className="ml-3 px-2 py-0.5 bg-green-200 text-green-800 rounded-md font-medium">
                              Rank → {r.newRankName}
                            </span>
                          )}
                        </div>
                      </div>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600 flex-shrink-0">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Failure Section */}
          {failCount > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-red-100 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                </div>
                <h3 className="font-semibold text-red-900">Failed Updates ({failCount})</h3>
              </div>
              <div className="space-y-2">
                {results.filter(r => !r.ok).map((r, idx) => (
                  <div key={idx} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-mono text-sm text-red-900 font-medium">{r.ident}</div>
                        <div className="text-xs text-red-700 mt-1 flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                          </svg>
                          {r.error || 'Unknown error'}
                        </div>
                      </div>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600 flex-shrink-0">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Negative Deduction Summary */}
          {negativeDeductionSummary && (
            <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-orange-100 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-600">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                </div>
                <h3 className="font-semibold text-orange-900">Global Deduction: -{negativeDeductionSummary.negativePoints} pts</h3>
              </div>
              {negativeDeductionSummary.failed === -1 ? (
                <p className="text-sm text-red-700 font-medium">⚠️ Global deduction encountered a fatal error. No accounts were deducted.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0"/>
                    <span className="text-slate-700">Deducted from <strong>{negativeDeductionSummary.totalAffected}</strong> volunteer{negativeDeductionSummary.totalAffected !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0"/>
                    <span className="text-slate-700"><strong>{negativeDeductionSummary.skippedInIdList}</strong> in ID list (exempt)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"/>
                    <span className="text-slate-700"><strong>{negativeDeductionSummary.skippedOnLeave}</strong> on leave (exempt)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-400 flex-shrink-0"/>
                    <span className="text-slate-700"><strong>{negativeDeductionSummary.rankChangedCount}</strong> rank downgrade{negativeDeductionSummary.rankChangedCount !== 1 ? 's' : ''}</span>
                  </div>
                  {negativeDeductionSummary.failed > 0 && (
                    <div className="flex items-center gap-2 col-span-2">
                      <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0"/>
                      <span className="text-red-700"><strong>{negativeDeductionSummary.failed}</strong> failed (batch error)</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-slate-800 text-white font-medium rounded-lg hover:bg-slate-900 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ManualPointsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const userEmail = session?.user?.email || (typeof window !== "undefined" ? localStorage.getItem("userEmail") : null);
  const { user: viewer, loading: userLoading } = useCachedUserProfile<any>(userEmail);

  const [taskName, setTaskName] = useState("");
  const [points, setPoints] = useState<number | "">(0);
  const [volunteerIds, setVolunteerIds] = useState<string[]>([]);
  const [enableNegativeDeduction, setEnableNegativeDeduction] = useState(false);
  const [negativePoints, setNegativePoints] = useState<number | "">("" );
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<Result[] | null>(null);
  const [negativeDeductionSummary, setNegativeDeductionSummary] = useState<NegativeDeductionSummary | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') router.push('/auth');
  }, [status, router]);

  if (status === 'unauthenticated' || !viewer) return null;

  const displayName = viewer?.fullName || viewer?.username || (session as any)?.user?.name || 'Database Dept';
  const displayEmail = viewer?.email || (session as any)?.user?.email || '';
  const displayRole = (viewer?.role as any) || "DATABASE_DEPT";

  const { confirm, toast } = useModal();

  const submit = async () => {
    const hasIds = volunteerIds.length > 0;
    const hasDeduction = enableNegativeDeduction && negativePoints !== '' && Number(negativePoints) > 0;

    if (!hasIds && !hasDeduction) {
      toast('Provide volunteer IDs or enable negative deduction', { type: 'error' });
      return;
    }
    if (hasIds && (points === '' || Number.isNaN(Number(points)))) {
      toast('Please provide a valid points number', { type: 'error' });
      return;
    }
    if (hasDeduction && (Number.isNaN(Number(negativePoints)) || Number(negativePoints) <= 0)) {
      toast('Negative Points must be a positive number', { type: 'error' });
      return;
    }

    // Build confirm message
    const parts: string[] = [];
    if (hasIds) {
      const sample = volunteerIds.slice(0, 8).join(', ');
      parts.push(`• Add ${Number(points) > 0 ? '+' : ''}${points} points to ${volunteerIds.length} specific volunteer${volunteerIds.length > 1 ? 's' : ''} (IDs: ${sample}${volunteerIds.length > 8 ? ', ...' : ''})`);
    }
    if (hasDeduction) {
      parts.push(`• Deduct -${negativePoints} points from ALL OFFICIAL volunteers (exempting IDs above + users on approved leave)`);
    }

    const ok = await confirm(
      parts.join('\n\n'),
      hasDeduction ? '⚠️ Confirm — This affects ALL volunteers' : 'Confirm Point Adjustment',
      hasDeduction ? 'warning' : 'info'
    );
    if (!ok) return;

    setSubmitting(true);
    setResults(null);
    setNegativeDeductionSummary(null);
    try {
      const payload = {
        taskName: taskName || 'Manual upgrade',
        points: Number(points || 0),
        idsCsv: volunteerIds.join(','),
        enableNegativeDeduction: hasDeduction,
        negativePoints: Number(negativePoints || 0),
      };
      const res = await fetch('/api/database/manual-points', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed');

      if (Array.isArray(data.results) && data.results.length > 0) {
        setResults(data.results);
      } else if (data.negativeDeductionSummary) {
        setNegativeDeductionSummary(data.negativeDeductionSummary);
        // Force modal open even without positive-ID results
        setResults([]);
      } else {
        toast('Operation completed successfully', { type: 'success' });
      }
      if (data.negativeDeductionSummary) {
        setNegativeDeductionSummary(data.negativeDeductionSummary);
      }
    } catch (e: any) {
      toast(e?.message || 'Operation failed', { type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout userRole={displayRole} userName={displayName} userEmail={displayEmail} userId={viewer?.id || ""}>
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Manual Point Adjustment</h1>
              <p className="text-sm text-slate-600">Batch update points for multiple volunteers</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/>
              </svg>
              <h2 className="font-semibold text-slate-800">Configuration</h2>
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Task Name */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Task Name</label>
              <input
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="e.g. Database: manual grant, Event bonus points"
              />
            </div>

            {/* ── Section 1: Specific ID Point Addition ─────────────────────── */}
            <div className="border border-blue-100 rounded-xl p-4 bg-blue-50/40 space-y-4">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold">1</span>
                <span className="text-sm font-semibold text-blue-900">Specific ID Point Addition</span>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Volunteer IDs
                  <span className="ml-2 text-xs font-normal text-slate-500">(numeric volunteer IDs only)</span>
                </label>
                <VolunteerIDChipInput volunteerIds={volunteerIds} onChange={setVolunteerIds} />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Points to Add
                  <span className="ml-2 text-xs font-normal text-slate-500">(added only to the IDs above)</span>
                </label>
                <input
                  type="number"
                  value={points as any}
                  onChange={(e) => setPoints(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono"
                  placeholder="e.g. 50"
                />
              </div>
            </div>

            {/* ── Section 2: Global Negative Deduction ──────────────────────── */}
            <div className={`border rounded-xl p-4 space-y-4 transition-colors ${
              enableNegativeDeduction ? 'border-orange-300 bg-orange-50/40' : 'border-slate-200 bg-slate-50/40'
            }`}>
              {/* Toggle header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-500 text-white text-xs font-bold">2</span>
                  <span className="text-sm font-semibold text-slate-800">Global Negative Deduction</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enableNegativeDeduction}
                  onClick={() => setEnableNegativeDeduction(v => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-1 ${
                    enableNegativeDeduction ? 'bg-orange-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      enableNegativeDeduction ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {enableNegativeDeduction && (
                <>
                  {/* Caution banner */}
                  <div className="flex items-start gap-3 p-3 bg-orange-100 border border-orange-300 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-700 flex-shrink-0 mt-0.5">
                      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    <div>
                      <p className="text-sm font-bold text-orange-900">⚠️ High-Impact Operation</p>
                      <p className="text-xs text-orange-800 mt-1">
                        This will deduct points from <strong>every OFFICIAL volunteer</strong> except those listed above and anyone currently on approved leave.
                        Rank downgrades will occur automatically. This action is logged and cannot be undone in bulk.
                      </p>
                    </div>
                  </div>

                  {/* Negative Points field */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Negative Points
                      <span className="ml-2 text-xs font-normal text-slate-500">(deducted from all active volunteers)</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={negativePoints as any}
                      onChange={(e) => setNegativePoints(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-4 py-2.5 border border-orange-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all font-mono bg-white"
                      placeholder="e.g. 10"
                    />
                    <p className="mt-1.5 text-xs text-slate-500">
                      Exempt: volunteers listed in Section 1 • volunteers on approved leave today
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Submit / Reset */}
            <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
              <button
                onClick={submit}
                disabled={submitting || (volunteerIds.length === 0 && !enableNegativeDeduction)}
                className={`flex-1 sm:flex-none px-6 py-2.5 text-white font-medium rounded hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md ${
                  enableNegativeDeduction ? 'bg-orange-600 hover:bg-orange-700' : 'bg-[#0b2545] hover:bg-[#0d2d5a]'
                }`}
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Processing...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    {enableNegativeDeduction
                      ? `Submit (${volunteerIds.length > 0 ? `+IDs & ` : ''}Global deduction)`
                      : `Submit (${volunteerIds.length} ${volunteerIds.length === 1 ? 'ID' : 'IDs'})`}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setTaskName('');
                  setPoints(0);
                  setVolunteerIds([]);
                  setEnableNegativeDeduction(false);
                  setNegativePoints('');
                  setResults(null);
                  setNegativeDeductionSummary(null);
                }}
                className="px-4 py-2.5 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {(results !== null) && (
        <ResultsModal
          results={results}
          negativeDeductionSummary={negativeDeductionSummary}
          onClose={() => { setResults(null); setNegativeDeductionSummary(null); }}
        />
      )}
    </DashboardLayout>
  );
}
