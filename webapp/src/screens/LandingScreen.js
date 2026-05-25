import { useEffect, useRef, useState } from "react";
import { apiRequest } from "../api";
import OpenBrainLogo from "../components/OpenBrainLogo";
import { theme } from "../theme";
import "./LandingScreen.css";
import landingPageVideo from "../../assets/landing-page.mp4";

function BackgroundVideo() {
  const videoRef = useRef(null);

  useEffect(() => {
    const element = videoRef.current;
    if (!element) return undefined;

    const tryPlay = () => {
      const playPromise = element.play?.();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {});
      }
    };

    tryPlay();
    element.addEventListener("canplay", tryPlay);

    return () => {
      element.removeEventListener("canplay", tryPlay);
    };
  }, []);

  return (
    <video
      ref={videoRef}
      className="ls-video"
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
      src={landingPageVideo}
      aria-hidden
    />
  );
}

const NEVER_FORGET = [
  "billion dollar idea",
  "nobel prize winning thought",
  "oscar deserving film",
  "pulitzer prize winning story",
  "ted talk that would move thousands",
  "grammy nominated song",
];

export default function LandingScreen() {
  const [width, setWidth] = useState(() =>
    typeof window === "undefined" ? 1280 : window.innerWidth,
  );
  const [currentItem, setCurrentItem] = useState(
    NEVER_FORGET[Math.floor(Math.random() * NEVER_FORGET.length)],
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isFading, setIsFading] = useState(false);
  const fadeTimeoutRef = useRef(null);
  const longestNeverForgetItem = NEVER_FORGET.reduce(
    (longest, item) => (item.length > longest.length ? item : longest),
    "",
  );
  const titlePreview = `never forget your next ${longestNeverForgetItem}`;
  const maxTitleChars = Math.max(titlePreview.length, 1);
  const titleFontSize = Math.max(
    12,
    Math.min(34, Math.floor((width * 1.55) / maxTitleChars)),
  );

  useEffect(() => {
    const resizeHandler = () => setWidth(window.innerWidth);
    window.addEventListener("resize", resizeHandler);
    const interval = setInterval(() => {
      setIsFading(true);
      fadeTimeoutRef.current = setTimeout(() => {
        setCurrentItem((prevItem) => {
          if (NEVER_FORGET.length <= 1) return prevItem;
          let nextItem = prevItem;
          while (nextItem === prevItem) {
            nextItem =
              NEVER_FORGET[Math.floor(Math.random() * NEVER_FORGET.length)];
          }
          return nextItem;
        });
        setIsFading(false);
      }, 240);
    }, 2100);

    return () => {
      clearInterval(interval);
      if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
      window.removeEventListener("resize", resizeHandler);
    };
  }, []);

  async function submitSignup() {
    if (loading) return;

    const normalizedName = String(name || "").trim();
    const normalizedEmail = String(email || "")
      .trim()
      .toLowerCase();

    if (!normalizedName || !normalizedEmail) {
      setError("Please enter your name and email.");
      setSuccess("");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await apiRequest("/launch-signups", {
        method: "POST",
        body: {
          name: normalizedName,
          email: normalizedEmail,
          source: "landing-page",
        },
      });

      setSuccess("stay tuned ❤️");
      setName("");
      setEmail("");
    } catch (err) {
      setError(err?.message || "Unable to save your signup right now.");
    } finally {
      setLoading(false);
    }
  }

  function goToLearnMore() {
    if (typeof window !== "undefined") {
      window.location.assign("/learn-more");
    }
  }

  function SecondBrainLogo() {
    return (
      <span className="ls-footer-logo">
        second<span className="ls-footer-second">brain</span>
      </span>
    );
  }

  return (
    <div
      className="ls-page"
      style={{
        "--ls-text-primary": theme.colors.textPrimary,
        "--ls-accent": theme.colors.accent,
        "--ls-brand": theme.colors.brand,
      }}
    >
      <BackgroundVideo />
      <div className="ls-overlay" />
      <div className="ls-content">
        <div className="ls-card">
          <h1 className="ls-title" style={{ fontSize: titleFontSize }}>
            never forget your next{" "}
            <span className={`ls-title-animated ${isFading ? "fading" : ""}`}>
              {currentItem}
            </span>
          </h1>

          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="name"
            autoCapitalize="words"
            className="ls-input"
          />
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="email"
            autoCapitalize="none"
            type="email"
            className="ls-input"
          />

          <button
            type="button"
            onClick={submitSignup}
            className="ls-button"
            style={{
              backgroundColor: theme.colors.brand,
              color: theme.colors.textLight,
            }}
            disabled={loading}
          >
            {loading ? "submitting..." : "notify me"}
          </button>
          <button
            type="button"
            onClick={goToLearnMore}
            className="ls-learn-more"
          >
            learn more
          </button>

          {success ? (
            <p
              className="ls-helper success"
              style={{ color: theme.colors.textLight }}
            >
              {success}
            </p>
          ) : null}
          {error ? <p className="ls-error">{error}</p> : null}
        </div>
        <div className="ls-footer">
          <OpenBrainLogo
            style={{
              color: theme.colors.textPrimary,
              fontSize: 21,
              lineHeight: "26px",
              letterSpacing: "-0.3px",
              fontFamily: "'DM Serif Display', serif",
            }}
            accentStyle={{ color: theme.colors.accent }}
          />
          <span className="ls-footer-separator"> + </span>
          <SecondBrainLogo />
        </div>
      </div>
    </div>
  );
}
