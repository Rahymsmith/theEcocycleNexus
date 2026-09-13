import { supabase } from "./supabaseClient";

/* Production MVP data layer.
   All writes that affect money, stock, or job assignment are delegated
   to database functions so two users cannot accidentally perform the
   same operation at the same time. */

const emptyDb = () => ({
  users: [], wasteSubmissions: [], pickups: [], inventory: [],
  products: [], orders: [], messages: [], notifications: [],
});

const mapUser = (r) => ({
  id: r.id, authId: r.auth_id, name: r.name, role: r.role, location: r.location,
  points: r.points ?? 0, wallet: Number(r.wallet ?? 0), vehicle: r.vehicle, rating: r.rating, createdAt: r.created_at,
});
const mapWaste = (r) => ({
  id: r.id, userId: r.user_id, type: r.type, weightKg: Number(r.weight_kg),
  status: r.status, createdAt: (r.created_at || "").slice(0, 10),
  pickupId: r.pickup_id || null, address: r.address, notes: r.notes,
});
const mapPickup = (r) => ({
  id: r.id, wasteId: r.waste_id, collectorId: r.collector_id, status: r.status,
  scheduled: r.scheduled ? new Date(r.scheduled).toLocaleString() : "",
  address: r.address, payout: Number(r.payout ?? 0),
});
const mapInventory = (r) => ({ id: r.id, material: r.material, qtyKg: Number(r.qty_kg), source: r.source });
const mapProduct = (r) => ({ id: r.id, name: r.name, category: r.category, price: Number(r.price), stock: r.stock, blurb: r.blurb });
const mapOrder = (r) => ({ id: r.id, userId: r.user_id, productId: r.product_id, qty: r.qty, status: r.status, total: Number(r.total ?? 0), placed: (r.placed_at || "").slice(0, 10) });
const mapMessage = (r) => ({ id: r.id, from: r.sender_id, preview: r.body, time: new Date(r.created_at).toLocaleTimeString(), unread: !r.read });
const mapNotification = (r) => ({ id: r.id, text: r.text, time: new Date(r.created_at).toLocaleTimeString(), type: r.type });

export async function fetchAll(profile) {
  if (!profile) return emptyDb();

  const isAdmin = profile.role === "admin";
  const isCollector = profile.role === "collector";
  const isProcessor = profile.role === "processor";

  // Cap on every list query. At 2000+ users, an unbounded `select("*")` on
  // tables like waste_submissions/pickups/orders will (a) get slower every
  // week as history grows, and (b) silently hit Supabase's default 1000-row
  // cap and start dropping rows with no error. Screens here only ever need
  // "recent" data, so a bounded, ordered fetch is both faster and correct.
  const RECENT = 200;

  const [users, waste, pickups, inventory, products, orders, messages, notifications] = await Promise.all([
    isAdmin
      ? supabase.from("users").select("*").order("created_at", { ascending: false }).limit(RECENT)
      : supabase.from("users").select("*").in("role", isCollector ? ["individual", "collector", "processor"] : ["collector", "processor"]).limit(RECENT),
    isAdmin || isProcessor
      ? supabase.from("waste_submissions").select("*").order("created_at", { ascending: false }).limit(RECENT)
      : isCollector
        ? supabase.from("waste_submissions").select("*").order("created_at", { ascending: false }).limit(RECENT)
        : supabase.from("waste_submissions").select("*").eq("user_id", profile.id).order("created_at", { ascending: false }).limit(RECENT),
    supabase.from("pickups").select("*").order("created_at", { ascending: false }).limit(RECENT),
    (isAdmin || isProcessor) ? supabase.from("inventory").select("*").limit(RECENT) : Promise.resolve({ data: [], error: null }),
    supabase.from("products").select("*").order("name").limit(RECENT),
    (isAdmin || isProcessor)
      ? supabase.from("orders").select("*").order("placed_at", { ascending: false }).limit(RECENT)
      : supabase.from("orders").select("*").eq("user_id", profile.id).order("placed_at", { ascending: false }).limit(RECENT),
    supabase.from("messages").select("*").order("created_at", { ascending: false }).limit(RECENT),
    supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(RECENT),
  ]);

  const results = [users, waste, pickups, inventory, products, orders, messages, notifications];
  const firstError = results.find((r) => r.error);
  if (firstError) throw firstError.error;

  return {
    users: (users.data || []).map(mapUser),
    wasteSubmissions: (waste.data || []).map(mapWaste),
    pickups: (pickups.data || []).map(mapPickup),
    inventory: (inventory.data || []).map(mapInventory),
    products: (products.data || []).map(mapProduct),
    orders: (orders.data || []).map(mapOrder),
    messages: (messages.data || []).map(mapMessage),
    notifications: (notifications.data || []).map(mapNotification),
  };
}

export async function submitWaste(profileId, { type, weightKg, address, notes, scheduled }) {
  const { error } = await supabase.from("waste_submissions").insert({
    user_id: profileId,
    type,
    weight_kg: weightKg,
    address,
    notes: notes || null,
    scheduled: scheduled ? new Date(scheduled).toISOString() : null,
    status: "Awaiting confirmation",
  });
  if (error) throw error;
}

export async function acceptPickup(pickupId, collectorProfileId) {
  const { data, error } = await supabase.rpc("accept_pickup", {
    p_pickup_id: pickupId,
    p_collector_id: collectorProfileId,
  });
  if (error) throw error;
  if (!data) throw new Error("That pickup is no longer available.");
}

export async function confirmPickup(pickup, weightKg, collectorProfileId) {
  const { data, error } = await supabase.rpc("confirm_pickup", {
    p_pickup_id: pickup.id,
    p_weight_kg: Number(weightKg),
    p_collector_id: collectorProfileId,
  });
  if (error) throw error;
  if (!data) throw new Error("Pickup could not be confirmed.");
}

export async function placeOrder(profileId, items, total) {
  const payload = items.map(({ product, qty }) => ({ product_id: product.id, qty: Number(qty) }));
  const { data, error } = await supabase.rpc("place_order", {
    p_user_id: profileId,
    p_items: payload,
    p_total: Number(total),
  });
  if (error) throw error;
  return data;
}

export async function advanceOrder(orderId, nextStatus) {
  const { error } = await supabase.from("orders").update({ status: nextStatus }).eq("id", orderId);
  if (error) throw error;
}

export async function updateProfile(profileId, { name, location }) {
  const cleanName = String(name || "").trim();
  const cleanLocation = String(location || "").trim();
  if (!cleanName) throw new Error("Name is required.");
  const { error } = await supabase.from("users")
    .update({ name: cleanName, location: cleanLocation || null })
    .eq("id", profileId);
  if (error) throw error;
}

export async function fetchAdminStats() {
  const count = (table, filter) => {
    let q = supabase.from(table).select("*", { count: "exact", head: true });
    if (filter) q = filter(q);
    return q;
  };
  const [users, collectors, processors, pendingPickups, orders, waste] = await Promise.all([
    count("users"),
    count("users", (q) => q.eq("role", "collector")),
    count("users", (q) => q.eq("role", "processor")),
    count("pickups", (q) => q.in("status", ["Available", "En route"])),
    count("orders"),
    supabase.from("waste_submissions").select("weight_kg").eq("status", "Collected"),
  ]);
  const firstError = [users, collectors, processors, pendingPickups, orders, waste].find((r) => r.error);
  if (firstError) throw firstError.error;
  const totalKg = (waste.data || []).reduce((s, w) => s + Number(w.weight_kg || 0), 0);
  return {
    users: users.count ?? 0,
    collectors: collectors.count ?? 0,
    processors: processors.count ?? 0,
    pendingPickups: pendingPickups.count ?? 0,
    orders: orders.count ?? 0,
    wasteTons: (totalKg / 1000).toFixed(2),
  };
}
