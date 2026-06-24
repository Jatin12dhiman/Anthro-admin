import { redirect } from "next/navigation";
import AdminShell from "@/components/admin-shell";
import { getServerUser, isAdmin, roleNames } from "@/lib/session";

/**
 * Protected admin area. RBAC backend pe enforce — non-admin ko login pe bhej do.
 * (Frontend hide karna kaafi nahi; yeh server-side check hai.)
 */
export default async function PanelLayout({ children }) {
  const user = await getServerUser();
  if (!isAdmin(user)) {
    redirect("/admin/login");
  }

  const safeUser = {
    name: user.name,
    email: user.email,
    roles: roleNames(user),
  };

  return <AdminShell user={safeUser}>{children}</AdminShell>;
}
