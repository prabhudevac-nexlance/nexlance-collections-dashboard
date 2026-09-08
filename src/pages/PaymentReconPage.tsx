import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { FileCheck2, CheckCircle2, UploadCloud, AlertTriangle, Download } from 'lucide-react';
import Papa from 'papaparse';

export const PaymentReconPage: React.FC = () => {
  const { clients, payments, exceptions, ingestPaymentFile, resolveException, allocations } = useData();

  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.client_id || '');
  const [reconSummary, setReconSummary] = useState<{ matchedCount: number; exceptionCount: number; totalAmount: number } | null>(null);

  const downloadSamplePaidFile = () => {
    const sampleData = [
      {
        loan_id: 'KST-908123',
        payment_amount: 97500,
        payment_date: '2026-09-07',
        payment_mode: 'NEFT',
      },
      {
        loan_id: 'KST-908124',
        payment_amount: 52500,
        payment_date: '2026-09-07',
        payment_mode: 'UPI',
      },
      {
        loan_id: 'KST-UNKNOWN-888',
        payment_amount: 25000,
        payment_date: '2026-09-07',
        payment_mode: 'IMPS',
      },
    ];

    const csv = Papa.unparse(sampleData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Sample_Kissht_Daily_Paid_File.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePaidFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse<Record<string, any>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: results => {
        const parsed = results.data.map(row => ({
          loan_id: row.loan_id || row['Loan ID'] || '',
          payment_amount: Number(row.payment_amount || row['Payment Amount'] || row['Amount']) || 0,
          payment_date: row.payment_date || row['Payment Date'] || new Date().toISOString().split('T')[0],
          payment_mode: row.payment_mode || row['Mode'] || 'ONLINE',
        }));

        const res = ingestPaymentFile(selectedClientId, file.name, parsed);
        setReconSummary(res);
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-emerald-400" />
            Payment Ingestion & Automated Reconciliation Engine
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Section 9.4: Matches on client_id + loan_id (normalized uppercase). Unmatched records flow to Exception Queue.
          </p>
        </div>

        <button
          onClick={downloadSamplePaidFile}
          className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all flex items-center space-x-2 shadow"
        >
          <Download className="w-4 h-4 text-emerald-400" />
          <span>Download Sample Paid File</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
          <div className="border-b border-gray-200 pb-4">
            <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-emerald-600" />
              Upload Client Daily Paid File (CSV)
            </h3>
          </div>

          {reconSummary && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-2">
              <div className="font-bold text-sm flex items-center gap-2 text-emerald-800">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Reconciliation Completed Successfully!</span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-emerald-200 font-medium">
                <div>Matched Allocations: <strong>{reconSummary.matchedCount}</strong></div>
                <div>Exception Queue: <strong className="text-rose-700">{reconSummary.exceptionCount}</strong></div>
                <div>Total Recovered: <strong>₹{reconSummary.totalAmount.toLocaleString('en-IN')}</strong></div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Select Client</label>
            <select
              value={selectedClientId}
              onChange={e => setSelectedClientId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none"
            >
              {clients.map(c => (
                <option key={c.client_id} value={c.client_id}>
                  {c.client_name}
                </option>
              ))}
            </select>
          </div>

          <div className="border-2 border-dashed border-gray-300 hover:border-emerald-500 rounded-xl p-8 text-center transition-colors bg-gray-50/50">
            <UploadCloud className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <div className="text-sm font-bold text-gray-800">Choose Daily Payment CSV</div>
            <p className="text-xs text-gray-500 mt-1">Normalizes loan_id whitespace/case. Flips status to Paid & marks open PTP as Kept.</p>
            <input
              type="file"
              accept=".csv"
              onChange={handlePaidFileUpload}
              className="mt-4 text-xs text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 cursor-pointer"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="font-bold text-gray-900 text-sm mb-4">Reconciled Payment Stream ({payments.length})</h3>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
            {payments.map(p => (
              <div key={p.payment_id} className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-lg text-xs space-y-1">
                <div className="font-bold text-emerald-950 flex items-center justify-between">
                  <span>Loan: {p.loan_id}</span>
                  <span className="font-mono text-emerald-700">₹{p.payment_amount.toLocaleString('en-IN')}</span>
                </div>
                <div className="text-gray-600 font-medium">{p.payment_mode} • {p.payment_date}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-rose-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-rose-200 bg-rose-50 flex items-center justify-between">
          <h3 className="font-bold text-rose-950 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            Unmatched Payment Exception Queue ({exceptions.length} Pending)
          </h3>
          <span className="text-[11px] text-rose-700 font-medium">Never silently dropped • Manual review required</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-100 text-gray-600 font-semibold border-b border-gray-200">
              <tr>
                <th className="px-4 py-3">Exception ID</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Unmatched Loan ID</th>
                <th className="px-4 py-3">Amount (₹)</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 font-medium">
              {exceptions.map(exc => (
                <tr key={exc.exception_id} className="hover:bg-rose-50/40">
                  <td className="px-4 py-3 font-mono font-bold text-gray-800">{exc.exception_id}</td>
                  <td className="px-4 py-3 text-gray-700">{exc.client_id}</td>
                  <td className="px-4 py-3 font-mono font-bold text-rose-700">{exc.loan_id}</td>
                  <td className="px-4 py-3 font-mono font-bold text-emerald-700">₹{exc.payment_amount.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-gray-600">{exc.payment_date}</td>
                  <td className="px-4 py-3 text-gray-700 max-w-xs">{exc.reason}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => resolveException(exc.exception_id, 'MATCH_MANUALLY', allocations[0]?.allocation_id)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-1 rounded shadow"
                    >
                      Force Match
                    </button>
                    <button
                      onClick={() => resolveException(exc.exception_id, 'REJECT')}
                      className="bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold px-2.5 py-1 rounded shadow"
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
