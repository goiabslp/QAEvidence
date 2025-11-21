
import React, { useState } from 'react';
import { User } from '../types';
import { KeyRound, User as UserIcon, ArrowRight, ShieldCheck } from 'lucide-react';

interface LoginProps {
  onLogin: (acronym: string, password: string) => void;
  error: string | null;
}

const Login: React.FC<LoginProps> = ({ onLogin, error }) => {
  const [acronym, setAcronym] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(acronym.toUpperCase(), password);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-20">
         <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-600 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
         <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-emerald-600 rounded-full mix-blend-multiply filter blur-3xl animate-pulse delay-1000"></div>
         <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-pink-600 rounded-full mix-blend-multiply filter blur-3xl animate-pulse delay-2000"></div>
      </div>

      <div className="max-w-md w-full bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/10 p-8 relative z-10">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-gradient-to-tr from-indigo-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg mb-4">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">Portal NARNIA</h2>
          <p className="text-slate-400 text-sm">Sistema de Gestão de Evidências QA</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 ml-1">
              Sigla do Usuário
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <UserIcon className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                maxLength={3}
                value={acronym}
                onChange={(e) => setAcronym(e.target.value.toUpperCase())}
                className="block w-full pl-10 pr-3 py-3 border border-slate-600 rounded-xl leading-5 bg-slate-800/50 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all text-center font-mono tracking-widest uppercase"
                placeholder="XXX"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 ml-1">
              Senha
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <KeyRound className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-slate-600 rounded-xl leading-5 bg-slate-800/50 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
                placeholder="••••••"
                required
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg text-sm text-center animate-shake">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all transform hover:-translate-y-0.5"
          >
            Acessar Sistema
            <ArrowRight className="ml-2 h-4 w-4" />
          </button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-white/10 text-center">
           <p className="text-xs text-slate-500">
             Acesso restrito a pessoal autorizado.
           </p>
        </div>
      </div>
      
      <div className="absolute bottom-4 text-slate-600 text-xs">
        Melhorando a vida do povo de NARNIA : )
      </div>
    </div>
  );
};

export default Login;
