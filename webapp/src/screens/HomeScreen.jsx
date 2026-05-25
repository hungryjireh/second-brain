import { useMemo, useState } from "react";
import "./HomeScreen.css";
import { theme } from "../theme";

const openBrainFeatures = [
  "No edits, no deletes - just one thing you want to share with the world each day",
  "Discover what everyone else is thinking about daily, from the personal to the profound",
  "View profiles and follow the people whose thinking you want more of",
];

const secondBrainFeatures = [
  "SecondBrain organizes your messy written and spoken thoughts instantly",
  "View your knowledge dump, Markdown and all. Your knowledge stays beautiful and searchable forever",
  "From your granny's secret recipe to ChatGPT conversations - all in one place",
];

const workflowSteps = [
  {
    num: "01",
    title: "Spark a thought",
    desc: "3am thoughts, reflections from the day, ideas that hit you while talking to friends - see what matters to everyone on OpenBrain",
    icon: "💡",
  },
  {
    num: "02",
    title: "Your personal knowledge assistant",
    desc: "Talk or write - whichever you prefer, ",
    descSuffix:
      " organizes your thoughts instantly, so you can find them later when it matters.",
    icon: "🔍",
  },
  {
    num: "03",
    title: "Save what matters",
    desc: "Move your favorite ideas into ",
    descSuffix: " for your own exploration.",
    icon: "📥",
  },
  {
    num: "04",
    title: "Build over time",
    desc: "With OpenBrain, turn saved ideas into durable knowledge for future projects.",
    icon: "🗂️",
  },
];

const openBrainLiveFeedFeatureTooltips = [
  {
    id: "markdown",
    label: "Markdown rendering",
    marker: "M",
    text: "Card display supports full Markdown, so thoughts render beautifully with structure and emphasis.",
  },
  {
    id: "reactions",
    label: "Reactions",
    marker: "R",
    text: "Readers can react in one tap, helping you see how others relate to your thoughts.",
  },
  {
    id: "save",
    label: "Save to SecondBrain",
    marker: "S",
    text: "Thoughts can be saved into SecondBrain for self-reflection and personal reference.",
  },
];

const secondBrainArchiveFeatureTooltips = [
  {
    id: "capture",
    label: "Capture everything",
    marker: "C",
    text: "Archive thoughts, ideas, TODOs and notes in one place so nothing important gets lost.\n\n Supports LLM conversation export uploads as well, so your AI interactions can also be part of your knowledge base.",
  },
  {
    id: "markdown",
    label: "Markdown support",
    marker: "M",
    text: "Entries preserve full Markdown formatting for clean, readable long-form notes.",
  },
  {
    id: "searchable",
    label: "Searchable forever",
    marker: "S",
    text: "Your archive stays structured and searchable, so key context is easy to retrieve later.",
  },
];

function Logo({ variant = "second" }) {
  if (variant === "open") {
    return (
      <span className="hs-logo">
        open<span className="hs-logo-accent hs-open">brain</span>
      </span>
    );
  }
  return (
    <span className="hs-logo">
      second<span className="hs-logo-accent hs-second">brain</span>
    </span>
  );
}

function ProductCard({
  number,
  tagline,
  description,
  features,
  tone,
  buttonLabel,
}) {
  return (
    <section className="hs-product-card">
      <p className="hs-product-number">{number}</p>
      <h3 className="hs-product-title">
        <Logo variant={tone === "open" ? "open" : "second"} />
      </h3>
      <p className="hs-product-tagline">{tagline}</p>
      <p className="hs-product-description">{description}</p>
      <ul className="hs-feature-list">
        {features.map((item) => (
          <li key={item} className="hs-feature-row">
            <span className={`hs-feature-dot ${tone}`} aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <button type="button" className={`hs-action-btn ${tone}`}>
        {buttonLabel}
      </button>
    </section>
  );
}

export default function HomeScreen() {
  const [activeOpenBrainTooltipId, setActiveOpenBrainTooltipId] = useState(
    openBrainLiveFeedFeatureTooltips[0].id,
  );
  const [activeSecondBrainTooltipId, setActiveSecondBrainTooltipId] = useState(
    secondBrainArchiveFeatureTooltips[0].id,
  );
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  const stickyHeaderIndices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

  const activeOpenBrainTooltip =
    openBrainLiveFeedFeatureTooltips.find(
      (item) => item.id === activeOpenBrainTooltipId,
    ) || openBrainLiveFeedFeatureTooltips[0];
  const activeSecondBrainTooltip =
    secondBrainArchiveFeatureTooltips.find(
      (item) => item.id === activeSecondBrainTooltipId,
    ) || secondBrainArchiveFeatureTooltips[0];
  const themeVars = {
    "--hs-bg-base": theme.colors.bgBase,
    "--hs-bg-surface": theme.colors.bgSurface,
    "--hs-bg-raised": theme.colors.bgRaised,
    "--hs-border": theme.colors.border,
    "--hs-text-primary": theme.colors.textPrimary,
    "--hs-text-secondary": theme.colors.textSecondary,
    "--hs-text-light": theme.colors.textLight,
    "--hs-accent": theme.colors.accent,
    "--hs-brand": theme.colors.brand,
    "--hs-accent-bg": theme.colors.accentBg,
  };

  return (
    <main
      className="hs-page"
      style={themeVars}
      data-sticky-header-indices={stickyHeaderIndices.join(",")}
    >
      <section className="hs-sticky-section hs-hero hs-hero-quote">
        <h1>
          If you could save just one thought before the day ends, what would it
          be?
        </h1>
      </section>

      <section className="hs-sticky-section hs-hero hs-hero-video">
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          className="hs-bg-video"
          src="/ebony-forsyth-dupe.mp4"
        />
        <div className="hs-overlay" />
        <blockquote>
          In an effort to get people to look into each other&apos;s eyes more,
          and also to appease the mutes, the government has decided to allot
          each person exactly one hundred and sixty-seven words, per day.
          <br />
          <br />
          When the phone rings, I put it to my ear without saying hello. In the
          restaurant I point at chicken noodle soup. I am adjusting well to the
          new way.
          <br />
          <br />
          Late at night, I call my long distance lover, proudly say I only used
          fifty-nine today. I saved the rest for you.
          <br />
          <br />
          When she doesn&apos;t respond, I know she&apos;s used up all her
          words, so I slowly whisper I love you thirty-two and a third times.
          After that, we just sit on the line and listen to each other breathe.
          <cite>- A Quiet World by Jeffrey McDaniel</cite>
        </blockquote>
      </section>

      <section className="hs-sticky-section hs-hero hs-products-hero">
        <article>
          <Logo variant="second" />
          <p>
            Your personal knowledge OS: capture notes, thoughts, todos,
            reminders, and even imported LLM conversations in one place. From
            quick brain-dumps to structured memory, automatically organize
            scattered inputs with SecondBrain.
          </p>
          <button type="button" className="hs-action-btn second">
            Try SecondBrain
          </button>
        </article>
        <article>
          <Logo variant="open" />
          <p>
            What if we only had one thought a day to share with the world? See
            the foremost thought on everyone&apos;s minds on the OpenBrain feed.
            When something resonates, save it straight into SecondBrain so
            inspiration turns into usable knowledge.
          </p>
          <button type="button" className="hs-action-btn open">
            Try Openbrain
          </button>
        </article>
      </section>

      <section className="hs-sticky-section hs-preview-panel hs-open-panel">
        <p className="hs-preview-badge open">Openbrain live feed</p>
        <div className="hs-tooltip-card open">
          <h4>{activeOpenBrainTooltip.label}</h4>
          <p>{activeOpenBrainTooltip.text}</p>
        </div>
        <div className="hs-preview-card">
          <p className="hs-preview-user">alex.openbrain · just now</p>
          <p className="hs-preview-thought">
            Could onboarding ask for a single user outcome first, then tailor
            setup around that?
          </p>
          <p className="hs-preview-tags">#product #ux #onboarding</p>
          <p className="hs-preview-meta">
            felt_this 3 · me_too 1 · made_me_think 2 · saves 5
          </p>
        </div>
        <div className="hs-hotspots">
          {openBrainLiveFeedFeatureTooltips.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`hs-hotspot open ${item.id === activeOpenBrainTooltipId ? "active" : ""}`}
              onMouseEnter={() => setActiveOpenBrainTooltipId(item.id)}
              onClick={() => setActiveOpenBrainTooltipId(item.id)}
              aria-label={`Show feature: ${item.label}`}
            >
              {item.marker}
            </button>
          ))}
        </div>
      </section>

      <section className="hs-sticky-section hs-preview-panel hs-second-panel">
        <p className="hs-preview-badge second">SecondBrain archive</p>
        <div className="hs-tooltip-card second">
          <h4>{activeSecondBrainTooltip.label}</h4>
          <p>{activeSecondBrainTooltip.text}</p>
        </div>
        <img
          src="/secondbrain-transparent-v2.png"
          alt="SecondBrain preview"
          className="hs-second-preview"
        />
        <div className="hs-hotspots">
          {secondBrainArchiveFeatureTooltips.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`hs-hotspot second ${item.id === activeSecondBrainTooltipId ? "active" : ""}`}
              onMouseEnter={() => setActiveSecondBrainTooltipId(item.id)}
              onClick={() => setActiveSecondBrainTooltipId(item.id)}
              aria-label={`Show feature: ${item.label}`}
            >
              {item.marker}
            </button>
          ))}
        </div>
      </section>

      <ProductCard
        number="01 / 02"
        tagline="Put your best thought forward"
        description="Find the most exciting thoughts in a world with minimal noise."
        features={openBrainFeatures}
        buttonLabel="Start sharing"
        tone="open"
      />

      <ProductCard
        number="02 / 02"
        tagline="Half-baked / fully formed knowledge, organized and searchable"
        description="Everything you've learned, decided, and built - organized so you can actually find it later."
        features={secondBrainFeatures}
        buttonLabel="Build your knowledge base"
        tone="second"
      />

      <section className="hs-sticky-section hs-workflow-section">
        <p className="hs-workflow-label">What we offer</p>
        <h2>From raw spark to refined knowledge</h2>
        <div className="hs-workflow-grid">
          {workflowSteps.map((step) => (
            <article key={step.num} className="hs-workflow-card">
              <p className="hs-step-num">{step.num}</p>
              <p className="hs-step-icon">{step.icon}</p>
              <h3>{step.title}</h3>
              <p>
                {step.desc}
                {step.descSuffix ? (
                  <span className="hs-step-inline-logo">
                    <Logo variant="second" />
                  </span>
                ) : null}
                {step.descSuffix || ""}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="hs-sticky-section hs-cta-row">
        <article className="hs-cta-card open">
          <h3>Think out loud with the world</h3>
          <p>
            Join people sharing their foremost ponderings every day on{" "}
            <Logo variant="open" />.
          </p>
          <button type="button" className="hs-action-btn open">
            Try OpenBrain
          </button>
        </article>
        <article className="hs-cta-card second">
          <h3>Build the brain you wish you had</h3>
          <p>
            Your notes, your insights, your decisions in one searchable archive
            with <Logo variant="second" />.
          </p>
          <button type="button" className="hs-action-btn second">
            Try SecondBrain
          </button>
        </article>
      </section>

      <footer className="hs-footer">
        <p>
          © {currentYear} <Logo variant="open" /> &amp;{" "}
          <Logo variant="second" />
        </p>
      </footer>
    </main>
  );
}
