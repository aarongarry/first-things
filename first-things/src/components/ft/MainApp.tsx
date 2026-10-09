import { useEffect, useRef, useState, type ReactNode } from "react";
import { Camera, Check, ChevronRight, Coffee, Home, Loader2, Lock, MessageCircle, Pencil, Plus, Settings, Smartphone, Target, Trash2, Unlock, Upload, X } from "lucide-react";
import { ALL_APPS, SAFE_APPS, fmtDate, toneLine, uid, useStore, type Recurrence, type Task } from "@/lib/store";
import { AppIcon, Btn, Bubble, Field, George, Toggle } from "./kit";
import { AppPicker, BreakPicker, CalendarConnect, GoalForm, SuggestionReview, TonePicker } from "./Onboarding";
import { suggestFor, type Suggestion } from "./suggest";
import { cn } from "@/lib/utils";

type Tab = "today" | "goals" | "george" | "phone" | "settings";
type Sheet =
  | { k: "task"; task?: Task | undefined; goalId?: string | undefined }
  | { k: "photo"; task: Task }
  | { k: "break" }
  | { k: "blocked"; app: string }
  | { k: "lock" }
  | { k: "suggest"; goalId: string }
  | { k: "goal"; id?: string | undefined }
  | null;

export function MainApp() {
  const { s, d, dispatch } = useStore();
  const [tab, setTab] = useState<Tab>("today");
  const [sheet, setSheet] = useState<Sheet>(null);
  const wasActive = useRef(false);
  useEffect(() => {
    if (wasActive.current && !d.breakActive && d.unfinished > 0 && s.breakJustEnded) setSheet({ k: "break" });
    wasActive.current = d.breakActive;
  }, [d.breakActive, d.unfinished, s.breakJustEnded]);

  const ctx = { setSheet, setTab };
  return (
    <div className="relative flex h-full flex-col">
      <StatusStrip />
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {tab === "today" && <Today {...ctx} />}
        {tab === "goals" && <Goals {...ctx} />}
        {tab === "george" && <Chat {...ctx} />}
        {tab === "phone" && <Launcher {...ctx} />}
        {tab === "settings" && <SettingsView {...ctx} />}
      </div>
      <nav className="grid grid-cols-5 border-t bg-card pb-3 pt-2">
        {([["today", Home, "Today"], ["goals", Target, "Goals"], ["george", MessageCircle, "George"], ["phone", Smartphone, "Apps"], ["settings", Settings, "Settings"]] as const).map(([id, I, l]) => (
          <button key={id} onClick={() => setTab(id)} className={cn("flex flex-col items-center gap-0.5 text-[10px] font-semibold", tab === id ? "text-primary" : "text-muted-foreground")}>
            <I className="h-5 w-5" />{l}
          </button>
        ))}
      </nav>

      {s.toast && (
        <div key={s.toast.id} className="absolute inset-x-3 top-12 z-40 animate-pop rounded-2xl bg-primary p-3 text-primary-foreground shadow-xl" role="status">
          <div className="flex gap-2"><George size={34} mood="cheer" /><div className="text-sm"><b>{s.toast.message}</b><div className="mt-0.5 text-xs opacity-85">{s.toast.extra}</div></div></div>
          {s.toast.extra?.includes("earned") && <Btn variant="george" className="mt-2 w-full py-2" onClick={() => { dispatch({ type: "dismissToast" }); setSheet({ k: "break" }); }}>See my break</Btn>}
        </div>
      )}

      {s.justCompletedAll && <AllDone onClose={() => dispatch({ type: "set", patch: { justCompletedAll: false } })} />}

      {sheet && (
        <div className="absolute inset-0 z-30 flex flex-col justify-end bg-foreground/40" onClick={() => setSheet(null)}>
          <div className="max-h-[92%] animate-pop overflow-y-auto no-scrollbar rounded-t-3xl bg-background p-5" onClick={(e) => e.stopPropagation()}>
            {sheet.k === "task" && <TaskEditor task={sheet.task} goalId={sheet.goalId} close={() => setSheet(null)} />}
            {sheet.k === "photo" && <PhotoVerify taskId={sheet.task.id} close={() => setSheet(null)} />}
            {sheet.k === "break" && <BreakSheet close={() => setSheet(null)} />}
            {sheet.k === "blocked" && <Blocked app={sheet.app} close={() => setSheet(null)} {...ctx} />}
            {sheet.k === "lock" && <LockPreview close={() => setSheet(null)} />}
            {sheet.k === "suggest" && <div className="flex min-h-[60vh] flex-col"><SheetHead title="George's suggestions" close={() => setSheet(null)} /><SuggestionReview goalId={sheet.goalId} onFinish={() => { setSheet(null); setTab("today"); }} finishLabel="Not now" /></div>}
            {sheet.k === "goal" && <GoalSheet id={sheet.id} close={() => setSheet(null)} />}
          </div>
        </div>
      )}
    </div>
  );
}

function SheetHead({ title, close }: { title: string; close: () => void }) {
  return <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold">{title}</h2><button onClick={close} aria-label="Close" className="rounded-full p-1 hover:bg-muted"><X className="h-5 w-5" /></button></div>;
}

function StatusStrip() {
  const { s, d, now } = useStore();
  const left = s.breakEndsAt ? Math.max(0, s.breakEndsAt - now) : 0;
  const cls = d.breakActive ? "bg-george text-foreground" : d.blocked ? "bg-foreground text-background" : "bg-success text-success-foreground";
  return (
    <div className={cn("flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-semibold", cls)}>
      {d.breakActive ? <><Coffee className="h-3 w-3" /> On break · apps open · {Math.floor(left / 60000)}:{String(Math.floor((left % 60000) / 1000)).padStart(2, "0")} left</>
        : d.blocked ? <><Lock className="h-3 w-3" /> {s.restricted.length} apps blocked · {d.unfinished} task{d.unfinished > 1 ? "s" : ""} to go</>
          : <><Unlock className="h-3 w-3" /> {s.restricted.length ? "Apps unlocked" : "No apps restricted"}</>}
    </div>
  );
}

/* 11 Home */
function Today({ setSheet, setTab }: { setSheet: (s: Sheet) => void; setTab: (t: Tab) => void }) {
  const { s, d, dispatch } = useStore();
  const greet = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening";
  const sorted = [...d.list].sort((a, b) => Number(a.done) - Number(b.done));
  const nextTask = sorted.find((t) => !t.done);
  return (
    <div className="px-5 pb-6 pt-4">
      <div className="flex items-start justify-between">
        <div><p className="text-xs text-muted-foreground">{greet}{s.day > 0 && ` · Day ${s.day + 1}`}</p><h1 className="text-2xl font-extrabold">{s.name}'s list</h1></div>
        <button onClick={() => setSheet({ k: "lock" })} className="rounded-full border bg-card px-2.5 py-1 text-[11px] font-semibold">Lock screen</button>
      </div>

      {/* progress card */}
      <div className="mt-4 rounded-3xl bg-primary p-4 text-primary-foreground">
        <div className="flex items-center gap-4">
          <Ring pct={d.pct} />
          <div className="flex-1 text-sm">
            <b className="block text-base">{d.total === 0 ? "No tasks yet" : `${d.done} of ${d.total} done`}</b>
            <span className="text-xs opacity-85">
              {d.total === 0 ? "Apps stay unlocked until you add a task."
                : d.unfinished === 0 ? "All done — apps unlocked until midnight."
                  : d.tasksToNext != null ? `${d.tasksToNext} more → next 10-min break`
                    : `${d.unfinished} more → apps fully unlock`}
            </span>
          </div>
        </div>
        {d.total > 0 && s.breakPref > 0 && (
          <div className="mt-3 flex gap-1">
            {d.list.map((_, k) => (
              <div key={k} className="relative flex-1">
                <div className={cn("h-1.5 rounded-full", k < d.done ? "bg-george" : "bg-primary-foreground/25")} />
                {d.ms.includes(k + 1) && <Coffee className="absolute -top-4 right-0 h-3 w-3" />}
              </div>
            ))}
          </div>
        )}
        {(d.available > 0 || d.breakActive) && d.unfinished > 0 && (
          <Btn variant="george" className="mt-3 w-full py-2" onClick={() => setSheet({ k: "break" })}>
            <Coffee className="h-4 w-4" /> {d.breakActive ? "Break in progress" : `${d.available} break${d.available > 1 ? "s" : ""} ready — start or save`}
          </Btn>
        )}
      </div>

      {nextTask && (
        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-george-soft p-3 text-xs">
          <George size={30} /><span className="flex-1"><b>Up next?</b> “{nextTask.title}”. {toneLine(s.tone, "nudge")}</span>
        </div>
      )}

      <div className="mt-5 flex items-center justify-between"><h3 className="font-bold">Today</h3><span className="text-[11px] text-muted-foreground">Resets at midnight</span></div>
      {d.total === 0 ? (
        <div className="mt-3 rounded-2xl border-2 border-dashed p-6 text-center text-sm">
          <George size={48} className="mx-auto" />
          <p className="mt-2 font-semibold">Your list is empty</p>
          <p className="text-xs text-muted-foreground">Apps are unlocked. Add something meaningful, or ask George for ideas.</p>
          <div className="mt-3 flex justify-center gap-2">
            <Btn className="py-2" onClick={() => setSheet({ k: "task" })}><Plus className="h-4 w-4" />Add task</Btn>
            <Btn variant="outline" className="py-2" onClick={() => s.goals[0] ? setSheet({ k: "suggest", goalId: s.goals[0].id }) : setTab("george")}>Ask George</Btn>
          </div>
        </div>
      ) : (
        <ul className="mt-2 space-y-2">
          {sorted.map((t) => <TaskRow key={t.id} t={t} onEdit={() => setSheet({ k: "task", task: t })} onPhoto={() => setSheet({ k: "photo", task: t })} onToggle={() => dispatch({ type: "toggle", id: t.id })} />)}
        </ul>
      )}
      {d.total > 0 && d.unfinished === 0 && (
        <div className="mt-4 rounded-2xl bg-success/15 p-3 text-xs"><b>🎉 List complete.</b> Apps stay unlocked until midnight unless you add another unfinished task.</div>
      )}

      {d.total > 0 && (
        <button onClick={() => setSheet({ k: "task" })} className="absolute bottom-20 right-5 z-20 grid h-14 w-14 place-items-center rounded-full bg-george shadow-lg" aria-label="Add task"><Plus className="h-6 w-6" /></button>
      )}
    </div>
  );
}

function Ring({ pct }: { pct: number }) {
  const r = 26, c = 2 * Math.PI * r;
  return (
    <div className="relative h-16 w-16">
      <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
        <circle cx="32" cy="32" r={r} strokeWidth="7" fill="none" className="stroke-primary-foreground/20" />
        <circle cx="32" cy="32" r={r} strokeWidth="7" fill="none" strokeLinecap="round" className="stroke-george transition-all duration-500" strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c} />
      </svg>
      <span className="absolute inset-0 grid place-items-center font-display text-sm font-bold">{pct}%</span>
    </div>
  );
}

function TaskRow({ t, onEdit, onToggle, onPhoto }: { t: Task; onEdit: () => void; onToggle: () => void; onPhoto: () => void }) {
  const { s } = useStore();
  const goal = s.goals.find((g) => g.id === t.goalId);
  return (
    <li className={cn("flex items-center gap-3 rounded-2xl border bg-card p-3 transition", t.done && "opacity-60")}>
      <button onClick={t.photo && !t.done ? onPhoto : onToggle} aria-label={t.done ? `Mark ${t.title} not done` : `Complete ${t.title}`}
        className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition", t.done ? "border-success bg-success text-success-foreground" : "border-primary hover:bg-secondary")}>
        {t.done ? <Check className="h-4 w-4" /> : t.photo && <Camera className="h-3.5 w-3.5 text-primary" />}
      </button>
      <button onClick={onEdit} className="flex-1 text-left">
        <div className={cn("text-sm font-medium", t.done && "line-through")}>{t.title}</div>
        <div className="flex flex-wrap gap-x-2 text-[11px] text-muted-foreground">
          {t.duration && <span>{t.duration} min</span>}
          {t.recurrence !== "none" && <span>↻ {t.recurrence}</span>}
          {t.photo && <span>📷 photo check</span>}
          {goal && <span className="truncate">◎ {goal.title}</span>}
        </div>
      </button>
      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
    </li>
  );
}

/* 12 Task editor */
function TaskEditor({ task, goalId, close }: { task?: Task | undefined; goalId?: string | undefined; close: () => void }) {
  const { s, d, dispatch } = useStore();
  const [title, setTitle] = useState(task?.title ?? "");
  const [duration, setDuration] = useState(task?.duration?.toString() ?? "");
  const [rec, setRec] = useState<Recurrence>(task?.recurrence ?? "none");
  const [photo, setPhoto] = useState(task?.photo ?? false);
  const [goal, setGoal] = useState(task?.goalId ?? goalId ?? "");
  const [err, setErr] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);
  const save = () => {
    if (!title.trim()) return setErr("Add a few words so you'll recognize it — “study”, “gym”, anything works.");
    const data = { title: title.trim(), duration: duration ? Number(duration) : undefined, recurrence: rec, photo, goalId: goal || undefined };
    if (task) dispatch({ type: "editTask", id: task.id, patch: data });
    else dispatch({ type: "addTask", task: data });
    close();
  };
  return (
    <>
      <SheetHead title={task ? "Edit task" : "New task"} close={close} />
      <div className="space-y-4">
        <Field label="What do you want to do?" autoFocus placeholder="e.g. Read ch. 4, laundry, call mom" value={title} onChange={(e) => { setTitle(e.target.value); setErr(""); }} error={err} hint="That's all you need. Everything below is optional." />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Duration (min)" type="number" min={1} placeholder="Optional" value={duration} onChange={(e) => setDuration(e.target.value)} />
          <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Repeats</span>
            <select value={rec} onChange={(e) => setRec(e.target.value as Recurrence)} className="w-full rounded-xl border border-input bg-card px-3 py-3 text-sm">
              <option value="none">Just today</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option>
            </select></label>
        </div>
        <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Supports a goal?</span>
          <select value={goal} onChange={(e) => setGoal(e.target.value)} className="w-full rounded-xl border border-input bg-card px-3 py-3 text-sm">
            <option value="">No goal — that's fine</option>{s.goals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
          </select></label>
        <div className="flex items-center justify-between rounded-xl bg-card p-3">
          <div className="text-sm"><b>Photo check</b><div className="text-xs text-muted-foreground">Snap a photo to prove it's done. Off = simple checkbox.</div></div>
          <Toggle on={photo} onChange={setPhoto} label="Photo check" />
        </div>
        {!task && d.unfinished === 0 && s.restricted.length > 0 && !d.breakActive && <p className="text-xs text-accent-foreground">Heads up: adding this will block your selected apps again until it's done.</p>}
        <Btn className="w-full" onClick={save}>{task ? "Save changes" : "Add to today"}</Btn>
        {task && (confirmDel
          ? <div className="flex gap-2"><Btn variant="outline" className="flex-1" onClick={() => setConfirmDel(false)}>Keep</Btn><Btn className="flex-1 bg-destructive" onClick={() => { dispatch({ type: "deleteTask", id: task.id }); close(); }}>Delete</Btn></div>
          : <Btn variant="danger" className="w-full" onClick={() => setConfirmDel(true)}><Trash2 className="h-4 w-4" />Delete task</Btn>)}
      </div>
    </>
  );
}

/* 15 Photo verification */
function PhotoVerify({ taskId, close }: { taskId: string; close: () => void }) {
  const { s, dispatch } = useStore();
  const task = s.tasks.find((t) => t.id === taskId)!;
  const [img, setImg] = useState<string | null>(null);
  const [phase, setPhase] = useState<"capture" | "camera" | "review" | "processing" | "failed">("capture");
  const [uploadErr, setUploadErr] = useState("");
  const [forceOutcome, setForceOutcome] = useState<"auto" | "pass" | "fail">("auto");
  const fileRef = useRef<HTMLInputElement>(null);
  const fails = task?.failedAttempts ?? 0;

  const simulateCapture = () => {
    setPhase("camera");
    setTimeout(() => {
      const c = document.createElement("canvas"); c.width = 300; c.height = 220;
      const g = c.getContext("2d")!;
      const hue = Math.floor(Math.random() * 360);
      g.fillStyle = `hsl(${hue} 35% 75%)`; g.fillRect(0, 0, 300, 220);
      g.fillStyle = `hsl(${hue} 30% 45%)`; g.fillRect(60, 60, 180, 110);
      g.fillStyle = "#fff"; g.font = "bold 16px sans-serif"; g.fillText("📸 " + task.title.slice(0, 22), 20, 30);
      setImg(c.toDataURL()); setPhase("review");
    }, 1000);
  };
  const onFile = (f?: File) => {
    setUploadErr("");
    if (!f) return;
    if (!f.type.startsWith("image/")) return setUploadErr("That file isn't an image. Try a JPG or PNG — this doesn't count as an attempt.");
    const r = new FileReader();
    r.onerror = () => setUploadErr("Upload failed. Please try again — this doesn't count as an attempt.");
    r.onload = () => { setImg(r.result as string); setPhase("review"); };
    r.readAsDataURL(f);
  };
  const submit = () => {
    if (!img) return setUploadErr("Add a photo first.");
    setPhase("processing");
    setTimeout(() => {
      const confidence = forceOutcome === "pass" ? 0.93 : forceOutcome === "fail" ? 0.4 : Math.random() * 0.5 + 0.5;
      if (confidence >= 0.8) { dispatch({ type: "toggle", id: taskId }); close(); return; }
      if (fails + 1 >= 3) { dispatch({ type: "failPhoto", id: taskId }); dispatch({ type: "toggle", id: taskId, auto: true }); close(); return; }
      dispatch({ type: "failPhoto", id: taskId }); setPhase("failed");
    }, 1600);
  };
  if (!task) return null;
  return (
    <>
      <SheetHead title="Photo check" close={close} />
      <p className="-mt-2 mb-3 text-sm text-muted-foreground">Show George you finished <b className="text-foreground">“{task.title}”</b>.</p>
      <div className="grid aspect-[4/3] place-items-center overflow-hidden rounded-2xl bg-phone text-background">
        {phase === "camera" ? <div className="text-center text-sm"><Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" />Simulated camera…</div>
          : img ? <img src={img} alt="Your photo" className={cn("h-full w-full object-cover", phase === "processing" && "opacity-50")} />
            : <Camera className="h-10 w-10 opacity-50" />}
      </div>
      {phase === "processing" && <p className="mt-3 flex items-center justify-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" />George is checking your photo…</p>}
      {phase === "failed" && (
        <div className="mt-3 rounded-xl bg-accent p-3 text-xs text-accent-foreground">
          Hmm, I couldn't quite tell it's done from that one. Try a clearer photo showing the finished task.{" "}
          {fails === 2 ? "One more try — if it still doesn't work, I'll take your word for it." : `${3 - fails} tries left before I'll just trust you.`}
        </div>
      )}
      {uploadErr && <p className="mt-2 text-xs text-destructive">{uploadErr}</p>}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Btn variant="outline" disabled={phase === "processing" || phase === "camera"} onClick={simulateCapture}><Camera className="h-4 w-4" />{img ? "Retake" : "Take photo"}</Btn>
        <Btn variant="outline" disabled={phase === "processing" || phase === "camera"} onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" />{img ? "Replace" : "Upload"}</Btn>
      </div>
      <Btn className="mt-2 w-full" disabled={!img || phase === "processing" || phase === "camera"} onClick={submit}>Submit photo</Btn>
      <div className="mt-3 flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
        Demo result:
        {(["auto", "pass", "fail"] as const).map((o) => <button key={o} onClick={() => setForceOutcome(o)} className={cn("rounded-full px-2 py-0.5", forceOutcome === o ? "bg-foreground text-background" : "bg-muted")}>{o === "auto" ? "random" : o}</button>)}
      </div>
    </>
  );
}

/* 17 Break */
function BreakSheet({ close }: { close: () => void }) {
  const { s, d, dispatch, now } = useStore();
  const left = s.breakEndsAt ? Math.max(0, s.breakEndsAt - now) : 0;
  if (d.breakActive) return (
    <div className="text-center">
      <SheetHead title="You're on a break" close={close} />
      <div className="font-display text-6xl font-extrabold">{Math.floor(left / 60000)}:{String(Math.floor((left % 60000) / 1000)).padStart(2, "0")}</div>
      <p className="mt-2 text-sm">Your distracting apps are open for now. When the timer ends, they lock again because {d.unfinished} task{d.unfinished > 1 ? "s remain" : " remains"}.</p>
      <Btn className="mt-4 w-full" onClick={close}>Back to my list</Btn>
      <Btn variant="ghost" className="w-full" onClick={() => dispatch({ type: "endBreak" })}>End break early</Btn>
      <button className="text-[11px] text-muted-foreground underline" onClick={() => dispatch({ type: "set", patch: { breakEndsAt: Date.now() + 5000 } })}>Demo: skip to last 5 seconds</button>
    </div>
  );
  if (s.breakJustEnded) return (
    <div className="text-center">
      <SheetHead title="Break's over" close={() => { dispatch({ type: "set", patch: { breakJustEnded: false } }); close(); }} />
      <George size={64} className="mx-auto" />
      <p className="mt-2 text-sm">Hope that felt good! Your apps are locked again since {d.unfinished} task{d.unfinished > 1 ? "s are" : " is"} left. {d.available > 0 && `You still have ${d.available} saved break${d.available > 1 ? "s" : ""}.`}</p>
      <Btn className="mt-4 w-full" onClick={() => { dispatch({ type: "set", patch: { breakJustEnded: false } }); close(); }}>Back to my list</Btn>
    </div>
  );
  return (
    <div className="text-center">
      <SheetHead title="Your earned breaks" close={close} />
      <Coffee className="mx-auto h-10 w-10 text-george" />
      {d.available > 0 ? (
        <>
          <p className="mt-2 text-sm">You have <b>{d.available}</b> 10-minute break{d.available > 1 ? "s" : ""} saved. Starting one opens your apps for 10 minutes. Saved breaks expire at midnight.</p>
          <Btn variant="george" className="mt-4 w-full" onClick={() => dispatch({ type: "startBreak" })}>Start 10-minute break now</Btn>
          <Btn variant="ghost" className="w-full" onClick={close}>Save it for later</Btn>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm">No breaks ready yet. {d.tasksToNext != null ? `Finish ${d.tasksToNext} more task${d.tasksToNext > 1 ? "s" : ""} to earn the next one.` : "No more breaks today — finishing your list unlocks everything."}</p>
          <Btn className="mt-4 w-full" onClick={close}>Back to my list</Btn>
        </>
      )}
    </div>
  );
}

/* 18 All done */
function AllDone({ onClose }: { onClose: () => void }) {
  const { s, d } = useStore();
  return (
    <div className="absolute inset-0 z-50 flex animate-pop flex-col items-center overflow-y-auto bg-primary px-6 py-10 text-center text-primary-foreground">
      <div className="text-4xl">🎉✨🎉</div>
      <George size={110} mood="cheer" className="mt-2 animate-bob" />
      <h1 className="mt-4 text-3xl font-extrabold">List complete!</h1>
      <p className="mt-2 text-sm opacity-90">{toneLine(s.tone, "allDone")}</p>
      <div className="mt-5 w-full rounded-2xl bg-primary-foreground/10 p-4 text-left text-sm">
        <div className="flex items-center gap-2 font-semibold"><Unlock className="h-4 w-4" /> Apps unlocked until midnight</div>
        <p className="mt-1 text-xs opacity-85">{s.restricted.length ? `${s.restricted.length} apps are open.` : "No apps were restricted."} Adding another unfinished task would lock them again.</p>
      </div>
      <div className="mt-4 w-full text-left">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-75">Today you finished</p>
        <ul className="space-y-1 text-sm">{d.list.map((t) => <li key={t.id} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-george" />{t.title}</li>)}</ul>
      </div>
      <Btn variant="george" className="mt-6 w-full" onClick={onClose}>Back home</Btn>
    </div>
  );
}

/* 19 Launcher + blocked */
function Launcher({ setSheet }: { setSheet: (s: Sheet) => void }) {
  const { s, d } = useStore();
  const [opened, setOpened] = useState<string | null>(null);
  const open = (id: string, name: string) => {
    if (s.restricted.includes(id) && d.blocked) setSheet({ k: "blocked", app: name });
    else { setOpened(name); setTimeout(() => setOpened(null), 1800); }
  };
  return (
    <div className="px-5 pt-4">
      <h1 className="text-2xl font-extrabold">Try opening an app</h1>
      <p className="text-xs text-muted-foreground">Simulation — this pretends to be your home screen. It doesn't control your real device.</p>
      <div className="mt-5 grid grid-cols-4 gap-y-5 rounded-3xl bg-secondary p-4">
        {[...ALL_APPS, ...SAFE_APPS].map((a) => <AppIcon key={a.id} {...a} locked={s.restricted.includes(a.id) && d.blocked} onClick={() => open(a.id, a.name)} />)}
      </div>
      {opened && <div className="mt-4 animate-pop rounded-2xl bg-success/15 p-3 text-center text-sm">✅ {opened} opened (simulated)</div>}
    </div>
  );
}
function Blocked({ app, close, setTab, setSheet }: { app: string; close: () => void; setTab: (t: Tab) => void; setSheet: (s: Sheet) => void }) {
  const { s, d, dispatch } = useStore();
  const next = d.list.find((t) => !t.done);
  return (
    <div className="text-center">
      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase">Simulated block</span>
      <div className="mx-auto mt-3 grid h-16 w-16 place-items-center rounded-2xl bg-foreground text-background"><Lock /></div>
      <h2 className="mt-3 text-xl font-bold">{app} is paused</h2>
      <Bubble>{toneLine(s.tone, "blocked")}</Bubble>
      <p className="mt-3 text-xs text-muted-foreground">{d.unfinished} task{d.unfinished > 1 ? "s" : ""} left today.{d.tasksToNext != null && ` ${d.tasksToNext} more earns a break.`}</p>
      {next && <button onClick={() => { close(); setTab("today"); setSheet(next.photo ? { k: "photo", task: next } : { k: "task", task: next }); }} className="mt-3 flex w-full items-center gap-2 rounded-2xl border bg-card p-3 text-left text-sm"><span className="flex-1"><span className="block text-[11px] text-muted-foreground">Tackle this next</span><b>{next.title}</b></span><ChevronRight className="h-4 w-4" /></button>}
      <div className="mt-3 space-y-1">
        {d.available > 0 && <Btn variant="george" className="w-full" onClick={() => { dispatch({ type: "startBreak" }); close(); }}><Coffee className="h-4 w-4" />Use an earned break (10 min)</Btn>}
        <Btn className="w-full" onClick={() => { close(); setTab("today"); }}>Go to my list</Btn>
      </div>
    </div>
  );
}

/* 20 Lock screen */
function LockPreview({ close }: { close: () => void }) {
  const { s, d } = useStore();
  const next = d.list.find((t) => !t.done);
  const now = new Date();
  return (
    <>
      <SheetHead title="Lock screen preview" close={close} />
      <div className="mx-auto w-full rounded-[2rem] bg-phone p-5 text-center text-background">
        <p className="text-xs opacity-70">{now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
        <p className="font-display text-6xl font-light">{now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).replace(/\s?[AP]M/i, "")}</p>
        <div className="mt-6 rounded-2xl bg-background/15 p-3 text-left backdrop-blur">
          <div className="flex items-center gap-2 text-xs font-semibold"><George size={22} /> FIRST THINGS</div>
          <div className="mt-2 h-1.5 rounded-full bg-background/20"><div className="h-1.5 rounded-full bg-george" style={{ width: `${d.pct}%` }} /></div>
          <p className="mt-2 text-sm"><b>{d.done}/{d.total} done</b>{d.unfinished > 0 ? ` · ${d.unfinished} left` : " · apps unlocked 🎉"}</p>
          {next && <p className="mt-1 text-xs opacity-80">Next: {next.title}. {toneLine(s.tone, "nudge")}</p>}
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">Concept preview only — no real lock-screen integration.</p>
    </>
  );
}

/* 13 Goals */
function Goals({ setSheet, setTab }: { setSheet: (s: Sheet) => void; setTab: (t: Tab) => void }) {
  const { s } = useStore();
  return (
    <div className="px-5 pb-6 pt-4">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-extrabold">Goals</h1><Btn variant="outline" className="py-2" onClick={() => setSheet({ k: "goal" })}><Plus className="h-4 w-4" />New</Btn></div>
      <p className="text-xs text-muted-foreground">The big things your daily tasks build toward.</p>
      {s.goals.length === 0 && <div className="mt-6 rounded-2xl border-2 border-dashed p-6 text-center text-sm text-muted-foreground">No goals yet. Add one so George can suggest steps.</div>}
      <div className="mt-4 space-y-3">
        {s.goals.map((g) => {
          const linked = s.tasks.filter((t) => t.goalId === g.id);
          const days = Math.ceil((new Date(g.targetDate + "T12:00:00").getTime() - Date.now()) / 864e5);
          return (
            <div key={g.id} className="rounded-2xl border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div><h3 className="font-bold leading-tight">{g.title}</h3><p className="text-xs text-muted-foreground">By {fmtDate(g.targetDate)} · {days >= 0 ? `${days} days left` : "date passed"}</p></div>
                <button onClick={() => setSheet({ k: "goal", id: g.id })} aria-label="Edit goal"><Pencil className="h-4 w-4 text-muted-foreground" /></button>
              </div>
              {g.why && <p className="mt-2 text-xs italic">“{g.why}”</p>}
              <div className="mt-3 text-xs">
                <b>Linked tasks</b>
                {linked.length === 0 ? <p className="text-muted-foreground">None yet.</p> : <ul className="mt-1 space-y-0.5">{linked.map((t) => <li key={t.id} className={cn(t.done && "line-through text-muted-foreground")}>• {t.title}</li>)}</ul>}
              </div>
              <div className="mt-3 flex gap-2">
                <Btn variant="george" className="flex-1 py-2 text-xs" onClick={() => setSheet({ k: "suggest", goalId: g.id })}>Ask George for next steps</Btn>
                <Btn variant="outline" className="py-2 text-xs" onClick={() => setSheet({ k: "task", goalId: g.id })}><Plus className="h-3.5 w-3.5" />Task</Btn>
              </div>
            </div>
          );
        })}
      </div>
      <button className="mt-4 w-full text-xs text-primary" onClick={() => setTab("george")}>Talk it through with George →</button>
    </div>
  );
}
function GoalSheet({ id, close }: { id?: string | undefined; close: () => void }) {
  const { s, dispatch } = useStore();
  const g = s.goals.find((x) => x.id === id);
  const [confirm, setConfirm] = useState(false);
  const linked = s.tasks.filter((t) => t.goalId === id).length;
  return (
    <>
      <SheetHead title={g ? "Edit goal" : "New goal"} close={close} />
      <GoalForm initial={g} onSave={(v) => {
        dispatch({ type: "set", patch: { goals: g ? s.goals.map((x) => (x.id === id ? { ...x, ...v } : x)) : [...s.goals, { id: uid(), ...v }] } });
        close();
      }} />
      {g && (confirm ? (
        <div className="mt-3 rounded-xl bg-muted p-3 text-xs">
          Remove this goal? {linked > 0 && `Your ${linked} linked task${linked > 1 ? "s" : ""} will stay on your list — they just won't be tied to a goal.`}
          <div className="mt-2 flex gap-2"><Btn variant="outline" className="flex-1 py-2" onClick={() => setConfirm(false)}>Keep goal</Btn>
            <Btn className="flex-1 bg-destructive py-2" onClick={() => { dispatch({ type: "set", patch: { goals: s.goals.filter((x) => x.id !== id), tasks: s.tasks.map((t) => (t.goalId === id ? { ...t, goalId: undefined } : t)) } }); close(); }}>Remove</Btn></div>
        </div>
      ) : <Btn variant="danger" className="mt-2 w-full" onClick={() => setConfirm(true)}><Trash2 className="h-4 w-4" />Remove goal</Btn>)}
    </>
  );
}

/* 14 Chat */
interface Msg { id: string; from: "george" | "user"; text: string; failed?: boolean | undefined; proposals?: Suggestion[] | undefined }
function Chat({ setTab }: { setTab: (t: Tab) => void }) {
  const { s, d, dispatch } = useStore();
  const [msgs, setMsgs] = useState<Msg[]>(() => [{ id: "w", from: "george", text: `Hey ${s.name}! ${d.unfinished ? `You've got ${d.unfinished} task${d.unfinished > 1 ? "s" : ""} left today.` : "Your list is clear right now."} Want encouragement, help planning, or some task ideas?` }]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [failNext, setFailNext] = useState(false);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => end.current?.scrollIntoView({ behavior: "smooth" }), [msgs, busy]);

  const reply = (q: string): Msg => {
    const l = q.toLowerCase();
    const goal = s.goals.find((g) => l.includes(g.title.toLowerCase().split(" ")[0] ?? "")) ?? s.goals[0];
    if (/idea|suggest|task|next|plan|step|what should/.test(l))
      return { id: uid(), from: "george", text: `Here are a few small steps toward “${goal?.title ?? "your goals"}”. Tap any you want — I won't add anything without your OK.`, proposals: suggestFor(goal, s.profile, Math.floor(Math.random() * 4)).slice(0, 3) };
    if (/tired|stress|overwhelm|can't|hard|anxious|behind/.test(l))
      return { id: uid(), from: "george", text: s.tone === "direct" ? "Understood. Shrink it: pick one task, set a 10-minute timer, start. That's the whole job right now." : s.tone === "gentle" ? "That sounds really heavy. It's okay to go slow. What's the tiniest version of one task you could do — even 5 minutes counts." : "Totally fair. Let's make it smaller — pick your easiest task and give it 10 minutes. Momentum does the rest." };
    return { id: uid(), from: "george", text: `${toneLine(s.tone, "nudge")} ${goal ? `Remember, this all builds toward “${goal.title}” by ${fmtDate(goal.targetDate)}.` : ""} Ask me for task ideas anytime.` };
  };
  const send = (q: string, retryId?: string) => {
    if (!q.trim()) return;
    const uidMsg = retryId ?? uid();
    setMsgs((m) => retryId ? m.map((x) => (x.id === retryId ? { ...x, failed: false } : x)) : [...m, { id: uidMsg, from: "user", text: q }]);
    setText(""); setBusy(true);
    setTimeout(() => {
      setBusy(false);
      if (failNext) { setFailNext(false); setMsgs((m) => m.map((x) => (x.id === uidMsg ? { ...x, failed: true } : x))); return; }
      setMsgs((m) => [...m, reply(q)]);
    }, 900);
  };
  return (
    <div className="flex h-full flex-col px-4 pt-3">
      <div className="flex items-center gap-2 pb-2"><George size={40} /><div><h1 className="text-lg font-extrabold leading-none">George</h1><p className="text-[11px] capitalize text-muted-foreground">{s.tone} mode</p></div></div>
      <div className="flex-1 space-y-3 overflow-y-auto no-scrollbar pb-2">
        {msgs.map((m) => (
          <div key={m.id}>
            <Bubble from={m.from}>{m.text}</Bubble>
            {m.failed && <div className="mt-1 text-right text-[11px] text-destructive">George couldn't respond. <button className="font-semibold underline" onClick={() => send(m.text, m.id)}>Retry</button></div>}
            {m.proposals && (
              <div className="ml-9 mt-2 space-y-1.5">
                {m.proposals.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 rounded-xl border bg-card p-2 text-xs">
                    <span className="flex-1"><b>{p.title}</b><span className="block text-muted-foreground">{p.why}</span></span>
                    {added.has(p.id) ? <span className="text-success">Added ✓</span>
                      : <Btn className="px-2 py-1 text-xs" onClick={() => { dispatch({ type: "addTask", task: { title: p.title, duration: p.duration, recurrence: "none", photo: false, goalId: p.goalId } }); setAdded((a) => new Set(a).add(p.id)); }}>Add</Btn>}
                  </div>
                ))}
                <button className="text-[11px] text-primary" onClick={() => setTab("today")}>View today's list →</button>
              </div>
            )}
          </div>
        ))}
        {busy && <Bubble>…</Bubble>}
        <div ref={end} />
      </div>
      <div className="flex flex-wrap gap-1.5 pb-2">
        {["Give me task ideas", "I'm feeling behind", "Encourage me"].map((c) => <button key={c} onClick={() => send(c)} className="rounded-full border bg-card px-2.5 py-1 text-[11px]">{c}</button>)}
        <button onClick={() => setFailNext(!failNext)} className={cn("rounded-full px-2.5 py-1 text-[11px]", failNext ? "bg-destructive text-destructive-foreground" : "text-muted-foreground underline")}>Demo: fail next reply</button>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="flex gap-2 pb-3">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message George…" className="flex-1 rounded-xl border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
        <Btn disabled={!text.trim() || busy}>Send</Btn>
      </form>
    </div>
  );
}

/* 21 Settings */
function Section({ title, children, note }: { title: string; children: ReactNode; note?: string | undefined }) {
  return <section className="mt-5"><h3 className="mb-1 font-bold">{title}</h3>{note && <p className="mb-2 text-xs text-muted-foreground">{note}</p>}{children}</section>;
}
function SettingsView({ setSheet }: { setSheet: (s: Sheet) => void }) {
  const { s, d, dispatch } = useStore();
  const [name, setName] = useState(s.name);
  const [phone, setPhone] = useState(s.phone);
  const [saved, setSaved] = useState(false);
  return (
    <div className="px-5 pb-8 pt-4">
      <h1 className="text-2xl font-extrabold">Settings</h1>
      <Section title="Restricted apps" note={`Changes apply immediately. Right now apps are ${d.blocked ? "blocked" : "unlocked"}${d.breakActive ? " (break active)" : ""}.`}><AppPicker /></Section>
      <Section title="Daily breaks" note={`With today's ${d.total} task${d.total === 1 ? "" : "s"}, you'll get ${d.ms.length} break${d.ms.length === 1 ? "" : "s"}${d.ms.length ? ` (after ${d.ms.join(", ")} done)` : ""}. Breaks you've already earned are kept.`}><BreakPicker /></Section>
      <Section title="George's tone"><TonePicker /></Section>
      <Section title="Profile">
        <div className="space-y-2">
          <Field label="Name" value={name} onChange={(e) => { setName(e.target.value); setSaved(false); }} />
          <Field label="Phone" value={phone} onChange={(e) => { setPhone(e.target.value); setSaved(false); }} hint="Changing your number would require a new confirmation code (simulated)." />
          <Btn variant="outline" className="w-full" disabled={!name.trim()} onClick={() => { dispatch({ type: "set", patch: { name: name.trim(), phone } }); setSaved(true); }}>{saved ? "Saved ✓" : "Save profile"}</Btn>
        </div>
      </Section>
      <Section title="Calendar" note="Optional. Helps George fit suggestions around your schedule."><CalendarConnect /></Section>
      <Section title="Lock screen"><Btn variant="outline" className="w-full" onClick={() => setSheet({ k: "lock" })}>Preview lock screen</Btn></Section>
      <Section title="Demo controls" note="Midnight: unfinished one-time tasks carry over, finished ones clear, recurring tasks come back unchecked on their next day, and unused breaks expire.">
        <Btn variant="outline" className="w-full" onClick={() => dispatch({ type: "midnight" })}>Simulate midnight</Btn>
        <Btn variant="danger" className="mt-1 w-full" onClick={() => dispatch({ type: "reset" })}>Restart demo from sign-up</Btn>
      </Section>
    </div>
  );
}
