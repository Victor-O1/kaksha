"use client";

import { useState, useEffect, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Theme = "light" | "dark";
type Modal = "login" | "signup" | null;

// ─── Theme tokens ─────────────────────────────────────────────────────────────
const T = {
  light: {
    bg: "#F8F6F1",
    surface: "#FFFFFF",
    surfaceAlt: "#F2EFE9",
    border: "#E4DDD2",
    text: "#1C1814",
    textMuted: "#7A6E65",
    textFaint: "#B0A89E",
    accent: "#C4622D",
    accentAlt: "#2D6AC4",
    pill: "#EDE8E1",
    pillText: "#5C5249",
    navBg: "rgba(248,246,241,0.92)",
    shadow: "0 1px 3px rgba(0,0,0,0.08), 0 8px 32px rgba(0,0,0,0.06)",
    shadowModal: "0 24px 80px rgba(0,0,0,0.16)",
    inputBg: "#F8F6F1",
    inputBorder: "#D8D1C8",
    overlay: "rgba(28,24,20,0.4)",
  },
  dark: {
    bg: "#0E0D0B",
    surface: "#17160F",
    surfaceAlt: "#201F18",
    border: "#2C2A22",
    text: "#F0ECDF",
    textMuted: "#8A8275",
    textFaint: "#4A4840",
    accent: "#E07A42",
    accentAlt: "#4A8AE8",
    pill: "#201F18",
    pillText: "#9A9288",
    navBg: "rgba(14,13,11,0.92)",
    shadow: "0 1px 3px rgba(0,0,0,0.4), 0 8px 32px rgba(0,0,0,0.3)",
    shadowModal: "0 24px 80px rgba(0,0,0,0.6)",
    inputBg: "#0E0D0B",
    inputBorder: "#2C2A22",
    overlay: "rgba(0,0,0,0.6)",
  },
};

// ─── Noise texture SVG ────────────────────────────────────────────────────────
function NoiseBg({ theme }: { theme: Theme }) {
  const t = T[theme];
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        background: t.bg,
      }}
    >
      <svg
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          opacity: theme === "dark" ? 0.035 : 0.025,
        }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <filter id="noise">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.65"
            numOctaves="3"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#noise)" />
      </svg>
      {/* Warm gradient blob */}
      <div
        style={{
          position: "absolute",
          top: "-20vh",
          right: "-10vw",
          width: "60vw",
          height: "60vw",
          borderRadius: "50%",
          background:
            theme === "dark"
              ? "radial-gradient(circle, rgba(224,122,66,0.06) 0%, transparent 70%)"
              : "radial-gradient(circle, rgba(196,98,45,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "10vh",
          left: "-15vw",
          width: "50vw",
          height: "50vw",
          borderRadius: "50%",
          background:
            theme === "dark"
              ? "radial-gradient(circle, rgba(74,138,232,0.05) 0%, transparent 70%)"
              : "radial-gradient(circle, rgba(45,106,196,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar({
  theme,
  onToggle,
  onModal,
}: {
  theme: Theme;
  onToggle: () => void;
  onModal: (m: Modal) => void;
}) {
  const t = T[theme];
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const navLinks = [
    { label: "Tutor", href: "/tutor" },
    { label: "Assignments", href: "/assignments" },
    { label: "Planner", href: "/planner" },
  ];

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 200,
        background: scrolled ? t.navBg : "transparent",
        backdropFilter: scrolled ? "blur(16px) saturate(1.4)" : "none",
        borderBottom: scrolled
          ? `1px solid ${t.border}`
          : "1px solid transparent",
        transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
        padding: "0 5vw",
        height: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 32,
            height: 32,
            background: `linear-gradient(135deg, ${t.accent} 0%, ${t.accentAlt} 100%)`,
            borderRadius: 9,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 15,
            fontWeight: 900,
            color: "#fff",
            fontFamily: "'Playfair Display', Georgia, serif",
            letterSpacing: -0.5,
          }}
        >
          K
        </div>
        <span
          style={{
            fontSize: 17,
            fontWeight: 700,
            color: t.text,
            fontFamily: "'Playfair Display', Georgia, serif",
            letterSpacing: -0.3,
          }}
        >
          Kaksha
        </span>
      </div>

      {/* Nav links */}
      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
        {navLinks.map(({ label, href }) => (
          <a
            key={label}
            href={href}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              color: t.textMuted,
              fontSize: 13,
              fontWeight: 500,
              textDecoration: "none",
              fontFamily: "'DM Sans', system-ui, sans-serif",
              transition: "color 0.2s, background 0.2s",
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLAnchorElement).style.color = t.text;
              (e.target as HTMLAnchorElement).style.background = t.surfaceAlt;
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLAnchorElement).style.color = t.textMuted;
              (e.target as HTMLAnchorElement).style.background = "transparent";
            }}
          >
            {label}
          </a>
        ))}
      </div>

      {/* Right controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {/* Theme toggle */}
        <button
          onClick={onToggle}
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: t.surfaceAlt,
            border: `1px solid ${t.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontSize: 15,
            transition: "all 0.2s",
            color: t.textMuted,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = t.pill)}
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = t.surfaceAlt)
          }
        >
          {theme === "dark" ? "☀" : "◑"}
        </button>

        <button
          onClick={() => onModal("login")}
          style={{
            padding: "7px 16px",
            borderRadius: 9,
            background: "transparent",
            border: `1px solid ${t.border}`,
            color: t.textMuted,
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            fontFamily: "'DM Sans', system-ui, sans-serif",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = t.accent;
            (e.currentTarget as HTMLButtonElement).style.color = t.text;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = t.border;
            (e.currentTarget as HTMLButtonElement).style.color = t.textMuted;
          }}
        >
          Log in
        </button>

        <button
          onClick={() => onModal("signup")}
          style={{
            padding: "7px 18px",
            borderRadius: 9,
            background: t.accent,
            border: "none",
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "'DM Sans', system-ui, sans-serif",
            transition: "all 0.2s",
            boxShadow: `0 2px 12px ${t.accent}40`,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = "0.88";
            (e.currentTarget as HTMLButtonElement).style.transform =
              "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = "1";
            (e.currentTarget as HTMLButtonElement).style.transform = "";
          }}
        >
          Get started
        </button>
      </div>
    </nav>
  );
}

// ─── Auth Modal ───────────────────────────────────────────────────────────────
function AuthModal({
  modal,
  theme,
  onClose,
}: {
  modal: Modal;
  theme: Theme;
  onClose: () => void;
}) {
  const t = T[theme];
  const [tab, setTab] = useState<"login" | "signup">(modal || "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [focusField, setFocusField] = useState<string | null>(null);

  useEffect(() => {
    if (modal) setTab(modal);
  }, [modal]);
  if (!modal) return null;

  const inputStyle = (field: string) => ({
    width: "100%",
    padding: "11px 14px",
    borderRadius: 10,
    background: t.inputBg,
    border: `1.5px solid ${focusField === field ? t.accent : t.inputBorder}`,
    color: t.text,
    fontSize: 14,
    fontFamily: "'DM Sans', system-ui, sans-serif",
    outline: "none",
    boxSizing: "border-box" as const,
    transition: "border-color 0.2s",
  });

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: t.overlay,
        backdropFilter: "blur(4px)",
        animation: "fadeIn 0.2s ease",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: t.surface,
          borderRadius: 20,
          border: `1px solid ${t.border}`,
          boxShadow: t.shadowModal,
          width: "100%",
          maxWidth: 400,
          padding: "40px 40px 36px",
          animation: "slideUp 0.25s cubic-bezier(0.34,1.56,0.64,1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            style={{
              width: 44,
              height: 44,
              margin: "0 auto 12px",
              background: `linear-gradient(135deg, ${t.accent} 0%, ${t.accentAlt} 100%)`,
              borderRadius: 13,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              fontWeight: 900,
              color: "#fff",
              fontFamily: "'Playfair Display', Georgia, serif",
            }}
          >
            K
          </div>
          <h2
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 700,
              color: t.text,
              fontFamily: "'Playfair Display', Georgia, serif",
              letterSpacing: -0.4,
            }}
          >
            {tab === "login" ? "Welcome back" : "Start learning"}
          </h2>
          <p
            style={{
              margin: "6px 0 0",
              fontSize: 13,
              color: t.textMuted,
              fontFamily: "'DM Sans', system-ui, sans-serif",
            }}
          >
            {tab === "login"
              ? "Sign in to your Kaksha account"
              : "Create your free account today"}
          </p>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            background: t.surfaceAlt,
            borderRadius: 11,
            padding: 3,
            marginBottom: 24,
          }}
        >
          {(["login", "signup"] as const).map((t_) => (
            <button
              key={t_}
              onClick={() => setTab(t_)}
              style={{
                flex: 1,
                padding: "8px 0",
                borderRadius: 9,
                border: "none",
                cursor: "pointer",
                background: tab === t_ ? t.surface : "transparent",
                color: tab === t_ ? t.text : t.textMuted,
                fontSize: 13,
                fontWeight: tab === t_ ? 600 : 400,
                fontFamily: "'DM Sans', system-ui, sans-serif",
                boxShadow: tab === t_ ? `0 1px 4px ${t.border}` : "none",
                transition: "all 0.2s",
              }}
            >
              {t_ === "login" ? "Log in" : "Sign up"}
            </button>
          ))}
        </div>

        {/* Fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {tab === "signup" && (
            <input
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={() => setFocusField("name")}
              onBlur={() => setFocusField(null)}
              style={inputStyle("name")}
            />
          )}
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={() => setFocusField("email")}
            onBlur={() => setFocusField(null)}
            style={inputStyle("email")}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setFocusField("password")}
            onBlur={() => setFocusField(null)}
            style={inputStyle("password")}
          />

          {tab === "login" && (
            <div style={{ textAlign: "right", marginTop: -4 }}>
              <a
                href="#"
                style={{
                  fontSize: 12,
                  color: t.accent,
                  textDecoration: "none",
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                }}
              >
                Forgot password?
              </a>
            </div>
          )}

          <button
            onClick={() => {
              window.location.href = "/tutor";
            }}
            style={{
              width: "100%",
              padding: "12px 0",
              borderRadius: 11,
              border: "none",
              background: `linear-gradient(135deg, ${t.accent} 0%, ${t.accentAlt} 100%)`,
              color: "#fff",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "'DM Sans', system-ui, sans-serif",
              marginTop: 4,
              boxShadow: `0 4px 20px ${t.accent}40`,
              transition: "opacity 0.2s, transform 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "0.9";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
              e.currentTarget.style.transform = "";
            }}
          >
            {tab === "login" ? "Sign in →" : "Create account →"}
          </button>
        </div>

        {/* Divider */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            margin: "20px 0",
          }}
        >
          <div style={{ flex: 1, height: 1, background: t.border }} />
          <span
            style={{
              fontSize: 12,
              color: t.textFaint,
              fontFamily: "'DM Sans', system-ui, sans-serif",
            }}
          >
            or continue with
          </span>
          <div style={{ flex: 1, height: 1, background: t.border }} />
        </div>

        {/* OAuth */}
        <div style={{ display: "flex", gap: 10 }}>
          {["Google", "GitHub"].map((p) => (
            <button
              key={p}
              onClick={() => {
                window.location.href = "/tutor";
              }}
              style={{
                flex: 1,
                padding: "10px 0",
                borderRadius: 10,
                background: t.surfaceAlt,
                border: `1px solid ${t.border}`,
                color: t.textMuted,
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "'DM Sans', system-ui, sans-serif",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = t.accent;
                e.currentTarget.style.color = t.text;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = t.border;
                e.currentTarget.style.color = t.textMuted;
              }}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: "absolute" as const,
            top: 16,
            right: 16,
            width: 32,
            height: 32,
            borderRadius: 8,
            background: t.surfaceAlt,
            border: `1px solid ${t.border}`,
            color: t.textMuted,
            fontSize: 16,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = t.text)}
          onMouseLeave={(e) => (e.currentTarget.style.color = t.textMuted)}
        >
          ×
        </button>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(24px) scale(0.97) } to { opacity: 1; transform: translateY(0) scale(1) } }
      `}</style>
    </div>
  );
}

// ─── Stat pill ────────────────────────────────────────────────────────────────
function Stat({
  value,
  label,
  theme,
}: {
  value: string;
  label: string;
  theme: Theme;
}) {
  const t = T[theme];
  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          fontSize: 36,
          fontWeight: 800,
          color: t.text,
          fontFamily: "'Playfair Display', Georgia, serif",
          letterSpacing: -1,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 13,
          color: t.textMuted,
          marginTop: 4,
          fontFamily: "'DM Sans', system-ui, sans-serif",
        }}
      >
        {label}
      </div>
    </div>
  );
}

// ─── Feature card ─────────────────────────────────────────────────────────────
function FeatureCard({
  icon,
  title,
  desc,
  theme,
}: {
  icon: string;
  title: string;
  desc: string;
  theme: Theme;
  accent?: boolean;
}) {
  const t = T[theme];
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "28px 28px",
        borderRadius: 18,
        background: hovered ? t.surfaceAlt : t.surface,
        border: `1px solid ${hovered ? t.accent + "50" : t.border}`,
        transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
        cursor: "default",
        boxShadow: hovered ? `0 8px 32px ${t.accent}15` : t.shadow,
        transform: hovered ? "translateY(-3px)" : "",
      }}
    >
      <div
        style={{
          fontSize: 26,
          marginBottom: 16,
          width: 52,
          height: 52,
          background: hovered
            ? `${t.accent}18`
            : theme === "light"
              ? "#F5F0EA"
              : t.surfaceAlt,
          borderRadius: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.25s",
          border: `1px solid ${hovered ? t.accent + "30" : t.border}`,
          lineHeight: 1,
          userSelect: "none",
        }}
      >
        {icon}
      </div>
      <h3
        style={{
          margin: "0 0 8px",
          fontSize: 17,
          fontWeight: 700,
          color: t.text,
          fontFamily: "'Playfair Display', Georgia, serif",
          letterSpacing: -0.3,
        }}
      >
        {title}
      </h3>
      <p
        style={{
          margin: 0,
          fontSize: 14,
          color: t.textMuted,
          lineHeight: 1.7,
          fontFamily: "'DM Sans', system-ui, sans-serif",
        }}
      >
        {desc}
      </p>
    </div>
  );
}

// ─── Workflow step ────────────────────────────────────────────────────────────
function Step({
  n,
  title,
  desc,
  theme,
}: {
  n: string;
  title: string;
  desc: string;
  theme: Theme;
}) {
  const t = T[theme];
  return (
    <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          flexShrink: 0,
          background: `linear-gradient(135deg, ${t.accent}20 0%, ${t.accentAlt}20 100%)`,
          border: `1.5px solid ${t.accent}30`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 15,
          fontWeight: 800,
          color: t.accent,
          fontFamily: "'Playfair Display', Georgia, serif",
        }}
      >
        {n}
      </div>
      <div>
        <div
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: t.text,
            marginBottom: 4,
            fontFamily: "'Playfair Display', Georgia, serif",
            letterSpacing: -0.2,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 14,
            color: t.textMuted,
            lineHeight: 1.65,
            fontFamily: "'DM Sans', system-ui, sans-serif",
          }}
        >
          {desc}
        </div>
      </div>
    </div>
  );
}

// ─── Testimonial ──────────────────────────────────────────────────────────────
function Testimonial({
  quote,
  name,
  role,
  theme,
}: {
  quote: string;
  name: string;
  role: string;
  theme: Theme;
}) {
  const t = T[theme];
  return (
    <div
      style={{
        padding: "28px",
        borderRadius: 18,
        background: t.surface,
        border: `1px solid ${t.border}`,
        boxShadow: t.shadow,
      }}
    >
      <div
        style={{
          fontSize: 32,
          color: t.accent,
          lineHeight: 1,
          marginBottom: 12,
          fontFamily: "'Playfair Display', Georgia, serif",
        }}
      >
        "
      </div>
      <p
        style={{
          margin: "0 0 20px",
          fontSize: 15,
          color: t.text,
          lineHeight: 1.75,
          fontFamily: "'DM Sans', system-ui, sans-serif",
          fontStyle: "italic",
        }}
      >
        {quote}
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${t.accent} 0%, ${t.accentAlt} 100%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 15,
            fontWeight: 700,
            color: "#fff",
            fontFamily: "'Playfair Display', Georgia, serif",
          }}
        >
          {name[0]}
        </div>
        <div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: t.text,
              fontFamily: "'DM Sans', system-ui, sans-serif",
            }}
          >
            {name}
          </div>
          <div
            style={{
              fontSize: 12,
              color: t.textMuted,
              fontFamily: "'DM Sans', system-ui, sans-serif",
            }}
          >
            {role}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Mini Dashboard Preview ───────────────────────────────────────────────────
function DashboardPreview({ theme }: { theme: Theme }) {
  const t = T[theme];
  const clusters = [
    { id: 0, label: "Data Structures", count: 14, color: "#C4622D" },
    { id: 1, label: "Algorithms", count: 22, color: "#2D6AC4" },
    { id: 2, label: "OS Concepts", count: 9, color: "#22A06B" },
    { id: 3, label: "Networks", count: 17, color: "#9B59B6" },
  ];
  return (
    <div
      style={{
        borderRadius: 20,
        overflow: "hidden",
        border: `1px solid ${t.border}`,
        boxShadow: t.shadowModal,
        background: t.surface,
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
    >
      {/* Fake title bar */}
      <div
        style={{
          padding: "10px 16px",
          borderBottom: `1px solid ${t.border}`,
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: t.surfaceAlt,
        }}
      >
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: "#FF5F57",
          }}
        />
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: "#FEBC2E",
          }}
        />
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: "#28C840",
          }}
        />
        <span style={{ marginLeft: 12, fontSize: 12, color: t.textMuted }}>
          kaksha.app
        </span>
      </div>
      {/* Header row */}
      <div
        style={{
          padding: "12px 18px",
          borderBottom: `1px solid ${t.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: t.surface,
        }}
      >
        <div style={{ display: "flex", gap: 16 }}>
          {["Clusters", "Chunks", "Topics", "Graph"].map((tab, i) => (
            <span
              key={tab}
              style={{
                fontSize: 12,
                fontWeight: i === 0 ? 700 : 400,
                color: i === 0 ? t.accent : t.textMuted,
                borderBottom:
                  i === 0 ? `2px solid ${t.accent}` : "2px solid transparent",
                paddingBottom: 4,
              }}
            >
              {tab}
            </span>
          ))}
        </div>
        <div
          style={{
            fontSize: 11,
            padding: "4px 12px",
            borderRadius: 20,
            background: t.pill,
            color: t.pillText,
          }}
        >
          62 chunks · 4 clusters
        </div>
      </div>
      {/* Cluster grid */}
      <div
        style={{
          padding: "16px 18px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
        }}
      >
        {clusters.map((cl) => (
          <div
            key={cl.id}
            style={{
              padding: "14px 16px",
              borderRadius: 14,
              border: `1px solid ${cl.color}25`,
              borderLeft: `4px solid ${cl.color}`,
              background: `${cl.color}06`,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: cl.color,
                marginBottom: 4,
              }}
            >
              C{cl.id}
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: t.text,
                marginBottom: 4,
              }}
            >
              {cl.label}
            </div>
            <div style={{ fontSize: 11, color: t.textMuted }}>
              {cl.count} chunks
            </div>
            <div
              style={{
                marginTop: 10,
                padding: "5px 0",
                borderRadius: 7,
                background: `${cl.color}12`,
                border: `1px solid ${cl.color}25`,
                fontSize: 10,
                fontWeight: 700,
                color: cl.color,
                textAlign: "center",
              }}
            >
              ▶ Study
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [theme, setTheme] = useState<Theme>("light");
  const [modal, setModal] = useState<Modal>(null);
  const t = T[theme];

  const features = [
    {
      icon: "🧩",
      title: "Semantic Clustering",
      desc: "Every PDF is broken into smart chunks and grouped by topic using K-means on sentence embeddings.",
    },
    {
      icon: "🕸️",
      title: "Prerequisite Graph",
      desc: "An LLM-generated DAG shows which concepts unlock others, so you always study in the right order.",
    },
    {
      icon: "🎯",
      title: "Adaptive Study Mode",
      desc: "Spaced-repetition flashcards powered by your cluster data. XP, levels, and mastery tracking built in.",
    },
    {
      icon: "🔍",
      title: "Vector Search",
      desc: "Ask anything about your PDF and get back the most semantically relevant passages instantly.",
    },
    {
      icon: "🏷️",
      title: "Topic Extraction",
      desc: "Groq Llama labels each cluster with a crisp topic name so you always know what you're studying.",
    },
    {
      icon: "📦",
      title: "Export Everything",
      desc: "Download chunks, clusters, topics, and DAG edges as JSON or CSV for your own pipelines.",
    },
  ];

  const steps = [
    {
      n: "1",
      title: "Upload your PDF",
      desc: "Drop any textbook, notes, or research paper. The pipeline runs in 2–5 minutes.",
    },
    {
      n: "2",
      title: "Explore your knowledge map",
      desc: "Browse semantic clusters, prerequisite graphs, and topic labels extracted by AI.",
    },
    {
      n: "3",
      title: "Study smarter",
      desc: "Use adaptive flashcards tuned to your clusters. Track mastery and XP as you go.",
    },
  ];

  const testimonials = [
    {
      quote:
        "Kaksha turned a 400-page GATE textbook into a structured knowledge map overnight. My prep time dropped by half.",
      name: "Rohan M.",
      role: "GATE CS 2025 aspirant",
    },
    {
      quote:
        "The prerequisite graph is brilliant. I finally understood which topics I was missing before attempting advanced ones.",
      name: "Priya S.",
      role: "M.Tech student, IIT Bombay",
    },
    {
      quote:
        "Semantic search over my own notes is something I didn't know I needed until I tried it.",
      name: "Arjun K.",
      role: "Software Engineer",
    },
  ];

  return (
    <>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::selection { background: ${t.accent}30; }
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: ${t.bg}; }
        ::-webkit-scrollbar-thumb { background: ${t.border}; border-radius: 99px; }
      `}</style>

      <NoiseBg theme={theme} />
      <AuthModal modal={modal} theme={theme} onClose={() => setModal(null)} />
      <Navbar
        theme={theme}
        onToggle={() => setTheme((p) => (p === "light" ? "dark" : "light"))}
        onModal={setModal}
      />

      <main style={{ position: "relative", zIndex: 1 }}>
        {/* ─── Hero ─────────────────────────────────────────────────────────── */}
        <section
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "120px 5vw 80px",
            textAlign: "center",
          }}
        >
          {/* Eyebrow pill */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 16px",
              borderRadius: 99,
              background: t.pill,
              border: `1px solid ${t.border}`,
              marginBottom: 36,
              animation: "fadeSlide 0.6s ease both",
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: t.accent,
                display: "inline-block",
                boxShadow: `0 0 8px ${t.accent}`,
              }}
            />
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: t.pillText,
                fontFamily: "'DM Sans', system-ui, sans-serif",
                letterSpacing: 0.3,
              }}
            >
              AI-powered personalized learning
            </span>
          </div>

          <h1
            style={{
              fontSize: "clamp(44px, 7vw, 88px)",
              fontWeight: 800,
              color: t.text,
              fontFamily: "'Playfair Display', Georgia, serif",
              letterSpacing: -2,
              lineHeight: 1.06,
              maxWidth: 860,
              marginBottom: 28,
              animation: "fadeSlide 0.7s 0.1s ease both",
            }}
          >
            Your textbooks,
            <br />
            <span
              style={{
                background: `linear-gradient(135deg, ${t.accent} 0%, ${t.accentAlt} 100%)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              mapped & mastered.
            </span>
          </h1>

          <p
            style={{
              fontSize: "clamp(16px, 2vw, 20px)",
              color: t.textMuted,
              maxWidth: 580,
              lineHeight: 1.7,
              marginBottom: 44,
              fontFamily: "'DM Sans', system-ui, sans-serif",
              animation: "fadeSlide 0.7s 0.2s ease both",
            }}
          >
            Upload any PDF. Kaksha clusters concepts, builds a prerequisite
            graph, and generates adaptive flashcards — so you always know what
            to study next.
          </p>

          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              justifyContent: "center",
              animation: "fadeSlide 0.7s 0.3s ease both",
            }}
          >
            <button
              onClick={() => setModal("signup")}
              style={{
                padding: "14px 32px",
                borderRadius: 13,
                border: "none",
                background: `linear-gradient(135deg, ${t.accent} 0%, ${t.accentAlt} 100%)`,
                color: "#fff",
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "'DM Sans', system-ui, sans-serif",
                boxShadow: `0 4px 24px ${t.accent}45`,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = `0 8px 32px ${t.accent}55`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "";
                e.currentTarget.style.boxShadow = `0 4px 24px ${t.accent}45`;
              }}
            >
              Start for free →
            </button>
            <a
              href="/tutor"
              style={{
                padding: "14px 32px",
                borderRadius: 13,
                border: `1.5px solid ${t.border}`,
                color: t.textMuted,
                fontSize: 15,
                fontWeight: 600,
                fontFamily: "'DM Sans', system-ui, sans-serif",
                textDecoration: "none",
                transition: "all 0.2s",
                display: "inline-block",
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLAnchorElement).style.borderColor = t.accent;
                (e.target as HTMLAnchorElement).style.color = t.text;
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLAnchorElement).style.borderColor = t.border;
                (e.target as HTMLAnchorElement).style.color = t.textMuted;
              }}
            >
              Open Tutor
            </a>
          </div>

          {/* Stats row */}
          <div
            style={{
              display: "flex",
              gap: 56,
              marginTop: 72,
              flexWrap: "wrap",
              justifyContent: "center",
              animation: "fadeSlide 0.7s 0.4s ease both",
              paddingTop: 48,
              borderTop: `1px solid ${t.border}`,
            }}
          >
            <Stat value="50K+" label="PDFs processed" theme={theme} />
            <div
              style={{ width: 1, background: t.border, alignSelf: "stretch" }}
            />
            <Stat value="2min" label="Average processing" theme={theme} />
            <div
              style={{ width: 1, background: t.border, alignSelf: "stretch" }}
            />
            <Stat value="92%" label="Students improved scores" theme={theme} />
            <div
              style={{ width: 1, background: t.border, alignSelf: "stretch" }}
            />
            <Stat value="FastEmbed + Groq" label="Powered by" theme={theme} />
          </div>
        </section>

        {/* ─── Dashboard Preview ─────────────────────────────────────────── */}
        <section
          style={{ padding: "0 5vw 100px", maxWidth: 900, margin: "0 auto" }}
        >
          <div
            style={{
              position: "relative",
              borderRadius: 24,
              padding: 3,
              background: `linear-gradient(135deg, ${t.accent}40, ${t.accentAlt}40)`,
              boxShadow: `0 32px 80px ${t.accent}15`,
            }}
          >
            <DashboardPreview theme={theme} />
          </div>
        </section>

        {/* ─── Features ─────────────────────────────────────────────────── */}
        <section
          style={{ padding: "80px 5vw", maxWidth: 1100, margin: "0 auto" }}
        >
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 2.5,
                color: t.accent,
                fontFamily: "'DM Sans', system-ui, sans-serif",
                textTransform: "uppercase",
              }}
            >
              What Kaksha does
            </span>
            <h2
              style={{
                fontSize: "clamp(30px, 4vw, 46px)",
                fontWeight: 800,
                color: t.text,
                fontFamily: "'Playfair Display', Georgia, serif",
                letterSpacing: -1.2,
                lineHeight: 1.1,
                marginTop: 12,
              }}
            >
              Built for deep understanding,
              <br />
              not shallow recall.
            </h2>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: 16,
            }}
          >
            {features.map((f) => (
              <FeatureCard key={f.title} {...f} theme={theme} />
            ))}
          </div>
        </section>

        {/* ─── How it works ──────────────────────────────────────────────── */}
        <section style={{ padding: "80px 5vw" }}>
          <div
            style={{
              maxWidth: 1000,
              margin: "0 auto",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 64,
              alignItems: "center",
            }}
          >
            <div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 2.5,
                  color: t.accent,
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                  textTransform: "uppercase",
                }}
              >
                How it works
              </span>
              <h2
                style={{
                  fontSize: "clamp(28px, 3.5vw, 42px)",
                  fontWeight: 800,
                  color: t.text,
                  fontFamily: "'Playfair Display', Georgia, serif",
                  letterSpacing: -1,
                  lineHeight: 1.15,
                  margin: "12px 0 40px",
                }}
              >
                Three steps to owning any subject.
              </h2>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 28 }}
              >
                {steps.map((s) => (
                  <Step key={s.n} {...s} theme={theme} />
                ))}
              </div>
            </div>
            {/* Right side visual */}
            <div style={{ position: "relative" }}>
              <div
                style={{
                  borderRadius: 20,
                  padding: "32px",
                  background: t.surface,
                  border: `1px solid ${t.border}`,
                  boxShadow: t.shadow,
                }}
              >
                {/* Mini DAG visualization */}
                <div
                  style={{
                    marginBottom: 20,
                    fontSize: 13,
                    fontWeight: 700,
                    color: t.textMuted,
                    fontFamily: "'DM Sans', system-ui, sans-serif",
                  }}
                >
                  Prerequisite Graph
                </div>
                <svg
                  viewBox="0 0 340 230"
                  style={{ width: "100%", display: "block" }}
                >
                  <defs>
                    <marker
                      id="arrowLP"
                      markerWidth="8"
                      markerHeight="6"
                      refX="7"
                      refY="3"
                      orient="auto"
                    >
                      <polygon
                        points="0 0, 8 3, 0 6"
                        fill={t.accent}
                        opacity="0.7"
                      />
                    </marker>
                    <marker
                      id="arrowLP2"
                      markerWidth="8"
                      markerHeight="6"
                      refX="7"
                      refY="3"
                      orient="auto"
                    >
                      <polygon
                        points="0 0, 8 3, 0 6"
                        fill={t.accentAlt}
                        opacity="0.7"
                      />
                    </marker>
                  </defs>
                  {/*
                    Node layout (x, y are top-left of each 130×34 rect):
                      Arrays:        x=10,  y=10  → center=(75, 27),  bottom=(75, 44)
                      Sorting:       x=200, y=10  → center=(265, 27), bottom=(265, 44)
                      Binary Search: x=105, y=98  → center=(170, 115), top=(170, 98)
                      Tree Traversal:x=105, y=186 → center=(170, 203), top=(170, 186)

                    Edges:
                      Arrays bottom (75,44) → Binary Search top (170,98)
                      Sorting bottom (265,44) → Binary Search top (170,98)
                      Binary Search bottom (170,132) → Tree Traversal top (170,186)
                  */}

                  {/* Arrays → Binary Search */}
                  <path
                    d="M 75 44 C 75 72, 170 70, 170 98"
                    fill="none"
                    stroke={t.accent}
                    strokeWidth="1.5"
                    strokeOpacity="0.6"
                    markerEnd="url(#arrowLP)"
                  />
                  {/* Sorting → Binary Search */}
                  <path
                    d="M 265 44 C 265 72, 170 70, 170 98"
                    fill="none"
                    stroke={t.accentAlt}
                    strokeWidth="1.5"
                    strokeOpacity="0.6"
                    markerEnd="url(#arrowLP2)"
                  />
                  {/* Binary Search → Tree Traversal */}
                  <path
                    d="M 170 132 L 170 186"
                    fill="none"
                    stroke={t.accent}
                    strokeWidth="1.5"
                    strokeOpacity="0.6"
                    markerEnd="url(#arrowLP)"
                  />

                  {/* Nodes */}
                  {[
                    { x: 10, y: 10, label: "Arrays", color: t.accent },
                    { x: 200, y: 10, label: "Sorting", color: t.accentAlt },
                    { x: 105, y: 98, label: "Binary Search", color: "#22A06B" },
                    {
                      x: 105,
                      y: 186,
                      label: "Tree Traversal",
                      color: "#9B59B6",
                    },
                  ].map((node) => (
                    <g key={node.label}>
                      <rect
                        x={node.x}
                        y={node.y}
                        width={130}
                        height={34}
                        rx={8}
                        fill={`${node.color}14`}
                        stroke={`${node.color}50`}
                        strokeWidth="1.5"
                      />
                      <text
                        x={node.x + 65}
                        y={node.y + 22}
                        textAnchor="middle"
                        fill={node.color}
                        fontSize="12"
                        fontFamily="system-ui"
                        fontWeight="700"
                      >
                        {node.label}
                      </text>
                    </g>
                  ))}
                </svg>
                <div
                  style={{
                    marginTop: 16,
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  {["K-means clustering", "Groq Llama-3.1", "pgvector"].map(
                    (tag) => (
                      <span
                        key={tag}
                        style={{
                          fontSize: 11,
                          padding: "4px 10px",
                          borderRadius: 99,
                          background: t.surfaceAlt,
                          border: `1px solid ${t.border}`,
                          color: t.textMuted,
                          fontFamily: "'DM Sans', system-ui, sans-serif",
                        }}
                      >
                        {tag}
                      </span>
                    ),
                  )}
                </div>
              </div>
              {/* Floating accent */}
              <div
                style={{
                  position: "absolute",
                  top: -16,
                  right: -16,
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  background: `radial-gradient(circle, ${t.accent}20, transparent 70%)`,
                  pointerEvents: "none",
                }}
              />
            </div>
          </div>
        </section>

        {/* ─── Testimonials ─────────────────────────────────────────────── */}
        <section
          style={{ padding: "80px 5vw", maxWidth: 1100, margin: "0 auto" }}
        >
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 2.5,
                color: t.accent,
                fontFamily: "'DM Sans', system-ui, sans-serif",
                textTransform: "uppercase",
              }}
            >
              What students say
            </span>
            <h2
              style={{
                fontSize: "clamp(28px, 3.5vw, 42px)",
                fontWeight: 800,
                color: t.text,
                fontFamily: "'Playfair Display', Georgia, serif",
                letterSpacing: -1,
                lineHeight: 1.15,
                marginTop: 12,
              }}
            >
              Real results, real students.
            </h2>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: 16,
            }}
          >
            {testimonials.map((r) => (
              <Testimonial key={r.name} {...r} theme={theme} />
            ))}
          </div>
        </section>

        {/* ─── CTA ──────────────────────────────────────────────────────── */}
        <section style={{ padding: "80px 5vw 120px", textAlign: "center" }}>
          <div
            style={{
              maxWidth: 680,
              margin: "0 auto",
              padding: "56px 48px",
              borderRadius: 24,
              background: t.surface,
              border: `1px solid ${t.border}`,
              boxShadow: t.shadowModal,
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Background gradient blob */}
            <div
              style={{
                position: "absolute",
                top: -60,
                right: -60,
                width: 240,
                height: 240,
                borderRadius: "50%",
                background: `radial-gradient(circle, ${t.accent}15, transparent 70%)`,
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: -60,
                left: -60,
                width: 200,
                height: 200,
                borderRadius: "50%",
                background: `radial-gradient(circle, ${t.accentAlt}12, transparent 70%)`,
                pointerEvents: "none",
              }}
            />

            <div style={{ position: "relative" }}>
              <h2
                style={{
                  fontSize: "clamp(28px, 4vw, 44px)",
                  fontWeight: 800,
                  color: t.text,
                  fontFamily: "'Playfair Display', Georgia, serif",
                  letterSpacing: -1.2,
                  lineHeight: 1.1,
                  marginBottom: 16,
                }}
              >
                Ready to study smarter?
              </h2>
              <p
                style={{
                  fontSize: 16,
                  color: t.textMuted,
                  lineHeight: 1.7,
                  marginBottom: 36,
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                }}
              >
                Join thousands of students turning dense textbooks into
                structured knowledge maps.
              </p>
              <button
                onClick={() => setModal("signup")}
                style={{
                  padding: "15px 40px",
                  borderRadius: 13,
                  border: "none",
                  background: `linear-gradient(135deg, ${t.accent} 0%, ${t.accentAlt} 100%)`,
                  color: "#fff",
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                  boxShadow: `0 4px 24px ${t.accent}45`,
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = `0 8px 32px ${t.accent}55`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "";
                  e.currentTarget.style.boxShadow = `0 4px 24px ${t.accent}45`;
                }}
              >
                Create free account →
              </button>
              <p
                style={{
                  marginTop: 16,
                  fontSize: 12,
                  color: t.textFaint,
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                }}
              >
                No credit card required.
              </p>
            </div>
          </div>
        </section>

        {/* ─── Footer ───────────────────────────────────────────────────── */}
        <footer
          style={{
            borderTop: `1px solid ${t.border}`,
            padding: "32px 5vw",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                background: `linear-gradient(135deg, ${t.accent} 0%, ${t.accentAlt} 100%)`,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 900,
                color: "#fff",
                fontFamily: "'Playfair Display', Georgia, serif",
              }}
            >
              K
            </div>
            <span
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: t.text,
                fontFamily: "'Playfair Display', Georgia, serif",
              }}
            >
              Kaksha
            </span>
          </div>
          <div style={{ display: "flex", gap: 24 }}>
            {[
              ["Tutor", "/tutor"],
              ["Assignments", "/assignments"],
              ["Planner", "/planner"],
            ].map(([label, href]) => (
              <a
                key={label}
                href={href}
                style={{
                  fontSize: 13,
                  color: t.textMuted,
                  textDecoration: "none",
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) =>
                  ((e.target as HTMLAnchorElement).style.color = t.text)
                }
                onMouseLeave={(e) =>
                  ((e.target as HTMLAnchorElement).style.color = t.textMuted)
                }
              >
                {label}
              </a>
            ))}
          </div>
          <span
            style={{
              fontSize: 12,
              color: t.textFaint,
              fontFamily: "'DM Sans', system-ui, sans-serif",
            }}
          >
            FastEmbed · Groq Llama-3.1 · Supabase pgvector · v0.1
          </span>
        </footer>
      </main>

      <style>{`
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
