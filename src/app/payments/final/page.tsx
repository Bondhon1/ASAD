"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import FinalPaymentPage from "@/components/auth/FinalPaymentPage";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import AppLoading from '@/components/ui/AppLoading';
import useDelayedLoader from '@/lib/useDelayedLoader';

interface User {
  id: string;
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
    // Check if payment was just submitted - redirect to dashboard immediately
    if (typeof window !== 'undefined') {
      const skipUntilStr = sessionStorage.getItem('skipPaymentRedirectUntil');
      if (skipUntilStr) {
        const skipUntil = parseInt(skipUntilStr, 10);
        if (!isNaN(skipUntil) && Date.now() < skipUntil) {
          console.log('[FinalPayment] Skip flag detected, redirecting to dashboard');
          window.location.href = "/dashboard?paymentSubmitted=1";
          return;
        }
      }
    }

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
        // Use lite mode and bustCache for payment page (minimal fields, fresh data)
        const res = await fetch(`/api/user/profile?email=${encodeURIComponent(userEmail)}&bustCache=1&lite=1`, {
          cache: 'no-store'
        });
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

  const showLoader = useDelayedLoader(loading, 300);
  if (showLoader) return <AppLoading />;
  if (!user) return null;

  const displayRole = (session as any)?.user?.role || (user.role as any) || "VOLUNTEER";

  return (
    <DashboardLayout showStatusBanners={false} userRole={displayRole} userName={user.fullName || user.username || "User"} userEmail={user.email} userId={user.id || ""}>
      <FinalPaymentPage userEmail={user.email} />
    </DashboardLayout>
  );
}
