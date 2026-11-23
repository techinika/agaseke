import { redirect } from "next/navigation";

export default async function MessagesRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ chat?: string }>;
}) {
  const params = await searchParams;
  const chat = params?.chat;
  if (chat) {
    redirect(`/creator/supporters?tab=messages&chat=${encodeURIComponent(chat)}`);
  }
  redirect("/creator/supporters?tab=messages");
}
