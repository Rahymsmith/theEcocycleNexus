import { useState } from "react";
import { signUpWithPassword, signInWithPassword, signInWithOtp, sendPasswordReset } from "../lib/auth";
import { Button, Card } from "../screens";

export default function AuthScreens({ onSignedIn }) {
  const [mode, setMode] = useState("login"); // login | signup | otp | reset
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "individual" });
  const [status, setStatus] = useState(null); // { type: 'error'|'info', text }
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const run = async (fn, successText) => {
    setBusy(true);
    setStatus(null);
    try {
      await fn();
      if (successText) setStatus({ type: "info", text: successText });
    } catch (e) {
      setStatus({ type: "error", text: e.message || "Something went wrong." });
    } finally {
      setBusy(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    if (mode === "login") {
      run(async () => { await signInWithPassword({ email: form.email, password: form.password }); onSignedIn?.(); });
    } else if (mode === "signup") {
      run(
        async () => { await signUpWithPassword({ email: form.email, password: form.password, name: form.name, role: form.role }); },
        "Account created. Check your email to confirm, then log in."
      );
    } else if (mode === "otp") {
      run(async () => { await signInWithOtp({ email: form.email }); }, "Magic link sent — check your email.");
    } else if (mode === "reset") {
      run(async () => { await sendPasswordReset({ email: form.email }); }, "Password reset email sent.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-parchment px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-8 h-8 rounded-full bg-biogas"></div>
          <span className="font-display text-xl">EcoCycle Nexus</span>
        </div>
        <Card>
          <div className="flex gap-2 mb-5 text-sm">
            {[["login", "Log in"], ["signup", "Sign up"]].map(([k, label]) => (
              <button key={k} onClick={() => { setMode(k); setStatus(null); }}
                className={`flex-1 py-2 rounded-md ${mode === k ? "bg-biogas text-white" : "bg-parchment2 text-soil"}`}>
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <>
                <div>
                  <label className="text-sm font-medium block mb-1">Full name</label>
                  <input required className="w-full border border-clayLine rounded-md px-3 py-2" value={form.name} onChange={set("name")} />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">I am a</label>
                  <select className="w-full border border-clayLine rounded-md px-3 py-2 bg-white" value={form.role} onChange={set("role")}>
                    <option value="individual">Waste Generator (individual)</option>
                    <option value="collector">Waste Collector</option>
                    <option value="processor">Processing Partner</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="text-sm font-medium block mb-1">Email</label>
              <input required type="email" className="w-full border border-clayLine rounded-md px-3 py-2" value={form.email} onChange={set("email")} />
            </div>

            {(mode === "login" || mode === "signup") && (
              <div>
                <label className="text-sm font-medium block mb-1">Password</label>
                <input required type="password" minLength={6} className="w-full border border-clayLine rounded-md px-3 py-2" value={form.password} onChange={set("password")} />
              </div>
            )}

            {status && (
              <p className={`text-sm ${status.type === "error" ? "text-danger" : "text-biogasDeep"}`}>{status.text}</p>
            )}

            <Button type="submit" className="w-full text-center" disabled={busy}>
              {busy ? "Please wait…" : mode === "login" ? "Log in" : mode === "signup" ? "Create account" : mode === "otp" ? "Send magic link" : "Send reset email"}
            </Button>
          </form>

          <div className="flex justify-between mt-4 text-xs text-ash">
            <button onClick={() => { setMode("otp"); setStatus(null); }} className="underline">Email me a login link</button>
            <button onClick={() => { setMode("reset"); setStatus(null); }} className="underline">Forgot password?</button>
          </div>
        </Card>
        <p className="text-xs text-ash text-center mt-4">Real accounts via Supabase Auth — no demo data here.</p>
      </div>
    </div>
  );
}
