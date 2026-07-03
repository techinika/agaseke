import React from "react";
import { X, Loader, Send } from "lucide-react";

export default function BroadcastEmailModal({
  emailForm,
  setEmailForm,
  onClose,
  onSend,
  sending,
  recipientCount,
}: {
  emailForm: { subject: string; message: string };
  setEmailForm: (form: { subject: string; message: string }) => void;
  onClose: () => void;
  onSend: () => void;
  sending: boolean;
  recipientCount: number;
}) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 overflow-y-auto">
      <div className="bg-card w-full max-w-xl rounded-lg p-8 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold uppercase tracking-tighter">
              Broadcast Email
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Send an email to {recipientCount} supporter{recipientCount !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-card-hover rounded-full transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest block mb-2">
              Subject *
            </label>
            <input
              type="text"
              value={emailForm.subject}
              onChange={(e) =>
                setEmailForm({ ...emailForm, subject: e.target.value })
              }
              className="w-full bg-muted p-4 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-orange-100"
              placeholder="Enter email subject"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest block mb-2">
              Message *
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              Use [NAME] to personalize with supporter&apos;s name
            </p>
            <textarea
              value={emailForm.message}
              onChange={(e) =>
                setEmailForm({ ...emailForm, message: e.target.value })
              }
              className="w-full bg-muted p-4 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-orange-100 h-48 resize-none"
              placeholder="Write your message here..."
            />
          </div>

          <div className="bg-orange-50 rounded-lg p-4 text-sm">
            <p className="text-orange-800 font-medium">
              Tip: Personalize your message by using [NAME] where you want the
              supporter&apos;s name to appear.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-4 border border-border-strong rounded-lg font-bold hover:bg-muted transition"
            >
              Cancel
            </button>
            <button
              onClick={onSend}
              disabled={sending || !emailForm.subject || !emailForm.message}
              className="flex-1 bg-orange-600 text-white py-4 rounded-lg font-bold hover:bg-orange-700 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <Loader className="animate-spin" size={16} />
              ) : (
                <Send size={16} />
              )}
              {sending ? "Sending..." : "Send Email"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
