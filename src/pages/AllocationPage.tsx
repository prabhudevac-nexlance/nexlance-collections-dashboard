import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { UploadCloud, Users, Filter, CheckCircle2, AlertTriangle, FileSpreadsheet, ArrowRight, Download } from 'lucide-react';
import Papa from 'papaparse';
import type { Allocation } from '../types';

export const AllocationPage: React.FC = () => {
  const { clients, batches, allocations, uploadAllocationBatch, assignRoundRobin, assignBulkByFilter } = useData();
  const { users } = useAuth();

  const [activeSubTab, setActiveSubTab] = useState<'UPLOAD' | 'ROUND_ROBIN' | 'BULK_FILTER'>('UPLOAD');

  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.client_id || '');
  const [monthTag, setMonthTag] = useState('2026-09');
  const [uploadStatus, setUploadStatus] = useState<{ success?: boolean; message?: string; errors?: string[] } | null>(null);

  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);

  const [filterDpdBucket, setFilterDpdBucket] = useState<string>('');
  const [filterCity, setFilterCity] = useState<string>('');
  const [targetAgentId, setTargetAgentId] = useState<string>('');
  const [bulkAssignMessage, setBulkAssignMessage] = useState<string>('');

  const agents = users.filter(u => u.role === 'AGENT' && u.active_flag);
  const unassignedAllocations = allocations.filter(a => a.current_status === 'Unassigned');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse<Partial<Allocation>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const res = uploadAllocationBatch(selectedClientId, file.name, results.data, monthTag);
        if (res.success) {
          setUploadStatus({
            success: true,
            message: `Batch successfully created! Ingested ${res.count} allocations into Unassigned queue.`,
            errors: res.errors,
          });
        } else {
          setUploadStatus({
            success: false,
            message: 'Batch allocation failed header validation or deduplication checks.',
            errors: res.errors,
          });
        }
      },
    });
  };

  const downloadSampleAllocationCsv = () => {
    const sampleData = [
      {
        loan_id: `KST-${Math.floor(100000 + Math.random() * 900000)}`,
        borrower_name: 'Rahul Sharma',
        borrower_phone: '9812345678',
        borrower_city: 'Delhi',
        dpd: 42,
        pos_amount: 95000,
        emi_due_amount: 12000,
        total_due: 107000,
      },
      {
        loan_id: `KST-${Math.floor(100000 + Math.random() * 900000)}`,
        borrower_name: 'Pooja Hegde',
        borrower_phone: '9988776655',
        borrower_city: 'Mumbai',
        dpd: 78,
        pos_amount: 145000,
        emi_due_amount: 18000,
        total_due: 163000,
      },
    ];

    const csv = Papa.unparse(sampleData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Sample_Kissht_Allocation.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExecuteRoundRobin = () => {
    if (selectedAgentIds.length === 0) {
      alert('Please select at least 1 active agent for distribution.');
      return;
    }
    const unassignedIds = unassignedAllocations.map(a => a.allocation_id);
    if (unassignedIds.length === 0) {
      alert('No unassigned allocations available to distribute.');
      return;
    }

    assignRoundRobin(unassignedIds, selectedAgentIds);
    alert(`Successfully distributed ${unassignedIds.length} accounts across ${selectedAgentIds.length} agents!`);
  };

  const handleExecuteBulkAssign = () => {
    if (!targetAgentId) {
      alert('Please select a target agent for assignment.');
      return;
    }

    const count = assignBulkByFilter(
      {
        clientId: selectedClientId || undefined,
        dpdBucket: filterDpdBucket || undefined,
        city: filterCity || undefined,
      },
      targetAgentId
    );

    setBulkAssignMessage(`Successfully assigned ${count} matching accounts to agent.`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-blue-400" />
            Allocation Batch Upload & Assignment Engine
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Section 9.1 & 9.2: Template validation, row-level error reporting, deduplication, Round Robin & Filter-based Assignment.
          </p>
        </div>

        <div className="flex items-center space-x-1 bg-slate-800 p-1 rounded-lg border border-slate-700">
          <button
            onClick={() => setActiveSubTab('UPLOAD')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeSubTab === 'UPLOAD' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            1. Upload Batch
          </button>
          <button
            onClick={() => setActiveSubTab('ROUND_ROBIN')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeSubTab === 'ROUND_ROBIN' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            2. Round Robin
          </button>
          <button
            onClick={() => setActiveSubTab('BULK_FILTER')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeSubTab === 'BULK_FILTER' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            3. Manual Bulk Filter
          </button>
        </div>
      </div>

      {activeSubTab === 'UPLOAD' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                Upload Client Delinquent Allocation File (CSV)
              </h3>
              <button
                onClick={downloadSampleAllocationCsv}
                className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 border border-blue-200 bg-blue-50 px-2.5 py-1 rounded"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Sample CSV Template</span>
              </button>
            </div>

            {uploadStatus && (
              <div
                className={`p-4 rounded-xl border text-xs space-y-2 ${
                  uploadStatus.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                <div className="font-bold flex items-center gap-2 text-sm">
                  {uploadStatus.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
                  <span>{uploadStatus.message}</span>
                </div>
                {uploadStatus.errors && uploadStatus.errors.length > 0 && (
                  <div className="mt-2 space-y-1 bg-white/80 p-3 rounded-lg border border-gray-200 max-h-40 overflow-y-auto font-mono text-[11px]">
                    <div className="font-bold text-gray-700">Validation / Deduplication Log:</div>
                    {uploadStatus.errors.map((err, idx) => (
                      <div key={idx} className="text-rose-700">• {err}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Select NBFC Client</label>
                <select
                  value={selectedClientId}
                  onChange={e => setSelectedClientId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {clients.map(c => (
                    <option key={c.client_id} value={c.client_id}>
                      {c.client_name} ({c.header_template.length} Template Headers Required)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Month Tag</label>
                <input
                  type="month"
                  value={monthTag}
                  onChange={e => setMonthTag(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="border-2 border-dashed border-gray-300 hover:border-blue-500 rounded-xl p-8 text-center transition-colors bg-gray-50/50">
              <UploadCloud className="w-10 h-10 text-blue-500 mx-auto mb-2" />
              <div className="text-sm font-bold text-gray-800">Choose CSV File to Upload & Validate</div>
              <p className="text-xs text-gray-500 mt-1">Headers validated against client template schema. Row errors generated if invalid.</p>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="mt-4 text-xs text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="font-bold text-gray-900 text-sm mb-4">Ingested Batches History ({batches.length})</h3>
            <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
              {batches.map(b => {
                const client = clients.find(c => c.client_id === b.client_id);
                return (
                  <div key={b.batch_id} className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs space-y-1">
                    <div className="font-bold text-gray-900 flex items-center justify-between">
                      <span>{b.file_name}</span>
                      <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded font-mono">{b.month_tag}</span>
                    </div>
                    <div className="text-gray-600 font-medium">{client?.client_name}</div>
                    <div className="flex items-center justify-between text-gray-400 font-mono text-[10px] pt-1 border-t border-gray-200">
                      <span>Records: {b.record_count}</span>
                      <span>{new Date(b.uploaded_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'ROUND_ROBIN' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-200 pb-4">
            <div>
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                Round Robin Automated Distribution
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Currently <strong>{unassignedAllocations.length}</strong> unassigned accounts available in queue.
              </p>
            </div>
            <button
              onClick={handleExecuteRoundRobin}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 py-2.5 rounded-lg shadow transition-all flex items-center space-x-2"
            >
              <span>Execute Round Robin Distribution</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">Select Active Agents for Round Robin Pool:</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {agents.map(ag => {
                const isSelected = selectedAgentIds.includes(ag.agent_id);
                return (
                  <div
                    key={ag.agent_id}
                    onClick={() => {
                      if (isSelected) setSelectedAgentIds(prev => prev.filter(id => id !== ag.agent_id));
                      else setSelectedAgentIds(prev => [...prev, ag.agent_id]);
                    }}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected ? 'bg-indigo-50 border-indigo-500 shadow-sm' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs text-gray-900">{ag.name}</div>
                      <div className="text-[10px] text-gray-500 font-mono">{ag.email}</div>
                    </div>
                    <input type="checkbox" checked={isSelected} readOnly className="w-4 h-4 text-indigo-600 rounded" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'BULK_FILTER' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
          <div className="border-b border-gray-200 pb-4">
            <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
              <Filter className="w-5 h-5 text-purple-600" />
              Manual Bulk Assignment by Filter Criteria
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Filter unassigned accounts by DPD Bucket, City, or Client, and assign in bulk to a specific agent.
            </p>
          </div>

          {bulkAssignMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{bulkAssignMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Filter DPD Bucket</label>
              <select
                value={filterDpdBucket}
                onChange={e => setFilterDpdBucket(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-semibold text-gray-800 focus:outline-none"
              >
                <option value="">All Buckets</option>
                <option value="1-30 DPD">1-30 DPD</option>
                <option value="31-60 DPD">31-60 DPD</option>
                <option value="61-90 DPD">61-90 DPD</option>
                <option value="90+ DPD">90+ DPD</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Filter City</label>
              <input
                type="text"
                value={filterCity}
                onChange={e => setFilterCity(e.target.value)}
                placeholder="e.g. Delhi, Mumbai"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-800 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Target Agent</label>
              <select
                value={targetAgentId}
                onChange={e => setTargetAgentId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none"
              >
                <option value="">Select Target Agent</option>
                {agents.map(ag => (
                  <option key={ag.agent_id} value={ag.agent_id}>
                    {ag.name} ({ag.email})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleExecuteBulkAssign}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 rounded-lg text-xs transition-all shadow flex items-center justify-center space-x-2"
          >
            <span>Execute Manual Bulk Assignment</span>
          </button>
        </div>
      )}
    </div>
  );
};
