import { useState, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "./supabaseClient";

/* ============================================================
   DATA LAYER
   Mirrors the 10-table schema (users, waste_submissions, pickups,
   collectors, processors, inventory, products, orders, payments,
   notifications/messages).

   Right now this always runs on the local mock (localStorage), so
   the prototype works instantly for anyone who opens the deployed
   link, with no backend to set up. When VITE_SUPABASE_URL /
   VITE_SUPABASE_ANON_KEY are set (see src/lib/supabaseClient.js),
   `isSupabaseConfigured` is true — that's the flag to swap the
   functions below for real supabase.from(...) calls one table at a
   time, without changing any screen component (they only call
   `update()` and read from `db`).
   ============================================================ */

const STORAGE_KEY = "ecocycle_nexus_v1";

const seed = () => ({
  currentUserId: "u-individual",
  users: [
    { id: "u-individual", name: "Amara Chukwu", role: "individual", location: "Ikorodu, Lagos", points: 1240, wallet: 8600 },
    { id: "u-collector", name: "Tunde Bakare", role: "collector", location: "Ikorodu, Lagos", vehicle: "Tricycle - Keke", rating: 4.8, wallet: 34200 },
    { id: "u-processor", name: "GreenCycle Processing Hub", role: "processor", location: "Ikorodu Industrial Layout", wallet: 512000 },
  ],
  wasteSubmissions: [
    { id: "w1", userId: "u-individual", type: "Organic (food waste)", weightKg: 12, status: "Collected", createdAt: "2026-09-08", pickupId: "p1" },
    { id: "w2", userId: "u-individual", type: "Plastics (PET)", weightKg: 4, status: "Pending pickup", createdAt: "2026-09-10", pickupId: "p2" },
    { id: "w3", userId: "u-individual", type: "Agricultural residue", weightKg: 30, status: "Awaiting confirmation", createdAt: "2026-09-11", pickupId: null },
  ],
  pickups: [
    { id: "p1", wasteId: "w1", collectorId: "u-collector", status: "Completed", scheduled: "2026-09-08 10:00", address: "14 Odogunyan Rd, Ikorodu", payout: 1800 },
    { id: "p2", wasteId: "w2", collectorId: "u-collector", status: "En route", scheduled: "2026-09-12 09:30", address: "14 Odogunyan Rd, Ikorodu", payout: 900 },
    { id: "p3", wasteId: null, collectorId: "u-collector", status: "Available", scheduled: "2026-09-12 13:00", address: "Ita-Elewa Market, Ikorodu", payout: 2400 },
  ],
  inventory: [
    { id: "i1", material: "Digestate (organic slurry)", qtyKg: 820, source: "Market collections" },
    { id: "i2", material: "Shredded PET flakes", qtyKg: 340, source: "Household collections" },
    { id: "i3", material: "Crop residue (dry)", qtyKg: 1120, source: "Farm collections" },
  ],
  products: [
    { id: "pr1", name: "Biochar (5kg bag)", category: "Soil amendment", price: 2500, stock: 140, blurb: "Slow-release soil conditioner from pyrolyzed crop residue." },
    { id: "pr2", name: "Synergy Oil (5L)", category: "Fuel", price: 6200, stock: 60, blurb: "Refined pyrolysis oil for generators and diesel engines." },
    { id: "pr3", name: "Bio-LPG Cylinder (12.5kg)", category: "Cooking fuel", price: 9800, stock: 35, blurb: "Biogas-derived cooking gas, refillable cylinder exchange." },
    { id: "pr4", name: "Organic Fertilizer (25kg)", category: "Fertilizer", price: 4300, stock: 210, blurb: "Nutrient-dense digestate fertilizer for smallholder farms." },
  ],
  orders: [
    { id: "o1", userId: "u-individual", productId: "pr4", qty: 2, status: "Out for delivery", total: 8600, placed: "2026-09-09" },
  ],
  messages: [
    { id: "m1", from: "Tunde Bakare (Collector)", preview: "I'm 5 minutes away from your pickup point.", time: "9:12 AM", unread: true },
    { id: "m2", from: "EcoCycle Support", preview: "Your biochar order has shipped.", time: "Yesterday", unread: false },
  ],
  notifications: [
    { id: "n1", text: "Pickup #p2 is en route — Tunde will arrive by 9:30 AM.", time: "10m ago", type: "pickup" },
    { id: "n2", text: "You earned 60 points for your last waste submission.", time: "1h ago", type: "reward" },
    { id: "n3", text: "New job available near Ita-Elewa Market — ₦2,400 payout.", time: "3h ago", type: "job" },
  ],
});

function loadDB() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  const s = seed();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  return s;
}
function saveDB(db) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

export function useDB() {
  const [db, setDB] = useState(loadDB);
  const update = useCallback((fn) => {
    setDB((prev) => {
      const next = { ...prev };
      fn(next);
      saveDB(next);
      return { ...next };
    });
  }, []);
  return [db, update];
}

export { isSupabaseConfigured };
