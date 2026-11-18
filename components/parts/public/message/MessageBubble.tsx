import { Message } from "./types";

export function MessageBubble({
  message,
  isOwn,
}: {
  message: Message;
  isOwn: boolean;
}) {
  return (
    <div
      className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[80%] px-4 py-3 rounded-card ${
          isOwn
            ? "bg-brand-strong text-on-brand rounded-br-md"
            : "bg-surface border border-line text-fg rounded-bl-md shadow-sm"
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <p
          className={`text-caption mt-1 ${
            isOwn ? "text-brand-strong" : "text-muted-fg"
          }`}
        >
          {message.createdAt?.toDate?.().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }) || "Sending..."}
        </p>
      </div>
    </div>
  );
}
