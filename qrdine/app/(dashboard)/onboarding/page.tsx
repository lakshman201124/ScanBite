"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Building2,
  Paintbrush,
  Receipt,
  Coffee,
  Grid2X2, 
  Users2, 
  Sparkles, 
  ArrowLeft, 
  ArrowRight, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  CheckCircle2,
  RefreshCw
} from "lucide-react";

export default function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [brandColor, setBrandColor] = useState("var(--brand)");
  const [logoUrl, setLogoUrl] = useState("");
  const [tagline, setTagline] = useState("");
  
  const [gstin, setGstin] = useState("");
  const [cgstRate, setCgstRate] = useState(2.5);
  const [sgstRate, setSgstRate] = useState(2.5);
  
  const [categoryName, setCategoryName] = useState("Best Sellers");
  const [menuItems, setMenuItems] = useState([
    { name: "Paneer Tikka Masala", price: 280, description: "Charcoal grilled cottage cheese in rich gravy", food_type: "veg" as const },
    { name: "Butter Chicken", price: 320, description: "Classic tandoori chicken cooked in sweet tomato cream", food_type: "non_veg" as const },
    { name: "Tandoori Garlic Naan", price: 80, description: "Clay oven flatbread flavored with garlic butter", food_type: "veg" as const }
  ]);

  const [tables, setTables] = useState([
    { table_number: "T1", capacity: 4 },
    { table_number: "T2", capacity: 2 },
    { table_number: "T3", capacity: 6 }
  ]);

  const [chefName, setChefName] = useState("");
  const [chefEmail, setChefEmail] = useState("");
  const [chefPin, setChefPin] = useState("");
  const [showPin, setShowPin] = useState(false);

  const steps = [
    { title: "Profile", icon: Building2 },
    { title: "Branding", icon: Paintbrush },
    { title: "Taxes & Receipt", icon: Receipt },
    { title: "Menu Setup", icon: Coffee },
    { title: "Tables Setup", icon: Grid2X2 },
    { title: "Chef Account", icon: Users2 },
    { title: "Review", icon: Sparkles }
  ];

  const handleNext = () => {
    if (step < 7) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleAddItem = () => {
    setMenuItems([...menuItems, { name: "", price: 150, description: "", food_type: "veg" }]);
  };

  const handleRemoveItem = (index: number) => {
    setMenuItems(menuItems.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: string, value: string | number) => {
    const updated = [...menuItems];
    updated[index] = { ...updated[index], [field]: value };
    setMenuItems(updated);
  };

  const handleAddTable = () => {
    setTables([...tables, { table_number: `T${tables.length + 1}`, capacity: 4 }]);
  };

  const handleRemoveTable = (index: number) => {
    setTables(tables.filter((_, idx) => idx !== index));
  };

  const handleTableChange = (index: number, field: string, value: string | number) => {
    const updated = [...tables];
    updated[index] = { ...updated[index], [field]: value };
    setTables(updated);
  };

  const validateStep = () => {
    if (step === 1) return name.trim() !== "" && phone.trim() !== "";
    if (step === 4) return categoryName.trim() !== "" && menuItems.every(i => i.name.trim() !== "" && i.price >= 0);
    if (step === 5) return tables.length > 0 && tables.every(t => t.table_number.trim() !== "");
    if (step === 6) return chefName.trim() !== "" && chefEmail.trim() !== "" && /^\d{4,6}$/.test(chefPin);
    return true;
  };

  const handleFinish = async () => {
    setSubmitting(true);
    try {
      const payload = {
        name,
        address: `${address}, ${city} - ${pinCode}`,
        phone,
        logo_url: logoUrl || null,
        brand_color: brandColor,
        gstin: gstin || null,
        cgst_rate: Number(cgstRate),
        sgst_rate: Number(sgstRate),
        categoryName,
        menuItems: menuItems.map(item => ({
          name: item.name,
          price: Number(item.price),
          description: item.description || null,
          food_type: item.food_type,
          image_url: null
        })),
        tables: tables.map(t => ({
          table_number: t.table_number,
          capacity: Number(t.capacity)
        })),
        chefName,
        chefEmail,
        chefPin
      };

      const res = await fetch("/api/admin/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to finalize restaurant setup.");
      }

      router.push("/dashboard");
    } catch (err) {
      alert(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 flex items-center justify-center p-4 sm:p-6 md:p-8 font-sans">
      <div className="w-full max-w-5xl bg-white border border-zinc-200 rounded-3xl overflow-hidden flex flex-col md:flex-row [box-shadow:var(--sh-3)] min-h-[640px]">
        
        {/* Left Side: Smooth Glassmorphic Wizard Steps Navigation */}
        <div className="w-full md:w-80 bg-gradient-to-br from-[var(--ink)] to-[#2A2933] text-white p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden shrink-0 border-r border-zinc-800">
          <div className="absolute right-[-30px] top-[-30px] w-36 h-36 rounded-full bg-radial-gradient(circle, rgba(255,77,61,0.2) 0%, transparent 70%) pointer-events-none" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-6">
              <span className="w-6 h-6 rounded bg-[var(--brand)] text-white flex items-center justify-center text-xs font-bold">S</span>
              <span className="font-bold tracking-tight text-sm">ScanBite Setup Wizard</span>
            </div>
            
            <div className="space-y-3">
              {steps.map((s, idx) => {
                const num = idx + 1;
                const active = step === num;
                const done = step > num;
                return (
                  <div key={num} className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold border transition-colors ${
                      active ? "bg-[var(--brand)] border-[var(--brand)] text-white" : done ? "bg-zinc-800 border-zinc-700 text-[#FF9385]" : "border-zinc-700 text-zinc-500"
                    }`}>
                      {num}
                    </div>
                    <span className={`text-xs font-bold transition-colors ${active ? "text-white" : done ? "text-zinc-300" : "text-zinc-500"}`}>{s.title}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="relative z-10 mt-8">
            <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Verification Complete</p>
            <h5 className="text-xs font-bold text-zinc-300 mt-1">Single-tenant isolated sandbox</h5>
          </div>
        </div>

        {/* Right Side: Step Contents */}
        <div className="flex-1 p-6 sm:p-10 flex flex-col justify-between">
          
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Step 1: Restaurant Profile */}
              {step === 1 && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-xl font-bold text-zinc-950 font-[var(--sans)]">Restaurant Details</h3>
                    <p className="text-xs text-zinc-400 mt-1">Let&apos;s collect primary business contact parameters.</p>
                  </div>
                  <hr className="border-zinc-150" />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-zinc-600 mb-1.5">Restaurant Name <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        value={name} 
                        onChange={e => setName(e.target.value)} 
                        className="w-full border border-zinc-200 rounded-2xl p-3 text-xs focus:border-zinc-950 outline-none" 
                        placeholder="e.g. Olive Garden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-600 mb-1.5">Contact Phone <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        value={phone} 
                        onChange={e => setPhone(e.target.value)} 
                        className="w-full border border-zinc-200 rounded-2xl p-3 text-xs focus:border-zinc-950 outline-none" 
                        placeholder="e.g. +91 9876543210"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-600 mb-1.5">Pin Code</label>
                      <input 
                        type="text" 
                        value={pinCode} 
                        onChange={e => setPinCode(e.target.value)} 
                        className="w-full border border-zinc-200 rounded-2xl p-3 text-xs focus:border-zinc-950 outline-none" 
                        placeholder="e.g. 560001"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-zinc-600 mb-1.5">Street Address</label>
                      <input 
                        type="text" 
                        value={address} 
                        onChange={e => setAddress(e.target.value)} 
                        className="w-full border border-zinc-200 rounded-2xl p-3 text-xs focus:border-zinc-950 outline-none" 
                        placeholder="e.g. 45 Park Avenue, 2nd block"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-600 mb-1.5">City</label>
                      <input 
                        type="text" 
                        value={city} 
                        onChange={e => setCity(e.target.value)} 
                        className="w-full border border-zinc-200 rounded-2xl p-3 text-xs focus:border-zinc-950 outline-none" 
                        placeholder="e.g. Bengaluru"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Branding */}
              {step === 2 && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-xl font-bold text-zinc-950 font-[var(--sans)]">Brand Identity</h3>
                    <p className="text-xs text-zinc-400 mt-1">Make your outlet menu representation stand out with matching palettes.</p>
                  </div>
                  <hr className="border-zinc-150" />

                  <div className="space-y-4 max-w-xl">
                    <div>
                      <label className="block text-xs font-bold text-zinc-600 mb-2">Primary Brand Theme</label>
                      <div className="flex items-center gap-3">
                        <input 
                          type="color" 
                          value={brandColor} 
                          onChange={e => setBrandColor(e.target.value)} 
                          className="w-10 h-10 border border-zinc-200 rounded-2xl cursor-pointer p-0 overflow-hidden"
                        />
                        <input 
                          type="text" 
                          value={brandColor} 
                          onChange={e => setBrandColor(e.target.value)} 
                          className="border border-zinc-200 rounded-2xl p-2.5 text-xs text-center uppercase font-mono w-28 focus:border-zinc-950 outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-600 mb-1.5">Logo URL (Optional)</label>
                      <input 
                        type="text" 
                        value={logoUrl} 
                        onChange={e => setLogoUrl(e.target.value)} 
                        className="w-full border border-zinc-200 rounded-2xl p-3 text-xs focus:border-zinc-950 outline-none" 
                        placeholder="https://example.com/logo.png"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-600 mb-1.5">Slogan / Tagline</label>
                      <input 
                        type="text" 
                        value={tagline} 
                        onChange={e => setTagline(e.target.value)} 
                        className="w-full border border-zinc-200 rounded-2xl p-3 text-xs focus:border-zinc-950 outline-none" 
                        placeholder="e.g. Finest slow-cooked delights"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Taxes */}
              {step === 3 && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-xl font-bold text-zinc-950 font-[var(--sans)]">GST Tax Structure</h3>
                    <p className="text-xs text-zinc-400 mt-1">Configure default Indian merchant CGST and SGST transaction laws.</p>
                  </div>
                  <hr className="border-zinc-150" />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-zinc-600 mb-1.5">GSTIN Number</label>
                      <input 
                        type="text" 
                        value={gstin} 
                        onChange={e => setGstin(e.target.value.toUpperCase())} 
                        className="w-full border border-zinc-200 rounded-2xl p-3 text-xs uppercase font-mono focus:border-zinc-950 outline-none" 
                        placeholder="e.g. 29AAAAA1111A1Z1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-600 mb-1.5">CGST (%)</label>
                      <input 
                        type="number" 
                        step="0.1" 
                        value={cgstRate} 
                        onChange={e => setCgstRate(parseFloat(e.target.value) || 0)} 
                        className="w-full border border-zinc-200 rounded-2xl p-3 text-xs focus:border-zinc-950 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-600 mb-1.5">SGST (%)</label>
                      <input 
                        type="number" 
                        step="0.1" 
                        value={sgstRate} 
                        onChange={e => setSgstRate(parseFloat(e.target.value) || 0)} 
                        className="w-full border border-zinc-200 rounded-2xl p-3 text-xs focus:border-zinc-950 outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Plan */}
              {/* Step 4: Menu Setup */}
              {step === 4 && (
                <div className="space-y-5">
                  <div className="flex justify-between items-center gap-4">
                    <div>
                      <h3 className="text-xl font-bold text-zinc-950 font-[var(--sans)]">First Digital Menu Items</h3>
                      <p className="text-xs text-zinc-400 mt-1">Let&apos;s create a primary category and populate three high-selling dishes.</p>
                    </div>
                    <button 
                      type="button" 
                      onClick={handleAddItem}
                      className="px-3 py-1.5 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-700 hover:bg-zinc-50 flex items-center gap-1 shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Item
                    </button>
                  </div>
                  <hr className="border-zinc-150" />

                  <div className="max-w-xs mb-3">
                    <label className="block text-xs font-bold text-zinc-600 mb-1">First Menu Category</label>
                    <input 
                      type="text" 
                      value={categoryName} 
                      onChange={e => setCategoryName(e.target.value)} 
                      className="w-full border border-zinc-200 rounded-2xl p-2.5 text-xs focus:border-zinc-950 outline-none" 
                    />
                  </div>

                  <div className="border border-zinc-200 rounded-2xl overflow-hidden divide-y divide-zinc-200 max-w-3xl">
                    {menuItems.map((item, idx) => (
                      <div key={idx} className="p-3 grid grid-cols-12 gap-3 items-center text-xs">
                        <div className="col-span-5">
                          <input 
                            type="text" 
                            value={item.name} 
                            onChange={e => handleItemChange(idx, "name", e.target.value)} 
                            className="w-full border border-zinc-200 rounded-xl p-2 text-xs focus:border-zinc-950 outline-none" 
                            placeholder="Paneer Tikka Masala..."
                          />
                        </div>
                        <div className="col-span-3">
                          <input 
                            type="number" 
                            value={item.price} 
                            onChange={e => handleItemChange(idx, "price", parseFloat(e.target.value) || 0)} 
                            className="w-full border border-zinc-200 rounded-xl p-2 text-xs focus:border-zinc-950 outline-none" 
                          />
                        </div>
                        <div className="col-span-3">
                          <select 
                            value={item.food_type} 
                            onChange={e => handleItemChange(idx, "food_type", e.target.value)} 
                            className="w-full border border-zinc-200 bg-white rounded-xl p-2 text-xs focus:border-zinc-950 outline-none font-semibold"
                          >
                            <option value="veg">Veg</option>
                            <option value="non_veg">Non-Veg</option>
                            <option value="egg">Egg</option>
                            <option value="vegan">Vegan</option>
                          </select>
                        </div>
                        <div className="col-span-1 text-center">
                          <button 
                            type="button" 
                            onClick={() => handleRemoveItem(idx)}
                            disabled={menuItems.length <= 1}
                            className="text-zinc-400 hover:text-red-500 disabled:opacity-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 5: Tables Setup */}
              {step === 5 && (
                <div className="space-y-5">
                  <div className="flex justify-between items-center gap-4">
                    <div>
                      <h3 className="text-xl font-bold text-zinc-950 font-[var(--sans)]">Dine-In Layout</h3>
                      <p className="text-xs text-zinc-400 mt-1">Structure initial tables to generate dynamic menu QR tokens.</p>
                    </div>
                    <button 
                      type="button" 
                      onClick={handleAddTable}
                      className="px-3 py-1.5 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-700 hover:bg-zinc-50 flex items-center gap-1 shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Table
                    </button>
                  </div>
                  <hr className="border-zinc-150" />

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl">
                    {tables.map((t, idx) => (
                      <div key={idx} className="border border-zinc-200 rounded-2xl p-4 bg-zinc-50/50 space-y-2 relative">
                        <button 
                          type="button" 
                          onClick={() => handleRemoveTable(idx)}
                          disabled={tables.length <= 1}
                          className="absolute top-2 right-2 text-zinc-400 hover:text-red-500 disabled:opacity-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        
                        <div>
                          <label className="block text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest mb-1">Table Code</label>
                          <input 
                            type="text" 
                            value={t.table_number} 
                            onChange={e => handleTableChange(idx, "table_number", e.target.value)} 
                            className="w-full border border-zinc-200 rounded-xl p-1.5 text-xs text-center font-bold outline-none focus:border-zinc-950 bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest mb-1">Seats</label>
                          <input 
                            type="number" 
                            value={t.capacity} 
                            onChange={e => handleTableChange(idx, "capacity", parseInt(e.target.value) || 2)} 
                            className="w-full border border-zinc-200 rounded-xl p-1.5 text-xs text-center outline-none focus:border-zinc-950 bg-white"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 6: Chef Account */}
              {step === 6 && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-xl font-bold text-zinc-950 font-[var(--sans)]">Kitchen Security</h3>
                    <p className="text-xs text-zinc-400 mt-1">Configure kitchen manager credentials for logging into the KDS tablet interface.</p>
                  </div>
                  <hr className="border-zinc-150" />

                  <div className="space-y-4 max-w-xl">
                    <div>
                      <label className="block text-xs font-bold text-zinc-600 mb-1.5">Chef Full Name <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        value={chefName} 
                        onChange={e => setChefName(e.target.value)} 
                        className="w-full border border-zinc-200 rounded-2xl p-3 text-xs focus:border-zinc-950 outline-none" 
                        placeholder="e.g. Chef Sanjay"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-600 mb-1.5">Chef Email Address <span className="text-red-500">*</span></label>
                      <input 
                        type="email" 
                        value={chefEmail} 
                        onChange={e => setChefEmail(e.target.value)} 
                        className="w-full border border-zinc-200 rounded-2xl p-3 text-xs focus:border-zinc-950 outline-none" 
                        placeholder="chef.sanjay@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-600 mb-1.5">Chef PIN (4-6 digits) <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <input 
                          type={showPin ? "text" : "password"} 
                          value={chefPin} 
                          onChange={e => setChefPin(e.target.value.replace(/\D/g, "").slice(0, 6))} 
                          className="w-full border border-zinc-200 rounded-2xl p-3 pr-10 text-xs focus:border-zinc-950 outline-none font-mono tracking-widest" 
                          placeholder="••••"
                        />
                        <button 
                          type="button" 
                          onClick={() => setShowPin(!showPin)} 
                          className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-600"
                        >
                          {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 7: Go Live */}
              {step === 7 && (
                <div className="text-center py-4 space-y-4 max-w-md mx-auto flex flex-col items-center">
                  <div className="w-14 h-14 bg-gradient-to-tr from-[var(--brand)] to-[#FF7A4D] text-white rounded-3xl flex items-center justify-center [box-shadow:var(--sh-3)] shadow-orange-500/25">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-zinc-950 font-[var(--sans)]">Setup Complete!</h3>
                    <p className="text-zinc-400 text-xs mt-1">We are ready to deploy your workspace database schemas and merchant configurations.</p>
                  </div>

                  <div className="border border-zinc-200 rounded-3xl bg-zinc-50/50 p-5 w-full text-left space-y-2.5 divide-y divide-zinc-200/60 text-xs font-medium">
                    <div className="flex justify-between pb-2">
                      <span className="text-zinc-400">Establishment</span>
                      <span className="text-zinc-950 font-bold">{name}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-zinc-400">Dishes Generated</span>
                      <span className="text-zinc-950 font-bold">{menuItems.length} items</span>
                    </div>
                    <div className="flex justify-between pt-2">
                      <span className="text-zinc-400">Tables Configured</span>
                      <span className="text-zinc-950 font-bold">{tables.length} tables</span>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Setup controls */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t border-zinc-150 relative z-10">
            <button 
              onClick={handleBack} 
              disabled={step === 1 || submitting}
              className="px-4 py-2.5 rounded-2xl border border-zinc-200 text-zinc-600 font-bold hover:bg-zinc-50 disabled:opacity-0 disabled:pointer-events-none transition-[transform,opacity] flex items-center gap-1.5 text-xs bg-white"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            {step < 7 ? (
              <button 
                onClick={handleNext} 
                disabled={!validateStep()}
                className="px-5 py-2.5 rounded-2xl bg-zinc-950 text-white font-bold hover:bg-zinc-800 transition-[transform,opacity] flex items-center gap-1.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed [box-shadow:var(--sh-1)]"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button 
                onClick={handleFinish} 
                disabled={submitting}
                className="px-6 py-3 rounded-2xl bg-[var(--brand)] text-white font-bold hover:bg-orange-600 transition-[transform,opacity] text-xs disabled:opacity-50 flex items-center gap-2 [box-shadow:var(--sh-3)] shadow-orange-500/20"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Finalizing Sandbox...
                  </>
                ) : (
                  <>
                    Launch Live Workspace <Sparkles className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
