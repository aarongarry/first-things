import { useEffect, useRef, useState } from "react";
import { Check, Calendar, Loader2 } from "lucide-react";
import { ALL_APPS, milestones, toneLine, uid, useStore, type Tone } from "@/lib/store";
import { AppIcon, Btn, Bubble, Field, George, Step } from "./kit";
import { suggestFor } from "./suggest";
import { cn } from "@/lib/utils";

const ORDER = ["welcome", "confirm", "tone", "chat", "goal", "calendar", "apps", "breaks", "tutorial", "suggest"];

function useNav() {
  const { s, dispatch } = useStore();
  const i = ORDER.indexOf(s.stage);
  return {
    i,
    next: () => dispatch({ type: "set", patch: { stage: ORDER[i + 1] ?? "app" } }),
    back: () => dispatch({ type: "set", patch: { stage: ORDER[i - 1] ?? "welcome" } }),
    go: (stage: string) => dispatch({ type: "set", patch: { stage } }),
  };
}

export function Onboarding() {
  const { s } = useStore();
  const M: Record<string, () => React.ReactElement> = {
    welcome: Welcome, confirm: Confirm, tone: ToneStep, chat: Chat, goal: GoalStep,
    calendar: CalendarStep, apps: AppsStep, breaks: BreaksStep, tutorial: Tutorial, suggest: Suggest,
  };
  const C = M[s.stage] ?? Welcome;
  return <div className="flex h-full flex-col overflow-y-auto no-scrollbar px-5 pb-6 pt-3"><C /></div>;
}

/* 1 */
function Welcome() {
  const { s, dispatch } = useStore();
  const { next } = useNav();
  const [name, setName] = useState(s.name);
  const [phone, setPhone] = useState(s.phone);
  const [err, setErr] = useState<{ name?: string | undefined; phone?: string | undefined }>({});
  const submit = () => {
    const e: typeof err = {};
    if (!name.trim()) e.name = "Please tell us what to call you.";
    const digits = phone.replace(/\D/g, "");
    if (!digits) e.phone = "We need a phone number to send your sign-in code.";
    else if (digits.length !== 10 && !(digits.length === 11 && digits[0] === "1")) e.phone = "That doesn't look like a full number — try 10 digits, like (555) 201-4433.";
    setErr(e);
    if (Object.keys(e).length) return;
    dispatch({ type: "set", patch: { name: name.trim(), phone } });
    next();
  };
  return (
    <div className="flex flex-1 flex-col">
      <div className="mt-6 flex flex-col items-center text-center">
        <George size={96} className="animate-bob" />
        <h1 className="mt-4 text-3xl font-extrabold">First Things</h1>
        <p className="mt-2 text-sm text-muted-foreground">Do what matters first. Your distracting apps unlock as you make real progress on your goals.</p>
      </div>
      <ul className="my-6 space-y-2 text-sm">
        {["Plan a short daily list with George, your AI sidekick", "Finish tasks to earn 10-minute breaks", "Clear the list and your apps unlock until midnight"].map((t) => (
          <li key={t} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 text-success" />{t}</li>
        ))}
      </ul>
      <div className="space-y-3">
        <Field label="Your name" placeholder="e.g. Maya" value={name} onChange={(e) => setName(e.target.value)} error={err.name} />
        <Field label="Phone number" type="tel" placeholder="(555) 201-4433" value={phone} onChange={(e) => setPhone(e.target.value)} error={err.phone} hint="We'll text you a 6-digit confirmation code next." />
      </div>
      <Btn className="mt-5" onClick={submit}>Send my code</Btn>
      <button className="mt-3 text-xs text-muted-foreground underline" onClick={() => { setName("Maya"); setPhone("(555) 201-4433"); }}>Fill demo details</button>
    </div>
  );
}

/* 2 */
function Confirm() {
  const { s } = useStore();
  const { next, back } = useNav();
  const [code, setCode] = useState("");
  const [sentAt, setSentAt] = useState(() => Date.now());
  const [sending, setSending] = useState(true);
  const [err, setErr] = useState("");
  const [demoCode] = useState("246810");
  useEffect(() => { setSending(true); const t = setTimeout(() => setSending(false), 1200); return () => clearTimeout(t); }, [sentAt]);
  const verify = () => {
    if (code.length !== 6) return setErr("Enter all 6 digits.");
    if (code === "000000") return setErr("That code has expired. Tap “Send a new code” and use the newest one.");
    if (code !== demoCode) return setErr("That code doesn't match. Double-check the text and try again.");
    next();
  };
  return (
    <div className="flex flex-1 flex-col">
      <Step n={1} of={9} onBack={back} />
      <h2 className="text-2xl font-bold">Check your texts</h2>
      <p className="mt-1 text-sm text-muted-foreground">We sent a 6-digit code to <b className="text-foreground">{s.phone}</b>.</p>
      <button onClick={back} className="mt-1 self-start text-xs font-semibold text-primary underline">Wrong number? Edit it</button>

      <div className="my-5 rounded-2xl border border-dashed bg-muted p-3 text-xs">
        <div className="font-semibold">📱 Simulated text message</div>
        {sending ? <div className="mt-1 flex items-center gap-1 text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Sending…</div>
          : <div className="mt-1">First Things: your code is <b>{demoCode}</b>. <span className="text-muted-foreground">(Try 000000 to see an expired code.)</span></div>}
      </div>

      <input inputMode="numeric" maxLength={6} value={code} onChange={(e) => { setCode(e.target.value.replace(/\D/g, "")); setErr(""); }}
        placeholder="••••••" className={cn("w-full rounded-xl border bg-card py-4 text-center font-display text-3xl tracking-[0.5em] outline-none focus:ring-2 focus:ring-ring", err ? "border-destructive" : "border-input")} />
      {err && <p className="mt-2 text-xs text-destructive">{err}</p>}
      <Btn className="mt-4" onClick={verify}>Confirm</Btn>
      <Btn variant="ghost" className="mt-1" onClick={() => setCode(demoCode)} disabled={sending}>Use demo code</Btn>
      <Btn variant="ghost" onClick={() => { setSentAt(Date.now()); setCode(""); setErr(""); }}>Send a new code</Btn>
    </div>
  );
}

/* 3 */
export const TONES: { id: Tone; label: string; desc: string; ex: string }[] = [
  { id: "gentle", label: "Gentle", desc: "Warm, patient, lots of encouragement", ex: "“No pressure — want to try one small thing together?”" },
  { id: "balanced", label: "Balanced", desc: "Friendly with a little push", ex: "“Pick the quickest task and get a win on the board.”" },
  { id: "direct", label: "Direct", desc: "Short, honest, no fluff — always respectful", ex: "“You know what's next. Start it now — 10 focused minutes.”" },
];
export function TonePicker() {
  const { s, dispatch } = useStore();
  return (
    <div className="space-y-2">
      {TONES.map((t) => (
        <button key={t.id} onClick={() => dispatch({ type: "set", patch: { tone: t.id } })}
          className={cn("w-full rounded-2xl border-2 p-3 text-left transition", s.tone === t.id ? "border-primary bg-secondary" : "border-border bg-card")}>
          <div className="flex items-center justify-between"><b>{t.label}</b>{s.tone === t.id && <Check className="h-4 w-4 text-primary" />}</div>
          <div className="text-xs text-muted-foreground">{t.desc}</div>
          <div className="mt-2 text-sm italic">{t.ex}</div>
        </button>
      ))}
    </div>
  );
}
function ToneStep() {
  const { s } = useStore();
  const { next } = useNav();
  return (
    <div className="flex flex-1 flex-col">
      <Step n={2} of={9} />
      <div className="flex items-center gap-3"><George size={64} mood="wink" className="animate-bob" /><h2 className="text-2xl font-bold">Hi {s.name}, I'm George!</h2></div>
      <p className="mt-3 text-sm">I'll help you break big goals into small steps, plan your day, and cheer you on. I'll never add tasks without your OK.</p>
      <p className="mt-4 mb-2 text-sm font-semibold">How should I talk to you?</p>
      <TonePicker />
      <p className="mt-2 text-xs text-muted-foreground">You can change this anytime in Settings.</p>
      <Btn className="mt-auto pt-3" onClick={next}>Sounds good</Btn>
    </div>
  );
}

/* 4 */
const QS = [
  { key: "status", q: "First up — are you in school, working, or both?", chips: ["Full-time student", "Student + part-time job", "Grad student"], required: true },
  { key: "interests", q: "What do you enjoy or care about outside of class?", chips: ["Music", "Sports / fitness", "Gaming", "Art & design"] },
  { key: "routine", q: "What does a typical day look like for you?", chips: ["Classes in the morning", "Classes all afternoon", "Work evenings", "It changes a lot"] },
  { key: "challenge", q: "Last one: what usually gets in the way of following through?", chips: ["Phone / scrolling", "Procrastination", "Too many things at once", "Low energy"] },
] as const;
function Chat() {
  const { s, dispatch } = useStore();
  const { next, back } = useNav();
  const [i, setI] = useState(0);
  const [log, setLog] = useState<{ from: "george" | "user"; text: string }[]>([{ from: "george", text: `Let's chat for a minute so I can actually be useful. Short answers are perfect! ${QS[0]!.q}` }]);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => end.current?.scrollIntoView({ behavior: "smooth" }), [log, typing]);
  const done = i >= QS.length;
  const answer = (val: string) => {
    if (!val.trim() || done) return;
    const q = QS[i]!;
    dispatch({ type: "set", patch: { profile: { ...s.profile, [q.key]: val === "Skip" ? "" : val } } });
    setLog((l) => [...l, { from: "user", text: val }]);
    setText("");
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      const n = i + 1;
      const ack = val === "Skip" ? "No problem!" : ["Got it!", "Love that.", "Helpful, thanks.", "Totally normal — that's exactly what I'm here for."][i];
      setLog((l) => [...l, { from: "george", text: n < QS.length ? `${ack} ${QS[n]!.q}` : `${ack} That's plenty to get started. Now let's name something big you're working toward.` }]);
      setI(n);
    }, 700);
  };
  return (
    <div className="flex flex-1 flex-col">
      <Step n={3} of={9} onBack={back} />
      <div className="flex-1 space-y-3 overflow-y-auto no-scrollbar">
        {log.map((m, k) => <Bubble key={k} from={m.from}>{m.text}</Bubble>)}
        {typing && <Bubble>…</Bubble>}
        <div ref={end} />
      </div>
      {!done ? (
        <div className="pt-3">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {QS[i]!.chips.map((c) => <button key={c} onClick={() => answer(c)} className="rounded-full border bg-card px-3 py-1.5 text-xs hover:bg-muted">{c}</button>)}
            {!("required" in QS[i]!) && <button onClick={() => answer("Skip")} className="rounded-full px-3 py-1.5 text-xs text-muted-foreground underline">Skip</button>}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); answer(text); }} className="flex gap-2">
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type your answer…" className="flex-1 rounded-xl border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
            <Btn disabled={!text.trim() || typing}>Send</Btn>
          </form>
        </div>
      ) : <Btn className="mt-3" onClick={next}>Set my first goal</Btn>}
    </div>
  );
}

/* 5 */
export function GoalForm({ initial, onSave, cta = "Save goal" }: { initial?: { title: string; targetDate: string; why?: string | undefined } | undefined; onSave: (g: { title: string; targetDate: string; why: string }) => void; cta?: string | undefined }) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [date, setDate] = useState(initial?.targetDate ?? "");
  const [why, setWhy] = useState(initial?.why ?? "");
  const [err, setErr] = useState<{ t?: string | undefined; d?: string | undefined }>({});
  return (
    <div className="space-y-3">
      <Field label="Your goal" placeholder="e.g. Raise my GPA to 3.5 this semester" value={title} onChange={(e) => setTitle(e.target.value)} error={err.t} />
      <div className="flex flex-wrap gap-1.5">
        {["Raise my GPA to 3.5", "Land a summer internship", "Run a 5K", "Finish my portfolio"].map((x) => (
          <button key={x} onClick={() => setTitle(x)} className="rounded-full border bg-card px-2.5 py-1 text-xs hover:bg-muted">{x}</button>
        ))}
      </div>
      <Field label="Target date" type="date" value={date} onChange={(e) => setDate(e.target.value)} error={err.d} />
      <Field label="Why it matters (optional)" placeholder="Helps George keep you motivated" value={why} onChange={(e) => setWhy(e.target.value)} />
      <Btn className="w-full" onClick={() => {
        const e: typeof err = {};
        if (!title.trim()) e.t = "Give your goal a name — even a rough one works.";
        if (!date) e.d = "Pick a date you'd like to reach it by. You can change it later.";
        setErr(e);
        if (!Object.keys(e).length) onSave({ title: title.trim(), targetDate: date, why });
      }}>{cta}</Btn>
    </div>
  );
}
function GoalStep() {
  const { s, dispatch } = useStore();
  const { next, back } = useNav();
  return (
    <div className="flex flex-1 flex-col">
      <Step n={4} of={9} onBack={back} />
      <h2 className="text-2xl font-bold">What are you working toward?</h2>
      <div className="my-4 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-secondary p-3"><b className="block text-sm">Broad goal</b>Big, takes weeks or months. <i>“Land an internship”</i></div>
        <div className="rounded-xl bg-george-soft p-3"><b className="block text-sm">Daily task</b>Small, doable today. <i>“Update résumé intro”</i></div>
      </div>
      <p className="mb-3 text-sm text-muted-foreground">Start with one goal. I'll suggest small daily tasks for it — you can add more goals later.</p>
      <GoalForm initial={s.goals[0]} cta="Save goal & continue" onSave={(g) => {
        const id = s.goals[0]?.id ?? uid();
        dispatch({ type: "set", patch: { goals: [{ id, ...g }, ...s.goals.slice(1)] } });
        next();
      }} />
    </div>
  );
}

/* 6 */
export function CalendarConnect({ onDone }: { onDone?: () => void | undefined }) {
  const { s, dispatch } = useStore();
  const [st, setSt] = useState<"idle" | "loading" | "fail">("idle");
  const connect = (fail: boolean) => {
    setSt("loading");
    setTimeout(() => {
      if (fail) return setSt("fail");
      dispatch({ type: "set", patch: { calendar: true } });
      setSt("idle");
      onDone?.();
    }, 1400);
  };
  if (s.calendar) return (
    <div className="rounded-2xl bg-secondary p-4 text-sm">
      <div className="flex items-center gap-2 font-semibold"><Check className="h-4 w-4 text-success" /> Google Calendar connected (simulated)</div>
      <p className="mt-1 text-xs text-muted-foreground">George sees: Bio 201 at 10am, Shift at campus café 4–8pm.</p>
      <Btn variant="danger" className="mt-2 px-0 py-1" onClick={() => dispatch({ type: "set", patch: { calendar: false } })}>Disconnect</Btn>
    </div>
  );
  return (
    <div className="space-y-2">
      {st === "fail" && <div className="rounded-xl bg-destructive/10 p-3 text-xs text-destructive">We couldn't reach Google Calendar. Nothing was changed — try again or skip for now.</div>}
      <Btn variant="outline" className="w-full" disabled={st === "loading"} onClick={() => connect(false)}>
        {st === "loading" ? <><Loader2 className="h-4 w-4 animate-spin" /> Connecting…</> : <><Calendar className="h-4 w-4" /> Connect Google Calendar</>}
      </Btn>
      <button className="w-full text-xs text-muted-foreground underline" disabled={st === "loading"} onClick={() => connect(true)}>Demo: simulate a failed connection</button>
    </div>
  );
}
function CalendarStep() {
  const { s } = useStore();
  const { next, back } = useNav();
  return (
    <div className="flex flex-1 flex-col">
      <Step n={5} of={9} onBack={back} />
      <h2 className="text-2xl font-bold">Share your calendar?</h2>
      <p className="mt-2 text-sm">If you connect it, I can suggest tasks that fit around your classes and shifts. I only read busy times — I never edit or post anything.</p>
      <p className="mt-2 mb-5 text-sm text-muted-foreground">Totally optional. First Things works great without it.</p>
      <CalendarConnect />
      <div className="mt-auto space-y-2 pt-4">
        <Btn className="w-full" onClick={next}>{s.calendar ? "Continue" : "Skip for now"}</Btn>
      </div>
    </div>
  );
}

/* 7 */
export function AppPicker() {
  const { s, dispatch } = useStore();
  const toggle = (id: string) => dispatch({ type: "set", patch: { restricted: s.restricted.includes(id) ? s.restricted.filter((x) => x !== id) : [...s.restricted, id] } });
  return (
    <>
      <div className="grid grid-cols-4 gap-y-4">
        {ALL_APPS.map((a) => (
          <div key={a.id} className={cn("rounded-2xl p-1 transition", s.restricted.includes(a.id) ? "bg-secondary ring-2 ring-primary" : "opacity-60")}>
            <AppIcon {...a} locked={s.restricted.includes(a.id)} onClick={() => toggle(a.id)} />
          </div>
        ))}
      </div>
      {s.restricted.length === 0 && <p className="mt-3 rounded-xl bg-accent p-3 text-xs text-accent-foreground">No apps selected. You can still track tasks and earn celebrations, but nothing will be restricted.</p>}
    </>
  );
}
function AppsStep() {
  const { next, back } = useNav();
  return (
    <div className="flex flex-1 flex-col">
      <Step n={6} of={9} onBack={back} />
      <h2 className="text-2xl font-bold">Which apps distract you?</h2>
      <p className="mt-2 mb-4 text-sm">Tap to choose. These are blocked <b>only while your daily list has unfinished tasks</b> (unless you're on an earned break). Changes apply right away.</p>
      <AppPicker />
      <p className="mt-3 text-[11px] text-muted-foreground">Prototype note: blocking is simulated — this demo doesn't control your real device.</p>
      <Btn className="mt-auto" onClick={next}>Continue</Btn>
    </div>
  );
}

/* 8 */
export function BreakPicker() {
  const { s, dispatch } = useStore();
  const ex = milestones(6, s.breakPref);
  return (
    <>
      <div className="flex items-center justify-center gap-5 py-3">
        <Btn variant="outline" className="h-12 w-12 rounded-full text-xl" onClick={() => dispatch({ type: "set", patch: { breakPref: Math.max(0, s.breakPref - 1) } })}>−</Btn>
        <div className="text-center"><div className="font-display text-5xl font-extrabold">{s.breakPref}</div><div className="text-xs text-muted-foreground">10-min breaks / day</div></div>
        <Btn variant="outline" className="h-12 w-12 rounded-full text-xl" onClick={() => dispatch({ type: "set", patch: { breakPref: Math.min(6, s.breakPref + 1) } })}>+</Btn>
      </div>
      <div className="rounded-2xl bg-card p-3 text-xs">
        <b>Example with 6 tasks:</b>{" "}
        {s.breakPref === 0 ? "No breaks — apps unlock when all 6 are done." :
          <>breaks earned after {ex.map((n) => `${n}`).join(" and ")} completed task{ex.length > 1 ? "s" : ""}. Finish all 6 and everything unlocks.</>}
        <div className="mt-2 flex gap-1">
          {Array.from({ length: 6 }).map((_, k) => (
            <div key={k} className="flex flex-1 flex-col items-center gap-1">
              <div className="h-2 w-full rounded-full bg-primary/70" />
              <span className="h-4 text-[10px]">{ex.includes(k + 1) ? "☕" : k === 5 ? "🔓" : ""}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
function BreaksStep() {
  const { next, back } = useNav();
  return (
    <div className="flex flex-1 flex-col">
      <Step n={7} of={9} onBack={back} />
      <h2 className="text-2xl font-bold">Earn some breaks</h2>
      <p className="mt-2 text-sm">Breaks unlock your apps for 10 minutes. You earn them by making progress, spread evenly through your list, and start them whenever you like.</p>
      <BreakPicker />
      <p className="mt-3 text-xs text-muted-foreground">You can't have more breaks than tasks — with 2 tasks, you'd get at most 2 (and only those that land before the finish).</p>
      <Btn className="mt-auto" onClick={next}>Continue</Btn>
    </div>
  );
}

/* 9 */
function Tutorial() {
  const { s } = useStore();
  const { next, back } = useNav();
  const [done, setDone] = useState(false);
  return (
    <div className="flex flex-1 flex-col">
      <Step n={8} of={9} onBack={back} />
      <span className="self-start rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-accent-foreground">Practice — doesn't count</span>
      <h2 className="mt-2 text-2xl font-bold">Let's try one together</h2>
      <Bubble>{done ? "That's it! In your real list, finishing tasks moves your progress and earns breaks." : "Here's a pretend task. Tap the circle to mark it done."}</Bubble>
      <button onClick={() => setDone(!done)} className={cn("mt-5 flex items-center gap-3 rounded-2xl border-2 border-dashed p-4 text-left transition", done ? "border-success bg-success/10" : "border-primary bg-card")}>
        <span className={cn("grid h-7 w-7 place-items-center rounded-full border-2", done ? "border-success bg-success text-success-foreground" : "border-primary animate-pulse")}>{done && <Check className="h-4 w-4" />}</span>
        <span className={cn("font-medium", done && "line-through text-muted-foreground")}>Take three deep breaths</span>
      </button>
      {done && <div className="mt-4 animate-pop rounded-2xl bg-primary p-4 text-primary-foreground"><b>🎉 {toneLine(s.tone, "done", "Take three deep breaths")}</b><div className="mt-1 text-xs opacity-80">This is how completion feels. Real tasks also show break progress.</div></div>}
      <Btn className="mt-auto" disabled={!done} onClick={next}>{done ? "Got it — see my suggestions" : "Complete the practice task"}</Btn>
    </div>
  );
}

/* 10 */
export function SuggestionReview({ goalId, onFinish, finishLabel }: { goalId?: string | undefined; onFinish: () => void; finishLabel: string }) {
  const { s, dispatch } = useStore();
  const goal = s.goals.find((g) => g.id === goalId) ?? s.goals[0];
  const [salt, setSalt] = useState(0);
  const [items, setItems] = useState(() => suggestFor(goal, s.profile, 0));
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const accept = () => {
    items.filter((x) => picked.has(x.id)).forEach((x) => dispatch({ type: "addTask", task: { title: x.title, duration: x.duration, recurrence: "none", photo: false, goalId: x.goalId } }));
    onFinish();
  };
  return (
    <>
      <Bubble>Based on “{goal?.title}”{s.profile.challenge && ` and what you said about ${s.profile.challenge.toLowerCase()}`}, here are some small steps. Pick the ones you want — nothing is added until you say so.</Bubble>
      <div className="mt-3 space-y-2">
        {loading ? <div className="flex justify-center py-8 text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />George is thinking…</div> :
          items.map((x) => (
            <div key={x.id} className={cn("rounded-2xl border-2 bg-card p-3 transition", picked.has(x.id) ? "border-primary" : "border-border")}>
              {editing === x.id ? (
                <div className="flex gap-2">
                  <input autoFocus defaultValue={x.title} onBlur={(e) => { const v = e.target.value.trim(); if (v) setItems((it) => it.map((y) => (y.id === x.id ? { ...y, title: v } : y))); setEditing(null); }}
                    className="flex-1 rounded-lg border border-input px-2 py-1 text-sm" />
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <button onClick={() => setPicked((p) => { const n = new Set(p); n.has(x.id) ? n.delete(x.id) : n.add(x.id); return n; })}
                    className={cn("mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md border-2", picked.has(x.id) ? "border-primary bg-primary text-primary-foreground" : "border-input")} aria-label={`Accept ${x.title}`}>
                    {picked.has(x.id) && <Check className="h-3.5 w-3.5" />}
                  </button>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{x.title}</div>
                    <div className="text-xs text-muted-foreground">{x.why}{x.duration && ` · ~${x.duration} min`}</div>
                  </div>
                </div>
              )}
              <div className="mt-1 flex justify-end gap-3 text-[11px]">
                <button className="text-primary" onClick={() => setEditing(x.id)}>Edit</button>
                <button className="text-muted-foreground" onClick={() => { setItems((it) => it.filter((y) => y.id !== x.id)); setPicked((p) => { const n = new Set(p); n.delete(x.id); return n; }); }}>Reject</button>
              </div>
            </div>
          ))}
        {!loading && items.length === 0 && <p className="text-center text-sm text-muted-foreground">All suggestions dismissed.</p>}
      </div>
      <button className="mt-2 text-xs font-semibold text-primary" onClick={() => { setLoading(true); setTimeout(() => { const n = salt + 1; setSalt(n); setItems(suggestFor(goal, s.profile, n)); setPicked(new Set()); setLoading(false); }, 900); }}>↻ Suggest different tasks</button>
      <div className="mt-auto space-y-1 pt-4">
        <Btn className="w-full" onClick={accept} disabled={picked.size === 0}>Add {picked.size || ""} to today's list</Btn>
        <Btn variant="ghost" className="w-full" onClick={onFinish}>{finishLabel}</Btn>
      </div>
    </>
  );
}
function Suggest() {
  const { back, go } = useNav();
  return (
    <div className="flex flex-1 flex-col">
      <Step n={9} of={9} onBack={back} />
      <h2 className="mb-3 text-2xl font-bold">Your first list</h2>
      <SuggestionReview onFinish={() => go("app")} finishLabel="Skip — I'll add my own" />
    </div>
  );
}
