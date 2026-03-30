"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { STORAGE_KEY } from "@/components/EmailGateModal";
import { ThemeToggle } from "@/components/ThemeProvider";

const RISK_DOMAINS = [
  {
    label: "Oxygen Transfer",
    desc: "kLa achievability at scale",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
    ),
  },
  {
    label: "Mixing",
    desc: "Substrate gradients & pH control",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
        <path d="M12 3v18M3 12c3-3 6-3 9 0s6 3 9 0" />
      </svg>
    ),
  },
  {
    label: "Shear Stress",
    desc: "Cell damage from impeller tip speed",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
  },
  {
    label: "CO\u2082 Accumulation",
    desc: "Dissolved CO\u2082 inhibition at depth",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
        <path d="M8 12a4 4 0 108 0 4 4 0 00-8 0zM3 12h2M19 12h2M12 3v2M12 19v2" />
      </svg>
    ),
  },
  {
    label: "Heat Removal",
    desc: "Metabolic heat vs cooling capacity",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
        <path d="M12 9v6M12 21a9 9 0 110-18 9 9 0 010 18z" />
        <path d="M12 3v3M12 18v3" />
      </svg>
    ),
  },
];

export default function LandingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem(STORAGE_KEY));
  }, []);

  const handleAssessClick = () => {
    router.push("/assess");
  };

  return (
    <>
      {/* Mobile message */}
      <div className="md:hidden min-h-screen flex items-center justify-center bg-surface px-8">
        <p className="text-silver-300 text-center text-lg leading-relaxed">
          This tool is designed for desktop use. Visit on your laptop or desktop
          for the full experience.
        </p>
      </div>

      {/* Desktop landing */}
      <main className="hidden md:flex min-h-screen flex-col bg-surface relative overflow-hidden">
        {/* Ambient glow orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[30%] w-[600px] h-[600px] rounded-full bg-accent/[0.08] blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[20%] w-[400px] h-[400px] rounded-full bg-accent-warm/[0.06] blur-[100px]" />
          <div className="absolute top-[40%] left-[-10%] w-[300px] h-[300px] rounded-full bg-accent-cool/[0.04] blur-[80px]" />
        </div>

        {/* Header */}
        <header className="relative z-10 px-10 py-6 flex items-center justify-between">
          <span className="text-xl font-semibold tracking-tight text-silver-100">
            Lemnisca
          </span>
          <div className="flex items-center gap-3">
            {isLoggedIn && (
              <Link
                href="/dashboard"
                className="text-sm text-silver-500 hover:text-accent transition-colors"
              >
                Dashboard
              </Link>
            )}
            <ThemeToggle />
          </div>
        </header>

        {/* Hero */}
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-8 pb-24">
          <div className="animate-fade-in">
            <p className="text-center text-[11px] font-medium uppercase tracking-[0.2em] text-silver-500 mb-6">
              Fermentation Scale-Up Risk Predictor
            </p>
            <h1 className="max-w-3xl text-center text-5xl font-serif leading-[1.15] text-silver-50">
              See where your fermentation process
              is vulnerable at scale.
            </h1>
            <p className="mt-8 max-w-2xl mx-auto text-center text-base leading-relaxed text-silver-300">
              Enter your lab-scale process parameters. Get a structured
              engineering risk assessment across oxygen transfer, mixing, shear,
              CO&#x2082; accumulation, and heat removal &mdash; with full calculation
              transparency.
            </p>
          </div>

          {/* CTA */}
          <div className="mt-12 flex flex-col items-center gap-4 animate-slide-up" style={{ animationDelay: "0.2s", animationFillMode: "both" }}>
            <button
              onClick={handleAssessClick}
              className="btn-primary px-10 py-3.5 text-sm font-medium relative z-10"
            >
              <span className="relative z-10">Assess my process</span>
            </button>
            <Link
              href="/example"
              className="text-sm text-silver-400 hover:text-silver-200 underline underline-offset-4 decoration-silver-600 hover:decoration-silver-400 transition-colors duration-200"
            >
              See an example assessment
            </Link>
          </div>

          {/* Domain pills */}
          <div className="mt-20 grid grid-cols-5 gap-3 max-w-4xl w-full animate-slide-up" style={{ animationDelay: "0.4s", animationFillMode: "both" }}>
            {RISK_DOMAINS.map((d) => (
              <div
                key={d.label}
                className="glass-panel-sm px-4 py-5 flex flex-col items-center text-center gap-2.5 group hover:border-[var(--btn-primary-border)] transition-all duration-300"
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-accent/[0.08] text-silver-300 group-hover:text-silver-100 group-hover:bg-accent/[0.14] transition-all duration-300">
                  {d.icon}
                </div>
                <span className="text-xs font-semibold text-silver-100">{d.label}</span>
                <span className="text-[10px] text-silver-400 leading-tight">{d.desc}</span>
              </div>
            ))}
          </div>

          {/* Trust signals */}
          {/* <div className="mt-12 flex items-center gap-6 text-[11px] text-silver-600 animate-slide-up" style={{ animationDelay: "0.6s", animationFillMode: "both" }}>
            <span>van&apos;t Riet &middot; Ruszkowski &middot; Power Number Theory</span>
            <span className="w-px h-3 bg-silver-700" />
            <span>Bacteria &amp; Yeast STR</span>
            <span className="w-px h-3 bg-silver-700" />
            <span>Every assumption visible</span>
          </div> */}
        </div>

        {/* Footer */}
        <footer className="relative z-10 px-10 py-6">
          <div className="glow-line mb-4" />
          <p className="text-center text-[11px] text-silver-500 flex items-center justify-center gap-1.5">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3 opacity-60"><rect x="3" y="8" width="10" height="6" rx="1.5" /><path d="M5 8V5.5a3 3 0 016 0V8" /></svg>
            Your process data is encrypted in transit and at rest, never shared,
            and deletable on demand.
          </p>
        </footer>
      </main>

    </>
  );
}
