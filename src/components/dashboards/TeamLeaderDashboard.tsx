import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Users, AlertTriangle, CheckCircle, ArrowUpDown } from 'lucide-react';

interface TeamLeaderDashboardProps {
  onGoToAllocation: () => void;
}

export const TeamLeaderDashboard: React.FC<TeamLeaderDashboardProps> = ({ onGoToAllocation }) => {
  const { currentUser, users } = useAuth();
  const { allocations, activityLogs, ptpRecords, payments } = useData();

  const today = new Date().toISOString().split('T')[0];

  const teamAgents = users.filter(u => {
    if (u.role !== 'AGENT') return false;
    if (currentUser.role === 'TEAM_LEADER') {
      return u.team_leader_id === currentUser.agent_id;
    }
    return true;
  });

  const agentStats = teamAgents.map(agent => {
    const myAllocations = allocations.filter(a => a.assigned_agent_id === agent.agent_id);
    const assignedCount = myAllocations.length;

    const myActivitiesToday = activityLogs.filter(
      act => act.agent_id === agent.agent_id && act.timestamp.startsWith(today)
    );
    const touchedTodayCount = new Set(myActivitiesToday.map(act => act.allocation_id)).size;

    const connectedToday = myActivitiesToday.filter(
      act => !['Ringing No Answer', 'Switched Off', 'Number Invalid', 'Number Busy', 'Wrong Number', 'Not Reachable'].includes(act.disposition_code)
    ).length;

    const ptpTakenToday = myActivitiesToday.filter(act => act.disposition_code === 'PTP Taken').length;

    const myPtps = ptpRecords.filter(p => p.agent_id === agent.agent_id);
    const ptpDueToday = myPtps.filter(p => p.promised_date === today && p.ptp_status === 'Open').length;

    const totalCompletedPtps = myPtps.filter(p => p.ptp_status === 'Kept' || p.ptp_status === 'Broken').length;
    const keptPtps = myPtps.filter(p => p.ptp_status === 'Kept').length;
    const ptpKeptPct = totalCompletedPtps > 0 ? Math.round((keptPtps / totalCompletedPtps) * 100) : 100;

    const myAllocIds = new Set(myAllocations.map(a => a.allocation_id));
    const myPayments = payments.filter(p => {
      const alloc = allocations.find(a => a.client_id === p.client_id && a.loan_id.toUpperCase() === p.loan_id.toUpperCase());
      return alloc && myAllocIds.has(alloc.allocation_id);
    });
    const collectionsCredited = myPayments.reduce((sum, p) => sum + p.payment_amount, 0);

    const isZeroActivity = touchedTodayCount === 0;

    return {
      agent,
      assignedCount,
      touchedTodayCount,
      connectedToday,
      ptpTakenToday,
      ptpDueToday,
      ptpKeptPct,
      collectionsCredited,
      isZeroActivity,
    };
  });

  const totalAssigned = agentStats.reduce((sum, a) => sum + a.assignedCount, 0);
  const totalTouchedToday = agentStats.reduce((sum, a) => sum + a.touchedTodayCount, 0);
  const totalPtpTakenToday = agentStats.reduce((sum, a) => sum + a.ptpTakenToday, 0);
  const zeroActivityAgentsCount = agentStats.filter(a => a.isZeroActivity).length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            Team Leader Oversight • {currentUser.name}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time agent productivity dashboard. Accounts can be reassigned within team with mandatory audit logging.
          </p>
        </div>
        <button
          onClick={onGoToAllocation}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all shadow flex items-center space-x-2"
        >
          <ArrowUpDown className="w-4 h-4" />
          <span>Reassign Team Allocations</span>
        </button>
      </div>

      {/* Team Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-xs text-gray-500 font-semibold uppercase">Team Agents</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{teamAgents.length}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-xs text-gray-500 font-semibold uppercase">Total Assigned</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{totalAssigned}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-xs text-gray-500 font-semibold uppercase">Touched Today</div>
          <div className="text-2xl font-bold text-indigo-600 mt-1">{totalTouchedToday}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-xs text-gray-500 font-semibold uppercase">PTP Taken Today</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{totalPtpTakenToday}</div>
        </div>

        {/* PRD Section 10 Highlight: Zero Activity Agents in RED */}
        <div className={`p-4 rounded-xl border shadow-sm ${zeroActivityAgentsCount > 0 ? 'bg-rose-50 border-rose-300' : 'bg-white border-gray-200'}`}>
          <div className="text-xs font-semibold uppercase text-rose-700 flex items-center justify-between">
            <span>Zero Activity Today</span>
            {zeroActivityAgentsCount > 0 && <AlertTriangle className="w-4 h-4 text-rose-600 animate-pulse" />}
          </div>
          <div className={`text-2xl font-bold mt-1 ${zeroActivityAgentsCount > 0 ? 'text-rose-700 font-extrabold' : 'text-gray-900'}`}>
            {zeroActivityAgentsCount} Agents
          </div>
        </div>
      </div>

      {/* Per Agent Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <h3 className="font-bold text-gray-900 text-sm">Agent Activity & Performance Breakdown</h3>
          <span className="text-xs text-gray-500">Auto-refreshed from disposition activity logs</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-100 text-gray-600 uppercase font-semibold border-b border-gray-200">
              <tr>
                <th className="px-4 py-3">Agent Name</th>
                <th className="px-4 py-3">Assigned</th>
                <th className="px-4 py-3">Touched Today</th>
                <th className="px-4 py-3">Connected Today</th>
                <th className="px-4 py-3">PTP Taken Today</th>
                <th className="px-4 py-3">PTP Due Today</th>
                <th className="px-4 py-3">PTP Kept %</th>
                <th className="px-4 py-3">Collections Credited</th>
                <th className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 font-medium">
              {agentStats.map(stat => (
                <tr
                  key={stat.agent.agent_id}
                  className={`hover:bg-gray-50 transition-colors ${
                    stat.isZeroActivity ? 'bg-rose-50/70 border-l-4 border-rose-500' : ''
                  }`}
                >
                  <td className="px-4 py-3.5 font-bold text-gray-900 flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-full bg-slate-800 text-white text-xs font-bold flex items-center justify-center">
                      {stat.agent.name.charAt(0)}
                    </div>
                    <div>
                      <div>{stat.agent.name}</div>
                      <div className="text-[10px] text-gray-400 font-mono">{stat.agent.email}</div>
                    </div>
                  </td>

                  <td className="px-4 py-3.5 text-gray-700 font-semibold">{stat.assignedCount}</td>
                  <td className="px-4 py-3.5 text-indigo-700 font-bold">{stat.touchedTodayCount}</td>
                  <td className="px-4 py-3.5 text-gray-700">{stat.connectedToday}</td>
                  <td className="px-4 py-3.5 text-purple-700 font-semibold">{stat.ptpTakenToday}</td>
                  <td className="px-4 py-3.5 text-amber-700 font-semibold">{stat.ptpDueToday}</td>

                  <td className="px-4 py-3.5">
                    <span className="font-bold text-blue-700">{stat.ptpKeptPct}%</span>
                  </td>

                  <td className="px-4 py-3.5 text-emerald-700 font-bold">
                    ₹{stat.collectionsCredited.toLocaleString('en-IN')}
                  </td>

                  <td className="px-4 py-3.5 text-right">
                    {stat.isZeroActivity ? (
                      <span className="inline-flex items-center space-x-1 bg-rose-600 text-white font-bold text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider animate-pulse shadow">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Zero Activity Today</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 bg-emerald-100 text-emerald-800 font-medium text-[10px] px-2.5 py-1 rounded-full border border-emerald-300">
                        <CheckCircle className="w-3 h-3 text-emerald-600" />
                        <span>Active ({stat.touchedTodayCount} calls)</span>
                      </span>
                    )}
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
