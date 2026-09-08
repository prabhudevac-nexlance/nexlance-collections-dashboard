import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Download, Building2, TrendingUp, PieChart as PieChartIcon } from 'lucide-react';
import { ResponsiveContainer, Tooltip, CartesianGrid, LineChart, Line, XAxis, YAxis } from 'recharts';
import Papa from 'papaparse';

export const FounderOpsDashboard: React.FC = () => {
  const { clients, allocations, activityLogs, ptpRecords, payments } = useData();
  const { addAuditLog, currentUser } = useAuth();

  const [selectedClientId, setSelectedClientId] = useState<string>('ALL');

  const filteredAllocations = selectedClientId === 'ALL'
    ? allocations
    : allocations.filter(a => a.client_id === selectedClientId);

  const totalAllocatedCount = filteredAllocations.length;
  const totalAllocatedValue = filteredAllocations.reduce((sum, a) => sum + a.total_due, 0);

  const touchedAllocIds = new Set(activityLogs.map(a => a.allocation_id));
  const touchedCount = filteredAllocations.filter(a => touchedAllocIds.has(a.allocation_id)).length;
  const touchRatePct = totalAllocatedCount > 0 ? Math.round((touchedCount / totalAllocatedCount) * 100) : 0;

  const totalCallAttempts = activityLogs.length;
  const connectedCalls = activityLogs.filter(
    a => !['Ringing No Answer', 'Switched Off', 'Number Invalid', 'Number Busy', 'Wrong Number', 'Not Reachable'].includes(a.disposition_code)
  ).length;
  const contactRatePct = totalCallAttempts > 0 ? Math.round((connectedCalls / totalCallAttempts) * 100) : 0;

  const totalCompletedPtps = ptpRecords.filter(p => p.ptp_status === 'Kept' || p.ptp_status === 'Broken').length;
  const keptPtps = ptpRecords.filter(p => p.ptp_status === 'Kept').length;
  const ptpKeptPct = totalCompletedPtps > 0 ? Math.round((keptPtps / totalCompletedPtps) * 100) : 100;

  const paidAllocations = filteredAllocations.filter(a => a.current_status === 'Paid' || a.current_status === 'Partially Paid');
  const resolutionRateCountPct = totalAllocatedCount > 0 ? Math.round((paidAllocations.length / totalAllocatedCount) * 100) : 0;

  const totalCollectedValue = payments.reduce((sum, p) => sum + p.payment_amount, 0);
  const resolutionRateValuePct = totalAllocatedValue > 0 ? Math.round((totalCollectedValue / totalAllocatedValue) * 100) : 0;

  const buckets: ('1-30 DPD' | '31-60 DPD' | '61-90 DPD' | '90+ DPD')[] = [
    '1-30 DPD',
    '31-60 DPD',
    '61-90 DPD',
    '90+ DPD',
  ];

  const bucketData = buckets.map(bucket => {
    const allocs = filteredAllocations.filter(a => a.dpd_bucket === bucket);
    const count = allocs.length;
    const value = allocs.reduce((sum, a) => sum + a.total_due, 0);
    const resolved = allocs.filter(a => a.current_status === 'Paid' || a.current_status === 'Partially Paid').length;
    const resolutionPct = count > 0 ? Math.round((resolved / count) * 100) : 0;

    return {
      bucket,
      count,
      value,
      resolved,
      resolutionPct,
    };
  });

  const collectionsTrend = [
    { date: 'Sep 01', amount: 45000 },
    { date: 'Sep 02', amount: 82000 },
    { date: 'Sep 03', amount: 120000 },
    { date: 'Sep 04', amount: 201000 },
    { date: 'Sep 05', amount: 95000 },
    { date: 'Sep 06', amount: 140000 },
    { date: 'Sep 07', amount: totalCollectedValue },
  ];

  const handleClientMISExport = () => {
    const exportClient = clients.find(c => c.client_id === selectedClientId) || clients[0];
    const exportAllocations = allocations.filter(a => a.client_id === exportClient.client_id);

    const exportData = exportAllocations.map(a => {
      const lastAct = activityLogs.find(act => act.allocation_id === a.allocation_id);
      return {
        'Client ID': a.client_id,
        'Loan ID': a.loan_id,
        'Borrower Name': a.borrower_name,
        'Borrower City': a.borrower_city,
        'DPD Bucket': a.dpd_bucket,
        'POS Amount': a.pos_amount,
        'Total Due': a.total_due,
        'Allocation Status': a.current_status,
        'Last Disposition Code': lastAct ? lastAct.disposition_code : 'No Activity',
        'Last Action Timestamp': a.last_action_at || 'N/A',
        'Assigned Agent ID': a.assigned_agent_id || 'Unassigned',
      };
    });

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Client_MIS_${exportClient.client_id}_Sep2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addAuditLog({
      user_id: currentUser.agent_id,
      action_type: 'LOGIN',
      entity: 'mis_export',
      entity_id: exportClient.client_id,
      new_value: `Generated 1-click Client MIS export for ${exportClient.client_name}`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-400" />
            Executive Oversight Dashboard • Founder & Ops View
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Section 11 Metric Definitions enforced in code. One-click client MIS return export ready.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={selectedClientId}
            onChange={e => setSelectedClientId(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white text-xs font-semibold rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="ALL">All Portfolio Clients</option>
            {clients.map(c => (
              <option key={c.client_id} value={c.client_id}>
                {c.client_name}
              </option>
            ))}
          </select>

          <button
            onClick={handleClientMISExport}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-md transition-all flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>1-Click Client MIS Export</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-[11px] text-gray-500 font-semibold uppercase">Total Allocated</div>
          <div className="text-xl font-bold text-gray-900 mt-1">{totalAllocatedCount}</div>
          <div className="text-[10px] text-gray-400 font-mono mt-1">
            ₹{totalAllocatedValue.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-[11px] text-gray-500 font-semibold uppercase">Touch Rate</div>
          <div className="text-xl font-bold text-indigo-700 mt-1">{touchRatePct}%</div>
          <div className="text-[10px] text-gray-400 mt-1">Distinct Accounts Touched</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-[11px] text-gray-500 font-semibold uppercase">Contact Rate</div>
          <div className="text-xl font-bold text-blue-700 mt-1">{contactRatePct}%</div>
          <div className="text-[10px] text-gray-400 mt-1">Connected / Call Attempts</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-[11px] text-gray-500 font-semibold uppercase">PTP Kept %</div>
          <div className="text-xl font-bold text-emerald-700 mt-1">{ptpKeptPct}%</div>
          <div className="text-[10px] text-gray-400 mt-1">Promised vs Received</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-[11px] text-gray-500 font-semibold uppercase">Resolution (Count)</div>
          <div className="text-xl font-bold text-purple-700 mt-1">{resolutionRateCountPct}%</div>
          <div className="text-[10px] text-gray-400 mt-1">Paid / Allocated Count</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-[11px] text-gray-500 font-semibold uppercase">Resolution (Value)</div>
          <div className="text-xl font-bold text-emerald-700 mt-1">{resolutionRateValuePct}%</div>
          <div className="text-[10px] text-gray-400 mt-1">Collected / Total Due</div>
        </div>
      </div>

      {/* DPD Bucket Resolution Table & Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <h3 className="font-bold text-gray-900 text-sm mb-3 flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 text-blue-600" />
            DPD Bucket Resolution Summary
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-100 text-gray-600 font-semibold border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2">DPD Bucket</th>
                  <th className="px-3 py-2">Allocated</th>
                  <th className="px-3 py-2">Total POS (₹)</th>
                  <th className="px-3 py-2">Resolved</th>
                  <th className="px-3 py-2 text-right">Resolution %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {bucketData.map(b => (
                  <tr key={b.bucket} className="hover:bg-gray-50 font-medium">
                    <td className="px-3 py-2.5 font-bold text-gray-900">{b.bucket}</td>
                    <td className="px-3 py-2.5 text-gray-700">{b.count}</td>
                    <td className="px-3 py-2.5 font-mono text-gray-700">₹{b.value.toLocaleString('en-IN')}</td>
                    <td className="px-3 py-2.5 text-emerald-700 font-semibold">{b.resolved}</td>
                    <td className="px-3 py-2.5 text-right font-bold text-blue-700">{b.resolutionPct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <h3 className="font-bold text-gray-900 text-sm mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            Daily Collections Trend (INR)
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={collectionsTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Collected']} />
                <Line type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
