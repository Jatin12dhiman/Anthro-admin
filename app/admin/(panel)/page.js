import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import Role from "@/models/Role";

export const metadata = { title: "Dashboard · Anthroplanet Admin" };

// Real metrics jahan abhi available hain wahan dikhao, baaki PRD KPIs placeholder.
async function getKpis() {
  await dbConnect();
  const [totalUsers, totalRoles] = await Promise.all([
    User.estimatedDocumentCount(),
    Role.estimatedDocumentCount(),
  ]);
  return { totalUsers, totalRoles };
}

export default async function AdminDashboard() {
  const { totalUsers, totalRoles } = await getKpis();

  const kpis = [
    { label: "Total users", value: totalUsers, live: true },
    { label: "Roles", value: totalRoles, live: true },
    { label: "MRR", value: "₹0", hint: "Razorpay — coming soon" },
    { label: "Active subscriptions", value: "0", hint: "Coming soon" },
    { label: "Content volume", value: "0", hint: "Blogs + submissions" },
    { label: "Open submissions", value: "0", hint: "Review queue" },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-moss">
        Super Admin
      </p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-lagoon-900">
        Platform overview
      </h1>
      <p className="mt-1.5 text-lagoon/60">
        Key metrics across Anthroplanet. Live values are read straight from the
        database.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="rounded-2xl border border-[#e4dccb] bg-white p-6 shadow-[0_18px_40px_-32px_rgba(18,39,52,0.5)]"
          >
            <div className="flex items-center justify-between">
              <p className="font-mono text-[11px] uppercase tracking-wide text-lagoon/50">
                {k.label}
              </p>
              {k.live && (
                <span className="rounded-full bg-moss/15 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide text-moss-600">
                  live
                </span>
              )}
            </div>
            <p className="mt-3 font-display text-3xl font-semibold text-lagoon-900">
              {k.value}
            </p>
            {k.hint && <p className="mt-1 text-xs text-lagoon/45">{k.hint}</p>}
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-moss/20 bg-moss/5 p-6">
        <p className="font-display text-lg font-semibold text-lagoon-900">
          Admin panel foundation is live.
        </p>
        <p className="mt-1.5 text-sm text-lagoon/70">
          Auth + RBAC working: this area is protected server-side and only Super
          Admin / Admin roles can reach it. The PRD admin modules (user
          management, moderation, payments ledger, settings, audit logs) plug
          into this shell next.
        </p>
      </div>
    </div>
  );
}
