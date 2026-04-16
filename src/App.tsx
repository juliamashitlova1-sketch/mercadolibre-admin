import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Overview from './pages/Overview';
import SkuManage from './pages/SkuManage';
import Orders from './pages/Orders';
import Inventory from './pages/Inventory';
import Ads from './pages/Ads';
import Competitors from './pages/Competitors';
import Finance from './pages/Finance';
import Health from './pages/Health';
import Operations from './pages/Operations';

import DataEntry from './components/DataEntry';
import SKUEntry from './components/SKUEntry';
import ClaimEntry from './components/ClaimEntry';
import OperationEntry from './components/OperationEntry';

import { useSkuData, useDailyStats, useClaims, useOperationLogs } from './hooks/useStoreData';
import { SKUStats } from './types';

class AppErrorBoundary extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    // @ts-ignore
    this.state = { hasError: false, error: '' };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error: error?.message || String(error) };
  }
  componentDidCatch(error: any, info: any) {
    console.error('App 级别错误:', error, info);
  }
  render() {
    // @ts-ignore
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-red-50 flex items-center justify-center p-8">
          <div className="bg-white border-2 border-red-300 rounded-xl p-10 max-w-2xl text-center shadow-lg">
            <h1 className="text-red-600 font-bold text-2xl mb-4">程序出错了</h1>
            {/* @ts-ignore */}
            <pre className="text-red-500 text-sm mb-6 p-4 bg-red-50 rounded-lg text-left overflow-auto">{this.state.error}</pre>
            <p className="text-gray-500 text-sm mb-4">请按 F12 打开控制台查看详细错误信息，并截图发给开发者</p>
            <button
              className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium"
              // @ts-ignore
              onClick={() => this.setState({ hasError: false, error: '' })}
            >
              重试
            </button>
          </div>
        </div>
      );
    }
    // @ts-ignore
    return this.props.children;
  }
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50">
        <AppErrorBoundary>
          <AppContent />
        </AppErrorBoundary>
      </div>
    </BrowserRouter>
  );
}

function AppContent() {
  const { skuData, refreshSkuData } = useSkuData();
  const { dailyData } = useDailyStats();
  const { claims } = useClaims();
  const { operationLogs } = useOperationLogs();

  const [isEntryOpen, setIsEntryOpen] = useState(false);
  const [isSkuEntryOpen, setIsSkuEntryOpen] = useState(false);
  const [isClaimEntryOpen, setIsClaimEntryOpen] = useState(false);
  const [isOperationEntryOpen, setIsOperationEntryOpen] = useState(false);
  const [selectedSku, setSelectedSku] = useState<SKUStats | null>(null);

  const contextValue = {
    skuData,
    dailyData,
    claims,
    operationLogs,
    refreshSkuData,
    onOpenDataEntry: () => setIsEntryOpen(true),
    onAddClaim: () => setIsClaimEntryOpen(true),
    onAddLog: () => setIsOperationEntryOpen(true),
    onEditSku: (sku: SKUStats | null) => {
      setSelectedSku(sku);
      setIsSkuEntryOpen(true);
    }
  };

  return (
    <>
      <Routes>
        <Route element={<MainLayout skuData={skuData} onAddSku={() => { setSelectedSku(null); setIsSkuEntryOpen(true); }} />}>
          <Route element={<ContextWrapper contextValue={contextValue} />}>
            <Route path="/" element={<Overview />} />
            <Route path="/sku-manage" element={<SkuManage />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/ads" element={<Ads />} />
            <Route path="/competitors" element={<Competitors />} />
            <Route path="/finance" element={<Finance />} />
            <Route path="/health" element={<Health />} />
            <Route path="/operations" element={<Operations />} />
          </Route>
        </Route>
      </Routes>

      <DataEntry open={isEntryOpen} onOpenChange={setIsEntryOpen} skuData={skuData} onSuccess={() => console.log('Data saved')} />
      <SKUEntry open={isSkuEntryOpen} onOpenChange={setIsSkuEntryOpen} sku={selectedSku} onSuccess={() => refreshSkuData()} />
      <ClaimEntry open={isClaimEntryOpen} onOpenChange={setIsClaimEntryOpen} onSuccess={() => console.log('Claim saved')} />
      <OperationEntry open={isOperationEntryOpen} onOpenChange={setIsOperationEntryOpen} skuData={skuData} onSuccess={() => console.log('Operation log saved')} />
    </>
  );
}

function ContextWrapper({ contextValue }: { contextValue: any }) {
  return <Outlet context={contextValue} />;
}
