import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, UserPlus, Lock, Unlock, UserX, CheckCircle2 } from 'lucide-react';
import type { UserRole } from '../types';

export const UsersPage: React.FC = () => {
  const { users, currentUser, disableUser, unlockUser, createUser } = useAuth();
  const [showModal, setShowModal] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('AGENT');
  const [teamLeaderId, setTeamLeaderId] = useState('');

  const teamLeaders = users.filter(u => u.role === 'TEAM_LEADER');

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    createUser(
      {
        name,
        email,
        role,
        team_leader_id: role === 'AGENT' ? teamLeaderId : undefined,
        client_ids_assigned: ['CLI_KISSHT', 'CLI_HDFC'],
        doj: new Date().toISOString().split('T')[0],
        active_flag: true,
      },
      currentUser.agent_id
    );

    setShowModal(false);
    setName('');
    setEmail('');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-white shadow-md flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            User & Access Management • Section 6 Security Compliance
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Application-owned identity. Single-click disablement immediately terminates active sessions and logs to audit trail.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-lg shadow flex items-center space-x-2 transition-all"
        >
          <UserPlus className="w-4 h-4" />
          <span>Provision New User</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-100 text-gray-600 uppercase font-semibold border-b border-gray-200">
            <tr>
              <th className="px-4 py-3">Agent / User ID</th>
              <th className="px-4 py-3">Full Name & Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Team Leader</th>
              <th className="px-4 py-3">2FA & Auth Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 font-medium">
            {users.map(u => (
              <tr key={u.agent_id} className={`hover:bg-gray-50 transition-colors ${!u.active_flag ? 'bg-rose-50/40 opacity-75' : ''}`}>
                <td className="px-4 py-3.5 font-mono font-bold text-gray-800">{u.agent_id}</td>
                <td className="px-4 py-3.5">
                  <div className="font-bold text-gray-900">{u.name}</div>
                  <div className="text-[10px] text-gray-400 font-mono">{u.email}</div>
                </td>
                <td className="px-4 py-3.5">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      u.role === 'FOUNDER'
                        ? 'bg-purple-100 text-purple-800 border border-purple-300'
                        : u.role === 'OPS_MANAGER'
                        ? 'bg-blue-100 text-blue-800 border border-blue-300'
                        : u.role === 'TEAM_LEADER'
                        ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                        : u.role === 'AUDITOR'
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    }`}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-gray-600 font-mono">
                  {u.team_leader_id || '-'}
                </td>
                <td className="px-4 py-3.5">
                  {u.is_locked ? (
                    <span className="inline-flex items-center space-x-1 bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow animate-pulse">
                      <Lock className="w-3 h-3" />
                      <span>Account Locked (5 Failures)</span>
                    </span>
                  ) : u.first_login ? (
                    <span className="inline-flex items-center space-x-1 bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-300">
                      <span>Password Reset Required</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-300">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>TOTP 2FA Active</span>
                    </span>
                  )}
                </td>
                <td className="px-4 py-3.5 text-right space-x-2">
                  {u.is_locked && (
                    <button
                      onClick={() => unlockUser(u.agent_id, currentUser.agent_id)}
                      className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] px-2.5 py-1 rounded shadow inline-flex items-center space-x-1"
                    >
                      <Unlock className="w-3 h-3" />
                      <span>Unlock</span>
                    </button>
                  )}

                  {u.active_flag ? (
                    <button
                      onClick={() => disableUser(u.agent_id, currentUser.agent_id)}
                      className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] px-2.5 py-1 rounded shadow inline-flex items-center space-x-1"
                      title="Single-Click Disable (Immediately kills active sessions)"
                    >
                      <UserX className="w-3 h-3" />
                      <span>1-Click Disable</span>
                    </button>
                  ) : (
                    <span className="text-[10px] text-rose-600 font-bold uppercase">Disabled (Preserved in Log)</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 border-b border-gray-200 pb-3">Provision New Application User</h3>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Registered Contact Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="ramesh@nexlance.in"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-800 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Assigned Role</label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value as UserRole)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none"
                  >
                    <option value="AGENT">Agent</option>
                    <option value="TEAM_LEADER">Team Leader</option>
                    <option value="OPS_MANAGER">Ops Manager</option>
                    <option value="AUDITOR">Auditor</option>
                    <option value="FOUNDER">Founder</option>
                  </select>
                </div>

                {role === 'AGENT' && (
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Assign Team Leader</label>
                    <select
                      value={teamLeaderId}
                      onChange={e => setTeamLeaderId(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-800 focus:outline-none"
                    >
                      <option value="">Select Team Leader</option>
                      {teamLeaders.map(tl => (
                        <option key={tl.agent_id} value={tl.agent_id}>
                          {tl.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-900">
                <strong>PRD Rule:</strong> User will receive initial credentials and be forced to set a 12+ character password and configure TOTP 2FA on first login.
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
                  className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-500 shadow"
                >
                  Provision User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
