import Image from "next/image";
import Link from "next/link";

export default function Header() {
  return (
    <header style={{ backgroundColor: "#FFFFFF", borderBottom: "1px solid #f0f0f0" }} className="sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="Cliketa" width={32} height={32} className="object-contain" />
          <span className="font-semibold text-lg text-black tracking-tight">Cliketa</span>
        </Link>
        <nav className="flex items-center gap-6">
          <Link href="/" className="text-sm font-medium text-black hover:text-[#7E57C2] transition-colors">
            Dashboard
          </Link>
          <button
            style={{ backgroundColor: "#7E57C2" }}
            className="text-sm font-medium text-white px-4 py-2 rounded-lg"
          >
            + Add Competitor
          </button>
        </nav>
      </div>
    </header>
  );
}