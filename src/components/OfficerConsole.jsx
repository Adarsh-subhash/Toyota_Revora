import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import Chart from "chart.js/auto";

export default function OfficerConsole({
  db,
  setDb,
  activeMenu,
  setActiveMenu,
  searchQuery,
  calculatePayout,
  onShowToast,
  changeStepperSales,
  submitMonthlyReconciliation,
  handleSaleModalSubmit
}) {
  const [saleModal, setSaleModal] = useState({ show: false, model: "", date: "", quantity: 1 });
  const [selectedMonth, setSelectedMonth] = useState("August 2024");
  
  // Custom Showroom Sales Entry states
  const [salesEntryTab, setSalesEntryTab] = useState("grid");
  const [selectedCarForEntry, setSelectedCarForEntry] = useState(null);
  const [selectedVariantName, setSelectedVariantName] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [salesLog, setSalesLog] = useState([]);

  useEffect(() => {
    async function loadSalesLog() {
      try {
        const { data, error } = await supabase.from('toyota_sales_log').select('*');
        if (data) {
          setSalesLog(data.map(l => ({
            id: l.id,
            officerId: l.officer_id,
            carName: l.car_name,
            variant: l.variant,
            price: Number(l.price),
            date: l.date
          })));
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadSalesLog();
  }, []);
  
  // Charts Refs
  const officerTrendRef = useRef(null);
  const officerPayoutRef = useRef(null);
  const officerCarShareRef = useRef(null);

  // Auto-set first inventory model for sale logging
  useEffect(() => {
    if (db.inventory.length > 0) {
      setSaleModal(prev => ({ ...prev, model: db.inventory[0].name }));
    }
  }, [db.inventory]);

  // ==================== CHART EFFECTS ====================
  useEffect(() => {
    // 1. Sales Officer Personal Trend Chart
    if (activeMenu === "dashboard" && officerTrendRef.current) {
      const officer = db.officers[db.currentOfficerId];
      if (!officer) return;

      let currentUnits = 0;
      Object.keys(officer.currentMonthSales).forEach(c => currentUnits += officer.currentMonthSales[c]);
      const historySales = [...officer.salesHistory];
      historySales[historySales.length - 1] = currentUnits;

      const ctx = officerTrendRef.current.getContext("2d");
      const redGradient = ctx.createLinearGradient(0, 0, 0, 240);
      redGradient.addColorStop(0, "rgba(215, 0, 15, 0.2)");
      redGradient.addColorStop(1, "rgba(215, 0, 15, 0.0)");

      // Destroy existing chart on this canvas to prevent the collision crash
      const existingChart = Chart.getChart(officerTrendRef.current);
      if (existingChart) {
        existingChart.destroy();
      }

      const chartInstance = new Chart(officerTrendRef.current, {
        type: "line",
        data: {
          labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"],
          datasets: [{
            data: historySales,
            borderColor: "#D7000F",
            borderWidth: 3,
            pointBackgroundColor: "#D7000F",
            pointBorderColor: "#FFFFFF",
            tension: 0.45,
            fill: true,
            backgroundColor: redGradient
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { x: { grid: { display: false } } }
        }
      });
      return () => chartInstance.destroy();
    }
  }, [activeMenu, db.currentOfficerId, db.officers]);

  useEffect(() => {
    // 2. Personal Performance Charts (Payout Growth & Sales Share)
    if (activeMenu === "performance") {
      let lChart, dChart;
      const officer = db.officers[db.currentOfficerId];
      if (!officer) return;

      let currentUnits = 0;
      Object.keys(officer.currentMonthSales).forEach(c => currentUnits += officer.currentMonthSales[c]);
      const calc = calculatePayout(currentUnits);
      const historyPayouts = [...officer.payoutHistory];
      historyPayouts[historyPayouts.length - 1] = calc.payout;

      if (officerPayoutRef.current) {
        const existingLChart = Chart.getChart(officerPayoutRef.current);
        if (existingLChart) {
          existingLChart.destroy();
        }
        lChart = new Chart(officerPayoutRef.current, {
          type: "line",
          data: {
            labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"],
            datasets: [{
              label: "Payout (₹)",
              data: historyPayouts,
              borderColor: "#10B981",
              borderWidth: 3,
              tension: 0.3,
              fill: false
            }]
          },
          options: { responsive: true, maintainAspectRatio: false }
        });
      }
      if (officerCarShareRef.current) {
        const labels = Object.keys(officer.currentMonthSales);
        const data = labels.map(c => officer.currentMonthSales[c]);
        if (labels.length === 0) {
          labels.push("No Deliveries");
          data.push(1);
        }
        const existingDChart = Chart.getChart(officerCarShareRef.current);
        if (existingDChart) {
          existingDChart.destroy();
        }
        dChart = new Chart(officerCarShareRef.current, {
          type: "doughnut",
          data: {
            labels: labels,
            datasets: [{
              data: data,
              backgroundColor: ["#D7000F", "#60A5FA", "#34D399", "#FBBF24"]
            }]
          },
          options: { responsive: true, maintainAspectRatio: false }
        });
      }
      return () => {
        if (lChart) lChart.destroy();
        if (dChart) dChart.destroy();
      };
    }
  }, [activeMenu, db.currentOfficerId, db.officers]);

  // -- Log Today's Sale Submit --
  const handleSaleSubmit = async (e) => {
    e.preventDefault();
    const model = saleModal.model || db.inventory[0].name;
    const quantity = parseInt(saleModal.quantity) || 1;

    handleSaleModalSubmit(model, quantity);

    const originalCar = db.inventory.find(c => c.name === model);
    const chosenPrice = originalCar ? originalCar.price : 0;
    const chosenVarName = originalCar ? (originalCar.variants && originalCar.variants.length > 0 ? originalCar.variants[0].name : originalCar.variant) : "Standard";
    
    // Add quantity individual log entries
    const newEntries = [];
    for (let i = 0; i < quantity; i++) {
      newEntries.push({
        id: Date.now() + i,
        officer_id: db.currentOfficerId,
        car_name: model,
        variant: chosenVarName,
        price: chosenPrice,
        date: saleModal.date || new Date().toISOString().split("T")[0]
      });
    }

    setSalesLog(prev => [...prev, ...newEntries.map(l => ({
      id: l.id,
      officerId: l.officer_id,
      carName: l.car_name,
      variant: l.variant,
      price: l.price,
      date: l.date
    }))]);

    try {
      await supabase.from('toyota_sales_log').insert(newEntries);
    } catch (e) {
      console.error(e);
    }

    setSaleModal({ show: false, model: db.inventory[0].name, date: "", quantity: 1 });
  };

  const handleShowroomSaleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCarForEntry || !selectedVariantName || !selectedDate) return;

    const variantObj = (selectedCarForEntry.variants || []).find(v => v.name === selectedVariantName);
    const chosenPrice = variantObj ? variantObj.price : (selectedCarForEntry.price || 0);

    // 1. Call parent global submit to increment unit counts & recalculate payouts
    handleSaleModalSubmit(selectedCarForEntry.name, 1);

    // 2. Append new delivery log entry
    const newEntry = {
      id: Date.now(),
      officer_id: db.currentOfficerId,
      car_name: selectedCarForEntry.name,
      variant: selectedVariantName,
      price: chosenPrice,
      date: selectedDate
    };
    
    setSalesLog(prev => [...prev, {
      id: newEntry.id,
      officerId: newEntry.officer_id,
      carName: newEntry.car_name,
      variant: newEntry.variant,
      price: newEntry.price,
      date: newEntry.date
    }]);

    try {
      await supabase.from('toyota_sales_log').insert([newEntry]);
    } catch (e) {
      console.error(e);
    }

    setSelectedCarForEntry(null);
    onShowToast(`Delivery logged successfully: ${selectedCarForEntry.name} (${selectedVariantName})!`);
  };

  // ==================== CALCULATION WORKFLOW ====================
  const activeOfficer = db.officers[db.currentOfficerId];
  if (!activeOfficer) return null;

  let officerUnitsSold = 0;
  Object.keys(activeOfficer.currentMonthSales).forEach(c => officerUnitsSold += activeOfficer.currentMonthSales[c]);
  const officerCalc = calculatePayout(officerUnitsSold);

  return (
    <div style={{ width: "100%" }}>
      
      {/* ==================== VIEW 6: DENTAL BOARD DASHBOARD ==================== */}
      {activeMenu === "dashboard" && (
        <section className="view-panel active">
          <div className="view-header-row">
            <div>
              <span className="badge-date">AUGUST 2024</span>
              <h1 className="view-title">Good morning, {activeOfficer.first}</h1>
              <p className="view-subtitle">{officerCalc.unitsNeeded > 0 ? `You're ${officerCalc.unitsNeeded} sales away from ${officerCalc.nextTier}.` : "Highest Tier Slab Unlocked!"}</p>
            </div>
            <button className="btn btn-primary" onClick={() => setSaleModal({ show: true, model: db.inventory[0].name, date: new Date().toISOString().split("T")[0], quantity: 1 })}>Log Today's Sale</button>
          </div>

          <div className="summary-stats-grid">
            <div className="stat-card">
              <span className="stat-label">Monthly Target</span>
              <div className="stat-value">{officerUnitsSold} / {activeOfficer.target}</div>
              <div className="stat-meta">{Math.min(Math.round((officerUnitsSold / activeOfficer.target) * 100), 100)}% complete</div>
              <div className="progress-bar-container"><div className="progress-bar-fill" style={{ width: `${Math.min(Math.round((officerUnitsSold / activeOfficer.target) * 100), 100)}%` }}></div></div>
            </div>
            <div className="stat-card">
              <span className="stat-label">Incentive Earned</span>
              <div className="stat-value text-red">₹{officerCalc.payout.toLocaleString("en-IN")}</div>
              <div className="stat-meta text-green">Rate: ₹{officerCalc.appliedRate.toLocaleString("en-IN")}/unit</div>
            </div>
            <div className="stat-card urgent-card">
              <span className="stat-label">Next Slab Reward</span>
              <div className="stat-value">{officerCalc.unitsNeeded > 0 ? `₹${officerCalc.nextRate.toLocaleString("en-IN")}` : "MAX"}</div>
              <div className="stat-meta text-red">{officerCalc.unitsNeeded > 0 ? `Sell ${officerCalc.unitsNeeded} more to unlock` : "Top rate"}</div>
            </div>
            <div className="stat-card">
              <span className="stat-label">Rank (Region)</span>
              <div className="stat-value">{activeOfficer.rank}</div>
              <div className="stat-meta text-green">{activeOfficer.rankSpeed}</div>
            </div>
          </div>

          <div className="dashboard-interactive-grid">
            <div className="visual-card main-trend-card">
              <h3>My Sales Trend</h3>
              <div className="chart-container">
                <canvas ref={officerTrendRef}></canvas>
              </div>
            </div>
            <div className="visual-card achievements-card">
              <h3>Achievements</h3>
              <div className="achievements-list">
                <div className="achievement-item">
                  <div className="ach-icon-circle gold-bg">🏆</div>
                  <div className="ach-info"><h4>Top Performer</h4><p>Bangalore South • July</p></div>
                </div>
                <div className="achievement-item">
                  <div className="ach-icon-circle bronze-bg">🎯</div>
                  <div className="ach-info"><h4>Tier 3 Reached</h4><p>12 units • June</p></div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 3 interactive grid aligning as 2fr 1fr matching Row 2 */}
          <div className="dashboard-interactive-grid" style={{ marginTop: "24px" }}>
            
            {/* Left Column (2fr): Top Performing Officers */}
            <div className="visual-card top-officers-card" style={{ margin: 0 }}>
              <div className="card-header-row" style={{ marginBottom: "16px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: "800", color: "var(--dark-slate)" }}>Top Performing Officers</h3>
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
                <h3 style={{ fontSize: "16px", fontWeight: "800", color: "var(--dark-slate)" }}>Current Slab Details</h3>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {db.slabs.map((slab, idx) => (
                  <div key={slab.id} style={{ display: "flex", alignItems: "center", gap: "12px", backgroundColor: "var(--slate-100)", padding: "10px 12px", borderRadius: "10px", borderLeft: "4px solid var(--toyota-red)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "28px", height: "28px", borderRadius: "50%", backgroundColor: "var(--toyota-red-light)", color: "var(--toyota-red)", fontSize: "11px", fontWeight: "800" }}>
                      T{idx + 1}
                    </div>
                    <div style={{ flex: 1, textAlign: "left" }}>
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

      {/* ==================== VIEW 7: MONTHLY SALES ENTRY ==================== */}
      {activeMenu === "sales_entry" && (
        <section className="view-panel active">
          <div className="view-header-row" style={{ marginBottom: "16px" }}>
            <div>
              <h1 className="view-title">Monthly Sales Entry Console</h1>
              <p className="view-subtitle">Select month, discover vehicles, and submit dynamic customer deliveries.</p>
            </div>
            <div className="month-selector-workspace">
              <label>Reporting Month:</label>
              <select className="custom-select-large" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
                <option value="August 2024">August 2024</option>
              </select>
            </div>
          </div>

          {/* Elegant Sub-Tab Navigation Bar */}
          <div style={{ display: "flex", gap: "12px", borderBottom: "1px solid var(--slate-200)", paddingBottom: "12px", marginBottom: "20px" }}>
            <button 
              type="button" 
              style={{
                background: salesEntryTab === "grid" ? "var(--toyota-red-light)" : "none",
                color: salesEntryTab === "grid" ? "var(--toyota-red)" : "var(--slate-600)",
                border: salesEntryTab === "grid" ? "1px solid rgba(215, 0, 15, 0.2)" : "1px solid transparent",
                padding: "8px 16px",
                borderRadius: "20px",
                fontSize: "13px",
                fontWeight: "700",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
              onClick={() => setSalesEntryTab("grid")}
            >
              🚗 Log New Sale (Discover range)
            </button>
            <button 
              type="button" 
              style={{
                background: salesEntryTab === "history" ? "var(--toyota-red-light)" : "none",
                color: salesEntryTab === "history" ? "var(--toyota-red)" : "var(--slate-600)",
                border: salesEntryTab === "history" ? "1px solid rgba(215, 0, 15, 0.2)" : "1px solid transparent",
                padding: "8px 16px",
                borderRadius: "20px",
                fontSize: "13px",
                fontWeight: "700",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
              onClick={() => setSalesEntryTab("history")}
            >
              📋 Vehicle Sold History Log ({salesLog.filter(l => l.officerId === db.currentOfficerId).length})
            </button>
          </div>

          <div className="sales-entry-layout">
            
            {/* LEFT AREA: Switchable Tabs */}
            {salesEntryTab === "grid" && (
              <div className="visual-card sales-inputs-card" style={{ flex: 2, padding: "24px" }}>
                <div style={{ textAlign: "center", width: "100%", margin: "10px 0 20px" }}>
                  <h2 style={{ fontSize: "22px", fontWeight: "800", color: "var(--dark-slate)", margin: "0 0 6px" }}>Discover the Toyota range</h2>
                  <p style={{ fontSize: "13px", color: "var(--slate-500)", fontWeight: "500" }}>Select any vehicle model below to log a dynamic customer delivery sale.</p>
                </div>

                <div style={{ 
                  display: "grid", 
                  gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", 
                  gap: "24px 16px", 
                  width: "100%",
                  justifyContent: "center",
                  padding: "10px 0"
                }}>
                  {db.inventory.map(car => {
                    const prices = (car.variants || []).map(v => v.price).filter(Boolean);
                    const minPrice = prices.length > 0 ? Math.min(...prices) : (car.price || 0);

                    return (
                      <div 
                        key={car.id} 
                        className="showroom-car-card"
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "flex-end",
                          backgroundColor: "var(--white)",
                          border: "1px solid var(--slate-200)",
                          borderRadius: "16px",
                          padding: "16px",
                          cursor: "pointer",
                          boxShadow: "var(--shadow-sm)",
                          transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                          minHeight: "200px"
                        }}
                        onClick={() => {
                          setSelectedCarForEntry(car);
                          const firstVarName = car.variants && car.variants.length > 0 ? car.variants[0].name : (car.variant || "Standard");
                          setSelectedVariantName(firstVarName);
                          setSelectedDate(new Date().toISOString().split("T")[0]);
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "translateY(-4px)";
                          e.currentTarget.style.boxShadow = "var(--shadow-md)";
                          e.currentTarget.style.borderColor = "var(--toyota-red)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow = "var(--shadow-sm)";
                          e.currentTarget.style.borderColor = "var(--slate-200)";
                        }}
                      >
                        {/* Car Image / Center Align */}
                        <div style={{ width: "100%", height: "90px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", marginBottom: "8px" }}>
                          {car.photo ? (
                            <img 
                              src={car.photo} 
                              alt={car.name} 
                              style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} 
                            />
                          ) : (
                            <div style={{ 
                              width: "100px", 
                              height: "65px", 
                              display: "flex", 
                              alignItems: "center", 
                              justifyContent: "center", 
                              backgroundColor: "var(--slate-100)", 
                              color: "var(--slate-400)", 
                              borderRadius: "8px",
                              fontWeight: "800",
                              fontSize: "12px",
                              border: "1px dashed var(--slate-300)"
                            }}>
                              {car.name.substring(0, 3).toUpperCase()}
                            </div>
                          )}
                        </div>

                        {/* Car Details Label */}
                        <div style={{ textAlign: "center", marginTop: "auto", width: "100%" }}>
                          <h4 style={{ fontSize: "14px", fontWeight: "800", color: "var(--dark-slate)", margin: "0 0 2px" }}>{car.name}</h4>
                          <div style={{ fontSize: "11px", color: "var(--slate-500)", fontWeight: "600" }}>
                            From INR {minPrice.toLocaleString("en-IN")}*
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {salesEntryTab === "history" && (
              <div className="visual-card sales-inputs-card" style={{ flex: 2, padding: "24px", margin: 0 }}>
                <div className="card-header-row" style={{ marginBottom: "16px" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: "800", color: "var(--dark-slate)", margin: 0 }}>Vehicle Sold History Log</h3>
                  <span className="badge badge-secondary">{salesLog.filter(l => l.officerId === db.currentOfficerId).length} Deliveries Logged</span>
                </div>
                
                {salesLog.filter(l => l.officerId === db.currentOfficerId).length === 0 ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "220px", border: "2px dashed var(--slate-200)", borderRadius: "12px", color: "var(--slate-400)", fontSize: "14px", fontWeight: "600" }}>
                    No vehicle deliveries logged yet for this reporting month.
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>No.</th>
                          <th>Car Model</th>
                          <th>Variant</th>
                          <th>Ex-Showroom Price</th>
                          <th>Delivery Date</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesLog.filter(l => l.officerId === db.currentOfficerId).slice().reverse().map((log, idx, arr) => {
                          const originalCar = db.inventory.find(c => c.name === log.carName);
                          return (
                            <tr key={log.id}>
                              <td><strong>#{arr.length - idx}</strong></td>
                              <td>
                                <div className="table-avatar-cell" style={{ justifyContent: "flex-start" }}>
                                  {originalCar && originalCar.photo ? (
                                    <img src={originalCar.photo} alt={log.carName} style={{ width: "45px", height: "30px", objectFit: "contain", borderRadius: "4px", border: "1px solid #E2E8F0" }} />
                                  ) : (
                                    <div className="profile-avatar-circle" style={{ backgroundColor: "#64748B", width: "24px", height: "24px", fontSize: "10px" }}>
                                      {log.carName.substring(0, 2).toUpperCase()}
                                    </div>
                                  )}
                                  <strong style={{ fontSize: "13.5px", color: "var(--dark-slate)", marginLeft: "8px" }}>{log.carName}</strong>
                                </div>
                              </td>
                              <td><span style={{ fontSize: "12.5px", fontWeight: "600", color: "var(--slate-600)" }}>{log.variant}</span></td>
                              <td><strong style={{ fontSize: "13px", color: "#10B981" }}>₹{log.price.toLocaleString("en-IN")}</strong></td>
                              <td><span style={{ fontSize: "12px", color: "var(--slate-500)", fontWeight: "600" }}>{log.date}</span></td>
                              <td><span className="badge badge-primary" style={{ backgroundColor: "#D1FAE5", color: "#065F46", border: "1px solid #A7F3D0" }}>✓ Logged</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* RIGHT SIDEBAR: Tracker & Reconcile */}
            <div className="visual-card live-tracker-card" style={{ flex: 1 }}>
              <h3>Real-time Incentive Tracker</h3>
              <div className="tracker-main-metrics">
                <div className="tracker-metric-group"><span className="tracker-label">Total Monthly Units</span><div className="tracker-big-value">{officerUnitsSold}</div></div>
                <div className="tracker-metric-group"><span className="tracker-label">Incentive Slab Unlocked</span><div className="tracker-unlocked-tier">{officerCalc.unlockedTier}</div></div>
              </div>

              <div className="slab-progress-indicator">
                <div className="slab-nodes-row">
                  {db.slabs.map((slab, idx) => (
                    <div key={slab.id} className={`slab-node-point ${officerUnitsSold >= slab.minUnits ? "active" : ""}`}>
                      <div className="node-dot"></div>
                      <span className="node-label">T{idx + 1} ({slab.minUnits}+)</span>
                    </div>
                  ))}
                </div>
                <div className="slab-progress-bar-bg">
                  <div className="slab-progress-bar-fill" style={{ width: `${Math.min((officerUnitsSold / Math.max(...db.slabs.map(s => s.minUnits))) * 100, 100)}%` }}></div>
                </div>
              </div>

              <div className="tracker-financial-breakdown">
                <div className="finance-row"><span>Applied Slab Rate:</span><span>₹{officerCalc.appliedRate.toLocaleString("en-IN")} / unit</span></div>
                <div className="finance-row"><span>Total Delivery Payout:</span><span className="finance-bold-text text-green">₹{officerCalc.payout.toLocaleString("en-IN")}</span></div>
                {officerCalc.unitsNeeded > 0 && (
                  <div className="finance-row next-tier-milestone">
                    <span>Next Slab Rate:</span><span>₹{officerCalc.nextRate.toLocaleString("en-IN")} / unit (Sell {officerCalc.unitsNeeded} more)</span>
                  </div>
                )}
              </div>

              <div className="tracker-footer-actions">
                <button className="btn btn-primary btn-block" onClick={submitMonthlyReconciliation}>Submit & Reconcile Month Sales</button>
              </div>
            </div>

          </div>
        </section>
      )}

      {/* ==================== VIEW 8: OFFICER PERFORMANCE ==================== */}
      {activeMenu === "performance" && (
        <section className="view-panel active">
          <h1 className="view-title">Performance Analytics</h1>
          <div className="analytics-grid">
            <div className="visual-card"><h3>Monthly Payout Growth Trends</h3><div className="chart-container"><canvas ref={officerPayoutRef}></canvas></div></div>
            <div className="visual-card"><h3>Car Sales Share Breakdown</h3><div className="chart-container"><canvas ref={officerCarShareRef}></canvas></div></div>
          </div>
        </section>
      )}

      {/* ==================== MODALS INJECTION ==================== */}
      {saleModal.show && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Log Today's Delivery Sale</h3>
              <button className="btn-close-modal" onClick={() => setSaleModal(prev => ({ ...prev, show: false }))}>&times;</button>
            </div>
            <form onSubmit={handleSaleSubmit}>
              <div className="modal-body">
                <div className="input-group">
                  <label>Select Car Model Line</label>
                  <select className="custom-select" value={saleModal.model} onChange={(e) => setSaleModal(prev => ({ ...prev, model: e.target.value }))} required>
                    {db.inventory.map(car => (
                      <option key={car.id} value={car.name}>{car.name} ({car.variant})</option>
                    ))}
                  </select>
                </div>
                <div className="modal-row-inputs">
                  <div className="input-group flex-1"><label>Sales Officer</label><input type="text" value={activeOfficer.name} readOnly /></div>
                  <div className="input-group flex-1"><label>Delivery Date</label><input type="date" value={saleModal.date} onChange={(e) => setSaleModal(prev => ({ ...prev, date: e.target.value }))} required /></div>
                </div>
                <div className="modal-row-inputs">
                  <div className="input-group flex-1">
                    <label>Reporting Month</label>
                    <select className="custom-select"><option>August 2024</option></select>
                  </div>
                  <div className="input-group flex-1">
                    <label>Quantity Sold (Units)</label>
                    <input type="number" min="1" value={saleModal.quantity} onChange={(e) => setSaleModal(prev => ({ ...prev, quantity: e.target.value }))} required />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setSaleModal(prev => ({ ...prev, show: false }))}>Cancel</button>
                <button type="submit" className="btn btn-primary">Log & Submit Sale</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SHOWROOM CAR MODAL */}
      {selectedCarForEntry && (
        <div className="modal-overlay" style={{ display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div className="modal-card" style={{ maxWidth: "460px", width: "100%" }}>
            <div className="modal-header">
              <h3>Log Vehicle Delivery Sale</h3>
              <button className="btn-close-modal" onClick={() => setSelectedCarForEntry(null)}>&times;</button>
            </div>
            <form onSubmit={handleShowroomSaleSubmit}>
              <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "20px 24px" }}>
                
                {/* Visual Car Details Summary */}
                <div style={{ display: "flex", gap: "16px", alignItems: "center", backgroundColor: "var(--slate-100)", padding: "14px 18px", borderRadius: "12px", border: "1px solid var(--slate-200)" }}>
                  {selectedCarForEntry.photo ? (
                    <img src={selectedCarForEntry.photo} alt={selectedCarForEntry.name} style={{ width: "90px", height: "60px", objectFit: "contain" }} />
                  ) : (
                    <div style={{ width: "90px", height: "60px", backgroundColor: "var(--slate-200)", color: "var(--slate-500)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", borderRadius: "8px" }}>
                      {selectedCarForEntry.name.substring(0, 3).toUpperCase()}
                    </div>
                  )}
                  <div style={{ textAlign: "left" }}>
                    <h4 style={{ margin: 0, fontSize: "16px", fontWeight: "800", color: "var(--dark-slate)" }}>{selectedCarForEntry.name}</h4>
                    <span className="badge badge-secondary" style={{ marginTop: "4px", fontSize: "10px" }}>{selectedCarForEntry.category}</span>
                  </div>
                </div>

                {/* Select Variant */}
                <div className="input-group" style={{ display: "flex", flexDirection: "column", gap: "6px", textAlign: "left" }}>
                  <label style={{ fontSize: "12px", fontWeight: "700", color: "var(--slate-500)" }}>Select Pricing Variant</label>
                  <select 
                    className="custom-select" 
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--slate-300)", backgroundColor: "#FFF" }}
                    value={selectedVariantName} 
                    onChange={(e) => setSelectedVariantName(e.target.value)}
                    required
                  >
                    {(selectedCarForEntry.variants || []).map((v, idx) => (
                      <option key={idx} value={v.name}>{v.name} (₹{v.price.toLocaleString("en-IN")})</option>
                    ))}
                  </select>
                </div>

                {/* Delivery Date */}
                <div className="input-group" style={{ display: "flex", flexDirection: "column", gap: "6px", textAlign: "left" }}>
                  <label style={{ fontSize: "12px", fontWeight: "700", color: "var(--slate-500)" }}>Delivery Date</label>
                  <input 
                    type="date" 
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--slate-300)", fontSize: "13px" }}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    required
                  />
                </div>

                {/* Live ex-showroom pricing preview display */}
                <div style={{ backgroundColor: "#ECFDF5", border: "1px solid #A7F3D0", padding: "12px 16px", borderRadius: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", fontWeight: "700", color: "#065F46" }}>Ex-Showroom Price:</span>
                  <strong style={{ fontSize: "16px", fontWeight: "800", color: "#047857" }}>
                    ₹{((selectedCarForEntry.variants || []).find(v => v.name === selectedVariantName)?.price || selectedCarForEntry.price || 0).toLocaleString("en-IN")}
                  </strong>
                </div>

              </div>
              <div className="modal-footer" style={{ borderTop: "1px solid var(--slate-200)", padding: "16px 24px", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                <button type="button" className="btn btn-outline" style={{ padding: "10px 18px", borderRadius: "8px" }} onClick={() => setSelectedCarForEntry(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ padding: "10px 18px", borderRadius: "8px" }}>Log Delivery</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
