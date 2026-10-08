"use client";
import { useEffect, useRef, useState } from "react";
import {
  Atom,
  BookOpen,
  Check,
  ChevronDown,
  CircleHelp,
  FileImage,
  ImagePlus,
  Lightbulb,
  LoaderCircle,
  Mic,
  PencilLine,
  Plus,
  Sigma,
  Sparkles,
  Square,
  Upload,
  X,
} from "lucide-react";
import { Brand } from "@/components/ui/brand";
import { useVoiceInput } from "../hooks/use-voice-input";
import { solveProblem } from "../services/solver";
import type { ExplanationLevel, InputMode, Solution, Subject } from "../types";
import { SolutionCard } from "./solution-card";
const example: Solution = {
  id: "linear-example",
  title: "Solve 2x + 6 = 14",
  answer: "x = 4",
  steps: [
    {
      title: "Get the x term on its own",
      explanation: "Subtract 6 from both sides.",
      expression: "2x = 14 − 6 = 8",
    },
    {
      title: "Find the value of x",
      explanation: "Divide both sides by 2.",
      expression: "x = 8 ÷ 2 = 4",
    },
  ],
  note: "A quick check: 2(4) + 6 = 14. It works.",
};
const suggestions = [
  {
    topic: "ALGEBRA",
    label: "Find the unknown",
    text: "Solve 2x + 6 = 14",
    subject: "mathematics" as Subject,
    icon: Sigma,
  },
  {
    topic: "PHYSICS",
    label: "Make sense of motion",
    text: "A car starts from rest and accelerates at 2 m/s² for 5 seconds. What is its final velocity?",
    subject: "physics" as Subject,
    icon: Atom,
  },
  {
    topic: "CALCULUS",
    label: "Take it one step further",
    text: "Find the derivative of f(x) = x³ + 2x² − 5x.",
    subject: "mathematics" as Subject,
    icon: BookOpen,
  },
];
export function SolverWorkspace() {
  const [subject, setSubject] = useState<Subject>("mathematics");
  const [level, setLevel] = useState<ExplanationLevel>("step-by-step");
  const [mode, setMode] = useState<InputMode>("text");
  const [problem, setProblem] = useState("");
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [showExample, setShowExample] = useState(false);
  const [solution, setSolution] = useState<Solution>();
  const [help, setHelp] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const upload = useRef<HTMLInputElement>(null);
  const controller = useRef<AbortController | null>(null);
  const voice = useVoiceInput((text) => {
    setProblem((previous) =>
      (previous ? previous + " " : "").concat(text).slice(0, 5000),
    );
    setMessage("");
  });
  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => () => controller.current?.abort(), []);
  function selectFile(selected?: File) {
    if (!selected) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(selected.type) ||
      selected.size > 10 * 1024 * 1024
    ) {
      setMessage("Choose a JPG, PNG, or WebP image under 10 MB.");
      return;
    }
    setFile(selected);
    setMessage("");
  }
  function changeMode(next: InputMode) {
    voice.stop();
    setMode(next);
    setMessage("");
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (!problem.trim() && !file) {
      setMessage("Add a problem or an image to get started.");
      input.current?.focus();
      return;
    }
    voice.stop();
    setBusy(true);
    setMessage("");
    setSolution(undefined);
    controller.current = new AbortController();
    const timer = setTimeout(() => controller.current?.abort(), 120000);
    try {
      const result = await solveProblem(
        { problem, subject, explanationLevel: level, image: file },
        controller.current.signal,
      );
      if (result.ok) setSolution(result.solution);
      else setMessage(result.message);
    } catch (error) {
      setMessage(
        error instanceof Error && error.name === "AbortError"
          ? "The solver timed out. Your problem is still in the editor; please try again."
          : error instanceof Error ? error.message : "We couldn’t connect to the solver. Please try again.",
      );
    } finally {
      clearTimeout(timer);
      setBusy(false);
    }
  }
  return (
    <>
      <a className="skip-link" href="#problem">
        Skip to problem editor
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Brand />
          <div className="header-divider" />
          <span className="header-caption">
            A little clarity goes a long way.
          </span>
          <button
            className="help-button"
            onClick={() => setHelp(!help)}
            aria-expanded={help}
          >
            <CircleHelp size={17} />
            <span>How Solvy works</span>
          </button>
        </div>
      </header>
      {help && (
        <aside className="help-panel">
          <strong>Start with what you’re stuck on.</strong>
          <p>
            Choose your subject, enter a problem, and pick how much explanation
            you want. Images stay in your browser until you submit. Voice uses
            your browser’s speech service and may send audio to that service. Supported equations and net-force problems use checked calculations. Other
            problems and images use AI, with verification status shown in the result.
          </p>
          <button onClick={() => setHelp(false)}>Got it</button>
        </aside>
      )}
      <main className="workspace">
        <section className="intro">
          <div className="eyebrow">
            <span className="eyebrow-line" />
            LESS CONFUSION. MORE UNDERSTANDING.
          </div>
          <h1>
            Big questions.
            <br />
            <span>Simple solutions.</span>
          </h1>
          <p>
            Math or physics. Start where you are.
            <br className="mobile-break" /> We’ll help you see the next step.
          </p>
        </section>
        <div className="work-area">
          <div className="main-column">
            <form className="problem-card" onSubmit={submit}>
              <div className="card-title">
                <div>
                  <span className="section-number">01</span>
                  <h2>What are we solving?</h2>
                </div>
                <span className="small-note">One problem at a time</span>
              </div>
              <fieldset className="subject-picker">
                <legend className="sr-only">Subject</legend>
                {(["mathematics", "physics"] as Subject[]).map((value) => (
                  <label
                    key={value}
                    className={
                      subject === value ? "subject selected" : "subject"
                    }
                  >
                    <input
                      type="radio"
                      name="subject"
                      value={value}
                      checked={subject === value}
                      onChange={() => setSubject(value)}
                    />
                    {value === "mathematics" ? (
                      <Sigma size={19} />
                    ) : (
                      <Atom size={19} />
                    )}
                    <span>
                      {value === "mathematics" ? "Mathematics" : "Physics"}
                    </span>
                    {subject === value && <Check size={15} />}
                  </label>
                ))}
              </fieldset>
              <div className="editor">
                <div
                  className="input-tabs"
                  role="group"
                  aria-label="Input method"
                >
                  {[
                    {
                      value: "text",
                      label: "Type a problem",
                      icon: PencilLine,
                    },
                    { value: "image", label: "Upload image", icon: ImagePlus },
                    { value: "voice", label: "Use voice", icon: Mic },
                  ].map((item) => (
                    <button
                      type="button"
                      key={item.value}
                      aria-pressed={mode === item.value}
                      className={
                        mode === item.value ? "input-tab active" : "input-tab"
                      }
                      onClick={() => changeMode(item.value as InputMode)}
                    >
                      <item.icon size={16} />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
                {mode === "image" && !file && (
                  <button
                    type="button"
                    className="upload-zone"
                    onClick={() => upload.current?.click()}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      selectFile(event.dataTransfer.files[0]);
                    }}
                  >
                    <Upload size={24} />
                    <strong>Drop a problem here, or browse</strong>
                    <span>JPG, PNG or WebP · Up to 10 MB</span>
                  </button>
                )}
                <input
                  ref={upload}
                  className="sr-only"
                  tabIndex={-1}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  aria-label="Choose a problem image"
                  onChange={(event) => {
                    selectFile(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
                {file && (
                  <div className="image-preview">
                    {/* User-selected object URL; not a remotely hosted asset. */}
                    <img
                      src={preview || undefined}
                      alt="Your uploaded problem"
                    />
                    <span>
                      <FileImage size={16} />
                      {file.name}
                    </span>
                    <button
                      type="button"
                      aria-label="Remove image"
                      onClick={() => setFile(undefined)}
                    >
                      <X size={17} />
                    </button>
                  </div>
                )}
                {mode === "voice" && (
                  <div className="voice-zone">
                    <button
                      type="button"
                      className={
                        voice.listening ? "mic-button listening" : "mic-button"
                      }
                      aria-label={
                        voice.listening ? "Stop listening" : "Start voice input"
                      }
                      onClick={voice.listening ? voice.stop : voice.start}
                    >
                      {voice.listening ? (
                        <Square size={23} />
                      ) : (
                        <Mic size={23} />
                      )}
                    </button>
                    <strong>
                      {voice.listening
                        ? "Listening… take your time."
                        : "Say your problem out loud"}
                    </strong>
                    <span>
                      Tap the microphone, then review your transcript below.
                    </span>
                    {voice.error && <p role="alert">{voice.error}</p>}
                  </div>
                )}
                <label htmlFor="problem" className="sr-only">
                  {mode === "voice" ? "Problem transcript" : "Your problem"}
                </label>
                <textarea
                  id="problem"
                  ref={input}
                  value={problem}
                  maxLength={5000}
                  onChange={(event) => {
                    setProblem(event.target.value);
                    setMessage("");
                  }}
                  placeholder={
                    mode === "image"
                      ? "Add any extra context (optional)…"
                      : mode === "voice"
                        ? "Your words will appear here. You can edit them before solving…"
                        : "Type or paste your problem here…\n\nFor example: How do I solve 2x + 6 = 14?"
                  }
                  className={mode === "text" ? "" : "compact-editor"}
                />
                <div className="editor-bottom">
                  <span>Words, equations, or a little of both.</span>
                  <span>{problem.length.toLocaleString()} / 5,000</span>
                </div>
              </div>
              <div className="preferences">
                <div className="explanation-label">
                  <Lightbulb size={18} />
                  <label htmlFor="level">Explain it to me</label>
                </div>
                <div className="select-wrapper">
                  <select
                    id="level"
                    value={level}
                    onChange={(event) =>
                      setLevel(event.target.value as ExplanationLevel)
                    }
                  >
                    <option value="simple">Keep it simple</option>
                    <option value="step-by-step">Step by step</option>
                    <option value="deep-dive">Go deeper</option>
                  </select>
                  <ChevronDown size={16} />
                </div>
              </div>
              <div className="form-footer">
                <span>
                  <Check size={15} /> Understanding comes first.
                </span>
                <button className="solve-button" disabled={busy} type="submit">
                  {busy ? (
                    <LoaderCircle className="spin" size={18} />
                  ) : (
                    <Sparkles size={18} />
                  )}{" "}
                  {busy ? "Working on it…" : "Let’s solve it"}
                </button>
              </div>
              {message && (
                <div className="form-message" role="status">
                  {message}
                </div>
              )}
            </form>
            <section className="try-section" aria-labelledby="try-heading">
              <div className="try-heading">
                <h2 id="try-heading">A little inspiration to get started</h2>
                <span>TRY A PROBLEM</span>
              </div>
              <div className="suggestions">
                {suggestions.map((item) => (
                  <button
                    key={item.topic}
                    className="suggestion"
                    onClick={() => {
                      setProblem(item.text);
                      setSubject(item.subject);
                      changeMode("text");
                      setFile(undefined);
                      input.current?.focus();
                    }}
                  >
                    <span className="suggestion-top">
                      <item.icon size={20} />
                      <Plus size={14} />
                    </span>
                    <span className="topic">{item.topic}</span>
                    <strong>{item.label}</strong>
                  </button>
                ))}
              </div>
            </section>
          </div>
          <aside className="study-sidebar">
            <div className="principle-card">
              <span className="principle-icon">
                <Sparkles size={22} />
              </span>
              <div className="tiny-label">THE SOLVY WAY</div>
              <h2>
                The simplest path
                <br />
                to “I get it.”
              </h2>
              <p>
                A good solution doesn’t need to be complicated. It just needs to
                make sense.
              </p>
              <div className="principles">
                <div>
                  <span>01</span>
                  <p>
                    <strong>Start with the essentials</strong>Only the ideas you
                    need.
                  </p>
                </div>
                <div>
                  <span>02</span>
                  <p>
                    <strong>Make every step count</strong>Clear reasoning, no
                    big leaps.
                  </p>
                </div>
                <div>
                  <span>03</span>
                  <p>
                    <strong>Leave with understanding</strong>More than just an
                    answer.
                  </p>
                </div>
              </div>
              <div className="notebook-note">
                <span>Less noise.</span>
                <br />
                More <em>aha.</em>
                <span className="note-star" aria-hidden="true">
                  ✳
                </span>
              </div>
            </div>
            <button
              className="example-toggle"
              aria-expanded={showExample}
              onClick={() => setShowExample(!showExample)}
            >
              <BookOpen size={19} />
              <span>
                {showExample ? "Hide worked example" : "See a worked example"}
              </span>
              <ChevronDown className={showExample ? "rotate" : ""} size={17} />
            </button>
          </aside>
        </div>
        {(showExample || solution) && (
          <section className="result-area" aria-label="Solution">
            <SolutionCard
              solution={solution ?? example}
              isExample={!solution}
            />
          </section>
        )}
        <footer className="page-footer">
          <span>Made for the moment it clicks.</span>
          <span>
            Mathematics & physics <span className="footer-dot">·</span> Solvy
          </span>
        </footer>
      </main>
    </>
  );
}
