import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { gsap } from "gsap";
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  GitCompareArrows,
  LineChart,
  Megaphone,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { LeadifyMark } from "@/components/TenantBrand";
import BorderGlow from "@/components/react-bits/BorderGlow";
import DarkVeil from "@/components/react-bits/DarkVeil";
import FlowingMenu from "@/components/react-bits/FlowingMenu";
import StaggeredMenu from "@/components/react-bits/StaggeredMenu";
import { apiClient } from "@/lib/apiClient";
import "./landing.css";

const MENU_ITEMS = [
  { label: "Home", ariaLabel: "Go to home", link: "#top" },
  { label: "Features", ariaLabel: "Explore platform features", link: "#features" },
  { label: "Workflow", ariaLabel: "See how it works", link: "#how-it-works" },
  { label: "Book a Demo", ariaLabel: "Book a product demo", link: "#book-a-demo" },
  { label: "Sign in", ariaLabel: "Sign in to Leadify", link: "/login" },
];

const SOCIAL_ITEMS = [
  { label: "LinkedIn", link: "https://www.linkedin.com" },
  { label: "X", link: "https://x.com" },
];

const FEATURES = [
  {
    icon: Search,
    title: "AI Lead Discovery",
    description:
      "Search millions of companies by industry, size, and geography via Apollo, and import the ones that match your ideal customer profile in one click.",
  },
  {
    icon: Sparkles,
    title: "ICP Qualification",
    description:
      "Claude scores every prospect against your configurable ICP weights, with plain-language reasoning your reps can read aloud on a call.",
  },
  {
    icon: GitCompareArrows,
    title: "Client Similarity",
    description:
      "Vector embeddings match each prospect to your most similar existing customer, giving outreach instant, honest social proof.",
  },
  {
    icon: ShieldCheck,
    title: "Human-Approved Outreach",
    description:
      "AI drafts the email, LinkedIn message, follow-up, and call script — but nothing is ever sent without a human review and explicit approval.",
  },
  {
    icon: Megaphone,
    title: "Campaigns & Pipeline",
    description:
      "Track every lead through a full pipeline kanban, group outreach into campaigns, and never lose track of a follow-up with 3-day reminders.",
  },
  {
    icon: LineChart,
    title: "Analytics & Copilot",
    description:
      "A conversational AI copilot plus dashboards for reply rates, pipeline velocity, and AI usage — one workspace for the whole team.",
  },
];

const STEPS = [
  {
    title: "Discover & qualify",
    description:
      "Pull in prospects from Apollo, enrich them with live website intelligence, and let the AI score them against your ICP.",
  },
  {
    title: "Draft & approve",
    description:
      "Generate personalized outreach grounded in real similarity to your existing clients, then review it in the Approval Center.",
  },
  {
    title: "Send & follow up",
    description:
      "Send through Gmail, track replies with AI sentiment classification, and get nudged automatically three days after every send.",
  },
];

const FLOWING_ITEMS = [
  { link: "#features", text: "Lead Discovery", image: "https://picsum.photos/600/400?random=11" },
  { link: "#features", text: "AI Scoring", image: "https://picsum.photos/600/400?random=12" },
  { link: "#features", text: "Approval Workflow", image: "https://picsum.photos/600/400?random=13" },
  { link: "#features", text: "Campaigns", image: "https://picsum.photos/600/400?random=14" },
  { link: "#book-a-demo", text: "Book a Demo", image: "https://picsum.photos/600/400?random=15" },
];

function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`landing-reveal ${className}`}>
      {children}
    </div>
  );
}

function DemoForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setError(null);
    try {
      await apiClient.post("/public/demo-requests", {
        name,
        email,
        company: company || undefined,
        message: message || undefined,
      });
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  };

  if (status === "success") {
    return (
      <div className="landing-demo__success">
        <CheckCircle2 size={44} />
        <h3 className="text-xl font-semibold">Request received</h3>
        <p style={{ color: "var(--landing-muted)" }}>
          Thanks, {name.split(" ")[0]}! Our team will reach out to {email} shortly to schedule your personalized demo.
        </p>
      </div>
    );
  }

  return (
    <form className="landing-demo-form" onSubmit={handleSubmit}>
      <div>
        <label htmlFor="demo-name">Full name *</label>
        <input
          id="demo-name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Jane Doe"
          maxLength={120}
        />
      </div>
      <div>
        <label htmlFor="demo-email">Work email *</label>
        <input
          id="demo-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jane@company.com"
        />
      </div>
      <div>
        <label htmlFor="demo-company">Company</label>
        <input
          id="demo-company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Acme Logistics"
          maxLength={160}
        />
      </div>
      <div>
        <label htmlFor="demo-message">What would you like to see?</label>
        <textarea
          id="demo-message"
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us about your sales team and what you want to automate..."
          maxLength={2000}
        />
      </div>
      {error && <p style={{ color: "#f87171", fontSize: "0.85rem" }}>{error}</p>}
      <button type="submit" className="landing-btn landing-btn--primary" disabled={status === "submitting"} style={{ justifyContent: "center" }}>
        <CalendarCheck size={17} />
        {status === "submitting" ? "Sending..." : "Book my demo"}
      </button>
      <p style={{ fontSize: "0.75rem", color: "var(--landing-muted)", textAlign: "center" }}>
        No spam. We only use this to schedule your demo.
      </p>
    </form>
  );
}

export function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    const targets = hero.querySelectorAll("[data-hero-stagger]");
    const tween = gsap.fromTo(
      targets,
      { y: 34, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.9, stagger: 0.12, ease: "power3.out", delay: 0.1 },
    );
    return () => {
      tween.kill();
    };
  }, []);

  return (
    <div className="landing">
      <div className="landing-darkveil" aria-hidden>
        <DarkVeil
          hueShift={220}
          noiseIntensity={0.035}
          scanlineIntensity={0.1}
          scanlineFrequency={1.2}
          speed={0.4}
          warpAmount={0.5}
          resolutionScale={1}
        />
      </div>

      <StaggeredMenu
        isFixed
        position="right"
        items={MENU_ITEMS}
        socialItems={SOCIAL_ITEMS}
        displaySocials
        displayItemNumbering
        logoUrl="/leadify-logo.svg"
        menuButtonColor="#f4f2ff"
        openMenuButtonColor="#08070d"
        changeMenuColorOnOpen
        colors={["#8b5cf6", "#6366f1", "#38bdf8"]}
        accentColor="#7c3aed"
        closeOnClickAway
      />

      <header id="top" className="landing-hero" ref={heroRef}>
        <div className="landing-hero__content">
          <span className="landing-hero__badge" data-hero-stagger>
            <span className="pulse-dot" />
            AI-native sales intelligence for B2B teams
          </span>
          <h1 data-hero-stagger>
            Turn cold prospects into <span className="landing-gradient-text">warm conversations</span>
          </h1>
          <p data-hero-stagger>
            Leadify discovers your best-fit prospects, scores them against your ideal customer profile, and drafts
            outreach grounded in your real customer wins — while keeping a human in charge of every send.
          </p>
          <div className="landing-hero__ctas" data-hero-stagger>
            <a href="#book-a-demo" className="landing-btn landing-btn--primary">
              Book a demo <ArrowRight size={17} />
            </a>
            <a href="#features" className="landing-btn landing-btn--ghost">
              Explore the platform
            </a>
          </div>
        </div>
      </header>

      <Reveal>
        <div className="landing-stats">
          <div className="landing-stats__item">
            <div className="landing-stats__value landing-gradient-text">10M+</div>
            <div className="landing-stats__label">Companies searchable via Apollo</div>
          </div>
          <div className="landing-stats__item">
            <div className="landing-stats__value landing-gradient-text">90s</div>
            <div className="landing-stats__label">From prospect to approved draft</div>
          </div>
          <div className="landing-stats__item">
            <div className="landing-stats__value landing-gradient-text">100%</div>
            <div className="landing-stats__label">Of emails human-approved</div>
          </div>
          <div className="landing-stats__item">
            <div className="landing-stats__value landing-gradient-text">3 days</div>
            <div className="landing-stats__label">Automatic follow-up reminders</div>
          </div>
        </div>
      </Reveal>

      <section id="features" className="landing-section">
        <Reveal>
          <span className="landing-section__eyebrow">Platform</span>
          <h2 className="landing-section__title">Everything your sales team needs, with AI in the loop — not in charge</h2>
          <p className="landing-section__sub">
            Six tightly-integrated modules cover the full outbound motion, from finding companies that look exactly
            like your best customers to reminding reps when it is time to follow up.
          </p>
        </Reveal>
        <div className="landing-features">
          {FEATURES.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <Reveal key={feature.title}>
                <BorderGlow
                  className="h-full"
                  borderRadius={20}
                  glowRadius={30}
                  animated={i === 0}
                  colors={["#c084fc", "#f472b6", "#38bdf8"]}
                >
                  <div className="landing-feature-card">
                    <span className="landing-feature-card__icon">
                      <Icon size={21} />
                    </span>
                    <h3>{feature.title}</h3>
                    <p>{feature.description}</p>
                  </div>
                </BorderGlow>
              </Reveal>
            );
          })}
        </div>
      </section>

      <Reveal>
        <div className="landing-flowing">
          <FlowingMenu
            items={FLOWING_ITEMS}
            speed={14}
            bgColor="#08070d"
            textColor="#f4f2ff"
            borderColor="rgba(255,255,255,0.1)"
            marqueeBgColor="#8b5cf6"
            marqueeTextColor="#08070d"
          />
        </div>
      </Reveal>

      <section id="how-it-works" className="landing-section">
        <Reveal>
          <span className="landing-section__eyebrow">Workflow</span>
          <h2 className="landing-section__title">From cold list to booked meeting in three steps</h2>
        </Reveal>
        <div className="landing-steps">
          {STEPS.map((step, i) => (
            <Reveal key={step.title}>
              <div className="landing-step">
                <span className="landing-step__num">STEP {String(i + 1).padStart(2, "0")}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="book-a-demo" className="landing-section">
        <div className="landing-demo">
          <Reveal>
            <span className="landing-section__eyebrow">Book a demo</span>
            <h2 className="landing-section__title">See Leadify on your own pipeline</h2>
            <p className="landing-section__sub">
              In 30 minutes we will connect your ideal customer profile, discover live prospects in your market, and
              generate a real, reviewable outreach draft — so you can judge the quality yourself.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem", marginTop: "1.8rem" }}>
              {["Personalized walkthrough with a product specialist", "Live AI qualification on companies you name", "Multi-tenant setup and branding included"].map(
                (line) => (
                  <div key={line} style={{ display: "flex", alignItems: "center", gap: "0.6rem", color: "var(--landing-muted)", fontSize: "0.95rem" }}>
                    <CheckCircle2 size={17} style={{ color: "#34d399", flexShrink: 0 }} />
                    {line}
                  </div>
                ),
              )}
            </div>
          </Reveal>
          <Reveal>
            <BorderGlow borderRadius={24} glowRadius={44} glowIntensity={1.15} animated colors={["#8b5cf6", "#38bdf8", "#f472b6"]}>
              <DemoForm />
            </BorderGlow>
          </Reveal>
        </div>
      </section>

      <footer className="landing-footer">
        <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", fontWeight: 650, color: "var(--landing-text)" }}>
          <LeadifyMark className="h-6 w-6" />
          Leadify
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <a href="#features">Features</a>
          <a href="#book-a-demo">Book a demo</a>
          <Link to="/login">Sign in</Link>
        </div>
        <span>© {new Date().getFullYear()} Leadify. AI drafts, humans decide.</span>
      </footer>
    </div>
  );
}
