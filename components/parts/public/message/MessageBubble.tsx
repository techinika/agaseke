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
        className={`max-w-[80%] px-4 py-3 rounded-2xl ${
          isOwn
            ? "bg-orange-500 text-white rounded-br-md"
            : "bg-card border border-border text-foreground rounded-bl-md shadow-sm"
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <p
          className={`text-[10px] mt-1 ${
            isOwn ? "text-orange-100" : "text-muted-foreground"
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
