"use client";
import {Button} from "@workspace/ui/components/button";
import {useRouter} from "next/navigation";
import { createAuthClient } from "@workspace/auth/client";
interface DashboardProps {
  user: {
    email?: string | null,
    name?: string | null,
  }
}
export default function DashboardPageContents({ user }: DashboardProps) {
  const router = useRouter()
  const authclient = createAuthClient()
  const handleSignOut = async () => {
    await authclient.signOut();
    router.push("/");
  };
  return (
    <div>
      <h1>Welcome, {user.name}</h1>
        <p>You are logged in as {user.email}</p>
        <Button onClick={handleSignOut}>Sign Out</Button>
    </div>
  );
}
