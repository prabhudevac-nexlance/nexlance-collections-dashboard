import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Building2, Plus, CheckCircle2, XCircle } from 'lucide-react';
import type { Client } from '../types';

export const ClientsPage: React.FC = () => {
  const { clients, createClient } = useData();
  const [showModal, setShowModal] = useState(false);

  const [clientName, setClientName] = useState('');
  const [contractStart, setContractStart] = useState('2026-01-01');
  const [contractEnd, setContractEnd] = useState('2027-12-31');
  const [commission, setCommission] = useState('8.5% of collections');
  const [retentionDays, setRetentionDays] = useState(90);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) return;

    const newClient: Client = {
      client_id: `CLI_${clientName.toUpperCase().replace(/\s+/g, '_')}_${Math.floor(100 + Math.random() * 900)}`,
      client_name: clientName,
      contract_start: contractStart,
      contract_end: contractEnd,
      commission_structure: commission,
      data_retention_days: retentionDays,
      active_flag: true,
      header_template: ['loan_id', 'borrower_name', 'borrower_phone', 'borrower_city', 'dpd', 'pos_amount', 'emi_due_amount', 'total_due'],
    };

    createClient(newClient);
    setShowModal(false);
    setClientName('');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-white shadow-md flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-400" />
            Client Master & Contract Governance
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage NBFC clients, contract durations, commission rates, and automated retention purge windows.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2 rounded-lg shadow flex items-center space-x-2 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add New NBFC Client</span>
        </button>
      </div>

      {/* Clients Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-100 text-gray-600 uppercase font-semibold border-b border-gray-200">
            <tr>
              <th className="px-4 py-3">Client ID</th>
              <th className="px-4 py-3">Client Name</th>
              <th className="px-4 py-3">Contract Window</th>
              <th className="px-4 py-3">Commission Structure</th>
              <th className="px-4 py-3">Data Retention Window</th>
              <th className="px-4 py-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 font-medium">
            {clients.map(c => (
              <tr key={c.client_id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3.5 font-mono font-bold text-gray-800">{c.client_id}</td>
                <td className="px-4 py-3.5 font-bold text-gray-900">{c.client_name}</td>
                <td className="px-4 py-3.5 text-gray-600">
                  {c.contract_start} to {c.contract_end}
                </td>
                <td className="px-4 py-3.5 text-blue-700 font-bold">{c.commission_structure}</td>
                <td className="px-4 py-3.5 text-purple-700 font-semibold">{c.data_retention_days} Days Purge Window</td>
                <td className="px-4 py-3.5 text-right">
                  {c.active_flag ? (
                    <span className="inline-flex items-center space-x-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-300">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Active</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 bg-rose-100 text-rose-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-rose-300">
                      <XCircle className="w-3 h-3 text-rose-600" />
                      <span>Inactive</span>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 border-b border-gray-200 pb-3">Onboard New NBFC Client</h3>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Client Name</label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  placeholder="e.g. Hero Fincorp"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Contract Start</label>
                  <input
                    type="date"
                    value={contractStart}
                    onChange={e => setContractStart(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Contract End</label>
                  <input
                    type="date"
                    value={contractEnd}
                    onChange={e => setContractEnd(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-800 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Commission Structure</label>
                <input
                  type="text"
                  value={commission}
                  onChange={e => setCommission(e.target.value)}
                  placeholder="e.g. 8.5% flat"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Data Retention Window (Days)</label>
                <input
                  type="number"
                  value={retentionDays}
                  onChange={e => setRetentionDays(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-800 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-500 shadow"
                >
                  Create Client Master
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
