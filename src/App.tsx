/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Component } from 'react';
import Dashboard from './components/Dashboard';

class AppErrorBoundary extends Component<{children: any}, {hasError: boolean, error: string}> {
  constructor(props: {children: any}) {
    super(props);
    this.state = { hasError: false, error: '' };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error: error?.message || String(error) };
  }
  componentDidCatch(error: any, info: any) {
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
  return (
    <div className="min-h-screen bg-slate-50">
      <AppErrorBoundary>
        <Dashboard />
      </AppErrorBoundary>
    </div>
  );
}
