import { useState, useEffect, Fragment } from "react";

/* ---------- UI primitives ---------- */

export function Pill({ children, tone = "default" }) {
  const tones = {
    default: "bg-parchment2 text-soil",
    good: "bg-biogas/15 text-biogasDeep",
    warn: "bg-harvest/20 text-[#7a5c0c]",
    bad: "bg-danger/15 text-danger",
    neutral: "bg-parchment2 text-soil",
  };
  return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

export function StatusPill({ status }) {
  const map = {
    Collected: "good", Completed: "good", Delivered: "good",
    "Pending pickup": "warn", "En route": "warn", "Awaiting confirmation": "warn", "Out for delivery": "warn", Available: "warn",
    Cancelled: "bad",
  };
  return <Pill tone={map[status] || "default"}>{status}</Pill>;
}

export function Card({ children, className = "" }) {
  return <div className={`bg-white/60 border border-clayLine rounded-lg p-5 ${className}`}>{children}</div>;
}

export function SectionTitle({ eyebrow, title, sub }) {
  return (
    <div className="mb-6">
      {eyebrow && <div className="text-sm text-ash mb-1">{eyebrow}</div>}
      <h1 className="font-display text-3xl text-soil">{title}</h1>
      {sub && <p className="text-ash mt-1 max-w-xl">{sub}</p>}
    </div>
  );
}

export function Button({ children, onClick, variant = "primary", className = "", type = "button", disabled = false }) {
  const variants = {
    primary: "bg-biogas text-white hover:bg-biogasDeep",
    secondary: "bg-transparent border border-soil text-soil hover:bg-soil hover:text-white",
    gold: "bg-harvest text-[#2B2318] hover:brightness-95",
    ghost: "bg-transparent text-soil hover:bg-parchment2",
    danger: "bg-transparent border border-danger text-danger hover:bg-danger hover:text-white",
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
}

export function EmptyState({ title, body, actionLabel, onAction }) {
  return (
    <div className="text-center py-16 border border-dashed border-clayLine rounded-lg">
      <p className="font-display text-xl mb-1">{title}</p>
      <p className="text-ash mb-4 max-w-sm mx-auto">{body}</p>
      {actionLabel && <Button onClick={onAction}>{actionLabel}</Button>}
    </div>
  );
}

/* ---------- nav config ---------- */

export const ROLE_NAV = {
  individual: [
    ["dashboard", "Dashboard"],
    ["submit-waste", "Submit Waste"],
    ["pickup-tracking", "Pickup Tracking"],
    ["pickup-history", "Pickup History"],
    ["marketplace", "Marketplace"],
    ["cart-checkout", "Cart & Checkout"],
    ["order-tracking", "Order Tracking"],
  ],
  collector: [
    ["collector-dashboard", "Dashboard"],
    ["job-detail", "Job Board"],
    ["route-map", "Route Map"],
    ["confirm-collection", "Confirm Collection"],
    ["earnings-payouts", "Earnings & Payouts"],
  ],
  processor: [
    ["processor-dashboard", "Dashboard"],
    ["inventory-management", "Inventory"],
    ["incoming-waste-log", "Incoming Waste Log"],
    ["order-fulfillment", "Order Fulfillment"],
    ["payout-revenue", "Payout & Revenue"],
    ["processor-profile", "Facility Profile"],
  ],
};

export const SHARED_NAV = [
  ["notifications-feed", "Notifications"],
  ["messages-chat", "Messages"],
  ["community-education", "Learn"],
  ["impact-map", "Impact Map"],
  ["profile-settings", "Settings"],
  ["payment-methods", "Payment Methods"],
];

export const ROLE_LABEL = { individual: "Waste Generator", collector: "Waste Collector", processor: "Processing Partner" };

/* ---------- Individual screens ---------- */

export function IndividualDashboard({ db, go, meId = "u-individual" }) {
  const me = db.users.find((u) => u.id === meId) || { name: "", points: 0, wallet: 0 };
  const mySubs = db.wasteSubmissions.filter((w) => w.userId === me.id);
  return (
    <div className="rise">
      <SectionTitle eyebrow="Good morning" title={`Welcome back, ${me.name.split(" ")[0]}`} sub="Here's how your waste is turning into value this week." />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card><p className="text-ash text-sm">Green Points</p><p className="font-display text-3xl mt-1">{me.points}</p></Card>
        <Card><p className="text-ash text-sm">Wallet Balance</p><p className="font-display text-3xl mt-1">₦{me.wallet.toLocaleString()}</p></Card>
        <Card><p className="text-ash text-sm">Active Submissions</p><p className="font-display text-3xl mt-1">{mySubs.filter((s) => s.status !== "Collected").length}</p></Card>
      </div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-xl">Recent submissions</h2>
        <Button onClick={() => go("submit-waste")}>+ Submit Waste</Button>
      </div>
      <Card className="!p-0 overflow-hidden">
        {mySubs.map((s, i) => (
          <div key={s.id} className={`flex items-center justify-between px-5 py-4 ${i > 0 ? "border-t divider" : ""}`}>
            <div>
              <p className="font-medium">{s.type}</p>
              <p className="text-sm text-ash">{s.weightKg}kg · submitted {s.createdAt}</p>
            </div>
            <StatusPill status={s.status} />
          </div>
        ))}
      </Card>
    </div>
  );
}

export function SubmitWaste({ actions, go }) {
  const [form, setForm] = useState({ type: "Organic (food waste)", weight: "", address: "", scheduled: "", notes: "" });
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      await actions.submitWaste(form);
      setSubmitted(true);
    } finally {
      setBusy(false);
    }
  };
  if (submitted) {
    return (
      <div className="rise max-w-md">
        <SectionTitle title="Submission received" sub="A collector will confirm your pickup window shortly." />
        <Card>
          <p className="text-sm text-ash mb-4">We'll notify you once a Waste Collector accepts this job. Estimated confirmation: within 4 hours.</p>
          <div className="flex gap-2">
            <Button onClick={() => go("pickup-tracking")}>Track pickup</Button>
            <Button variant="ghost" onClick={() => { setSubmitted(false); setForm({ type: "Organic (food waste)", weight: "", address: form.address, scheduled: "", notes: "" }); }}>Submit another</Button>
          </div>
        </Card>
      </div>
    );
  }
  return (
    <div className="rise max-w-lg">
      <SectionTitle eyebrow="Turn waste into value" title="Submit waste for pickup" sub="Tell us what you have and where — a nearby collector will confirm a pickup window." />
      <Card className="space-y-4">
        <div>
          <label className="text-sm font-medium block mb-1">Waste type</label>
          <select className="w-full border border-clayLine rounded-md px-3 py-2 bg-white" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option>Organic (food waste)</option>
            <option>Plastics (PET)</option>
            <option>Agricultural residue</option>
            <option>Paper & cardboard</option>
            <option>Mixed market waste</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Estimated weight (kg)</label>
          <input type="number" min="1" className="w-full border border-clayLine rounded-md px-3 py-2" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} placeholder="e.g. 10" />
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Pickup address</label>
          <input className="w-full border border-clayLine rounded-md px-3 py-2" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Preferred pickup time</label>
          <input required type="datetime-local" min={new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16)}
            className="w-full border border-clayLine rounded-md px-3 py-2"
            value={form.scheduled} onChange={(e) => setForm({ ...form, scheduled: e.target.value })} />
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Notes for the collector (optional)</label>
          <textarea className="w-full border border-clayLine rounded-md px-3 py-2" rows="2" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Gate code, best time, etc." />
        </div>
        <Button onClick={submit} className="w-full text-center">{busy ? "Submitting…" : "Submit for pickup"}</Button>
      </Card>
    </div>
  );
}

export function PickupTracking({ db, meId }) {
  const myWasteIds = new Set(db.wasteSubmissions.filter((w) => w.userId === meId).map((w) => w.id));
  const active = db.pickups.filter((p) => p.status !== "Completed" && myWasteIds.has(p.wasteId));
  const steps = ["Requested", "Collector assigned", "En route", "Arrived", "Completed"];
  return (
    <div className="rise">
      <SectionTitle eyebrow="Live status" title="Pickup tracking" sub="Follow your scheduled collections in real time." />
      <div className="space-y-5">
        {active.map((p) => {
          const waste = db.wasteSubmissions.find((w) => w.id === p.wasteId);
          const collector = db.users.find((u) => u.id === p.collectorId);
          const idx = p.status === "En route" ? 2 : p.status === "Arrived" ? 3 : p.status === "Completed" ? 4 : p.collectorId ? 1 : 0;
          return (
            <Card key={p.id}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="font-medium">{waste ? waste.type : "General pickup"}</p>
                  <p className="text-sm text-ash">{p.address} · scheduled {p.scheduled}</p>
                </div>
                <StatusPill status={p.status} />
              </div>
              <div className="flex items-center">
                {steps.slice(0, 4).map((s, i) => (
                  <Fragment key={s}>
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${i <= idx ? "bg-biogas" : "bg-clayLine"}`}></div>
                      <span className="text-[11px] text-ash mt-1 w-16 text-center">{s}</span>
                    </div>
                    {i < 3 && <div className={`flex-1 h-0.5 ${i < idx ? "bg-biogas" : "bg-clayLine"}`}></div>}
                  </Fragment>
                ))}
              </div>
              <p className="text-sm text-ash mt-4">Collector: {collector?.name} · {collector?.vehicle}</p>
            </Card>
          );
        })}
        {active.length === 0 && <EmptyState title="No active pickups" body="Submit a waste pickup request to see live tracking here." />}
      </div>
    </div>
  );
}

export function PickupHistory({ db }) {
  const done = db.pickups.filter((p) => p.status === "Completed");
  return (
    <div className="rise">
      <SectionTitle eyebrow="Your record" title="Pickup history" sub="A log of everything you've diverted from landfill." />
      <Card className="!p-0 overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead><tr className="text-left text-ash border-b divider">
            <th className="px-5 py-3 font-normal">Date</th><th className="px-5 py-3 font-normal">Waste</th><th className="px-5 py-3 font-normal">Weight</th><th className="px-5 py-3 font-normal">Payout</th><th className="px-5 py-3 font-normal">Status</th>
          </tr></thead>
          <tbody>
            {done.map((p) => {
              const w = db.wasteSubmissions.find((x) => x.id === p.wasteId);
              return (
                <tr key={p.id} className="border-b divider last:border-0">
                  <td className="px-5 py-3">{w?.createdAt}</td>
                  <td className="px-5 py-3">{w?.type}</td>
                  <td className="px-5 py-3">{w?.weightKg}kg</td>
                  <td className="px-5 py-3">₦{p.payout.toLocaleString()}</td>
                  <td className="px-5 py-3"><StatusPill status={p.status} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {done.length === 0 && <div className="p-5"><EmptyState title="Nothing here yet" body="Completed pickups will show up in this log." /></div>}
      </Card>
    </div>
  );
}

export function Marketplace({ db, cart, setCart, go }) {
  return (
    <div className="rise">
      <SectionTitle eyebrow="From waste to worth" title="Marketplace" sub="Products made from processed community waste — biochar, fuel, and fertilizer." />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {db.products.map((p) => (
          <Card key={p.id} className="flex flex-col">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium">{p.name}</p>
                <p className="text-xs text-ash">{p.category}</p>
              </div>
              <Pill tone={p.stock > 50 ? "good" : "warn"}>{p.stock} in stock</Pill>
            </div>
            <p className="text-sm text-ash mt-2 flex-1">{p.blurb}</p>
            <div className="flex justify-between items-center mt-4">
              <span className="font-display text-xl">₦{p.price.toLocaleString()}</span>
              <Button onClick={() => setCart((c) => ({ ...c, [p.id]: (c[p.id] || 0) + 1 }))}>Add to cart</Button>
            </div>
          </Card>
        ))}
      </div>
      {Object.keys(cart).length > 0 && (
        <div className="fixed bottom-6 right-6">
          <Button variant="gold" onClick={() => go("cart-checkout")}>View cart ({Object.values(cart).reduce((a, b) => a + b, 0)})</Button>
        </div>
      )}
    </div>
  );
}

export function CartCheckout({ db, cart, setCart, actions, go }) {
  const items = Object.entries(cart).map(([id, qty]) => ({ product: db.products.find((p) => p.id === id), qty }));
  const total = items.reduce((sum, i) => sum + (i.product?.price || 0) * i.qty, 0);
  const [placed, setPlaced] = useState(false);
  const [busy, setBusy] = useState(false);
  const placeOrder = async () => {
    setBusy(true);
    try {
      await actions.placeOrder(items, total);
      setCart({});
      setPlaced(true);
    } finally {
      setBusy(false);
    }
  };
  if (items.length === 0 && !placed) return <EmptyState title="Your cart is empty" body="Add products from the marketplace to check out." actionLabel="Browse marketplace" onAction={() => go("marketplace")} />;
  if (placed) return (
    <div className="max-w-md rise">
      <SectionTitle title="Order placed" sub="We'll notify you as it moves through fulfillment." />
      <Button onClick={() => go("order-tracking")}>Track my order</Button>
    </div>
  );
  return (
    <div className="rise max-w-xl">
      <SectionTitle eyebrow="Almost there" title="Cart & checkout" />
      <Card className="!p-0 overflow-hidden mb-4">
        {items.map(({ product, qty }) => (
          <div key={product.id} className="flex justify-between items-center px-5 py-4 border-b divider last:border-0">
            <div>
              <p className="font-medium">{product.name}</p>
              <p className="text-sm text-ash">Qty {qty} · ₦{product.price.toLocaleString()} each</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-medium">₦{(product.price * qty).toLocaleString()}</span>
              <button onClick={() => setCart((c) => { const n = { ...c }; delete n[product.id]; return n; })} className="text-danger text-sm">Remove</button>
            </div>
          </div>
        ))}
      </Card>
      <Card>
        <div className="flex justify-between text-sm text-ash mb-2"><span>Delivery</span><span>₦500</span></div>
        <div className="flex justify-between font-display text-xl mb-4"><span>Total</span><span>₦{(total + 500).toLocaleString()}</span></div>
        <p className="text-xs text-ash mb-3">MVP checkout: order is recorded securely and payment is marked for collection on delivery. Online Paystack checkout can be connected when your merchant account is ready.</p>
        <Button onClick={placeOrder} className="w-full text-center">{busy ? "Placing order…" : `Place order · ₦${(total + 500).toLocaleString()}`}</Button>
      </Card>
    </div>
  );
}

export function OrderTracking({ db, meId = "u-individual" }) {
  const orders = db.orders.filter((o) => o.userId === meId);
  const steps = ["Placed", "Processing", "Out for delivery", "Delivered"];
  return (
    <div className="rise">
      <SectionTitle eyebrow="Marketplace" title="Order tracking" />
      <div className="space-y-4">
        {orders.map((o) => {
          const product = db.products.find((p) => p.id === o.productId);
          const idx = steps.indexOf(o.status) >= 0 ? steps.indexOf(o.status) : 1;
          return (
            <Card key={o.id}>
              <div className="flex justify-between mb-4">
                <div><p className="font-medium">{product?.name} × {o.qty}</p><p className="text-sm text-ash">Order {o.id} · placed {o.placed}</p></div>
                <StatusPill status={o.status} />
              </div>
              <div className="flex items-center">
                {steps.map((s, i) => (
                  <Fragment key={s}>
                    <div className="flex flex-col items-center"><div className={`w-3 h-3 rounded-full ${i <= idx ? "bg-biogas" : "bg-clayLine"}`}></div><span className="text-[11px] text-ash mt-1 w-16 text-center">{s}</span></div>
                    {i < 3 && <div className={`flex-1 h-0.5 ${i < idx ? "bg-biogas" : "bg-clayLine"}`}></div>}
                  </Fragment>
                ))}
              </div>
            </Card>
          );
        })}
        {orders.length === 0 && <EmptyState title="No orders yet" body="Orders you place in the marketplace will appear here." />}
      </div>
    </div>
  );
}

/* ---------- Collector screens ---------- */

export function CollectorDashboard({ db, go, meId = "u-collector" }) {
  const me = db.users.find((u) => u.id === meId) || { name: "", rating: "—", wallet: 0 };
  const myJobs = db.pickups.filter((p) => p.collectorId === me.id);
  const today = myJobs.filter((p) => p.status !== "Completed");
  return (
    <div className="rise">
      <SectionTitle eyebrow="On the road" title={`Welcome back, ${me.name.split(" ")[0]}`} sub="Here's your route and earnings for today." />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card><p className="text-ash text-sm">Jobs today</p><p className="font-display text-3xl mt-1">{today.length}</p></Card>
        <Card><p className="text-ash text-sm">Rating</p><p className="font-display text-3xl mt-1">{me.rating} ★</p></Card>
        <Card><p className="text-ash text-sm">Wallet</p><p className="font-display text-3xl mt-1">₦{me.wallet.toLocaleString()}</p></Card>
      </div>
      <div className="flex justify-between items-center mb-3"><h2 className="font-display text-xl">Today's jobs</h2><Button onClick={() => go("job-detail")}>View job board</Button></div>
      <Card className="!p-0 overflow-hidden">
        {today.map((p, i) => (
          <div key={p.id} className={`flex justify-between items-center px-5 py-4 ${i > 0 ? "border-t divider" : ""}`}>
            <div><p className="font-medium">{p.address}</p><p className="text-sm text-ash">{p.scheduled}</p></div>
            <div className="flex items-center gap-3"><span className="font-mono text-sm">₦{p.payout}</span><StatusPill status={p.status} /></div>
          </div>
        ))}
        {today.length === 0 && <div className="p-5"><EmptyState title="No jobs scheduled" body="Check the job board for available pickups near you." actionLabel="Open job board" onAction={() => go("job-detail")} /></div>}
      </Card>
    </div>
  );
}

export function JobBoard({ db, actions, go }) {
  const available = db.pickups.filter((p) => p.status === "Available");
  const [acceptingId, setAcceptingId] = useState(null);
  const accept = async (id) => {
    setAcceptingId(id);
    try { await actions.acceptPickup(id); } finally { setAcceptingId(null); }
  };
  return (
    <div className="rise">
      <SectionTitle eyebrow="Nearby" title="Job board" sub="Available pickups sorted by distance and payout." />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {available.map((p) => (
          <Card key={p.id}>
            <div className="flex justify-between mb-2"><Pill tone="good">₦{p.payout} payout</Pill><span className="text-xs text-ash">{p.scheduled}</span></div>
            <p className="font-medium">{p.address}</p>
            <p className="text-sm text-ash mb-4">Estimated 25kg mixed load</p>
            <Button onClick={() => accept(p.id)} className="w-full text-center">{acceptingId === p.id ? "Accepting…" : "Accept job"}</Button>
          </Card>
        ))}
        {available.length === 0 && <EmptyState title="No open jobs right now" body="New pickups appear here as generators submit waste nearby." />}
      </div>
      <div className="mt-6"><Button variant="ghost" onClick={() => go("route-map")}>See accepted jobs on route map →</Button></div>
    </div>
  );
}

export function RouteMap({ db, meId = "u-collector" }) {
  const active = db.pickups.filter((p) => p.collectorId === meId && p.status !== "Completed");
  return (
    <div className="rise">
      <SectionTitle eyebrow="Today's route" title="Route map" sub="Stops ordered for the shortest loop back to the processing hub." />
      <Card className="mb-4">
        <div className="h-64 rounded-md bg-parchment2 border border-clayLine flex items-center justify-center relative overflow-hidden">
          <svg viewBox="0 0 400 200" className="w-full h-full">
            <path d="M30,160 C100,40 220,180 370,50" stroke="#4C7A50" strokeWidth="3" fill="none" strokeDasharray="6 6" />
            {active.map((p, i) => {
              const x = 30 + i * (340 / Math.max(active.length - 1, 1));
              const y = 160 - i * 30;
              return (
                <g key={p.id}>
                  <circle cx={x} cy={Math.max(30, y)} r="7" fill="#C69214" />
                  <text x={x + 10} y={Math.max(30, y) + 4} fontSize="10" fill="#2B2318">{i + 1}</text>
                </g>
              );
            })}
          </svg>
        </div>
      </Card>
      <Card className="!p-0 overflow-hidden">
        {active.map((p, i) => (
          <div key={p.id} className={`flex justify-between items-center px-5 py-4 ${i > 0 ? "border-t divider" : ""}`}>
            <div className="flex items-center gap-3"><span className="w-6 h-6 rounded-full bg-harvest text-[#2B2318] text-xs flex items-center justify-center font-medium">{i + 1}</span><div><p className="font-medium">{p.address}</p><p className="text-sm text-ash">{p.scheduled}</p></div></div>
            <StatusPill status={p.status} />
          </div>
        ))}
      </Card>
    </div>
  );
}

export function ConfirmCollection({ db, actions, go, meId = "u-collector" }) {
  const job = db.pickups.find((p) => p.collectorId === meId && p.status === "En route");
  const [weight, setWeight] = useState(job ? db.wasteSubmissions.find((w) => w.id === job.wasteId)?.weightKg || 10 : 10);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const confirm = async () => {
    if (!job) return;
    setBusy(true);
    try {
      await actions.confirmPickup(job, weight);
      setConfirmed(true);
    } finally {
      setBusy(false);
    }
  };
  if (!job) return <EmptyState title="No pickup in progress" body="Accept a job from the board to confirm a collection here." actionLabel="Open job board" onAction={() => go("job-detail")} />;
  if (confirmed) return (
    <div className="max-w-md rise">
      <SectionTitle title="Collection confirmed" sub={`₦${job.payout} added to your wallet.`} />
      <Button onClick={() => go("collector-dashboard")}>Back to dashboard</Button>
    </div>
  );
  return (
    <div className="rise max-w-md">
      <SectionTitle eyebrow="At the pickup point" title="Confirm collection" sub={job.address} />
      <Card className="space-y-4">
        <div>
          <label className="text-sm font-medium block mb-1">Confirmed weight (kg)</label>
          <input type="number" className="w-full border border-clayLine rounded-md px-3 py-2" value={weight} onChange={(e) => setWeight(e.target.value)} />
        </div>
        <div className="border border-dashed border-clayLine rounded-md h-28 flex items-center justify-center text-sm text-ash">Tap to attach photo evidence</div>
        <Button onClick={confirm} className="w-full text-center">{busy ? "Confirming…" : `Confirm & collect ₦${job.payout}`}</Button>
      </Card>
    </div>
  );
}

export function EarningsPayouts({ db, meId = "u-collector" }) {
  const me = db.users.find((u) => u.id === meId) || { wallet: 0 };
  const completed = db.pickups.filter((p) => p.collectorId === me.id && p.status === "Completed");
  const weekTotal = completed.reduce((s, p) => s + p.payout, 0);
  return (
    <div className="rise">
      <SectionTitle eyebrow="Money" title="Earnings & payouts" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Card><p className="text-ash text-sm">Wallet balance</p><p className="font-display text-3xl mt-1">₦{me.wallet.toLocaleString()}</p><Button variant="gold" className="mt-3">Withdraw to bank</Button></Card>
        <Card><p className="text-ash text-sm">This week</p><p className="font-display text-3xl mt-1">₦{weekTotal.toLocaleString()}</p><p className="text-xs text-ash mt-1">{completed.length} completed jobs</p></Card>
      </div>
      <Card className="!p-0 overflow-hidden">
        {completed.map((p, i) => (
          <div key={p.id} className={`flex justify-between items-center px-5 py-4 ${i > 0 ? "border-t divider" : ""}`}>
            <div><p className="font-medium">{p.address}</p><p className="text-sm text-ash">{p.scheduled}</p></div>
            <span className="font-mono">+₦{p.payout}</span>
          </div>
        ))}
        {completed.length === 0 && <div className="p-5"><EmptyState title="No completed jobs yet" body="Payouts appear here after you confirm a collection." /></div>}
      </Card>
    </div>
  );
}

/* ---------- Processor screens ---------- */

export function ProcessorDashboard({ db }) {
  const totalInventory = db.inventory.reduce((s, i) => s + i.qtyKg, 0);
  const pendingOrders = db.orders.filter((o) => o.status !== "Delivered").length;
  return (
    <div className="rise">
      <SectionTitle eyebrow="Facility overview" title="Processing dashboard" sub="Feedstock in, products out." />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card><p className="text-ash text-sm">Feedstock on hand</p><p className="font-display text-3xl mt-1">{totalInventory.toLocaleString()}kg</p></Card>
        <Card><p className="text-ash text-sm">Orders to fulfill</p><p className="font-display text-3xl mt-1">{pendingOrders}</p></Card>
        <Card><p className="text-ash text-sm">Revenue (30d)</p><p className="font-display text-3xl mt-1">₦512,000</p></Card>
      </div>
      <h2 className="font-display text-xl mb-3">Output streams</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[["Biogas", "Community-scale electricity"], ["Biochar", "Agricultural soil amendment"], ["Synergy Oil", "Vehicle & generator fuel"], ["Bio-LPG", "Household cooking gas"]].map(([n, d]) => (
          <Card key={n}><p className="font-medium">{n}</p><p className="text-xs text-ash mt-1">{d}</p></Card>
        ))}
      </div>
    </div>
  );
}

export function InventoryManagement({ db }) {
  return (
    <div className="rise">
      <SectionTitle eyebrow="Feedstock" title="Inventory management" sub="Raw material collected from generators, staged for conversion." />
      <Card className="!p-0 overflow-x-auto">
        <table className="w-full text-sm min-w-[420px]">
          <thead><tr className="text-left text-ash border-b divider"><th className="px-5 py-3 font-normal">Material</th><th className="px-5 py-3 font-normal">Quantity</th><th className="px-5 py-3 font-normal">Source</th></tr></thead>
          <tbody>
            {db.inventory.map((i) => (
              <tr key={i.id} className="border-b divider last:border-0">
                <td className="px-5 py-3 font-medium">{i.material}</td>
                <td className="px-5 py-3">{i.qtyKg.toLocaleString()}kg</td>
                <td className="px-5 py-3 text-ash">{i.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

export function IncomingWasteLog({ db }) {
  const collected = db.wasteSubmissions.filter((w) => w.status === "Collected");
  return (
    <div className="rise">
      <SectionTitle eyebrow="Traceability" title="Incoming waste log" sub="Every batch, traced from generator to hub." />
      <Card className="!p-0 overflow-hidden">
        {collected.map((w, i) => (
          <div key={w.id} className={`flex justify-between items-center px-5 py-4 ${i > 0 ? "border-t divider" : ""}`}>
            <div><p className="font-medium">{w.type}</p><p className="text-sm text-ash">{w.weightKg}kg · collected {w.createdAt}</p></div>
            <Pill tone="good">Logged</Pill>
          </div>
        ))}
        {collected.length === 0 && <div className="p-5"><EmptyState title="No batches logged yet" body="Collected waste will appear here once confirmed by collectors." /></div>}
      </Card>
    </div>
  );
}

export function OrderFulfillment({ db, actions }) {
  const [busyId, setBusyId] = useState(null);
  const advance = async (id) => {
    setBusyId(id);
    try { await actions.advanceOrder(id); } finally { setBusyId(null); }
  };
  return (
    <div className="rise">
      <SectionTitle eyebrow="Marketplace orders" title="Order fulfillment" />
      <Card className="!p-0 overflow-hidden">
        {db.orders.map((o, i) => {
          const product = db.products.find((p) => p.id === o.productId);
          return (
            <div key={o.id} className={`flex justify-between items-center px-5 py-4 ${i > 0 ? "border-t divider" : ""}`}>
              <div><p className="font-medium">{product?.name} × {o.qty}</p><p className="text-sm text-ash">Order {o.id} · ₦{o.total.toLocaleString()}</p></div>
              <div className="flex items-center gap-3"><StatusPill status={o.status} />{o.status !== "Delivered" && <Button variant="secondary" onClick={() => advance(o.id)}>{busyId === o.id ? "Updating…" : "Advance status"}</Button>}</div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}

export function PayoutRevenue() {
  return (
    <div className="rise">
      <SectionTitle eyebrow="Finance" title="Payout & revenue" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card><p className="text-ash text-sm">Gross revenue (30d)</p><p className="font-display text-3xl mt-1">₦512,000</p></Card>
        <Card><p className="text-ash text-sm">Collector payouts (30d)</p><p className="font-display text-3xl mt-1">₦86,400</p></Card>
        <Card><p className="text-ash text-sm">Net margin</p><p className="font-display text-3xl mt-1">₦425,600</p></Card>
      </div>
      <Card>
        <p className="text-sm text-ash">Revenue by output stream</p>
        <div className="mt-4 space-y-3">
          {[["Biochar", 38], ["Bio-LPG", 29], ["Synergy Oil", 21], ["Fertilizer", 12]].map(([n, pct]) => (
            <div key={n}>
              <div className="flex justify-between text-sm mb-1"><span>{n}</span><span className="text-ash">{pct}%</span></div>
              <div className="h-2 rounded-full bg-parchment2"><div className="h-2 rounded-full bg-biogas" style={{ width: pct + "%" }}></div></div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function ProcessorProfile({ db, meId = "u-processor", actions }) {
  const me = db.users.find((u) => u.id === meId) || { name: "", location: "" };
  const [name, setName] = useState(me.name || "");
  const [location, setLocation] = useState(me.location || "");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setName(me.name || "");
    setLocation(me.location || "");
  }, [me.id, me.name, me.location]);

  const save = async () => {
    setBusy(true);
    setSaved(false);
    try {
      await actions.updateProfile(meId, { name, location });
      setSaved(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rise max-w-lg">
      <SectionTitle eyebrow="Public profile" title="Facility profile" />
      <Card className="space-y-4">
        <div><label className="text-sm font-medium block mb-1">Facility name</label><input className="w-full border border-clayLine rounded-md px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><label className="text-sm font-medium block mb-1">Location</label><input className="w-full border border-clayLine rounded-md px-3 py-2" value={location} onChange={(e) => setLocation(e.target.value)} /></div>
        <div><label className="text-sm font-medium block mb-1">Processing capacity</label><input className="w-full border border-clayLine rounded-md px-3 py-2" defaultValue="2,500 kg/day" /></div>
        <div><label className="text-sm font-medium block mb-1">Certifications</label><input className="w-full border border-clayLine rounded-md px-3 py-2" defaultValue="Lagos State Waste Management Authority (LAWMA) partner" /></div>
        {saved && <p className="text-sm text-biogasDeep">Profile saved.</p>}
        <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save profile"}</Button>
      </Card>
    </div>
  );
}

/* ---------- Shared / cross-role screens ---------- */

export function NotificationsFeed({ db }) {
  const icon = { pickup: "🚚", reward: "🌱", job: "📍" };
  return (
    <div className="rise max-w-lg">
      <SectionTitle eyebrow="Stay updated" title="Notifications" />
      <Card className="!p-0 overflow-hidden">
        {db.notifications.map((n, i) => (
          <div key={n.id} className={`flex gap-3 px-5 py-4 ${i > 0 ? "border-t divider" : ""}`}>
            <span className="text-lg">{icon[n.type] || "🔔"}</span>
            <div className="flex-1"><p className="text-sm">{n.text}</p><p className="text-xs text-ash mt-1">{n.time}</p></div>
          </div>
        ))}
      </Card>
    </div>
  );
}

export function MessagesChat({ db }) {
  const [selected, setSelected] = useState(db.messages[0]?.id);
  const thread = db.messages.find((m) => m.id === selected);
  const [draft, setDraft] = useState("");
  const [log, setLog] = useState([{ from: "them", text: thread?.preview }]);
  useEffect(() => { setLog([{ from: "them", text: db.messages.find((m) => m.id === selected)?.preview }]); }, [selected]);
  return (
    <div className="rise grid grid-cols-1 sm:grid-cols-3 gap-4 sm:h-[520px]">
      <Card className="!p-0 overflow-hidden col-span-1">
        {db.messages.map((m, i) => (
          <button key={m.id} onClick={() => setSelected(m.id)} className={`w-full text-left px-4 py-3 ${i > 0 ? "border-t divider" : ""} ${selected === m.id ? "bg-parchment2" : ""}`}>
            <div className="flex justify-between"><span className="font-medium text-sm">{m.from}</span>{m.unread && <span className="w-2 h-2 rounded-full bg-biogas"></span>}</div>
            <p className="text-xs text-ash truncate">{m.preview}</p>
          </button>
        ))}
      </Card>
      <Card className="col-span-2 flex flex-col !p-0 min-h-[420px] sm:min-h-0">
        <div className="px-5 py-3 border-b divider font-medium text-sm">{thread?.from}</div>
        <div className="flex-1 p-5 space-y-3 overflow-y-auto">
          {log.map((l, i) => (
            <div key={i} className={`max-w-[75%] px-3 py-2 rounded-lg text-sm ${l.from === "them" ? "bg-parchment2" : "bg-biogas text-white ml-auto"}`}>{l.text}</div>
          ))}
        </div>
        <div className="p-3 border-t divider flex gap-2">
          <input className="flex-1 border border-clayLine rounded-md px-3 py-2 text-sm" placeholder="Type a message…" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && draft.trim()) { setLog((l) => [...l, { from: "me", text: draft }]); setDraft(""); } }} />
          <Button onClick={() => { if (draft.trim()) { setLog((l) => [...l, { from: "me", text: draft }]); setDraft(""); } }}>Send</Button>
        </div>
      </Card>
    </div>
  );
}

export function CommunityEducation() {
  const articles = [
    ["Why sort your waste at the source", "Clean streams turn into higher-value biochar and oil — mixed loads lose value at the hub."],
    ["What happens to your food waste", "A walk through anaerobic digestion, from your bin to community electricity."],
    ["Reading your Green Points", "How points convert to naira, and how to redeem them for marketplace credit."],
  ];
  return (
    <div className="rise">
      <SectionTitle eyebrow="Understand the cycle" title="Learn" sub="Short reads on how the circular bioeconomy works, in plain language." />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {articles.map(([t, d]) => (
          <Card key={t}><p className="font-display text-lg mb-2">{t}</p><p className="text-sm text-ash">{d}</p></Card>
        ))}
      </div>
    </div>
  );
}

export function ImpactMap() {
  const stats = [["Waste diverted", "4,820 kg"], ["CO₂e avoided", "2.1 tonnes"], ["Households served", "312"], ["Active collectors", "18"]];
  return (
    <div className="rise">
      <SectionTitle eyebrow="Community impact" title="Impact map" sub="Ikorodu and surrounding LGAs." />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {stats.map(([l, v]) => (<Card key={l}><p className="text-ash text-sm">{l}</p><p className="font-display text-2xl mt-1">{v}</p></Card>))}
      </div>
      <Card>
        <div className="h-72 rounded-md bg-parchment2 border border-clayLine relative overflow-hidden">
          {[[20, 30], [45, 60], [70, 25], [85, 70], [35, 80], [60, 45]].map(([x, y], i) => (
            <span key={i} className="absolute w-3 h-3 rounded-full bg-biogas stat-blob" style={{ left: x + "%", top: y + "%" }}></span>
          ))}
          <p className="absolute bottom-3 right-3 text-xs text-ash">Markers indicate active collection zones</p>
        </div>
      </Card>
    </div>
  );
}

export function ProfileSettings({ db, role, meId, actions }) {
  const me = (meId && db.users.find((u) => u.id === meId)) || { name: "", location: "" };
  const [name, setName] = useState(me.name || "");
  const [location, setLocation] = useState(me.location || "");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setName(me.name || "");
    setLocation(me.location || "");
  }, [me.id, me.name, me.location]);

  const save = async () => {
    setBusy(true);
    setSaved(false);
    try {
      await actions.updateProfile(meId, { name, location });
      setSaved(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rise max-w-lg">
      <SectionTitle eyebrow="Account" title="Settings" sub={`Signed in as ${role}. Keep your pickup details up to date.`} />
      <Card className="space-y-4">
        <div><label className="text-sm font-medium block mb-1">Full name</label><input required className="w-full border border-clayLine rounded-md px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><label className="text-sm font-medium block mb-1">Location</label><input className="w-full border border-clayLine rounded-md px-3 py-2" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Ikorodu, Lagos" /></div>
        <div className="flex items-center justify-between text-sm"><span>Push notifications</span><input type="checkbox" defaultChecked className="w-4 h-4" /></div>
        <div className="flex items-center justify-between text-sm"><span>SMS pickup reminders</span><input type="checkbox" defaultChecked className="w-4 h-4" /></div>
        {saved && <p className="text-sm text-biogasDeep">Profile saved.</p>}
        <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save changes"}</Button>
      </Card>
    </div>
  );
}

export function AdminDashboard({ stats, db }) {
  if (!stats) return <EmptyState title="Loading…" body="Pulling live counts from the database." />;
  const cards = [
    ["Users", stats.users], ["Active collectors", stats.collectors], ["Processors", stats.processors],
    ["Pending pickups", stats.pendingPickups], ["Orders", stats.orders], ["Waste collected", `${stats.wasteTons} tons`],
  ];
  const recentUsers = [...db.users].sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || ""))).slice(0, 8);
  const recentPickups = db.pickups.slice(0, 8);
  return (
    <div className="rise">
      <SectionTitle eyebrow="Operations" title="Admin dashboard" sub="Live operations overview for EcoCycle Nexus." />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {cards.map(([l, v]) => (<Card key={l}><p className="text-ash text-sm">{l}</p><p className="font-display text-3xl mt-1">{v}</p></Card>))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="!p-0 overflow-hidden">
          <div className="px-5 py-4 border-b divider font-medium">Users & partners</div>
          {recentUsers.map((u, i) => (
            <div key={u.id} className={`px-5 py-3 flex justify-between ${i ? "border-t divider" : ""}`}>
              <div><p className="text-sm font-medium">{u.name}</p><p className="text-xs text-ash">{u.location || "Location not set"}</p></div>
              <Pill tone={u.role === "collector" ? "good" : u.role === "processor" ? "warn" : "neutral"}>{u.role}</Pill>
            </div>
          ))}
          {recentUsers.length === 0 && <p className="p-5 text-sm text-ash">No users yet.</p>}
        </Card>
        <Card className="!p-0 overflow-hidden">
          <div className="px-5 py-4 border-b divider font-medium">Pickup operations</div>
          {recentPickups.map((p, i) => {
            const waste = db.wasteSubmissions.find((w) => w.id === p.wasteId);
            return (
              <div key={p.id} className={`px-5 py-3 flex justify-between gap-3 ${i ? "border-t divider" : ""}`}>
                <div><p className="text-sm font-medium">{p.address}</p><p className="text-xs text-ash">{waste?.type || "Waste"} · ₦{p.payout.toLocaleString()}</p></div>
                <StatusPill status={p.status} />
              </div>
            );
          })}
          {recentPickups.length === 0 && <p className="p-5 text-sm text-ash">No pickup jobs yet.</p>}
        </Card>
      </div>
    </div>
  );
}

export function PaymentMethods() {
  return (
    <div className="rise max-w-lg">
      <SectionTitle eyebrow="Billing" title="Payment methods" sub="Your current EcoCycle Nexus MVP checkout method." />
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Pay on delivery</p>
            <p className="text-sm text-ash mt-1">Orders are recorded securely and paid when the order is delivered.</p>
          </div>
          <Pill tone="good">Active</Pill>
        </div>
        <div className="mt-5 pt-4 border-t divider">
          <p className="text-xs text-ash">Online card, bank transfer and USSD payments can be connected through Paystack after the merchant account and secure server-side webhook are configured.</p>
        </div>
      </Card>
    </div>
  );
}
