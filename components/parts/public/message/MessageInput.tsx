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
    <div className="p-4 bg-surface border-t border-line">
      {!chatroomEnabled && (
        <div className="mb-3 p-3 bg-danger-bg border border-danger-bg rounded-control flex items-center gap-2 text-danger">
          <Ban size={16} />
          <p className="text-xs font-medium">
            Messaging is disabled. You can view messages but cannot send new ones.
          </p>
        </div>
      )}
      <div className="flex gap-2 bg-surface-sunken p-2 rounded-card">
        <input
          type="text"
          placeholder="Write a message..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && onSend()}
          className="flex-1 bg-transparent border-none px-4 py-3 text-sm focus:ring-0 outline-none text-fg placeholder:text-muted-fg"
          disabled={sending || !chatroomEnabled}
        />
        <button
          onClick={onSend}
          disabled={!value.trim() || sending || !chatroomEnabled}
          className="bg-brand-strong text-on-brand p-3 rounded-control hover:bg-brand-strong transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
