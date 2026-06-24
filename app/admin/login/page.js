import AdminLogin from "@/components/admin-login";

export const metadata = { title: "Admin sign in · Anthroplanet" };

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-lagoon-900 px-5 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2.5 text-frost-50">
          <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
            <circle cx="16" cy="16" r="15" className="fill-marigold" />
            <path d="M6 19c4-1 6-9 10-9s5 8 10 8" className="stroke-lagoon-900" strokeWidth="2" fill="none" strokeLinecap="round" />
            <circle cx="16" cy="16" r="2.4" className="fill-lagoon-900" />
          </svg>
          <span className="font-display text-2xl font-semibold">Anthroplanet</span>
        </div>

        <div className="rounded-[1.5rem] border border-[#e4dccb] bg-background p-8 shadow-2xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-moss">
            Admin panel
          </p>
          <h1 className="mt-2 font-display text-2xl font-semibold text-lagoon-900">
            Sign in to continue
          </h1>
          <p className="mt-1.5 text-sm text-lagoon/60">
            Restricted to Super Admin and Admin accounts.
          </p>
          <div className="mt-6">
            <AdminLogin />
          </div>
        </div>

        <p className="mt-6 text-center font-mono text-xs text-frost/40">
          Anthroplanet Researchworks — internal use only
        </p>
      </div>
    </div>
  );
}
