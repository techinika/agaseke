import { Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";

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
    <Dialog
      open
      onClose={onClose}
      title="Broadcast Email"
      description={`Send an email to ${recipientCount} supporter${recipientCount !== 1 ? "s" : ""}`}
      size="lg"
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" fullWidth onClick={onClose}>
            Cancel
          </Button>
          <Button
            fullWidth
            onClick={onSend}
            disabled={sending || !emailForm.subject || !emailForm.message}
            loading={sending}
            leadingIcon={<Send className="size-4" />}
          >
            {sending ? "Sending..." : "Send Email"}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <Input
          label="Subject *"
          value={emailForm.subject}
          onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
          placeholder="Enter email subject"
        />

        <Textarea
          label="Message *"
          hint="Use [NAME] to personalize with supporter's name"
          value={emailForm.message}
          onChange={(e) => setEmailForm({ ...emailForm, message: e.target.value })}
          placeholder="Write your message here..."
          className="min-h-48"
        />

        <div className="rounded-control bg-info-bg p-4 text-label text-info">
          <p>
            Tip: Personalize your message by using [NAME] where you want the
            supporter&apos;s name to appear.
          </p>
        </div>
      </div>
    </Dialog>
  );
}
