
import React from 'react';
import { ClipboardCheck, LogOut, User as UserIcon, Shield, ShieldCheck } from 'lucide-react';
import { User } from '@/types';

interface HeaderProps {
  user?: User | null;
  onLogout?: () => void;
  showAdminPanel?: boolean;
  onToggleAdminPanel?: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout, showAdminPanel, onToggleAdminPanel }) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-12 relative">
          {/* Left Side: Logo */}
          <div className="flex items-center gap-2 z-10">
            <div className="bg-indigo-500/10 p-1.5 rounded-lg border border-indigo-500/20">
              <ClipboardCheck className="h-5 w-5 text-indigo-400" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-white tracking-tight leading-none">
                Evidencia de Teste
              </h1>
            </div>
          </div>

          {/* Center: Greeting (Absolute Positioned) */}
          {user && (
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none w-max">
              <span className="text-xs sm:text-sm font-medium text-slate-400">
                Olá, <span className="font-bold text-white">{user.name}</span>
              </span>
            </div>
          )}

          {/* Right Side: Profile & Actions */}
          <div className="flex items-center gap-3 z-10">
            {user && (
              <div className="flex items-center gap-3">
                {/* Admin/Settings Toggle Button */}
                <button
                  onClick={onToggleAdminPanel}
                  className={`flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-md transition-all border uppercase tracking-wider ${showAdminPanel
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
                    }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">
                    {showAdminPanel ? 'Fechar' : (user.role === 'ADMIN' ? 'Painel' : 'Perfil')}
                  </span>
                </button>

                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 flex items-center gap-1">
                    {user.role === 'ADMIN' ? <Shield className="w-2.5 h-2.5 text-purple-400" /> : <UserIcon className="w-2.5 h-2.5 text-blue-400" />}
                    {user.acronym}
                  </span>
                </div>
                <div className="h-6 w-px bg-slate-700 hidden sm:block"></div>
                <button
                  onClick={onLogout}
                  className="flex items-center gap-1.5 text-[10px] font-bold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-2 py-1.5 rounded-md border border-red-500/20 transition-all uppercase tracking-wider"
                  title="Sair do Sistema"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">SAIR</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
