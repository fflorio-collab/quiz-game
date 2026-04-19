"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import YouTubeEmbed, { extractYouTubeId } from "@/components/YouTubeEmbed";
import MediaDisplay from "@/components/MediaDisplay";

type Category = {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  color?: string | null;
  _count?: { questions: number };
};

type Question = {
  id: string;
  text: string;
  type: string;
  difficulty: string;
  timeLimit: number;
  openAnswer?: string | null;
  imageUrl?: string | null;
  mediaType?: string | null;
  category: Category;
  answers: { id: string; text: string; isCorrect: boolean; order: number }[];
};

type Tab = "questions" | "categories";

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [adminUrl, setAdminUrl] = useState("");
  const [showAdminQr, setShowAdminQr] = useState(false);
  const [tab, setTab] = useState<Tab>("questions");

  const [categories, setCategories] = useState<Category[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filterCategory, setFilterCategory] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState("");
  const [filterType, setFilterType] = useState("");

  // Question form state
  const [showQForm, setShowQForm] = useState(false);
  const [qText, setQText] = useState("");
  const [qType, setQType] = useState<"MULTIPLE_CHOICE" | "OPEN_ANSWER" | "WORD_COMPLETION" | "IMAGE_GUESS">("MULTIPLE_CHOICE");
  const [qCategory, setQCategory] = useState("");
  const [qDifficulty, setQDifficulty] = useState<"EASY" | "MEDIUM" | "HARD">("MEDIUM");
  const [qTimeLimit, setQTimeLimit] = useState(20);
  const [qAnswers, setQAnswers] = useState([
    { text: "", isCorrect: true },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ]);
  const [qOpenAnswer, setQOpenAnswer] = useState("");
  const [qWordTemplate, setQWordTemplate] = useState("");
  const [qMediaUrl, setQMediaUrl] = useState<string | null>(null);
  const [qMediaType, setQMediaType] = useState<string | null>(null);
  const [qUploading, setQUploading] = useState(false);
  const [qMediaMode, setQMediaMode] = useState<"upload" | "youtube" | "url">("upload");
  const [qUrlInput, setQUrlInput] = useState("");
  const [qFormError, setQFormError] = useState("");
  const qFileRef = useRef<HTMLInputElement>(null);

  // Category form state
  const [showCatForm, setShowCatForm] = useState(false);
  const [catEditId, setCatEditId] = useState<string | null>(null);
  const [catName, setCatName] = useState("");
  const [catSlug, setCatSlug] = useState("");
  const [catIcon, setCatIcon] = useState("");
  const [catColor, setCatColor] = useState("#6366f1");
  const [catError, setCatError] = useState("");

  const login = async () => {
    setAuthError("");
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) { setAuthError("Password errata"); return; }
    setAuthed(true);
    loadData();
  };

  const loadData = async () => {
    const [cRes, qRes] = await Promise.all([
      fetch("/api/admin/categories"),
      fetch("/api/admin/questions"),
    ]);
    const cData = await cRes.json();
    const qData = await qRes.json();
    setCategories(cData.categories);
    setQuestions(qData.questions);
    if (cData.categories[0] && !qCategory) setQCategory(cData.categories[0].id);
  };

  useEffect(() => {
    setAdminUrl(window.location.origin + "/admin");
    fetch("/api/admin/questions").then((r) => {
      if (r.ok) { setAuthed(true); loadData(); }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Media upload
  const uploadMedia = async (file: File) => {
    setQUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    setQUploading(false);
    if (!res.ok) { const err = await res.json(); setQFormError(err.error || "Errore upload"); return; }
    const data = await res.json();
    setQMediaUrl(data.url);
    setQMediaType(data.mediaType);
  };

  // Question CRUD
  const resetQForm = () => {
    setQText(""); setQType("MULTIPLE_CHOICE"); setQDifficulty("MEDIUM"); setQTimeLimit(20);
    setQAnswers([{ text: "", isCorrect: true }, { text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }]);
    setQOpenAnswer(""); setQWordTemplate(""); setQMediaUrl(null); setQMediaType(null);
    setQMediaMode("upload"); setQUrlInput(""); setQFormError("");
  };

  const createQuestion = async () => {
    setQFormError("");
    if (!qText.trim() || !qCategory) { setQFormError("Compila testo e categoria"); return; }
    if (qType === "MULTIPLE_CHOICE") {
      if (qAnswers.filter((a) => a.isCorrect).length !== 1) { setQFormError("Seleziona esattamente una risposta corretta"); return; }
      if (qAnswers.some((a) => !a.text.trim())) { setQFormError("Tutte le risposte devono essere compilate"); return; }
    }
    if (qType === "WORD_COMPLETION") {
      if (!qOpenAnswer.trim()) { setQFormError("Inserisci la parola corretta"); return; }
      if (!qWordTemplate.trim()) { setQFormError("Inserisci il template (usa _ per le lettere mancanti)"); return; }
    }
    if (qType === "IMAGE_GUESS" && !qMediaUrl) { setQFormError("Carica un'immagine prima di salvare"); return; }

    const body: Record<string, unknown> = {
      text: qText.trim(), type: qType, difficulty: qDifficulty, categoryId: qCategory,
      timeLimit: qTimeLimit, imageUrl: qMediaUrl, mediaType: qMediaType,
    };
    if (qType === "MULTIPLE_CHOICE") body.answers = qAnswers;
    else if (qType === "WORD_COMPLETION") {
      body.wordTemplate = qWordTemplate.trim().toUpperCase();
      body.answers = [{ text: qOpenAnswer.trim().toUpperCase(), isCorrect: true }];
    } else body.openAnswer = qOpenAnswer.trim() || null;

    const res = await fetch("/api/admin/questions", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    if (!res.ok) { const err = await res.json(); setQFormError(err.error || "Errore"); return; }
    resetQForm(); setShowQForm(false); loadData();
  };

  const deleteQuestion = async (id: string) => {
    if (!confirm("Eliminare questa domanda?")) return;
    await fetch(`/api/admin/questions/${id}`, { method: "DELETE" });
    loadData();
  };

  // Category CRUD
  const resetCatForm = () => { setCatEditId(null); setCatName(""); setCatSlug(""); setCatIcon(""); setCatColor("#6366f1"); setCatError(""); };

  const openEditCat = (c: Category) => {
    setCatEditId(c.id); setCatName(c.name); setCatSlug(c.slug); setCatIcon(c.icon ?? ""); setCatColor(c.color ?? "#6366f1"); setShowCatForm(true);
  };

  const saveCategory = async () => {
    setCatError("");
    if (!catName.trim() || !catSlug.trim()) { setCatError("Nome e slug obbligatori"); return; }
    const url = catEditId ? `/api/admin/categories/${catEditId}` : "/api/admin/categories";
    const res = await fetch(url, {
      method: catEditId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: catName.trim(), slug: catSlug.trim(), icon: catIcon.trim() || null, color: catColor }),
    });
    if (!res.ok) { const err = await res.json(); setCatError(err.error || "Errore"); return; }
    resetCatForm(); setShowCatForm(false); loadData();
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Eliminare la categoria? Verranno eliminate anche tutte le domande associate.")) return;
    const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
    if (!res.ok) { const err = await res.json(); alert(err.error || "Errore"); return; }
    loadData();
  };

  const filtered = questions.filter(
    (q) =>
      (!filterCategory || q.category.id === filterCategory) &&
      (!filterDifficulty || q.difficulty === filterDifficulty) &&
      (!filterType || q.type === filterType)
  );

  if (!authed) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md card">
          <Link href="/" className="text-muted hover:text-white text-sm mb-4 inline-block">← Home</Link>
          <h1 className="text-2xl font-bold mb-2">Area admin</h1>
          <p className="text-muted text-sm mb-6">Accedi per gestire categorie e domande.</p>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && login()} placeholder="Password admin" className="input mb-4" />
          {authError && <div className="bg-danger/10 border border-danger/30 text-danger rounded-lg p-3 text-sm mb-4">{authError}</div>}
          <button onClick={login} className="btn-primary w-full">Accedi</button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/" className="text-muted hover:text-white text-sm">← Home</Link>
            <h1 className="text-3xl font-bold mt-2">Gestione quiz</h1>
          </div>
          <button onClick={() => setShowAdminQr(!showAdminQr)} className="btn-secondary text-sm">
            {showAdminQr ? "Nascondi" : "QR admin"}
          </button>
        </div>

        {showAdminQr && adminUrl && (
          <div className="mb-6 inline-flex items-center gap-6 card py-4 animate-slide-up">
            <div className="bg-white p-3 rounded-xl"><QRCodeSVG value={adminUrl} size={120} level="M" /></div>
            <div>
              <p className="font-semibold mb-1">Area Admin</p>
              <p className="text-sm text-muted mb-2">Scansiona per accedere direttamente</p>
              <p className="text-xs font-mono text-muted/70 break-all">{adminUrl}</p>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="card"><p className="text-muted text-sm">Totale domande</p><p className="text-3xl font-bold">{questions.length}</p></div>
          <div className="card"><p className="text-muted text-sm">Categorie</p><p className="text-3xl font-bold">{categories.length}</p></div>
          <div className="card"><p className="text-muted text-sm">Scelta multipla</p><p className="text-3xl font-bold text-accent">{questions.filter((q) => q.type !== "OPEN_ANSWER").length}</p></div>
          <div className="card"><p className="text-muted text-sm">Risposta aperta</p><p className="text-3xl font-bold text-warning">{questions.filter((q) => q.type === "OPEN_ANSWER").length}</p></div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-border">
          {(["questions", "categories"] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${tab === t ? "bg-surface text-white border-b-2 border-accent" : "text-muted hover:text-white"}`}>
              {t === "questions" ? `Domande (${questions.length})` : `Categorie (${categories.length})`}
            </button>
          ))}
        </div>

        {/* ── DOMANDE ── */}
        {tab === "questions" && (
          <>
            <div className="flex justify-end mb-4">
              <button onClick={() => { setShowQForm(!showQForm); if (!showQForm) resetQForm(); }} className="btn-primary">
                {showQForm ? "Chiudi" : "+ Nuova domanda"}
              </button>
            </div>

            {showQForm && (
              <div className="card mb-6 animate-slide-up">
                <h2 className="text-xl font-bold mb-4">Nuova domanda</h2>
                <div className="space-y-4">
                  {/* Tipo */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Tipo domanda</label>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { v: "MULTIPLE_CHOICE", label: "🔤 Scelta multipla" },
                        { v: "OPEN_ANSWER",     label: "✏️ Risposta aperta" },
                        { v: "WORD_COMPLETION", label: "🔡 Componi parola" },
                        { v: "IMAGE_GUESS",     label: "🗺️ Indovina luogo" },
                      ] as const).map(({ v, label }) => (
                        <button key={v} type="button"
                          onClick={() => { setQType(v); setQTimeLimit(v === "OPEN_ANSWER" || v === "IMAGE_GUESS" ? 30 : 20); resetQForm(); setQType(v); }}
                          className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-colors text-left ${qType === v ? "border-accent bg-accent/20 text-white" : "border-border text-muted hover:border-white"}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Testo */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Testo domanda</label>
                    <input value={qText} onChange={(e) => setQText(e.target.value)} className="input" placeholder="Es. Qual è la capitale d'Italia?" />
                  </div>

                  {/* Categoria + Difficoltà */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Categoria</label>
                      <select value={qCategory} onChange={(e) => setQCategory(e.target.value)} className="input">
                        {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Difficoltà</label>
                      <select value={qDifficulty} onChange={(e) => setQDifficulty(e.target.value as "EASY" | "MEDIUM" | "HARD")} className="input">
                        <option value="EASY">Facile</option>
                        <option value="MEDIUM">Medio</option>
                        <option value="HARD">Difficile</option>
                      </select>
                    </div>
                  </div>

                  {/* Tempo */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Tempo limite: {qTimeLimit}s</label>
                    <input type="range" min={5} max={60} value={qTimeLimit} onChange={(e) => setQTimeLimit(Number(e.target.value))} className="w-full accent-accent" />
                  </div>

                  {/* Media allegato */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Media allegato (opzionale)</label>

                    {/* Selezione modalità */}
                    {!qMediaUrl && (
                      <div className="flex gap-2 mb-3">
                        {([
                          { v: "upload", label: "Carica file" },
                          { v: "youtube", label: "YouTube" },
                          { v: "url", label: "URL foto" },
                        ] as const).map(({ v, label }) => (
                          <button key={v} type="button"
                            onClick={() => { setQMediaMode(v); setQUrlInput(""); }}
                            className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${qMediaMode === v ? "border-accent bg-accent/20 text-white" : "border-border text-muted hover:border-white"}`}>
                            {label}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Anteprima media salvato */}
                    {qMediaUrl ? (
                      <div className="relative inline-block max-w-full w-full">
                        <MediaDisplay imageUrl={qMediaUrl} mediaType={qMediaType} muted className="max-h-48" />
                        <button type="button"
                          onClick={() => { setQMediaUrl(null); setQMediaType(null); setQUrlInput(""); }}
                          className="absolute top-1 right-1 bg-danger rounded-full w-6 h-6 flex items-center justify-center text-white text-xs font-bold z-10">✕</button>
                      </div>
                    ) : qMediaMode === "upload" ? (
                      <div>
                        <input ref={qFileRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm" className="hidden"
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadMedia(f); e.target.value = ""; }} />
                        <button type="button" disabled={qUploading} onClick={() => qFileRef.current?.click()}
                          className="border-2 border-dashed border-border rounded-xl px-8 py-4 text-muted hover:text-white hover:border-white transition-colors text-sm w-full text-center">
                          {qUploading ? "Caricamento in corso..." : "Clicca per caricare immagine o video (max 50 MB)"}
                        </button>
                      </div>
                    ) : qMediaMode === "youtube" ? (
                      <div className="space-y-2">
                        <input
                          value={qUrlInput}
                          onChange={(e) => setQUrlInput(e.target.value)}
                          className="input"
                          placeholder="https://www.youtube.com/watch?v=... oppure https://youtu.be/..."
                        />
                        {qUrlInput && extractYouTubeId(qUrlInput) ? (
                          <div className="space-y-2">
                            <YouTubeEmbed url={qUrlInput} muted className="w-full aspect-video rounded-lg max-h-48" />
                            <button type="button"
                              onClick={() => { setQMediaUrl(qUrlInput); setQMediaType("youtube"); }}
                              className="btn-secondary text-sm w-full">
                              Conferma questo video
                            </button>
                          </div>
                        ) : qUrlInput ? (
                          <p className="text-danger text-xs">URL YouTube non riconosciuto</p>
                        ) : null}
                      </div>
                    ) : (
                      /* URL immagine esterna */
                      <div className="space-y-2">
                        <input
                          value={qUrlInput}
                          onChange={(e) => setQUrlInput(e.target.value)}
                          className="input"
                          placeholder="https://example.com/foto.jpg"
                        />
                        {qUrlInput && (
                          <div className="space-y-2">
                            <img src={qUrlInput} alt="anteprima" className="max-h-40 rounded-lg object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                            <button type="button"
                              onClick={() => { setQMediaUrl(qUrlInput); setQMediaType("image"); }}
                              className="btn-secondary text-sm w-full">
                              Conferma questa immagine
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Risposte scelta multipla */}
                  {qType === "MULTIPLE_CHOICE" && (
                    <div>
                      <label className="block text-sm font-medium mb-2">Risposte (seleziona quella corretta)</label>
                      <div className="space-y-2">
                        {qAnswers.map((a, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <button type="button" onClick={() => setQAnswers(qAnswers.map((x, idx) => ({ ...x, isCorrect: idx === i })))}
                              className={`w-10 h-10 rounded-lg border-2 flex-shrink-0 font-bold transition-colors ${a.isCorrect ? "border-success bg-success/20 text-success" : "border-border text-muted hover:border-white"}`}>
                              {a.isCorrect ? "✓" : String.fromCharCode(65 + i)}
                            </button>
                            <input value={a.text} onChange={(e) => setQAnswers(qAnswers.map((x, idx) => idx === i ? { ...x, text: e.target.value } : x))}
                              placeholder={`Risposta ${String.fromCharCode(65 + i)}`} className="input" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Risposta aperta */}
                  {qType === "OPEN_ANSWER" && (
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Risposta corretta attesa{" "}
                        <span className="text-muted font-normal text-xs">(opzionale — riferimento per l&apos;admin)</span>
                      </label>
                      <input value={qOpenAnswer} onChange={(e) => setQOpenAnswer(e.target.value)} className="input" placeholder="Es. Roma" />
                      <p className="text-xs text-muted mt-1">Se lasci vuoto, l&apos;host giudica manualmente durante la partita.</p>
                    </div>
                  )}

                  {/* Indovina il luogo - riferimento risposta */}
                  {qType === "IMAGE_GUESS" && (
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Risposta attesa{" "}
                        <span className="text-muted font-normal text-xs">(opzionale — riferimento per l&apos;admin)</span>
                      </label>
                      <input value={qOpenAnswer} onChange={(e) => setQOpenAnswer(e.target.value)} className="input" placeholder="Es. Piazza San Marco, Venezia" />
                    </div>
                  )}

                  {/* Componi la parola */}
                  {qType === "WORD_COMPLETION" && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">Parola corretta</label>
                        <input value={qOpenAnswer} onChange={(e) => {
                          const v = e.target.value.toUpperCase();
                          setQOpenAnswer(v);
                          if (!qWordTemplate) {
                            setQWordTemplate(v.split("").map((ch, i) => i % 2 === 1 ? "_" : ch).join(""));
                          }
                        }} className="input font-mono uppercase" placeholder="Es. MILANO" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Template (usa _ per le lettere mancanti)
                        </label>
                        <input value={qWordTemplate} onChange={(e) => setQWordTemplate(e.target.value.toUpperCase())} className="input font-mono uppercase tracking-widest" placeholder="Es. M_L_NO" />
                        <p className="text-xs text-muted mt-1">Lettere visibili ai giocatori · _ = lettera da indovinare</p>
                      </div>
                    </div>
                  )}

                  {qFormError && <div className="bg-danger/10 border border-danger/30 text-danger rounded-lg p-3 text-sm">{qFormError}</div>}
                  <button onClick={createQuestion} className="btn-primary w-full">Salva domanda</button>
                </div>
              </div>
            )}

            {/* Filtri */}
            <div className="flex flex-wrap gap-3 mb-4">
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="input w-auto">
                <option value="">Tutte le categorie</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
              <select value={filterDifficulty} onChange={(e) => setFilterDifficulty(e.target.value)} className="input w-auto">
                <option value="">Tutte le difficoltà</option>
                <option value="EASY">Facile</option><option value="MEDIUM">Medio</option><option value="HARD">Difficile</option>
              </select>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="input w-auto">
                <option value="">Tutti i tipi</option>
                <option value="MULTIPLE_CHOICE">🔤 Scelta multipla</option>
                <option value="OPEN_ANSWER">✏️ Risposta aperta</option>
                <option value="WORD_COMPLETION">🔡 Componi parola</option>
                <option value="IMAGE_GUESS">🗺️ Indovina luogo</option>
              </select>
            </div>

            {/* Lista domande */}
            <div className="space-y-3">
              {filtered.map((q) => (
                <div key={q.id} className="card">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${q.category.color}20`, color: q.category.color || "#fff" }}>
                          {q.category.icon} {q.category.name}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${q.difficulty === "EASY" ? "bg-success/20 text-success" : q.difficulty === "MEDIUM" ? "bg-warning/20 text-warning" : "bg-danger/20 text-danger"}`}>
                          {q.difficulty === "EASY" ? "Facile" : q.difficulty === "MEDIUM" ? "Medio" : "Difficile"}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          q.type === "OPEN_ANSWER" ? "bg-purple-500/20 text-purple-400" :
                          q.type === "WORD_COMPLETION" ? "bg-orange-500/20 text-orange-400" :
                          q.type === "IMAGE_GUESS" ? "bg-teal-500/20 text-teal-400" :
                          "bg-blue-500/20 text-blue-400"
                        }`}>
                          {q.type === "OPEN_ANSWER" ? "✏️ Aperta" :
                           q.type === "WORD_COMPLETION" ? "🔡 Parola" :
                           q.type === "IMAGE_GUESS" ? "🗺️ Luogo" :
                           "🔤 Multipla"}
                        </span>
                        {q.imageUrl && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-400">
                            {q.mediaType === "youtube" ? "YouTube" : q.mediaType === "video" ? "Video" : "Immagine"}
                          </span>
                        )}
                      </div>
                      <p className="font-semibold mb-2">{q.text}</p>
                      {q.imageUrl && (
                        <div className="mb-2">
                          <MediaDisplay imageUrl={q.imageUrl} mediaType={q.mediaType} muted className="max-h-28" />
                        </div>
                      )}
                      {q.type === "MULTIPLE_CHOICE" ? (
                        <ul className="text-sm text-muted space-y-0.5">
                          {q.answers.map((a) => (
                            <li key={a.id} className={a.isCorrect ? "text-success" : ""}>{a.isCorrect ? "✓" : "·"} {a.text}</li>
                          ))}
                        </ul>
                      ) : q.type === "WORD_COMPLETION" ? (
                        <p className="text-sm font-mono">
                          Template: <span className="text-accent tracking-widest">{(q as any).wordTemplate ?? "—"}</span>
                          {q.answers[0] && <span className="text-success ml-2">→ {q.answers[0].text}</span>}
                        </p>
                      ) : (
                        <p className="text-sm">
                          {q.openAnswer ? <><span className="text-muted">Risposta attesa: </span><span className="text-success font-medium">{q.openAnswer}</span></> : <span className="text-warning">Giudizio manuale dell&apos;host</span>}
                        </p>
                      )}
                    </div>
                    <button onClick={() => deleteQuestion(q.id)} className="text-danger hover:underline text-sm flex-shrink-0">Elimina</button>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && <div className="text-center py-12 text-muted">Nessuna domanda trovata con questi filtri.</div>}
            </div>
          </>
        )}

        {/* ── CATEGORIE ── */}
        {tab === "categories" && (
          <>
            <div className="flex justify-end mb-4">
              <button onClick={() => { setShowCatForm(!showCatForm); if (!showCatForm) resetCatForm(); }} className="btn-primary">
                {showCatForm && !catEditId ? "Chiudi" : "+ Nuova categoria"}
              </button>
            </div>

            {showCatForm && (
              <div className="card mb-6 animate-slide-up">
                <h2 className="text-xl font-bold mb-4">{catEditId ? "Modifica categoria" : "Nuova categoria"}</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Nome</label>
                      <input value={catName} onChange={(e) => { setCatName(e.target.value); if (!catEditId) setCatSlug(slugify(e.target.value)); }} className="input" placeholder="Es. Scienza" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Slug</label>
                      <input value={catSlug} onChange={(e) => setCatSlug(e.target.value)} className="input" placeholder="es. scienza" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Icona (emoji)</label>
                      <input value={catIcon} onChange={(e) => setCatIcon(e.target.value)} className="input text-2xl" placeholder="🔬" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Colore</label>
                      <div className="flex gap-2 items-center">
                        <input type="color" value={catColor} onChange={(e) => setCatColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer bg-transparent border-0 p-0" />
                        <input value={catColor} onChange={(e) => setCatColor(e.target.value)} className="input flex-1 font-mono" placeholder="#6366f1" />
                      </div>
                    </div>
                  </div>
                  {/* Preview */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-surface/50">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl" style={{ backgroundColor: `${catColor}25`, border: `2px solid ${catColor}60` }}>
                      {catIcon || "?"}
                    </div>
                    <span className="font-medium" style={{ color: catColor }}>{catName || "Nome categoria"}</span>
                  </div>
                  {catError && <div className="bg-danger/10 border border-danger/30 text-danger rounded-lg p-3 text-sm">{catError}</div>}
                  <div className="flex gap-3">
                    <button onClick={saveCategory} className="btn-primary flex-1">{catEditId ? "Salva modifiche" : "Crea categoria"}</button>
                    {catEditId && <button onClick={() => { resetCatForm(); setShowCatForm(false); }} className="btn-secondary flex-1">Annulla</button>}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {categories.map((c) => (
                <div key={c.id} className="card flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ backgroundColor: `${c.color}25`, border: `2px solid ${c.color}60` }}>
                    {c.icon || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold" style={{ color: c.color ?? "#fff" }}>{c.name}</p>
                    <p className="text-sm text-muted">
                      Slug: <span className="font-mono">{c.slug}</span> · {c._count?.questions ?? 0} domande
                    </p>
                  </div>
                  <div className="flex gap-3 flex-shrink-0">
                    <button onClick={() => openEditCat(c)} className="text-accent hover:underline text-sm">Modifica</button>
                    <button onClick={() => deleteCategory(c.id)} className="text-danger hover:underline text-sm">Elimina</button>
                  </div>
                </div>
              ))}
              {categories.length === 0 && <div className="text-center py-12 text-muted">Nessuna categoria. Creane una per iniziare.</div>}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
