import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { NotificationProvider } from "@/components/providers/NotificationProvider";

export default async function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user || !(session.user as any).id) {
    redirect("/auth");
  }

  const userId = (session.user as any).id;

  return (
    <NotificationProvider userId={userId}>
      {children}
    </NotificationProvider>
  );
}
