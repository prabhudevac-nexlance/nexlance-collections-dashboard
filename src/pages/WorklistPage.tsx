import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { PhoneMasker } from '../components/common/PhoneMasker';
import { PhoneCall, AlertCircle, CheckCircle2, History, ChevronRight, ChevronLeft } from 'lucide-react';
import type { ContactMode, DispositionCode } from '../types';

export const WorklistPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { allocations, activityLogs, ptpRecords, captureDisposition } = useData();

  const today = new Date().toISOString().split('T')[0];

  const availableAllocations = allocations.filter(a => {
    if (a.current_status === 'Paid' || a.current_status === 'Closed') return false;

    if (currentUser.role === 'AGENT') {
      return a.assigned_agent_id === currentUser.agent_id;
    }
    return true;
  });

  const prioritySortedAllocations = [...availableAllocations].sort((a, b) => {
    const ptpA = ptpRecords.find(p => p.allocation_id === a.allocation_id && p.promised_date === today && p.ptp_status === 'Open');
    const ptpB = ptpRecords.find(p => p.allocation_id === b.allocation_id && p.promised_date === today && p.ptp_status === 'Open');
    if (ptpA && !ptpB) return -1;
    if (!ptpA && ptpB) return 1;

    const cbA = activityLogs.find(act => act.allocation_id === a.allocation_id && act.disposition_code === 'Requests Callback' && act.next_action_date === today);
    const cbB = activityLogs.find(act => act.allocation_id === b.allocation_id && act.disposition_code === 'Requests Callback' && act.next_action_date === today);
    if (cbA && !cbB) return -1;
    if (!cbA && cbB) return 1;

    const brokenA = ptpRecords.find(p => p.allocation_id === a.allocation_id && p.ptp_status === 'Broken');
    const brokenB = ptpRecords.find(p => p.allocation_id === b.allocation_id && p.ptp_status === 'Broken');
    if (brokenA && !brokenB) return -1;
    if (!brokenA && brokenB) return 1;

    return b.pos_amount - a.pos_amount;
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const activeAccount = prioritySortedAllocations[currentIndex];

  const [contactMode, setContactMode] = useState<ContactMode>('Call');
  const [dispositionCode, setDispositionCode] = useState<DispositionCode>('PTP Taken');
  const [remarks, setRemarks] = useState('');
  const [nextActionDate, setNextActionDate] = useState(today);
  const [promisedAmount, setPromisedAmount] = useState('');
  const [promisedDate, setPromisedDate] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const contactableCodes: DispositionCode[] = [
    'PTP Taken',
    'Already Paid',
    'Partial Payment Promised',
    'Dispute Raised',
    'Refuses To Pay',
    'Requests Settlement',
    'Requests Callback',
  ];

  const nonContactableCodes: DispositionCode[] = [
    'Ringing No Answer',
    'Switched Off',
    'Number Invalid',
    'Number Busy',
    'Wrong Number',
    'Not Reachable',
  ];

  const otherCodes: DispositionCode[] = [
    'Third Party Contact',
    'Deceased',
    'Hospitalised',
    'Relocated',
    'Legal Notice Requested',
  ];

  const handleSaveDisposition = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!activeAccount) return;

    const isNonContactable = nonContactableCodes.includes(dispositionCode);
    if (!isNonContactable && !nextActionDate) {
      setFormError(`Disposition '${dispositionCode}' requires a Next Action Follow-up Date.`);
      return;
    }

    if (dispositionCode === 'PTP Taken') {
      if (!promisedAmount || Number(promisedAmount) <= 0) {
        setFormError('PTP Taken requires a valid Promised Amount.');
        return;
      }
      if (!promisedDate) {
        setFormError('PTP Taken requires a Promised Payment Date.');
        return;
      }
    }

    if (!remarks.trim()) {
      setFormError('Remarks are required for audit trail.');
      return;
    }

    captureDisposition(
      activeAccount.allocation_id,
      currentUser.agent_id,
      contactMode,
      dispositionCode,
      remarks,
      nextActionDate,
      promisedAmount ? Number(promisedAmount) : undefined,
      promisedDate || undefined
    );

    setFormSuccess(`Disposition '${dispositionCode}' captured successfully! Account updated.`);
    setRemarks('');
    setPromisedAmount('');
    setPromisedDate('');

    setTimeout(() => {
      setFormSuccess('');
      if (currentIndex < prioritySortedAllocations.length - 1) {
        setCurrentIndex(prev => prev + 1);
      }
    }, 1200);
  };

  const getPriorityLabel = (alloc: typeof activeAccount) => {
    if (!alloc) return null;
    const ptp = ptpRecords.find(p => p.allocation_id === alloc.allocation_id && p.promised_date === today && p.ptp_status === 'Open');
    if (ptp) return <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded border border-amber-300">P1: PTP Due Today</span>;

    const cb = activityLogs.find(act => act.allocation_id === alloc.allocation_id && act.disposition_code === 'Requests Callback' && act.next_action_date === today);
    if (cb) return <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-2.5 py-1 rounded border border-indigo-300">P2: Callback Due Today</span>;

    const broken = ptpRecords.find(p => p.allocation_id === alloc.allocation_id && p.ptp_status === 'Broken');
    if (broken) return <span className="bg-rose-100 text-rose-800 text-xs font-bold px-2.5 py-1 rounded border border-rose-300">P3: Broken PTP</span>;

    return <span className="bg-slate-100 text-slate-800 text-xs font-semibold px-2.5 py-1 rounded border border-slate-300">P4: POS Sorted</span>;
  };

  const accountActivities = activeAccount
    ? activityLogs.filter(act => act.allocation_id === activeAccount.allocation_id)
    : [];

  return (
    <div className="space-y-6">
      {/* Top Queue Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <PhoneCall className="w-5 h-5 text-emerald-400" />
            Agent Worklist • Priority Queue Mode
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            PRD Section 9.3: Priority Order (PTP Due Today → Callback Due Today → Broken PTP → POS Amount). Single-account focus.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex(prev => prev - 1)}
            className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white rounded-lg border border-slate-700 transition-colors"
            title="Previous Account"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono font-semibold px-3 py-1 bg-slate-800 border border-slate-700 rounded-lg">
            Account {prioritySortedAllocations.length > 0 ? currentIndex + 1 : 0} of {prioritySortedAllocations.length}
          </span>
          <button
            disabled={currentIndex >= prioritySortedAllocations.length - 1}
            onClick={() => setCurrentIndex(prev => prev + 1)}
            className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white rounded-lg border border-slate-700 transition-colors"
            title="Next Account"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!activeAccount ? (
        <div className="bg-white rounded-xl p-12 border border-gray-200 shadow-sm text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-900">Worklist Queue Cleared!</h3>
          <p className="text-sm text-gray-500 mt-1">There are no open pending allocations assigned to you in the priority queue.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="font-bold text-gray-900 text-lg">{activeAccount.borrower_name}</span>
                  {getPriorityLabel(activeAccount)}
                </div>
                <span className="text-xs font-mono bg-blue-50 text-blue-800 px-2.5 py-1 rounded font-bold border border-blue-200">
                  Loan ID: {activeAccount.loan_id}
                </span>
              </div>

              <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase">Masked Phone</div>
                  <div className="mt-1">
                    <PhoneMasker phone={activeAccount.borrower_phone} allocationId={activeAccount.allocation_id} />
                  </div>
                </div>

                <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase">Borrower City</div>
                  <div className="text-sm font-bold text-gray-900 mt-1">{activeAccount.borrower_city}</div>
                </div>

                <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase">DPD Bucket</div>
                  <div className="text-sm font-bold text-rose-600 mt-1">{activeAccount.dpd_bucket} ({activeAccount.dpd} Days)</div>
                </div>

                <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase">Total Due</div>
                  <div className="text-base font-extrabold text-emerald-700 mt-1">
                    ₹{activeAccount.total_due.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="font-bold text-gray-900 text-base mb-4 flex items-center gap-2">
                <PhoneCall className="w-5 h-5 text-blue-600" />
                Capture Borrower Disposition
              </h3>

              {formError && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              <form onSubmit={handleSaveDisposition} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Contact Mode</label>
                    <select
                      value={contactMode}
                      onChange={e => setContactMode(e.target.value as ContactMode)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="Call">Call</option>
                      <option value="SMS">SMS</option>
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="Email">Email</option>
                      <option value="In-Person">In-Person</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Disposition Code (PRD Fixed List)</label>
                    <select
                      value={dispositionCode}
                      onChange={e => setDispositionCode(e.target.value as DispositionCode)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-bold text-blue-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <optgroup label="Contactable (Requires Follow-up Date)">
                        {contactableCodes.map(code => (
                          <option key={code} value={code}>
                            {code}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Non Contactable">
                        {nonContactableCodes.map(code => (
                          <option key={code} value={code}>
                            {code}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Other Dispositions">
                        {otherCodes.map(code => (
                          <option key={code} value={code}>
                            {code}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                </div>

                {dispositionCode === 'PTP Taken' && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-emerald-900 mb-1">Promised Amount (₹)</label>
                      <input
                        type="number"
                        value={promisedAmount}
                        onChange={e => setPromisedAmount(e.target.value)}
                        placeholder={`e.g. ${activeAccount.emi_due_amount}`}
                        className="w-full border border-emerald-300 rounded-lg px-3 py-2 text-xs font-bold text-emerald-950 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-emerald-900 mb-1">Promised Payment Date</label>
                      <input
                        type="date"
                        value={promisedDate}
                        onChange={e => setPromisedDate(e.target.value)}
                        className="w-full border border-emerald-300 rounded-lg px-3 py-2 text-xs font-bold text-emerald-950 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {!nonContactableCodes.includes(dispositionCode) && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Next Follow-up Action Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={nextActionDate}
                      onChange={e => setNextActionDate(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Activity Remarks (Free Text)</label>
                  <textarea
                    rows={3}
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                    placeholder="Enter detailed call summary, borrower response, or commitment details..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-lg text-sm transition-all shadow-md flex items-center justify-center space-x-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Disposition & Advance Queue</span>
                </button>
              </form>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col h-full">
            <h3 className="font-bold text-gray-900 text-sm mb-4 flex items-center gap-2">
              <History className="w-4 h-4 text-purple-600" />
              Prior Activity Log History ({accountActivities.length})
            </h3>

            {accountActivities.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-xs">
                No previous activity logged for this account.
              </div>
            ) : (
              <div className="space-y-4 overflow-y-auto max-h-[500px] pr-2">
                {accountActivities.map(act => (
                  <div key={act.activity_id} className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-gray-900">
                      <span className="text-blue-700">{act.disposition_code}</span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-gray-700 font-medium">{act.remarks}</p>
                    <div className="flex items-center justify-between text-[10px] text-gray-500 pt-1 border-t border-gray-200">
                      <span>Agent: {act.agent_id}</span>
                      {act.next_action_date && <span>Next: {act.next_action_date}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
