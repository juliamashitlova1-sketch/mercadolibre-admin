import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { LogIn, ShieldCheck, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Hardcoded credentials as requested by USER
    if (username === 'MILYFLY' && password === 'MILYFLY134888') {
      setTimeout(() => {
        sessionStorage.setItem('milyfly_auth', 'true');
        onLogin();
      }, 800);
    } else {
      setTimeout(() => {
        setError('账号或密码错误，请查验后重试');
        setLoading(false);
      }, 500);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-slate-950">
      {/* Background Atmosphere */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.1),transparent_70%)]" />
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-sky-500/10 blur-[120px] rounded-full" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mb-4 animate-glow">
            <ShieldCheck className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 tracking-tighter">
            MILYFLY
          </h1>
          <p className="text-slate-400 text-sm mt-2">跨境电商运营管理终端</p>
        </div>

        <Card className="glass-panel border-white/10 shadow-2xl overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl text-white flex items-center gap-2">
              <LogIn className="w-5 h-5 text-indigo-400" /> 身份验证
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              请输入您的 MILYFLY 员工凭据以继续
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-xs text-slate-300 ml-1">管理账号</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="MILYFLY"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-slate-900/50 border-white/5 focus:border-indigo-500/50 h-11 text-sm text-white transition-all ring-offset-slate-950"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs text-slate-300 ml-1">身份密钥</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-slate-900/50 border-white/5 focus:border-indigo-500/50 h-11 text-sm text-white transition-all ring-offset-slate-950"
                  required
                />
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 flex items-center gap-2"
                  >
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    <span className="text-xs text-rose-200">{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    验证中...
                  </div>
                ) : (
                  '立即登录'
                )}
              </Button>
            </form>
          </CardContent>
          <div className="px-6 py-4 bg-white/5 border-t border-white/5 text-center">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest">
              Secure Terminal Access • 2026 Edition
            </span>
          </div>
        </Card>

        <p className="text-center text-[10px] text-slate-600 mt-8">
          此系统包含机密商业数据，未经授权的访问将被记录。
        </p>
      </motion.div>
    </div>
  );
}
