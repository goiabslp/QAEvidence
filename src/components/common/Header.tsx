import React, { useState, useRef, useEffect } from 'react';
import { ClipboardCheck, LogOut, User as UserIcon, Shield, ShieldCheck, Menu, FileText, Bug, Clock, Beaker, Target } from 'lucide-react';
import { User } from '@/types';
import { useUserMetrics } from '@/hooks/useUserMetrics';

interface HeaderProps {
  user?: User | null;
  onLogout?: () => void;
  showAdminPanel?: boolean;
  onToggleAdminPanel?: () => void;
  activeModule?: 'HOME' | 'TICKET' | 'BUGS' | 'EVIDENCES' | 'TESTS';
  onMenuNavigate?: (module: 'HOME' | 'TICKET' | 'BUGS' | 'EVIDENCES' | 'TESTS', resetToNewTicket?: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout, showAdminPanel, onToggleAdminPanel, activeModule, onMenuNavigate }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { completedCount } = useUserMetrics(user?.acronym);
  const remainingCount = user?.dailyGoal ? Math.max(0, user.dailyGoal - completedCount) : 0;

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-12 relative">
          {/* Left Side: Logo & Menu */}
          <div className="flex items-center gap-3 z-20" ref={menuRef}>
            {user && !showAdminPanel && (
              <div className="relative">
                <button
                  id="main-menu-button"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-center focus:outline-none"
                  aria-label="Menu Principal"
                >
                  <Menu className="w-5 h-5" />
                </button>

                {/* Dropdown Menu */}
                {isMenuOpen && (
                  <div className="absolute top-12 left-0 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden transform origin-top-left flex flex-col animate-fade-in z-50">
                    <div className="p-3 border-b border-slate-100 bg-slate-50">
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Navegação</h3>
                    </div>
                    <div className="p-2 space-y-1">
                      <button
                        onClick={() => {
                          if (onMenuNavigate) onMenuNavigate('TICKET', true);
                          setIsMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 text-sm font-bold transition-all ${activeModule === 'TICKET' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                      >
                        <FileText className={`w-4 h-4 ${activeModule === 'TICKET' ? 'text-indigo-600' : 'text-slate-400'}`} />
                        Novo Chamado
                      </button>
                      <button
                        onClick={() => {
                          if (onMenuNavigate) onMenuNavigate('BUGS');
                          setIsMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 text-sm font-bold transition-all ${activeModule === 'BUGS' ? 'bg-red-50 text-red-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                      >
                        <Bug className={`w-4 h-4 ${activeModule === 'BUGS' ? 'text-red-600' : 'text-slate-400'}`} />
                        Tela de Chamado e BUGs
                      </button>
                      <button
                        onClick={() => {
                          if (onMenuNavigate) onMenuNavigate('EVIDENCES');
                          setIsMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 text-sm font-bold transition-all ${activeModule === 'EVIDENCES' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                      >
                        <Clock className={`w-4 h-4 ${activeModule === 'EVIDENCES' ? 'text-emerald-600' : 'text-slate-400'}`} />
                        Evidências
                      </button>
                      <button
                        onClick={() => {
                          if (onMenuNavigate) onMenuNavigate('TESTS');
                          setIsMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 text-sm font-bold transition-all ${activeModule === 'TESTS' ? 'bg-purple-50 text-purple-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                      >
                        <Beaker className={`w-4 h-4 ${activeModule === 'TESTS' ? 'text-purple-600' : 'text-slate-400'}`} />
                        Testes
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            <div 
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => {
                if (onMenuNavigate) onMenuNavigate('HOME');
              }}
              title="Ir para a Tela Inicial"
            >
              <div className="bg-indigo-500/10 p-1.5 rounded-lg border border-indigo-500/20">
                <ClipboardCheck className="h-5 w-5 text-indigo-400" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-white tracking-tight leading-none pointer-events-none select-none">
                  Evidencia de Teste
                </h1>
              </div>
            </div>
          </div>

          {/* Center: Greeting & Metrics */}
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 hidden lg:flex items-center gap-6 pointer-events-none">
            {user && (
              <div className="flex items-center gap-4 bg-slate-800/50 px-4 py-1.5 rounded-full border border-slate-700/50 backdrop-blur-sm shadow-inner pointer-events-auto group hover:bg-slate-800 transition-all duration-300">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium text-slate-500 uppercase tracking-tighter">Olá,</span>
                  <span className="text-xs font-black text-white">{user.name.split(' ')[0]}</span>
                </div>
                
                {user.dailyGoal !== undefined && user.dailyGoal > 0 && (
                  <>
                    <div className="w-px h-3 bg-slate-700"></div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <div className="p-1 bg-indigo-500/10 rounded-md border border-indigo-500/20">
                          <Target className="w-3 h-3 text-indigo-400" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-slate-500 leading-none uppercase tracking-tighter">Meta Diária</span>
                          <span className="text-[11px] font-black text-slate-200 leading-tight">
                            {completedCount} / {user.dailyGoal}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end min-w-[70px]">
                        <span className={`text-[10px] font-black tracking-tight ${
                          remainingCount === 0 ? 'text-emerald-400' : 'text-amber-400'
                        }`}>
                          {remainingCount === 0 ? 'CONCLUÍDO! ✨' : `FALTAM ${remainingCount}`}
                        </span>
                        <div className="w-16 h-1 bg-slate-700 rounded-full mt-1 overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-1000 ease-out border-r border-white/10 ${
                              remainingCount === 0 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-indigo-500'
                            }`}
                            style={{ width: `${Math.min(100, (completedCount / user.dailyGoal) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

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
