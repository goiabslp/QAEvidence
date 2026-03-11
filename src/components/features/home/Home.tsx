import React from 'react';
import { FileText, ListChecks, ArrowRight } from 'lucide-react';
import { User } from '../../../types';

interface HomeProps {
    user: User;
    onNavigate: (module: 'TICKET' | 'TESTS') => void;
}

const Home: React.FC<HomeProps> = ({ user, onNavigate }) => {
    return (
        <div className="flex flex-col items-center justify-center w-full h-[calc(100vh-120px)] px-4 animate-in fade-in zoom-in-95 duration-500 overflow-hidden">
            
            <div className="text-center mb-12 space-y-4">
                <div className="inline-block p-2 bg-indigo-50 rounded-2xl mb-2">
                    <span className="text-xl">👋</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-black text-slate-800 tracking-tight">
                    Olá, <span className="text-indigo-600">{user.acronym}</span>.
                </h1>
                <p className="text-lg md:text-xl text-slate-500 font-medium max-w-lg mx-auto leading-relaxed">
                    O que você gostaria de fazer hoje?
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 w-full max-w-4xl mx-auto">
                {/* Card 1: Novo Chamado */}
                <button
                    onClick={() => onNavigate('TICKET')}
                    className="group relative flex flex-col items-center text-center p-8 bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-300 transition-all duration-300 hover:-translate-y-1 overflow-hidden h-full"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/0 to-indigo-50/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="w-20 h-20 bg-indigo-100 rounded-2xl flex items-center justify-center mb-6 text-indigo-600 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-inner">
                        <FileText className="w-10 h-10" />
                    </div>
                    
                    <h3 className="text-2xl font-bold text-slate-800 mb-3 group-hover:text-indigo-900 transition-colors">
                        Novo Chamado
                    </h3>
                    
                    <p className="text-slate-500 mb-8 max-w-[250px] leading-relaxed group-hover:text-slate-600 transition-colors">
                        Acesse o módulo para registrar ou editar um ticket de QA Evidence.
                    </p>
                    
                    <div className="flex items-center gap-2 text-indigo-600 font-bold opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                        Acessar módulo 
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </div>
                </button>

                {/* Card 2: Planilha de Testes */}
                <button
                    onClick={() => onNavigate('TESTS')}
                    className="group relative flex flex-col items-center text-center p-8 bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-emerald-300 transition-all duration-300 hover:-translate-y-1 overflow-hidden h-full"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/0 to-emerald-50/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="w-20 h-20 bg-emerald-100 rounded-2xl flex items-center justify-center mb-6 text-emerald-600 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 shadow-inner">
                        <ListChecks className="w-10 h-10" />
                    </div>
                    
                    <h3 className="text-2xl font-bold text-slate-800 mb-3 group-hover:text-emerald-900 transition-colors">
                        Planilha de Testes
                    </h3>
                    
                    <p className="text-slate-500 mb-8 max-w-[250px] leading-relaxed group-hover:text-slate-600 transition-colors">
                        Acesse a tela global da Planilha de Testes para visualizar e operar os registros.
                    </p>
                    
                    <div className="flex items-center gap-2 text-emerald-600 font-bold opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                        Acessar módulo 
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </div>
                </button>
            </div>
            
        </div>
    );
};

export default Home;
