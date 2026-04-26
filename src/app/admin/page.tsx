"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import YouTubeEmbed, { extractYouTubeId } from "@/components/YouTubeEmbed";
import MediaDisplay from "@/components/MediaDisplay";
import {
  QUESTION_TYPE_LIST,
  QUESTION_TYPE_META,
  isQuestionType,
  type QuestionType,
} from "@/lib/questionTypes";

type Category = {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  color?: string | null;
  parentId?: string | null;
  _count?: { questions: number };
};

type Question = {
  id: string;
  text: string;
  type: string;
  difficulty: string;
  timeLimit: number;
  points: number;
  openAnswer?: string | null;
  wordTemplate?: string | null;
  imageUrl?: string | null;
  mediaType?: string | null;
  category: Category;
  answers: { id: string; text: string; isCorrect: boolean; order: number }[];
};

type Tab = "questions" | "categories" | "import";

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
  // null = crea nuova; stringa = modifica domanda esistente (PUT sul suo id)
  const [qEditId, setQEditId] = useState<string | null>(null);
  const [qText, setQText] = useState("");
  const [qType, setQType] = useState<QuestionType>("MULTIPLE_CHOICE");
  // Reazione a catena: 3 indizi progressivi
  const [qClues, setQClues] = useState<string[]>(["", "", ""]);
  // Only Connect: 4 elementi con link comune
  const [qItems, setQItems] = useState<string[]>(["", "", "", ""]);
  const [qCategory, setQCategory] = useState("");
  const [qDifficulty, setQDifficulty] = useState<"EASY" | "MEDIUM" | "HARD">("MEDIUM");
  const [qTimeLimit, setQTimeLimit] = useState(20);
  // Punti base: default 1000. In Jeopardy è anche il valore cella.
  const [qPoints, setQPoints] = useState(1000);
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
  const [catParentId, setCatParentId] = useState<string>(""); // "" = root
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
    setQEditId(null);
    setQText(""); setQType("MULTIPLE_CHOICE"); setQDifficulty("MEDIUM"); setQTimeLimit(20); setQPoints(1000);
    setQAnswers([{ text: "", isCorrect: true }, { text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }]);
    setQOpenAnswer(""); setQWordTemplate(""); setQClues(["", "", ""]); setQItems(["", "", "", ""]); setQMediaUrl(null); setQMediaType(null);
    setQMediaMode("upload"); setQUrlInput(""); setQFormError("");
  };

  // Apre il form in modalità modifica per una domanda esistente, pre-riempendo
  // tutti i campi coerentemente col suo `type`. Al submit farà PUT su /questions/{id}.
  const openEditQuestion = (q: Question) => {
    const t = (isQuestionType(q.type) ? q.type : "MULTIPLE_CHOICE") as QuestionType;
    setQEditId(q.id);
    setQText(q.text);
    setQType(t);
    setQCategory(q.category.id);
    setQDifficulty((q.difficulty as "EASY" | "MEDIUM" | "HARD") ?? "MEDIUM");
    setQTimeLimit(q.timeLimit);
    setQPoints(q.points ?? 1000);
    setQMediaUrl(q.imageUrl ?? null);
    setQMediaType(q.mediaType ?? null);
    setQMediaMode(q.mediaType === "youtube" ? "youtube" : q.imageUrl ? "url" : "upload");
    setQUrlInput("");
    setQFormError("");
    // Pre-riempi i campi specifici del tipo
    const sortedAnswers = [...q.answers].sort((a, b) => a.order - b.order);
    if (t === "MULTIPLE_CHOICE") {
      const padded = [...sortedAnswers];
      while (padded.length < 4) padded.push({ id: "", text: "", isCorrect: false, order: padded.length });
      setQAnswers(padded.slice(0, 4).map((a) => ({ text: a.text, isCorrect: a.isCorrect })));
      setQOpenAnswer("");
      setQWordTemplate("");
    } else if (t === "WORD_COMPLETION") {
      setQOpenAnswer(sortedAnswers[0]?.text ?? "");
      setQWordTemplate(q.wordTemplate ?? "");
    } else if (t === "REACTION_CHAIN") {
      setQOpenAnswer(q.openAnswer ?? "");
      const clues = sortedAnswers.slice(0, 3).map((a) => a.text);
      while (clues.length < 3) clues.push("");
      setQClues(clues);
    } else if (t === "ONLY_CONNECT") {
      setQOpenAnswer(q.openAnswer ?? "");
      const items = sortedAnswers.slice(0, 4).map((a) => a.text);
      while (items.length < 4) items.push("");
      setQItems(items);
    } else {
      // OPEN_ANSWER, IMAGE_GUESS, GHIGLIOTTINA, CLUE_REVEAL: solo openAnswer
      setQOpenAnswer(q.openAnswer ?? "");
    }
    setShowQForm(true);
    // Scroll al form per chiarezza UI
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveQuestion = async () => {
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
    if (qType === "REACTION_CHAIN") {
      if (!qOpenAnswer.trim()) { setQFormError("Inserisci la parola da indovinare"); return; }
      if (qClues.some((c) => !c.trim())) { setQFormError("Compila tutti e 3 gli indizi"); return; }
    }
    if (qType === "CLUE_REVEAL") {
      if (!qOpenAnswer.trim()) { setQFormError("Inserisci la risposta attesa"); return; }
      if (!qMediaUrl) { setQFormError("Carica un'immagine da rivelare"); return; }
    }
    if (qType === "ONLY_CONNECT") {
      if (!qOpenAnswer.trim()) { setQFormError("Inserisci il link/collegamento"); return; }
      if (qItems.some((x) => !x.trim())) { setQFormError("Compila tutti e 4 gli elementi"); return; }
    }

    const body: Record<string, unknown> = {
      text: qText.trim(), type: qType, difficulty: qDifficulty, categoryId: qCategory,
      timeLimit: qTimeLimit, points: qPoints, imageUrl: qMediaUrl, mediaType: qMediaType,
    };
    if (qType === "MULTIPLE_CHOICE") body.answers = qAnswers;
    else if (qType === "WORD_COMPLETION") {
      body.wordTemplate = qWordTemplate.trim().toUpperCase();
      body.answers = [{ text: qOpenAnswer.trim().toUpperCase(), isCorrect: true }];
    } else if (qType === "REACTION_CHAIN") {
      body.openAnswer = qOpenAnswer.trim();
      body.answers = qClues.map((c) => ({ text: c.trim(), isCorrect: false }));
    } else if (qType === "CLUE_REVEAL") {
      body.openAnswer = qOpenAnswer.trim();
    } else if (qType === "ONLY_CONNECT") {
      body.openAnswer = qOpenAnswer.trim();
      body.answers = qItems.map((x) => ({ text: x.trim(), isCorrect: false }));
    } else body.openAnswer = qOpenAnswer.trim() || null;

    const url = qEditId ? `/api/admin/questions/${qEditId}` : "/api/admin/questions";
    const method = qEditId ? "PUT" : "POST";
    const res = await fetch(url, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
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
  const resetCatForm = () => { setCatEditId(null); setCatName(""); setCatSlug(""); setCatIcon(""); setCatColor("#6366f1"); setCatParentId(""); setCatError(""); };

  const openEditCat = (c: Category) => {
    setCatEditId(c.id); setCatName(c.name); setCatSlug(c.slug); setCatIcon(c.icon ?? ""); setCatColor(c.color ?? "#6366f1"); setCatParentId(c.parentId ?? ""); setShowCatForm(true);
  };

  const saveCategory = async () => {
    setCatError("");
    if (!catName.trim() || !catSlug.trim()) { setCatError("Nome e slug obbligatori"); return; }
    const url = catEditId ? `/api/admin/categories/${catEditId}` : "/api/admin/categories";
    const res = await fetch(url, {
      method: catEditId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: catName.trim(),
        slug: catSlug.trim(),
        icon: catIcon.trim() || null,
        color: catColor,
        parentId: catParentId || null,
      }),
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
          <Link href="/" className="apple-link text-sm mb-4 inline-flex">‹ Home</Link>
          <h1 className="text-3xl font-semibold tracking-tight mb-2">Area admin.</h1>
          <p className="text-muted mb-6">Accedi per gestire categorie e domande.</p>
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
        <div className="flex items-end justify-between mb-8">
          <div>
            <Link href="/" className="apple-link text-sm mb-3 inline-flex">‹ Home</Link>
            <p className="chip-gold mt-2 mb-1 inline-flex">Regia</p>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">Gestione quiz.</h1>
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
          <div className="card">
            <p className="text-muted text-sm">Auto-valutate</p>
            <p className="text-3xl font-bold text-accent">
              {questions.filter((q) => isQuestionType(q.type) && !QUESTION_TYPE_META[q.type].requiresJudging).length}
            </p>
          </div>
          <div className="card">
            <p className="text-muted text-sm">Giudizio host</p>
            <p className="text-3xl font-bold text-warning">
              {questions.filter((q) => isQuestionType(q.type) && QUESTION_TYPE_META[q.type].requiresJudging).length}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-border">
          {(["questions", "categories", "import"] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${tab === t ? "bg-surface text-white border-b-2 border-accent" : "text-muted hover:text-white"}`}>
              {t === "questions" ? `Domande (${questions.length})` : t === "categories" ? `Categorie (${categories.length})` : "📥 Importa"}
            </button>
          ))}
        </div>

        {/* ── DOMANDE ── */}
        {tab === "questions" && (
          <>
            <div className="flex justify-end mb-4">
              <button onClick={() => { if (showQForm) { setShowQForm(false); resetQForm(); } else { resetQForm(); setShowQForm(true); } }} className="btn-primary">
                {showQForm ? (qEditId ? "Annulla modifica" : "Chiudi") : "+ Nuova domanda"}
              </button>
            </div>

            {showQForm && (
              <div className="card mb-6 animate-slide-up">
                <h2 className="text-xl font-bold mb-4">{qEditId ? "Modifica domanda" : "Nuova domanda"}</h2>
                <div className="space-y-4">
                  {/* Tipo */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Tipo domanda</label>
                    <div className="grid grid-cols-2 gap-2">
                      {QUESTION_TYPE_LIST.map((meta) => (
                        <button key={meta.type} type="button"
                          onClick={() => { setQType(meta.type); setQTimeLimit(meta.defaultTimeLimit); resetQForm(); setQType(meta.type); }}
                          className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-colors text-left ${qType === meta.type ? "border-accent bg-accent/20 text-white" : "border-border text-muted hover:border-white"}`}>
                          {meta.icon} {meta.label}
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

                  {/* Tempo + Punti */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Tempo limite: {qTimeLimit}s</label>
                      <input type="range" min={5} max={60} value={qTimeLimit} onChange={(e) => setQTimeLimit(Number(e.target.value))} className="w-full accent-accent" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Punti base: {qPoints}</label>
                      <input type="range" min={100} max={2000} step={50} value={qPoints} onChange={(e) => setQPoints(Number(e.target.value))} className="w-full accent-accent" />
                      <p className="text-[10px] text-muted mt-0.5">In Jeopardy questo è anche il valore della cella.</p>
                    </div>
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

                  {/* Only Connect: 4 elementi + link */}
                  {qType === "ONLY_CONNECT" && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">Il link/collegamento (riferimento admin)</label>
                        <input value={qOpenAnswer} onChange={(e) => setQOpenAnswer(e.target.value)}
                          className="input" placeholder="Es. Opere di Shakespeare" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">4 elementi con qualcosa in comune</label>
                        {qItems.map((x, i) => (
                          <input
                            key={i}
                            value={x}
                            onChange={(e) => setQItems(qItems.map((v, idx) => (idx === i ? e.target.value : v)))}
                            className="input mb-2"
                            placeholder={`Elemento ${i + 1}`}
                          />
                        ))}
                        <p className="text-xs text-muted">I giocatori devono trovare il link. Giudica tu se la risposta è corretta.</p>
                      </div>
                    </div>
                  )}

                  {/* Indizio svelato: immagine + risposta */}
                  {qType === "CLUE_REVEAL" && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Risposta attesa</label>
                      <input value={qOpenAnswer} onChange={(e) => setQOpenAnswer(e.target.value)}
                        className="input" placeholder="Es. Colosseo" />
                      <p className="text-xs text-muted mt-1">
                        L&apos;immagine verrà mostrata inizialmente sfocata e si schiarirà col passare del tempo. Carica l&apos;immagine qui sopra.
                      </p>
                    </div>
                  )}

                  {/* Reazione a catena: 3 indizi + parola */}
                  {qType === "REACTION_CHAIN" && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">Parola da indovinare</label>
                        <input value={qOpenAnswer} onChange={(e) => setQOpenAnswer(e.target.value)}
                          className="input" placeholder="Es. NAPOLI" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">3 indizi progressivi</label>
                        <p className="text-xs text-muted mb-2">
                          Il primo è vago, gli altri più diretti. Più presto indovina, più punti prende.
                        </p>
                        {qClues.map((c, i) => (
                          <input
                            key={i}
                            value={c}
                            onChange={(e) => setQClues(qClues.map((x, idx) => (idx === i ? e.target.value : x)))}
                            className="input mb-2"
                            placeholder={`Indizio ${i + 1}`}
                          />
                        ))}
                      </div>
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
                  <button onClick={saveQuestion} className="btn-primary w-full">
                    {qEditId ? "Salva modifiche" : "Salva domanda"}
                  </button>
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
                {QUESTION_TYPE_LIST.map((meta) => (
                  <option key={meta.type} value={meta.type}>{meta.icon} {meta.label}</option>
                ))}
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
                        {(() => {
                          const meta = isQuestionType(q.type) ? QUESTION_TYPE_META[q.type] : null;
                          return (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                              {meta ? `${meta.icon} ${meta.label}` : `❓ ${q.type}`}
                            </span>
                          );
                        })()}
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
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <button onClick={() => openEditQuestion(q)} className="text-accent hover:underline text-sm">Modifica</button>
                      <button onClick={() => deleteQuestion(q.id)} className="text-danger hover:underline text-sm">Elimina</button>
                    </div>
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
                  <div>
                    <label className="block text-sm font-medium mb-1">Categoria padre (facoltativo)</label>
                    <select value={catParentId} onChange={(e) => setCatParentId(e.target.value)} className="input">
                      <option value="">— Nessuna (categoria root) —</option>
                      {categories.filter((c) => !c.parentId && c.id !== catEditId).map((c) => (
                        <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                      ))}
                    </select>
                    <p className="text-xs text-muted mt-1">Se scelto, questa diventa una sotto-categoria (es. &ldquo;Storia → Storia Antica&rdquo;).</p>
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

            <div className="space-y-2">
              {(() => {
                // Raggruppa in albero: root + children[]
                const rootCats = categories.filter((c) => !c.parentId);
                const childrenOf = (id: string) => categories.filter((c) => c.parentId === id);
                const renderCat = (c: Category, depth: number) => (
                  <div key={c.id}>
                    <div className={`card flex items-center gap-4 ${depth > 0 ? "bg-surface/50" : ""}`} style={{ marginLeft: depth * 24 }}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                        style={{ backgroundColor: `${c.color}25`, border: `2px solid ${c.color}60` }}>
                        {c.icon || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold ${depth > 0 ? "text-sm" : ""}`} style={{ color: c.color ?? "#fff" }}>
                          {depth > 0 && <span className="text-muted mr-1">↳</span>}
                          {c.name}
                        </p>
                        <p className="text-xs text-muted">
                          <span className="font-mono">{c.slug}</span> · {c._count?.questions ?? 0} domande
                        </p>
                      </div>
                      <div className="flex gap-3 flex-shrink-0 text-sm">
                        <button onClick={() => openEditCat(c)} className="text-accent hover:underline">Modifica</button>
                        <button onClick={() => deleteCategory(c.id)} className="text-danger hover:underline">Elimina</button>
                      </div>
                    </div>
                    {childrenOf(c.id).map((child) => renderCat(child, depth + 1))}
                  </div>
                );
                return rootCats.map((c) => renderCat(c, 0));
              })()}
              {categories.length === 0 && <div className="text-center py-12 text-muted">Nessuna categoria. Creane una per iniziare.</div>}
            </div>
          </>
        )}

        {/* ── IMPORTA DOMANDE (bulk JSON) ── */}
        {tab === "import" && <BulkImportTab onDone={() => loadData()} />}
      </div>
    </main>
  );
}

// Componente per il bulk import delle domande (JSON).
function BulkImportTab({ onDone }: { onDone: () => void }) {
  const [jsonText, setJsonText] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number; errors: Array<{ index: number; error: string }> } | null>(null);
  const [error, setError] = useState<string>("");

  const example = `{
  "questions": [
    {
      "text": "Chi ha dipinto la Gioconda?",
      "type": "MULTIPLE_CHOICE",
      "difficulty": "EASY",
      "timeLimit": 20,
      "points": 1000,
      "categorySlug": "storia",
      "answers": [
        { "text": "Leonardo da Vinci", "isCorrect": true },
        { "text": "Michelangelo", "isCorrect": false },
        { "text": "Raffaello", "isCorrect": false },
        { "text": "Caravaggio", "isCorrect": false }
      ]
    },
    {
      "text": "Qual è la capitale della Germania?",
      "type": "OPEN_ANSWER",
      "difficulty": "MEDIUM",
      "categorySlug": "geografia-europa",
      "openAnswer": "Berlino"
    }
  ]
}`;

  const importJson = async () => {
    setError(""); setResult(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      setError("JSON non valido. Controlla la sintassi."); return;
    }
    setLoading(true);
    const res = await fetch("/api/admin/questions/bulk-import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed),
    });
    setLoading(false);
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Errore importazione"); return; }
    setResult(data);
    onDone();
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setJsonText(text);
  };

  const loadExample = () => setJsonText(example);

  return (
    <div className="card space-y-4">
      <div>
        <h2 className="text-xl font-bold mb-2">Importa domande in bulk</h2>
        <p className="text-muted text-sm">
          Incolla un array JSON di domande oppure carica un file <span className="font-mono">.json</span>.
          Collegamento alla categoria tramite <span className="font-mono">categorySlug</span> (es. &ldquo;storia-moderna&rdquo;) o <span className="font-mono">categoryId</span>.
        </p>
      </div>
      <div className="flex gap-2 flex-wrap">
        <button onClick={loadExample} className="btn-secondary text-sm">Carica esempio</button>
        <label className="btn-secondary text-sm cursor-pointer">
          Carica file .json
          <input type="file" accept="application/json" onChange={onFile} className="hidden" />
        </label>
      </div>
      <textarea
        value={jsonText}
        onChange={(e) => setJsonText(e.target.value)}
        placeholder={"{ \"questions\": [ ... ] }"}
        rows={16}
        className="input font-mono text-sm"
      />
      {error && <div className="bg-danger/10 border border-danger/30 text-danger rounded-lg p-3 text-sm">{error}</div>}
      {result && (
        <div className="bg-success/10 border border-success/30 rounded-lg p-4 text-sm">
          <p className="font-semibold text-success mb-2">✓ Importazione completata</p>
          <p>Create: <b>{result.created}</b> · Scartate: <b>{result.skipped}</b></p>
          {result.errors.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-muted">{result.errors.length} errori</summary>
              <ul className="mt-2 space-y-1">
                {result.errors.map((err, i) => (
                  <li key={i} className="text-danger">
                    [#{err.index}] {err.error}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
      <button onClick={importJson} disabled={loading || !jsonText.trim()} className="btn-primary w-full">
        {loading ? "Importazione..." : "Importa"}
      </button>
    </div>
  );
}
