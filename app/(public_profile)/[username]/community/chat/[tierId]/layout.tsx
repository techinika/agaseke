import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Subscriber Chat | Agaseke",
  robots: { index: false, follow: false },
};

export default function SubscriberChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}