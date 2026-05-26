import React, { useState } from 'react';
import { Database, AlertTriangle, Copy, Check, RefreshCw, Code } from 'lucide-react';

const SupabaseConfigErrorScreen: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const envTemplate = `# Configurações do Supabase para o QAEvidence Tracker
VITE_SUPABASE_URL=https://seu-projeto-supabase.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-key-aqui
VITE_GEMINI_API_KEY="seu-token-da-gemini-aqui"`;

  const handleCopy = () => {
    navigator.clipboard.writeText(envTemplate);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDelay: '2s' }}></div>

      {/* Main glass card */}
      <div className="max-w-2xl w-full bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-8 md:p-10 shadow-2xl relative z-10 animate-fade-in">
        {/* Header Section */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="relative mb-4">
            <div className="absolute inset-0 bg-rose-500/20 rounded-full blur-lg animate-ping pointer-events-none"></div>
            <div className="w-16 h-16 bg-rose-500/15 border border-rose-500/30 rounded-full flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-8 h-8" />
            </div>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Configuração Ausente
          </h1>
          <p className="mt-2 text-slate-400 text-sm md:text-base max-w-md">
            As variáveis de ambiente do <span className="text-indigo-400 font-semibold">Supabase</span> não foram fornecidas. O aplicativo precisa delas para se conectar ao banco de dados.
          </p>
        </div>

        {/* Informative Error details */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 mb-8 flex items-start space-x-3 text-xs md:text-sm text-slate-400">
          <Database className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-200 block mb-1">Erro Detectado</span>
            O cliente Supabase não pôde ser inicializado porque <code className="text-indigo-300 font-mono">VITE_SUPABASE_URL</code> ou <code className="text-indigo-300 font-mono">VITE_SUPABASE_ANON_KEY</code> estão nulos ou indefinidos no build.
          </div>
        </div>

        {/* Step-by-Step Instructions */}
        <div className="space-y-6 mb-8">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center">
            <Code className="w-4 h-4 mr-2 text-indigo-400" /> Como resolver:
          </h2>

          {/* Local */}
          <div className="relative group pl-6 border-l-2 border-indigo-500/30 hover:border-indigo-500 transition-colors">
            <div className="absolute -left-[6px] top-1 w-2.5 h-2.5 rounded-full bg-slate-950 border border-indigo-500 group-hover:bg-indigo-500 transition-colors"></div>
            <h3 className="text-sm font-bold text-slate-200">1. Executando Localmente</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Crie ou edite o arquivo <code className="text-indigo-300 font-mono font-semibold bg-indigo-950/40 px-1.5 py-0.5 rounded border border-indigo-900/40">.env</code> na raiz do projeto e insira as chaves corretas.
            </p>
            
            {/* Code Block */}
            <div className="mt-3 relative bg-slate-950 rounded-lg p-4 font-mono text-[11px] md:text-xs text-slate-300 border border-slate-800/80 select-all overflow-x-auto">
              <button 
                onClick={handleCopy}
                className="absolute top-2 right-2 p-1.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition-all text-slate-400 hover:text-slate-200 active:scale-95 animate-fade-in"
                title="Copiar modelo"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400 animate-zoom-in" /> : <Copy className="w-4 h-4" />}
              </button>
              <pre className="pr-8">{envTemplate}</pre>
            </div>
            
            <p className="text-[11px] text-amber-400/90 mt-2 flex items-center">
              ⚠️ Importante: Após criar o arquivo .env, reinicie o servidor executando <code className="font-mono bg-amber-950/20 px-1 py-0.5 rounded ml-1 border border-amber-900/30">npm run dev</code>.
            </p>
          </div>

          {/* Cloud */}
          <div className="relative group pl-6 border-l-2 border-indigo-500/30 hover:border-indigo-500 transition-colors">
            <div className="absolute -left-[6px] top-1 w-2.5 h-2.5 rounded-full bg-slate-950 border border-indigo-500 group-hover:bg-indigo-500 transition-colors"></div>
            <h3 className="text-sm font-bold text-slate-200">2. Deploy em Produção (Vercel, Netlify, Cloud)</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Adicione as variáveis <code className="text-slate-300 font-mono">VITE_SUPABASE_URL</code> e <code className="text-slate-300 font-mono">VITE_SUPABASE_ANON_KEY</code> nas configurações de <strong>Environment Variables</strong> (Variáveis de Ambiente) do painel da sua hospedagem e execute um novo build do projeto.
            </p>
          </div>
        </div>

        {/* Buttons / Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-800/80">
          <button
            onClick={() => window.location.reload()}
            className="flex-1 group relative overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3.5 text-white font-bold text-sm shadow-lg shadow-indigo-950/30 transition-all duration-300 hover:shadow-indigo-900/50 hover:-translate-y-0.5 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
            <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
            Recarregar Página
          </button>
        </div>
      </div>
    </div>
  );
};

export default SupabaseConfigErrorScreen;
