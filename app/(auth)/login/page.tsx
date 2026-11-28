import { redirect } from "next/navigation";
import LoginForm from "@/components/auth/LoginForm";
import { AuthPanel } from "@/components/auth/AuthPanel";
import { getSession } from "@/lib/session";

export default async function LoginPage() {
  const session = await getSession();

  if (session && !session.user.banned) {
    redirect("/dashboard");
  }

  return (
    <AuthPanel>
      <LoginForm />
    </AuthPanel>
  );
}
