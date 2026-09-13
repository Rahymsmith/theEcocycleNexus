import { useState } from "react";
import { ROLE_NAV, SHARED_NAV, ROLE_LABEL } from "./screens";

export default function Sidebar({ role, route, go, onSwitchRole, mode = "demo", isAdmin = false, onSignOut, userName }) {
  const [open, setOpen] = useState(false);
  const navItems = ROLE_NAV[role];
  const demoUser = { individual: "Amara Chukwu", collector: "Tunde Bakare", processor: "GreenCycle Processing Hub" }[role];
  const user = mode === "live" ? userName : demoUser;

  const handleGo = (key) => { go(key); setOpen(false); };

  const content = (
    <>
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-biogas"></div>
            <span className="font-display text-lg tracking-tight">EcoCycle Nexus</span>
          </div>
          <button onClick={() => setOpen(false)} className="md:hidden text-white/60 text-xl leading-none px-2" aria-label="Close menu">×</button>
        </div>
        <p className="text-xs text-white/50 mt-2">{ROLE_LABEL[role]}</p>
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        <p className="px-5 text-[11px] uppercase tracking-wide text-white/40 mb-2">Workspace</p>
        {navItems.map(([key, label]) => (
          <button key={key} onClick={() => handleGo(key)}
            className={`w-full text-left px-5 py-2.5 text-sm transition-colors border-l-2 ${route === key ? "border-biogas bg-white/5 text-white" : "border-transparent text-white/70 hover:bg-white/5"}`}>
            {label}
          </button>
        ))}
        <p className="px-5 text-[11px] uppercase tracking-wide text-white/40 mt-5 mb-2">Everyone</p>
        {SHARED_NAV.map(([key, label]) => (
          <button key={key} onClick={() => handleGo(key)}
            className={`w-full text-left px-5 py-2.5 text-sm transition-colors border-l-2 ${route === key ? "border-biogas bg-white/5 text-white" : "border-transparent text-white/70 hover:bg-white/5"}`}>
            {label}
          </button>
        ))}
        {isAdmin && (
          <>
            <p className="px-5 text-[11px] uppercase tracking-wide text-white/40 mt-5 mb-2">Admin</p>
            <button onClick={() => handleGo("admin-dashboard")}
              className={`w-full text-left px-5 py-2.5 text-sm transition-colors border-l-2 ${route === "admin-dashboard" ? "border-harvest bg-white/5 text-white" : "border-transparent text-white/70 hover:bg-white/5"}`}>
              Operations dashboard
            </button>
          </>
        )}
      </nav>
      <div className="p-4 border-t border-white/10">
        <p className="text-xs text-white/50 mb-2">{mode === "live" ? "Signed in as" : "Viewing as"}</p>
        <div className="flex items-center justify-between">
          <span className="text-sm truncate">{user}</span>
        </div>
        {mode === "demo" ? (
          <div className="flex gap-1 mt-3">
            {Object.keys(ROLE_NAV).map((r) => (
              <button key={r} onClick={() => onSwitchRole(r)}
                className={`flex-1 text-[11px] py-1.5 rounded ${role === r ? "bg-biogas text-white" : "bg-white/10 text-white/60 hover:bg-white/20"}`}>
                {r[0].toUpperCase() + r.slice(1, 4)}
              </button>
            ))}
          </div>
        ) : (
          <button onClick={onSignOut} className="mt-3 w-full text-[11px] py-1.5 rounded bg-white/10 text-white/70 hover:bg-white/20">
            Sign out
          </button>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar: only visible below the md breakpoint, holds the hamburger toggle */}
      <div className="md:hidden sticky top-0 z-30 flex items-center gap-3 bg-soil text-parchment px-4 py-3">
        <button onClick={() => setOpen(true)} className="text-2xl leading-none px-1" aria-label="Open menu">☰</button>
        <span className="font-display text-base">EcoCycle Nexus</span>
      </div>

      {/* Backdrop, mobile only, shown while the drawer is open */}
      {open && (
        <div className="md:hidden fixed inset-0 bg-black/40 z-40" onClick={() => setOpen(false)} />
      )}

      {/* The nav itself: a sliding drawer on mobile, a permanent column from md up */}
      <aside
        className={`w-64 shrink-0 bg-soil text-parchment flex flex-col
          fixed inset-y-0 left-0 z-50 transition-transform duration-200
          ${open ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0 md:sticky md:top-0 md:h-screen`}
      >
        {content}
      </aside>
    </>
  );
}
