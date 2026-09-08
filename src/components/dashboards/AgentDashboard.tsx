import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { PhoneCall, Calendar, CheckCircle2, TrendingUp, DollarSign, Clock, ArrowRight } from 'lucide-react';

interface AgentDashboardProps {
  onGoToWorklist: () => void;
}

export const AgentDashboard: React.FC<AgentDashboardProps> = ({ onGoToWorklist }) => {
  const { currentUser } = useAuth();
  const { allocations, activityLogs, ptpRecords, payments } = useData();

  const today = new Date().toISOString().split('T')[0];

  // My allocations
  const myAllocations = allocations.filter(a => a.assigned_agent_id === currentUser.agent_id);
  const totalAssigned = myAllocations.length;

  // Touched today
  const myActivitiesToday = activityLogs.filter(
    act => act.agent_id === currentUser.agent_id && act.timestamp.startsWith(today)
  );
  const touchedTodayCount = new Set(myActivitiesToday.map(act => act.allocation_id)).size;

  // Connected today (contactable disposition)
  const connectedTodayCount = myActivitiesToday.filter(
    act => !['Ringing No Answer', 'Switched Off', 'Number Invalid', 'Number Busy', 'Wrong Number', 'Not Reachable'].includes(act.disposition_code)
  ).length;

  // PTP Taken Today
  const ptpTakenToday = myActivitiesToday.filter(act => act.disposition_code === 'PTP Taken').length;

  // PTP Due Today
  const myPtps = ptpRecords.filter(p => p.agent_id === currentUser.agent_id);
  const ptpDueTodayCount = myPtps.filter(p => p.promised_date === today && p.ptp_status === 'Open').length;

  // PTP Kept %
  const totalCompletedPtps = myPtps.filter(p => p.ptp_status === 'Kept' || p.ptp_status === 'Broken').length;
  const keptPtps = myPtps.filter(p => p.ptp_status === 'Kept').length;
  const ptpKeptPercentage = totalCompletedPtps > 0 ? Math.round((keptPtps / totalCompletedPtps) * 100) : 100;

  // Collections credited to me this month
  const myAllocIds = new Set(myAllocations.map(a => a.allocation_id));
  const myPayments = payments.filter(p => {
    const alloc = allocations.find(a => a.client_id === p.client_id && a.loan_id.toUpperCase() === p.loan_id.toUpperCase());
    return alloc && myAllocIds.has(alloc.allocation_id);
  });
  const totalCreditedAmount = myPayments.reduce((sum, p) => sum + p.payment_amount, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-xl p-6 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Agent Workspace • {currentUser.name}</h2>
          <p className="text-blue-200 text-sm mt-1">
            Priority Queue active. All borrower interactions carry agent ID & timestamp for audit compliance.
          </p>
        </div>
        <button
          onClick={onGoToWorklist}
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2.5 rounded-lg shadow-lg hover:shadow-emerald-500/30 transition-all flex items-center space-x-2 text-sm"
        >
          <PhoneCall className="w-4 h-4" />
          <span>Launch Priority Worklist Queue</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
            <PhoneCall className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{totalAssigned}</div>
            <div className="text-xs text-gray-500 font-medium">Accounts Assigned</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{touchedTodayCount}</div>
            <div className="text-xs text-gray-500 font-medium">Touched Today</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{connectedTodayCount}</div>
            <div className="text-xs text-gray-500 font-medium">Connected Calls Today</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{ptpTakenToday}</div>
            <div className="text-xs text-gray-500 font-medium">PTP Taken Today</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: PTP Due Today */}
        <div className="bg-white p-6 rounded-xl border border-amber-200 shadow-sm bg-gradient-to-br from-white to-amber-50/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Action Required</span>
            <span className="p-1.5 bg-amber-100 text-amber-700 rounded-full">
              <Calendar className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl font-extrabold text-gray-900">{ptpDueTodayCount}</div>
          <div className="text-sm text-gray-600 mt-1 font-medium">PTP Promises Due Today</div>
          <p className="text-xs text-gray-500 mt-2">
            Follow up before 9 PM IST to keep promise rate high and avoid automatic flip to Broken.
          </p>
        </div>

        {/* Card 2: My PTP Kept Rate */}
        <div className="bg-white p-6 rounded-xl border border-blue-200 shadow-sm bg-gradient-to-br from-white to-blue-50/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Quality Score</span>
            <span className="p-1.5 bg-blue-100 text-blue-700 rounded-full">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl font-extrabold text-blue-700">{ptpKeptPercentage}%</div>
          <div className="text-sm text-gray-600 mt-1 font-medium">My PTP Kept Percentage</div>
          <p className="text-xs text-gray-500 mt-2">
            Automatically reconciled against bank payment files without manual Excel joins.
          </p>
        </div>

        {/* Card 3: Credited Collections */}
        <div className="bg-white p-6 rounded-xl border border-emerald-200 shadow-sm bg-gradient-to-br from-white to-emerald-50/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Monthly Revenue</span>
            <span className="p-1.5 bg-emerald-100 text-emerald-700 rounded-full">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl font-extrabold text-emerald-700">
            ₹{totalCreditedAmount.toLocaleString('en-IN')}
          </div>
          <div className="text-sm text-gray-600 mt-1 font-medium">Collections Credited to Me</div>
          <p className="text-xs text-gray-500 mt-2">
            Directly linked to payment ingestion from NBFC client settlement files.
          </p>
        </div>
      </div>
    </div>
  );
};
