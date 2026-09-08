import React from 'react';
import { useAuth } from '../context/AuthContext';
import { AgentDashboard } from '../components/dashboards/AgentDashboard';
import { TeamLeaderDashboard } from '../components/dashboards/TeamLeaderDashboard';
import { FounderOpsDashboard } from '../components/dashboards/FounderOpsDashboard';
import { AuditorDashboard } from '../components/dashboards/AuditorDashboard';

interface DashboardPageProps {
  setActiveTab: (tab: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ setActiveTab }) => {
  const { currentUser } = useAuth();

  switch (currentUser.role) {
    case 'AGENT':
      return <AgentDashboard onGoToWorklist={() => setActiveTab('worklist')} />;
    case 'TEAM_LEADER':
      return <TeamLeaderDashboard onGoToAllocation={() => setActiveTab('allocation')} />;
    case 'FOUNDER':
    case 'OPS_MANAGER':
      return <FounderOpsDashboard />;
    case 'AUDITOR':
      return <AuditorDashboard />;
    default:
      return <FounderOpsDashboard />;
  }
};
