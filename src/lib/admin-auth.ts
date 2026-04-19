import { cookies } from "next/headers";

export function isAdmin(): boolean {
  const token = cookies().get("admin-token")?.value;
  return token === (process.env.ADMIN_PASSWORD || "admin");
}
