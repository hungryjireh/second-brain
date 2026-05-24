import { useState, useEffect, useRef } from "react";

const ALL_ENTRIES = [
  { id: 1, type: "note", priority: "P0", title: "Logo Design Request", preview: "need a logo — should not have 'secondbrain' or 'openbrain' in it", time: "9:32 PM", day: "Yesterday", tags: ["claude", "imported", "design"] },
  { id: 2, type: "note", priority: "P0", title: "GIF based on poem", preview: "generate a GIF: When she doesn't respond, I know she's used up all her…", time: "9:22 PM", day: "Yesterday", tags: ["creative", "claude"] },
  { id: 3, type: "todo", priority: "P1", title: "Review API integration", preview: "Check rate limits and update SDK to v3.2 before shipping", time: "2:15 PM", day: "Today", tags: ["dev", "urgent"] },
  { id: 4, type: "thought", priority: "P2", title: "On deep work cycles", preview: "What if the real bottleneck isn't time but transition cost between contexts?", time: "11:04 AM", day: "Today", tags: ["philosophy", "productivity"] },
  { id: 5, type: "reminder", priority: "P0", title: "Call dentist", preview: "Schedule appointment for cleaning — overdue by 3 months", time: "9:00 AM", day: "Today", tags: ["health", "life"] },
  { id: 6, type: "todo", priority: "P1", title: "Ship landing page", preview: "Finalize copy, compress images, deploy to Vercel", time: "3:00 PM", day: "Today", tags: ["dev", "design"] },
  { id: 7, type: "thought", priority: "P2", title: "Reading list idea", preview: "Curate a shortlist of books on systems thinking — maybe 5 titles max", time: "8:45 PM", day: "Yesterday", tags: ["reading", "productivity"] },
];

const TYPE_CONFIG = {
  reminder: { label: "Reminders", count: 1, icon: "◎", accent: "#059669", light: "#ECFDF5", border: "#6EE7B7" },
  todo:     { label: "Todos",     count: 4, icon: "◻", accent: "#2563EB", light: "#EFF6FF", border: "#93C5FD" },
  thought:  { label: "Thoughts",  count: 7, icon: "◈", accent: "#7C3AED", light: "#F5F3FF", border: "#C4B5FD" },
  note:     { label: "Notes",     count: 5, icon: "◇", accent: "#D97706", light: "#FFFBEB", border: "#FCD34D" },
};

const ALL_TAGS = [...new Set(ALL_ENTRIES.flatMap(e => e.tags))].sort();

export default function SecondBrain() {
  const [typeFilter, setTypeFilter] = useState("All");
  const [activeTags, setActiveTags] = useState([]);
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef(null);
  const drawerRef = useRef(null);

  useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

  // Close drawer on outside click
  useEffect(() => {
    if (!filterOpen) return;
    const handle = (e) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target)) setFilterOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [filterOpen]);

  const toggleTag = (tag) => setActiveTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  const clearAll = () => { setActiveTags([]); setTypeFilter("All"); setSearch(""); setFilterOpen(false); };
  const activeCount = activeTags.length + (typeFilter !== "All" ? 1 : 0);

  const filtered = ALL_ENTRIES.filter(e => {
    const matchType = typeFilter === "All" || e.type === typeFilter.toLowerCase().replace(/s$/, "");
    const matchTags = activeTags.length === 0 || activeTags.every(t => e.tags.includes(t));
    const matchSearch = !search ||
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.preview.toLowerCase().includes(search.toLowerCase()) ||
      e.tags.some(t => t.includes(search.toLowerCase()));
    return matchType && matchTags && matchSearch;
  });

  const grouped = filtered.reduce((acc, e) => {
    if (!acc[e.day]) acc[e.day] = [];
    acc[e.day].push(e);
    return acc;
  }, {});

  return (
    <div style={s.root}>
      <div style={s.bgBlob1} />
      <div style={s.bgBlob2} />

      {/* Filter drawer overlay */}
      {filterOpen && <div style={s.overlay} />}

      <div style={{ ...s.container, opacity: mounted ? 1 : 0, transition: "opacity 0.35s ease" }}>

        {/* Header */}
        <header style={s.header}>
          <div style={s.headerLeft}>
            <div style={s.logoRing}><span style={s.logoHex}>⬡</span></div>
            <div>
              <div style={s.logoText}>second<span style={s.logoAccent}>brain</span></div>
              <div style={s.logoSub}>Sunday, May 24</div>
            </div>
          </div>
          <button style={s.avatar}>JD</button>
        </header>

        {/* Stat row — tap to filter */}
        <div style={s.statsRow}>
          {Object.entries(TYPE_CONFIG).map(([type, cfg], i) => {
            const label = type.charAt(0).toUpperCase() + type.slice(1) + "s";
            const active = typeFilter === label;
            return (
              <button key={type} className="fadeUp" style={{
                ...s.statCard,
                background: active ? `${cfg.accent}20` : "#dfe3ed",
                border: `3px solid ${active ? cfg.accent : cfg.border}`,
                animationDelay: `${i * 55}ms`,
              }} onClick={() => setTypeFilter(active ? "All" : label)}>
                <span style={{ ...s.statIcon, color: active ? "#fff" : cfg.accent }}>{cfg.icon}</span>
                <span style={{ ...s.statCount, color: active ? "#fff" : cfg.accent }}>{cfg.count}</span>
                <span style={{ ...s.statLabel, color: active ? "rgba(255,255,255,0.75)" : "#7d90aa" }}>{cfg.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── Compact search + filter bar ── */}
        <div style={s.searchRow}>
          <div style={{
            ...s.searchWrap,
            boxShadow: searchFocused ? "0 0 0 2px #7C3AED40" : "none",
            borderColor: searchFocused ? "#7C3AED60" : "#e2e8f0",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input ref={inputRef} style={s.searchInput} placeholder="Search…"
              value={search} onChange={e => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)} />
            {search && (
              <button style={s.clearBtn} onClick={() => setSearch("")}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            )}
          </div>

          {/* Filter toggle button */}
          <button style={{
            ...s.filterToggle,
            background: filterOpen || activeCount > 0 ? "#7C3AED" : "#fff",
            borderColor: filterOpen || activeCount > 0 ? "#7C3AED" : "#e2e8f0",
          }} onClick={() => setFilterOpen(p => !p)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke={filterOpen || activeCount > 0 ? "#fff" : "#64748b"} strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="6" x2="20" y2="6"/>
              <line x1="8" y1="12" x2="16" y2="12"/>
              <line x1="11" y1="18" x2="13" y2="18"/>
            </svg>
            {activeCount > 0 && (
              <span style={s.filterBadge}>{activeCount}</span>
            )}
          </button>
        </div>

        {/* Active filter chips (only shown when filters are on, no drawer needed) */}
        {(activeTags.length > 0 || typeFilter !== "All") && !filterOpen && (
          <div style={s.activeChips}>
            {typeFilter !== "All" && (
              <button style={s.activeChip} onClick={() => setTypeFilter("All")}>
                {typeFilter} ✕
              </button>
            )}
            {activeTags.map(t => (
              <button key={t} style={s.activeChip} onClick={() => toggleTag(t)}>
                #{t} ✕
              </button>
            ))}
            <button style={s.clearChip} onClick={clearAll}>Clear all</button>
          </div>
        )}

        {/* Offline banner */}
        <div style={s.offlineBanner}>
          <span style={s.offlineDot} />
          <span style={s.offlineText}>Offline · 1 change queued</span>
          <button style={s.syncBtn}>Sync</button>
        </div>

        {/* Entry list */}
        <div style={s.list}>
          {Object.entries(grouped).map(([day, items]) => (
            <div key={day}>
              <div style={s.dayLabel}>{day} · {items.length}</div>
              {items.map((entry, idx) => (
                <EntryCard key={entry.id} entry={entry} idx={idx} activeTags={activeTags} onTagClick={toggleTag} />
              ))}
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={s.empty}>
              <span style={s.emptyIcon}>◌</span>
              <span style={s.emptyText}>Nothing matches</span>
              <button style={s.emptyReset} onClick={clearAll}>Reset filters</button>
            </div>
          )}
        </div>
      </div>

      {/* ── Filter Drawer (slides up from bottom) ── */}
      <div ref={drawerRef} style={{
        ...s.drawer,
        transform: filterOpen ? "translateY(0)" : "translateY(100%)",
        pointerEvents: filterOpen ? "all" : "none",
      }}>
        <div style={s.drawerHandle} />
        <div style={s.drawerHeader}>
          <span style={s.drawerTitle}>Filters</span>
          {activeCount > 0 && (
            <button style={s.drawerClear} onClick={clearAll}>Clear all</button>
          )}
          <button style={s.drawerClose} onClick={() => setFilterOpen(false)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Type section */}
        <div style={s.drawerSection}>
          <div style={s.drawerSectionLabel}>Type</div>
          <div style={s.drawerPills}>
            {Object.entries(TYPE_CONFIG).map(([type, cfg]) => {
              const label = type.charAt(0).toUpperCase() + type.slice(1) + "s";
              const active = typeFilter === label;
              return (
                <button key={type} style={{
                  ...s.drawerPill,
                  background: active ? cfg.accent : cfg.light,
                  color: active ? "#fff" : cfg.accent,
                  border: `1.5px solid ${active ? cfg.accent : cfg.border}`,
                }} onClick={() => setTypeFilter(active ? "All" : label)}>
                  {cfg.icon} {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tags section */}
        <div style={s.drawerSection}>
          <div style={s.drawerSectionLabel}>Tags</div>
          <div style={s.drawerPills}>
            {ALL_TAGS.map(tag => {
              const active = activeTags.includes(tag);
              const count = ALL_ENTRIES.filter(e => e.tags.includes(tag)).length;
              return (
                <button key={tag} style={{
                  ...s.drawerPill,
                  background: active ? "#7C3AED" : "#F1F5F9",
                  color: active ? "#fff" : "#475569",
                  border: `1.5px solid ${active ? "#7C3AED" : "transparent"}`,
                }} onClick={() => toggleTag(tag)}>
                  #{tag}
                  <span style={{ ...s.tagCount, background: active ? "rgba(255,255,255,0.22)" : "#e2e8f0", color: active ? "#fff" : "#94a3b8" }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <button style={s.applyBtn} onClick={() => setFilterOpen(false)}>
          Show {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </button>
      </div>

      {/* FAB */}
      <div style={s.fab}>
        <button style={s.fabMic}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round">
            <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3Z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="22"/>
          </svg>
        </button>
        <button style={s.fabMain}>
          <span style={s.fabPlus}>+</span>
        </button>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=Geist:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f8fafc; }
        button { cursor: pointer; border: none; background: none; font-family: inherit; }
        input { font-family: inherit; }
        input:focus { outline: none; }
        input::placeholder { color: #cbd5e1; }
        ::-webkit-scrollbar { display: none; }
        .fadeUp { animation: fadeUp 0.38s ease both; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function EntryCard({ entry, idx, activeTags, onTagClick }) {
  const [pressed, setPressed] = useState(false);
  const cfg = TYPE_CONFIG[entry.type];
  return (
    <div className="fadeUp" style={{
      ...s.card,
      transform: pressed ? "scale(0.988)" : "scale(1)",
      animationDelay: `${idx * 45}ms`,
      borderLeft: `3px solid ${cfg.accent}`,
    }}
      onMouseDown={() => setPressed(true)} onMouseUp={() => setPressed(false)}
      onTouchStart={() => setPressed(true)} onTouchEnd={() => setPressed(false)}>
      <div style={s.cardTop}>
        <div style={s.cardMeta}>
          <span style={{ ...s.typeChip, background: cfg.light, color: cfg.accent, border: `1px solid ${cfg.border}` }}>
            {cfg.icon} {cfg.label.replace(/s$/, "")}
          </span>
          <span style={{ ...s.pBadge, color: entry.priority === "P0" ? "#dc2626" : entry.priority === "P1" ? "#d97706" : "#94a3b8" }}>
            {entry.priority}
          </span>
        </div>
        <button style={s.moreBtn}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="5" r="1" fill="#cbd5e1"/>
            <circle cx="12" cy="12" r="1" fill="#cbd5e1"/>
            <circle cx="12" cy="19" r="1" fill="#cbd5e1"/>
          </svg>
        </button>
      </div>
      <div style={s.cardTitle}>{entry.title}</div>
      <div style={s.cardPreview}>{entry.preview}</div>
      <div style={s.cardFooter}>
        <span style={s.cardTime}>{entry.day} · {entry.time}</span>
        <div style={s.cardTags}>
          {entry.tags.map(t => {
            const active = activeTags.includes(t);
            return (
              <button key={t} style={{
                ...s.cardTag,
                background: active ? "#7C3AED15" : "#F1F5F9",
                color: active ? "#7C3AED" : "#94a3b8",
                fontWeight: active ? 600 : 400,
              }} onClick={e => { e.stopPropagation(); onTagClick(t); }}>#{t}</button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const s = {
  root: {
    fontFamily: "'Geist', sans-serif",
    background: "#f8fafc",
    minHeight: "100vh",
    color: "#1e293b",
    position: "relative",
    overflowX: "hidden",
  },
  bgBlob1: {
    position: "fixed", top: -140, right: -100, width: 380, height: 380, borderRadius: "50%",
    background: "radial-gradient(circle, rgba(124,58,237,0.07) 0%, transparent 70%)",
    pointerEvents: "none", zIndex: 0,
  },
  bgBlob2: {
    position: "fixed", bottom: -80, left: -80, width: 300, height: 300, borderRadius: "50%",
    background: "radial-gradient(circle, rgba(5,150,105,0.06) 0%, transparent 70%)",
    pointerEvents: "none", zIndex: 0,
  },
  overlay: {
    position: "fixed", inset: 0, background: "rgba(15,23,42,0.3)",
    zIndex: 40, backdropFilter: "blur(2px)",
  },
  container: {
    position: "relative", zIndex: 1,
    maxWidth: 430, margin: "0 auto",
    padding: "52px 18px 110px",
  },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    marginBottom: 20,
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 10 },
  logoRing: {
    width: 36, height: 36, borderRadius: 10,
    background: "linear-gradient(135deg, #7C3AED15, #7C3AED28)",
    border: "1px solid #7C3AED25",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  logoHex: { fontSize: 18, color: "#7C3AED" },
  logoText: {
    fontFamily: "'Syne', sans-serif", fontSize: 19, fontWeight: 700,
    color: "#0f172a", letterSpacing: "-0.03em",
  },
  logoAccent: { color: "#7C3AED" },
  logoSub: { fontSize: 10.5, color: "#94a3b8", marginTop: 1 },
  avatar: {
    width: 34, height: 34, borderRadius: "50%",
    background: "linear-gradient(135deg, #7C3AED, #2563EB)",
    color: "#fff", fontFamily: "'Syne', sans-serif",
    fontSize: 11, fontWeight: 700,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  statsRow: {
    display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
    gap: 12, marginBottom: 14,
  },
  statCard: {
    borderRadius: 20, padding: "18px 6px 14px",
    minHeight: 126,
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
    transition: "transform 0.14s ease",
    cursor: "pointer",
  },
  statIcon: { fontSize: 21, lineHeight: 1, marginBottom: 1 },
  statCount: { fontFamily: "'Syne', sans-serif", fontSize: 54, fontWeight: 700, lineHeight: 0.85, letterSpacing: "-0.03em" },
  statLabel: { fontSize: 30, textTransform: "uppercase", letterSpacing: "0.09em", fontWeight: 600, marginTop: 3, transform: "scale(0.34)", transformOrigin: "center top", lineHeight: 1 },

  // Search row
  searchRow: {
    display: "flex", alignItems: "center", gap: 8,
    marginBottom: 10,
  },
  searchWrap: {
    flex: 1, display: "flex", alignItems: "center", gap: 8,
    background: "#fff", borderRadius: 11,
    padding: "10px 12px",
    border: "1.5px solid #e2e8f0",
    transition: "box-shadow 0.18s ease, border-color 0.18s ease",
  },
  searchInput: {
    flex: 1, background: "none", border: "none",
    color: "#1e293b", fontSize: 14,
  },
  clearBtn: {
    color: "#94a3b8", width: 20, height: 20,
    borderRadius: 4, background: "#f1f5f9",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  filterToggle: {
    width: 42, height: 42, borderRadius: 11, flexShrink: 0,
    border: "1.5px solid",
    display: "flex", alignItems: "center", justifyContent: "center",
    position: "relative",
    transition: "all 0.15s ease",
    boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
  },
  filterBadge: {
    position: "absolute", top: -5, right: -5,
    width: 16, height: 16, borderRadius: "50%",
    background: "#dc2626", color: "#fff",
    fontSize: 9, fontWeight: 700,
    display: "flex", alignItems: "center", justifyContent: "center",
    border: "2px solid #f8fafc",
  },

  // Active chips strip
  activeChips: {
    display: "flex", flexWrap: "wrap", gap: 5,
    marginBottom: 10,
  },
  activeChip: {
    fontSize: 11, fontWeight: 500,
    padding: "4px 9px", borderRadius: 20,
    background: "#7C3AED12", color: "#7C3AED",
    border: "1px solid #7C3AED30",
  },
  clearChip: {
    fontSize: 11, color: "#94a3b8",
    padding: "4px 8px", borderRadius: 20,
    border: "1px solid #e2e8f0",
  },

  offlineBanner: {
    display: "flex", alignItems: "center", gap: 8,
    background: "#FFFBEB", borderRadius: 9,
    padding: "7px 12px", marginBottom: 18,
    border: "1px solid #FDE68A",
  },
  offlineDot: {
    width: 6, height: 6, borderRadius: "50%",
    background: "#F59E0B", flexShrink: 0,
    boxShadow: "0 0 5px #F59E0B80",
  },
  offlineText: { fontSize: 11.5, color: "#92400E", flex: 1 },
  syncBtn: {
    fontSize: 11, color: "#D97706", fontWeight: 700,
    padding: "2px 8px", borderRadius: 5,
    background: "#FEF3C7", border: "1px solid #FDE68A",
  },

  list: { display: "flex", flexDirection: "column" },
  dayLabel: {
    fontSize: 10, color: "#94a3b8", textTransform: "uppercase",
    letterSpacing: "0.1em", fontWeight: 600,
    padding: "12px 2px 7px",
  },
  card: {
    background: "#fff", borderRadius: 13,
    padding: "13px 13px 11px", marginBottom: 8,
    border: "1px solid #e8eef4",
    boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
    transition: "transform 0.12s ease",
    cursor: "pointer",
  },
  cardTop: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    marginBottom: 6,
  },
  cardMeta: { display: "flex", alignItems: "center", gap: 6 },
  typeChip: {
    fontSize: 10, fontWeight: 600, padding: "2px 7px",
    borderRadius: 5, letterSpacing: "0.02em",
  },
  pBadge: { fontSize: 10, fontWeight: 700, fontFamily: "'Syne', sans-serif" },
  moreBtn: { padding: "2px" },
  cardTitle: {
    fontFamily: "'Syne', sans-serif", fontSize: 14.5, fontWeight: 700,
    color: "#0f172a", lineHeight: 1.35, marginBottom: 4,
  },
  cardPreview: { fontSize: 12.5, color: "#64748b", lineHeight: 1.55, marginBottom: 10 },
  cardFooter: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 },
  cardTime: { fontSize: 10.5, color: "#cbd5e1", flexShrink: 0 },
  cardTags: { display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" },
  cardTag: {
    fontSize: 10, padding: "2px 6px", borderRadius: 4,
    transition: "all 0.12s ease", cursor: "pointer",
  },

  empty: {
    display: "flex", flexDirection: "column", alignItems: "center",
    gap: 10, padding: "56px 20px", color: "#94a3b8",
  },
  emptyIcon: { fontSize: 30 },
  emptyText: { fontSize: 13 },
  emptyReset: {
    fontSize: 12, color: "#7C3AED", fontWeight: 600,
    padding: "6px 14px", borderRadius: 7,
    background: "#7C3AED12", border: "1px solid #7C3AED25",
  },

  // Bottom drawer
  drawer: {
    position: "fixed", bottom: 0, left: "50%",
    transform: "translateX(-50%) translateY(100%)",
    width: "100%", maxWidth: 430,
    background: "#fff", borderRadius: "20px 20px 0 0",
    padding: "12px 18px 36px",
    boxShadow: "0 -8px 40px rgba(0,0,0,0.12)",
    zIndex: 50,
    transition: "transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
  },
  drawerHandle: {
    width: 36, height: 4, borderRadius: 2,
    background: "#e2e8f0", margin: "0 auto 16px",
  },
  drawerHeader: {
    display: "flex", alignItems: "center",
    marginBottom: 18, gap: 8,
  },
  drawerTitle: {
    fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700,
    color: "#0f172a", flex: 1,
  },
  drawerClear: {
    fontSize: 12, color: "#7C3AED", fontWeight: 600,
    padding: "3px 9px", borderRadius: 6,
    background: "#7C3AED10", border: "1px solid #7C3AED25",
  },
  drawerClose: {
    width: 28, height: 28, borderRadius: 7,
    background: "#f1f5f9",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  drawerSection: { marginBottom: 20 },
  drawerSectionLabel: {
    fontSize: 10, color: "#94a3b8", textTransform: "uppercase",
    letterSpacing: "0.1em", fontWeight: 600, marginBottom: 10,
  },
  drawerPills: { display: "flex", flexWrap: "wrap", gap: 7 },
  drawerPill: {
    display: "flex", alignItems: "center", gap: 5,
    padding: "6px 12px", borderRadius: 20,
    fontSize: 12.5, fontWeight: 500,
    transition: "all 0.14s ease",
  },
  tagCount: {
    fontSize: 10, fontWeight: 600,
    padding: "1px 5px", borderRadius: 8,
    minWidth: 18, textAlign: "center",
  },
  applyBtn: {
    width: "100%", padding: "13px",
    borderRadius: 12, marginTop: 4,
    background: "linear-gradient(135deg, #7C3AED, #5B21B6)",
    color: "#fff", fontFamily: "'Syne', sans-serif",
    fontSize: 14, fontWeight: 700,
    boxShadow: "0 4px 14px rgba(124,58,237,0.3)",
  },

  fab: {
    position: "fixed", bottom: 28, right: 20, zIndex: 30,
    display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
  },
  fabMic: {
    width: 40, height: 40, borderRadius: "50%",
    background: "#fff", border: "1.5px solid #e2e8f0",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  fabMain: {
    width: 52, height: 52, borderRadius: "50%",
    background: "linear-gradient(135deg, #7C3AED, #5B21B6)",
    boxShadow: "0 6px 18px rgba(124,58,237,0.35)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  fabPlus: { fontSize: 24, color: "#fff", fontWeight: 300, lineHeight: 1 },
};
