import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const { AUTH_COOKIE, isValidSessionValue } = require("../src/auth");

export default async function HomePage() {
  const cookieStore = await cookies();
  const session = cookieStore.get(AUTH_COOKIE)?.value;

  if (isValidSessionValue(session)) {
    redirect("/dashboard");
  }

  redirect("/login");
}
