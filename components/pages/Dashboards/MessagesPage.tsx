"use client";

import React, { useState } from "react";
import {
  Search,
  Send,
  Lock,
  MessageSquare,
  Construction,
  MoreVertical,
} from "lucide-react";

export default function MessagesPage() {
  const [selectedChat, setSelectedChat] = useState<string | null>("1");

  const chats = [
    {
      id: "1",
      supporterName: "Innocent K.",
      lastMessage: "I really loved the Street Art Walk! When is the next one?",
      time: "2h ago",
      unread: true,
      avatar: "IK",
      supportLevel: "VIP",
    },
    {
      id: "2",
      supporterName: "Marie-Rose U.",
      lastMessage: "Sent you a small tip for the digital brushes. Keep it up!",
      time: "1d ago",
      unread: false,
      avatar: "MU",
      supportLevel: "Supporter",
    },
  ];

  const messages = [
    {
      id: "m1",
      sender: "supporter",
      text: "Hello! I really loved the Street Art Walk! When is the next one?",
      time: "10:15 AM",
    },
    {
      id: "m2",
      sender: "creator",
      text: "Glad you enjoyed it! I am planning another one for late February.",
      time: "10:20 AM",
    },
    {
      id: "m3",
      sender: "supporter",
      text: "Perfect, I'll be there. Will it be the same location?",
      time: "10:22 AM",
    },
  ];

  return (
    <div className="relative min-h-[calc(100vh-70px)] bg-white flex overflow-hidden">
      {/* --- UNDER DEVELOPMENT OVERLAY --- */}
      <div className="absolute inset-0 z-[100] backdrop-blur-[2px] bg-slate-900/10 flex items-center justify-center p-6">
        <div className="bg-white border-2 border-slate-900 shadow-[20px_20px_0px_0px_rgba(15,23,42,1)] rounded-[2.5rem] p-10 max-w-md text-center animate-in zoom-in-95 duration-300">
          <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-3xl flex items-center justify-center mx-auto mb-6 rotate-3">
            <Construction size={40} />
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tighter mb-4">
            Under Development
          </h2>
          <p className="text-slate-500 font-medium leading-relaxed mb-8">
            We are building a secure way for you to connect with your
            supporters. Direct messaging will be available soon for creators
            with verified phone numbers.
          </p>
          <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-t border-slate-100 pt-6">
            <Lock size={12} /> Interactions are currently disabled
          </div>
        </div>
      </div>

      {/* --- Sidebar: Chat List --- */}
      <aside className="w-full md:w-80 lg:w-96 border-r border-slate-100 flex flex-col bg-slate-50/50">
        <div className="p-6">
          <h1 className="text-2xl font-black uppercase mb-6">
            Messages
          </h1>
          <div className="relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
              size={18}
            />
            <input
              type="text"
              placeholder="Search supporters..."
              className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-12 pr-4 text-sm outline-none focus:ring-2 focus:ring-orange-100 transition"
              disabled
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 space-y-1">
          {chats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => setSelectedChat(chat.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-[1.5rem] transition-all ${
                selectedChat === chat.id
                  ? "bg-white shadow-sm border border-slate-100"
                  : "hover:bg-slate-100"
              }`}
            >
              <div className="relative">
                <div className="w-12 h-12 bg-slate-200 rounded-2xl flex items-center justify-center font-black text-slate-500">
                  {chat.avatar}
                </div>
                {chat.unread && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-600 border-2 border-white rounded-full" />
                )}
              </div>
              <div className="flex-1 text-left overflow-hidden">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-sm truncate">
                    {chat.supporterName}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    {chat.time}
                  </span>
                </div>
                <p className="text-xs text-slate-400 truncate">
                  {chat.lastMessage}
                </p>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* --- Main Chat Area --- */}
      <main className="flex-1 flex flex-col bg-white">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <header className="p-6 border-b border-slate-50 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center font-bold">
                  {chats.find((c) => c.id === selectedChat)?.avatar}
                </div>
                <div>
                  <h3 className="font-bold text-sm">
                    {chats.find((c) => c.id === selectedChat)?.supporterName}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Online
                    </span>
                  </div>
                </div>
              </div>
              <button className="p-2 text-slate-300 hover:text-slate-900 transition">
                <MoreVertical size={20} />
              </button>
            </header>

            {/* Messages Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
              <div className="flex justify-center">
                <span className="text-[10px] font-black uppercase text-slate-300 tracking-[0.2em] bg-white px-4 py-1 rounded-full border border-slate-100">
                  Today
                </span>
              </div>
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.sender === "creator" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] p-4 rounded-[1.5rem] text-sm font-medium leading-relaxed ${
                      m.sender === "creator"
                        ? "bg-slate-900 text-white rounded-tr-none"
                        : "bg-white border border-slate-100 text-slate-700 rounded-tl-none shadow-sm"
                    }`}
                  >
                    {m.text}
                    <div
                      className={`text-[9px] mt-2 font-bold uppercase opacity-50 ${m.sender === "creator" ? "text-right" : "text-left"}`}
                    >
                      {m.time}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Input Area */}
            <footer className="p-6 bg-white border-t border-slate-50">
              <div className="flex items-center gap-4 bg-slate-50 p-2 pl-6 rounded-2xl border border-transparent focus-within:bg-white focus-within:border-slate-200 transition-all">
                <input
                  type="text"
                  placeholder="Type your reply..."
                  className="flex-1 bg-transparent outline-none text-sm font-medium"
                  disabled
                />
                <button className="bg-slate-900 text-white p-3 rounded-xl opacity-50 cursor-not-allowed">
                  <Send size={18} />
                </button>
              </div>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300 p-12 text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-4xl flex items-center justify-center mb-6">
              <MessageSquare size={40} className="opacity-20" />
            </div>
            <h3 className="text-xl font-black uppercase mb-2">
              Your Conversations
            </h3>
            <p className="text-sm font-medium max-w-xs text-slate-400">
              Select a supporter from the left to view your message history.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
