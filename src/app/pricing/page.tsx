"use client";
import { useState } from "react";

export default function Pricing() {
  const [annual, setAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const plans = [
    {
      name: "Starter",
      monthly: 29,
      annual: 23,
      desc: "Perfect for solo founders",
      features: ["Track 5 competitors","Daily scans","Email alerts","7 day history","Basic change detection"],
      cta: "Get Started",
      highlight: false,
    },
    {
      name: "Pro",
      monthly: 59,
      annual: 47,
      desc: "For growing teams",
      features: ["Track 20 competitors","Daily scans","Email alerts","30 day history","Advanced detection","Priority support"],
      cta: "Get Pro",
      highlight: true,
    },
    {
      name: "Agency",
      monthly: 99,
      annual: 79,
      desc: "For agencies and power users",
      features: ["Track 50 competitors","Daily scans","Email alerts","90 day history","Advanced detection","Priority support","Custom reports"],
      cta: "Get Agency",
      highlight: false,
    },
  ];

  const faqs = [
    { q: "Can I cancel anytime?", a: "Yes. Cancel anytime and keep full access until your billing period ends." },
    { q: "What counts as one competitor?", a: "Each pricing page URL you add counts as one competitor." },
    { q: "How often does Cliketa scan?", a: "Every 24 hours automatically. You get an email the moment a change is detected." },
    { q: "What changes does Cliketa detect?", a: "Pricing, plans, features, and free trial changes — everything that matters to SaaS founders." },
    { q: "Do you offer refunds?", a: "We don't offer refunds. Please review the plan details carefully before subscribing." },
    { q: "Can I upgrade or downgrade?", a: "Yes, anytime from billing settings. Changes apply at the next billing cycle." },
  ];

  return (
    <>
      <style>{`
        .pricing-wrap { max-width: 900px; margin: 0 auto; padding: 2.5rem 2rem; font-family: 'Inter', sans-serif; }

.plans-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          border: 1px solid #e0e0e0;
          border-radius: 0;
          overflow: hidden;
        }

        .plan-card {
          padding: 1.75rem 1.5rem;
          display: flex;
          flex-direction: column;
          border-right: 1px solid #e0e0e0;
        }
        .plan-card:last-child { border-right: none; }
        .plan-card.dark { background: #111; border-right-color: #333; }

        .plan-name { font-size: 23px; font-weight: 700; color: #111; line-height: 1; }
        .plan-name.dark { color: #fff; }
        .plan-desc { font-size: 13px; color: #888; margin-bottom: 18px; margin-top: 6px; }
        .plan-desc.dark { color: #888; }

        .plan-price { font-size: 32px; font-weight: 700; color: #111; letter-spacing: -1px; line-height: 1; }
        .plan-price.dark { color: #fff; }
        .plan-per { font-size: 12px; color: #999; margin-top: 5px; margin-bottom: 22px; }
        .plan-per.dark { color: #666; }

.plan-btn {
          width: 100%; border-radius: 8px; padding: 10px 0;
          font-size: 14px; font-weight: 500; cursor: pointer;
          font-family: Inter; margin-bottom: 20px;
          transition: all 0.15s ease; border: 1px solid #e0e0e0;
          background: #fff; color: #111;
        }
        .plan-btn:hover { background: #f5f5f5; }
        .plan-btn.dark { background: #fff; color: #111; border: none; }
        .plan-btn.dark:hover { opacity: 0.9; }

        .plan-divider { border-top: 1px solid #e0e0e0; margin-bottom: 20px; }
        .plan-divider.dark { border-top-color: #333; }

        .plan-features { display: flex; flex-direction: column; gap: 11px; }
        .plan-feature { display: flex; align-items: flex-start; gap: 10px; }
        .plan-feature-text { font-size: 13px; color: #444; line-height: 1.4; }
        .plan-feature-text.dark { color: #bbb; }
        .plan-check { font-size: 13px; color: #111; flex-shrink: 0; margin-top: 1px; }
        .plan-check.dark { color: #fff; }

        .plan-name-row {
          display: flex;
          align-items: flex-end;
          margin-bottom: 0;
          gap: 0;
        }

        .popular-badge {
          display: inline-flex;
          align-items: center;
          background: #fff;
          color: #555;
          font-size: 10px;
          font-weight: 500;
          padding: 3px 10px;
          border-radius: 4px;
          border: 1px solid #ddd;
          margin-left: 8px;
          letter-spacing: 0.1px;
          line-height: 1;
          margin-bottom: 4px;
        }
        .popular-badge.dark {
          background: #fff;
          color: #333;
          border-color: #ccc;
        }

        .faq-wrap { padding: 0; }
        .faq-item { border-bottom: 1px solid #ebebeb; }
        .faq-item:last-child { border-bottom: none; }
        .faq-btn { width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 1.1rem 0; background: none; border: none; cursor: pointer; font-family: Inter; text-align: left; gap: 12px; }
        .faq-btn:hover .faq-q { color: #111; }
        .faq-q { font-size: 15px; font-weight: 500; color: #222; transition: color 0.15s; }
        .faq-icon { font-size: 15px; color: #bbb; flex-shrink: 0; transition: transform 0.2s ease; }
        .faq-icon.open { transform: rotate(180deg); color: #888; }
        .faq-answer { font-size: 14px; color: #666; line-height: 1.75; padding-bottom: 1.1rem; animation: fadeDown 0.2s ease; }

        @keyframes fadeDown { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }

        @media (max-width: 768px) {
          .pricing-wrap { padding: 1.5rem 1rem; }
          .plans-grid { grid-template-columns: 1fr; }
          .plan-card { border-right: none; border-bottom: 1px solid #e0e0e0; }
          .plan-card:last-child { border-bottom: none; }
          .plan-card.dark { border-bottom-color: #333; }
          .plan-name { font-size: 20px; }
          .plan-price { font-size: 26px; }
          .faq-q { font-size: 14px; }
          .faq-answer { font-size: 13px; }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          .pricing-wrap { padding: 2rem 1.5rem; }
          .plan-name { font-size: 20px; }
          .plan-price { font-size: 28px; }
        }
      `}</style>

      <div className="pricing-wrap">

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <h1 style={{ fontSize: 26, fontWeight: 600, color: "#111", letterSpacing: "-0.5px", marginBottom: 8 }}>
            Plans that grow with you
          </h1>
          <p style={{ fontSize: 14, color: "#888", marginBottom: 20 }}>
            No hidden fees. No surprises. Cancel anytime.
          </p>

          {/* Toggle */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#f5f5f5", padding: "4px", borderRadius: 8 }}>
            <button
              onClick={() => setAnnual(false)}
              style={{
                padding: "5px 14px", borderRadius: 6, border: "none",
                fontSize: 13, cursor: "pointer", fontFamily: "Inter",
                background: !annual ? "#fff" : "transparent",
                color: !annual ? "#111" : "#888",
                fontWeight: !annual ? 500 : 400,
              }}
            >Monthly</button>
            <button
              onClick={() => setAnnual(true)}
              style={{
                padding: "5px 14px", borderRadius: 6, border: "none",
                fontSize: 13, cursor: "pointer", fontFamily: "Inter",
                background: annual ? "#fff" : "transparent",
                color: annual ? "#111" : "#888",
                fontWeight: annual ? 500 : 400,
                display: "flex", alignItems: "center", gap: 5,
              }}
            >
              Yearly
              <span style={{
                fontSize: 11, color: "#2A78D6",
                fontWeight: 600, whiteSpace: "nowrap",
              }}>· 20% off</span>
            </button>
          </div>
        </div>

        {/* Plans */}
        <div className="plans-grid">
          {plans.map((plan) => {
            const d = plan.highlight ? "dark" : "";
            return (
              <div key={plan.name} className={`plan-card ${d}`}>

                {/* Name + Popular badge — bottom aligned */}
                <div className="plan-name-row">
                  <span className={`plan-name ${d}`}>{plan.name}</span>
                  {plan.highlight && (
                    <span className={`popular-badge ${d}`}>Popular</span>
                  )}
                </div>

                <p className={`plan-desc ${d}`}>{plan.desc}</p>

                {/* Price */}
                <p className={`plan-price ${d}`}>${annual ? plan.annual : plan.monthly}</p>
                <p className={`plan-per ${d}`}>
                  per month{annual ? `, billed $${plan.annual * 12}/year` : ""}
                </p>

                {/* CTA */}
                <button className={`plan-btn ${d}`}>{plan.cta}</button>

                {/* Divider */}
                <div className={`plan-divider ${d}`}></div>

                {/* Features */}
                <div className="plan-features">
                  {plan.features.map((f) => (
                    <div key={f} className="plan-feature">
                      <i className={`ti ti-check plan-check ${d}`}></i>
                      <span className={`plan-feature-text ${d}`}>{f}</span>
                    </div>
                  ))}
                </div>

              </div>
            );
          })}
        </div>

        {/* FAQ Accordion */}
        <div style={{ marginTop: "3rem", borderTop: "1px solid #f0f0f0", paddingTop: "2rem" }}>
          <h2 style={{ fontSize: 16, fontWeight: 500, color: "#111", marginBottom: "1.5rem", textAlign: "center" }}>
            Common questions
          </h2>
          <div className="faq-wrap">
            {faqs.map((item, idx) => (
              <div key={item.q} className="faq-item">
                <button className="faq-btn" onClick={() => setOpenFaq(openFaq === idx ? null : idx)}>
                  <span className="faq-q">{item.q}</span>
                  <i className={`ti ti-chevron-down faq-icon ${openFaq === idx ? "open" : ""}`}></i>
                </button>
                {openFaq === idx && <p className="faq-answer">{item.a}</p>}
              </div>
            ))}
          </div>
        </div>

      </div>
    </>
  );
}