import { useState, useEffect, useCallback } from "react";
import { isSupabaseConfigured } from "./supabaseClient";
import { useDB } from "./db";
import * as live from "./liveApi";

/**
 * Returns { db, actions, mode, refresh }.
 * mode is "demo" (localStorage, works with zero setup) or "live"
 * (real Supabase, real accounts, shared across everyone who signs in).
 *
 * `db` always has the same shape: users, wasteSubmissions, pickups,
 * inventory, products, orders, messages, notifications. Screens read
 * from `db` and call `actions.xxx(...)` — they never need to know
 * which mode is active.
 */
export function useAppData(profile) {
  const [demoDB, demoUpdate] = useDB();
  const [liveDB, setLiveDB] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    try {
      const data = await live.fetchAll(profile);
      setLiveDB(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isSupabaseConfigured) refresh();
  }, [refresh]);

  if (!isSupabaseConfigured) {
    // ---------- DEMO MODE ----------
    const actions = {
      submitWaste: async ({ type, weight, address, notes, scheduled }) => {
        demoUpdate((next) => {
          const id = "w" + Date.now();
          const weightKg = Number(weight) || 1;
          const pickupId = "p" + Date.now();
          const rate = type.includes("PET") ? 200 : type.includes("Paper") ? 80 : type.includes("Mixed") ? 70 : 120;
          next.wasteSubmissions = [{ id, userId: "u-individual", type, weightKg, status: "Awaiting confirmation", createdAt: new Date().toISOString().slice(0, 10), pickupId, address, notes }, ...next.wasteSubmissions];
          next.pickups = [{ id: pickupId, wasteId: id, collectorId: null, status: "Available", scheduled: scheduled || "Pending", address, payout: weightKg * rate }, ...next.pickups];
        });
      },
      acceptPickup: async (id) => {
        demoUpdate((next) => { next.pickups = next.pickups.map((p) => (p.id === id ? { ...p, status: "En route", collectorId: "u-collector" } : p)); });
      },
      confirmPickup: async (job, weight) => {
        demoUpdate((next) => {
          next.pickups = next.pickups.map((p) => (p.id === job.id ? { ...p, status: "Completed" } : p));
          next.wasteSubmissions = next.wasteSubmissions.map((w) => (w.id === job.wasteId ? { ...w, status: "Collected", weightKg: Number(weight) } : w));
          const me = next.users.find((u) => u.id === "u-collector");
          if (me) me.wallet += job.payout;
        });
      },
      placeOrder: async (items, total) => {
        demoUpdate((next) => {
          items.forEach(({ product, qty }, i) => {
            if (!product || product.stock < qty) throw new Error(`Not enough stock for ${product?.name || "product"}.`);
            product.stock -= qty;
            next.orders.unshift({ id: "o" + Date.now() + i, userId: "u-individual", productId: product.id, qty, status: "Processing", total: product.price * qty, placed: new Date().toISOString().slice(0, 10) });
          });
        });
      },
      advanceOrder: async (id) => {
        demoUpdate((next) => {
          const seq = ["Processing", "Out for delivery", "Delivered"];
          next.orders = next.orders.map((o) => {
            if (o.id !== id) return o;
            const idx = seq.indexOf(o.status);
            return { ...o, status: seq[Math.min(idx + 1, seq.length - 1)] };
          });
        });
      },
      updateProfile: async (id, { name, location }) => {
        demoUpdate((next) => {
          next.users = next.users.map((u) => (u.id === id ? { ...u, name, location } : u));
        });
      },
    };
    return { db: demoDB, actions, mode: "demo", loading: false, refresh: () => {} };
  }

  // ---------- LIVE MODE ----------
  const db = liveDB || { users: [], wasteSubmissions: [], pickups: [], inventory: [], products: [], orders: [], messages: [], notifications: [] };
  const myId = profile?.id;

  const actions = {
    submitWaste: async ({ type, weight, address, notes, scheduled }) => {
      await live.submitWaste(myId, { type, weightKg: Number(weight) || 1, address, notes, scheduled });
      await refresh();
    },
    acceptPickup: async (id) => {
      await live.acceptPickup(id, myId);
      await refresh();
    },
    confirmPickup: async (job, weight) => {
      await live.confirmPickup(job, Number(weight), myId);
      await refresh();
    },
    placeOrder: async (items, total) => {
      await live.placeOrder(myId, items, total);
      await refresh();
    },
    updateProfile: async (_id, { name, location }) => {
      await live.updateProfile(myId, { name, location });
      await refresh();
    },
    advanceOrder: async (id) => {
      const seq = ["Processing", "Out for delivery", "Delivered"];
      const order = db.orders.find((o) => o.id === id);
      const next = seq[Math.min(seq.indexOf(order.status) + 1, seq.length - 1)];
      await live.advanceOrder(id, next);
      await refresh();
    },
  };

  return { db, actions, mode: "live", loading, refresh };
}
