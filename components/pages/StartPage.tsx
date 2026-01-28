"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  query,
  collection,
  where,
  getDocs,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import {
  Chrome,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Sparkles,
  LogOut,
} from "lucide-react";
import { auth, db } from "@/db/firebase";
import Loading from "@/app/loading";

const StartPage = () => {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkingUsername, setCheckingUsername] = useState(false);

  // Form State
  const [form, setForm] = useState({ username: "", bio: "" });
  const [usernameStatus, setUsernameStatus] = useState(null); // 'available', 'taken', 'short'

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          router.push("/space");
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      setLoading(true);
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login Error:", error);
      setLoading(false);
    }
  };

  const handleUsernameChange = async (e) => {
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "");
    setForm({ ...form, username: val });

    if (val.length < 3) {
      setUsernameStatus("short");
      return;
    }

    setCheckingUsername(true);
    const q = query(collection(db, "users"), where("username", "==", val));
    const querySnapshot = await getDocs(q);

    setUsernameStatus(querySnapshot.empty ? "available" : "taken");
    setCheckingUsername(false);
  };

  const finishOnboarding = async () => {
    if (usernameStatus !== "available" || !user) return;

    setLoading(true);
    try {
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        username: form.username,
        bio: form.bio,
        defaultSpace: "creator", // Initial space
        createdAt: new Date(),
        balance: 0,
      });
      router.push("/space");
    } catch (error) {
      console.error("Error creating profile:", error);
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-100 rounded-full blur-3xl opacity-50" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-purple-100 rounded-full blur-3xl opacity-50" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl z-10"
      >
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-indigo-600 rounded-[2rem] flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-indigo-200 mb-4">
            n
          </div>
          <h1 className="text-2xl font-black text-slate-900">
            ndafana<span className="text-indigo-600">.rw</span>
          </h1>
        </div>

        <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-2xl shadow-slate-200/50 border border-white relative overflow-hidden">
          <AnimatePresence mode="wait">
            {!user ? (
              /* --- VIEW 1: AUTHENTICATION --- */
              <motion.div
                key="auth"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="text-center"
              >
                <h2 className="text-3xl font-black mb-4">Start your journey</h2>
                <p className="text-slate-500 mb-10 text-lg">
                  Join 1,000+ creators getting supported by their fans locally.
                </p>

                <button
                  onClick={handleLogin}
                  className="w-full py-5 bg-white border-2 border-slate-100 rounded-3xl flex items-center justify-center gap-4 text-xl font-bold text-slate-700 hover:border-indigo-600 hover:bg-indigo-50 transition-all active:scale-[0.98]"
                >
                  <Chrome className="text-red-500" />
                  Continue with Google
                </button>
                <p className="mt-8 text-sm text-slate-400">
                  Secure. Fast. Made for Rwanda.
                </p>
              </motion.div>
            ) : (
              /* --- VIEW 2: PROFILE SETUP --- */
              <motion.div
                key="setup"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-8"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={user.photoURL}
                      className="w-10 h-10 rounded-full border-2 border-indigo-100"
                      alt="User"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Signed in as
                      </p>
                      <p className="text-sm font-black text-slate-900">
                        {user.displayName}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => signOut(auth)}
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <LogOut size={20} />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Username Field */}
                  <div className="space-y-3">
                    <label className="text-sm font-black text-slate-700 ml-1">
                      Claim your link
                    </label>
                    <div className="relative">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                        ndafana.rw/
                      </div>
                      <input
                        type="text"
                        placeholder="username"
                        value={form.username}
                        onChange={handleUsernameChange}
                        className={`w-full pl-[6.5rem] pr-12 py-5 bg-slate-50 border-2 rounded-[1.5rem] outline-none font-bold transition-all ${
                          usernameStatus === "available"
                            ? "border-green-500 bg-green-50/30"
                            : usernameStatus === "taken"
                            ? "border-red-400 bg-red-50/30"
                            : "border-slate-100"
                        }`}
                      />
                      <div className="absolute right-5 top-1/2 -translate-y-1/2">
                        {checkingUsername && (
                          <Loader2
                            className="animate-spin text-indigo-600"
                            size={20}
                          />
                        )}
                        {usernameStatus === "available" && (
                          <CheckCircle2 className="text-green-500" size={20} />
                        )}
                        {usernameStatus === "taken" && (
                          <AlertCircle className="text-red-500" size={20} />
                        )}
                      </div>
                    </div>
                    {usernameStatus === "taken" && (
                      <p className="text-xs font-bold text-red-500 ml-2">
                        This name is already claimed.
                      </p>
                    )}
                  </div>

                  {/* Bio Field */}
                  <div className="space-y-3">
                    <label className="text-sm font-black text-slate-700 ml-1">
                      About your work
                    </label>
                    <textarea
                      placeholder="I'm creating music, art, and storytelling in Kigali..."
                      value={form.bio}
                      onChange={(e) =>
                        setForm({ ...form, bio: e.target.value })
                      }
                      className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] outline-none font-medium transition-all focus:border-indigo-600 resize-none h-32"
                    />
                  </div>

                  {/* Submit */}
                  <button
                    onClick={finishOnboarding}
                    disabled={usernameStatus !== "available"}
                    className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50 disabled:grayscale transition-all flex items-center justify-center gap-3"
                  >
                    Launch my page <ArrowRight size={22} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Progress Indicator */}
          <div className="mt-10 pt-6 border-t border-slate-50 flex items-center justify-center gap-4">
            <div
              className={`h-1.5 w-12 rounded-full ${
                !user ? "bg-indigo-600" : "bg-slate-200"
              }`}
            />
            <div
              className={`h-1.5 w-12 rounded-full ${
                user ? "bg-indigo-600" : "bg-slate-200"
              }`}
            />
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 text-slate-400 text-sm font-medium">
          <Sparkles size={16} className="text-indigo-400" /> Free to use. We
          only grow when you grow.
        </div>
      </motion.div>
    </div>
  );
};

export default StartPage;
