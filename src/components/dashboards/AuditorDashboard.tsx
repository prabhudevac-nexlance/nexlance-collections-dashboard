import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, Search, Filter, Lock, Download } from 'lucide-react';
import Papa from 'papaparse';

export const AuditorDashboard: React.FC = () => {
  const { auditLogs, users } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState<string>('ALL');

  const filteredLogs = auditLogs.filter(log => {
    if (filterAction !== 'ALL' && log.action_type !== filterAction) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      log.log_id.toLowerCase().includes(term) ||
      log.user_id.toLowerCase().includes(term) ||
      log.action_type.toLowerCase().includes(term) ||
      log.entity.toLowerCase().includes(term) ||
      log.entity_id.toLowerCase().includes(term) ||
      (log.new_value && log.new_value.toLowerCase().includes(term))
    );
  });

  const handleExportAuditLogs = () => {
    const csv = Papa.unparse(filteredLogs);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Nexlance_Audit_Trail_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            Audit & Compliance Console • Read-Only Review
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Section 12 Non-Functional Requirement: Audit log is immutable. No delete permission exists for any role including Founder.
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-amber-950/60 border border-amber-800 px-3 py-1.5 rounded-lg text-amber-300 text-xs">
          <Lock className="w-4 h-4 text-amber-400" />
          <span>Read-Only Privileges Active</span>
        </div>
      </div>

      {/* Filter and Export Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by Log ID, User, Entity..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={filterAction}
              onChange={e => setFilterAction(e.target.value)}
              className="border border-gray-300 rounded-lg text-xs font-semibold px-3 py-2 text-gray-700 focus:outline-none"
            >
              <option value="ALL">All Action Types</option>
              <option value="LOGIN">LOGIN</option>
              <option value="REVEAL_PHONE">REVEAL_PHONE</option>
              <option value="DISABLE_USER">DISABLE_USER</option>
              <option value="REASSIGN_ACCOUNT">REASSIGN_ACCOUNT</option>
              <option value="DISPOSITION_CAPTURED">DISPOSITION_CAPTURED</option>
              <option value="PTP_CREATED">PTP_CREATED</option>
              <option value="BATCH_UPLOADED">BATCH_UPLOADED</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleExportAuditLogs}
          className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-4 py-2 rounded-lg shadow transition-all flex items-center space-x-2"
        >
          <Download className="w-4 h-4" />
          <span>Export Immutable Log CSV</span>
        </button>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-sm">System Evidentiary Log Trail ({filteredLogs.length} Records)</h3>
          <span className="text-[11px] text-gray-500 font-mono">Enforced per PRD Section 6 Item 5</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-100 text-gray-600 uppercase font-semibold border-b border-gray-200">
              <tr>
                <th className="px-4 py-3">Timestamp (UTC)</th>
                <th className="px-4 py-3">Log ID</th>
                <th className="px-4 py-3">Actor / User ID</th>
                <th className="px-4 py-3">Action Type</th>
                <th className="px-4 py-3">Target Entity</th>
                <th className="px-4 py-3">Audit Details / Values</th>
                <th className="px-4 py-3 text-right">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 font-medium">
              {filteredLogs.map(log => {
                const user = users.find(u => u.agent_id === log.user_id);
                return (
                  <tr key={log.log_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 font-mono text-[11px]">
                      {new Date(log.timestamp).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-gray-800">{log.log_id}</td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-gray-900">{user ? user.name : log.user_id}</div>
                      <div className="text-[10px] text-gray-400 font-mono">{log.user_id}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.action_type === 'REVEAL_PHONE'
                            ? 'bg-purple-100 text-purple-800 border border-purple-300'
                            : log.action_type === 'DISABLE_USER'
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : log.action_type === 'REASSIGN_ACCOUNT'
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : 'bg-gray-100 text-gray-800 border border-gray-300'
                        }`}
                      >
                        {log.action_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 font-mono">
                      {log.entity} ({log.entity_id})
                    </td>
                    <td className="px-4 py-3 text-gray-800 max-w-xs truncate" title={log.new_value}>
                      {log.old_value && <span className="line-through text-gray-400 mr-1">{log.old_value} → </span>}
                      <span>{log.new_value || '-'}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-500">{log.ip_address}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
