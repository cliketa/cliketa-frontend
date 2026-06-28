"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"form" | "otp">("form");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpError, setOtpError] = useState("");
  const [otpStatus, setOtpStatus] = useState<"idle" | "error" | "success">("idle");
  const [otpLoading, setOtpLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  function handleOtpChange(i: number, val: string) {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[i] = val.slice(-1);
    setOtp(next);
    if (otpStatus === "error") setOtpStatus("idle");
    if (val && i < 5) {
      const el = document.getElementById(`otp-${i + 1}`);
      if (el) (el as HTMLInputElement).focus();
    }
  }

  function handleOtpKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[i] && i > 0) {
      const el = document.getElementById(`otp-${i - 1}`);
      if (el) (el as HTMLInputElement).focus();
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
      document.getElementById("otp-5")?.focus();
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < 6) {
      setOtpError("Please enter the full 6-digit code.");
      return;
    }
    setOtpLoading(true);
    setOtpError("");
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "signup",
    });
    if (error) {
      setOtpStatus("error");
      setOtpLoading(false);
    } else {
      setOtpStatus("success");
      setTimeout(() => { window.location.href = "/"; }, 600);
    }
  }

  async function handleResend() {
    setResending(true);
    await supabase.auth.resend({ type: "signup", email });
    setResending(false);
    setResent(true);
    setTimeout(() => setResent(false), 4000);
  }
  const [visibleCards, setVisibleCards] = useState<number[]>([]);

  const taglines = [
    "Know when competitors move.\nBefore your customers do.",
    "Your competitors are changing.\nAre you watching?",
    "While you sleep, we watch.",
    "Never miss a change again.",
    "Everything is auto.\nStart monitoring.",
  ];
  const [taglineIdx, setTaglineIdx] = useState(0);
  const [taglineFading, setTaglineFading] = useState(false);

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
      setTimeout(() => {
        setTaglineIdx(i => (i + 1) % taglines.length);
        setTaglineFading(false);
      }, 500);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      setLoading(false);
      return;
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setStep("otp");
    }
  }

  const mockCards = [
    { type: "PRICE", typeBg: "#fff3e0", typeColor: "#bf360c", summary: "Ahrefs raised a price", before: "$99/mo", after: "$129/mo" },
    { type: "PLAN", typeBg: "#e3f2fd", typeColor: "#0d47a1", summary: "Semrush added a plan", before: "—", after: "$249/mo" },
    { type: "FEATURE", typeBg: "#e8f5e9", typeColor: "#1b5e20", summary: "Moz gained a feature", before: "—", after: "AI keyword clustering" },
  ];



  if (step === "otp") {
    return (
      <>
        <style>{sharedStyles}</style>
        <div className="auth-split">

          {/* LEFT — same as form step */}
          <div className="auth-left">
            <div className="auth-logo">
              <img src="https://cliketa.com/wp-content/uploads/2026/06/Logo-TR.png" alt="Cliketa" />
              <span className="auth-logo-name">Cliketa</span>
            </div>
            <div className="auth-tagline" style={{
              opacity: taglineFading ? 0 : 1,
              transform: taglineFading ? "translateY(-8px)" : "translateY(0)",
              transition: taglineFading
                ? "opacity 0.45s ease, transform 0.45s ease"
                : "opacity 0.45s ease 0.05s, transform 0.45s ease 0.05s",
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

          {/* RIGHT — OTP */}
          <div className="auth-right">
            <div className="auth-inner">
              <h1 className="auth-title">Check your email</h1>
              <p className="auth-sub">We sent a 6-digit code to <strong style={{ color: "#111", fontWeight: 500 }}>{email}</strong></p>

              <form onSubmit={handleVerifyOtp}>
                <div className="otp-row" onPaste={handleOtpPaste}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      id={`otp-${i}`}
                      className="otp-input"
                    style={{ borderColor: otpStatus === "error" ? "#ef4444" : otpStatus === "success" ? "#16a34a" : undefined, transition: "border-color 0.2s ease" }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      autoFocus={i === 0}
                      autoComplete="off"
                    />
                  ))}
                </div>
                <button className="auth-btn" type="submit" disabled={otpLoading} style={{ marginTop: 24 }}>
                  {otpLoading ? "Verifying…" : "Verify email"}
                </button>
              </form>

              <div className="auth-divider"><div className="auth-divider-line" /></div>

              <div style={{ textAlign: "center", fontSize: 13, color: "#888" }}>
                Didn&apos;t receive a code?{" "}
                <button onClick={handleResend} disabled={resending}
                  style={{ background: "none", border: "none", color: resent ? "#16a34a" : "#111", fontWeight: 500, cursor: "pointer", fontSize: 13, fontFamily: "Inter", padding: 0 }}>
                  {resent ? "Sent!" : resending ? "Sending…" : "Resend"}
                </button>
              </div>

              <div style={{ textAlign: "center", marginTop: 12, fontSize: 13, color: "#888" }}>
                <button onClick={() => setStep("form")}
                  style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 13, fontFamily: "Inter", padding: 0 }}>
                  ← Back
                </button>
              </div>
            </div>
          </div>

        </div>
      </>
    );
  }

  return (
    <>
      <style>{sharedStyles}</style>
      <div className="auth-split">

        {/* LEFT */}
        <div className="auth-left">
          <div className="auth-logo">
            <img src="https://cliketa.com/wp-content/uploads/2026/06/Logo-TR.png" alt="Cliketa" />
            <span className="auth-logo-name">Cliketa</span>
          </div>
          <div className="auth-tagline" style={{
            opacity: taglineFading ? 0 : 1,
            transform: taglineFading ? "translateY(-8px)" : "translateY(0)",
            transition: taglineFading
              ? "opacity 0.45s ease, transform 0.45s ease"
              : "opacity 0.45s ease 0.05s, transform 0.45s ease 0.05s",
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

        {/* RIGHT */}
        <div className="auth-right">
          <div className="auth-inner">
            <h1 className="auth-title">Create your account</h1>
            <p className="auth-sub">Start monitoring today.</p>

            {error && <div className="auth-error">{error}</div>}

            <form onSubmit={handleSignup}>
              <div className="auth-field">
                <label className="auth-label">Full name</label>
                <input className="auth-input" type="text" placeholder="John"
                  value={name} onChange={e => setName(e.target.value)} required autoComplete="name" />
              </div>
              <div className="auth-field">
                <label className="auth-label">Email</label>
                <input className="auth-input" type="email" placeholder="you@example.com"
                  value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
              </div>
              <div className="auth-field">
                <label className="auth-label">Password</label>
                <div className="auth-input-wrap">
                  <input
                    className="auth-input has-toggle"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                  <button type="button" className="toggle-btn" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? (
                      <svg viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    ) : (
                      <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>
              <button className="auth-btn" type="submit" disabled={loading}>
                {loading ? "Creating account…" : "Create account"}
              </button>
            </form>

            <div className="auth-divider"><div className="auth-divider-line" /></div>
            <div className="auth-footer">
              Already have an account? <a href="/login" onClick={(e) => { e.preventDefault(); window.location.href="/login"; }}>Sign in</a>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}

const sharedStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; background: #fff; }

  .auth-split { min-height: 100vh; display: flex; }

  .auth-left {
    width: 45%;
    background: #f7f7f7;
    padding: 48px 44px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    position: sticky;
    top: 0;
    height: 100vh;
  }

  .auth-logo { display: flex; align-items: center; gap: 3px; margin-bottom: 32px; }
  .auth-logo img { width: 39px; height: 39px; object-fit: contain; }
  .auth-logo-name { font-size: 23px; font-weight: 600; color: #111; letter-spacing: -0.3px; }

  .auth-tagline {
    font-size: 22px;
    font-weight: 600;
    color: #111;
    letter-spacing: -0.5px;
    line-height: 1.4;
    margin-bottom: 36px;
  }

  .mock-cards { display: flex; flex-direction: column; gap: 10px; }

  .mock-card {
    background: #fff;
    border: 1px solid #e8e8e8;
    border-radius: 10px;
    padding: 12px 14px;
    opacity: 0;
    transform: translateY(10px);
    transition: opacity 0.4s ease, transform 0.4s ease;
  }

  .mock-card-visible { opacity: 1; transform: translateY(0); }
  .mock-card-top { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }

  .mock-type {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.05em;
    padding: 2px 7px;
    border-radius: 4px;
    text-transform: uppercase;
    flex-shrink: 0;
  }

  .mock-summary { font-size: 12px; color: #444; font-weight: 500; }
  .mock-card-bottom { display: flex; align-items: center; gap: 8px; padding-left: 2px; }
  .mock-before { font-size: 12px; color: #aaa; text-decoration: line-through; }
  .mock-arrow { font-size: 11px; color: #ccc; }
  .mock-after { font-size: 12px; font-weight: 600; color: #111; }

  .auth-right {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 48px 40px;
    background: #fff;
    overflow-y: auto;
  }

  .auth-inner { width: 100%; max-width: 360px; }

  .auth-title { font-size: 22px; font-weight: 600; color: #111; letter-spacing: -0.5px; margin-bottom: 6px; line-height: 1.2; }
  .auth-sub { font-size: 14px; color: #888; margin-bottom: 28px; line-height: 1.5; }
  .auth-field { margin-bottom: 16px; }
  .auth-label { display: block; font-size: 13px; font-weight: 500; color: #333; margin-bottom: 7px; }
  .auth-input-wrap { position: relative; }

  .auth-input {
    width: 100%;
    border: 1.5px solid #e5e5e5;
    border-radius: 9px;
    padding: 11px 14px;
    font-size: 14px;
    font-family: 'Inter', sans-serif;
    outline: none;
    background: #fff;
    color: #111;
    transition: border-color 0.15s ease;
    -webkit-appearance: none;
  }

  .auth-input:focus { border-color: #bbb; }
  .auth-input:hover { border-color: #bbb; }
  .auth-input::placeholder { color: #bbb; font-weight: 300; }
  .auth-input.has-toggle { padding-right: 44px; }

  .toggle-btn {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    cursor: pointer;
    color: #aaa;
    padding: 4px;
    display: flex;
    align-items: center;
    transition: color 0.15s ease;
  }

  .toggle-btn:hover { color: #555; }
  .toggle-btn svg { width: 16px; height: 16px; stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }

  .auth-forgot { display: block; text-align: right; font-size: 12px; color: #888; text-decoration: none; margin-top: -10px; margin-bottom: 22px; transition: color 0.15s ease; }
  .auth-forgot:hover { color: #111; }

  .auth-btn {
    width: 100%;
    background: #111;
    color: #fff;
    border: none;
    border-radius: 9px;
    padding: 12px;
    font-size: 14px;
    font-weight: 500;
    font-family: 'Inter', sans-serif;
    cursor: pointer;
    transition: background 0.15s ease;
    letter-spacing: -0.1px;
  }

  .auth-btn:hover:not(:disabled) { background: #333; }
  .auth-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .auth-error { background: #fff5f5; border: 1.5px solid #fecaca; border-radius: 9px; padding: 10px 14px; font-size: 13px; color: #dc2626; margin-bottom: 16px; line-height: 1.4; }

  .auth-divider { margin: 20px 0; }
  .auth-divider-line { height: 1px; background: #f0f0f0; }
  .auth-footer { text-align: center; font-size: 13px; color: #888; }
  .auth-footer a { color: #111; text-decoration: none; font-weight: 500; }
  .auth-footer a:hover { text-decoration: underline; }

  @media (max-width: 768px) {
    .auth-split { flex-direction: column; }
    .auth-left { display: none; }
    .auth-right { padding: 48px 24px; min-height: 100vh; }
  }

  .otp-row {
    display: flex;
    gap: 10px;
    justify-content: center;
    margin-top: 28px;
  }

  .otp-input {
    width: 48px;
    height: 56px;
    border: 1.5px solid #e5e5e5;
    border-radius: 10px;
    font-size: 22px;
    font-weight: 600;
    text-align: center;
    color: #111;
    font-family: 'Inter', sans-serif;
    outline: none;
    background: #fff;
    transition: border-color 0.15s ease;
    -webkit-appearance: none;
  }

  .otp-input:focus { border-color: #bbb; }
  .otp-input:hover { border-color: #bbb; }

  @media (max-width: 400px) {
    .otp-input { width: 40px; height: 48px; font-size: 18px; }
    .otp-row { gap: 7px; }
  }
`;