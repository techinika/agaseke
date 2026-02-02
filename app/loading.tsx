"use client";

import React from "react";
import { motion } from "framer-motion";

const Loading = () => {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-orange-50/60 via-transparent to-transparent pointer-events-none" />

      <div className="relative flex flex-col items-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative mb-12"
        >
          {/* Pulsing Outer Glow */}
          <motion.div
            animate={{
              scale: [1, 1.4, 1],
              opacity: [0.2, 0.05, 0.2],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute -inset-8 bg-orange-400 rounded-lg blur-3xl"
          />

          {/* Rotating "Basket Weave" Border */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="absolute -inset-2 border-2 border-dashed border-orange-200 rounded-lg"
          />

          {/* Main Logo Box */}
          <motion.div
            animate={{
              y: [0, -10, 0],
              rotate: [0, 5, -5, 0],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="relative w-24 h-24 bg-slate-900 rounded-lg flex items-center justify-center shadow-2xl shadow-orange-200 overflow-hidden"
          >
            {/* The "a" from Agaseke */}
            <span className="text-white text-5xl font-black tracking-tighter select-none">
              a
            </span>

            {/* Liquid Fill Effect */}
            <motion.div
              animate={{
                top: ["100%", "30%", "100%"],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute inset-0 bg-orange-600/20"
            />

            <motion.div
              animate={{ x: ["-100%", "250%"] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1,
              }}
              className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent -skew-x-12"
            />
          </motion.div>
        </motion.div>

        <div className="flex flex-col items-center gap-2">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-1"
          >
            {"agaseke".split("").map((char, i) => (
              <motion.span
                key={i}
                animate={{
                  y: [0, -5, 0],
                  color: ["#0f172a", "#ea580c", "#0f172a"],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.1,
                  ease: "easeInOut",
                }}
                className="text-2xl font-black tracking-tighter text-slate-900"
              >
                {char}
              </motion.span>
            ))}
          </motion.div>

          <motion.p
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-[10px] font-black uppercase tracking-[0.4em] text-orange-600"
          >
            Murakoze Gutegereza
          </motion.p>
        </div>
      </div>

      <div className="absolute bottom-12 text-center px-6">
        <p className="text-xs font-bold text-slate-300 uppercase tracking-widest leading-loose">
          Powering the creator economy <br />
          <span className="text-slate-200">in the heart of Africa</span>
        </p>
      </div>
    </div>
  );
};

export default Loading;
