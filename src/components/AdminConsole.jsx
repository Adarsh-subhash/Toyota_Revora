import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import Chart from "chart.js/auto";

export default function AdminConsole({
  db,
  setDb,
  activeMenu,
  setActiveMenu,
  searchQuery,
  calculatePayout,
  onShowToast,
  exportCSV
}) {
  // Modal states
  const [carModal, setCarModal] = useState({ 
    show: false, 
    index: null, 
    name: "", 
    suffix: "", 
    category: "Premium Utility", 
    photo: "", 
    variants: [{ name: "", price: "" }] 
  });
  const [slabModal, setSlabModal] = useState({ show: false, min: "", max: "", rate: "", label: "" });

  // Accordion details view states
  const [expandedModelId, setExpandedModelId] = useState(null);
  const [editingVariantIdx, setEditingVariantIdx] = useState(null);
  const [editVariantName, setEditVariantName] = useState("");
  const [editVariantPrice, setEditVariantPrice] = useState("");

  const [isAddingVariant, setIsAddingVariant] = useState(false);
  const [newVariantName, setNewVariantName] = useState("");
  const [newVariantPrice, setNewVariantPrice] = useState("");

  // Slab scheduling and officer filter states
  const [slabSchedules, setSlabSchedules] = useState([]);

  useEffect(() => {
    async function loadSchedules() {
      try {
        const { data, error } = await supabase.from('toyota_slab_schedules').select('*');
        if (data) {
          setSlabSchedules(data.map(s => ({
            id: s.id,
            targetDate: s.target_date,
            targetSlabId: s.target_slab_id,
            newRate: s.new_rate,
            label: s.label,
            status: s.status
          })));
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadSchedules();
  }, []);

  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleSlabId, setScheduleSlabId] = useState("");
  const [scheduleRate, setScheduleRate] = useState("");
  const [scheduleLabel, setScheduleLabel] = useState("");

  const [salesFilter, setSalesFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [officersSort, setOfficersSort] = useState("none");

  // Impersonate in-admin chart overlay state
  const [impersonatedOfficerId, setImpersonatedOfficerId] = useState(null);
  const [impersonateMonth, setImpersonateMonth] = useState(new Date().getMonth()); // 0-based
  const [impersonateYear, setImpersonateYear] = useState(new Date().getFullYear());

  // Set default slab selection on load
  useEffect(() => {
    if (db.slabs.length > 0 && !scheduleSlabId) {
      setScheduleSlabId(db.slabs[0].id.toString());
    }
  }, [db.slabs, scheduleSlabId]);

  // Dynamic Car Variants Row Builders
  const handleAddVariantRow = () => {
    setCarModal(prev => ({
      ...prev,
      variants: [...prev.variants, { name: "", price: "" }]
    }));
  };

  const handleUpdateVariantRow = (idx, field, value) => {
    setCarModal(prev => {
      const nextVariants = [...prev.variants];
      nextVariants[idx] = { ...nextVariants[idx], [field]: value };
      return { ...prev, variants: nextVariants };
    });
  };

  const handleRemoveVariantRow = (idx) => {
    setCarModal(prev => {
      const nextVariants = [...prev.variants];
      nextVariants.splice(idx, 1);
      return { ...prev, variants: nextVariants };
    });
  };

  // Track the raw File object for Supabase Storage upload
  const [carPhotoFile, setCarPhotoFile] = useState(null);

  // Upload to Supabase Storage bucket 'car-images' and get public URL
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCarPhotoFile(file);
      // Show local preview immediately via object URL (doesn't hit Supabase yet)
      const localPreviewUrl = URL.createObjectURL(file);
      setCarModal(prev => ({ ...prev, photo: localPreviewUrl }));
    }
  };

  // Slabs Builder & Calculation Tester states
  const [builderSlabs, setBuilderSlabs] = useState([]);
  const [testerUnits, setTesterUnits] = useState(6);

  // Settings states
  const [targetParam, setTargetParam] = useState(db.settings.standardTarget || 12);
  const [budgetParam, setBudgetParam] = useState("54,00,000");

  // Chart Canvas Refs
  const adminTrendRef = useRef(null);
  const regionSalesRef = useRef(null);
  const spendDistributionRef = useRef(null);

  // Impersonate Chart Refs
  const impTrendRef = useRef(null);
  const impPayoutRef = useRef(null);
  const impShareRef = useRef(null);

  // Sync builder slabs when global slabs change
  useEffect(() => {
    if (activeMenu === "slab_engine") {
      setBuilderSlabs([...db.slabs].sort((a, b) => a.minUnits - b.minUnits));
    }
  }, [activeMenu, db.slabs]);

  // Sync settings inputs when global settings change
  useEffect(() => {
    setTargetParam(db.settings.standardTarget || 12);
    setBudgetParam(db.settings.regionalBudget ? db.settings.regionalBudget.toLocaleString("en-IN") : "54,00,000");
  }, [db.settings]);

  // ==================== CHART EFFECTS ====================
  useEffect(() => {
    // 1. Admin Trend Line Chart — fully dynamic from officers' salesHistory + currentMonthSales
    if (activeMenu === "dashboard" && adminTrendRef.current) {
      
      // Aggregate all officers' historical monthly sales (8-month rolling window)
      const combinedHistory = [0, 0, 0, 0, 0, 0, 0, 0];
      Object.keys(db.officers).forEach(id => {
        const off = db.officers[id];
        const history = off.salesHistory || [0, 0, 0, 0, 0, 0, 0, 0];
        history.forEach((val, idx) => {
          combinedHistory[idx] = (combinedHistory[idx] || 0) + (val || 0);
        });
        // Overlay current month live data into the last slot
        let currentUnits = 0;
        Object.keys(off.currentMonthSales || {}).forEach(c => currentUnits += (off.currentMonthSales[c] || 0));
        combinedHistory[combinedHistory.length - 1] = 
          (combinedHistory[combinedHistory.length - 1] || 0);
        // Already included via salesHistory last entry
      });

      // Replace last slot with real-time live MTD aggregate
      let liveMTD = 0;
      Object.keys(db.officers).forEach(id => {
        Object.keys(db.officers[id].currentMonthSales || {}).forEach(c => {
          liveMTD += (db.officers[id].currentMonthSales[c] || 0);
        });
      });
      combinedHistory[combinedHistory.length - 1] = liveMTD;

      const ctx = adminTrendRef.current.getContext("2d");
      const redGradient = ctx.createLinearGradient(0, 0, 0, 240);
      redGradient.addColorStop(0, "rgba(215, 0, 15, 0.2)");
      redGradient.addColorStop(1, "rgba(215, 0, 15, 0.0)");

      const existingChart = Chart.getChart(adminTrendRef.current);
      if (existingChart) existingChart.destroy();

      const chartInstance = new Chart(adminTrendRef.current, {
        type: "line",
        data: {
          labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"],
          datasets: [{
            data: combinedHistory,
            borderColor: "#D7000F",
            borderWidth: 3,
            pointBackgroundColor: "#D7000F",
            pointBorderColor: "#FFFFFF",
            pointBorderWidth: 2,
            tension: 0.45,
            fill: true,
            backgroundColor: redGradient
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false } },
            y: { grid: { color: "rgba(0,0,0,0.04)" }, ticks: { precision: 0 } }
          }
        }
      });
      return () => chartInstance.destroy();
    }
  }, [activeMenu, db.officers]);

  useEffect(() => {
    // 2. Regional Sales & Spend Analytics Charts — fully dynamic from db.officers
    if (activeMenu === "analytics") {
      let bChart, pChart;

      // Build dynamic branch-wise sales aggregates
      const branchMap = {};
      Object.keys(db.officers).forEach(id => {
        const off = db.officers[id];
        const hub = off.hub || "Other";
        let units = 0;
        Object.keys(off.currentMonthSales || {}).forEach(c => units += (off.currentMonthSales[c] || 0));
        branchMap[hub] = (branchMap[hub] || 0) + units;
      });
      const branchLabels = Object.keys(branchMap).length > 0 ? Object.keys(branchMap) : ["No Data"];
      const branchData = branchLabels.map(h => branchMap[h] || 0);

      if (regionSalesRef.current) {
        const existingBChart = Chart.getChart(regionSalesRef.current);
        if (existingBChart) existingBChart.destroy();
        bChart = new Chart(regionSalesRef.current, {
          type: "bar",
          data: {
            labels: branchLabels,
            datasets: [{
              label: "Units Sold MTD",
              data: branchData,
              backgroundColor: "#D7000F",
              borderRadius: 6,
              borderSkipped: false
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { grid: { display: false } },
              y: { grid: { color: "rgba(0,0,0,0.04)" }, ticks: { precision: 0 } }
            }
          }
        });
      }

      // Build dynamic slab spend distribution from officers' actual tiers
      const slabCounts = {};
      db.slabs.forEach(s => { slabCounts[s.label] = 0; });
      slabCounts["No Tier Reached"] = 0;

      Object.keys(db.officers).forEach(id => {
        const off = db.officers[id];
        let units = 0;
        Object.keys(off.currentMonthSales || {}).forEach(c => units += (off.currentMonthSales[c] || 0));
        // Find which slab they're in
        let matched = null;
        const sorted = [...db.slabs].sort((a, b) => a.minUnits - b.minUnits);
        for (const s of sorted) {
          if (units >= s.minUnits && units <= s.maxUnits) { matched = s.label; break; }
        }
        if (!matched && units > 0) matched = sorted[sorted.length - 1]?.label;
        const key = matched || "No Tier Reached";
        slabCounts[key] = (slabCounts[key] || 0) + 1;
      });

      const spendLabels = Object.keys(slabCounts).filter(k => slabCounts[k] > 0);
      const spendData = spendLabels.map(k => slabCounts[k]);
      const spendColors = ["#F87171", "#F59E0B", "#10B981", "#60A5FA", "#A78BFA"];

      if (spendDistributionRef.current) {
        const existingPChart = Chart.getChart(spendDistributionRef.current);
        if (existingPChart) existingPChart.destroy();
        pChart = new Chart(spendDistributionRef.current, {
          type: "doughnut",
          data: {
            labels: spendLabels.length > 0 ? spendLabels : ["No Officers"],
            datasets: [{
              data: spendData.length > 0 ? spendData : [1],
              backgroundColor: spendColors.slice(0, Math.max(spendLabels.length, 1))
            }]
          },
          options: { responsive: true, maintainAspectRatio: false }
        });
      }

      return () => {
        if (bChart) bChart.destroy();
        if (pChart) pChart.destroy();
      };
    }
  }, [activeMenu, db.officers, db.slabs]);

  // 3. Impersonate Charts — fires when officer selected or month/year filter changes
  useEffect(() => {
    if (!impersonatedOfficerId) return;
    const officer = db.officers[impersonatedOfficerId];
    if (!officer) return;

    const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

    // Use salesHistory for the trend; last slot = current month live units
    let currentUnits = 0;
    Object.keys(officer.currentMonthSales || {}).forEach(c => currentUnits += (officer.currentMonthSales[c] || 0));
    const history = [...(officer.salesHistory || [0,0,0,0,0,0,0,0])];
    history[history.length - 1] = currentUnits;

    // Payout history
    const payHistory = [...(officer.payoutHistory || [0,0,0,0,0,0,0,0])];

    let tChart, lChart, dChart;

    if (impTrendRef.current) {
      const existing = Chart.getChart(impTrendRef.current);
      if (existing) existing.destroy();
      const ctx = impTrendRef.current.getContext("2d");
      const grad = ctx.createLinearGradient(0, 0, 0, 200);
      grad.addColorStop(0, "rgba(215, 0, 15, 0.18)");
      grad.addColorStop(1, "rgba(215, 0, 15, 0.0)");
      tChart = new Chart(impTrendRef.current, {
        type: "line",
        data: {
          labels: MONTH_LABELS.slice(0, history.length),
          datasets: [{ label: "Units Sold", data: history, borderColor: "#D7000F", borderWidth: 3, pointBackgroundColor: "#D7000F", pointBorderColor: "#fff", pointBorderWidth: 2, tension: 0.45, fill: true, backgroundColor: grad }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { ticks: { precision: 0 } } } }
      });
    }

    if (impPayoutRef.current) {
      const existing = Chart.getChart(impPayoutRef.current);
      if (existing) existing.destroy();
      lChart = new Chart(impPayoutRef.current, {
        type: "line",
        data: {
          labels: MONTH_LABELS.slice(0, payHistory.length),
          datasets: [{ label: "Payout (₹)", data: payHistory, borderColor: "#10B981", borderWidth: 3, tension: 0.3, fill: false }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { ticks: { precision: 0 } } } }
      });
    }

    if (impShareRef.current) {
      const existing = Chart.getChart(impShareRef.current);
      if (existing) existing.destroy();
      const salesKeys = Object.keys(officer.currentMonthSales || {});
      const salesVals = salesKeys.map(k => officer.currentMonthSales[k]);
      const hasData = salesVals.some(v => v > 0);
      dChart = new Chart(impShareRef.current, {
        type: "doughnut",
        data: {
          labels: hasData ? salesKeys : ["No Sales"],
          datasets: [{ data: hasData ? salesVals : [1], backgroundColor: ["#D7000F","#60A5FA","#34D399","#FBBF24","#A78BFA"] }]
        },
        options: { responsive: true, maintainAspectRatio: false }
      });
    }

    return () => {
      if (tChart) tChart.destroy();
      if (lChart) lChart.destroy();
      if (dChart) dChart.destroy();
    };
  }, [impersonatedOfficerId, impersonateMonth, impersonateYear, db.officers]);

  // ==================== WORKSPACE HANDLERS ====================

  // -- Car Inventory CRUD --
  const handleCarSubmit = async (e) => {
    e.preventDefault();

    // Validate variants
    if (!carModal.variants || carModal.variants.length === 0) {
      onShowToast("Error: Please add at least one variant.");
      return;
    }

    // Check if any variant name is blank or price is invalid
    const isInvalid = carModal.variants.some(v => !v.name || v.name.trim() === "" || isNaN(parseInt(v.price)));
    if (isInvalid) {
      onShowToast("Error: Please provide valid names and prices for all variants.");
      return;
    }

    const isNew = carModal.index === null;
    const firstVariant = carModal.variants[0];
    const modelId = isNew ? Date.now() : db.inventory[carModal.index].id;

    // --- Upload image to Supabase Storage (if a new file was picked) ---
    let finalPhotoUrl = carModal.photo || "";
    if (carPhotoFile) {
      try {
        const ext = carPhotoFile.name.split(".").pop() || "jpg";
        const filePath = `cars/${modelId}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("car-images")
          .upload(filePath, carPhotoFile, { upsert: true, contentType: carPhotoFile.type });

        if (uploadErr) {
          console.error("Storage upload error:", uploadErr);
          onShowToast(`Image upload error: ${uploadErr.message} — using URL/no photo.`);
          // Fall back: if it's a local object URL (blob:) clear it since it won't persist
          if (finalPhotoUrl.startsWith("blob:")) finalPhotoUrl = "";
        } else {
          const { data: urlData } = supabase.storage.from("car-images").getPublicUrl(filePath);
          finalPhotoUrl = urlData?.publicUrl || "";
        }
      } catch (err) {
        console.error("Storage error:", err);
        if (finalPhotoUrl.startsWith("blob:")) finalPhotoUrl = "";
      }
    } else if (finalPhotoUrl.startsWith("blob:")) {
      // blob: URLs don't survive a page reload — clear them
      finalPhotoUrl = "";
    }

    const model = {
      id: modelId,
      name: carModal.name,
      suffix: carModal.suffix,
      category: carModal.category,
      photo: finalPhotoUrl,
      variants: carModal.variants.map(v => ({ name: v.name.trim(), price: parseInt(v.price) })),
      // Backwards compatibility sync:
      variant: firstVariant.name.trim(),
      price: parseInt(firstVariant.price)
    };

    setCarPhotoFile(null); // clear for next use

    const newActivity = {
      id: Date.now(),
      user_name: "Admin",
      detail: isNew ? `Added ${carModal.name} to inventory` : `Edited car ${carModal.name} options`,
      time_label: "JUST NOW",
      value_label: "",
      type: "config"
    };

    setDb(prev => {
      const nextInv = [...prev.inventory];
      if (!isNew) {
        nextInv[carModal.index] = model;
      } else {
        nextInv.push(model);
      }

      return {
        ...prev,
        inventory: nextInv,
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
      // Use upsert to safely handle both insert and update without ID collision
      const { error: invError } = await supabase.from('toyota_inventory').upsert([model], { onConflict: 'id' });
      if (invError) {
        console.error("Inventory save error:", invError);
        onShowToast(`DB Error: ${invError.message}. Change saved locally only.`);
      }
      await supabase.from('toyota_activities').insert([newActivity]);
    } catch (e) {
      console.error(e);
      onShowToast("Network error. Change saved locally, will sync on next load.");
    }

    onShowToast(isNew ? `Car model "${carModal.name}" added to inventory.` : "Car model updated successfully.");
    setCarModal({ show: false, index: null, name: "", suffix: "", category: "Premium Utility", photo: "", variants: [{ name: "", price: "" }] });
    setCarPhotoFile(null);
  };

  const deleteCar = async (idx) => {
    const target = db.inventory[idx];
    if (confirm(`Are you sure you want to remove "${target.name}" from inventory?`)) {
      setDb(prev => {
        const nextInv = [...prev.inventory];
        nextInv.splice(idx, 1);
        return { ...prev, inventory: nextInv };
      });

      try {
        await supabase.from('toyota_inventory').delete().eq('id', target.id);
      } catch (e) {
        console.error(e);
      }

      onShowToast(`Car model "${target.name}" removed.`);
    }
  };

  // Dynamic Inline Variant CRUD methods
  const deleteVariant = async (carIdx, varIdx) => {
    const car = db.inventory[carIdx];
    if (!car.variants || car.variants.length <= 1) {
      onShowToast("Error: A car model must have at least one active pricing variant.");
      return;
    }
    const variantToDelete = car.variants[varIdx];
    if (confirm(`Are you sure you want to delete the variant "${variantToDelete.name}"?`)) {
      const updatedVariants = [...car.variants];
      updatedVariants.splice(varIdx, 1);

      const newActivity = {
        id: Date.now(),
        user_name: "Admin",
        detail: `Deleted variant ${variantToDelete.name} from ${car.name}`,
        time_label: "JUST NOW",
        value_label: "",
        type: "config"
      };

      setDb(prev => {
        const nextInv = [...prev.inventory];
        nextInv[carIdx] = {
          ...nextInv[carIdx],
          variants: updatedVariants,
          variant: updatedVariants[0].name,
          price: updatedVariants[0].price
        };
        
        return {
          ...prev,
          inventory: nextInv,
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
          supabase.from('toyota_inventory').update({
            variants: updatedVariants,
            variant: updatedVariants[0].name,
            price: updatedVariants[0].price
          }).eq('id', car.id),
          supabase.from('toyota_activities').insert([newActivity])
        ]);
      } catch (e) {
        console.error(e);
      }

      onShowToast(`Variant "${variantToDelete.name}" deleted successfully.`);
    }
  };

  const startEditVariant = (v, vIdx) => {
    setEditingVariantIdx(vIdx);
    setEditVariantName(v.name);
    setEditVariantPrice(v.price.toString());
  };

  const saveVariantEdit = async (carIdx, varIdx) => {
    if (!editVariantName || editVariantName.trim() === "" || isNaN(parseInt(editVariantPrice))) {
      onShowToast("Error: Please enter a valid name and price.");
      return;
    }
    const car = db.inventory[carIdx];
    const updatedVariants = [...car.variants];
    updatedVariants[varIdx] = {
      name: editVariantName.trim(),
      price: parseInt(editVariantPrice)
    };

    const newActivity = {
      id: Date.now(),
      user_name: "Admin",
      detail: `Updated variant ${editVariantName} inside ${car.name}`,
      time_label: "JUST NOW",
      value_label: "",
      type: "config"
    };

    setDb(prev => {
      const nextInv = [...prev.inventory];
      nextInv[carIdx] = {
        ...nextInv[carIdx],
        variants: updatedVariants,
        variant: updatedVariants[0].name,
        price: updatedVariants[0].price
      };

      return {
        ...prev,
        inventory: nextInv,
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
        supabase.from('toyota_inventory').update({
          variants: updatedVariants,
          variant: updatedVariants[0].name,
          price: updatedVariants[0].price
        }).eq('id', car.id),
        supabase.from('toyota_activities').insert([newActivity])
      ]);
    } catch (e) {
      console.error(e);
    }

    onShowToast("Variant pricing updated successfully.");
    setEditingVariantIdx(null);
  };

  const saveNewVariantInline = async (carIdx) => {
    if (!newVariantName || newVariantName.trim() === "" || isNaN(parseInt(newVariantPrice))) {
      onShowToast("Error: Please enter a valid name and price for the new variant.");
      return;
    }
    const car = db.inventory[carIdx];
    const updatedVariants = [...(car.variants || [])];
    const newVar = {
      name: newVariantName.trim(),
      price: parseInt(newVariantPrice)
    };
    updatedVariants.push(newVar);

    const newActivity = {
      id: Date.now(),
      user_name: "Admin",
      detail: `Added variant ${newVariantName} to ${car.name}`,
      time_label: "JUST NOW",
      value_label: "",
      type: "config"
    };

    setDb(prev => {
      const nextInv = [...prev.inventory];
      nextInv[carIdx] = {
        ...nextInv[carIdx],
        variants: updatedVariants,
        variant: updatedVariants[0].name,
        price: updatedVariants[0].price
      };

      return {
        ...prev,
        inventory: nextInv,
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
        supabase.from('toyota_inventory').update({
          variants: updatedVariants,
          variant: updatedVariants[0].name,
          price: updatedVariants[0].price
        }).eq('id', car.id),
        supabase.from('toyota_activities').insert([newActivity])
      ]);
    } catch (e) {
      console.error(e);
    }

    onShowToast(`Variant "${newVariantName}" added successfully.`);
    setIsAddingVariant(false);
    setNewVariantName("");
    setNewVariantPrice("");
  };

  // -- Dynamic Slab Engine CRUD --
  const addNewBuilderRow = () => {
    let nextMin = 1;
    if (builderSlabs.length > 0) {
      const maxVal = Math.max(...builderSlabs.map(s => s.maxUnits));
      if (maxVal < 999) nextMin = maxVal + 1;
    }
    setBuilderSlabs(prev => [
      ...prev,
      { id: Date.now(), minUnits: nextMin, maxUnits: nextMin + 3, ratePerCar: 1000, label: `Tier ${prev.length + 1} Payout Slab` }
    ]);
  };

  const updateBuilderRow = (idx, field, value) => {
    setBuilderSlabs(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const removeBuilderRow = (idx) => {
    if (builderSlabs.length <= 1) {
      onShowToast("Error: You must configure at least one active incentive slab tier.");
      return;
    }
    setBuilderSlabs(prev => {
      const next = [...prev];
      next.splice(idx, 1);
      return next;
    });
  };

  const applySlabChanges = async () => {
    let isValid = true;
    builderSlabs.forEach(s => {
      if (isNaN(s.minUnits) || isNaN(s.maxUnits) || isNaN(s.ratePerCar) || s.label.trim() === "") {
        isValid = false;
      }
    });

    if (!isValid) {
      onShowToast("Error: Please fill in all numeric ranges and labels correctly.");
      return;
    }

    const sorted = [...builderSlabs].sort((a, b) => a.minUnits - b.minUnits);

    const newActivity = {
      id: Date.now(),
      user_name: "Admin",
      detail: `Updated active incentive engine slabs`,
      time_label: "JUST NOW",
      value_label: "",
      type: "config"
    };

    setDb(prev => ({
      ...prev,
      slabs: sorted,
      activities: [{
        id: newActivity.id,
        user: newActivity.user_name,
        detail: newActivity.detail,
        time: newActivity.time_label,
        value: newActivity.value_label,
        type: newActivity.type
      }, ...prev.activities]
    }));

    try {
      await supabase.from('toyota_slabs').delete().gt('id', 0);
      await supabase.from('toyota_slabs').insert(
        sorted.map(s => ({
          id: s.id,
          min_units: s.minUnits,
          max_units: s.maxUnits,
          rate_per_car: s.ratePerCar,
          label: s.label
        }))
      );
      await supabase.from('toyota_activities').insert([newActivity]);
    } catch (e) {
      console.error(e);
    }

    onShowToast("Incentive slab configuration applied successfully!");
  };

  const handleQuickSlabSubmit = async (e) => {
    e.preventDefault();
    const newSlab = {
      id: Date.now(),
      minUnits: parseInt(slabModal.min),
      maxUnits: parseInt(slabModal.max),
      ratePerCar: parseInt(slabModal.rate),
      label: slabModal.label
    };

    const newActivity = {
      id: Date.now(),
      user_name: "Admin",
      detail: `Added new slab rule: ${slabModal.label}`,
      time_label: "JUST NOW",
      value_label: "",
      type: "config"
    };

    setDb(prev => {
      const nextSlabs = [...prev.slabs];
      nextSlabs.push(newSlab);
      nextSlabs.sort((a, b) => a.minUnits - b.minUnits);
      return {
        ...prev,
        slabs: nextSlabs,
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
        supabase.from('toyota_slabs').insert({
          id: newSlab.id,
          min_units: newSlab.minUnits,
          max_units: newSlab.maxUnits,
          rate_per_car: newSlab.ratePerCar,
          label: newSlab.label
        }),
        supabase.from('toyota_activities').insert([newActivity])
      ]);
    } catch (e) {
      console.error(e);
    }

    onShowToast(`Slab Rule "${slabModal.label}" created successfully.`);
    setSlabModal({ show: false, min: "", max: "", rate: "", label: "" });
  };

  // -- Slab Scheduling Handlers --
  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!scheduleDate || !scheduleRate || !scheduleSlabId) {
      onShowToast("Error: Please fill in all fields to schedule an update.");
      return;
    }
    const targetSlab = db.slabs.find(s => s.id === parseInt(scheduleSlabId));
    if (!targetSlab) {
      onShowToast("Error: Target slab not found.");
      return;
    }
    const newSchedule = {
      id: Date.now(),
      targetDate: scheduleDate,
      targetSlabId: parseInt(scheduleSlabId),
      newRate: parseInt(scheduleRate),
      label: scheduleLabel.trim() || `Adjust ${targetSlab.label}`,
      status: "Scheduled"
    };

    setSlabSchedules(prev => [...prev, newSchedule]);

    try {
      await supabase.from('toyota_slab_schedules').insert({
        id: newSchedule.id,
        target_date: newSchedule.targetDate,
        target_slab_id: newSchedule.targetSlabId,
        new_rate: newSchedule.newRate,
        label: newSchedule.label,
        status: newSchedule.status
      });
    } catch (e) {
      console.error(e);
    }

    onShowToast(`Rate change scheduled for ${scheduleDate}`);
    setScheduleDate("");
    setScheduleRate("");
    setScheduleLabel("");
  };

  const applyScheduleImmediately = async (id) => {
    const sched = slabSchedules.find(s => s.id === id);
    if (!sched) return;

    const newActivity = {
      id: Date.now(),
      user_name: "Admin",
      detail: `Applied scheduled rate change: ${sched.label}`,
      time_label: "JUST NOW",
      value_label: "",
      type: "config"
    };

    setDb(prev => {
      const nextSlabs = prev.slabs.map(s => {
        if (s.id === sched.targetSlabId) {
          return { ...s, ratePerCar: sched.newRate };
        }
        return s;
      });
      return {
        ...prev,
        slabs: nextSlabs,
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

    setSlabSchedules(prev => prev.map(s => s.id === id ? { ...s, status: "Applied" } : s));

    try {
      await Promise.all([
        supabase.from('toyota_slabs').update({ rate_per_car: sched.newRate }).eq('id', sched.targetSlabId),
        supabase.from('toyota_slab_schedules').update({ status: 'Applied' }).eq('id', id),
        supabase.from('toyota_activities').insert([newActivity])
      ]);
    } catch (e) {
      console.error(e);
    }

    onShowToast(`Schedule "${sched.label}" applied immediately!`);
  };

  const cancelSchedule = async (id) => {
    if (confirm("Are you sure you want to cancel this scheduled update?")) {
      setSlabSchedules(prev => prev.filter(s => s.id !== id));
      try {
        await supabase.from('toyota_slab_schedules').delete().eq('id', id);
      } catch (e) {
        console.error(e);
      }
      onShowToast("Scheduled update cancelled.");
    }
  };

  // -- System parameters --
  const saveParameters = async () => {
    const cleanBudget = parseInt(budgetParam.replace(/,/g, "")) || 5400000;
    setDb(prev => {
      const nextOfficers = { ...prev.officers };
      Object.keys(nextOfficers).forEach(id => nextOfficers[id].target = targetParam);
      return {
        ...prev,
        settings: { standardTarget: targetParam, regionalBudget: cleanBudget },
        officers: nextOfficers
      };
    });

    try {
      await Promise.all([
        supabase.from('toyota_settings').update({ value: { value: targetParam } }).eq('key', 'standardTarget'),
        supabase.from('toyota_settings').update({ value: { value: cleanBudget } }).eq('key', 'regionalBudget'),
        supabase.from('toyota_profiles').update({ target: targetParam }).eq('role', 'officer')
      ]);
    } catch (e) {
      console.error(e);
    }

    onShowToast("Workspace system parameters synchronized!");
  };

  const resetStateEngine = () => {
    if (confirm("Are you sure you want to purge the local database and reset all values back to default?")) {
      localStorage.removeItem("toyota_smart_react_state");
      onShowToast("Database successfully purged and reset.");
      window.location.reload();
    }
  };

  // Impersonation — now opens in-admin chart overlay (no console switch)
  const impersonate = (id) => {
    setImpersonatedOfficerId(id);
    onShowToast(`Viewing performance of: ${db.officers[id]?.name || id}`);
  };

  // ==================== CALCULATION AGGREGATES ====================
  let totalUnitsSold = 0;
  let totalRegionalIncentives = 0;
  
  // Dynamic Branch-wise performance aggregation
  const branchSales = {};
  
  // Dynamic Top Performer aggregation
  let topOfficer = null;
  let topUnits = -1;

  Object.keys(db.officers).forEach(id => {
    const off = db.officers[id];
    let offUnits = 0;
    Object.keys(off.currentMonthSales || {}).forEach(c => offUnits += (off.currentMonthSales[c] || 0));
    const calc = calculatePayout(offUnits);
    
    totalUnitsSold += offUnits;
    totalRegionalIncentives += calc.payout;

    // Aggregating by branch hub
    const hubName = off.hub || "Other Hub";
    if (!branchSales[hubName]) {
      branchSales[hubName] = { units: 0, incentive: 0, officersCount: 0 };
    }
    branchSales[hubName].units += offUnits;
    branchSales[hubName].incentive += calc.payout;
    branchSales[hubName].officersCount += 1;

    // Evaluate top performer
    if (offUnits > topUnits) {
      topUnits = offUnits;
      topOfficer = { id, ...off, units: offUnits, payout: calc.payout, tier: calc.unlockedTier };
    }
  });

  // Dynamic unique hubs populated from active officers database
  const uniqueHubs = Array.from(new Set(Object.keys(db.officers).map(id => db.officers[id].hub).filter(Boolean)));

  // Process officers for dynamic filtering/sorting
  const processedOfficers = Object.keys(db.officers).map(id => {
    const off = db.officers[id];
    let offUnits = 0;
    Object.keys(off.currentMonthSales || {}).forEach(c => offUnits += (off.currentMonthSales[c] || 0));
    const cCalc = calculatePayout(offUnits);
    return {
      id,
      ...off,
      mtdSales: offUnits,
      payout: cCalc.payout,
      unlockedTier: cCalc.unlockedTier,
      cCalc
    };
  });

  // Apply location filter
  let filteredOfficers = processedOfficers;
  if (locationFilter !== "all") {
    filteredOfficers = filteredOfficers.filter(off => off.hub === locationFilter);
  }

  // Apply slab filter
  if (salesFilter !== "all") {
    filteredOfficers = filteredOfficers.filter(off => off.unlockedTier === salesFilter);
  }

  // Apply search query filter if exists
  if (searchQuery && searchQuery.trim() !== "") {
    const q = searchQuery.toLowerCase().trim();
    filteredOfficers = filteredOfficers.filter(off => off.name.toLowerCase().includes(q) || off.hub.toLowerCase().includes(q));
  }

  // Apply sorting
  if (officersSort === "high") {
    filteredOfficers = [...filteredOfficers].sort((a, b) => b.mtdSales - a.mtdSales);
  } else if (officersSort === "low") {
    filteredOfficers = [...filteredOfficers].sort((a, b) => a.mtdSales - b.mtdSales);
  }

  const finalUnitsMTD = 1274 + totalUnitsSold;
  const finalRegionalPayouts = 4238000 + totalRegionalIncentives;

  return (
    <div style={{ width: "100%" }}>
      
      {/* ==================== VIEW 1: EXECUTIVE DASHBOARD ==================== */}
      {activeMenu === "dashboard" && (
        <section className="view-panel active">
          <div className="view-header-row">
            <div>
              <h1 className="view-title">Executive Dashboard</h1>
              <p className="view-subtitle">Real-time incentive analytics & sales tracking • August 2024</p>
            </div>
          </div>

          <div className="summary-stats-grid">
            <div className="stat-card">
              <span className="stat-label">Total Incentives Paid</span>
              <div className="stat-value">₹{finalRegionalPayouts.toLocaleString("en-IN")}</div>
              <div className="stat-meta"><span className="meta-highlight">78% of monthly budget</span></div>
              <div className="progress-bar-container"><div className="progress-bar-fill" style={{ width: "78%" }}></div></div>
            </div>
            <div className="stat-card">
              <span className="stat-label">Total Branch Sales (MTD)</span>
              <div className="stat-value">{totalUnitsSold} Units</div>
              <div className="stat-meta text-green">↑ All branches combined</div>
            </div>
            <div className="stat-card">
              <span className="stat-label">Cumulative Volume MTD</span>
              <div className="stat-value">{finalUnitsMTD}</div>
              <div className="stat-meta text-green">↑ +18% vs July (active + baseline)</div>
            </div>
            <div className="stat-card danger-outline" style={{ borderLeft: "4px solid #D97706" }}>
              <span className="stat-label">Top Sales Leader</span>
              <div className="stat-value" style={{ fontSize: topOfficer && topOfficer.name.length > 12 ? "20px" : "24px" }}>
                {topOfficer ? topOfficer.name : "None"}
              </div>
              <div className="stat-meta" style={{ color: "#D97706", fontWeight: "600" }}>
                {topOfficer ? `Leader with ${topOfficer.units} sales` : "No sales logged"}
              </div>
            </div>
          </div>

          <div className="dashboard-interactive-grid">
            <div className="visual-card main-trend-card">
              <div className="card-header-row">
                <h3>Monthly Sales & Incentive Trend</h3>
                <select className="custom-select" defaultValue="8">
                  <option value="8">Last 8 months</option>
                </select>
              </div>
              <div className="chart-container">
                <canvas ref={adminTrendRef}></canvas>
              </div>
            </div>

            {/* Widget 1: Branch Performance Table (Now replaces Recent Activity next to the Chart) */}
            <div className="visual-card branch-sales-card">
              <div className="card-header-row" style={{ marginBottom: "16px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: "800" }}>Branch Sales Performance</h3>
                <span className="badge badge-secondary">{Object.keys(branchSales).length} Active Hubs</span>
              </div>
              <div className="branch-list-stack" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {Object.keys(branchSales).map(hub => {
                  const data = branchSales[hub];
                  const maxBranchUnits = Math.max(...Object.values(branchSales).map(b => b.units)) || 1;
                  const pct = (data.units / maxBranchUnits) * 100;
                  return (
                    <div className="branch-item-row" key={hub} style={{ borderBottom: "1px solid #F1F5F9", paddingBottom: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <div>
                          <strong style={{ fontSize: "14px", color: "#0F172A" }}>{hub}</strong>
                          <div style={{ fontSize: "11px", color: "#64748B", fontWeight: "500" }}>{data.officersCount} Active Officers</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: "14px", fontWeight: "700", color: "#D7000F" }}>{data.units} Units</span>
                          <div style={{ fontSize: "11px", color: "#10B981", fontWeight: "600" }}>₹{data.incentive.toLocaleString("en-IN")}</div>
                        </div>
                      </div>
                      <div className="progress-bar-container" style={{ height: "6px", backgroundColor: "#E2E8F0", borderRadius: "3px", overflow: "hidden" }}>
                        <div className="progress-bar-fill" style={{ width: `${pct}%`, backgroundColor: "#D7000F", height: "100%", borderRadius: "3px" }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Row 3 interactive grid aligning as 2fr 1fr matching Row 2 */}
          <div className="dashboard-interactive-grid" style={{ marginTop: "24px" }}>
            
            {/* Left Column (2fr): Top Performing Officers */}
            <div className="visual-card top-officers-card" style={{ margin: 0 }}>
              <div className="card-header-row" style={{ marginBottom: "16px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: "800" }}>Top Performing Officers</h3>
                <a href="#" className="view-all-link" onClick={() => setActiveMenu("officers")}>View all officers →</a>
              </div>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr><th>Officer Name</th><th>Region Hub</th><th>Units Sold</th><th>Incentive Earned</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {Object.keys(db.officers).map(id => {
                      const off = db.officers[id];
                      let offUnits = 0;
                      Object.keys(off.currentMonthSales).forEach(c => offUnits += off.currentMonthSales[c]);
                      const cCalc = calculatePayout(offUnits);
                      return (
                        <tr key={id}>
                          <td>
                            <div className="table-avatar-cell">
                              <div className="profile-avatar-circle" style={{ backgroundColor: "#334155", width: "28px", height: "28px", fontSize: "11px" }}>{off.name ? off.name.split(" ").map(n => n[0]).join("") : "SO"}</div>
                              <div><div className="table-cell-title">{off.name}</div><div className="table-cell-subtitle">{off.region}</div></div>
                            </div>
                          </td>
                          <td>{off.hub}</td>
                          <td><strong>{offUnits} units</strong></td>
                          <td className="text-red"><strong>₹{cCalc.payout.toLocaleString("en-IN")}</strong></td>
                          <td><span className="badge badge-primary">Active</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Column (1fr): Active Slab details */}
            <div className="visual-card slab-details-card" style={{ margin: 0 }}>
              <div className="card-header-row" style={{ marginBottom: "16px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: "800" }}>Current Slab Details</h3>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {db.slabs.map((slab, idx) => (
                  <div key={slab.id} style={{ display: "flex", alignItems: "center", gap: "12px", backgroundColor: "var(--slate-100)", padding: "10px 12px", borderRadius: "10px", borderLeft: "4px solid var(--toyota-red)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "28px", height: "28px", borderRadius: "50%", backgroundColor: "var(--toyota-red-light)", color: "var(--toyota-red)", fontSize: "11px", fontWeight: "800" }}>
                      T{idx + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "13px", fontWeight: "700", color: "var(--dark-slate)" }}>{slab.label}</div>
                      <div style={{ fontSize: "11px", color: "var(--slate-500)" }}>
                        Range: <strong>{slab.minUnits}–{slab.maxUnits === 999 ? "8+" : slab.maxUnits} units</strong>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", fontWeight: "800", color: "var(--toyota-red)", fontSize: "14px" }}>
                      ₹{slab.ratePerCar.toLocaleString("en-IN")}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </section>
      )}

      {/* ==================== VIEW 2: CAR INVENTORY CONFIG ==================== */}
      {activeMenu === "inventory" && (
        <section className="view-panel active">
          <div className="view-header-row">
            <div>
              <h1 className="view-title">Car Inventory Configuration</h1>
              <p className="view-subtitle">Manage car models, suffixes, dynamic variants list, ex-showroom pricing, and pictures.</p>
            </div>
            <button className="btn btn-primary" onClick={() => setCarModal({ show: true, index: null, name: "", suffix: "", category: "Premium Utility", photo: "", variants: [{ name: "", price: "" }] })}>
              Add Car Model
            </button>
          </div>

          <div className="visual-card">
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: "80px" }}>Photo</th>
                    <th>Model Line</th>
                    <th>Suffix</th>
                    <th>Variants & Pricing</th>
                    <th>Category</th>
                    <th style={{ width: "120px" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {db.inventory.filter(car => car.name.toLowerCase().includes(searchQuery.toLowerCase())).map((car, idx) => {
                    const isExpanded = expandedModelId === car.id;
                    return (
                      <React.Fragment key={car.id}>
                        {/* Normal Summary Row */}
                        <tr 
                          onClick={() => { setExpandedModelId(isExpanded ? null : car.id); setEditingVariantIdx(null); }}
                          style={{ cursor: "pointer", backgroundColor: isExpanded ? "#FFF0F1" : "inherit", transition: "background-color 0.25s ease" }}
                        >
                          <td>
                            {car.photo ? (
                              <img 
                                src={car.photo} 
                                alt={car.name} 
                                style={{ width: "60px", height: "40px", objectFit: "cover", borderRadius: "8px", border: "1px solid #E2E8F0", boxShadow: "var(--shadow-sm)" }} 
                              />
                            ) : (
                              <div className="table-car-thumb" style={{ width: "60px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "700", backgroundColor: "var(--slate-100)", color: "var(--slate-500)", borderRadius: "8px", border: "1px solid var(--slate-300)" }}>
                                {car.name.substring(0, 3).toUpperCase()}
                              </div>
                            )}
                          </td>
                          <td><span className="table-cell-title" style={{ fontSize: "15px", fontWeight: "800", color: "var(--toyota-red)" }}>{car.name}</span></td>
                          <td><span style={{ fontSize: "13px", fontWeight: "700", color: "var(--slate-600)" }}>{car.suffix}</span></td>
                          <td>
                            <span style={{ fontSize: "12px", color: "var(--slate-500)", fontWeight: "600" }}>
                              {(car.variants || []).length} Variants available (Click model to view) ▾
                            </span>
                          </td>
                          <td><span className="badge badge-secondary">{car.category}</span></td>
                          <td>
                            <button 
                              type="button"
                              className="btn btn-outline" 
                              style={{ padding: "6px 12px", fontSize: "11px", borderRadius: "8px", fontWeight: "700" }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedModelId(isExpanded ? null : car.id);
                                setEditingVariantIdx(null);
                              }}
                            >
                              {isExpanded ? "Hide Details ▲" : "Show Details ▾"}
                            </button>
                          </td>
                        </tr>

                        {/* Expanded Detail Accordion Sub-Panel */}
                        {isExpanded && (
                          <tr style={{ backgroundColor: "#F8FAFC" }}>
                            <td colSpan="6" style={{ padding: "20px 24px", borderBottom: "2px solid #E2E8F0" }}>
                              <div style={{ display: "flex", gap: "32px", alignItems: "flex-start", width: "100%" }}>
                                
                                {/* Left Section: Car Summary, Edit & Delete Model Line */}
                                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "12px", borderRight: "1px solid #E2E8F0", paddingRight: "32px" }}>
                                  <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
                                    {car.photo ? (
                                      <img 
                                        src={car.photo} 
                                        alt={car.name} 
                                        style={{ width: "110px", height: "70px", objectFit: "cover", borderRadius: "10px", border: "1px solid #CBD5E1", boxShadow: "var(--shadow-sm)" }} 
                                      />
                                    ) : (
                                      <div style={{ width: "110px", height: "70px", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "var(--slate-100)", color: "var(--slate-500)", borderRadius: "10px", border: "1px solid var(--slate-300)", fontWeight: "800", fontSize: "14px" }}>
                                        {car.name.substring(0, 3).toUpperCase()}
                                      </div>
                                    )}
                                    <div>
                                      <h4 style={{ fontSize: "17px", fontWeight: "800", color: "var(--dark-slate)", margin: 0 }}>{car.name}</h4>
                                      <div style={{ fontSize: "12px", color: "var(--slate-500)", fontWeight: "600", marginTop: "2px" }}>Category: <strong>{car.category}</strong></div>
                                      <div style={{ fontSize: "12px", color: "var(--slate-500)", fontWeight: "600" }}>Suffix: <strong>{car.suffix}</strong></div>
                                    </div>
                                  </div>
                                  <div style={{ display: "flex", gap: "10px", marginTop: "12px", width: "100%" }}>
                                    <button 
                                      type="button"
                                      className="btn btn-outline" 
                                      style={{ padding: "10px 14px", fontSize: "12px", borderRadius: "8px", flex: 1, fontWeight: "700" }}
                                      onClick={() => setCarModal({ 
                                        show: true, 
                                        index: idx, 
                                        name: car.name, 
                                        suffix: car.suffix, 
                                        category: car.category, 
                                        photo: car.photo || "", 
                                        variants: car.variants && car.variants.length > 0 ? [...car.variants] : [{ name: car.variant || "", price: car.price || "" }] 
                                      })}
                                    >
                                      ✎ Edit Model
                                    </button>
                                    <button 
                                      type="button"
                                      className="btn btn-primary" 
                                      style={{ padding: "10px 14px", fontSize: "12px", borderRadius: "8px", flex: 1, fontWeight: "700" }}
                                      onClick={() => { setExpandedModelId(null); deleteCar(idx); }}
                                    >
                                      🗑 Delete Model
                                    </button>
                                  </div>
                                </div>

                                {/* Right Section: Variants and ex-showroom price lists with Edit & Delete */}
                                <div style={{ flex: 1.6, display: "flex", flexDirection: "column", gap: "12px" }}>
                                  <h4 style={{ fontSize: "12px", fontWeight: "800", color: "#64748B", margin: 0, textTransform: "uppercase", letterSpacing: "0.5px" }}>Variants & Individual ex-showroom Pricing</h4>
                                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "200px", overflowY: "auto", paddingRight: "6px" }}>
                                    {(car.variants || []).map((v, vIdx) => {
                                      const isEditingVar = editingVariantIdx === vIdx;
                                      return (
                                        <div 
                                          key={vIdx} 
                                          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0", padding: "12px 16px", borderRadius: "10px", boxShadow: "var(--shadow-sm)" }}
                                        >
                                          {isEditingVar ? (
                                            /* Editing Row inline form */
                                            <div style={{ display: "flex", gap: "8px", width: "100%", alignItems: "center" }}>
                                              <input 
                                                type="text" 
                                                style={{ flex: 1.6, padding: "8px 10px", fontSize: "13px", border: "1px solid var(--slate-300)", borderRadius: "6px" }} 
                                                value={editVariantName} 
                                                onChange={(e) => setEditVariantName(e.target.value)} 
                                                required
                                              />
                                              <input 
                                                type="number" 
                                                style={{ flex: 1, padding: "8px 10px", fontSize: "13px", border: "1px solid var(--slate-300)", borderRadius: "6px" }} 
                                                value={editVariantPrice} 
                                                onChange={(e) => setEditVariantPrice(e.target.value)} 
                                                required
                                              />
                                              <button type="button" className="btn btn-outline" style={{ padding: "6px 10px", fontSize: "11px", borderRadius: "6px" }} onClick={() => setEditingVariantIdx(null)}>Cancel</button>
                                              <button type="button" className="btn btn-primary" style={{ padding: "6px 10px", fontSize: "11px", borderRadius: "6px" }} onClick={() => saveVariantEdit(idx, vIdx)}>Save</button>
                                            </div>
                                          ) : (
                                            /* Standard Row display */
                                            <>
                                              <div>
                                                <strong style={{ fontSize: "14px", color: "var(--dark-slate)" }}>{v.name}</strong>
                                                <span style={{ marginLeft: "12px", fontSize: "13px", color: "#10B981", fontWeight: "700" }}>₹{v.price.toLocaleString("en-IN")}</span>
                                              </div>
                                              <div style={{ display: "flex", gap: "12px" }}>
                                                <button 
                                                  type="button" 
                                                  style={{ border: "none", background: "none", color: "var(--slate-500)", fontSize: "12px", cursor: "pointer", fontWeight: "700" }} 
                                                  onClick={() => startEditVariant(v, vIdx)}
                                                >
                                                  ✎ Edit
                                                </button>
                                                <button 
                                                  type="button" 
                                                  style={{ border: "none", background: "none", color: "var(--toyota-red)", fontSize: "12px", cursor: "pointer", fontWeight: "700" }} 
                                                  onClick={() => deleteVariant(idx, vIdx)}
                                                >
                                                  🗑 Delete
                                                </button>
                                              </div>
                                            </>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>

                                  {/* Inline Add New Variant Form */}
                                  {isAddingVariant ? (
                                    <div 
                                      style={{ 
                                        display: "flex", 
                                        gap: "8px", 
                                        backgroundColor: "#FFF0F1", 
                                        border: "1px dashed var(--toyota-red)", 
                                        padding: "12px 16px", 
                                        borderRadius: "10px",
                                        marginTop: "8px",
                                        alignItems: "center"
                                      }}
                                    >
                                      <input 
                                        type="text" 
                                        placeholder="Variant Name (e.g. 2.8L AT)" 
                                        style={{ flex: 1.6, padding: "8px 10px", fontSize: "13px", border: "1px solid var(--slate-300)", borderRadius: "6px", backgroundColor: "#FFF" }} 
                                        value={newVariantName} 
                                        onChange={(e) => setNewVariantName(e.target.value)} 
                                        required
                                      />
                                      <input 
                                        type="number" 
                                        placeholder="Price (₹)" 
                                        style={{ flex: 1, padding: "8px 10px", fontSize: "13px", border: "1px solid var(--slate-300)", borderRadius: "6px", backgroundColor: "#FFF" }} 
                                        value={newVariantPrice} 
                                        onChange={(e) => setNewVariantPrice(e.target.value)} 
                                        required
                                      />
                                      <button type="button" className="btn btn-outline" style={{ padding: "6px 10px", fontSize: "11px", borderRadius: "6px" }} onClick={() => { setIsAddingVariant(false); setNewVariantName(""); setNewVariantPrice(""); }}>Cancel</button>
                                      <button type="button" className="btn btn-primary" style={{ padding: "6px 10px", fontSize: "11px", borderRadius: "6px" }} onClick={() => saveNewVariantInline(idx)}>Add</button>
                                    </div>
                                  ) : (
                                    <button 
                                      type="button" 
                                      className="btn btn-outline" 
                                      style={{ alignSelf: "flex-start", marginTop: "8px", padding: "8px 16px", fontSize: "12px", borderRadius: "8px", fontWeight: "700" }}
                                      onClick={() => setIsAddingVariant(true)}
                                    >
                                      + Add New Variant
                                    </button>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ==================== VIEW 3: DYNAMIC SLAB CONFIG ENGINE ==================== */}
      {activeMenu === "slab_engine" && (
        <section className="view-panel active">
          <div className="view-header-row">
            <div>
              <h1 className="view-title">Dynamic Slab Configuration Engine</h1>
              <p className="view-subtitle">Configure tiered incentive slabs. Updates instantly recalculate active payout rates.</p>
            </div>
            <div className="view-actions">
              <button className="btn btn-outline" onClick={() => { setDb(prev => ({ ...prev, slabs: DEFAULT_STATE.slabs })); onShowToast("Slab engine defaults restored!"); }}>Reset</button>
              <button className="btn btn-primary" onClick={applySlabChanges}>Apply Active Engine Changes</button>
            </div>
          </div>

          <div className="slab-builder-layout">
            <div className="visual-card slab-main-card">
              <div className="card-header-row">
                <h3>Incentive Tier Layout</h3>
                <button className="btn btn-outline btn-sm" onClick={addNewBuilderRow}>+ Add New Tier Slab</button>
              </div>
              <div className="slab-inputs-stack">
                {builderSlabs.map((slab, idx) => (
                  <div className="slab-input-row" key={slab.id || idx}>
                    <div className="slab-row-num">{idx + 1}</div>
                    <div className="slab-input-pair">
                      <span>Min Sold:</span>
                      <input type="number" className="slab-input-box" value={slab.minUnits} onChange={(e) => updateBuilderRow(idx, "minUnits", parseInt(e.target.value) || 0)} />
                    </div>
                    <div className="slab-input-pair">
                      <span>Max Sold:</span>
                      <input type="number" className="slab-input-box" value={slab.maxUnits} onChange={(e) => updateBuilderRow(idx, "maxUnits", parseInt(e.target.value) || 0)} />
                    </div>
                    <div className="slab-input-pair">
                      <span>Rate per Car:</span>
                      <input type="number" className="slab-rate-box" value={slab.ratePerCar} onChange={(e) => updateBuilderRow(idx, "ratePerCar", parseInt(e.target.value) || 0)} />
                    </div>
                    <input type="text" className="slab-label-box" value={slab.label} onChange={(e) => updateBuilderRow(idx, "label", e.target.value)} />
                    <button className="btn-remove-slab" onClick={() => removeBuilderRow(idx)}>&times;</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="visual-card slab-preview-card">
              <h3>Live Calculation Checker</h3>
              <div className="calc-tester-form">
                <div className="input-group">
                  <label>Test Sold Units Volume</label>
                  <input type="number" value={testerUnits} onChange={(e) => setTesterUnits(parseInt(e.target.value) || 0)} />
                </div>
                <div className="test-result-box">
                  <div className="result-label">Result Payout Slab</div>
                  <div className="result-tier-name">{calculatePayout(testerUnits).unlockedTier}</div>
                  <div className="result-metric-row"><span>Applied Rate Per Unit</span><strong>₹{calculatePayout(testerUnits).appliedRate.toLocaleString("en-IN")} / car</strong></div>
                  <div className="result-metric-row border-top"><span>Total Estimated Incentive</span><strong className="text-large text-red">₹{calculatePayout(testerUnits).payout.toLocaleString("en-IN")}</strong></div>
                </div>
              </div>
            </div>
          </div>

          {/* Scheduling Future Slab Updates Panel */}
          <div className="slab-builder-layout" style={{ marginTop: "24px" }}>
            {/* Left Panel: Schedule Form */}
            <div className="visual-card" style={{ flex: 1 }}>
              <div className="card-header-row" style={{ marginBottom: "16px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: "800", color: "var(--dark-slate)", margin: 0 }}>Schedule Future Slab Rate Update</h3>
              </div>
              <form onSubmit={handleScheduleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "700", color: "var(--slate-500)" }}>Select Target Slab Tier</label>
                  <select 
                    className="custom-select" 
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--slate-300)", backgroundColor: "#FFF" }}
                    value={scheduleSlabId} 
                    onChange={(e) => setScheduleSlabId(e.target.value)}
                    required
                  >
                    {db.slabs.map(s => (
                      <option key={s.id} value={s.id}>{s.label} (Current: ₹{s.ratePerCar})</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: "flex", gap: "16px" }}>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "12px", fontWeight: "700", color: "var(--slate-500)" }}>Effective Date</label>
                    <input 
                      type="date" 
                      style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--slate-300)", fontSize: "13px" }}
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      required
                    />
                  </div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "12px", fontWeight: "700", color: "var(--slate-500)" }}>Scheduled Rate (₹)</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 4000"
                      style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--slate-300)", fontSize: "13px" }}
                      value={scheduleRate}
                      onChange={(e) => setScheduleRate(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "700", color: "var(--slate-500)" }}>Description / Label</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Tier 3 Promotional Adjustment"
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--slate-300)", fontSize: "13px" }}
                    value={scheduleLabel}
                    onChange={(e) => setScheduleLabel(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "6px", padding: "12px", borderRadius: "8px", fontWeight: "700" }}>
                  Schedule Payout Slab Adjustment
                </button>
              </form>
            </div>

            {/* Right Panel: Scheduled Log */}
            <div className="visual-card" style={{ flex: 1.2, display: "flex", flexDirection: "column" }}>
              <div className="card-header-row" style={{ marginBottom: "16px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: "800", color: "var(--dark-slate)", margin: 0 }}>Scheduled Updates Log</h3>
                <span className="badge badge-secondary">{slabSchedules.filter(s => s.status === "Scheduled").length} Pending</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", overflowY: "auto", flex: 1, maxHeight: "300px", paddingRight: "6px" }}>
                {slabSchedules.length === 0 ? (
                  <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", minHeight: "150px", color: "var(--slate-400)", fontSize: "13px", fontWeight: "600", border: "2px dashed var(--slate-200)", borderRadius: "12px" }}>
                    No future updates currently scheduled
                  </div>
                ) : (
                  [...slabSchedules].reverse().map(sched => {
                    const slabDef = db.slabs.find(s => s.id === sched.targetSlabId);
                    const isPending = sched.status === "Scheduled";
                    return (
                      <div 
                        key={sched.id} 
                        style={{ 
                          display: "flex", 
                          alignItems: "center", 
                          justifyContent: "space-between", 
                          backgroundColor: "#F8FAFC", 
                          border: "1px solid #E2E8F0", 
                          borderRadius: "10px", 
                          padding: "12px 16px", 
                          boxShadow: "var(--shadow-sm)",
                          opacity: isPending ? 1 : 0.7
                        }}
                      >
                        <div style={{ flex: 1, textAlign: "left" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <strong style={{ fontSize: "13px", color: "var(--dark-slate)" }}>{sched.label}</strong>
                            <span className={`badge ${isPending ? "badge-primary" : "badge-secondary"}`} style={{ fontSize: "9px", padding: "2px 6px" }}>
                              {sched.status}
                            </span>
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--slate-500)", marginTop: "4px" }}>
                            Tier: <strong>{slabDef ? slabDef.label : `ID ${sched.targetSlabId}`}</strong> • Effective: <strong>{sched.targetDate}</strong>
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--slate-500)" }}>
                            New Rate: <strong style={{ color: "var(--toyota-red)" }}>₹{sched.newRate.toLocaleString("en-IN")} / car</strong>
                          </div>
                        </div>
                        {isPending && (
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button 
                              type="button" 
                              className="btn btn-outline btn-sm" 
                              style={{ padding: "6px 10px", fontSize: "11px", borderRadius: "6px", fontWeight: "700" }} 
                              onClick={() => applyScheduleImmediately(sched.id)}
                            >
                              Apply Now
                            </button>
                            <button 
                              type="button" 
                              className="btn btn-primary btn-sm" 
                              style={{ padding: "6px 10px", fontSize: "11px", borderRadius: "6px", fontWeight: "700", backgroundColor: "var(--toyota-red)" }} 
                              onClick={() => cancelSchedule(sched.id)}
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ==================== VIEW 4: ADMIN ANALYTICS ==================== */}
      {activeMenu === "analytics" && (
        <section className="view-panel active">
          <h1 className="view-title">Analytics & Region Reports</h1>
          <div className="analytics-grid">
            <div className="visual-card"><h3>Region Sales Performance Breakdown</h3><div className="chart-container"><canvas ref={regionSalesRef}></canvas></div></div>
            <div className="visual-card"><h3>Incentive Spend Distribution</h3><div className="chart-container"><canvas ref={spendDistributionRef}></canvas></div></div>
          </div>
        </section>
      )}

      {/* ==================== VIEW 5: OFFICERS DIRECTORY ==================== */}
      {activeMenu === "officers" && (
        <section className="view-panel active">
          <h1 className="view-title">Sales Officers Directory</h1>
          
          {/* Filtering Controls Bar */}
          <div style={{ 
            display: "flex", 
            gap: "16px", 
            backgroundColor: "#F8FAFC", 
            padding: "16px 20px", 
            borderRadius: "12px", 
            marginBottom: "20px", 
            border: "1px solid #E2E8F0",
            flexWrap: "wrap",
            alignItems: "center"
          }}>
            {/* Filter by Hub Location */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: "180px", textAlign: "left" }}>
              <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--slate-500)", textTransform: "uppercase" }}>Filter by Hub Location</label>
              <select 
                className="custom-select" 
                style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--slate-300)", backgroundColor: "#FFF", fontSize: "13px" }}
                value={locationFilter} 
                onChange={(e) => setLocationFilter(e.target.value)}
              >
                <option value="all">All Hub Locations</option>
                {uniqueHubs.map(hub => (
                  <option key={hub} value={hub}>{hub}</option>
                ))}
              </select>
            </div>

            {/* Filter by Achieved Slab */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: "180px", textAlign: "left" }}>
              <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--slate-500)", textTransform: "uppercase" }}>Filter by Achieved Slab</label>
              <select 
                className="custom-select" 
                style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--slate-300)", backgroundColor: "#FFF", fontSize: "13px" }}
                value={salesFilter} 
                onChange={(e) => setSalesFilter(e.target.value)}
              >
                <option value="all">All Achieved Slabs</option>
                <option value="No Tier Reached">No Tier Reached</option>
                {db.slabs.map(s => (
                  <option key={s.id} value={s.label}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Sort by Sales Volume */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: "180px", textAlign: "left" }}>
              <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--slate-500)", textTransform: "uppercase" }}>Sort by MTD Sales</label>
              <select 
                className="custom-select" 
                style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--slate-300)", backgroundColor: "#FFF", fontSize: "13px" }}
                value={officersSort} 
                onChange={(e) => setOfficersSort(e.target.value)}
              >
                <option value="none">Default (None)</option>
                <option value="high">Highest Sales First</option>
                <option value="low">Lowest Sales First</option>
              </select>
            </div>

            {/* Reset Filters button */}
            <div style={{ marginLeft: "auto", display: "flex", alignSelf: "flex-end", height: "38px" }}>
              <button 
                type="button"
                className="btn btn-outline" 
                style={{ padding: "8px 16px", borderRadius: "8px", fontSize: "12px", fontWeight: "700" }}
                onClick={() => {
                  setLocationFilter("all");
                  setSalesFilter("all");
                  setOfficersSort("none");
                }}
              >
                Reset Filters
              </button>
            </div>
          </div>

          {/* ---- In-Admin Officer Performance Chart Overlay ---- */}
          {impersonatedOfficerId && db.officers[impersonatedOfficerId] ? (() => {
            const imp = db.officers[impersonatedOfficerId];
            let impUnits = 0;
            Object.keys(imp.currentMonthSales || {}).forEach(c => impUnits += (imp.currentMonthSales[c] || 0));
            const impCalc = calculatePayout(impUnits);
            const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
            const YEARS = [2024, 2025, 2026];
            return (
              <div style={{ backgroundColor: "#F8FAFC", border: "2px solid #E2E8F0", borderRadius: "16px", padding: "28px", marginBottom: "24px" }}>
                {/* Header Row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <div style={{ width: "52px", height: "52px", borderRadius: "50%", backgroundColor: "#D7000F", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: "800", fontSize: "18px" }}>
                      {imp.name ? imp.name.split(" ").map(n => n[0]).join("").toUpperCase() : "SO"}
                    </div>
                    <div>
                      <div style={{ fontSize: "18px", fontWeight: "800", color: "var(--dark-slate)" }}>{imp.name}</div>
                      <div style={{ fontSize: "12px", color: "var(--slate-500)", fontWeight: "600" }}>{imp.hub} • {imp.region} • Target: {imp.target} units</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ padding: "10px 18px", fontWeight: "700", fontSize: "13px", borderRadius: "10px" }}
                    onClick={() => setImpersonatedOfficerId(null)}
                  >
                    ✕ Close Officer View
                  </button>
                </div>

                {/* Month + Year Filters */}
                <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--slate-500)", textTransform: "uppercase" }}>Filter Month:</span>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {MONTHS.map((m, i) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setImpersonateMonth(i)}
                        style={{ padding: "5px 10px", fontSize: "11px", fontWeight: "700", borderRadius: "20px", border: impersonateMonth === i ? "none" : "1px solid #CBD5E1", backgroundColor: impersonateMonth === i ? "#D7000F" : "#fff", color: impersonateMonth === i ? "#fff" : "var(--slate-600)", cursor: "pointer", transition: "all 0.15s" }}
                      >{m}</button>
                    ))}
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--slate-500)", textTransform: "uppercase", marginLeft: "8px" }}>Year:</span>
                  <div style={{ display: "flex", gap: "6px" }}>
                    {YEARS.map(y => (
                      <button
                        key={y}
                        type="button"
                        onClick={() => setImpersonateYear(y)}
                        style={{ padding: "5px 12px", fontSize: "11px", fontWeight: "700", borderRadius: "20px", border: impersonateYear === y ? "none" : "1px solid #CBD5E1", backgroundColor: impersonateYear === y ? "#1E293B" : "#fff", color: impersonateYear === y ? "#fff" : "var(--slate-600)", cursor: "pointer", transition: "all 0.15s" }}
                      >{y}</button>
                    ))}
                  </div>
                </div>

                {/* Quick Stats Row */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "14px", marginBottom: "24px" }}>
                  {[{label: "MTD Units Sold", value: `${impUnits} units`, color: "#D7000F"}, {label: "MTD Payout", value: `₹${impCalc.payout.toLocaleString("en-IN")}`, color: "#10B981"}, {label: "Active Tier", value: impCalc.unlockedTier || "None", color: "#F59E0B"}, {label: "Rank", value: imp.rank || "—", color: "#6366F1"}, {label: "Hub", value: imp.hub || "—", color: "#64748B"}].map(stat => (
                    <div key={stat.label} style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "16px", border: "1px solid #E2E8F0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                      <div style={{ fontSize: "10px", fontWeight: "700", color: "var(--slate-400)", textTransform: "uppercase", marginBottom: "6px" }}>{stat.label}</div>
                      <div style={{ fontSize: "18px", fontWeight: "800", color: stat.color }}>{stat.value}</div>
                    </div>
                  ))}
                </div>

                {/* Charts Row */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
                  <div style={{ backgroundColor: "#fff", borderRadius: "14px", padding: "18px", border: "1px solid #E2E8F0" }}>
                    <div style={{ fontSize: "12px", fontWeight: "700", color: "var(--slate-500)", marginBottom: "12px", textTransform: "uppercase" }}>Sales Trend (Monthly)</div>
                    <div style={{ height: "180px" }}><canvas ref={impTrendRef}></canvas></div>
                  </div>
                  <div style={{ backgroundColor: "#fff", borderRadius: "14px", padding: "18px", border: "1px solid #E2E8F0" }}>
                    <div style={{ fontSize: "12px", fontWeight: "700", color: "var(--slate-500)", marginBottom: "12px", textTransform: "uppercase" }}>Payout Growth (₹)</div>
                    <div style={{ height: "180px" }}><canvas ref={impPayoutRef}></canvas></div>
                  </div>
                  <div style={{ backgroundColor: "#fff", borderRadius: "14px", padding: "18px", border: "1px solid #E2E8F0" }}>
                    <div style={{ fontSize: "12px", fontWeight: "700", color: "var(--slate-500)", marginBottom: "12px", textTransform: "uppercase" }}>Car Mix (MTD)</div>
                    <div style={{ height: "180px" }}><canvas ref={impShareRef}></canvas></div>
                  </div>
                </div>
              </div>
            );
          })() : null}

          <div className="visual-card">
            {filteredOfficers.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: "var(--slate-400)", fontWeight: "600", fontSize: "15px" }}>
                No salesmen match the active filter criteria.
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Officer Name</th>
                      <th>Hub Location</th>
                      <th>MTD Sales</th>
                      <th>Current Payout</th>
                      <th>Active Slab</th>
                      <th>View Performance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOfficers.map(off => (
                      <tr key={off.id} style={{ backgroundColor: impersonatedOfficerId === off.id ? "#FFF0F1" : "inherit", transition: "background-color 0.2s" }}>
                        <td><strong style={{ color: "var(--dark-slate)" }}>{off.name}</strong></td>
                        <td>{off.hub}</td>
                        <td><strong style={{ color: "var(--toyota-red)" }}>{off.mtdSales} units</strong></td>
                        <td className="text-green">₹{off.payout.toLocaleString("en-IN")}</td>
                        <td><span className="badge badge-primary">{off.unlockedTier}</span></td>
                        <td>
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ fontWeight: "700", fontSize: "11px", borderRadius: "8px", padding: "6px 14px", backgroundColor: impersonatedOfficerId === off.id ? "#D7000F" : "", color: impersonatedOfficerId === off.id ? "#fff" : "", borderColor: impersonatedOfficerId === off.id ? "#D7000F" : "" }}
                            onClick={() => impersonatedOfficerId === off.id ? setImpersonatedOfficerId(null) : impersonate(off.id)}
                          >
                            {impersonatedOfficerId === off.id ? "✓ Viewing" : "📊 View Chart"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ==================== MODALS INJECTION ==================== */}
      
      {/* MODAL 1: ADD/EDIT CAR MODEL */}
      {carModal.show && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: "520px" }}>
            <div className="modal-header">
              <h3>{carModal.index !== null ? "Edit Car Model Details" : "Add New Car Model"}</h3>
              <button className="btn-close-modal" onClick={() => setCarModal(prev => ({ ...prev, show: false }))}>&times;</button>
            </div>
            <form onSubmit={handleCarSubmit}>
              <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                
                <div className="modal-row-inputs">
                  <div className="input-group flex-1">
                    <label>Model Name</label>
                    <input type="text" placeholder="e.g. Fortuner" value={carModal.name} onChange={(e) => setCarModal(prev => ({ ...prev, name: e.target.value }))} required />
                  </div>
                  <div className="input-group flex-1">
                    <label>Base Suffix</label>
                    <input type="text" placeholder="e.g. Sigma" value={carModal.suffix} onChange={(e) => setCarModal(prev => ({ ...prev, suffix: e.target.value }))} required />
                  </div>
                </div>

                <div className="input-group">
                  <label>Dynamic Tier Category</label>
                  <select className="custom-select" value={carModal.category} onChange={(e) => setCarModal(prev => ({ ...prev, category: e.target.value }))}>
                    <option value="Premium Utility">Premium Utility</option>
                    <option value="Executive Luxury">Executive Luxury</option>
                    <option value="Core Commuter">Core Commuter</option>
                    <option value="Hybrid Smart">Hybrid Smart</option>
                  </select>
                </div>

                {/* Car Photo Uploader Option */}
                <div className="input-group" style={{ border: "1px solid #CBD5E1", padding: "12px", borderRadius: "10px", backgroundColor: "#F8FAFC" }}>
                  <label style={{ color: "var(--slate-600)", marginBottom: "8px", display: "block" }}>CAR PICTURE / PHOTO</label>
                  <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} id="car-photo-upload" />
                  <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "8px" }}>
                    <label htmlFor="car-photo-upload" className="btn btn-outline" style={{ cursor: "pointer", padding: "8px 14px", fontSize: "12px" }}>
                      📁 Choose Picture file
                    </label>
                    <span style={{ fontSize: "12px", color: "var(--slate-500)", fontWeight: "500" }}>{carModal.photo ? "✓ Image Loaded" : "No file chosen"}</span>
                  </div>
                  <input 
                    type="text" 
                    placeholder="Or paste external picture web URL..." 
                    value={carModal.photo && carModal.photo.startsWith("data:") ? "" : carModal.photo} 
                    onChange={(e) => setCarModal(prev => ({ ...prev, photo: e.target.value }))} 
                    style={{ padding: "10px 12px", fontSize: "13px", border: "1px solid var(--slate-300)" }} 
                  />
                  {carModal.photo && (
                    <div style={{ marginTop: "12px", display: "flex", alignItems: "center", gap: "12px", borderTop: "1px solid #E2E8F0", paddingTop: "8px" }}>
                      <img src={carModal.photo} alt="Preview" style={{ width: "80px", height: "50px", objectFit: "cover", borderRadius: "6px", border: "1px solid #CBD5E1" }} />
                      <button type="button" style={{ border: "none", background: "none", color: "var(--toyota-red)", fontSize: "11px", fontWeight: "700", cursor: "pointer" }} onClick={() => setCarModal(prev => ({ ...prev, photo: "" }))}>
                        Remove Photo
                      </button>
                    </div>
                  )}
                </div>

                {/* Multiple Variants Rows Builder */}
                <div className="input-group" style={{ border: "1px solid #CBD5E1", padding: "12px", borderRadius: "10px", backgroundColor: "#F8FAFC" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <label style={{ color: "var(--slate-600)" }}>VARIANTS & PRICING</label>
                    <button type="button" className="btn btn-outline" style={{ padding: "4px 8px", fontSize: "11px" }} onClick={handleAddVariantRow}>+ Add Variant</button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "150px", overflowY: "auto", paddingRight: "4px" }}>
                    {carModal.variants.map((v, vIdx) => (
                      <div key={vIdx} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <input 
                          type="text" 
                          placeholder="e.g. 2.0L Hybrid" 
                          style={{ flex: 1.5, padding: "8px 10px", fontSize: "13px", border: "1px solid var(--slate-300)", borderRadius: "6px" }} 
                          value={v.name} 
                          onChange={(e) => handleUpdateVariantRow(vIdx, "name", e.target.value)} 
                          required 
                        />
                        <input 
                          type="number" 
                          placeholder="Ex-Showroom Price" 
                          style={{ flex: 1, padding: "8px 10px", fontSize: "13px", border: "1px solid var(--slate-300)", borderRadius: "6px" }} 
                          value={v.price} 
                          onChange={(e) => handleUpdateVariantRow(vIdx, "price", e.target.value)} 
                          required 
                        />
                        {carModal.variants.length > 1 && (
                          <button 
                            type="button" 
                            style={{ border: "none", background: "none", color: "var(--toyota-red)", fontSize: "20px", fontWeight: "bold", cursor: "pointer", padding: "0 4px" }} 
                            onClick={() => handleRemoveVariantRow(vIdx)}
                          >
                            &times;
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

              </div>
              <div className="modal-footer" style={{ marginTop: "12px" }}>
                <button type="button" className="btn btn-outline" onClick={() => setCarModal(prev => ({ ...prev, show: false }))}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Car Model</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD INCENTIVE SLAB RULE */}
      {slabModal.show && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Create New Slab Incentive Rule</h3>
              <button className="btn-close-modal" onClick={() => setSlabModal(prev => ({ ...prev, show: false }))}>&times;</button>
            </div>
            <form onSubmit={handleQuickSlabSubmit}>
              <div className="modal-body">
                <div className="modal-row-inputs">
                  <div className="input-group flex-1"><label>Min Sold Units</label><input type="number" value={slabModal.min} onChange={(e) => setSlabModal(prev => ({ ...prev, min: e.target.value }))} required /></div>
                  <div className="input-group flex-1"><label>Max Sold (use 999 for +)</label><input type="number" value={slabModal.max} onChange={(e) => setSlabModal(prev => ({ ...prev, max: e.target.value }))} required /></div>
                </div>
                <div className="input-group"><label>Incentive Rate (INR/car)</label><input type="number" value={slabModal.rate} onChange={(e) => setSlabModal(prev => ({ ...prev, rate: e.target.value }))} required /></div>
                <div className="input-group"><label>Tier Label</label><input type="text" value={slabModal.label} onChange={(e) => setSlabModal(prev => ({ ...prev, label: e.target.value }))} required /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setSlabModal(prev => ({ ...prev, show: false }))}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Tier Rule</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
