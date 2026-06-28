"use client";
import { useState, useEffect, Suspense } from "react";
import { supabase } from "@/lib/supabase";

function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");

  useEffect(() => {
    // Exchange the token in the URL hash for a valid session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setSessionReady(true);
      }
    });

    // Also try to get existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");
    setConfirmError("");
    setSessionError("");

    let valid = true;
    if (password.length < 8) { setPasswordError("Min. 8 characters required."); valid = false; }
    if (password !== confirm) { setConfirmError("Passwords do not match."); valid = false; }
    if (!valid) return;

    if (!sessionReady) {
      setSessionError("Session expired. Please request a new reset link.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setSessionError(error.message);
      setLoading(false);
    } else {
      setDone(true);
      await supabase.auth.signOut();
      setTimeout(() => { window.location.href = "/login"; }, 2000);
    }
  }

  if (done) {
    return (
      <div className="auth-inner">
        <div className="check-icon">
          <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h1 className="auth-title">Password updated</h1>
        <p className="auth-sub">Redirecting you to sign in…</p>
      </div>
    );
  }

  return (
    <div className="auth-inner">
      <h1 className="auth-title">Reset password</h1>
      <p className="auth-sub">Enter your new password below.</p>

      {sessionError && <div className="auth-error">{sessionError}</div>}

      <form onSubmit={handleSubmit}>
        <div className="auth-field">
          <label className="auth-label">New password</label>
          <div className="auth-input-wrap">
            <input className="auth-input has-toggle"
              type={showPassword ? "text" : "password"}
              placeholder="Min. 8 characters"
              value={password}
              onChange={e => { setPassword(e.target.value); setPasswordError(""); }}
              required autoComplete="new-password"
              style={{ borderColor: passwordError ? "#ef4444" : undefined }}
            />
            <button type="button" className="toggle-btn" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? (
                <svg viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              ) : (
                <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              )}
            </button>
          </div>
          {passwordError && <p className="field-error">{passwordError}</p>}
        </div>

        <div className="auth-field">
          <label className="auth-label">Confirm password</label>
          <div className="auth-input-wrap">
            <input className="auth-input has-toggle"
              type={showConfirm ? "text" : "password"}
              placeholder="Repeat your password"
              value={confirm}
              onChange={e => { setConfirm(e.target.value); setConfirmError(""); }}
              required autoComplete="new-password"
              style={{ borderColor: confirmError ? "#ef4444" : undefined }}
            />
            <button type="button" className="toggle-btn" onClick={() => setShowConfirm(!showConfirm)}>
              {showConfirm ? (
                <svg viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              ) : (
                <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              )}
            </button>
          </div>
          {confirmError && <p className="field-error">{confirmError}</p>}
        </div>

        <button className="auth-btn" type="submit" disabled={loading}>
          {loading ? "Updating…" : "Update password"}
        </button>
      </form>

      <div className="auth-footer" style={{ marginTop: 16 }}>
        <a href="/login" onClick={(e) => { e.preventDefault(); window.location.href = "/login"; }}>← Back to sign in</a>
      </div>
      <div className="auth-divider"><div className="auth-divider-line" /></div>
    </div>
  );
}

export default function ResetPasswordPage() {
  const [visibleCards, setVisibleCards] = useState<number[]>([]);
  const [taglineIdx, setTaglineIdx] = useState(0);
  const [taglineFading, setTaglineFading] = useState(false);

  const taglines = [
    "Know when competitors move.\nBefore your customers do.",
    "Your competitors are changing.\nAre you watching?",
    "While you sleep, we watch.",
    "Never miss a change again.",
    "Everything is auto.\nStart monitoring.",
  ];

  const mockCards = [
    { type: "PRICE", typeBg: "#fff3e0", typeColor: "#bf360c", summary: "Ahrefs raised a price", before: "$99/mo", after: "$129/mo" },
    { type: "PLAN", typeBg: "#e3f2fd", typeColor: "#0d47a1", summary: "Semrush added a plan", before: "—", after: "$249/mo" },
    { type: "FEATURE", typeBg: "#e8f5e9", typeColor: "#1b5e20", summary: "Moz gained a feature", before: "—", after: "AI keyword clustering" },
  ];

  useEffect(() => {
    const timers = [
      setTimeout(() => setVisibleCards(v => [...v, 0]), 400),
      setTimeout(() => setVisibleCards(v => [...v, 1]), 900),
      setTimeout(() => setVisibleCards(v => [...v, 2]), 1400),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTaglineFading(true);
      setTimeout(() => { setTaglineIdx(i => (i + 1) % taglines.length); setTaglineFading(false); }, 500);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <style>{styles}</style>
      <div className="auth-split">
        <div className="auth-left">
          <div className="auth-logo">
            <img src="https://cliketa.com/wp-content/uploads/2026/06/Logo-TR.png" alt="Cliketa" />
            <span className="auth-logo-name">Cliketa</span>
          </div>
          <div className="auth-tagline" style={{
            opacity: taglineFading ? 0 : 1,
            transform: taglineFading ? "translateY(-8px)" : "translateY(0)",
            transition: taglineFading ? "opacity 0.45s ease, transform 0.45s ease" : "opacity 0.45s ease 0.05s, transform 0.45s ease 0.05s",
            minHeight: "70px",
          }}>
            {taglines[taglineIdx].split("\n").map((line, i) => (
              <span key={i}>{line}{i < taglines[taglineIdx].split("\n").length - 1 && <br />}</span>
            ))}
          </div>
          <div className="mock-cards">
            {mockCards.map((card, i) => (
              <div key={i} className={`mock-card ${visibleCards.includes(i) ? "mock-card-visible" : ""}`}>
                <div className="mock-card-top">
                  <span className="mock-type" style={{ background: card.typeBg, color: card.typeColor }}>{card.type}</span>
                  <span className="mock-summary">{card.summary}</span>
                </div>
                <div className="mock-card-bottom">
                  <span className="mock-before">{card.before}</span>
                  <span className="mock-arrow">→</span>
                  <span className="mock-after">{card.after}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="auth-right">
          <Suspense fallback={<div className="auth-inner"><p className="auth-sub">Loading…</p></div>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </>
  );
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; background: #fff; }
  .auth-split { min-height: 100vh; display: flex; }
  .auth-left { width: 45%; background: #f7f7f7; padding: 48px 44px; display: flex; flex-direction: column; justify-content: center; position: sticky; top: 0; height: 100vh; }
  .auth-logo { display: flex; align-items: center; gap: 3px; margin-bottom: 32px; }
  .auth-logo img { width: 39px; height: 39px; object-fit: contain; }
  .auth-logo-name { font-size: 23px; font-weight: 600; color: #111; letter-spacing: -0.3px; }
  .auth-tagline { font-size: 22px; font-weight: 600; color: #111; letter-spacing: -0.5px; line-height: 1.4; margin-bottom: 36px; }
  .mock-cards { display: flex; flex-direction: column; gap: 10px; }
  .mock-card { background: #fff; border: 1px solid #e8e8e8; border-radius: 10px; padding: 12px 14px; opacity: 0; transform: translateY(10px); transition: opacity 0.4s ease, transform 0.4s ease; }
  .mock-card-visible { opacity: 1; transform: translateY(0); }
  .mock-card-top { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
  .mock-type { font-size: 10px; font-weight: 700; letter-spacing: 0.05em; padding: 2px 7px; border-radius: 4px; text-transform: uppercase; flex-shrink: 0; }
  .mock-summary { font-size: 12px; color: #444; font-weight: 500; }
  .mock-card-bottom { display: flex; align-items: center; gap: 8px; padding-left: 2px; }
  .mock-before { font-size: 12px; color: #aaa; text-decoration: line-through; }
  .mock-arrow { font-size: 11px; color: #ccc; }
  .mock-after { font-size: 12px; font-weight: 600; color: #111; }
  .auth-right { flex: 1; display: flex; align-items: center; justify-content: center; padding: 48px 40px; background: #fff; overflow-y: auto; }
  .auth-inner { width: 100%; max-width: 360px; }
  .auth-title { font-size: 22px; font-weight: 600; color: #111; letter-spacing: -0.5px; margin-bottom: 6px; line-height: 1.2; }
  .auth-sub { font-size: 14px; color: #888; margin-bottom: 28px; line-height: 1.5; }
  .auth-field { margin-bottom: 16px; }
  .auth-label { display: block; font-size: 13px; font-weight: 500; color: #333; margin-bottom: 7px; }
  .auth-input-wrap { position: relative; }
  .auth-input { width: 100%; border: 1.5px solid #e5e5e5; border-radius: 9px; padding: 11px 14px; font-size: 14px; font-family: 'Inter', sans-serif; outline: none; background: #fff; color: #111; transition: border-color 0.15s ease; -webkit-appearance: none; }
  .auth-input:focus { border-color: #bbb; }
  .auth-input:hover { border-color: #bbb; }
  .auth-input::placeholder { color: #bbb; font-weight: 300; }
  .auth-input.has-toggle { padding-right: 44px; }
  .toggle-btn { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #aaa; padding: 4px; display: flex; align-items: center; transition: color 0.15s ease; }
  .toggle-btn:hover { color: #555; }
  .toggle-btn svg { width: 16px; height: 16px; stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
  .field-error { font-size: 12px; color: #ef4444; margin-top: 5px; text-align: left; }
  .auth-error { background: #fff5f5; border: 1.5px solid #fecaca; border-radius: 9px; padding: 10px 14px; font-size: 13px; color: #dc2626; margin-bottom: 16px; line-height: 1.4; }
  .auth-btn { width: 100%; background: #111; color: #fff; border: none; border-radius: 9px; padding: 12px; font-size: 14px; font-weight: 500; font-family: 'Inter', sans-serif; cursor: pointer; transition: background 0.15s ease; letter-spacing: -0.1px; }
  .auth-btn:hover:not(:disabled) { background: #333; }
  .auth-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .auth-divider { margin: 20px 0; }
  .auth-divider-line { height: 1px; background: #f0f0f0; }
  .auth-footer { text-align: center; font-size: 13px; color: #888; }
  .auth-footer a { color: #111; text-decoration: none; font-weight: 500; }
  .auth-footer a:hover { text-decoration: underline; }
  .check-icon { width: 44px; height: 44px; background: #f0fdf4; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 20px; }
  .check-icon svg { width: 20px; height: 20px; stroke: #16a34a; fill: none; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }
  @media (max-width: 768px) {
    .auth-split { flex-direction: column; }
    .auth-left { display: none; }
    .auth-right { padding: 48px 24px; min-height: 100vh; }
  }
`;