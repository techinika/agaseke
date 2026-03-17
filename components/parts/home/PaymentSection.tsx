"use client"

import { CreditCard, Smartphone, Plus } from "lucide-react";
import { FaCcVisa, FaCcMastercard, FaCcAmex } from "react-icons/fa";

export function PaymentMethods() {
  return (
    <section className="py-12 border-b border-slate-50">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
          
          <div className="text-center md:text-left">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-1">
              Supported Methods
            </p>
            <h3 className="text-sm font-bold text-slate-900">Get paid via:</h3>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 opacity-60 grayscale hover:grayscale-0 transition-all duration-700">
            
            {/* Mobile Money - The most important one */}
            <div className="flex items-center gap-2 group cursor-default">
              <div className="bg-yellow-400 p-1.5 rounded-md group-hover:shadow-lg transition-all">
                <Smartphone size={18} className="text-slate-900" />
              </div>
              <span className="font-black text-xs uppercase tracking-tighter">Mobile Money</span>
            </div>

            {/* Cards */}
            <div className="flex items-center gap-6">
              <FaCcVisa size={32} className="text-blue-600" title="Visa" />
              <FaCcMastercard size={32} className="text-orange-500" title="Mastercard" />
              <FaCcAmex size={32} className="text-blue-400" title="American Express" />
            </div>

            {/* Coming Soon */}
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-full border border-dashed border-slate-200">
              <Plus size={12} className="text-slate-400" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">More coming</span>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}