import React from 'react';
import {
  LayoutDashboard,
  PhoneCall,
  UploadCloud,
  FileCheck2,
  Building2,
  Users,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { currentUser } = useAuth();
  const role = currentUser.role;

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboards & MIS',
      icon: LayoutDashboard,
      roles: ['FOUNDER', 'OPS_MANAGER', 'TEAM_LEADER', 'AGENT', 'AUDITOR'],
    },
    {
      id: 'worklist',
      label: 'Agent Worklist Queue',
      icon: PhoneCall,
      roles: ['AGENT', 'TEAM_LEADER', 'OPS_MANAGER', 'FOUNDER', 'AUDITOR'],
      badge: 'Priority Sorted',
    },
    {
      id: 'allocation',
      label: 'Allocation & Assignment',
      icon: UploadCloud,
      roles: ['FOUNDER', 'OPS_MANAGER', 'TEAM_LEADER', 'AUDITOR'],
    },
    {
      id: 'payments',
      label: 'Payment Recon & Queue',
      icon: FileCheck2,
      roles: ['FOUNDER', 'OPS_MANAGER', 'AUDITOR'],
    },
    {
      id: 'clients',
      label: 'Client Master',
      icon: Building2,
      roles: ['FOUNDER', 'OPS_MANAGER', 'AUDITOR'],
    },
    {
      id: 'users',
      label: 'User & Role Admin',
      icon: Users,
      roles: ['FOUNDER', 'OPS_MANAGER', 'TEAM_LEADER', 'AUDITOR'],
    },
    {
      id: 'audit-logs',
      label: 'Audit Log & Compliance',
      icon: ShieldAlert,
      roles: ['FOUNDER', 'OPS_MANAGER', 'AUDITOR'],
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col justify-between flex-shrink-0 min-h-[calc(100vh-61px)]">
      <div className="p-4 space-y-1">
        <div className="px-3 py-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          Main Navigation
        </div>
        {navItems.map(item => {
          const isAllowed = item.roles.includes(role);
          if (!isAllowed) return null;

          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 transform active:scale-95 ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-900/40 font-semibold scale-[1.02]'
                  : 'text-slate-400 hover:bg-slate-800/80 hover:text-white hover:translate-x-1'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                    isActive ? 'bg-blue-800 text-blue-100' : 'bg-slate-800 text-blue-400 border border-blue-900'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="text-xs text-slate-400 space-y-1">
          <div className="font-semibold text-slate-300">Nexlance Core Platform</div>
          <div>Audit Log: Immutable</div>
          <div>Phone Masking: Enabled</div>
        </div>
      </div>
    </aside>
  );
};
