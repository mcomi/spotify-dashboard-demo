import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import DashboardClient from "./dashboard-client";

const { AUTH_COOKIE, isValidSessionValue } = require("../../src/auth");
const { getLatestSnapshot, getStorageMode } = require("../../src/storage/snapshot-store");

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get(AUTH_COOKIE)?.value;

  if (!isValidSessionValue(session)) {
    redirect("/login");
  }

  const initialData = await getLatestSnapshot();
  const storageMode = getStorageMode();

  return <DashboardClient initialData={initialData} storageMode={storageMode} />;
}
