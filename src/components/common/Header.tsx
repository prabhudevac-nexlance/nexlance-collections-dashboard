import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, LogOut, RefreshCw, AlertTriangle } from 'lucide-react';
import type { UserRole } from '../../types';

export const Header: React.FC = () => {
  const { currentUser, users, switchUser, logout, isTotpVerified } = useAuth();

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'FOUNDER':
        return <span className="bg-purple-100 text-purple-800 text-xs font-semibold px-2 py-0.5 rounded border border-purple-300">Founder</span>;
      case 'OPS_MANAGER':
        return <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-0.5 rounded border border-blue-300">Ops Manager</span>;
      case 'TEAM_LEADER':
        return <span className="bg-indigo-100 text-indigo-800 text-xs font-semibold px-2 py-0.5 rounded border border-indigo-300">Team Leader</span>;
      case 'AGENT':
        return <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2 py-0.5 rounded border border-emerald-300">Agent</span>;
      case 'AUDITOR':
        return <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2 py-0.5 rounded border border-amber-300">Auditor (Read Only)</span>;
    }
  };

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 px-6 py-3 flex items-center justify-between shadow-md relative z-30">
      {/* Brand with Animated Floating Nexlance Logo */}
      <div className="flex items-center space-x-3">
        <div className="p-1.5 bg-slate-800/90 rounded-xl border border-slate-700/80 shadow-md flex items-center justify-center animate-pulse-glow">
          <img src="./logo.png" alt="Nexlance Logo" className="w-8 h-8 object-contain drop-shadow animate-float-logo" />
        </div>
        <div>
          <h1 className="font-bold text-lg tracking-tight text-white flex items-center gap-2">
            Nexlance Collections System
            <span className="bg-blue-900/60 text-blue-300 text-xs font-medium px-2 py-0.5 rounded border border-blue-700/50 shadow-sm">
              v1.0 System of Record
            </span>
          </h1>
          <p className="text-xs text-slate-400">NBFC Allocation • Agent Worklist • PTP Recon • Audit Trail</p>
        </div>
      </div>

      {/* Role Switcher & User Profile Controls */}
      <div className="flex items-center space-x-4">
        {/* TOTP Status */}
        {isTotpVerified ? (
          <div className="flex items-center text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2.5 py-1 rounded-full space-x-1 shadow-sm transition-all hover:scale-105">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>TOTP 2FA Verified</span>
          </div>
        ) : (
          <div className="flex items-center text-xs text-amber-400 bg-amber-950/60 border border-amber-800 px-2.5 py-1 rounded-full space-x-1 animate-bounce">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>2FA Pending</span>
          </div>
        )}

        {/* Demo Live Role Switcher Dropdown */}
        <div className="flex items-center space-x-2 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg shadow-sm hover:border-slate-600 transition-all">
          <RefreshCw className="w-4 h-4 text-blue-400 animate-spin-slow" />
          <span className="text-xs text-slate-300 font-medium">Switch Active Role:</span>
          <select
            value={currentUser.agent_id}
            onChange={e => switchUser(e.target.value)}
            className="bg-slate-900 text-white text-xs font-semibold rounded px-2 py-1 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer transition-all hover:bg-slate-950"
          >
            {users.map(u => (
              <option key={u.agent_id} value={u.agent_id}>
                {u.name} ({u.role})
              </option>
            ))}
          </select>
        </div>

        {/* User Badge */}
        <div className="flex items-center space-x-3 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60 shadow-sm transition-all hover:bg-slate-800">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-bold flex items-center justify-center text-sm shadow">
            {currentUser.name.charAt(0)}
          </div>
          <div className="text-left">
            <div className="text-xs font-semibold text-white flex items-center gap-1.5">
              {currentUser.name}
              {getRoleBadge(currentUser.role)}
            </div>
            <div className="text-[10px] text-slate-400 font-mono">{currentUser.email}</div>
          </div>
        </div>

        {/* Logout button */}
        <button
          onClick={logout}
          className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-all transform hover:scale-110"
          title="Sign Out Session"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
