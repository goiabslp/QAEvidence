
import React from 'react';
import { Bug, Crosshair } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 border-t border-slate-800 mt-auto relative z-50">
      <div className="max-w-7xl mx-auto py-4 px-6 sm:px-8">
        <div className="flex justify-between items-center h-14">
          {/* Left: Bug with Target Design */}
          <div className="relative flex items-center justify-center group select-none cursor-default">
             {/* Target / Crosshair */}
             <Crosshair 
                className="w-14 h-14 text-slate-800 group-hover:text-red-900/60 transition-all duration-500" 
                strokeWidth={1.5} 
             />
             {/* Bug in the center */}
             <div className="absolute inset-0 flex items-center justify-center">
                <Bug className="w-6 h-6 text-slate-700 group-hover:text-red-500 transition-colors duration-300" />
             </div>
          </div>

          {/* Right: QA Tester Signature */}
          <div className="select-none">
             <span className="text-2xl font-black text-slate-700 hover:text-slate-600 tracking-tight uppercase transition-colors">
                QA Tester
             </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
