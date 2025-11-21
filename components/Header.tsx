import React from 'react';
import { ClipboardCheck, ShieldCheck } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500/10 p-2 rounded-xl border border-indigo-500/20 backdrop-blur-sm">
              <ClipboardCheck className="h-6 w-6 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight leading-none">
                Evidencias de Teste QA
              </h1>
              <p className="text-xs text-slate-400 font-medium mt-1">Portal de Documentação Corporativa</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-xs font-medium text-slate-300 bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-700/50">
              <span className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse"></span>
              Sistema Operacional
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;