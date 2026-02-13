import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { NotificationProvider } from "@/components/providers/NotificationProvider";

export default async function TasksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user || !(session.user as any).id) {
    redirect("/auth");
  }

  return (
    <NotificationProvider userId={(session.user as any).id}>
      {children}
    </NotificationProvider>
  );
}
