"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Home, ArrowLeft, Search, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";

const NotFound = () => {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-orange-50 rounded-full blur-[120px] opacity-60" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-slate-50 rounded-full blur-[120px] opacity-60" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="relative mb-8">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-[12rem] md:text-[16rem] font-black leading-none tracking-tighter text-slate-900/5 select-none"
          >
            404
          </motion.h1>

          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="bg-white p-8 rounded-lg shadow-2xl shadow-orange-100 border border-orange-50 relative">
              <motion.div
                animate={{
                  rotate: [0, 10, -10, 0],
                  y: [0, -5, 0],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 4,
                  ease: "easeInOut",
                }}
                className="w-20 h-20 bg-orange-600 rounded-lg flex items-center justify-center text-white"
              >
                <Search size={40} strokeWidth={3} />
              </motion.div>

              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg">
                <MapPin size={14} className="text-orange-600" />
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="max-w-md"
        >
          <h2 className="text-3xl font-black tracking-tighter text-slate-900 mb-4">
            This Agaseke does not exist yet!
          </h2>
          <p className="text-slate-500 font-medium leading-relaxed mb-10">
            It looks like this space hasn&lsquo;t been woven yet, or the link
            has moved. Don&apos;t worry, even the best storytellers get lost
            sometimes.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/"
              className="flex items-center justify-center gap-3 bg-slate-900 text-white px-8 py-4 rounded-lg font-black transition-all hover:bg-orange-600 active:scale-95 shadow-xl shadow-slate-200"
            >
              <Home size={18} /> Go To Home
            </Link>

            <button
              onClick={() => router.refresh()}
              className="flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-600 px-8 py-4 rounded-lg font-black transition-all hover:border-slate-900 hover:text-slate-900 active:scale-95"
            >
              <ArrowLeft size={18} /> Try Again
            </button>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ delay: 0.8 }}
          className="mt-20 text-[10px] font-black uppercase tracking-[0.4em] text-slate-400"
        >
          Agaseke for Creators
        </motion.p>
      </div>
    </div>
  );
};

export default NotFound;
