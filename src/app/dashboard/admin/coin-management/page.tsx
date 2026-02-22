"use client";
/* eslint-disable react-hooks/rules-of-hooks */
// ═══════════════════════════════════════════════════════════════
// COIN MANAGEMENT DISABLED — DO NOT DELETE
// To re-enable: remove the eslint-disable comment above and the
// early return block inside CoinManagementPage below.
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useCachedUserProfile } from "@/hooks/useCachedUserProfile";
import React from "react";
import { useModal } from '@/components/ui/ModalProvider';

// Import the VolunteerIDChipInput from manual-points page
function VolunteerIDChipInput({ volunteerIds, onChange }: { volunteerIds: string[]; onChange: (ids: string[]) => void }) {
  const [inputValue, setInputValue] = useState("");
  const [warning, setWarning] = useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const isValidVolunteerId = (id: string): boolean => {
    const trimmed = id.trim();
    return /^\d+$/.test(trimmed) && trimmed.length > 0;
  };

  const addIds = (value: string) => {
    const entries = value.split(/[,\s\n\r]+/).map(s => s.trim()).filter(Boolean);
    const validIds: string[] = [];
    const invalidIds: string[] = [];

    entries.forEach(entry => {
      if (isValidVolunteerId(entry)) {
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
  newCoins?: number;
  change?: number;
};

function ResultsModal({ results, onClose }: { results: Result[]; onClose: () => void }) {
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
                          Change: <span className="font-semibold">{(r.change ?? 0) > 0 ? '+' : ''}{r.change ?? 0}</span> coins
                          {' · '}New Total: <span className="font-semibold">{r.newCoins}</span> coins
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

type Withdrawal = {
  id: string;
  coins: number;
  takaAmount: number;
  paymentMethod?: string;
  accountNumber?: string;
  status: string;
  notes?: string;
  createdAt: string;
  processedAt?: string;
  user: {
    id: string;
    fullName?: string;
    username?: string;
    email?: string;
    phone?: string;
    volunteerId?: string;
    coins: number;
  };
  processedBy?: {
    fullName?: string;
    username?: string;
  };
};

// ═══════════════════════════════════════════════════════════════
// COIN MANAGEMENT DISABLED — DO NOT DELETE
// Remove the early return inside the component below to re-enable.
// ═══════════════════════════════════════════════════════════════
export default function CoinManagementPage() {
  // COIN MANAGEMENT DISABLED — remove this early return to re-enable
  return (
    <div className="flex items-center justify-center min-h-screen text-slate-500 text-sm">
      Coin management is temporarily disabled.
    </div>
  );
  // eslint-disable-next-line no-unreachable
  const router = useRouter();
  const { data: session, status } = useSession();
  const userEmail = session?.user?.email || (typeof window !== "undefined" ? localStorage.getItem("userEmail") : null);
  const { user: viewer, loading: userLoading } = useCachedUserProfile<any>(userEmail);

  const [reason, setReason] = useState("");
  const [coins, setCoins] = useState<number | "">(0);
  const [volunteerIds, setVolunteerIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<Result[] | null>(null);

  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [endorsements, setEndorsements] = useState<any[]>([]);
  const [loadingEndorsements, setLoadingEndorsements] = useState(true);
  const [processingEndorsementId, setProcessingEndorsementId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'manual' | 'withdrawals' | 'endorsements'>('manual');

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') router.push('/auth');
  }, [status, router]);

  useEffect(() => {
    if (viewer) {
      fetchWithdrawals();
      fetchEndorsements();
    }
  }, [viewer]);

  const fetchWithdrawals = async () => {
    try {
      setLoadingWithdrawals(true);
      const res = await fetch('/api/admin/coins/withdrawals');
      const data = await res.json();
      if (res.ok) {
        setWithdrawals(data.withdrawals || []);
      }
    } catch (e) {
      console.error('Failed to fetch withdrawals', e);
    } finally {
      setLoadingWithdrawals(false);
    }
  };

  const fetchEndorsements = async () => {
    try {
      setLoadingEndorsements(true);
      const res = await fetch('/api/admin/coins/endorsements');
      const data = await res.json();
      if (res.ok) setEndorsements(data.endorsements || []);
    } catch (e) {
      console.error('Failed to fetch endorsements', e);
    } finally {
      setLoadingEndorsements(false);
    }
  };

  if (status === 'unauthenticated' || !viewer) return null;

  const displayName = viewer?.fullName || viewer?.username || (session as any)?.user?.name || 'Admin';
  const displayEmail = viewer?.email || (session as any)?.user?.email || '';
  const displayRole = (viewer?.role as any) || "ADMIN";

  const { confirm, toast, prompt } = useModal();

  const submitCoins = async () => {
    if (volunteerIds.length === 0) {
      toast('No volunteer IDs provided', { type: 'error' });
      return;
    }
    if (coins === '' || Number.isNaN(Number(coins))) {
      toast('Please provide a valid coins number', { type: 'error' });
      return;
    }

    const sample = volunteerIds.slice(0, 8).join(', ');
    const ok = await confirm(
      `Apply ${coins > 0 ? '+' : ''}${coins} coins to ${volunteerIds.length} volunteer${volunteerIds.length > 1 ? 's' : ''}?\n\nSample IDs: ${sample}${volunteerIds.length > 8 ? ', ...' : ''}`,
      'Confirm Coin Adjustment',
      coins < 0 ? 'warning' : 'info'
    );
    if (!ok) return;

    setSubmitting(true);
    setResults(null);
    try {
      const idsCsv = volunteerIds.join(',');
      const payload = { reason: reason || 'Manual coin adjustment', coins: Number(coins || 0), idsCsv };
      const res = await fetch('/api/admin/coins/manual-update', { 
        method: 'POST', 
        headers: { 'content-type': 'application/json' }, 
        body: JSON.stringify(payload) 
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed');
      
      if (Array.isArray(data.results)) {
        setResults(data.results);
      } else {
        toast('Operation completed successfully', { type: 'success' });
      }
    } catch (e: any) {
      toast(e?.message || 'Operation failed', { type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const processWithdrawal = async (withdrawalId: string, status: 'COMPLETED' | 'REJECTED') => {
    const withdrawal = withdrawals.find(w => w.id === withdrawalId);
    if (!withdrawal) return;

    const ok = await confirm(
      `${status === 'COMPLETED' ? 'Complete' : 'Reject'} withdrawal request from ${withdrawal.user.fullName || withdrawal.user.username}?\n\nAmount: ${withdrawal.coins} coins (৳${withdrawal.takaAmount.toFixed(2)})`,
      `Confirm ${status === 'COMPLETED' ? 'Completion' : 'Rejection'}`,
      status === 'REJECTED' ? 'warning' : 'info'
    );
    if (!ok) return;

    let notes = '';
    if (status === 'REJECTED') {
      try {
        const r = await prompt('Rejection reason (optional):', 'Rejection reason', 'Enter reason (optional)', '');
        notes = r || '';
      } catch (e) {
        notes = '';
      }
    }

    setProcessingId(withdrawalId);
    try {
      const res = await fetch('/api/admin/coins/withdrawals', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ withdrawalId, status, notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed');
      
      toast(`Withdrawal ${status === 'COMPLETED' ? 'completed' : 'rejected'} successfully`, { type: 'success' });
      fetchWithdrawals();
    } catch (e: any) {
      toast(e?.message || 'Operation failed', { type: 'error' });
    } finally {
      setProcessingId(null);
    }
  };

  const pendingWithdrawals = withdrawals.filter(w => w.status === 'PENDING');
  const completedWithdrawals = withdrawals.filter(w => w.status !== 'PENDING');

  const processEndorsement = async (endorsementId: string, status: 'APPROVED' | 'REJECTED') => {
    const endorsement = endorsements.find(e => e.id === endorsementId);
    if (!endorsement) return;

    if (status === 'APPROVED') {
      const coinsInput = await prompt(
        `Approve endorsement of ৳${Number(endorsement.amount).toFixed(2)} from ${endorsement.user.fullName || endorsement.user.username}?\n\nEnter coins to grant (default: ${Math.round(endorsement.amount)}):`,
        'Approve Endorsement',
        'Coins to grant',
        String(Math.round(endorsement.amount))
      ).catch(() => null);
      if (coinsInput === null) return;
      const coinsToAdd = Number(coinsInput) || Math.round(endorsement.amount);

      setProcessingEndorsementId(endorsementId);
      try {
        const res = await fetch(`/api/admin/coins/endorsements/${endorsementId}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ status: 'APPROVED', coinsToAdd }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Failed');
        toast(`Endorsement approved. ${data.coinsGranted} coins added.`, { type: 'success' });
        fetchEndorsements();
      } catch (e: any) {
        toast(e?.message || 'Failed', { type: 'error' });
      } finally {
        setProcessingEndorsementId(null);
      }
    } else {
      const ok = await confirm(
        `Reject endorsement from ${endorsement.user.fullName || endorsement.user.username}?`,
        'Reject Endorsement',
        'warning'
      );
      if (!ok) return;

      let notes = '';
      try {
        const r = await prompt('Rejection reason (optional):', 'Reason', 'Enter reason', '');
        notes = r || '';
      } catch (e) { notes = ''; }

      setProcessingEndorsementId(endorsementId);
      try {
        const res = await fetch(`/api/admin/coins/endorsements/${endorsementId}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ status: 'REJECTED', notes }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Failed');
        toast('Endorsement rejected.', { type: 'success' });
        fetchEndorsements();
      } catch (e: any) {
        toast(e?.message || 'Failed', { type: 'error' });
      } finally {
        setProcessingEndorsementId(null);
      }
    }
  };

  return (
    <DashboardLayout userRole={displayRole} userName={displayName} userEmail={displayEmail} userId={viewer?.id || ""}>
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Image src="/icons/coin.svg" alt="coin" width={44} height={44} className="drop-shadow-md" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Coin Management</h1>
              <p className="text-sm text-slate-600">Manage user coins, endorsements, and withdrawal requests</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
          {(['manual', 'endorsements', 'withdrawals'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                activeTab === tab
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab === 'manual' ? 'Manual Adjustment' : tab === 'endorsements' ? `Endorsements${endorsements.filter(e => e.status === 'PENDING').length > 0 ? ` (${endorsements.filter(e => e.status === 'PENDING').length})` : ''}` : `Withdrawals${pendingWithdrawals.length > 0 ? ` (${pendingWithdrawals.length})` : ''}`}
            </button>
          ))}
        </div>

        {/* Manual Coin Update Section */}
        {activeTab === 'manual' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-8">
          <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
              <h2 className="font-semibold text-slate-800">Manual Coin Adjustment</h2>
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Reason</label>
              <input 
                value={reason} 
                onChange={(e) => setReason(e.target.value)} 
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                placeholder="e.g. Bonus coins, Event reward, Correction" 
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Coins to Add/Deduct
                <span className="ml-2 text-xs font-normal text-slate-500">(use negative for deduction)</span>
              </label>
              <input 
                type="number" 
                value={coins as any} 
                onChange={(e) => setCoins(e.target.value === '' ? '' : Number(e.target.value))} 
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono" 
                placeholder="e.g. 100 or -50"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Volunteer IDs
                <span className="ml-2 text-xs font-normal text-slate-500">(numeric volunteer IDs only)</span>
              </label>
              <VolunteerIDChipInput volunteerIds={volunteerIds} onChange={setVolunteerIds} />
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
              <button 
                onClick={submitCoins} 
                disabled={submitting || volunteerIds.length === 0}
                className="flex-1 sm:flex-none px-6 py-2.5 bg-[#0b2545] text-white font-medium rounded hover:bg-[#0d2d5a] disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Processing...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Submit ({volunteerIds.length} {volunteerIds.length === 1 ? 'ID' : 'IDs'})
                  </span>
                )}
              </button>
              <button 
                type="button" 
                onClick={() => { setReason(''); setCoins(0); setVolunteerIds([]); setResults(null); }} 
                className="px-4 py-2.5 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
        )}

        {/* Endorsements Section */}
        {activeTab === 'endorsements' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-8">
          <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-indigo-50 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
                <h2 className="font-semibold text-slate-800">Coin Endorsement Requests</h2>
              </div>
              <button onClick={fetchEndorsements} className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">Refresh</button>
            </div>
          </div>
          <div className="p-6">
            {loadingEndorsements ? (
              <div className="text-center py-8 text-slate-500">Loading...</div>
            ) : (
              <>
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Pending ({endorsements.filter(e => e.status === 'PENDING').length})</h3>
                  {endorsements.filter(e => e.status === 'PENDING').length === 0 ? (
                    <div className="text-center py-6 text-slate-500 bg-slate-50 rounded-lg">No pending endorsement requests</div>
                  ) : (
                    <div className="space-y-3">
                      {endorsements.filter(e => e.status === 'PENDING').map((e) => (
                        <div key={e.id} className="p-4 border border-indigo-200 bg-indigo-50 rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="font-semibold text-slate-900">
                                {e.user.fullName || e.user.username}
                                {e.user.volunteerId && <span className="ml-2 text-xs font-mono text-slate-600">ID: {e.user.volunteerId}</span>}
                              </div>
                              <div className="text-xs text-slate-600 mt-0.5">{e.user.email}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-indigo-700 text-lg">৳{Number(e.amount).toFixed(2)}</div>
                              <div className="text-xs text-slate-500">{e.method?.toUpperCase()}</div>
                            </div>
                          </div>
                          <div className="text-xs text-slate-600 mb-3">
                            <div>Sender: {e.accountNumber}</div>
                            {e.transactionId && <div>TrxID: {e.transactionId}</div>}
                            <div>Transfer time: {new Date(e.datetime).toLocaleString()}</div>
                            <div>Submitted: {new Date(e.createdAt).toLocaleString()}</div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => processEndorsement(e.id, 'APPROVED')}
                              disabled={processingEndorsementId === e.id}
                              className="flex-1 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 disabled:opacity-60 transition-colors"
                            >
                              {processingEndorsementId === e.id ? 'Processing...' : 'Approve'}
                            </button>
                            <button
                              onClick={() => processEndorsement(e.id, 'REJECTED')}
                              disabled={processingEndorsementId === e.id}
                              className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 disabled:opacity-60 transition-colors"
                            >
                              {processingEndorsementId === e.id ? 'Processing...' : 'Reject'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Processed ({endorsements.filter(e => e.status !== 'PENDING').length})</h3>
                  {endorsements.filter(e => e.status !== 'PENDING').length === 0 ? (
                    <div className="text-center py-6 text-slate-500 bg-slate-50 rounded-lg">No processed endorsements yet</div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {endorsements.filter(e => e.status !== 'PENDING').map((e) => (
                        <div key={e.id} className={`p-3 border rounded-lg ${e.status === 'APPROVED' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-semibold text-sm text-slate-900">
                                {e.user.fullName || e.user.username}
                                {e.user.volunteerId && <span className="ml-2 text-xs font-mono text-slate-600">ID: {e.user.volunteerId}</span>}
                              </div>
                              <div className="text-xs text-slate-600 mt-1">৳{Number(e.amount).toFixed(2)} · {e.method?.toUpperCase()} · {e.accountNumber}</div>
                              <div className="text-xs text-slate-500 mt-1">Processed: {e.processedAt ? new Date(e.processedAt).toLocaleString() : 'N/A'}{e.processedBy && ` by ${e.processedBy.fullName || e.processedBy.username}`}</div>
                              {e.notes && <div className="text-xs text-slate-600 mt-1 italic">Note: {e.notes}</div>}
                            </div>
                            <div className={`px-2 py-1 text-xs font-semibold rounded ${e.status === 'APPROVED' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>{e.status}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
        )}

        {/* Withdrawal Requests Section */}
        {activeTab === 'withdrawals' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-amber-50 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600">
                  <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>
                </svg>
                <h2 className="font-semibold text-slate-800">Withdrawal Requests</h2>
              </div>
              <button 
                onClick={fetchWithdrawals}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>

          <div className="p-6">
            {loadingWithdrawals ? (
              <div className="text-center py-8 text-slate-500">Loading...</div>
            ) : (
              <>
                {/* Pending Withdrawals */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Pending ({pendingWithdrawals.length})</h3>
                  {pendingWithdrawals.length === 0 ? (
                    <div className="text-center py-6 text-slate-500 bg-slate-50 rounded-lg">
                      No pending withdrawal requests
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pendingWithdrawals.map((w) => (
                        <div key={w.id} className="p-4 border border-amber-200 bg-amber-50 rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="font-semibold text-slate-900">
                                {w.user.fullName || w.user.username}
                                {w.user.volunteerId && (
                                  <span className="ml-2 text-xs font-mono text-slate-600">ID: {w.user.volunteerId}</span>
                                )}
                              </div>
                              <div className="text-xs text-slate-600 mt-0.5">{w.user.email}</div>
                              {w.user.phone && <div className="text-xs text-slate-600">{w.user.phone}</div>}
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-amber-700 text-lg">{w.coins} coins</div>
                              <div className="text-sm text-slate-600">৳{w.takaAmount.toFixed(2)}</div>
                            </div>
                          </div>
                          <div className="text-xs text-slate-600 mb-3">
                            <div>Payment: {w.paymentMethod?.toUpperCase() || 'N/A'} - {w.accountNumber}</div>
                            <div>User Balance: {w.user.coins} coins</div>
                            <div>Requested: {new Date(w.createdAt).toLocaleString()}</div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => processWithdrawal(w.id, 'COMPLETED')}
                              disabled={processingId === w.id}
                              className="flex-1 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 disabled:opacity-60 transition-colors"
                            >
                              {processingId === w.id ? 'Processing...' : 'Complete'}
                            </button>
                            <button
                              onClick={() => processWithdrawal(w.id, 'REJECTED')}
                              disabled={processingId === w.id}
                              className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 disabled:opacity-60 transition-colors"
                            >
                              {processingId === w.id ? 'Processing...' : 'Reject'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Completed Withdrawals */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Completed ({completedWithdrawals.length})</h3>
                  {completedWithdrawals.length === 0 ? (
                    <div className="text-center py-6 text-slate-500 bg-slate-50 rounded-lg">
                      No completed withdrawals yet
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {completedWithdrawals.map((w) => (
                        <div key={w.id} className={`p-3 border rounded-lg ${w.status === 'COMPLETED' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-semibold text-sm text-slate-900">
                                {w.user.fullName || w.user.username}
                                {w.user.volunteerId && (
                                  <span className="ml-2 text-xs font-mono text-slate-600">ID: {w.user.volunteerId}</span>
                                )}
                              </div>
                              <div className="text-xs text-slate-600 mt-1">
                                {w.coins} coins · ৳{w.takaAmount.toFixed(2)} · {w.paymentMethod?.toUpperCase()}
                              </div>
                              <div className="text-xs text-slate-500 mt-1">
                                Processed: {w.processedAt ? new Date(w.processedAt).toLocaleString() : 'N/A'}
                                {w.processedBy && ` by ${w.processedBy.fullName || w.processedBy.username}`}
                              </div>
                              {w.notes && (
                                <div className="text-xs text-slate-600 mt-1 italic">Note: {w.notes}</div>
                              )}
                            </div>
                            <div className={`px-2 py-1 text-xs font-semibold rounded ${w.status === 'COMPLETED' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                              {w.status}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
        )}

      </div>

      {/* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */}
      {results && <ResultsModal results={results!} onClose={() => setResults(null)} />}
    </DashboardLayout>
  );
}
