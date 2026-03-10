import React from 'react';
import { Beaker } from 'lucide-react';

const TestManagement: React.FC = () => {
    return (
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden mb-8 relative">
            <div className="p-8 space-y-10">
                <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                    <div className="p-1.5 bg-indigo-50 rounded-md">
                        <Beaker className="w-5 h-5 text-indigo-600" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 tracking-tight">
                        Gestão de Testes
                    </h2>
                </div>
                <div className="text-center py-12">
                    <Beaker className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-600">Área de Testes</h3>
                    <p className="text-slate-500 max-w-md mx-auto mt-2">
                        Esta área será dedicada ao gerenciamento de roteiros, planos e execuções de testes.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default TestManagement;
