import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import { supabase } from './lib/supabase';
import Competitors from './pages/Competitors';
import Health from './pages/Health';
import Operations from './pages/Operations';
import Pricing from './pages/Pricing';
import FakeOrders from './pages/FakeOrders';
import CargoDamage from './pages/CargoDamage';
import DataDashboard from './pages/DataDashboard';
import DataCleaning from './pages/DataCleaning';
import SkuVisitCleaning from './pages/SkuVisitCleaning';
import SkuAdCleaning from './pages/SkuAdCleaning';
import SkuManagement from './pages/SkuManagement';
import SkuCostManagement from './pages/SkuCostManagement';
import SoftwareSuggestions from './pages/SoftwareSuggestions';
import ReportCenter from './pages/ReportCenter';

import DataEntry from './components/DataEntry';
import SKUEntry from './components/SKUEntry';
import ClaimEntry from './components/ClaimEntry';
import OperationEntry from './components/OperationEntry';
import Login from './components/Login';

import { useAppStore } from './stores/appStore';
import { useRealtimeSubscriptions } from './hooks/useRealtimeSubscriptions';
import { SKUStats, Claim } from './types';

class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: string }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: '' };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error?.message || String(error) };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('App 级别错误:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-red-50 flex items-center justify-center p-8">
          <div className="bg-white border-2 border-red-300 rounded-xl p-10 max-w-2xl text-center shadow-lg">
            <h1 className="text-red-600 font-bold text-2xl mb-4">程序出错了</h1>
            <pre className="text-red-500 text-sm mb-6 p-4 bg-red-50 rounded-lg text-left overflow-auto">{this.state.error}</pre>
            <p className="text-gray-500 text-sm mb-4">请按 F12 打开控制台查看详细错误信息，并截图发给开发者</p>
            <button
              className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium"
              onClick={() => this.setState({ hasError: false, error: '' })}
            >
              重试
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [auth, setAuth] = useState(sessionStorage.getItem('milyfly_auth') === 'true');

  if (!auth) {
    return <Login onLogin={() => setAuth(true)} />;
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-transparent text-white font-sans">
        <AppErrorBoundary>
          <AppContent />
        </AppErrorBoundary>
      </div>
    </BrowserRouter>
  );
}

function AppContent() {
  const store = useAppStore();
  const {
    skuData, allSkuData, managedSkus, dailyData, claims,
    operationLogs, fakeOrders, cargoDamage, uiVersion,
    fetchAll, fetchSkuData, fetchOperationLogs, fetchExpenses,
    deleteClaim, updateReputation,
  } = store;

  useRealtimeSubscriptions();

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const [isEntryOpen, setIsEntryOpen] = useState(false);
  const [isSkuEntryOpen, setIsSkuEntryOpen] = useState(false);
  const [skuEntryMode, setSkuEntryMode] = useState<'full' | 'competitors'>('full');
  const [isClaimEntryOpen, setIsClaimEntryOpen] = useState(false);
  const [isOperationEntryOpen, setIsOperationEntryOpen] = useState(false);
  const [selectedSku, setSelectedSku] = useState<SKUStats | null>(null);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);

  const contextValue = {
    skuData,
    allSkuData,
    managedSkus,
    dailyData,
    claims,
    operationLogs,
    refreshSkuData: fetchSkuData,
    refreshLogs: fetchOperationLogs,
    refreshExpenses: fetchExpenses,
    fakeOrders,
    cargoDamage,
    uiVersion: uiVersion as 'v2',

    onOpenDataEntry: () => setIsEntryOpen(true),
    onAddClaim: () => {
      setSelectedClaim(null);
      setIsClaimEntryOpen(true);
    },
    onAddLog: () => setIsOperationEntryOpen(true),
    onEditSku: (sku: SKUStats | null, mode: 'full' | 'competitors' = 'full') => {
      setSelectedSku(sku);
      setSkuEntryMode(mode);
      setIsSkuEntryOpen(true);
    },
    onEditClaim: (claim: Claim) => {
      setSelectedClaim(claim);
      setIsClaimEntryOpen(true);
    },
    onDeleteClaim: deleteClaim,
    onUpdateReputation: updateReputation,
  };

  return (
    <>
      <Routes>
        <Route element={
          <MainLayout
            skuData={skuData}
            dailyData={dailyData}
            fakeOrders={fakeOrders}
            cargoDamage={cargoDamage}
            operationLogs={operationLogs}
            uiVersion={uiVersion as 'v2'}
            onAddSku={() => { setSelectedSku(null); setIsSkuEntryOpen(true); }}
          />
        }>
          <Route element={<ContextWrapper contextValue={contextValue} />}>
            <Route path="/" element={<Navigate to="/fake-orders" replace />} />
            <Route path="/data-dashboard" element={<DataDashboard />} />
            <Route path="/data-cleaning" element={<Navigate to="/data-cleaning/orders" replace />} />
            <Route path="/data-cleaning/orders" element={<DataCleaning />} />
            <Route path="/data-cleaning/visits" element={<SkuVisitCleaning />} />
            <Route path="/data-cleaning/ads" element={<SkuAdCleaning />} />
            <Route path="/sku-management" element={<SkuManagement />} />
            <Route path="/sku-cost-management" element={<SkuCostManagement />} />
            <Route path="/health" element={<Health />} />
            <Route path="/operations" element={<Operations />} />
            <Route path="/fake-orders" element={<FakeOrders />} />
            <Route path="/cargo-damage" element={<CargoDamage />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/pricing/new" element={<Pricing />} />
            <Route path="/pricing/list" element={<Pricing />} />
            <Route path="/pricing/success" element={<Pricing />} />
            <Route path="/pricing/staging" element={<Pricing />} />
            <Route path="/reports" element={<ReportCenter />} />
            <Route path="/software-suggestions" element={<SoftwareSuggestions />} />
            <Route path="/orders-dashboard" element={<Navigate to="/fake-orders" replace />} />
            <Route path="/orders" element={<Navigate to="/fake-orders" replace />} />
            <Route path="/inventory" element={<Navigate to="/fake-orders" replace />} />
            <Route path="/ads" element={<Navigate to="/fake-orders" replace />} />
            <Route path="/finance" element={<Navigate to="/fake-orders" replace />} />
            <Route path="*" element={<Navigate to="/fake-orders" replace />} />
          </Route>
        </Route>
      </Routes>

      <DataEntry open={isEntryOpen} onOpenChange={setIsEntryOpen} skuData={skuData} onSuccess={() => console.log('Data saved')} />
      <SKUEntry open={isSkuEntryOpen} onOpenChange={setIsSkuEntryOpen} sku={selectedSku} mode={skuEntryMode} managedSkus={managedSkus} onSuccess={() => fetchSkuData()} />
      <ClaimEntry open={isClaimEntryOpen} onOpenChange={setIsClaimEntryOpen} claim={selectedClaim} onSuccess={() => console.log('Claim updated')} />
      <OperationEntry open={isOperationEntryOpen} onOpenChange={setIsOperationEntryOpen} managedSkus={managedSkus} onSuccess={() => { fetchOperationLogs(); console.log('Operation log saved'); }} />
    </>
  );
}

function ContextWrapper({ contextValue }: { contextValue: Record<string, unknown> }) {
  return <Outlet context={contextValue} />;
}
