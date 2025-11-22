
import React from 'react';
import { ClipboardCheck, LogOut, User as UserIcon, Shield } from 'lucide-react';
import { User } from '../types';

interface HeaderProps {
  user?: User | null;
  onLogout?: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 relative">
          {/* Left Side: Logo */}
          <div className="flex items-center gap-3 z-10">
            <div className="bg-indigo-500/10 p-2 rounded-xl border border-indigo-500/20 backdrop-blur-sm">
              <ClipboardCheck className="h-6 w-6 text-indigo-400" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-white tracking-tight leading-none">
                Evidencia de Teste
              </h1>
            </div>
          </div>

          {/* Center: Greeting (Absolute Positioned) */}
          {user && (
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none w-max">
              <span className="text-sm sm:text-base font-medium text-slate-400">
                Olá, <span className="font-bold text-white">{user.name}</span>
              </span>
            </div>
          )}

          {/* Right Side: Profile & Logout */}
          <div className="flex items-center gap-4 z-10">
            {user && (
              <div className="flex items-center gap-4">
                 <div className="flex flex-col items-end mr-2">
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 rounded border border-slate-700 flex items-center gap-1">
                       {user.role === 'ADMIN' ? <Shield className="w-3 h-3 text-purple-400" /> : <UserIcon className="w-3 h-3 text-blue-400" />}
                       {user.acronym}
                    </span>
                 </div>
                 <div className="h-8 w-px bg-slate-700 mx-2 hidden sm:block"></div>
                 <button 
                    onClick={onLogout}
                    className="flex items-center gap-2 text-xs font-bold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-3 py-2 rounded-lg border border-red-500/20 transition-all"
                    title="Sair do Sistema"
                 >
                    <LogOut className="w-4 h-4" />
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