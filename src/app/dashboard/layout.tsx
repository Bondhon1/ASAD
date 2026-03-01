import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { NotificationProvider } from "@/components/providers/NotificationProvider";
import DashboardShell from "@/components/dashboard/DashboardShell";

export default async function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user || !(session.user as any).id) {
    redirect("/auth");
  }

  const user = session.user as any;

  return (
    <NotificationProvider userId={user.id}>
      <DashboardShell
        userRole={user.role || "VOLUNTEER"}
        userName={user.name || "User"}
        userEmail={user.email || ""}
        userId={user.id}
        userStatus={user.status || null}
      >
        {children}
      </DashboardShell>
    </NotificationProvider>
  );
}
