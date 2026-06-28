export default function Footer() {
  return (
    <footer style={{
      borderTop: "1px solid #f0f0f0",
      padding: "28px 48px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      textAlign: "center",
      fontFamily: "'Inter', sans-serif",
    }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>
        Clikwatch <span style={{ color: "#aaa", fontWeight: 400 }}>by Cliketa</span>
      </p>
      <p style={{ fontSize: 12, color: "#aaa" }}>© 2026 Cliketa · All rights reserved</p>
    </footer>
  );
}