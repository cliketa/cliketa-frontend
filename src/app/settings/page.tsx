"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function Settings() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [emailError, setEmailError] = useState(false);

  const [editingPass, setEditingPass] = useState(false);
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passMsg, setPassMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [newPassError, setNewPassError] = useState("");
  const [confirmPassError, setConfirmPassError] = useState("");

  const [notifications, setNotifications] = useState({
    price: true,
    plan: true,
    feature: false,
    trial: true,
  });
  const [notifSaved, setNotifSaved] = useState(false);
  const [billingMsg, setBillingMsg] = useState(false);
  const [isPro] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function loadUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { window.location.href = "/login"; return; }
      const user = session.user;
      setUserId(user.id);
      setName(user.user_metadata?.full_name || user.email?.split("@")[0] || "");
      setEmail(user.email || "");
      const { data: settings } = await supabase
        .from("user_settings")
        .select("notifications")
        .eq("user_id", user.id)
        .single();
      if (settings?.notifications) setNotifications(settings.notifications);
    }
    loadUser();
  }, []);

  function showToast(type: "success" | "error", text: string) {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  }

  async function saveProfile(updatedName: string) {
    await supabase.auth.updateUser({ data: { full_name: updatedName } });
  }

  function validatePassword(p: string) {
    if (p.length < 8) return "Minimum 8 characters required.";
    if (!/[A-Z]/.test(p)) return "Must include at least 1 uppercase letter.";
    if (!/[0-9]/.test(p)) return "Must include at least 1 number.";
    if (!/^[a-zA-Z0-9]+$/.test(p)) return "Letters and numbers only.";
    return null;
  }

  async function handleAccountSave() {
    setNewPassError("");
    setConfirmPassError("");
    if (!name.trim()) { showToast("error", "Name is required."); return; }
    if (editingPass) {
      const error = validatePassword(newPass);
      if (error) { setNewPassError(error); return; }
      if (newPass !== confirmPass) { setConfirmPassError("Passwords do not match."); return; }
      const { error: passError } = await supabase.auth.updateUser({ password: newPass, data: { full_name: name.trim() } });
      if (passError) { showToast("error", passError.message); return; }
      setEditingPass(false);
      setNewPass(""); setConfirmPass("");
      showToast("success", "Password updated successfully.");
      return;
    }
    await saveProfile(name.trim());
    showToast("success", "Changes saved.");
  }

  async function toggleNotification(key: keyof typeof notifications) {
    const next = { ...notifications, [key]: !notifications[key] };
    setNotifications(next);
    setNotifSaved(true);
    setTimeout(() => setNotifSaved(false), 2000);
    if (userId) {
      await supabase.from("user_settings").upsert(
        { user_id: userId, notifications: next, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
    }
  }

  const inp = (hasError?: boolean): React.CSSProperties => ({
    width: "100%",
    border: `1px solid ${hasError ? "#ef4444" : "#e5e5e5"}`,
    borderRadius: 8,
    padding: "7px 11px",
    fontSize: 13,
    fontFamily: "Inter",
    outline: "none",
    color: "#111",
    background: "#fff",
    transition: "border-color 0.2s ease",
    boxSizing: "border-box",
  });

  const inpWithIcon: React.CSSProperties = {
    width: "100%",
    border: "1px solid #e5e5e5",
    borderRadius: 8,
    padding: "7px 36px 7px 11px",
    fontSize: 13,
    fontFamily: "Inter",
    outline: "none",
    color: "#111",
    background: "#fff",
    boxSizing: "border-box",
  };

  const eyeBtn: React.CSSProperties = {
    position: "absolute",
    right: 10,
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#888",
    padding: 0,
    display: "flex",
    alignItems: "center",
  };

  const sectionHd: React.CSSProperties = {
    padding: "0.75rem 1.1rem",
    borderBottom: "1px solid #f0f0f0",
    background: "#f9f9f9",
  };

  const sectionWrap: React.CSSProperties = {
    border: "1px solid #e8e8e8",
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 14,
  };

  const usageItems = [
    { label: "Competitors tracked", value: 5,   limit: 20   },
    { label: "Scans this month",    value: 142, limit: 600  },
    { label: "Alerts sent",         value: 8,   limit: null },
  ];

  return (
    <div className="settings-wrap" style={{ maxWidth: 860, margin: "0 auto", padding: "2.5rem 2rem", fontFamily: "'Inter', sans-serif", position: "relative" }}>

      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }

        /* ── TABLET (768px - 1024px) ── */
        @media (max-width: 1024px) {
          .settings-wrap { padding: 2rem 1.5rem !important; }
        }

        /* ── MOBILE (max 767px) ── */
        @media (max-width: 767px) {
          .settings-wrap { padding: 1.25rem 1rem !important; }
          .settings-grid-2 { grid-template-columns: 1fr !important; }
          .settings-pass-grid { grid-template-columns: 1fr !important; }
          .settings-usage-grid { grid-template-columns: 1fr !important; }
          .settings-billing-row { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
          .settings-notif-row { gap: 16px !important; }
          .settings-notif-sub { display: none !important; }
        }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 28, right: 28,
          background: toast.type === "success" ? "#111" : "#ef4444",
          borderRadius: 8, padding: "10px 14px",
          display: "flex", alignItems: "center", gap: 10,
          zIndex: 999, animation: "slideUp 0.2s ease",
          minWidth: 200, boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
        }}>
          <i className={`ti ${toast.type === "success" ? "ti-circle-check" : "ti-alert-circle"}`} style={{ fontSize: 16, color: "#fff" }}></i>
          <span style={{ fontSize: 13, color: "#fff", fontWeight: 500, flex: 1 }}>{toast.text}</span>
          <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.3)" }}></div>
          <button onClick={() => setToast(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.8)", padding: 0, display: "flex", alignItems: "center" }}>
            <i className="ti ti-x" style={{ fontSize: 14 }}></i>
          </button>
        </div>
      )}

      <div style={{ marginBottom: "1.75rem" }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: "#111", letterSpacing: "-0.4px" }}>Settings</h1>
        <p style={{ fontSize: 13, color: "#888", marginTop: 3 }}>Manage your account and preferences</p>
      </div>

      {/* ── Account ── */}
      <div style={sectionWrap}>
        <div style={sectionHd}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#111", letterSpacing: "-0.1px" }}>Account</p>
        </div>
        <div style={{ padding: "1.1rem" }}>

          {/* Name + Email */}
          <div className="settings-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 12, color: "#444", fontWeight: 500, marginBottom: 5 }}>Full Name</p>
              <input
                type="text" value={name}
                onChange={(e) => setName(e.target.value)}
                style={inp()}
                onFocus={e => e.target.style.borderColor = "#bbb"}
                onBlur={e => e.target.style.borderColor = "#e5e5e5"}
              />
            </div>
            <div>
              <p style={{ fontSize: 12, color: "#444", fontWeight: 500, marginBottom: 5 }}>Email Address</p>
              <input type="email" value={email} disabled style={{ ...inp(), background: "#f5f5f5", color: "#999", cursor: "not-allowed", border: "1px solid #ebebeb" }} />
            </div>
          </div>

          {/* Password row */}
          <div style={{ borderTop: "1px solid #f2f2f2", paddingTop: 18, marginBottom: 16 }}>
            <p style={{ fontSize: 12, color: "#444", marginBottom: 10, fontWeight: 500 }}>Password</p>
            {!editingPass ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, color: "#aaa", letterSpacing: 3 }}>••••••••••••</span>
                <button
                  onClick={() => setEditingPass(true)}
                  style={{ background: "none", border: "none", padding: "6px 0", fontSize: 12, cursor: "pointer", color: "#888", fontFamily: "Inter", display: "flex", alignItems: "center", gap: 5, transition: "color 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.color = "#111"}
                  onMouseLeave={e => e.currentTarget.style.color = "#888"}
                >
                  <i className="ti ti-edit" style={{ fontSize: 13 }}></i> Change password
                </button>
              </div>
            ) : (
              <div>
                <div className="settings-pass-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12, marginTop: 8 }}>
                  <div>
                    <p style={{ fontSize: 12, color: "#444", fontWeight: 500, marginBottom: 5 }}>New Password</p>
                    <div style={{ position: "relative" }}>
                      <input
                        type={showNewPass ? "text" : "password"} value={newPass}
                        onChange={(e) => { setNewPass(e.target.value); setNewPassError(""); }}
                        style={{ ...inpWithIcon, border: `1px solid ${newPassError ? "#ef4444" : "#e5e5e5"}` }}
                        onFocus={e => { if (!newPassError) e.target.style.borderColor = "#bbb"; }}
                        onBlur={e => { if (!newPassError) e.target.style.borderColor = "#e5e5e5"; }}
                      />
                      <button onClick={() => setShowNewPass(!showNewPass)} style={eyeBtn}>
                        <i className={`ti ${showNewPass ? "ti-eye-off" : "ti-eye"}`} style={{ fontSize: 14 }}></i>
                      </button>
                    </div>
                    {newPassError && <p style={{ fontSize: 11, color: "#ef4444", marginTop: 4 }}>{newPassError}</p>}
                  </div>
                  <div>
                    <p style={{ fontSize: 12, color: "#444", fontWeight: 500, marginBottom: 5 }}>Confirm Password</p>
                    <div style={{ position: "relative" }}>
                      <input
                        type={showConfirmPass ? "text" : "password"} value={confirmPass}
                        onChange={(e) => { setConfirmPass(e.target.value); setConfirmPassError(""); }}
                        style={{ ...inpWithIcon, border: `1px solid ${confirmPassError ? "#ef4444" : "#e5e5e5"}` }}
                        onFocus={e => { if (!confirmPassError) e.target.style.borderColor = "#bbb"; }}
                        onBlur={e => { if (!confirmPassError) e.target.style.borderColor = "#e5e5e5"; }}
                      />
                      <button onClick={() => setShowConfirmPass(!showConfirmPass)} style={eyeBtn}>
                        <i className={`ti ${showConfirmPass ? "ti-eye-off" : "ti-eye"}`} style={{ fontSize: 14 }}></i>
                      </button>
                    </div>
                    {confirmPassError && <p style={{ fontSize: 11, color: "#ef4444", marginTop: 4 }}>{confirmPassError}</p>}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Save / Cancel — always bottom-right */}
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10, paddingTop: 14 }}>
            {editingPass && (
              <button
                onClick={() => { setEditingPass(false); setNewPass(""); setConfirmPass(""); setNewPassError(""); setConfirmPassError(""); }}
                style={{ background: "none", border: "none", fontSize: 12, cursor: "pointer", color: "#888", fontFamily: "Inter", transition: "color 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.color = "#111"}
                onMouseLeave={e => e.currentTarget.style.color = "#888"}
              >Cancel</button>
            )}
            <button
              onClick={handleAccountSave}
              style={{ background: "#111", color: "#fff", border: "none", padding: "6px 16px", borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "Inter", transition: "opacity 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.8"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >Save Changes</button>
          </div>
        </div>
      </div>

      {/* ── Usage ── */}
      <div style={sectionWrap}>
        <div style={sectionHd}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#111", letterSpacing: "-0.1px" }}>Usage</p>
        </div>
        <div style={{ padding: "1.1rem" }}>
          <div className="settings-usage-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {usageItems.map((item) => {
              const pct = item.limit ? Math.round((item.value / item.limit) * 100) : null;
              const barColor = pct === null ? "#2A78D6"
                : pct >= 90 ? "#CE2029"
                : pct >= 70 ? "#FAB219"
                : "#2A78D6";
              return (
                <div key={item.label} style={{ border: "1px solid #e8e8e8", borderRadius: 9, padding: "1rem", display: "flex", flexDirection: "column" }}>
                  <p style={{ fontSize: 12, color: "#666", fontWeight: 500, marginBottom: 10 }}>{item.label}</p>
                  <p style={{ fontSize: 22, fontWeight: 600, color: "#111", letterSpacing: "-0.5px", marginBottom: 12 }}>{item.value}</p>
                  {item.limit && pct !== null ? (
                    <div style={{ marginTop: "auto" }}>
                      <div style={{ height: 8, background: "#e8e8e8", borderRadius: 99, marginBottom: 6, overflow: "hidden" }}>
                        <div style={{ height: 8, background: barColor, borderRadius: 99, width: `${pct}%`, transition: "width 0.3s ease" }}></div>
                      </div>
                      <p style={{ fontSize: 11, color: "#999", fontWeight: 500 }}>{item.value} of {item.limit}</p>
                    </div>
                  ) : (
                    <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 5, padding: "4px 8px", background: "#f5f5f5", borderRadius: 6, width: "fit-content" }}>
                      <i className="ti ti-infinity" style={{ fontSize: 12, color: "#888" }}></i>
                      <p style={{ fontSize: 11, color: "#888", fontWeight: 500 }}>Unlimited</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Billing ── */}
      <div style={sectionWrap}>
        <div style={sectionHd}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#111", letterSpacing: "-0.1px" }}>Billing</p>
        </div>
        <div style={{ padding: "1.25rem" }}>
          {isPro ? (
            <>
              <div className="settings-billing-row" style={{ padding: "0.75rem 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <p style={{ fontSize: 14, fontWeight: 500, color: "#111" }}>Pro Plan</p>
                    <span style={{ fontSize: 11, color: "#2e7d32", background: "#e8f5e9", border: "1px solid #e8f5e9", padding: "2px 10px", borderRadius: 20, fontWeight: 500 }}>Active</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                    <span style={{ fontSize: 24, fontWeight: 600, color: "#111", letterSpacing: "-0.5px" }}>$59</span>
                    <span style={{ fontSize: 12, color: "#888" }}>/month</span>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: 11, color: "#bbb", marginBottom: 4 }}>Next billing</p>
                  <p style={{ fontSize: 13, fontWeight: 500, color: "#111" }}>July 7, 2026</p>
                </div>
              </div>
              <div style={{ paddingTop: "0.75rem", borderTop: "1px solid #f2f2f2", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <button
                  onClick={() => { setBillingMsg(true); setTimeout(() => setBillingMsg(false), 3000); }}
                  style={{ background: "#111", color: "#fff", border: "none", padding: "6px 14px", borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "Inter", transition: "opacity 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.opacity = "0.8"}
                  onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                >Manage Billing</button>
                <button
                  style={{ background: "none", border: "none", fontSize: 12, cursor: "pointer", color: "#bbb", fontFamily: "Inter", transition: "color 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.color = "#111"}
                  onMouseLeave={e => e.currentTarget.style.color = "#bbb"}
                >Cancel Plan</button>
              </div>
              {billingMsg && (
                <p style={{ fontSize: 12, color: "#888", marginTop: 10, display: "flex", alignItems: "center", gap: 5 }}>
                  <i className="ti ti-clock" style={{ fontSize: 12 }}></i> Billing portal coming soon
                </p>
              )}
            </>
          ) : (
            <>
              <div style={{ padding: "0.75rem 0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <p style={{ fontSize: 14, fontWeight: 500, color: "#111" }}>Current Plan</p>
                  <span style={{ fontSize: 11, color: "#666", background: "#ebebeb", padding: "1px 8px", borderRadius: 20, fontWeight: 500 }}>Free</span>
                </div>
                <p style={{ fontSize: 12, color: "#888", marginTop: 4 }}>Unlock Pro. Track more competitors.</p>
              </div>
              <div style={{ marginTop: "0.75rem" }}>
                <Link href="/pricing">
                  <button
                    style={{ background: "#111", color: "#fff", border: "none", padding: "6px 16px", borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "Inter", display: "flex", alignItems: "center", gap: 6, transition: "opacity 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.opacity = "0.8"}
                    onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                  >
                    Upgrade to Pro <i className="ti ti-arrow-right" style={{ fontSize: 12 }}></i>
                  </button>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Email Notifications ── */}
      <div style={{ ...sectionWrap, marginBottom: 0 }}>
        <div style={{ ...sectionHd, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#111", letterSpacing: "-0.1px" }}>Email Notifications</p>
          {notifSaved && (
            <span style={{ fontSize: 11, color: "#2e7d32", display: "flex", alignItems: "center", gap: 4, animation: "fadeIn 0.2s ease" }}>
              <i className="ti ti-circle-check" style={{ fontSize: 12 }}></i> Saved
            </span>
          )}
        </div>
        <div style={{ padding: "0 1.1rem", display: "flex", flexDirection: "column" }}>
          {[
            { key: "price"   as const, label: "Price changes",   sub: "Get notified when a competitor changes their pricing" },
            { key: "plan"    as const, label: "Plan changes",    sub: "Get notified when plans are added or removed" },
            { key: "feature" as const, label: "Feature changes", sub: "Get notified when features are updated" },
            { key: "trial"   as const, label: "Trial changes",   sub: "Get notified when free trial terms change" },
          ].map((item, idx, arr) => (
            <div className="settings-notif-row" key={item.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.9rem 0", borderBottom: idx < arr.length - 1 ? "1px solid #f5f5f5" : "none" }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 500, color: "#111" }}>{item.label}</p>
                <p className="settings-notif-sub" style={{ fontSize: 12, color: "#666", marginTop: 2 }}>{item.sub}</p>
              </div>
              <div
                onClick={() => toggleNotification(item.key)}
                style={{ width: 36, height: 20, background: notifications[item.key] ? "#2A78D6" : "#e5e5e5", borderRadius: 20, cursor: "pointer", position: "relative", flexShrink: 0, transition: "background 0.2s ease" }}
              >
                <div style={{ position: "absolute", top: 3, left: notifications[item.key] ? 19 : 3, width: 14, height: 14, background: "#fff", borderRadius: "50%", transition: "left 0.2s ease" }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}