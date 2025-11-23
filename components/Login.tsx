
import React, { useState } from 'react';
import { KeyRound, User as UserIcon, ArrowRight, ShieldCheck, Bug, Sparkles, ScrollText } from 'lucide-react';

interface LoginProps {
  onLogin: (acronym: string, password: string) => void;
  error: string | null;
}

const Login: React.FC<LoginProps> = ({ onLogin, error }) => {
  const [acronym, setAcronym] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Pass raw values to allow case-insensitive handling in parent
    onLogin(acronym, password);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-slate-900">
      
      {/* Background Gradient */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950"></div>

      {/* Main Card */}
      <div className="relative z-10 max-w-4xl w-full mx-4 flex flex-col md:flex-row bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
        
        {/* Left Side - Thematic Content */}
        <div className="md:w-1/2 p-10 flex flex-col justify-between bg-gradient-to-br from-indigo-900/80 to-purple-900/80 text-white relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-400 to-pink-400"></div>
            
            <div className="mt-8">
                <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-4 drop-shadow-lg">
                   Evidências <br/>
                   <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-pink-300">
                     de Teste QA
                   </span>
                </h1>
                <p className="text-indigo-100 text-lg font-light leading-relaxed">
                   Aqui até os bugs entram na fila e aprendem a se comportar.<br/>
                   Os chamados ganham status, os cenários criam juízo e os casos fazem pose.<br/>
                   No fim, é quase um zoológico… só que organizado.
                </p>
            </div>

            <div className="mt-12 md:mt-0">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
                    <p className="text-sm font-medium flex items-center gap-3 text-yellow-100 italic">
                        <Sparkles className="w-5 h-5 flex-shrink-0 animate-pulse" />
                        "Melhorando a vida do povo de Nárnia : )"
                    </p>
                </div>
            </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="md:w-1/2 p-10 bg-white/95 backdrop-blur-xl">
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-indigo-50 mb-4">
                    <ShieldCheck className="w-7 h-7 text-indigo-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800">Bem-vindo</h2>
                <p className="text-slate-500 text-sm">Insira suas credenciais para acessar.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide ml-1">
                        Sigla do Usuário
                    </label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <UserIcon className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        </div>
                        <input
                            type="text"
                            maxLength={3}
                            value={acronym}
                            onChange={(e) => setAcronym(e.target.value)}
                            className="block w-full pl-10 pr-3 py-3.5 border-2 border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-0 transition-all font-mono text-center text-lg tracking-widest font-bold bg-slate-50 focus:bg-white"
                            placeholder="XXX"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide ml-1">
                        Senha
                    </label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <KeyRound className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        </div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="block w-full pl-10 pr-3 py-3.5 border-2 border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-0 transition-all bg-slate-50 focus:bg-white"
                            placeholder="••••••"
                            required
                        />
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm text-center font-medium flex items-center justify-center gap-2 animate-shake">
                        <Bug className="w-4 h-4" />
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    className="w-full group relative flex justify-center items-center py-4 px-4 border border-transparent rounded-xl text-sm font-bold text-white bg-slate-900 hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300 shadow-lg hover:shadow-indigo-200"
                >
                    <span className="flex items-center gap-2">
                        ACESSAR O SISTEMA
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                </button>
            </form>

            <div className="mt-8 flex justify-center">
                <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                    <ScrollText className="w-3 h-3" />
                    Versão 2.5.0 (Narnia Edition)
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
