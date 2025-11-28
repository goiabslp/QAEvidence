import React from 'react';
import { Bug } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 border-t border-slate-800 mt-auto relative z-50 overflow-hidden py-4">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="flex justify-between items-center select-none pointer-events-none opacity-40">
            
            {/* Left Side: Smaller BUG Icon */}
            <div className="transform -rotate-12">
                <Bug className="w-8 h-8 md:w-12 md:h-12 text-slate-700" strokeWidth={1.5} />
            </div>

            {/* Right Side: Smaller QA Tester Text */}
            <h2 className="text-2xl md:text-4xl font-black text-slate-700 tracking-tighter text-right leading-none">
                QA Tester
            </h2>
        </div>
      </div>
    </footer>
  );
};

export default Footer;