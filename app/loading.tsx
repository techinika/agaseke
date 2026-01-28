"use client"

import React from "react";
import { motion } from "framer-motion";

const Loading = () => {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-50/40 via-transparent to-transparent pointer-events-none" />

      <div className="relative flex flex-col items-center">
        {/* Animated Logo Container */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative mb-8"
        >
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.1, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute -inset-4 bg-indigo-500 rounded-[2.5rem] blur-xl"
          />

          {/* Main Logo Box */}
          <div className="relative w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-indigo-200 overflow-hidden">
            <span className="text-white text-4xl font-black">n</span>
            {/* Shimmer Effect over the logo */}
            <motion.div
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
            />
          </div>
        </motion.div>

        {/* Loading Text */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-slate-900 font-bold tracking-tight text-lg mb-4"
        >
          Loading data...
        </motion.p>

        {/* Staggered Loading Dots */}
        <div className="flex gap-1.5">
          {[0, 1, 2].map((index) => (
            <motion.div
              key={index}
              animate={{
                scale: [1, 1.5, 1],
                backgroundColor: ["#6366f1", "#a5b4fc", "#6366f1"],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: index * 0.2,
                ease: "easeInOut",
              }}
              className="w-2 h-2 rounded-full bg-indigo-600"
            />
          ))}
        </div>
      </div>

      {/* Footer Branding */}
      <div className="absolute bottom-10">
        <p className="text-xs font-bold text-slate-300 uppercase tracking-[0.2em]">
          ndafana Secure Cloud
        </p>
      </div>
    </div>
  );
};

export default Loading;
