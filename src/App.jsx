import React, { useEffect, useRef, useState } from "react";
import { WEDDING_DATE, images, contacts, mapUrl, content, music } from "./config.js";

const KIT = "/kit/elements";
const TEX = "/kit/textures";

const KH_DIGITS = ["០", "១", "២", "៣", "៤", "៥", "៦", "៧", "៨", "៩"];
const toKhmer = (n) =>
  String(n)
    .split("")
    .map((d) => (/\d/.test(d) ? KH_DIGITS[Number(d)] : d))
    .join("");

function useCountdown(target) {
  const calc = () => {
    const diff = Math.max(0, new Date(target).getTime() - Date.now());
    return {
      d: Math.floor(diff / 86400000),
      h: Math.floor((diff / 3600000) % 24),
      m: Math.floor((diff / 60000) % 60),
      s: Math.floor((diff / 1000) % 60),
    };
  };
  const [t, setT] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setT(calc()), 1000);
    return () => clearInterval(id);
  }, [target]);
  return t;
}

function useReveal(deps) {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal:not(.in)");
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, deps);
}

/* Background music. Browsers only allow sound after a tap, so play() is
   called from the envelope seal click (the first user gesture). */
function useMusic() {
  const ref = useRef(null);
  const raf = useRef(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const a = new Audio(music.src);
    a.loop = true;
    a.preload = "auto";
    a.volume = 0;
    ref.current = a;
    const on = () => setPlaying(true);
    const off = () => setPlaying(false);
    a.addEventListener("play", on);
    a.addEventListener("pause", off);
    return () => {
      cancelAnimationFrame(raf.current);
      a.pause();
      a.removeEventListener("play", on);
      a.removeEventListener("pause", off);
    };
  }, []);

  const fade = (to, ms, done) => {
    const a = ref.current;
    cancelAnimationFrame(raf.current);
    const from = a.volume;
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / ms);
      a.volume = Math.max(0, Math.min(1, from + (to - from) * k));
      if (k < 1) raf.current = requestAnimationFrame(step);
      else if (done) done();
    };
    raf.current = requestAnimationFrame(step);
  };

  const play = () => {
    const a = ref.current;
    if (!a) return;
    const p = a.play();
    if (p && p.catch) p.catch(() => setPlaying(false));
    fade(music.volume, 1800);
  };
  const stop = () => {
    const a = ref.current;
    if (a) fade(0, 500, () => a.pause());
  };
  const toggle = () => (ref.current && ref.current.paused ? play() : stop());

  // pause while the tab is hidden, resume afterwards if it was playing
  useEffect(() => {
    let was = false;
    const onVis = () => {
      const a = ref.current;
      if (!a) return;
      if (document.hidden) {
        was = !a.paused;
        a.pause();
      } else if (was) {
        a.play().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  return { playing, play, toggle };
}

/* Floating play / close (mute) button */
function MusicButton({ playing, onToggle, lang }) {
  const label = playing ? (lang === "km" ? "បិទតន្ត្រី" : "Close music") : lang === "km" ? "បើកតន្ត្រី" : "Play music";
  return (
    <button className={`music ${playing ? "on" : ""}`} onClick={onToggle} aria-label={label} title={label}>
      <span className="music-ring" />
      {playing ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4z" />
          <path d="M16 9.5l5 5M21 9.5l-5 5" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5.5v13l11-6.5-11-6.5z" />
        </svg>
      )}
    </button>
  );
}

/* Gold corner ornaments (kit corner.svg is top-left; the others are mirrored in CSS) */
function Corners() {
  return (
    <>
      {["tl", "tr", "bl", "br"].map((c) => (
        <img key={c} src={`${KIT}/corner.svg`} alt="" className={`corner corner-${c}`} aria-hidden="true" />
      ))}
    </>
  );
}

function Divider() {
  return <img src={`${KIT}/divider.svg`} alt="" className="divider reveal" aria-hidden="true" />;
}

/* Name logo with the kit butterfly between the two names */
function NameLogo({ t, className = "", style }) {
  return (
    <div className={`namelogo ${className}`} style={style}>
      <span>{t.brideName}</span>
      <img src={`${KIT}/butterfly.svg`}   alt="&" className="butterfly" />
      <span>{t.groomName}</span>
    </div>
  );
}

/* Envelope cover: olive paper, lining flap, wax seal. Tap the seal to open. */
function Envelope({ onOpen, t, lang, opening }) {
  return (
    <div className={`envelope ${opening ? "opening" : ""}`} style={{ backgroundImage: `url(${TEX}/paper-olive.webp)` }}>
      <div className="env-flap" style={{ backgroundImage: `url(${TEX}/paper-lining.webp)` }} />
      <div className="env-body">
        <img src={`${KIT}/crest.svg`} alt="" className="env-crest" aria-hidden="true" />
        <p className="env-small">{t.title}</p>
        <NameLogo  t={t} style={{fontSize:"1rem"}} className="on-dark text-sm "  />

        <p className="env-date">{t.dateLine}</p>
      </div>
      <button className="seal" onClick={onOpen} aria-label={lang === "km" ? "បើកលិខិតអញ្ជើញ" : "Open invitation"}>
        <img src={`${KIT}/wax-seal.svg`} alt="" />
      </button>
      <p className="env-hint">{lang === "km" ? "ចុចលើត្រាដើម្បីបើក" : "Tap the seal to open"}</p>
      
    </div>
  );
}

function Countdown({ t, lang }) {
  const c = useCountdown(WEDDING_DATE);
  const vals = [c.d, c.h, c.m, c.s].map((v) => {
    const s = String(v).padStart(2, "0");
    return lang === "km" ? toKhmer(s) : s;
  });
  return (
    <div className="countdown reveal">
      {vals.map((v, i) => (
        <div className="cd-box" key={i}>
          <span className="cd-num">{v}</span>
          <span className="cd-unit">{t.units[i]}</span>
        </div>
      ))}
    </div>
  );
}

function Lightbox({ index, onClose, onPrev, onNext }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onPrev, onNext]);

  const touch = useRef(null);
  return (
    <div
      className="lightbox"
      onClick={onClose}
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touch.current == null) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        if (Math.abs(dx) > 50) (dx > 0 ? onPrev : onNext)();
        touch.current = null;
      }}
    >
      <button className="lb-close" onClick={onClose} aria-label="Close">
        ✕
      </button>
      <button
        className="lb-nav lb-prev"
        onClick={(e) => {
          e.stopPropagation();
          onPrev();
        }}
        aria-label="Previous"
      >
        ‹
      </button>
      <img src={images.gallery[index]} alt="" onClick={(e) => e.stopPropagation()} />
      <button
        className="lb-nav lb-next"
        onClick={(e) => {
          e.stopPropagation();
          onNext();
        }}
        aria-label="Next"
      >
        ›
      </button>
    </div>
  );
}

export default function App() {
  const [lang, setLang] = useState("km");
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState("closed"); // closed -> opening -> open
  const [lb, setLb] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const { playing, play, toggle } = useMusic();
  const t = content[lang];
  const total = images.gallery.length;
  const open = stage === "open";

  useEffect(() => {
    const id = setTimeout(() => setLoading(false), 1400);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === "km" ? "km" : "en";
  }, [lang]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = !open || lb !== null ? "hidden" : "";
  }, [open, lb]);

  useReveal([open, lang]);

  const openEnvelope = () => {
    if (stage !== "closed") return;
    play(); // music starts the moment the seal is tapped
    setStage("opening");
    setTimeout(() => setStage("open"), 1100);
  };

  const prev = () => setLb((i) => (i + total - 1) % total);
  const next = () => setLb((i) => (i + 1) % total);
  const close = () => setLb(null);
  const toggleLang = () => setLang((l) => (l === "km" ? "en" : "km"));

  return (
    <div className={`app lang-${lang} ${open ? "ready" : ""}`}>
      {stage !== "closed" && <MusicButton playing={playing} onToggle={toggle} lang={lang} />}
      {loading && (
        <div className="loader" style={{ backgroundImage: `url(${TEX}/paper-olive.webp)` }}>
          <img src={`${KIT}/lotus.svg`} alt="" className="loader-lotus" />
        </div>
      )}

      {!open && <Envelope onOpen={openEnvelope} t={t} lang={lang} opening={stage === "opening"} />}

      <header className={`topbar ${scrolled ? "solid" : ""}`}>
        <a href="#top" className="brand">
          <img src={`${KIT}/lotus.svg`} alt="" />
        </a>
        <nav>
          <a href="#words">{t.wordsTitle}</a>
          <a href="#venue">{t.venueTitle}</a>
          <a href="#gallery">{t.galleryTitle}</a>
        </nav>
        <button className="lang" onClick={toggleLang}>
          {t.langLabel}
        </button>
      </header>

      <main id="top">
        {/* HERO */}
        <section className="hero">
          <img src={images.hero} alt={t.heroAlt} className="hero-img" />
          <div className="hero-shade" />
          <img src={`${KIT}/butterfly.svg`} alt="" className="fly fly-1" aria-hidden="true" />
          <img src={`${KIT}/butterfly.svg`} alt="" className="fly fly-2" aria-hidden="true" />
          <div className="hero-text">
            <img src={`${KIT}/crest.svg`} alt="" className="hero-crest h-in" style={{ "--i": 0 }} aria-hidden="true" />
            <p className="eyebrow h-in" style={{ "--i": 1 }}>
              {t.title}
            </p>
            <NameLogo t={t} className="on-dark big h-in" style={{ "--i": 2 }} />
            <p className="date h-in" style={{ "--i": 3 }}>
              {t.dateLine}
            </p>
            <a href="#invite" className="scroll-cue h-in" style={{ "--i": 4 }} aria-label="Scroll">
              <span />
            </a>
          </div>
        </section>

        {/* INVITE + COUNTDOWN — cream paper card */}
        <section id="invite" className="band olive-band">
          <div className="card paper reveal" style={{ backgroundImage: `url(${TEX}/paper-cream.webp)` }}>
            <Corners />
            <p className="invite">{t.invite}</p>
            <Divider />
            <h2 className="h2">{t.countdownTitle}</h2>
            <Countdown t={t} lang={lang} />
            <p className="card-date">{t.dateLine}</p>
          </div>
        </section>

        {/* WORDS */}
        <section id="words" className="band cream-band" style={{ backgroundImage: `url(${TEX}/paper-cream.webp)` }}>
          <div className="words-grid">
            <div className="words-photos reveal">
              <img src={images.words} alt="" className="ph ph-a" />
              <img src={images.cozy} alt="" className="ph ph-b" />
            </div>
            <div className="words-copy reveal">
              <h2 className="h2">{t.wordsTitle}</h2>
              <img src={`${KIT}/divider.svg`} alt="" className="divider left" aria-hidden="true" />
              {t.words.map((w, i) => (
                <p key={i}>{w}</p>
              ))}
              <div className="signoff">
                {t.brideName} <img src={`${KIT}/butterfly.svg`} alt="&" className="butterfly sm" /> {t.groomName}
              </div>
            </div>
          </div>
        </section>

        {/* VENUE */}
        <section id="venue" className="venue">
          <img src={images.pond} alt="" className="venue-bg" />
          <div className="venue-shade" />
          <div className="card paper venue-card reveal" style={{ backgroundImage: `url(${TEX}/paper-cream.webp)` }}>
            <Corners />
            <img src={`${KIT}/crest.svg`} alt="" className="card-crest" aria-hidden="true" />
            <h2 className="h2">{t.venueTitle}</h2>
            <h3 className="venue-name">{t.venueName}</h3>
            <p className="venue-addr">{t.venueAddress}</p>
            <Divider />
            <ul className="schedule">
              {t.schedule.map((s, i) => (
                <li key={i}>
                  <b>{s.time}</b>
                  <span>{s.label}</span>
                </li>
              ))}
            </ul>
            <a className="btn dark" href={mapUrl} target="_blank" rel="noreferrer">
              {t.mapLabel}
            </a>
          </div>
        </section>

        {/* GALLERY */}
        <section id="gallery" className="band olive-band gallery" style={{ backgroundImage: `url(${TEX}/paper-olive.webp)` }}>
          <h2 className="h2 gold reveal">{t.galleryTitle}</h2>
          <img src={`${KIT}/divider.svg`} alt="" className="divider reveal" aria-hidden="true" />
          <div className="grid">
            {images.gallery.map((src, i) => (
              <button key={i} className="tile reveal" onClick={() => setLb(i)}>
                <img src={src} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        </section>

        {/* CONTACT */}
        <section className="band cream-band contact" style={{ backgroundImage: `url(${TEX}/paper-cream.webp)` }}>
          <h2 className="h2 reveal">{t.contactTitle}</h2>
          <div className="links reveal">
            <a href={contacts.telegram} target="_blank" rel="noreferrer">
              Telegram
            </a>
            <a href={contacts.messenger} target="_blank" rel="noreferrer">
              Call me
            </a>
            <a href={contacts.facebook} target="_blank" rel="noreferrer">
              Facebook
            </a>
          </div>
          <img src={`${KIT}/wax-seal.svg`} alt="" className="foot-seal reveal" aria-hidden="true" />
          <p className="thanks reveal">{t.thanks}</p>
          <p className="foot reveal">
            {t.footer} · {t.brideName} &amp; {t.groomName}
          </p>
        </section>
      </main>

      {lb !== null && <Lightbox index={lb} onClose={close} onPrev={prev} onNext={next} />}
    </div>
  );
}
