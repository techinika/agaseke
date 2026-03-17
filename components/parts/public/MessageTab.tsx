import { ArrowRight, MessageCircle } from "lucide-react";
import { ProtectedSection } from "./ProtectedSection";

export const MessageTab = ({
  isLoggedIn,
  isSupporter,
  setIsModalOpen,
  name,
  handle,
}: {
  isLoggedIn: boolean;
  isSupporter: boolean;
  setIsModalOpen: any;
  name: string;
  handle: string;
}) => {
  return (
    <div className="animate-in fade-in duration-500">
      {!isLoggedIn ? (
        <ProtectedSection
          isLoggedIn={isLoggedIn}
          type="login"
          hasGifted={isSupporter}
          setIsModalOpen={setIsModalOpen}
          handle={handle}
        />
      ) : !isSupporter ? (
        <ProtectedSection
          isLoggedIn={isLoggedIn}
          type="gift"
          hasGifted={isSupporter}
          setIsModalOpen={setIsModalOpen}
          handle={handle}
        />
      ) : (
        <div className="flex flex-col h-[500px] bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center font-bold text-orange-600 text-xs">
              {name[0]}
            </div>
            <div>
              <p className="text-sm font-bold">{name}</p>
              <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest">
                Online
              </p>
            </div>
          </div>

          <div className="flex-1 p-6 flex flex-col justify-center items-center text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <MessageCircle size={32} className="text-slate-200" />
            </div>
            <h4 className="font-bold text-slate-900">No messages yet</h4>
            <p className="text-sm text-slate-500 max-w-[200px]">
              Send a message to start your conversation with{" "}
              {name.split(" ")[0]}.
            </p>
          </div>

          <div className="p-4 bg-white border-t border-slate-50">
            <div className="flex gap-2 bg-slate-100 p-2 rounded-2xl">
              <input
                type="text"
                placeholder="Write a message..."
                className="flex-1 bg-transparent border-none px-4 text-sm focus:ring-0 outline-none"
              />
              <button className="bg-slate-900 text-white p-3 rounded-xl hover:bg-orange-600 transition-colors">
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
