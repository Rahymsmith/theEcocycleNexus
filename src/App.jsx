import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { isSupabaseConfigured } from "./lib/supabaseClient";
import { useAppData } from "./lib/appData";
import { fetchAdminStats } from "./lib/liveApi";
import AuthScreens from "./auth/AuthScreens";
import Sidebar from "./Sidebar";
import { ROLE_NAV } from "./screens";
import {
  IndividualDashboard, SubmitWaste, PickupTracking, PickupHistory, Marketplace, CartCheckout, OrderTracking,
  CollectorDashboard, JobBoard, RouteMap, ConfirmCollection, EarningsPayouts,
  ProcessorDashboard, InventoryManagement, IncomingWasteLog, OrderFulfillment, PayoutRevenue, ProcessorProfile,
  NotificationsFeed, MessagesChat, CommunityEducation, ImpactMap, ProfileSettings, PaymentMethods, AdminDashboard,
  Button, Card,
} from "./screens";

function useHashRoute() {
  const [route, setRoute] = useState(window.location.hash.slice(1) || "dashboard");
  useEffect(() => {
    const onHash = () => setRoute(window.location.hash.slice(1) || "dashboard");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const go = (r) => { window.location.hash = r; };
  return [route, go];
}

function Screen({ route, role, db, actions, go, cart, setCart, meId, adminStats }) {
  const props = { db, actions, go, meId };
  switch (route) {
    case "dashboard": return <IndividualDashboard {...props} />;
    case "submit-waste": return <SubmitWaste {...props} />;
    case "pickup-tracking": return <PickupTracking {...props} />;
    case "pickup-history": return <PickupHistory {...props} />;
    case "marketplace": return <Marketplace {...props} cart={cart} setCart={setCart} />;
    case "cart-checkout": return <CartCheckout {...props} cart={cart} setCart={setCart} />;
    case "order-tracking": return <OrderTracking {...props} />;

    case "collector-dashboard": return <CollectorDashboard {...props} />;
    case "job-detail": return <JobBoard {...props} />;
    case "route-map": return <RouteMap {...props} />;
    case "confirm-collection": return <ConfirmCollection {...props} />;
    case "earnings-payouts": return <EarningsPayouts {...props} />;

    case "processor-dashboard": return <ProcessorDashboard {...props} />;
    case "inventory-management": return <InventoryManagement {...props} />;
    case "incoming-waste-log": return <IncomingWasteLog {...props} />;
    case "order-fulfillment": return <OrderFulfillment {...props} />;
    case "payout-revenue": return <PayoutRevenue {...props} />;
    case "processor-profile": return <ProcessorProfile {...props} />;

    case "notifications-feed": return <NotificationsFeed {...props} />;
    case "messages-chat": return <MessagesChat {...props} />;
    case "community-education": return <CommunityEducation />;
    case "impact-map": return <ImpactMap />;
    case "profile-settings": return <ProfileSettings {...props} role={role} />;
    case "payment-methods": return <PaymentMethods />;
    case "admin-dashboard": return <AdminDashboard stats={adminStats} db={db} />;
    default: return <IndividualDashboard {...props} />;
  }
}

function Landing({ onStart, onLogin }) {
  return (
    <div className="min-h-screen bg-parchment text-soil">
      <header className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-biogas"></div>
          <span className="font-display text-xl">EcoCycle Nexus</span>
        </div>
        <button onClick={onLogin} className="text-sm underline">Log in</button>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-16 md:py-24 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <p className="text-sm text-biogasDeep font-medium mb-3">A circular waste economy for communities</p>
          <h1 className="font-display text-5xl md:text-6xl leading-tight">Turn waste into value.</h1>
          <p className="text-ash text-lg mt-5 max-w-xl">EcoCycle Nexus connects waste generators, collectors and processing partners so recoverable waste can move from homes and markets into useful products.</p>
          <div className="flex gap-3 mt-7">
            <Button onClick={onStart}>Get started</Button>
            <Button variant="secondary" onClick={onLogin}>Log in</Button>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-10 max-w-lg">
            <Card><p className="font-display text-2xl">01</p><p className="text-xs text-ash mt-1">Submit waste</p></Card>
            <Card><p className="font-display text-2xl">02</p><p className="text-xs text-ash mt-1">Collect & process</p></Card>
            <Card><p className="font-display text-2xl">03</p><p className="text-xs text-ash mt-1">Create value</p></Card>
          </div>
        </div>
        <Card className="!p-0 overflow-hidden">
          <div className="p-8 bg-soil text-parchment min-h-80">
            <p className="text-sm text-white/60 mb-8">THE CYCLE</p>
            <div className="space-y-5">
              {[
                ["Households & businesses", "Waste enters the network"],
                ["Local collectors", "Pickups become paid jobs"],
                ["Processing partners", "Materials become products"],
                ["Marketplace", "Value returns to the community"],
              ].map(([title, body], i) => (
                <div key={title} className="flex gap-4">
                  <span className="w-7 h-7 shrink-0 rounded-full bg-biogas text-white flex items-center justify-center text-xs">{i + 1}</span>
                  <div><p className="font-medium">{title}</p><p className="text-sm text-white/60">{body}</p></div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </main>
      <footer className="max-w-6xl mx-auto px-6 pb-8 text-xs text-ash">EcoCycle Nexus MVP · Built for real community waste operations.</footer>
    </div>
  );
}

function DemoApp() {
  const { db, actions } = useAppData(null);
  const [role, setRole] = useState("individual");
  const [route, go] = useHashRoute();
  const [cart, setCart] = useState({});
  const [showApp, setShowApp] = useState(false);

  const handleSwitchRole = (r) => { setRole(r); go(ROLE_NAV[r][0][0]); setShowApp(true); };
  if (!showApp) return <Landing onStart={() => setShowApp(true)} onLogin={() => setShowApp(true)} />;

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <Sidebar role={role} route={route} go={go} onSwitchRole={handleSwitchRole} mode="demo" />
      <main className="flex-1 p-4 md:p-8 max-w-6xl w-full">
        <div className="mb-4 text-xs px-3 py-2 rounded-md bg-harvest/20 text-[#7a5c0c] inline-block">
          Demo mode — data lives in this browser only. Set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY to switch on real accounts.
        </div>
        <Screen route={route} role={role} db={db} actions={actions} go={go} cart={cart} setCart={setCart} meId={`u-${role}`} />
      </main>
    </div>
  );
}

function LiveApp() {
  const { session, profile, loading, signOut } = useAuth();
  const { db, actions, loading: dataLoading } = useAppData(profile);
  const [route, go] = useHashRoute();
  const [showAuth, setShowAuth] = useState(false);
  const [cart, setCart] = useState({});
  const [adminStats, setAdminStats] = useState(null);

  useEffect(() => {
    if (profile?.role === "admin") fetchAdminStats().then(setAdminStats).catch(() => {});
  }, [profile]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-ash">Loading…</div>;
  if (!session && !showAuth) return <Landing onStart={() => setShowAuth(true)} onLogin={() => setShowAuth(true)} />;
  if (!session) return <AuthScreens onSignedIn={() => {}} />;
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 text-center">
        <div>
          <p className="font-display text-xl mb-2">Confirm your email to continue</p>
          <p className="text-ash text-sm max-w-sm">We couldn't find a profile for this account yet — if you just signed up, check your inbox for the confirmation link, then log in again.</p>
          <button onClick={signOut} className="mt-4 text-sm underline">Sign out</button>
        </div>
      </div>
    );
  }

  const role = profile.role === "admin" ? "individual" : profile.role;
  const navRole = ROLE_NAV[role] ? role : "individual";

  const handleSwitchRole = () => {}; // live mode: role comes from your account, not a switcher

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <Sidebar role={navRole} route={route} go={go} onSwitchRole={handleSwitchRole} mode="live"
        isAdmin={profile.role === "admin"} onSignOut={signOut} userName={profile.name} />
      <main className="flex-1 p-4 md:p-8 max-w-6xl w-full">
        {dataLoading && <p className="text-xs text-ash mb-4">Syncing…</p>}
        <Screen route={route} role={navRole} db={db} actions={actions} go={go} cart={cart} setCart={setCart} meId={profile.id} adminStats={adminStats} />
      </main>
    </div>
  );
}

export default function App() {
  if (!isSupabaseConfigured) return <DemoApp />;
  return (
    <AuthProvider>
      <LiveApp />
    </AuthProvider>
  );
}
