"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function Navbar() {
  const pathname = usePathname();
  const [profileOpen, setProfileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [isPro] = useState(false);

  useEffect(() => {
    // Load real user from Supabase session
    async function loadUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const name = session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "";
        setUserName(name);
        setUserEmail(session.user.email || "");
      }
    }
    loadUser();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const name = session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "";
        setUserName(name);
        setUserEmail(session.user.email || "");
      } else {
        setUserName("");
        setUserEmail("");
      }
    });

    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const navLinks = [
    { label: "Dashboard", href: "/" },
    { label: "Pricing", href: "/pricing" },
    { label: "Settings", href: "/settings" },
  ];

  const avatarLetter = userName ? userName.charAt(0).toUpperCase() : "?";

  return (
    <>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @media (max-width: 768px) {
          .nav-links-desktop { display: none !important; }
          .nav-hamburger { display: flex !important; }
          .nav-profile { display: none !important; }
          .nav-inner { padding: 0 1.25rem !important; height: 60px !important; }
        }
        @media (min-width: 769px) {
          .nav-hamburger { display: none !important; }
          .nav-mobile-menu { display: none !important; }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          .nav-inner { padding: 0 2.5rem !important; height: 64px !important; }
        }
        @media (min-width: 1025px) and (max-width: 1280px) {
          .nav-inner { padding: 0 4rem !important; height: 68px !important; }
        }
        @media (min-width: 1281px) {
          .nav-inner { padding: 0 4.5rem !important; height: 68px !important; }
        }
      `}</style>

      <nav className="nav-inner" style={{
        background: "#fff", borderBottom: "1px solid #ebebeb",
        padding: "0 4.5rem", height: 68, display: "flex",
        alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 50,
      }}>

        {/* Logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
          <span style={{ fontSize: 20, fontWeight: 600, color: "#111", letterSpacing: "-0.2px" }}>Clikwatch</span>
        </Link>

        {/* Desktop Nav links */}
        <div className="nav-links-desktop" style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {navLinks.map((item) => (
            <Link key={item.label} href={item.href} style={{
              fontSize: 13, color: pathname === item.href ? "#111" : "#666",
              textDecoration: "none", padding: "5px 11px", borderRadius: 7,
              fontFamily: "Inter", fontWeight: pathname === item.href ? 500 : 400,
              background: pathname === item.href ? "#f5f5f5" : "transparent",
              transition: "background 0.15s ease",
            }}>{item.label}</Link>
          ))}
        </div>

        {/* Desktop Profile */}
        <div ref={dropdownRef} className="nav-profile" style={{ position: "relative" }}>
          <div
            onClick={() => setProfileOpen(!profileOpen)}
            style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "#333333", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 13, fontWeight: 600,
              color: "#fff", cursor: "pointer", userSelect: "none" as const,
              transition: "background 0.15s ease",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "#4D4D4D"}
            onMouseLeave={e => e.currentTarget.style.background = "#333333"}
          >
            {avatarLetter}
          </div>

          {profileOpen && (
            <div style={{
              position: "absolute", right: 0, top: 44,
              background: "#fff", border: "1px solid #e0e0e0",
              borderRadius: 10, width: 220,
              boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
              animation: "fadeIn 0.15s ease", overflow: "hidden", padding: "6px",
            }}>
              <div style={{ padding: "8px 10px", marginBottom: 2, borderBottom: "1px solid #f0f0f0" }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: "#111", marginBottom: 2 }}>{userName}</p>
                <p style={{ fontSize: 11, color: "#999" }}>{userEmail}</p>
              </div>

              <div style={{ marginTop: 2, display: "flex", flexDirection: "column", gap: 1 }}>
                {[
                  { label: "Settings", href: "/settings" },
                  { label: "Pricing & Plans", href: "/pricing" },
                ].map((item) => (
                  <Link key={item.label} href={item.href} onClick={() => setProfileOpen(false)}
                    style={{ display: "flex", alignItems: "center", padding: "6px 10px", fontSize: 13, color: "#333", textDecoration: "none", borderRadius: 6, transition: "background 0.1s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#f5f5f5"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >{item.label}</Link>
                ))}
              </div>

              <div style={{ borderTop: "1px solid #f0f0f0", marginTop: 1, paddingTop: 1, display: "flex", flexDirection: "column", gap: 1 }}>
                {!isPro && (
                  <Link href="/pricing" onClick={() => setProfileOpen(false)}
                    style={{ display: "flex", alignItems: "center", padding: "6px 10px", fontSize: 13, color: "#2A78D6", fontWeight: 500, textDecoration: "none", borderRadius: 6, transition: "background 0.1s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#f5f5f5"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >Upgrade to Pro</Link>
                )}
                <button
                  onClick={handleLogout}
                  style={{ width: "100%", display: "flex", alignItems: "center", padding: "6px 10px", fontSize: 13, color: "#333", background: "none", border: "none", cursor: "pointer", fontFamily: "Inter", textAlign: "left", borderRadius: 6 }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#f5f5f5"; e.currentTarget.style.color = "#ef4444"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#333"; }}
                >Log out</button>
              </div>
            </div>
          )}
        </div>

        {/* Mobile hamburger */}
        <button className="nav-hamburger" onClick={() => setMenuOpen(!menuOpen)}
          style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 4, color: "#111" }}>
          <i className={`ti ${menuOpen ? "ti-x" : "ti-menu-2"}`} style={{ fontSize: 20 }}></i>
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="nav-mobile-menu" style={{
          position: "fixed", top: 60, left: 0, right: 0,
          background: "#fff", borderBottom: "1px solid #ebebeb",
          zIndex: 49, padding: "0.75rem 1.5rem 1rem",
          boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0.75rem 0", borderBottom: "1px solid #f2f2f2", marginBottom: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#333", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, color: "#fff", flexShrink: 0 }}>
              {avatarLetter}
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 500, color: "#111" }}>{userName}</p>
              <p style={{ fontSize: 11, color: "#999" }}>{userEmail}</p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 8 }}>
            {navLinks.map((item) => (
              <Link key={item.label} href={item.href} onClick={() => setMenuOpen(false)}
                style={{ fontSize: 14, color: pathname === item.href ? "#111" : "#666", textDecoration: "none", padding: "9px 10px", borderRadius: 7, fontWeight: pathname === item.href ? 500 : 400, background: pathname === item.href ? "#f5f5f5" : "transparent" }}
              >{item.label}</Link>
            ))}
            {!isPro && (
              <Link href="/pricing" onClick={() => setMenuOpen(false)}
                style={{ fontSize: 14, color: "#2A78D6", textDecoration: "none", padding: "9px 10px", borderRadius: 7, fontWeight: 500 }}
              >Upgrade to Pro</Link>
            )}
          </div>

          <div style={{ borderTop: "1px solid #f2f2f2", paddingTop: 8 }}>
            <button onClick={handleLogout} style={{ background: "none", border: "none", fontSize: 14, color: "#ef4444", cursor: "pointer", fontFamily: "Inter", padding: "9px 10px", width: "100%", textAlign: "left", borderRadius: 7 }}>
              Log out
            </button>
          </div>
        </div>
      )}
    </>
  );
}