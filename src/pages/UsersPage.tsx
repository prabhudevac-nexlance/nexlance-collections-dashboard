import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  UserPlus,
  Lock,
  Unlock,
  UserX,
  UserCheck,
  CheckCircle2,
  Search,
  Filter,
  ShieldAlert,
  Edit3,
  X,
  Loader2,
  AlertCircle,
  Crown,
  Briefcase,
  UserCheck2,
  Headphones,
  Eye,
} from 'lucide-react';
import type { User, UserRole } from '../types';

export const UsersPage: React.FC = () => {
  const { users, currentUser, disableUser, enableUser, unlockUser, createUser, updateUser } = useAuth();

  // Admin access check (Only Founders & Ops Managers can manage users)
  const isAdmin = currentUser.role === 'FOUNDER' || currentUser.role === 'OPS_MANAGER';

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form Fields
  const [userId, setUserId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('AGENT');
  const [teamLeaderId, setTeamLeaderId] = useState('');
  const [activeFlag, setActiveFlag] = useState(true);

  // Feedback & Loading
  const [loading, setLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Available Team Leaders / Supervisors (Founders, Ops Managers, Team Leaders)
  const supervisorOptions = useMemo(() => {
    return users.filter(u => u.active_flag && (u.role === 'TEAM_LEADER' || u.role === 'OPS_MANAGER' || u.role === 'FOUNDER'));
  }, [users]);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: users.length,
      active: users.filter(u => u.active_flag).length,
      disabled: users.filter(u => !u.active_flag).length,
      locked: users.filter(u => u.is_locked).length,
      founders: users.filter(u => u.role === 'FOUNDER').length,
      opsManagers: users.filter(u => u.role === 'OPS_MANAGER').length,
      teamLeaders: users.filter(u => u.role === 'TEAM_LEADER').length,
      agents: users.filter(u => u.role === 'AGENT').length,
      auditors: users.filter(u => u.role === 'AUDITOR').length,
    };
  }, [users]);

  // Filtered User List
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch =
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.agent_id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRole = selectedRole === 'ALL' || u.role === selectedRole;

      let matchesStatus = true;
      if (selectedStatus === 'ACTIVE') matchesStatus = u.active_flag && !u.is_locked;
      if (selectedStatus === 'INACTIVE') matchesStatus = !u.active_flag;
      if (selectedStatus === 'LOCKED') matchesStatus = u.is_locked === true;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchTerm, selectedRole, selectedStatus]);

  // Open Modal for New User
  const handleOpenAddModal = () => {
    setEditingUser(null);
    const newId = `USR_${Math.floor(1000 + Math.random() * 9000)}`;
    setUserId(newId);
    setName('');
    setEmail('');
    setRole('AGENT');
    setTeamLeaderId(supervisorOptions.length > 0 ? supervisorOptions[0].agent_id : '');
    setActiveFlag(true);
    setShowModal(true);
  };

  // Open Modal for Edit User
  const handleOpenEditModal = (u: User) => {
    setEditingUser(u);
    setUserId(u.agent_id);
    setName(u.name);
    setEmail(u.email);
    setRole(u.role);
    setTeamLeaderId(u.team_leader_id || '');
    setActiveFlag(u.active_flag);
    setShowModal(true);
  };

  // Auto update generated ID pattern based on selected role when creating
  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    if (!editingUser) {
      const prefix = newRole === 'AGENT' ? 'AGT' : 'USR';
      setUserId(`${prefix}_${Math.floor(1000 + Math.random() * 9000)}`);
    }
  };

  // Submit Handler
  const handleSubmitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !userId.trim()) return;

    setLoading(true);
    setFeedbackMessage(null);

    // Simulate API delay for feedback
    await new Promise(res => setTimeout(res, 400));

    if (editingUser) {
      // Update User
      const updatedData: User = {
        ...editingUser,
        agent_id: userId.trim(),
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role: role,
        team_leader_id: role === 'AGENT' || role === 'TEAM_LEADER' ? teamLeaderId || undefined : undefined,
        active_flag: activeFlag,
      };

      const res = updateUser(updatedData, currentUser.agent_id);
      setLoading(false);

      if (res.success) {
        setShowModal(false);
        setFeedbackMessage({ type: 'success', text: res.message });
      } else {
        setFeedbackMessage({ type: 'error', text: res.message });
      }
    } else {
      // Create User
      const res = createUser(
        {
          agent_id: userId.trim(),
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role: role,
          team_leader_id: role === 'AGENT' || role === 'TEAM_LEADER' ? teamLeaderId || undefined : undefined,
          active_flag: activeFlag,
          client_ids_assigned: ['CLI_KISSHT', 'CLI_HDFC', 'CLI_BAJAJ'],
          doj: new Date().toISOString().split('T')[0],
        },
        currentUser.agent_id
      );

      setLoading(false);

      if (res.success) {
        setShowModal(false);
        setFeedbackMessage({ type: 'success', text: res.message });
      } else {
        setFeedbackMessage({ type: 'error', text: res.message });
      }
    }
  };

  const handleToggleUserStatus = (u: User) => {
    if (!isAdmin) return;
    if (u.active_flag) {
      disableUser(u.agent_id, currentUser.agent_id);
      setFeedbackMessage({ type: 'success', text: `User ${u.name} disabled. Active sessions terminated.` });
    } else {
      enableUser(u.agent_id, currentUser.agent_id);
      setFeedbackMessage({ type: 'success', text: `User ${u.name} account re-enabled.` });
    }
  };

  const handleUnlockUserAccount = (u: User) => {
    if (!isAdmin) return;
    unlockUser(u.agent_id, currentUser.agent_id);
    setFeedbackMessage({ type: 'success', text: `Unlocked account for ${u.name}. Failed login count reset.` });
  };

  const getRoleBadge = (r: UserRole) => {
    switch (r) {
      case 'FOUNDER':
        return <span className="bg-purple-100 text-purple-800 border border-purple-300 px-2.5 py-0.5 rounded-md font-bold text-[11px] inline-flex items-center gap-1"><Crown className="w-3 h-3 text-purple-600" /> Founder</span>;
      case 'OPS_MANAGER':
        return <span className="bg-blue-100 text-blue-800 border border-blue-300 px-2.5 py-0.5 rounded-md font-bold text-[11px] inline-flex items-center gap-1"><Briefcase className="w-3 h-3 text-blue-600" /> Ops Manager</span>;
      case 'TEAM_LEADER':
        return <span className="bg-indigo-100 text-indigo-800 border border-indigo-300 px-2.5 py-0.5 rounded-md font-bold text-[11px] inline-flex items-center gap-1"><UserCheck2 className="w-3 h-3 text-indigo-600" /> Team Leader</span>;
      case 'AGENT':
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-md font-bold text-[11px] inline-flex items-center gap-1"><Headphones className="w-3 h-3 text-emerald-600" /> Agent</span>;
      case 'AUDITOR':
        return <span className="bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-0.5 rounded-md font-bold text-[11px] inline-flex items-center gap-1"><Eye className="w-3 h-3 text-amber-600" /> Auditor</span>;
    }
  };

  const getSupervisorName = (supervisorId?: string) => {
    if (!supervisorId) return '-';
    const found = users.find(u => u.agent_id === supervisorId);
    return found ? `${found.name} (${found.agent_id})` : supervisorId;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Title */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold flex items-center gap-2.5 tracking-tight">
            <Users className="w-6 h-6 text-indigo-400" />
            User & Access Management
            <span className="bg-indigo-900/60 text-indigo-300 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-indigo-700/50">
              RBAC Directory
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Manage application identities, role assignments, account statuses, and TOTP security flags. Single-click disablement immediately revokes access.
          </p>
        </div>

        {isAdmin ? (
          <button
            onClick={handleOpenAddModal}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md hover:shadow-indigo-500/20 flex items-center space-x-2 transition-all transform hover:-translate-y-0.5"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add New User</span>
          </button>
        ) : (
          <div className="bg-slate-800 border border-slate-700 text-amber-300 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>Read-Only View (Admin required to provision)</span>
          </div>
        )}
      </div>

      {/* Stats Breakdown Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-sm">
          <div className="text-[11px] font-semibold text-gray-500 uppercase">Total Directory</div>
          <div className="text-xl font-bold text-gray-900 mt-0.5">{stats.total} Users</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-sm">
          <div className="text-[11px] font-semibold text-emerald-600 uppercase">Active Accounts</div>
          <div className="text-xl font-bold text-emerald-700 mt-0.5">{stats.active}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-sm">
          <div className="text-[11px] font-semibold text-purple-600 uppercase">Founders & Ops</div>
          <div className="text-xl font-bold text-purple-800 mt-0.5">{stats.founders + stats.opsManagers}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-sm">
          <div className="text-[11px] font-semibold text-indigo-600 uppercase">TLs & Agents</div>
          <div className="text-xl font-bold text-indigo-800 mt-0.5">{stats.teamLeaders + stats.agents}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-sm col-span-2 sm:col-span-1">
          <div className="text-[11px] font-semibold text-amber-600 uppercase">Auditors</div>
          <div className="text-xl font-bold text-amber-800 mt-0.5">{stats.auditors}</div>
        </div>
      </div>

      {/* Notifications / Toast Feedback */}
      {feedbackMessage && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between border shadow-sm ${
            feedbackMessage.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button onClick={() => setFeedbackMessage(null)} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Controls Bar: Search & Filter */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by name, email, or User ID..."
            className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-semibold">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <span>Filter:</span>
          </div>

          <select
            value={selectedRole}
            onChange={e => setSelectedRole(e.target.value)}
            className="bg-gray-50 border border-gray-200 text-gray-800 text-xs font-semibold rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Roles ({users.length})</option>
            <option value="FOUNDER">Founder ({stats.founders})</option>
            <option value="OPS_MANAGER">Ops Manager ({stats.opsManagers})</option>
            <option value="TEAM_LEADER">Team Leader ({stats.teamLeaders})</option>
            <option value="AGENT">Agent ({stats.agents})</option>
            <option value="AUDITOR">Auditor ({stats.auditors})</option>
          </select>

          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="bg-gray-50 border border-gray-200 text-gray-800 text-xs font-semibold rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Accounts</option>
            <option value="INACTIVE">Disabled Accounts</option>
            <option value="LOCKED">Locked (Failed Logins)</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-gray-500 space-y-3">
            <Users className="w-10 h-10 text-gray-300 mx-auto" />
            <div className="text-sm font-semibold">No matching users found</div>
            <p className="text-xs text-gray-400">Try adjusting your search terms or role filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-gray-200 tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">User ID</th>
                  <th className="px-4 py-3.5">Full Name & Email</th>
                  <th className="px-4 py-3.5">Assigned Role</th>
                  <th className="px-4 py-3.5">Team / Supervisor</th>
                  <th className="px-4 py-3.5">Account Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 font-medium">
                {filteredUsers.map(u => (
                  <tr key={u.agent_id} className={`hover:bg-gray-50/80 transition-colors ${!u.active_flag ? 'bg-rose-50/30' : ''}`}>
                    <td className="px-4 py-4 font-mono font-bold text-slate-900">{u.agent_id}</td>
                    <td className="px-4 py-4">
                      <div className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                        {u.name}
                        {u.agent_id === currentUser.agent_id && (
                          <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.2 rounded">You</span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-500 font-mono mt-0.5">{u.email}</div>
                    </td>
                    <td className="px-4 py-4">{getRoleBadge(u.role)}</td>
                    <td className="px-4 py-4 text-gray-600 font-mono text-[11px]">
                      {getSupervisorName(u.team_leader_id)}
                    </td>
                    <td className="px-4 py-4">
                      {u.is_locked ? (
                        <span className="inline-flex items-center space-x-1 bg-rose-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-md shadow animate-pulse">
                          <Lock className="w-3 h-3" />
                          <span>Locked (5 Failed Logins)</span>
                        </span>
                      ) : !u.active_flag ? (
                        <span className="inline-flex items-center space-x-1 bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-bold px-2.5 py-1 rounded-md">
                          <UserX className="w-3 h-3 text-rose-600" />
                          <span>Disabled</span>
                        </span>
                      ) : u.first_login ? (
                        <span className="inline-flex items-center space-x-1 bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold px-2.5 py-1 rounded-md">
                          <span>Password Reset Required</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold px-2.5 py-1 rounded-md">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Active</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right space-x-2">
                      {isAdmin ? (
                        <>
                          <button
                            onClick={() => handleOpenEditModal(u)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] px-2.5 py-1 rounded-md border border-slate-300 inline-flex items-center gap-1 transition-all"
                            title="Edit User Details"
                          >
                            <Edit3 className="w-3 h-3 text-slate-600" />
                            <span>Edit</span>
                          </button>

                          {u.is_locked && (
                            <button
                              onClick={() => handleUnlockUserAccount(u)}
                              className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] px-2.5 py-1 rounded-md shadow inline-flex items-center gap-1 transition-all"
                            >
                              <Unlock className="w-3 h-3" />
                              <span>Unlock</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleToggleUserStatus(u)}
                            className={`font-bold text-[11px] px-2.5 py-1 rounded-md shadow inline-flex items-center gap-1 transition-all ${
                              u.active_flag
                                ? 'bg-rose-600 hover:bg-rose-500 text-white'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            }`}
                            title={u.active_flag ? 'Single-Click Disable (Immediately kills active sessions)' : 'Re-enable Account'}
                          >
                            {u.active_flag ? (
                              <>
                                <UserX className="w-3 h-3" />
                                <span>Disable</span>
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-3 h-3" />
                                <span>Enable</span>
                              </>
                            )}
                          </button>
                        </>
                      ) : (
                        <span className="text-[10px] text-gray-400 italic">Read-only</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-600" />
                {editingUser ? `Edit Account: ${editingUser.name}` : 'Provision New User'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitUser} className="space-y-4 text-xs">
              {/* Full Name & User ID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    User / Agent ID <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={userId}
                    onChange={e => setUserId(e.target.value)}
                    disabled={!!editingUser}
                    placeholder="e.g. USR_1092 or AGT_001"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Registered Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="ramesh@nexlance.co.in"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Role Dropdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Assigned Role <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={role}
                    onChange={e => handleRoleChange(e.target.value as UserRole)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="FOUNDER">Founder</option>
                    <option value="OPS_MANAGER">Ops Manager</option>
                    <option value="TEAM_LEADER">Team Leader</option>
                    <option value="AGENT">Agent</option>
                    <option value="AUDITOR">Auditor (Read Only)</option>
                  </select>
                </div>

                {/* Team / Team Leader dropdown */}
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Assigned Supervisor / Team</label>
                  <select
                    value={teamLeaderId}
                    onChange={e => setTeamLeaderId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">No Direct Supervisor / Self Managed</option>
                    {supervisorOptions.map(sup => (
                      <option key={sup.agent_id} value={sup.agent_id}>
                        {sup.name} ({sup.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Account Active Status Toggle */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Account Status</label>
                <div className="flex items-center space-x-4 pt-1">
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="activeStatus"
                      checked={activeFlag === true}
                      onChange={() => setActiveFlag(true)}
                      className="text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                    <span className="ml-2 font-semibold text-emerald-700">Active</span>
                  </label>
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="activeStatus"
                      checked={activeFlag === false}
                      onChange={() => setActiveFlag(false)}
                      className="text-rose-600 focus:ring-rose-500 h-4 w-4"
                    />
                    <span className="ml-2 font-semibold text-rose-700">Inactive / Disabled</span>
                  </label>
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 text-[11px] leading-relaxed">
                <strong>PRD Rule:</strong> Newly provisioned accounts require password change & mandatory Email OTP / TOTP 2FA verification on first login.
              </div>

              {/* Modal Buttons */}
              <div className="flex justify-end space-x-3 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow inline-flex items-center space-x-2 transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingUser ? 'Save User Changes' : 'Provision User'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
