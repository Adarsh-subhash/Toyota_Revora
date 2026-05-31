import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import LoginPortal from "./components/LoginPortal";
import AdminConsole from "./components/AdminConsole";
import OfficerConsole from "./components/OfficerConsole";

import glanzaImg from "./assets/glanza.png";
import fortunerImg from "./assets/fortuner.png";
import innovaImg from "./assets/innova_hycross.png";
import camryImg from "./assets/camry.png";
import taisorImg from "./assets/taisor.png";
import rumionImg from "./assets/rumion.png";
import legenderImg from "./assets/legender.png";

// ==================== FACTORY DEFAULT STATE ====================
const DEFAULT_STATE = {
  currentUser: null, // "admin" | "officer" | null
  currentOfficerId: "rohan_sharma",
  currentAdminEmail: "akira.tanaka@toyota.in",
  
  admins: {
    "akira.tanaka@toyota.in": { name: "Akira Tanaka", password: "admin123", region: "Region Admin • South", initials: "AT" }
  },

  slabs: [
    { id: 1, minUnits: 1, maxUnits: 3, ratePerCar: 1000, label: "Tier 1 Payout Slab" },
    { id: 2, minUnits: 4, maxUnits: 7, ratePerCar: 2000, label: "Tier 2 Payout Slab" },
    { id: 3, minUnits: 8, maxUnits: 999, ratePerCar: 3500, label: "Tier 3 Payout Slab" }
  ],
  
  inventory: [
    { id: 1, name: "Fortuner", suffix: "Sigma", variant: "2.8L 4x4 MT", price: 3476000, category: "Premium Utility", photo: fortunerImg, variants: [{ name: "2.8L 4x4 MT", price: 3476000 }, { name: "2.8L 4x2 AT", price: 3290000 }] },
    { id: 2, name: "Innova Hycross", suffix: "VX", variant: "2.0L Hybrid", price: 1870000, category: "Hybrid Smart", photo: innovaImg, variants: [{ name: "2.0L Hybrid", price: 1870000 }, { name: "2.0L Petrol", price: 1650000 }] },
    { id: 3, name: "Glanza", suffix: "G", variant: "1.2L MT Petrol", price: 646000, category: "Core Commuter", photo: glanzaImg, variants: [{ name: "1.2L MT Petrol", price: 646000 }, { name: "1.2L AMT Petrol", price: 712000 }] },
    { id: 4, name: "Camry", suffix: "Executive", variant: "2.5L Hybrid", price: 4748000, category: "Executive Luxury", photo: camryImg, variants: [{ name: "2.5L Hybrid", price: 4748000 }] },
    { id: 5, name: "Urban Cruiser Taisor", suffix: "S", variant: "1.0L Turbo", price: 725000, category: "Core Commuter", photo: taisorImg, variants: [{ name: "1.0L Turbo", price: 725000 }, { name: "1.2L Petrol", price: 675000 }] },
    { id: 6, name: "Rumion", suffix: "S", variant: "NeoDrive MT", price: 955500, category: "Core Commuter", photo: rumionImg, variants: [{ name: "NeoDrive MT", price: 955500 }, { name: "NeoDrive AT", price: 1040000 }] },
    { id: 7, name: "Legender", suffix: "Premium", variant: "2.8L 4x2 AT", price: 4292000, category: "Premium Utility", photo: legenderImg, variants: [{ name: "2.8L 4x2 AT", price: 4292000 }] }
  ],
  
  officers: {
    "rohan_sharma": {
      name: "Rohan Sharma",
      first: "Rohan",
      hub: "Bangalore South",
      region: "KA-01",
      email: "rohan.sharma@toyota.in",
      password: "sales123",
      target: 12,
      rank: "#1",
      rankSpeed: "↑ 2 positions this month",
      salesHistory: [14, 15, 14, 18, 20, 22, 21, 6], 
      payoutHistory: [49000, 52500, 49000, 63000, 70000, 77000, 73500, 12000],
      currentMonthSales: {
        "Fortuner": 4,
        "Innova Hycross": 2
      }
    },
    "anjali_patel": {
      name: "Anjali Patel",
      first: "Anjali",
      hub: "Bangalore East",
      region: "KA-03",
      email: "anjali.patel@toyota.in",
      password: "sales123",
      target: 12,
      rank: "#2",
      rankSpeed: "↑ 1 position this month",
      salesHistory: [12, 13, 11, 15, 14, 18, 16, 5],
      payoutHistory: [42000, 45500, 38500, 52500, 49000, 63000, 56000, 10000],
      currentMonthSales: {
        "Innova Hycross": 5
      }
    },
    "karthik_rao": {
      name: "Karthik Rao",
      first: "Karthik",
      hub: "Bangalore North",
      region: "KA-02",
      email: "karthik.rao@toyota.in",
      password: "sales123",
      target: 12,
      rank: "#3",
      rankSpeed: "↓ 1 position this month",
      salesHistory: [10, 11, 12, 14, 13, 16, 15, 8],
      payoutHistory: [35000, 38500, 42000, 49000, 45500, 56000, 52500, 28000],
      currentMonthSales: {
        "Fortuner": 8
      }
    }
  },
  
  settings: {
    standardTarget: 12,
    regionalBudget: 5400000
  },
  
  activities: [
    { id: 1, user: "Rohan Sharma", detail: "Submitted August sales — 12 units Fortuner", time: "2H AGO", value: "₹42k", type: "sale" },
    { id: 2, user: "Admin", detail: "Updated Tier 3 rate to ₹3,500 / unit", time: "5H AGO", value: "", type: "config" },
    { id: 3, user: "Anjali Patel", detail: "Reached Tier 2 (5 units Hycross)", time: "1D AGO", value: "₹10k", type: "sale" },
    { id: 4, user: "Karthik Rao", detail: "Submitted July reconciliation", time: "2D AGO", value: "₹28k", type: "sale" },
    { id: 5, user: "Admin", detail: "Added Camry Hybrid to inventory", time: "3D AGO", value: "", type: "config" }
  ]
};

export default function App() {
  // ==================== CORE REACT STATE ====================
  const [db, setDb] = useState(() => {
    const local = localStorage.getItem("toyota_smart_react_state");
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (parsed.slabs && parsed.inventory && parsed.officers && parsed.admins) {
          // Dynamic migration: Ensure all inventory cars have 'photo' and 'variants'
          parsed.inventory = parsed.inventory.map(car => {
            if (!car.variants || car.variants.length === 0) {
              car.variants = [{ name: car.variant || "Standard", price: car.price || 0 }];
            }
            
            // Auto-migrate blank photos to static high-resolution bundled assets
            if (!car.photo || car.photo === "") {
              if (car.name === "Fortuner") car.photo = fortunerImg;
              else if (car.name === "Innova Hycross") car.photo = innovaImg;
              else if (car.name === "Glanza") car.photo = glanzaImg;
              else if (car.name === "Camry") car.photo = camryImg;
              else if (car.name === "Urban Cruiser Taisor") car.photo = taisorImg;
              else if (car.name === "Rumion") car.photo = rumionImg;
              else if (car.name === "Legender") car.photo = legenderImg;
            }
            
            return car;
          });
          return parsed;
        }
      } catch (e) {}
    }
    return DEFAULT_STATE;
  });

  const [dbLoading, setDbLoading] = useState(true);
  const [formView, setFormView] = useState("login"); 
  const [loginRole, setLoginRole] = useState("admin"); 
  const [signupRole, setSignupRole] = useState("admin"); 
  const [activeMenu, setActiveMenu] = useState("dashboard"); 
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState({ show: false, message: "" });

  // 1. Asynchronous Mount Database Loader and Auto-Seeder
  useEffect(() => {
    async function loadData() {
      try {
        setDbLoading(true);
        
        // Check if database tables exist and have entries
        const { data: slabsCheck, error: slabsError } = await supabase.from('toyota_slabs').select('*');
        
        if (slabsError) {
          console.error("Database connection error or missing tables:", slabsError);
          // If query fails, fall back gracefully to local state
          setDbLoading(false);
          return;
        }

        // If database is empty, seed it with default values!
        if (!slabsCheck || slabsCheck.length === 0) {
          console.log("Supabase database detected empty. Auto-seeding default states...");
          await seedDatabase();
        }

        // Fetch all tables in parallel
        const [
          profilesRes,
          slabsRes,
          inventoryRes,
          settingsRes,
          activitiesRes
        ] = await Promise.all([
          supabase.from('toyota_profiles').select('*'),
          supabase.from('toyota_slabs').select('*').order('min_units', { ascending: true }),
          supabase.from('toyota_inventory').select('*').order('id', { ascending: true }),
          supabase.from('toyota_settings').select('*'),
          supabase.from('toyota_activities').select('*').order('id', { ascending: false })
        ]);

        if (profilesRes.data && slabsRes.data && inventoryRes.data && settingsRes.data && activitiesRes.data) {
          const fetchedAdmins = {};
          const fetchedOfficers = {};
          
          profilesRes.data.forEach(p => {
            if (p.role === 'admin') {
              fetchedAdmins[p.email] = {
                name: p.name,
                password: p.password,
                region: p.region || "Region Admin • South",
                initials: p.initials || "AT"
              };
            } else {
              fetchedOfficers[p.id] = {
                name: p.name,
                first: p.first || (p.name ? p.name.split(" ")[0] : "Officer"),
                hub: p.hub || "Bangalore South",
                region: p.region || "KA-01",
                email: p.email,
                password: p.password,
                target: p.target || 12,
                rank: p.rank || "#1",
                rankSpeed: p.rank_speed || "",
                salesHistory: p.sales_history || [0,0,0,0,0,0,0,0],
                payoutHistory: p.payout_history || [0,0,0,0,0,0,0,0],
                currentMonthSales: p.current_month_sales || {}
              };
            }
          });

          const targetSetting = settingsRes.data.find(s => s.key === 'standardTarget');
          const budgetSetting = settingsRes.data.find(s => s.key === 'regionalBudget');

          const finalDbShape = {
            currentUser: null,
            currentOfficerId: Object.keys(fetchedOfficers)[0] || "rohan_sharma",
            currentAdminEmail: Object.keys(fetchedAdmins)[0] || "akira.tanaka@toyota.in",
            admins: fetchedAdmins,
            officers: fetchedOfficers,
            slabs: slabsRes.data.map(s => ({
              id: s.id,
              minUnits: s.min_units,
              maxUnits: s.max_units,
              ratePerCar: s.rate_per_car,
              label: s.label
            })),
            inventory: inventoryRes.data.map(car => {
              // Migrate variants JSONB array — if empty, build from flat columns
              let variants = car.variants && car.variants.length > 0
                ? car.variants
                : [{ name: car.variant || "Standard", price: Number(car.price) || 0 }];

              // Apply bundled asset fallback for cars with no stored photo
              let photo = car.photo || "";
              if (!photo || photo === "") {
                if (car.name === "Fortuner") photo = fortunerImg;
                else if (car.name === "Innova Hycross") photo = innovaImg;
                else if (car.name === "Glanza") photo = glanzaImg;
                else if (car.name === "Camry") photo = camryImg;
                else if (car.name === "Urban Cruiser Taisor") photo = taisorImg;
                else if (car.name === "Rumion") photo = rumionImg;
                else if (car.name === "Legender") photo = legenderImg;
              }

              return {
                id: car.id,
                name: car.name,
                suffix: car.suffix,
                variant: car.variant,
                price: Number(car.price),
                category: car.category,
                photo,
                variants
              };
            }),

            settings: {
              standardTarget: targetSetting ? targetSetting.value.value : 12,
              regionalBudget: budgetSetting ? budgetSetting.value.value : 5400000
            },
            activities: activitiesRes.data.map(a => ({
              id: a.id,
              user: a.user_name,
              detail: a.detail,
              time: a.time_label,
              value: a.value_label,
              type: a.type
            }))
          };

          setDb(finalDbShape);
        }
        setDbLoading(false);
      } catch (err) {
        console.error("Critical loader crash:", err);
        setDbLoading(false);
      }
    }

    loadData();
  }, []);

  // Database Seeding Routine
  const seedDatabase = async () => {
    try {
      // 1. Slabs
      await supabase.from('toyota_slabs').insert(
        DEFAULT_STATE.slabs.map(s => ({
          id: s.id,
          min_units: s.minUnits,
          max_units: s.maxUnits,
          rate_per_car: s.ratePerCar,
          label: s.label
        }))
      );

      // 2. Inventory
      await supabase.from('toyota_inventory').insert(
        DEFAULT_STATE.inventory.map(car => ({
          id: car.id,
          name: car.name,
          suffix: car.suffix,
          variant: car.variant,
          price: car.price,
          category: car.category,
          photo: car.photo,
          variants: car.variants
        }))
      );

      // 3. Settings
      await supabase.from('toyota_settings').insert([
        { key: 'standardTarget', value: { value: DEFAULT_STATE.settings.standardTarget } },
        { key: 'regionalBudget', value: { value: DEFAULT_STATE.settings.regionalBudget } }
      ]);

      // 4. Profiles (Admins & Officers)
      const adminProfiles = Object.keys(DEFAULT_STATE.admins).map(email => {
        const admin = DEFAULT_STATE.admins[email];
        return {
          id: email,
          name: admin.name,
          first: admin.name ? admin.name.split(" ")[0] : "Admin",
          hub: 'Headquarters',
          region: admin.region,
          email: email,
          password: admin.password,
          role: 'admin',
          initials: admin.initials,
          target: 12,
          rank: null,
          rank_speed: null,
          sales_history: [],
          payout_history: [],
          current_month_sales: {}
        };
      });

      const officerProfiles = Object.keys(DEFAULT_STATE.officers).map(id => {
        const off = DEFAULT_STATE.officers[id];
        return {
          id: id,
          name: off.name,
          first: off.first,
          hub: off.hub,
          region: off.region,
          email: off.email,
          password: off.password,
          role: 'officer',
          initials: null,
          target: off.target,
          rank: off.rank,
          rank_speed: off.rankSpeed,
          sales_history: off.salesHistory,
          payout_history: off.payoutHistory,
          current_month_sales: off.currentMonthSales
        };
      });

      await supabase.from('toyota_profiles').insert([...adminProfiles, ...officerProfiles]);

      // 5. Activities
      await supabase.from('toyota_activities').insert(
        DEFAULT_STATE.activities.map(a => ({
          id: a.id,
          user_name: a.user,
          detail: a.detail,
          time_label: a.time,
          value_label: a.value,
          type: a.type
        }))
      );

      // 6. Seed default deliveries log
      const initialSalesLog = [
        { id: 1, officer_id: "rohan_sharma", car_name: "Fortuner", variant: "2.8L 4x4 MT", price: 3476000, date: "2024-08-12" },
        { id: 2, officer_id: "rohan_sharma", car_name: "Fortuner", variant: "2.8L 4x4 MT", price: 3476000, date: "2024-08-14" },
        { id: 3, officer_id: "rohan_sharma", car_name: "Fortuner", variant: "2.8L 4x2 AT", price: 3290000, date: "2024-08-18" },
        { id: 4, officer_id: "rohan_sharma", car_name: "Fortuner", variant: "2.8L 4x2 AT", price: 3290000, date: "2024-08-20" },
        { id: 5, officer_id: "rohan_sharma", car_name: "Innova Hycross", variant: "2.0L Hybrid", price: 1870000, date: "2024-08-22" },
        { id: 6, officer_id: "rohan_sharma", car_name: "Innova Hycross", variant: "2.0L Petrol", price: 1650000, date: "2024-08-25" },
        { id: 7, officer_id: "anjali_patel", car_name: "Innova Hycross", variant: "2.0L Hybrid", price: 1870000, date: "2024-08-15" },
        { id: 8, officer_id: "karthik_rao", car_name: "Fortuner", variant: "2.8L 4x4 MT", price: 3476000, date: "2024-08-16" }
      ];
      await supabase.from('toyota_sales_log').insert(initialSalesLog);

      // 7. Seed schedules
      const initialSchedules = [
        { id: 1, target_date: "2026-06-01", target_slab_id: 3, new_rate: 4000, label: "Tier 3 June Adjustment", status: "Scheduled" },
        { id: 2, target_date: "2026-07-01", target_slab_id: 2, new_rate: 2200, label: "Tier 2 Summer Promo", status: "Scheduled" }
      ];
      await supabase.from('toyota_slab_schedules').insert(initialSchedules);

      console.log("Database seeded successfully!");
    } catch (e) {
      console.error("Auto seeding failed:", e);
    }
  };

  // Keep local storage active as an additional offline fallback layer
  useEffect(() => {
    localStorage.setItem("toyota_smart_react_state", JSON.stringify(db));
  }, [db]);

  // ==================== HTML5 HISTORY ROUTER ====================
  useEffect(() => {
    const handleUrlRouting = () => {
      const path = window.location.pathname.toLowerCase();
      
      if (path.includes("admin")) {
        if (db.currentUser !== "admin") {
          setFormView("login");
          setDb(prev => ({ ...prev, currentUser: null }));
          window.history.replaceState(null, "", "/signin");
        }
      } else if (path.includes("officer")) {
        if (db.currentUser !== "officer") {
          setFormView("login");
          setDb(prev => ({ ...prev, currentUser: null }));
          window.history.replaceState(null, "", "/signin");
        }
      } else if (path.includes("signup") || path.includes("singup") || path.includes("sing-up")) {
        if (db.currentUser === null) {
          setFormView("signup");
        }
      } else if (path.includes("forgot")) {
        if (db.currentUser === null) {
          setFormView("forgot");
        }
      } else {
        if (db.currentUser === null) {
          setFormView("login");
        }
      }
    };

    handleUrlRouting();
    window.addEventListener("popstate", handleUrlRouting);
    return () => window.removeEventListener("popstate", handleUrlRouting);
  }, [db.currentUser]);

  useEffect(() => {
    const syncURL = () => {
      const path = window.location.pathname.toLowerCase();
      
      if (db.currentUser === "admin") {
        if (!path.startsWith("/admin")) {
          window.history.pushState(null, "", "/admin");
        }
      } else if (db.currentUser === "officer") {
        if (!path.startsWith("/officer")) {
          window.history.pushState(null, "", "/officer");
        }
      } else {
        if (formView === "signup") {
          if (!path.includes("signup") && !path.includes("singup")) {
            window.history.pushState(null, "", "/signup");
          }
        } else if (formView === "forgot") {
          if (!path.includes("forgot")) {
            window.history.pushState(null, "", "/forgot");
          }
        } else {
          if (path !== "/signin" && path !== "/sign-in" && path !== "/sign%20in" && path !== "/") {
            window.history.pushState(null, "", "/signin");
          }
        }
      }
    };
    syncURL();
  }, [db.currentUser, formView]);

  useEffect(() => {
    window.onSearchQueryClear = () => setSearchQuery("");
  }, []);

  // ==================== CALCULATION ENGINE ====================
  const calculatePayout = (totalUnits) => {
    let matchedSlab = null;
    let nextSlab = null;
    let totalPayout = 0;

    const sortedSlabs = [...db.slabs].sort((a, b) => a.minUnits - b.minUnits);

    // 1. Identify the current tier label for display
    for (let i = 0; i < sortedSlabs.length; i++) {
      const slab = sortedSlabs[i];
      if (totalUnits >= slab.minUnits && totalUnits <= slab.maxUnits) {
        matchedSlab = slab;
        nextSlab = sortedSlabs[i + 1] || null;
        break;
      }
    }

    if (totalUnits === 0) {
      matchedSlab = { ratePerCar: 0, label: "No Tier Reached" };
      nextSlab = sortedSlabs[0];
    }

    if (!matchedSlab && totalUnits > 0) {
      matchedSlab = sortedSlabs[sortedSlabs.length - 1];
      nextSlab = null;
    }

    // 2. Calculate progressive/marginal payout based on units falling into each slab
    for (let i = 0; i < sortedSlabs.length; i++) {
      const slab = sortedSlabs[i];
      if (totalUnits < slab.minUnits) break; // We haven't reached this slab yet

      // Number of possible units that can fit inside this slab (e.g. 1 to 3 = 3 units)
      const maxUnitsInSlab = (slab.maxUnits - slab.minUnits) + 1;
      
      // How many actual units the officer sold inside this slab
      const unitsInThisSlab = Math.min((totalUnits - slab.minUnits) + 1, maxUnitsInSlab);
      
      if (unitsInThisSlab > 0) {
        totalPayout += (unitsInThisSlab * slab.ratePerCar);
      }
    }

    let unitsNeededForNext = 0;
    if (nextSlab) {
      unitsNeededForNext = nextSlab.minUnits - totalUnits;
    }

    return {
      unitsSold: totalUnits,
      unlockedTier: matchedSlab ? matchedSlab.label : "None",
      appliedRate: matchedSlab ? matchedSlab.ratePerCar : 0,
      payout: totalPayout,
      nextTier: nextSlab ? nextSlab.label : "None",
      nextRate: nextSlab ? nextSlab.ratePerCar : 0,
      unitsNeeded: unitsNeededForNext,
      percentageToNext: nextSlab ? (totalUnits / nextSlab.minUnits) * 100 : 100
    };
  };

  // ==================== AUTHENTICATION WORKFLOWS ====================
  const handleLogin = async (email, password, role) => {
    const cleanEmail = email.trim().toLowerCase();
    
    try {
      const { data, error } = await supabase
        .from('toyota_profiles')
        .select('*')
        .eq('email', cleanEmail)
        .eq('role', role)
        .single();

      if (error || !data) {
        showToast(`Invalid ${role} credentials!`);
        return;
      }

      if (data.password === password) {
        setDb(prev => ({
          ...prev,
          currentUser: role,
          currentOfficerId: role === "officer" ? data.id : prev.currentOfficerId,
          currentAdminEmail: role === "admin" ? cleanEmail : prev.currentAdminEmail
        }));
        setActiveMenu("dashboard");
        showToast(role === "admin" ? "Welcome back Administrator!" : `Welcome back, ${data.first}!`);
      } else {
        showToast(`Invalid ${role} credentials!`);
      }
    } catch (err) {
      console.error(err);
      showToast("Database connection error. Logging in offline...");
      // Offline fallback
      if (role === "admin") {
        const admin = db.admins[cleanEmail];
        if (admin && admin.password === password) {
          setDb(prev => ({ ...prev, currentUser: "admin", currentAdminEmail: cleanEmail }));
          setActiveMenu("dashboard");
        }
      } else {
        let matchedId = null;
        Object.keys(db.officers).forEach(id => {
          if (db.officers[id].email.toLowerCase() === cleanEmail && db.officers[id].password === password) {
            matchedId = id;
          }
        });
        if (matchedId) {
          setDb(prev => ({ ...prev, currentUser: "officer", currentOfficerId: matchedId }));
          setActiveMenu("dashboard");
        }
      }
    }
  };

  const handleSignupSubmit = async (signupData) => {
    const { name, email, region, password, confirm, role } = signupData;
    const cleanEmail = email.trim().toLowerCase();
    
    if (password !== confirm) {
      showToast("Error: Passwords do not match!");
      return;
    }

    const id = role === "admin" ? cleanEmail : (name ? name.toLowerCase().replace(/\s+/g, "_") : "user");
    const first = name ? name.split(" ")[0] : "User";
    const initials = name ? name.split(" ").map(n => n[0]).join("").toUpperCase() : "US";

    const newProfile = {
      id,
      name,
      first,
      hub: role === "officer" ? (region || "Bangalore South") : 'Headquarters',
      region: role === "officer" ? `KA-0${Math.floor(Math.random() * 8) + 4}` : (region || "Region Admin • South"),
      email: cleanEmail,
      password,
      role,
      initials: role === "admin" ? initials : null,
      target: role === "officer" ? (db.settings.standardTarget || 12) : 12,
      rank: role === "officer" ? `#${Object.keys(db.officers).length + 1}` : null,
      rank_speed: role === "officer" ? "↑ New Officer" : null,
      sales_history: role === "officer" ? [0,0,0,0,0,0,0,0] : [],
      payout_history: role === "officer" ? [0,0,0,0,0,0,0,0] : [],
      current_month_sales: {}
    };

    try {
      const { error } = await supabase.from('toyota_profiles').insert([newProfile]);
      if (error) {
        showToast("Error creating profile: " + error.message);
        return;
      }

      const newActivity = {
        id: Date.now(),
        user_name: "System",
        detail: `Registered new ${role}: ${name}`,
        time_label: "JUST NOW",
        value_label: "",
        type: role === "admin" ? "config" : "sale"
      };
      await supabase.from('toyota_activities').insert([newActivity]);

      setDb(prev => {
        const nextAdmins = { ...prev.admins };
        const nextOfficers = { ...prev.officers };
        
        if (role === "admin") {
          nextAdmins[cleanEmail] = { name, password, region: newProfile.region, initials };
        } else {
          nextOfficers[id] = {
            name, first, hub: newProfile.hub, region: newProfile.region, email: cleanEmail, password,
            target: newProfile.target, rank: newProfile.rank, rankSpeed: newProfile.rank_speed,
            salesHistory: newProfile.sales_history, payoutHistory: newProfile.payout_history, currentMonthSales: {}
          };
        }

        return {
          ...prev,
          admins: nextAdmins,
          officers: nextOfficers,
          currentUser: role,
          currentOfficerId: role === "officer" ? id : prev.currentOfficerId,
          currentAdminEmail: role === "admin" ? cleanEmail : prev.currentAdminEmail,
          activities: [{
            id: newActivity.id,
            user: newActivity.user_name,
            detail: newActivity.detail,
            time: newActivity.time_label,
            value: newActivity.value_label,
            type: newActivity.type
          }, ...prev.activities]
        };
      });

      setActiveMenu("dashboard");
      showToast(`${role === "admin" ? "Admin account" : "Sales Officer profile"} "${name}" registered and logged in immediately!`);
    } catch (err) {
      console.error(err);
      showToast("Offline mode. Registered local account.");
    }
  };

  const handleForgotPasswordSubmit = async (resetData) => {
    const { email, newPassword, confirm } = resetData;
    const cleanEmail = email.trim().toLowerCase();
    
    if (newPassword !== confirm) {
      showToast("Error: Passwords do not match!");
      return;
    }

    try {
      const { data, error } = await supabase
        .from('toyota_profiles')
        .select('*')
        .eq('email', cleanEmail)
        .single();

      if (error || !data) {
        showToast("Error: Work Email ID not found in records.");
        return;
      }

      const { error: updateError } = await supabase
        .from('toyota_profiles')
        .update({ password: newPassword })
        .eq('email', cleanEmail);

      if (updateError) {
        showToast("Error updating password: " + updateError.message);
        return;
      }

      setDb(prev => {
        const nextAdmins = { ...prev.admins };
        const nextOfficers = { ...prev.officers };
        
        if (data.role === "admin") {
          nextAdmins[cleanEmail].password = newPassword;
        } else {
          nextOfficers[data.id].password = newPassword;
        }

        return {
          ...prev,
          admins: nextAdmins,
          officers: nextOfficers,
          currentUser: data.role,
          currentOfficerId: data.role === "officer" ? data.id : prev.currentOfficerId,
          currentAdminEmail: data.role === "admin" ? cleanEmail : prev.currentAdminEmail
        };
      });

      setActiveMenu("dashboard");
      showToast("Password updated successfully! Direct dashboard login active.");
      setFormView("login");
    } catch (err) {
      console.error(err);
      showToast("Offline update triggered locally.");
    }
  };

  const handleLogout = () => {
    setDb(prev => ({ ...prev, currentUser: null }));
    setFormView("login");
    setLoginRole("admin");
    showToast("Logged out successfully.");
  };

  // ==================== WORKSPACE OPERATIONS ====================
  const changeStepperSales = async (carName, delta) => {
    const officerId = db.currentOfficerId;
    const currentSales = { ...db.officers[officerId].currentMonthSales };
    const current = currentSales[carName] || 0;
    let nextUnits = current + delta;
    if (nextUnits < 0) nextUnits = 0;
    
    currentSales[carName] = nextUnits;

    setDb(prev => {
      const nextOfficers = { ...prev.officers };
      nextOfficers[officerId].currentMonthSales = currentSales;
      return { ...prev, officers: nextOfficers };
    });

    try {
      await supabase
        .from('toyota_profiles')
        .update({ current_month_sales: currentSales })
        .eq('id', officerId);
    } catch (e) {
      console.error(e);
    }
  };

  const submitMonthlyReconciliation = async () => {
    const officerId = db.currentOfficerId;
    const officer = db.officers[officerId];
    let total = 0;
    Object.keys(officer.currentMonthSales).forEach(c => total += officer.currentMonthSales[c]);
    const calc = calculatePayout(total);

    const nextSalesHistory = [...officer.salesHistory];
    nextSalesHistory[nextSalesHistory.length - 1] = total;

    const nextPayoutHistory = [...officer.payoutHistory];
    nextPayoutHistory[nextPayoutHistory.length - 1] = calc.payout;

    const newActivity = {
      id: Date.now(),
      user_name: officer.name,
      detail: `Logged monthly deliveries: ${total} units`,
      time_label: "JUST NOW",
      value_label: `₹${(calc.payout/1000).toFixed(0)}k`,
      type: "sale"
    };

    setDb(prev => {
      const nextOfficers = { ...prev.officers };
      nextOfficers[officerId].salesHistory = nextSalesHistory;
      nextOfficers[officerId].payoutHistory = nextPayoutHistory;

      return {
        ...prev,
        officers: nextOfficers,
        activities: [{
          id: newActivity.id,
          user: newActivity.user_name,
          detail: newActivity.detail,
          time: newActivity.time_label,
          value: newActivity.value_label,
          type: newActivity.type
        }, ...prev.activities]
      };
    });

    try {
      await Promise.all([
        supabase
          .from('toyota_profiles')
          .update({
            sales_history: nextSalesHistory,
            payout_history: nextPayoutHistory
          })
          .eq('id', officerId),
        supabase.from('toyota_activities').insert([newActivity])
      ]);
    } catch (e) {
      console.error(e);
    }

    showToast(`Monthly sales reconciled successfully! Payout: ₹${calc.payout.toLocaleString("en-IN")}`);
    setActiveMenu("dashboard");
  };

  const handleSaleModalSubmit = async (model, quantity) => {
    const officerId = db.currentOfficerId;
    const officer = db.officers[officerId];
    
    const nextSales = { ...officer.currentMonthSales };
    nextSales[model] = (nextSales[model] || 0) + quantity;

    let total = 0;
    Object.keys(nextSales).forEach(c => total += nextSales[c]);
    const calc = calculatePayout(total);

    const nextSalesHistory = [...officer.salesHistory];
    nextSalesHistory[nextSalesHistory.length - 1] = total;

    const nextPayoutHistory = [...officer.payoutHistory];
    nextPayoutHistory[nextPayoutHistory.length - 1] = calc.payout;

    const newActivity = {
      id: Date.now(),
      user_name: officer.name,
      detail: `Logged sale: ${quantity} units of ${model}`,
      time_label: "JUST NOW",
      value_label: `+₹${(quantity * calc.appliedRate / 1000).toFixed(1)}k`,
      type: "sale"
    };

    setDb(prev => {
      const nextOfficers = { ...prev.officers };
      nextOfficers[officerId].currentMonthSales = nextSales;
      nextOfficers[officerId].salesHistory = nextSalesHistory;
      nextOfficers[officerId].payoutHistory = nextPayoutHistory;

      return {
        ...prev,
        officers: nextOfficers,
        activities: [{
          id: newActivity.id,
          user: newActivity.user_name,
          detail: newActivity.detail,
          time: newActivity.time_label,
          value: newActivity.value_label,
          type: newActivity.type
        }, ...prev.activities]
      };
    });

    try {
      await Promise.all([
        supabase
          .from('toyota_profiles')
          .update({
            current_month_sales: nextSales,
            sales_history: nextSalesHistory,
            payout_history: nextPayoutHistory
          })
          .eq('id', officerId),
        supabase.from('toyota_activities').insert([newActivity])
      ]);
    } catch (e) {
      console.error(e);
    }

    showToast(`Successfully logged ${quantity} units of ${model}!`);
  };

  const togglePortalQuickly = () => {
    if (db.currentUser === "admin") {
      setDb(prev => ({ ...prev, currentUser: "officer", currentOfficerId: "rohan_sharma" }));
      setActiveMenu("dashboard");
      showToast("Accessing Rohan's Officer portal.");
    } else {
      setDb(prev => ({ ...prev, currentUser: "admin" }));
      setActiveMenu("dashboard");
      showToast("Accessing Akira's Administration console.");
    }
  };

  // ==================== HELPER FUNCS ====================
  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: "" }), 3000);
  };

  const exportCSV = () => {
    let csv = "data:text/csv;charset=utf-8,Officer Name,Region Hub,KA Code,Units Sold MTD,Applied Incentive Slab,Current Monthly Payout\n";
    Object.keys(db.officers).forEach(id => {
      const off = db.officers[id];
      let total = 0;
      Object.keys(off.currentMonthSales).forEach(c => total += off.currentMonthSales[c]);
      const calc = calculatePayout(total);
      csv += `"${off.name}","${off.hub}","${off.region}",${total},"${calc.unlockedTier}",₹${calc.payout}\n`;
    });
    const encoded = encodeURI(csv);
    const link = document.createElement("a");
    link.href = encoded;
    link.download = "Toyota_Smart_Payout_Spend.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Reconciliations exported to CSV.");
  };

  if (dbLoading) {
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "radial-gradient(circle at center, #1E293B, #0F172A)",
        fontFamily: "'Outfit', 'Inter', sans-serif"
      }}>
        <div style={{
          width: "60px",
          height: "60px",
          border: "4px solid rgba(215, 0, 15, 0.1)",
          borderTop: "4px solid #D7000F",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
          boxShadow: "0 0 20px rgba(215, 0, 15, 0.2)"
        }}></div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <h2 style={{ color: "#F8FAFC", marginTop: "24px", fontWeight: "700", letterSpacing: "1px", fontSize: "18px" }}>CONNECTING DATABASE</h2>
        <p style={{ color: "#94A3B8", fontSize: "13px", marginTop: "8px", fontWeight: "500" }}>Securing connection to your Supabase project...</p>
      </div>
    );
  }

  const activeOfficer = db.officers[db.currentOfficerId];
  const activeAdmin = db.admins[db.currentAdminEmail] || null;

  return (
    <div>
      {/* Toast Alert */}
      <div className={`toast ${toast.show ? "show" : ""}`}>
        <div className="toast-content">
          <span className="toast-icon">✓</span>
          <span className="toast-text">{toast.message}</span>
        </div>
      </div>

      {/* PORTAL AUTHENTICATION VIEW */}
      {db.currentUser === null && (
        <LoginPortal
          formView={formView}
          setFormView={setFormView}
          loginRole={loginRole}
          setLoginRole={setLoginRole}
          signupRole={signupRole}
          setSignupRole={setSignupRole}
          onLogin={handleLogin}
          onSignup={handleSignupSubmit}
          onForgotPassword={handleForgotPasswordSubmit}
        />
      )}

      {/* PORTAL MAIN CONSOLES VIEW */}
      {db.currentUser !== null && (
        <div className="portal-container">
          
          <Sidebar
            currentUser={db.currentUser}
            activeMenu={activeMenu}
            setActiveMenu={setActiveMenu}
            onLogout={handleLogout}
            activeOfficer={activeOfficer}
            activeAdmin={activeAdmin}
          />

          <main className="workspace">
            
            <div className="workspace-content">
              {db.currentUser === "admin" ? (
                <AdminConsole
                  db={db}
                  setDb={setDb}
                  activeMenu={activeMenu}
                  setActiveMenu={setActiveMenu}
                  searchQuery={searchQuery}
                  calculatePayout={calculatePayout}
                  onShowToast={showToast}
                  exportCSV={exportCSV}
                />
              ) : (
                <OfficerConsole
                  db={db}
                  setDb={setDb}
                  activeMenu={activeMenu}
                  setActiveMenu={setActiveMenu}
                  searchQuery={searchQuery}
                  calculatePayout={calculatePayout}
                  onShowToast={showToast}
                  changeStepperSales={changeStepperSales}
                  submitMonthlyReconciliation={submitMonthlyReconciliation}
                  handleSaleModalSubmit={handleSaleModalSubmit}
                />
              )}
            </div>

          </main>
        </div>
      )}

    </div>
  );
}
