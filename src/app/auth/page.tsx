import AuthPage from "@/components/auth/AuthPage";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Sign In | Amar Somoy, Amar Desh",
  description: "Sign in or create a new account to join our volunteer community",
};

export default async function AuthPageRoute() {
  const session = await getServerSession(authOptions);

  if (session?.user && (session.user as any).id) {
    redirect("/dashboard");
  }

  return <AuthPage />;
}
