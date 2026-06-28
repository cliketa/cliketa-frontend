"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// Helper: get auth headers with JWT token
async function authHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    return { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` };
  }
  return { "Content-Type": "application/json" };
}

interface Competitor {
  id: string;
  url: string;
  label: string;
  status: string;
  created_at: string;
}

interface Change {
  id: string;
  competitor_id: string;
  type: string;
  summary: string;
  old_value: string;
  new_value: string;
  created_at: string;
}

interface PlanData {
  name: string;
  price?: string | null;          // legacy single price (older snapshots)
  priceMonthly?: string | null;   // new dual pricing
  priceYearly?: string | null;
  features: string[];
}

interface Snapshot {
  id: string;
  competitor_id: string;
  data: {
    prices: string[];
    monthlyPrices?: string[];
    yearlyPrices?: string[];
    hasYearlyToggle?: boolean;
    plans: string[];
    features: string[];
    planData?: PlanData[] | null;   // ← Claude's accurate bundled reading
    hasTrial: boolean;
    hasFreePlan: boolean;
    hasContactSales: boolean;
    trialDays: string | null;
    hasMonthly: boolean;
    hasAnnual: boolean;
    scrapedAt: string;
  };
  created_at: string;
}

type View = "dashboard" | "detail";

function cleanPrice(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .replace(/^from\s+/i, "")
    .replace(/^USD/i, "")
    .replace(/^US(?=\$)/i, "")
    .trim();
}

function timeAgo(date: string) {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function Dashboard() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [changes, setChanges] = useState<Change[]>([]);
  const [lastSnapshotAt, setLastSnapshotAt] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [urlError, setUrlError] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [view, setView] = useState<View>("dashboard");
  const [selectedComp, setSelectedComp] = useState<Competitor | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLabel, setDeleteLabel] = useState<string>("");
  const [viewAllChanges, setViewAllChanges] = useState(false);
  const [viewAllCompetitors, setViewAllCompetitors] = useState(false);
  const [changesPage, setChangesPage] = useState(1);
  const [competitorsPage, setCompetitorsPage] = useState(1);
  const [detailChangesPage, setDetailChangesPage] = useState(1);
  const [scanningComp, setScanningComp] = useState<{id: string; label: string} | null>(null);
  const [scanStep, setScanStep] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState<"success" | "error" | null>(null);
  const [snapAnnual, setSnapAnnual] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

function showToast(type: "success" | "error", text: string) {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  }

function isValidUrl(value: string) {
    try {
      const u = new URL(value);
      return (
        (u.protocol === "http:" || u.protocol === "https:") &&
        u.hostname.includes(".") &&
        u.hostname.split(".").every(part => part.length > 0)
      );
    } catch { return false; }
  }
  const PER_PAGE = 5;

  useEffect(() => {
    // Protect dashboard — redirect if not logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) window.location.href = "/login";
    });
    fetchData();
  }, []);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 60000);
    return () => clearInterval(t);
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const headers = await authHeaders();
      const [c, ch, sn] = await Promise.all([
        fetch(`${API}/api/competitors`, { headers }),
        fetch(`${API}/api/changes`, { headers }),
        fetch(`${API}/api/snapshots/latest`, { headers }),
      ]);
      setCompetitors(await c.json());
      setChanges(await ch.json());
      if (sn.ok) {
        const snData = await sn.json();
        setLastSnapshotAt(snData.created_at || null);
      }
    } catch { console.error("fetch failed"); }
    setLoading(false);
  }

  async function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    await Promise.all([fetchData(), new Promise(r => setTimeout(r, 1500))]);
    setRefreshing(false);
  }

async function addCompetitor() {
    if (!url) return;
    if (!isValidUrl(url)) {
      setUrlError("Enter a valid URL");
      return;
    }
    setUrlError("");
    setAdding(true);
    try {
      const addHeaders = await authHeaders();
      const res = await fetch(`${API}/api/competitors`, {
        method: "POST",
        headers: addHeaders,
        body: JSON.stringify({ url, label }),
      });
      const newComp = await res.json();
      setUrl(""); setLabel(""); setShowForm(false);
      fetchData();

      // Show scanning modal
      setScanningComp({ id: newComp.id, label: label || url });
      setScanStep(0);

      // Visual step progression — 50/50 split, Step 3 holds until scan done
      const s1 = setTimeout(() => setScanStep(1), 12000);
      const s2 = setTimeout(() => setScanStep(2), 24000);

      // Poll for snapshot — close only when scan actually completes
      const poll = setInterval(async () => {
        const snapHeaders = await authHeaders();
        const snap = await fetch(`${API}/api/competitors/${newComp.id}/snapshot`, { headers: snapHeaders });
        if (snap.ok) {
          clearInterval(poll);
          clearTimeout(s1); clearTimeout(s2);
          setScanStep(2); // make sure we're on step 3
          setTimeout(() => {
            setScanningComp(null);
            setScanStep(0);
            showToast("success", "Scan complete! Click View details.");
            fetchData();
          }, 800); // brief pause on step 3 before closing
        }
      }, 5000);
      setTimeout(() => { clearInterval(poll); setScanningComp(null); }, 180000);

    } catch { console.error("add failed"); }
    setAdding(false);
  }

  async function deleteCompetitor(id: string) {
    const delHeaders = await authHeaders();
    await fetch(`${API}/api/competitors/${id}`, { method: "DELETE", headers: delHeaders });
    setDeleteId(null); setDeleteLabel("");
    fetchData();
  }

  async function openDetail(comp: Competitor) {
    setSelectedComp(comp);
    setView("detail");
    setDetailChangesPage(1);
    setScanMsg(null);
    try {
      const snapHeaders = await authHeaders();
      const res = await fetch(`${API}/api/competitors/${comp.id}/snapshot`, { headers: snapHeaders });
      if (res.ok) setSnapshot(await res.json());
      else setSnapshot(null);
    } catch { setSnapshot(null); }
  }

  async function runScan(compId: string) {
    setScanning(true);
    setScanMsg(null);
    try {
      const scanHeaders = await authHeaders();
      const res = await fetch(`${API}/api/competitors/${compId}/scan`, { method: "POST", headers: scanHeaders });
      if (res.ok) {
        showToast("success", "Scan complete. Snapshot updated.");
        const snap = await fetch(`${API}/api/competitors/${compId}/snapshot`, { headers: scanHeaders });
        if (snap.ok) setSnapshot(await snap.json());
        // Update last scan time immediately
        const latest = await fetch(`${API}/api/snapshots/latest`, { headers: scanHeaders });
        if (latest.ok) {
          const d = await latest.json();
          setLastSnapshotAt(d.created_at || null);
        }
        fetchData();
      } else {
        showToast("error", "Scan failed. Please try again.");
      }
    } catch {
      showToast("error", "Scan failed. Please try again.");
    }
    setScanning(false);
  }

  function changesFor(id: string) {
    return changes.filter((c) => c.competitor_id === id);
  }

function getCompName(id: string) {
    const c = competitors.find(c => c.id === id);
    return c?.label || c?.url?.replace(/https?:\/\//, "").split("/")[0] || "Unknown";
  }

  function lastScanTime() {
    void tick; // re-evaluate every minute
    if (lastSnapshotAt) return timeAgo(lastSnapshotAt);
    return "No scans yet";
  }

  function badgeStyle(type: string) {
    const map: Record<string, { bg: string; color: string }> = {
      price:   { bg: "#fff3e0", color: "#bf360c" },
      plan:    { bg: "#e3f2fd", color: "#0d47a1" },
      feature: { bg: "#e8f5e9", color: "#1b5e20" },
      trial:   { bg: "#f3e5f5", color: "#4a148c" },
    };
    return map[type] || { bg: "#f5f5f5", color: "#555" };
  }

const recentChanges = [...changes]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const detailChanges = selectedComp
    ? changesFor(selectedComp.id).sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    : [];

  function Pagination({ current, total, onChange }: { current: number; total: number; onChange: (p: number) => void }) {
    const pages = Math.ceil(total / PER_PAGE);
    if (pages <= 1) return null;
    function getVisible() {
      const result: (number | string)[] = [];
      if (pages <= 5) { for (let i = 1; i <= pages; i++) result.push(i); }
      else {
        result.push(current);
        if (current + 1 <= pages) result.push(current + 1);
        if (current + 2 <= pages) result.push(current + 2);
        result.push("...");
      }
      return result;
    }
    return (
      <div className="page-wrap">
        <button className="page-btn nav" disabled={current === 1} onClick={() => onChange(current - 1)}>‹</button>
        {getVisible().map((p, i) =>
          p === "..." ? <span key={i} className="page-dots">...</span> :
          <button key={i} className={`page-btn ${current === p ? "active" : ""}`} onClick={() => onChange(p as number)}>{p}</button>
        )}
        <button className="page-btn nav" disabled={current === pages} onClick={() => onChange(current + 1)}>›</button>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scanModalIn { from { opacity: 0; transform: scale(0.94) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes dotBounce { 0%, 60%, 100% { opacity: 0.3; transform: translateY(0) scale(0.85); } 30% { opacity: 1; transform: translateY(-5px) scale(1); } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .spinning { animation: spin 0.7s linear infinite; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; background: #fff; }
        .dash { user-select: none; }
        .snap-tags, .snap-tag, .history-summary, .history-ba { user-select: text; }
        .dash { padding: 2rem 2rem 1.75rem; font-family: 'Inter', sans-serif; background: #fff; min-height: auto; }
        .dash-inner { max-width: 860px; margin: 0 auto; }

        .topbar { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 1.5rem; }
        .topbar h1 { font-size: 20px; font-weight: 600; color: #111; letter-spacing: -0.4px; }
        .topbar p { font-size: 13px; color: #888; margin-top: 3px; }
        .btn-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
        .btn-sec { background: #fff; border: 1px solid #e5e5e5; padding: 6px 13px; border-radius: 8px; font-size: 13px; cursor: pointer; color: #444; font-family: 'Inter', sans-serif; display: flex; align-items: center; gap: 5px; }
        .btn-sec:hover { border-color: #bbb; background: #f5f5f5; }
        .btn-sec:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-pri { background: #7E57C2; border: none; color: #fff; padding: 6px 14px; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; font-family: 'Inter', sans-serif; display: flex; align-items: center; gap: 5px; }
        .btn-pri:hover { background: #6d3fb0; }
        .btn-pri:disabled { opacity: 0.5; cursor: not-allowed; }

        .cards { display: grid; grid-template-columns: repeat(3, minmax(0, 200px)); gap: 10px; margin-bottom: 1.25rem; }
        .card { background: #fff; border: 1px solid #e8e8e8; border-radius: 10px; padding: 0.9rem 1rem; }
        .dots-loader { display: inline-flex; align-items: center; gap: 3px; height: 22px; }
        .dots-loader span { width: 4px; height: 4px; border-radius: 50%; animation: dotBounce 1.4s infinite ease-in-out; }
        .dots-loader span:nth-child(1) { background: #7E57C2; animation-delay: 0s; }
        .dots-loader span:nth-child(2) { background: #9C7FD4; animation-delay: 0.2s; }
        .dots-loader span:nth-child(3) { background: #BBA8E8; animation-delay: 0.4s; }
        .comp-list { transition: opacity 0.3s ease; }
        .comp-list.loading { opacity: 0.4; }
        .card-icon { width: 28px; height: 28px; border-radius: 6px; background: #7E57C210; display: flex; align-items: center; justify-content: center; margin-bottom: 10px; color: #7E57C2; }
        .card-icon i { font-size: 14px; }
        .card-label { font-size: 12px; color: #888; font-weight: 400; margin-bottom: 3px; }
        .card-val { font-size: 22px; font-weight: 500; color: #111; letter-spacing: -0.5px; }
        .card-val-sm { font-size: 14px; font-weight: 500; color: #111; margin-top: 1px; }

        .inp { border: 1px solid #e5e5e5; border-radius: 8px; padding: 6px 11px; font-size: 13px; font-family: 'Inter', sans-serif; outline: none; background: #fff; color: #111; }
        .inp:focus { border-color: #bbb; }
        .inp::placeholder { color: #bbb; }



        .section { background: #fff; border: 1px solid #e8e8e8; border-radius: 10px; overflow: hidden; margin-bottom: 1.1rem; }
        .section-hd { padding: 0.75rem 1rem; border-bottom: 1px solid #f0f0f0; display: flex; align-items: center; justify-content: space-between; background: #f9f9f9; }
        .section-hd-title { font-size: 13px; font-weight: 500; color: #111; letter-spacing: -0.1px; }
        .section-hd-count { font-size: 11px; color: #fff; background: #bbb; padding: 1px 7px; border-radius: 20px; font-weight: 500; }

        .rc-item { padding: 1.1rem 1rem; min-height: 60px; border-bottom: 1px solid #f2f2f2; display: flex; align-items: flex-start; gap: 8px; }
        .rc-item:last-child { border-bottom: none; }
        .rc-item:nth-child(3) { border-bottom: none; }
        .rc-badge { font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.4px; flex-shrink: 0; white-space: nowrap; }
        .rc-ba { display: flex; align-items: center; gap: 5px; margin-top: 5px; background: #f5f5f5; border-radius: 4px; padding: 2px 8px; width: fit-content; max-width: 100%; }
        .rc-old { font-size: 11px; color: #999; text-decoration: line-through; }
        .rc-arr { font-size: 10px; color: #bbb; }
        .rc-new { font-size: 11px; color: #111; font-weight: 600; }
        .rc-new-added { font-size: 11px; color: #111; font-weight: 600; }
        .rc-time { font-size: 11px; color: #bbb; white-space: nowrap; flex-shrink: 0; margin-top: 1px; }
        .rc-right { display: flex; flex-direction: column; align-items: flex-end; gap: 5px; flex-shrink: 0; padding-top: 1px; min-width: 64px; }

        .comp-row { border-bottom: 1px solid #f2f2f2; }
        .comp-row:last-child { border-bottom: none; }
        .comp-row:nth-child(3) { border-bottom: none; }
        .two-col .comp-row:last-child { border-bottom: none; }
        .two-col .comp-row:nth-child(3) { border-bottom: none; }
        .comp-main { padding: 1.1rem 1rem; height: 90px; display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
        .view-all-comp-main { padding: 0.9rem 1rem; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .comp-left { display: flex; align-items: flex-start; gap: 8px; flex: 1; min-width: 0; }
        .comp-num { font-size: 12px; color: #ccc; min-width: 14px; flex-shrink: 0; padding-top: 1px; }
        .comp-info { flex: 1; display: flex; flex-direction: column; min-width: 0; }
        .comp-name-link { font-size: 13px; font-weight: 600; color: #111; text-decoration: none; display: inline-flex; align-items: center; gap: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; letter-spacing: -0.1px; }
        .comp-name-link:hover { color: #444; }
        .comp-name-link i { font-size: 10px; color: #ccc; flex-shrink: 0; }
        .view-btn { display: inline-flex; align-items: center; gap: 3px; margin-top: 4px; font-size: 12px; color: #555; cursor: pointer; background: none; border: none; font-family: 'Inter', sans-serif; padding: 0; width: fit-content; }
        .view-btn:hover { color: #111; }
        .view-btn i { font-size: 11px; }
        .comp-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .badge-active { font-size: 11px; color: #2e7d32; background: #e8f5e9; padding: 2px 8px; border-radius: 20px; font-weight: 500; white-space: nowrap; }
        .del-btn { background: none; border: none; cursor: pointer; color: #aaa; padding: 4px 6px; display: flex; align-items: center; transition: color 0.15s ease; }
        .del-btn i { font-size: 13px; }
        .del-btn:hover { color: #ef4444; }
        .view-all-row { padding: 0.75rem 1rem; display: flex; justify-content: flex-end; margin-top: auto; border-top: 1px solid #f2f2f2; }
        .view-all-btn { font-size: 12px; color: #666; background: none; border: none; cursor: pointer; font-family: 'Inter', sans-serif; display: flex; align-items: center; gap: 4px; }
        .view-all-btn:hover { color: #111; }

        .page-wrap { display: flex; justify-content: center; align-items: center; gap: 6px; padding: 1rem 0 0.5rem; }
        .page-btn { background: none; border: 1px solid #e5e5e5; border-radius: 6px; cursor: pointer; font-family: 'Inter', sans-serif; font-size: 13px; color: #555; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; transition: all 0.15s ease; }
        .page-btn:hover { border-color: #bbb; color: #111; }
        .page-btn.active { background: #f5f5f5; color: #111; border-color: #e0e0e0; font-weight: 500; }
        .page-btn.nav { color: #888; font-size: 16px; border: none; background: none; }
        .page-btn.nav:hover { color: #111; background: none; border: none; }
        .page-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .page-dots { font-size: 13px; color: #bbb; }

        .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 1.1rem; align-items: stretch; }
        .two-col .section { display: flex; flex-direction: column; margin-bottom: 0; }
        .two-col .section .comp-list { flex: 1; display: flex; flex-direction: column; }

        .email-bar { border: 1px solid #e8e8e8; border-radius: 10px; padding: 0.75rem 1rem; margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between; background: #fff; }
        .email-left { display: flex; align-items: center; gap: 9px; }
        .email-icon { width: 28px; height: 28px; border-radius: 6px; background: #7E57C210; display: flex; align-items: center; justify-content: center; color: #7E57C2; flex-shrink: 0; }
        .email-icon i { font-size: 14px; }
        .email-label { font-size: 13px; font-weight: 500; color: #111; }
        .email-sub { font-size: 11px; color: #999; margin-top: 1px; }
        .email-badge { font-size: 11px; color: #2e7d32; background: #e8f5e9; padding: 2px 8px; border-radius: 20px; font-weight: 500; }

        .back-btn { display: inline-flex; align-items: center; gap: 5px; font-size: 13px; color: #888; cursor: pointer; background: none; border: none; font-family: 'Inter', sans-serif; padding: 0; margin-bottom: 1.5rem; transition: color 0.15s ease; letter-spacing: -0.1px; }
        .back-btn:hover { color: #111; }
        .back-btn i { font-size: 14px; transition: transform 0.15s ease; }
        .back-btn:hover i { transform: translateX(-3px); }

        /* ── DETAIL PAGE ── */
        .detail-stat-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 1.1rem; }
        .detail-stat { background: #fff; border: 1px solid #e8e8e8; border-radius: 9px; padding: 0.75rem 1rem; }
        .detail-stat-label { font-size: 11px; color: #aaa; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; font-weight: 500; }
        .detail-stat-val { font-size: 15px; font-weight: 600; color: #111; letter-spacing: -0.2px; }

        .snapshot-box { background: #fff; border: 1px solid #e8e8e8; border-radius: 10px; margin-bottom: 1.1rem; overflow: hidden; }
        .snap-header { padding: 0.75rem 1rem; border-bottom: 1px solid #f0f0f0; background: #f9f9f9; display: flex; align-items: center; justify-content: space-between; }
        .snap-title { font-size: 13px; font-weight: 600; color: #111; letter-spacing: -0.1px; }
        .snap-time { font-size: 11px; color: #bbb; }
        .snap-label { font-size: 10px; color: #bbb; text-transform: uppercase; letter-spacing: 0.6px; font-weight: 500; }

        /* Plan cards grid — mirrors pricing page */
        .snap-cards-grid { display: grid; padding: 1rem; gap: 0; border-bottom: 1px solid #f0f0f0; }
        .snap-cards-inner { display: grid; border: 1px solid #e0e0e0; overflow: hidden; }
        .snap-card { padding: 1.25rem 1.25rem; display: flex; flex-direction: column; border-right: 1px solid #e0e0e0; }
        .snap-card:last-child { border-right: none; }
        .snap-card.dark { background: #111; border-right-color: #333; }
        .snap-card-name { font-size: clamp(14px, 1.5vw, 16px); font-weight: 600; color: #111; letter-spacing: -0.2px; line-height: 1; margin-bottom: 10px; }
        .snap-card-name.dark { color: #fff; }
        .snap-card-price { font-size: 20px; font-weight: 700; color: #111; letter-spacing: -0.4px; line-height: 1; margin-bottom: 4px; }
        .snap-card-price.dark { color: #fff; }
        .snap-card-price-sub { font-size: 11px; color: #999; margin-bottom: 14px; }
        .snap-card-price-sub.dark { color: #666; }
        .snap-card-divider { border-top: 1px solid #e0e0e0; margin: 14px -1.25rem 14px; }
        .snap-card-divider.dark { border-top-color: #333; }
        .snap-card-features { display: flex; flex-direction: column; gap: 9px; }
        .snap-card-feature { display: flex; align-items: flex-start; gap: 8px; }
        .snap-card-check { font-size: 12px; color: #111; flex-shrink: 0; margin-top: 1px; }
        .snap-card-check.dark { color: #fff; }
        .snap-card-feature-text { font-size: 12px; color: #444; line-height: 1.4; }
        .snap-card-feature-text.dark { color: #bbb; }

        /* No plans fallback */
        .snap-fallback { padding: 1rem; border-bottom: 1px solid #f0f0f0; }
        .snap-fallback-prices { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px; }
        .snap-fallback-price { font-size: 13px; font-weight: 600; color: #111; background: #f5f5f5; border: 1px solid #ebebeb; border-radius: 5px; padding: 2px 8px; }

        /* Status row */
        .snap-status-row { display: grid; grid-template-columns: repeat(4, 1fr); }
        .snap-status-item { padding: 0.75rem 1rem; border-right: 1px solid #f0f0f0; display: flex; flex-direction: column; gap: 5px; }
        .snap-status-item:last-child { border-right: none; }
        .snap-status-val { display: flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600; }
        .snap-status-yes { color: #16a34a; }
        .snap-status-no { color: #ccc; }

        .history-hd { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
        .history-box { background: #fff; border: 1px solid #e8e8e8; border-radius: 10px; overflow: hidden; }
        .history-item { display: flex; align-items: flex-start; gap: 9px; padding: 0.75rem 1rem; border-bottom: 1px solid #f5f5f5; }
        .history-item:last-child { border-bottom: none; }
        .history-badge { font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.3px; flex-shrink: 0; margin-top: 1px; }
        .history-body { flex: 1; }
        .history-summary { font-size: 12px; color: #444; margin-bottom: 3px; }
        .history-ba { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
        .history-old { font-size: 11px; color: #aaa; text-decoration: line-through; }
        .history-new { font-size: 11px; color: #111; font-weight: 500; }
        .history-arr { font-size: 10px; color: #ccc; }
        .history-date { font-size: 11px; color: #bbb; flex-shrink: 0; }

        /* ── POPUPS ── */
        .popup-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; z-index: 100; animation: fadeIn 0.25s ease; }
        .scan-modal { background: #fff; border-radius: 14px; padding: 28px 32px; width: 340px; box-shadow: 0 8px 32px rgba(0,0,0,0.12); animation: scanModalIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .scan-modal-title { font-size: 16px; font-weight: 600; color: #111; margin-bottom: 24px; letter-spacing: -0.3px; }
        .scan-step-label { font-size: 11px; font-weight: 600; color: #999; letter-spacing: 0.3px; margin-bottom: 4px; }
        .scan-step-text { font-size: 13px; color: #444; margin-bottom: 12px; font-weight: 500; }
        .scan-progress-track { height: 4px; background: #f0f0f0; border-radius: 99px; overflow: hidden; }
        .scan-progress-bar { height: 4px; background: #111; border-radius: 99px; transition: width 1.2s cubic-bezier(0.4, 0, 0.2, 1); }
        .scan-dots span { animation: scanDot 1.4s infinite; opacity: 0; }
        .scan-dots span:nth-child(1) { animation-delay: 0s; }
        .scan-dots span:nth-child(2) { animation-delay: 0.2s; }
        .scan-dots span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes scanDot { 0%, 60%, 100% { opacity: 0; } 30% { opacity: 1; } }
        .popup-box { background: #fff; border-radius: 12px; padding: 1.5rem; width: 100%; max-width: 380px; margin: 0 1rem; animation: scaleIn 0.15s ease; }
        .add-popup-box { background: #fff; border-radius: 12px; padding: 1.5rem; width: 100%; max-width: 440px; margin: 0 1rem; animation: scaleIn 0.15s ease; }
        .popup-title { font-size: 15px; font-weight: 500; color: #111; margin-bottom: 6px; }
        .popup-sub { font-size: 13px; color: #888; margin-bottom: 1.25rem; }
        .popup-btns { display: flex; gap: 8px; justify-content: flex-end; }
        .popup-cancel { background: #fff; border: 1px solid #e5e5e5; padding: 7px 16px; border-radius: 8px; font-size: 13px; cursor: pointer; color: #555; font-family: 'Inter', sans-serif; }
        .popup-cancel:hover { border-color: #bbb; }
        .popup-confirm { background: #111; border: none; color: #fff; padding: 7px 16px; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; font-family: 'Inter', sans-serif; }
        .popup-confirm:hover { background: #333; }
        .add-popup-label { font-size: 12px; font-weight: 500; color: #444; margin-bottom: 5px; }
        .add-popup-inp { width: 100%; border: 1px solid #e5e5e5; border-radius: 8px; padding: 8px 11px; font-size: 12px; font-family: Inter; outline: none; color: #111; background: #fff; box-sizing: border-box; }
        .add-popup-inp:focus { border-color: #bbb; }
        .add-popup-inp::placeholder { color: #bbb; }

        .empty { padding: 1.5rem; text-align: center; }
        .empty p { font-size: 13px; color: #bbb; }
        .empty small { font-size: 12px; color: #ccc; margin-top: 3px; display: block; }

        /* ── TABLET ── */
        @media (max-width: 1024px) {
          .dash { padding: 1.75rem 1.5rem 1.5rem; }
          .cards { grid-template-columns: repeat(3, 1fr); }
        }

        /* ── MOBILE ── */
        @media (max-width: 767px) {
          .dash { padding: 1.25rem 1rem 1.25rem; }
          .comp-main { padding: 1.1rem 1rem; }
          .dash-inner { max-width: 100%; }
          .topbar { flex-direction: column; align-items: flex-start; gap: 10px; margin-bottom: 1rem; }
          .topbar h1 { font-size: 18px; }
          .btn-row { width: 100%; }
          .btn-sec, .btn-pri { font-size: 12px; padding: 6px 11px; }
          .cards { grid-template-columns: 1fr; gap: 8px; }
          .card { padding: 0.75rem; }
          .two-col { grid-template-columns: 1fr !important; }
          .email-bar { flex-direction: column; align-items: flex-start; gap: 8px; }
          .detail-stat-row { grid-template-columns: 1fr 1fr !important; }
          .snap-bools { grid-template-columns: repeat(2, 1fr) !important; }
          .snap-bool-item:nth-child(2) { border-right: none; }
          .snap-bool-item:nth-child(1), .snap-bool-item:nth-child(2) { border-bottom: 1px solid #f0f0f0; }
          .snap-status-row { grid-template-columns: repeat(2, 1fr) !important; }
          .snap-status-item:nth-child(2) { border-right: none; }
          .snap-status-item:nth-child(1), .snap-status-item:nth-child(2) { border-bottom: 1px solid #f0f0f0; }
          .snap-cards-inner { grid-template-columns: 1fr !important; }
          .snap-card { border-right: none !important; border-bottom: 1px solid #e0e0e0; }
          .snap-card:last-child { border-bottom: none; }
          .snap-card.dark { border-bottom-color: #333; }
          .add-popup-box { margin: 0 0.75rem; padding: 1.25rem; }
          .history-hd { flex-direction: row; align-items: center; }
          .back-btn { font-size: 12px; padding: 5px 10px; }
          .detail-topbar-title { font-size: 20px !important; }
        }
      `}</style>

      <div className="dash">
        <div className="dash-inner">

          {/* Scanning modal */}
          {scanningComp && (() => {
            const steps = [
              "Taking screenshot of pricing page",
              "Locating pricing section",
              "Reading plans & prices",
            ];
            const progress = [40, 80, 100];
            return (
              <div className="popup-overlay">
                <div className="scan-modal">
                  <p className="scan-modal-title">Scanning {scanningComp.label}<span className="scan-dots"><span>.</span><span>.</span><span>.</span></span></p>
                  <p className="scan-step-label">Step {scanStep + 1} of 3</p>
                  <p className="scan-step-text">{steps[scanStep]}</p>
                  <div className="scan-progress-track">
                    <div className="scan-progress-bar" style={{ width: `${progress[scanStep]}%` }}></div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Delete popup */}
          {deleteId && (
            <div className="popup-overlay" onClick={() => setDeleteId(null)}>
              <div className="popup-box" onClick={(e) => e.stopPropagation()}>
                <p className="popup-title">Remove Competitor</p>
                <p className="popup-sub">Are you sure you want to remove <strong>{deleteLabel}</strong>? This will delete all snapshots and change history.</p>
                <div className="popup-btns">
                  <button className="popup-cancel" onClick={() => setDeleteId(null)}>Cancel</button>
                  <button className="popup-confirm" onClick={() => deleteCompetitor(deleteId)}>Remove</button>
                </div>
              </div>
            </div>
          )}

          {/* Add Competitor Modal */}
          {showForm && (
            <div className="popup-overlay" onClick={() => { setShowForm(false); setUrl(""); setLabel(""); }}>
              <div className="add-popup-box" onClick={(e) => e.stopPropagation()}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.1rem" }}>
                  <div>
                    <p className="popup-title" style={{ marginBottom: 2 }}>Add Competitor</p>
                  </div>
                  <button
                    onClick={() => { setShowForm(false); setUrl(""); setLabel(""); }}
                    style={{ background: "none", border: "none", borderRadius: 7, cursor: "pointer", width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", color: "#888", flexShrink: 0, transition: "all 0.15s ease" }}                    onMouseEnter={e => { e.currentTarget.style.background = "#f5f5f5"; e.currentTarget.style.color = "#111"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#aaa"; }}
                  >
                    <i className="ti ti-x" style={{ fontSize: 18 }}></i>
                  </button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: "1.25rem" }}>
                  <div>
                    <p className="add-popup-label">Label</p>
                    <input type="text" placeholder="e.g. Ahrefs" value={label} onChange={(e) => setLabel(e.target.value)} className="add-popup-inp" autoFocus />
                  </div>
                  <div>
<p className="add-popup-label">Pricing Page URL</p>
          <input
            type="url"
            placeholder="https://competitor.com/pricing"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setUrlError(""); }}
            className="add-popup-inp"
            style={{ border: `1px solid ${urlError ? "#ef4444" : "#e5e5e5"}` }}
            onKeyDown={(e) => { if (e.key === "Enter" && url) addCompetitor(); }}
          />
          {urlError && <p style={{ fontSize: 11, color: "#ef4444", marginTop: 4 }}>{urlError}</p>}
                  </div>
                </div>
                <div className="popup-btns">
                  <button className="popup-cancel" onClick={() => { setShowForm(false); setUrl(""); setLabel(""); setUrlError(""); }}>Cancel</button>
                  <button className="popup-confirm" onClick={addCompetitor} disabled={adding || !url} style={{ opacity: adding || !url ? 0.5 : 1, cursor: adding || !url ? "not-allowed" : "pointer", background: "#7E57C2" }}>
                    {adding ? "Adding..." : "Start Tracking"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Global Toast */}
          {toast && (
            <div style={{
              position: "fixed", bottom: 28, right: 28,
              background: toast.type === "success" ? "#111" : "#ef4444",
              borderRadius: 8, padding: "10px 14px",
              display: "flex", alignItems: "center", gap: 10,
              zIndex: 999, animation: "slideUp 0.2s ease",
              minWidth: 220, boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
            }}>
              <i className={`ti ${toast.type === "success" ? "ti-circle-check" : "ti-alert-circle"}`}
                style={{ fontSize: 16, color: "#fff" }}></i>
              <span style={{ fontSize: 13, color: "#fff", fontWeight: 500, flex: 1 }}>{toast.text}</span>
              <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.3)" }}></div>
              <button onClick={() => setToast(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.8)", padding: 0, display: "flex", alignItems: "center" }}>
                <i className="ti ti-x" style={{ fontSize: 14 }}></i>
              </button>
            </div>
          )}

          {/* ── VIEW ALL CHANGES ── */}
          {viewAllChanges ? (
            <div>
              <button onClick={() => setViewAllChanges(false)} className="back-btn">
                <i className="ti ti-arrow-left"></i> Back to Dashboard
              </button>
              <div className="topbar">
                <div><h1>All Changes</h1><p>Complete change history across all competitors</p></div>
              </div>
<div className="section">
                <div className="section-hd">
                  <span className="section-hd-title">All Changes</span>
                  <span className="section-hd-count">{recentChanges.length} total</span>
                </div>
                {recentChanges.length === 0 ? (
                  <div className="empty"><p>No changes detected yet</p><small>Changes appear after the first scan completes</small></div>
                ) : (() => {
                  const sorted = [...recentChanges];
                  const start = (changesPage - 1) * PER_PAGE;
                  const visible = sorted.slice(start, start + PER_PAGE);
                  return (
                    <>
                      {visible.map((item) => {
                        const bs = badgeStyle(item.type);
                        const isSingleValue = (item.old_value && !item.new_value) || (!item.old_value && item.new_value);
                        const isFeature = item.type === 'feature';
                        const featureValue = isFeature ? (item.new_value || item.old_value) : null;
                        const featureItems = featureValue ? featureValue.split(', ').filter(Boolean) : [];
                        return (
                          <div key={item.id} className="rc-item" style={{ alignItems: 'flex-start', paddingBottom: isFeature && featureItems.length > 1 ? 14 : undefined }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: 13, fontWeight: 600, color: "#333", marginBottom: 6, letterSpacing: "-0.1px" }}>{item.summary}</p>
                              {isFeature && featureItems.length > 0 ? (
                                featureItems.length === 1 ? (
                                  <div className="rc-ba">
                                    <span className={isSingleValue ? "rc-new-added" : "rc-new"}>{featureItems[0]}</span>
                                  </div>
                                ) : (
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 16px', marginTop: 8, marginBottom: 2 }}>
                                    {featureItems.map((f, fi) => (
                                      <div key={fi} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12, color: '#555', lineHeight: 1.5 }}>
                                        <span style={{ color: '#aaa', flexShrink: 0, marginTop: 1 }}>•</span>
                                        <span>{f}</span>
                                      </div>
                                    ))}
                                  </div>
                                )
                              ) : (
                                <div className="rc-ba">
                                  {item.old_value && <span className="rc-old">{cleanPrice(item.old_value)}</span>}
                                  {item.old_value && item.new_value && <span className="rc-arr">→</span>}
                                  {item.new_value && <span className={isSingleValue ? "rc-new-added" : "rc-new"}>{cleanPrice(item.new_value)}</span>}
                                </div>
                              )}
                            </div>
                            <div className="rc-right" style={{ flexShrink: 0 }}>
                              <span className="rc-badge" style={{ background: bs.bg, color: bs.color }}>{item.type}</span>
                              <span className="rc-time">{timeAgo(item.created_at)}</span>
                            </div>
                          </div>
                        );
                      })}
                      <Pagination current={changesPage} total={sorted.length} onChange={(p) => setChangesPage(p)} />
                    </>
                  );
                })()}
              </div>
            </div>

          ) : viewAllCompetitors ? (
            <div>
              <button onClick={() => setViewAllCompetitors(false)} className="back-btn">
                <i className="ti ti-arrow-left"></i> Back to Dashboard
              </button>
              <div className="topbar">
                <div><h1>All Competitors</h1><p>Complete list of monitored competitors</p></div>
                <button onClick={() => setShowForm(!showForm)} className="btn-pri">
                  <i className="ti ti-plus"></i> Add Competitor
                </button>
              </div>
              <div className="section">
                <div className="section-hd">
                  <span className="section-hd-title">Monitored Competitors</span>
                  <span className="section-hd-count">{competitors.length} total</span>
                </div>
                {(() => {
                  const start = (competitorsPage - 1) * PER_PAGE;
                  const visible = competitors.slice(start, start + PER_PAGE);
                  return (
                    <>
                      {visible.map((comp, idx) => (
                        <div key={comp.id} className="comp-row">
                          <div className="view-all-comp-main">
                            <div className="comp-left">
                              <span className="comp-num">{start + idx + 1}.</span>
                              <div className="comp-info">
                                <a href={comp.url} target="_blank" rel="noopener noreferrer" className="comp-name-link">
                                  {comp.label || comp.url}<i className="ti ti-arrow-up-right"></i>
                                </a>
                                <button onClick={() => { setViewAllCompetitors(false); openDetail(comp); }} className="view-btn">
                                  View details <i className="ti ti-chevron-right"></i>
                                </button>
                              </div>
                            </div>
                            <div className="comp-right">
                              <span className="badge-active">{comp.status}</span>
                              <button onClick={() => { setDeleteId(comp.id); setDeleteLabel(comp.label || comp.url); }} className="del-btn">
                                <i className="ti ti-trash"></i>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                      <Pagination current={competitorsPage} total={competitors.length} onChange={(p) => setCompetitorsPage(p)} />
                    </>
                  );
                })()}
              </div>
            </div>

          ) : view === "detail" && selectedComp ? (
            <div>
              <button onClick={() => { setView("dashboard"); setSelectedComp(null); setSnapshot(null); setScanMsg(null); }} className="back-btn">
                <i className="ti ti-arrow-left"></i> Back to Dashboard
              </button>

              {/* Detail topbar */}
              <div className="topbar" style={{ alignItems: "flex-start", paddingTop: 4 }}>
                <div>
                  <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.5px" }}>{selectedComp.label || selectedComp.url}</h1>
                  <a href={selectedComp.url} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 12, color: "#999", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 3, marginTop: 4 }}>
                    {selectedComp.url}
                    <i className="ti ti-arrow-up-right" style={{ fontSize: 10 }}></i>
                  </a>
                </div>
                {/* Run Scan button */}
                <button
                  onClick={() => runScan(selectedComp.id)}
                  disabled={scanning}
                  className="btn-sec"
                  style={{ opacity: scanning ? 0.6 : 1, flexShrink: 0, marginTop: 14 }}
                >
                  <i className={`ti ti-refresh ${scanning ? "spinning" : ""}`}></i>
                  {scanning ? "Scanning..." : "Run Scan"}
                </button>
              </div>



              {/* FIX 1: 4 stat cards in a single horizontal row */}
              <div className="detail-stat-row">
                {[
                  { label: "Status", val: selectedComp.status, color: "#2e7d32" },
                  { label: "Total Changes", val: String(detailChanges.length), color: undefined },
                  { label: "Last Scan", val: snapshot ? formatDate(snapshot.created_at) : "No scan yet", color: undefined },
                  { label: "Email Alerts", val: "Enabled", color: "#2e7d32" },
                ].map(item => (
                  <div key={item.label} className="detail-stat">
                    <p className="detail-stat-label">{item.label}</p>
                    <p className="detail-stat-val" style={item.color ? { color: item.color } : {}}>{item.val}</p>
                  </div>
                ))}
              </div>

              {/* FIX 3: Snapshot box — compact empty state */}
              {snapshot ? (
                <div className="snapshot-box">
                  {/* Header */}
<div className="snap-header">
  <p className="snap-title">Latest Snapshot</p>
</div>


                  {/* Plan cards — prefer Claude's planData (accurate, bundled),
                      fall back to the old separate arrays only if absent */}
                  {(snapshot.data.planData && snapshot.data.planData.length > 0) ? (() => {
                    const planData = snapshot.data.planData!;
                    const count = planData.length;

                    const darkIndex = count === 1 ? 0
                      : count === 2 ? 1
                      : count === 3 ? 1
                      : 1;

                    // Split into rows of max 4
                    const firstRow = planData.slice(0, 4);
                    const secondRow = planData.slice(4);

                    const rowCols = (rowPlans: typeof planData) => {
                      const n = rowPlans.length;
                      return n === 1 ? '1fr' : n === 2 ? '1fr 1fr' : n === 3 ? 'repeat(3, 1fr)' : '1fr 1fr 1fr 1fr';
                    };

                    const renderCard = (plan: PlanData, i: number, globalIndex: number) => {
                      const isDark = globalIndex === darkIndex;
                      const d = isDark ? "dark" : "";
                      const shownPrice = plan.priceMonthly || plan.priceYearly || plan.price;
                      return (
                        <div key={globalIndex} className={`snap-card ${d}`}>
                          <p className={`snap-card-name ${d}`}>{plan.name}</p>
                          {shownPrice ? (
                            <p className={`snap-card-price ${d}`}>{cleanPrice(shownPrice)}</p>
                          ) : (
                            <p className={`snap-card-price ${d}`} style={{ opacity: 0.2 }}>—</p>
                          )}
                          <div className={`snap-card-divider ${d}`}></div>
                          {plan.features?.length > 0 && (
                            <div className="snap-card-features">
                              {plan.features.map((f, fi) => (
                                <div key={fi} className="snap-card-feature">
                                  <i className={`ti ti-check snap-card-check ${d}`}></i>
                                  <span className={`snap-card-feature-text ${d}`}>{f}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    };

                    return (
                      <div className="snap-cards-grid">
                        <div className="snap-cards-inner" style={{ gridTemplateColumns: rowCols(firstRow) }}>
                          {firstRow.map((plan, i) => renderCard(plan, i, i))}
                        </div>
                        {secondRow.length > 0 && (
                          <div className="snap-cards-inner" style={{ gridTemplateColumns: rowCols(secondRow), borderTop: '1px solid #e0e0e0' }}>
                            {secondRow.map((plan, i) => renderCard(plan, i, i + 4))}
                          </div>
                        )}
                      </div>
                    );
                  })() : snapshot.data.plans?.length > 0 ? (() => {
                    const plans = snapshot.data.plans;
                    const count = plans.length;
                    const yearlyPrices = snapshot.data.yearlyPrices || [];
                    const monthlyPrices = snapshot.data.monthlyPrices || [];
                    const activePrices = (snapAnnual && yearlyPrices.length > 0)
                      ? yearlyPrices
                      : (monthlyPrices.length > 0)
                        ? monthlyPrices
                        : (snapshot.data.prices || []);

                    const darkIndex = count === 1 ? 0 : count === 2 ? 1 : 1;
                    const featuresPerPlan = Math.ceil((snapshot.data.features?.length || 0) / count);

                    const firstRow = plans.slice(0, 4);
                    const secondRow = plans.slice(4);

                    const rowCols = (n: number) =>
                      n === 1 ? '1fr' : n === 2 ? '1fr 1fr' : n === 3 ? 'repeat(3, 1fr)' : '1fr 1fr 1fr 1fr';

                    const renderLegacyCard = (plan: string, i: number) => {
                      const isDark = i === darkIndex;
                      const d = isDark ? "dark" : "";
                      const planPrice = activePrices?.[i] || null;
                      const planFeatures = snapshot.data.features?.slice(i * featuresPerPlan, (i + 1) * featuresPerPlan) || [];
                      return (
                        <div key={i} className={`snap-card ${d}`}>
                          <p className={`snap-card-name ${d}`}>{plan}</p>
                          {planPrice ? (
                            <>
                              <p className={`snap-card-price ${d}`}>{cleanPrice(planPrice)}</p>
                              <p className={`snap-card-price-sub ${d}`}>per month</p>
                            </>
                          ) : (
                            <p className={`snap-card-price-sub ${d}`} style={{ marginBottom: 14 }}>Price not detected</p>
                          )}
                          <div className={`snap-card-divider ${d}`}></div>
                          {planFeatures.length > 0 && (
                            <div className="snap-card-features">
                              {planFeatures.map((f: string, fi: number) => (
                                <div key={fi} className="snap-card-feature">
                                  <i className={`ti ti-check snap-card-check ${d}`}></i>
                                  <span className={`snap-card-feature-text ${d}`}>{f}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    };

                    return (
                      <div className="snap-cards-grid">
                        <div className="snap-cards-inner" style={{ gridTemplateColumns: rowCols(firstRow.length) }}>
                          {firstRow.map((plan, i) => renderLegacyCard(plan, i))}
                        </div>
                        {secondRow.length > 0 && (
                          <div className="snap-cards-inner" style={{ gridTemplateColumns: rowCols(secondRow.length), borderTop: '1px solid #e0e0e0' }}>
                            {secondRow.map((plan, i) => renderLegacyCard(plan, i + 4))}
                          </div>
                        )}
                      </div>
                    );
                  })() : (
                    <div className="snap-fallback">
                      {snapshot.data.prices?.length > 0 && (
                        <div style={{ marginBottom: 10 }}>
                          <p className="snap-label" style={{ marginBottom: 6 }}>Detected Prices</p>
                          <div className="snap-fallback-prices">
                            {snapshot.data.prices.map((p, i) => <span key={i} className="snap-fallback-price">{p}</span>)}
                          </div>
                        </div>
                      )}
                      {snapshot.data.features?.length > 0 && (
                        <div>
                          <p className="snap-label" style={{ marginBottom: 6 }}>Detected Features</p>
                          <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 4 }}>
                            {snapshot.data.features.slice(0, 6).map((f, i) => (
                              <div key={i} className="snap-card-feature">
                                <i className="ti ti-check snap-card-check"></i>
                                <span className="snap-card-feature-text">{f}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              ) : (
                /* FIX 3: compact no-snapshot state */
                <div style={{ border: "1px solid #e8e8e8", borderRadius: 10, padding: "1rem 1.1rem", marginBottom: "1.1rem", display: "flex", alignItems: "center", gap: 12, background: "#f5f5f5" }}>
                  <i className="ti ti-camera-off" style={{ fontSize: 18, color: "#ccc", flexShrink: 0 }}></i>
                  <div>
                    <p style={{ fontSize: 13, color: "#666", fontWeight: 600 }}>No snapshot yet</p>
                    <p style={{ fontSize: 12, color: "#aaa", marginTop: 3 }}>Click Run Scan to capture the first snapshot</p>
                  </div>
                </div>
              )}

              {/* Change History */}
              {detailChanges.length === 0 ? (
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "1rem 1.1rem", border: "1px solid #e8e8e8", borderRadius: 10, background: "#f5f5f5" }}>
                  <i className="ti ti-git-compare" style={{ fontSize: 18, color: "#ccc", flexShrink: 0 }}></i>
                  <div>
                    <p style={{ fontSize: 13, color: "#666", fontWeight: 600 }}>No changes detected yet</p>
                    <p style={{ fontSize: 12, color: "#aaa", marginTop: 3 }}>Changes appear after multiple scans</p>
                  </div>
                </div>
              ) : (
                <div className="snapshot-box">
                  <div className="snap-header">
                    <p className="snap-title">Change History</p>
                    <span className="section-hd-count">{detailChanges.length} change{detailChanges.length !== 1 ? "s" : ""}</span>
                  </div>
                  {(() => {
                    const start = (detailChangesPage - 1) * PER_PAGE;
                    const visible = detailChanges.slice(start, start + PER_PAGE);
                    return (
                      <>
                        {visible.map((change) => {
                          const bs = badgeStyle(change.type);
                          const isSingleValue = (change.old_value && !change.new_value) || (!change.old_value && change.new_value);
                          const isFeature = change.type === 'feature';
                          const featureValue = isFeature ? (change.new_value || change.old_value) : null;
                          const featureItems = featureValue ? featureValue.split(', ').filter(Boolean) : [];
                          return (
                            <div key={change.id} className="rc-item" style={{ alignItems: 'flex-start', paddingBottom: isFeature && featureItems.length > 0 ? 14 : undefined }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: 13, fontWeight: 600, color: "#333", marginBottom: 6, letterSpacing: "-0.1px" }}>{change.summary}</p>
                                {isFeature && featureItems.length > 0 ? (
                                  featureItems.length === 1 ? (
                                    <div className="rc-ba">
                                      <span className={isSingleValue ? "rc-new-added" : "rc-new"}>{featureItems[0]}</span>
                                    </div>
                                  ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 16px', marginTop: 8, marginBottom: 2 }}>
                                      {featureItems.map((f, fi) => (
                                        <div key={fi} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12, color: '#555', lineHeight: 1.5 }}>
                                          <span style={{ color: '#aaa', flexShrink: 0, marginTop: 1 }}>•</span>
                                          <span>{f}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )
                                ) : (
                                  <div className="rc-ba">
                                    {change.old_value && <span className="rc-old">{cleanPrice(change.old_value)}</span>}
                                    {change.old_value && change.new_value && <span className="rc-arr">→</span>}
                                    {change.new_value && <span className={isSingleValue ? "rc-new-added" : "rc-new"}>{cleanPrice(change.new_value)}</span>}
                                  </div>
                                )}
                              </div>
                              <div className="rc-right" style={{ flexShrink: 0 }}>
                                <span className="rc-badge" style={{ background: bs.bg, color: bs.color }}>{change.type}</span>
                                <span className="rc-time">{timeAgo(change.created_at)}</span>
                              </div>
                            </div>
                          );
                        })}
                        <Pagination current={detailChangesPage} total={detailChanges.length} onChange={(p) => setDetailChangesPage(p)} />
                      </>
                    );
                  })()}
                </div>
              )}
            </div>

          ) : (
            /* ── DASHBOARD VIEW ── */
            <div>
              <div className="topbar">
                <div>
                  <h1>Dashboard</h1>
                  <p>Monitor competitor pricing in real time</p>
                </div>
                <div className="btn-row">
                  <button onClick={handleRefresh} disabled={refreshing} className="btn-sec">
                    <i className={`ti ti-refresh ${refreshing ? "spinning" : ""}`}></i>
                    {refreshing ? "Refreshing..." : "Refresh"}
                  </button>
                  <button onClick={() => setShowForm(!showForm)} className="btn-pri">
                    <i className="ti ti-plus"></i> Add Competitor
                  </button>
                </div>
              </div>



              <div className="cards">
                {[
                  { label: "Tracked Competitors", value: competitors.length, icon: "ti-chart-bar", small: false },
                  { label: "Changes Detected", value: changes.length, icon: "ti-git-compare", small: false },
                  { label: "Last Scan", value: lastScanTime(), icon: "ti-clock", small: true },
                ].map((card) => (
                  <div key={card.label} className="card">
                    <div className="card-icon"><i className={`ti ${card.icon}`}></i></div>
                    <p className="card-label">{card.label}</p>
                    {refreshing ? (
                      <div className="dots-loader"><span></span><span></span><span></span></div>
                    ) : (
                      <p className={card.small ? "card-val-sm" : "card-val"}>{card.value}</p>
                    )}
                  </div>
                ))}
              </div>

              <div className="two-col">
                {/* Recent Changes */}
                <div className="section" style={{ display: "flex", flexDirection: "column" }}>
                  <div className="section-hd">
                    <span className="section-hd-title">Recent Changes</span>
                  </div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                    {recentChanges.length === 0 ? (
                      <div className="empty" style={{ flex: 1 }}>
                        <i className="ti ti-git-compare" style={{ fontSize: 22, color: "#ddd", display: "block", marginBottom: 8 }}></i>
                        <p>No changes detected yet</p>
                        <small>Changes appear after the first scan completes</small>
                      </div>
) : (
                      <>
                        {recentChanges.slice(0, 3).map((item) => {
                          const bs = badgeStyle(item.type);
                          const name = getCompName(item.competitor_id);
                          const isSingleValue = (item.old_value && !item.new_value) || (!item.old_value && item.new_value);
                          const truncate = (v: string | null) => v && v.length > 28 ? v.slice(0, 25).trimEnd() + '...' : v;
                          return (
                            <div key={item.id} className="rc-item">
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: 13, fontWeight: 600, color: "#111", marginBottom: 3, letterSpacing: "-0.1px" }}>{name}</p>
                                <p style={{ fontSize: 12, color: "#666", lineHeight: 1.45 }}>{item.summary}</p>
                                <div className="rc-ba">
                                  {item.old_value && <span className="rc-old">{truncate(cleanPrice(item.old_value))}</span>}
                                  {item.old_value && item.new_value && <span className="rc-arr">→</span>}
                                  {item.new_value && <span className={isSingleValue ? "rc-new-added" : "rc-new"}>{truncate(cleanPrice(item.new_value))}</span>}
                                </div>
                              </div>
                              <div className="rc-right">
                                <span className="rc-badge" style={{ background: bs.bg, color: bs.color }}>{item.type}</span>
                                <span className="rc-time">{timeAgo(item.created_at)}</span>
                              </div>
                            </div>
                          );
                        })}
{recentChanges.length > 0 && (
  <div className="view-all-row">
    <button className="view-all-btn" onClick={() => { setViewAllChanges(true); window.scrollTo(0, 0); }}>
      View all {recentChanges.length} changes <i className="ti ti-arrow-right"></i>
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Monitored Competitors */}
                <div className="section">
                  <div className="section-hd">
                    <span className="section-hd-title">Monitored Competitors</span>
                  </div>
                  <div className={`comp-list ${refreshing || loading ? "loading" : ""}`}>
                    {(refreshing || loading) ? (
                      <div style={{ padding: "2rem", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                        <div className="dots-loader"><span></span><span></span><span></span></div>
                        <p style={{ fontSize: 12, color: "#aaa", marginTop: 4 }}>Checking for updates</p>
                      </div>
                    ) : competitors.length === 0 ? (
                      <div className="empty">
                        <i className="ti ti-building-store" style={{ fontSize: 22, color: "#ddd", display: "block", marginBottom: 8 }}></i>
                        <p>No competitors yet</p>
                        <small>Click Add Competitor to get started</small>
                      </div>
                    ) : (
<>
                        {competitors.slice(0, 3).map((comp, idx) => (
                          <div key={comp.id} className="comp-row">
                            <div className="comp-main">
                              <div className="comp-left">
                                <span className="comp-num">{idx + 1}.</span>
                                <div className="comp-info">
                                  <a href={comp.url} target="_blank" rel="noopener noreferrer" className="comp-name-link">
                                    {comp.label || comp.url}<i className="ti ti-arrow-up-right"></i>
                                  </a>
                                  <button onClick={() => openDetail(comp)} className="view-btn">
                                    View details <i className="ti ti-chevron-right"></i>
                                  </button>
                                </div>
                              </div>
                              <div className="comp-right">
                                <span className="badge-active">{comp.status}</span>
                                <button onClick={() => { setDeleteId(comp.id); setDeleteLabel(comp.label || comp.url); }} className="del-btn">
                                  <i className="ti ti-trash"></i>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                        {competitors.length >= 3 && (
                          <div className="view-all-row">
                            <button className="view-all-btn" onClick={() => { setViewAllCompetitors(true); window.scrollTo(0, 0); }}>
                              View all {competitors.length} competitors <i className="ti ti-arrow-right"></i>
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="email-bar">
                <div className="email-left">
                  <div className="email-icon"><i className="ti ti-mail"></i></div>
                  <div>
                    <p className="email-label">Email Notifications</p>
                    <p className="email-sub">Alerts sent automatically when changes are detected</p>
                  </div>
                </div>
                <span className="email-badge">Enabled</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
