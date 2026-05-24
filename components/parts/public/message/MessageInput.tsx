import { Loader, Send, Ban } from "lucide-react";

export function MessageInput({
  value,
  onChange,
  onSend,
  sending,
  disabled,
  chatroomEnabled,
}: {
  value: string;
  onChange: (val: string) => void;
  onSend: () => void;
  sending: boolean;
  disabled: boolean;
  chatroomEnabled: boolean;
}) {
  return (
    <div className="p-4 bg-white border-t border-slate-100">
      {!chatroomEnabled && (
        <div className="mb-3 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-600">
          <Ban size={16} />
          <p className="text-xs font-medium">
            Messaging is disabled. You can view messages but cannot send new ones.
          </p>
        </div>
      )}
      <div className="flex gap-2 bg-slate-100 p-2 rounded-2xl">
        <input
          type="text"
          placeholder="Write a message..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && onSend()}
          className="flex-1 bg-transparent border-none px-4 py-3 text-sm focus:ring-0 outline-none text-slate-800 placeholder:text-slate-400"
          disabled={sending || !chatroomEnabled}
        />
        <button
          onClick={onSend}
          disabled={!value.trim() || sending || !chatroomEnabled}
          className="bg-orange-500 text-white p-3 rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? (
            <Loader size={18} className="animate-spin" />
          ) : (
            <Send size={18} />
          )}
        </button>
      </div>
    </div>
  );
}
