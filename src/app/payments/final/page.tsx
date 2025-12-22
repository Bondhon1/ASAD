"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import FinalPaymentPage from "@/components/auth/FinalPaymentPage";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

interface User {
  email: string;
  fullName?: string | null;
  username?: string | null;
  role?: string;
}

export default function Page() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      if (status === "unauthenticated") {
        router.push("/auth");
        return;
      }
      if (status === "loading") return;

      const userEmail = session?.user?.email || localStorage.getItem("userEmail");
      if (!userEmail) {
        router.push("/auth");
        return;
      }

      try {
        const res = await fetch(`/api/user/profile?email=${encodeURIComponent(userEmail)}`);
        const data = await res.json();
        if (data?.user) setUser(data.user);
        else router.push("/auth");
      } catch (e) {
        router.push("/auth");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [session, status]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return null;

  return (
    <DashboardLayout showStatusBanners={false} userRole={(user.role as any) || "VOLUNTEER"} userName={user.fullName || user.username || "User"} userEmail={user.email}>
      <FinalPaymentPage userEmail={user.email} />
    </DashboardLayout>
  );
}
