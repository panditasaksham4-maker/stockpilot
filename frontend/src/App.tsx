import React, { useState } from 'react';
import { CloudProvider } from './context/CloudContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { ApprovalBanner } from './components/ApprovalBanner';
import { FaultInjectionModal } from './components/FaultInjectionModal';
import { IncidentDetailModal } from './components/IncidentDetailModal';

import { OverviewDashboard } from './pages/OverviewDashboard';
import { LiveMonitoring } from './pages/LiveMonitoring';
import { InfrastructureTopology } from './pages/InfrastructureTopology';
import { AIInsights } from './pages/AIInsights';
import { IncidentManagement } from './pages/IncidentManagement';
import { RemediationControlCenter } from './pages/RemediationControlCenter';
import { PerformanceEvaluation } from './pages/PerformanceEvaluation';
import { SystemArchitecture } from './pages/SystemArchitecture';

import { NavigationPage, IncidentRecord } from './types';

const MainLayout: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<NavigationPage>('overview');
  const [isFaultModalOpen, setIsFaultModalOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<IncidentRecord | null>(null);

  const renderPage = () => {
    switch (currentPage) {
      case 'overview':
        return (
          <OverviewDashboard
            onSelectIncident={setSelectedIncident}
            onNavigatePage={setCurrentPage}
            onOpenFaultModal={() => setIsFaultModalOpen(true)}
          />
        );
      case 'monitoring':
        return <LiveMonitoring />;
      case 'topology':
        return <InfrastructureTopology />;
      case 'ai-insights':
        return <AIInsights />;
      case 'incidents':
        return <IncidentManagement onSelectIncident={setSelectedIncident} />;
      case 'remediation-control':
        return <RemediationControlCenter />;
      case 'evaluation':
        return <PerformanceEvaluation />;
      case 'architecture':
        return <SystemArchitecture />;
      default:
        return (
          <OverviewDashboard
            onSelectIncident={setSelectedIncident}
            onNavigatePage={setCurrentPage}
            onOpenFaultModal={() => setIsFaultModalOpen(true)}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100 flex flex-col font-sans">
      <Navbar onOpenFaultModal={() => setIsFaultModalOpen(true)} />
      
      {/* Banner for manual approval when active */}
      <ApprovalBanner />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar currentPage={currentPage} onSelectPage={setCurrentPage} />
        
        <main className="flex-1 overflow-y-auto p-6 max-w-7xl mx-auto w-full">
          {renderPage()}
        </main>
      </div>

      {/* Global Modals */}
      <FaultInjectionModal
        isOpen={isFaultModalOpen}
        onClose={() => setIsFaultModalOpen(false)}
      />

      <IncidentDetailModal
        incident={selectedIncident}
        onClose={() => setSelectedIncident(null)}
      />
    </div>
  );
};

export default function App() {
  return (
    <CloudProvider>
      <MainLayout />
    </CloudProvider>
  );
}
