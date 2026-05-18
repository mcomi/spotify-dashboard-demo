import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import LoginForm from "./login-form";

const { AUTH_COOKIE, isValidSessionValue } = require("../../src/auth");

export default async function LoginPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get(AUTH_COOKIE)?.value;

  if (isValidSessionValue(session)) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <section className="w-full max-w-md rounded-[8px] border border-line bg-panel/88 p-6 shadow-glow backdrop-blur">
        <div className="mb-8">
          <p className="mb-3 text-sm font-medium uppercase tracking-[0.18em] text-spotify">
            Spotify private analytics
          </p>
          <h1 className="text-3xl font-semibold text-white">Acceso privado</h1>
          <p className="mt-3 text-sm leading-6 text-white/66">
            Ingresa el token privado configurado en Vercel para abrir tu dashboard.
          </p>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}
