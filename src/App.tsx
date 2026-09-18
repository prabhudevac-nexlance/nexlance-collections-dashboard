import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { LoginModal } from './components/auth/LoginModal';

import { DashboardPage } from './pages/DashboardPage';
import { WorklistPage } from './pages/WorklistPage';
import { AllocationPage } from './pages/AllocationPage';
import { PaymentReconPage } from './pages/PaymentReconPage';
import { ClientsPage } from './pages/ClientsPage';
import { UsersPage } from './pages/UsersPage';
import { AuditorDashboard } from './components/dashboards/AuditorDashboard';

import { ErrorBoundary } from './components/common/ErrorBoundary';

const MainLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage setActiveTab={setActiveTab} />;
      case 'worklist':
        return <WorklistPage />;
      case 'allocation':
        return <AllocationPage />;
      case 'payments':
        return <PaymentReconPage />;
      case 'clients':
        return <ClientsPage />;
      case 'users':
        return <UsersPage />;
      case 'audit-logs':
        return <AuditorDashboard />;
      default:
        return <DashboardPage setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans antialiased text-gray-900">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="flex-1 p-8 overflow-y-auto max-h-[calc(100vh-61px)]">
          <div key={activeTab} className="animate-fade-in-up">
            {renderContent()}
          </div>
        </main>
      </div>
      <LoginModal />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <DataProvider>
          <MainLayout />
        </DataProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
