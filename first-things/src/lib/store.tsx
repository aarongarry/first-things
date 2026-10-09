import { createContext, useContext, useEffect, useReducer, useState, type ReactNode } from "react";

export type Tone = "gentle" | "balanced" | "direct";
export type Recurrence = "none" | "daily" | "weekly" | "monthly";
export interface Goal { id: string; title: string; targetDate: string; why?: string | undefined }
export interface Task {
  id: string; title: string; duration?: number | undefined; recurrence: Recurrence; photo: boolean;
  goalId?: string | undefined; done: boolean; failedAttempts: number; activeFromDay: number; autoCompleted?: boolean | undefined;
}
export interface Profile { status: string; interests: string; routine: string; challenge: string }
export interface Toast { id: number; title: string; message: string; extra?: string | undefined }

export const ALL_APPS = [
  { id: "tiktok", name: "TikTok", color: "oklch(0.25 0.02 260)", glyph: "♪" },
  { id: "instagram", name: "Instagram", color: "oklch(0.6 0.2 350)", glyph: "◎" },
  { id: "youtube", name: "YouTube", color: "oklch(0.58 0.22 27)", glyph: "▶" },
  { id: "snapchat", name: "Snapchat", color: "oklch(0.9 0.17 100)", glyph: "◉" },
  { id: "x", name: "X", color: "oklch(0.2 0 0)", glyph: "✕" },
  { id: "reddit", name: "Reddit", color: "oklch(0.65 0.2 40)", glyph: "●" },
  { id: "netflix", name: "Netflix", color: "oklch(0.45 0.2 27)", glyph: "N" },
  { id: "games", name: "Games", color: "oklch(0.55 0.15 280)", glyph: "◆" },
];
export const SAFE_APPS = [
  { id: "messages", name: "Messages", color: "oklch(0.65 0.17 145)", glyph: "✉" },
  { id: "maps", name: "Maps", color: "oklch(0.6 0.12 200)", glyph: "➤" },
  { id: "canvas", name: "Canvas", color: "oklch(0.55 0.17 30)", glyph: "C" },
  { id: "phone", name: "Phone", color: "oklch(0.62 0.16 150)", glyph: "☎" },
];

export interface State {
  stage: string; // onboarding step or "app"
  name: string; phone: string; tone: Tone; profile: Profile;
  goals: Goal[]; tasks: Task[]; restricted: string[]; breakPref: number;
  breaksAwarded: number; breaksUsed: number; breakEndsAt: number | null; breakJustEnded: boolean;
  calendar: boolean; day: number; toast: Toast | null; history: string[];
  justCompletedAll: boolean;
}

const initial: State = {
  stage: "welcome", name: "", phone: "", tone: "balanced",
  profile: { status: "", interests: "", routine: "", challenge: "" },
  goals: [], tasks: [], restricted: ["tiktok", "instagram", "youtube"], breakPref: 2,
  breaksAwarded: 0, breaksUsed: 0, breakEndsAt: null, breakJustEnded: false,
  calendar: false, day: 0, toast: null, history: [], justCompletedAll: false,
};

export const uid = () => Math.random().toString(36).slice(2, 9);
let toastId = 0;

// ---------- Derived logic ----------
export function todayTasks(s: State) { return s.tasks.filter((t) => t.activeFromDay <= s.day); }

/** Whole-task thresholds for each break milestone. Milestones at/after full completion are dropped. */
export function milestones(total: number, pref: number) {
  const b = Math.min(pref, total);
  const out: number[] = [];
  for (let k = 1; k <= b; k++) {
    const t = Math.ceil((k * total) / (b + 1));
    if (t < total && !out.includes(t)) out.push(t);
  }
  return out;
}

export function derive(s: State, now = Date.now()) {
  const list = todayTasks(s);
  const total = list.length;
  const done = list.filter((t) => t.done).length;
  const unfinished = total - done;
  const breakActive = !!s.breakEndsAt && s.breakEndsAt > now && unfinished > 0;
  const blocked = s.restricted.length > 0 && unfinished > 0 && !breakActive;
  const ms = milestones(total, s.breakPref);
  const effectiveBreaks = Math.min(s.breakPref, total);
  const available = Math.max(0, s.breaksAwarded - s.breaksUsed);
  const nextThreshold = ms.find((t, i) => i + 1 > s.breaksAwarded && t > done);
  const tasksToNext = nextThreshold != null ? nextThreshold - done : null;
  const pct = total ? Math.round((done / total) * 100) : 0;
  return { list, total, done, unfinished, breakActive, blocked, ms, effectiveBreaks, available, nextThreshold, tasksToNext, pct };
}

function award(s: State): State {
  const list = todayTasks(s);
  const done = list.filter((t) => t.done).length;
  const reached = milestones(list.length, s.breakPref).filter((t) => t <= done).length;
  const unfinished = list.length - done;
  let next = { ...s, breaksAwarded: Math.max(s.breaksAwarded, reached) };
  if (unfinished === 0 && next.breakEndsAt) next = { ...next, breakEndsAt: null };
  return next;
}

// ---------- Copy in George's tone ----------
export function toneLine(tone: Tone, kind: "done" | "blocked" | "allDone" | "nudge", title = "") {
  const L = {
    gentle: {
      done: `Lovely work finishing “${title}.” Every small step counts 🌱`,
      blocked: "I know it's tempting. Let's do one small thing first — you'll feel better, I promise.",
      allDone: "You did everything you set out to do today. Be proud of yourself 💛",
      nudge: "Whenever you're ready, one small task is a great place to start.",
    },
    balanced: {
      done: `Nice — “${title}” is done. Momentum looks good on you.`,
      blocked: "Not yet! Knock out a task or use an earned break, then it's all yours.",
      allDone: "List cleared. That's a real win — enjoy the rest of your day.",
      nudge: "Pick the quickest task and get a win on the board.",
    },
    direct: {
      done: `“${title}” — done. Next one.`,
      blocked: "This can wait. Your list can't. Finish a task and come back.",
      allDone: "Every task done. Respect. Go enjoy it.",
      nudge: "You know what's next. Start it now — 10 focused minutes.",
    },
  };
  return L[tone][kind];
}

// ---------- Reducer ----------
type Action =
  | { type: "set"; patch: Partial<State> }
  | { type: "addTask"; task: Omit<Task, "id" | "done" | "failedAttempts" | "activeFromDay"> }
  | { type: "editTask"; id: string; patch: Partial<Task> }
  | { type: "deleteTask"; id: string }
  | { type: "toggle"; id: string; auto?: boolean | undefined }
  | { type: "failPhoto"; id: string }
  | { type: "startBreak" } | { type: "endBreak" }
  | { type: "midnight" } | { type: "dismissToast" }
  | { type: "reset" };

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "set": return award({ ...s, ...a.patch });
    case "addTask": {
      const t: Task = { ...a.task, id: uid(), done: false, failedAttempts: 0, activeFromDay: s.day };
      return award({ ...s, tasks: [...s.tasks, t], justCompletedAll: false });
    }
    case "editTask": return award({ ...s, tasks: s.tasks.map((t) => (t.id === a.id ? { ...t, ...a.patch } : t)) });
    case "deleteTask": return award({ ...s, tasks: s.tasks.filter((t) => t.id !== a.id) });
    case "toggle": {
      const task = s.tasks.find((t) => t.id === a.id)!;
      const nowDone = !task.done;
      const before = derive(s);
      let next = award({
        ...s,
        tasks: s.tasks.map((t) => (t.id === a.id ? { ...t, done: nowDone, autoCompleted: a.auto && nowDone } : t)),
      });
      if (!nowDone) return { ...next, justCompletedAll: false };
      const after = derive(next);
      const history = [...next.history, task.title];
      if (after.unfinished === 0) return { ...next, history, justCompletedAll: true, toast: null };
      const gained = next.breaksAwarded > s.breaksAwarded;
      const extra = gained
        ? "🎉 You earned a 10-minute break! Start it now or save it for later."
        : after.tasksToNext != null
          ? `${after.tasksToNext} more task${after.tasksToNext > 1 ? "s" : ""} until your next break.`
          : `${after.unfinished} left until your apps fully unlock.`;
      void before;
      return {
        ...next, history,
        toast: { id: ++toastId, title: task.title, extra,
          message: a.auto
            ? `We've marked “${task.title}” complete — we trust you did it. Photos can be tricky!`
            : toneLine(s.tone, "done", task.title) },
      };
    }
    case "failPhoto":
      return { ...s, tasks: s.tasks.map((t) => (t.id === a.id ? { ...t, failedAttempts: t.failedAttempts + 1 } : t)) };
    case "startBreak": {
      const d = derive(s);
      if (d.available < 1 || d.breakActive) return s;
      return { ...s, breaksUsed: s.breaksUsed + 1, breakEndsAt: Date.now() + 10 * 60 * 1000, breakJustEnded: false };
    }
    case "endBreak": return { ...s, breakEndsAt: null, breakJustEnded: derive(s).unfinished > 0 };
    case "midnight": {
      const day = s.day + 1;
      const tasks = s.tasks.flatMap((t) => {
        if (t.activeFromDay > s.day) return [t];
        if (!t.done) return [t]; // ASSUMPTION: unfinished one-time tasks carry over to the next day
        if (t.recurrence === "none") return [];
        const gap = t.recurrence === "daily" ? 1 : t.recurrence === "weekly" ? 7 : 30;
        return [{ ...t, done: false, failedAttempts: 0, autoCompleted: false, activeFromDay: s.day + gap }];
      });
      // ASSUMPTION: unused breaks expire at midnight
      return { ...s, day, tasks, breaksAwarded: 0, breaksUsed: 0, breakEndsAt: null, history: [], justCompletedAll: false, toast: null };
    }
    case "dismissToast": return { ...s, toast: null };
    case "reset": return initial;
  }
}

const Ctx = createContext<{ s: State; d: ReturnType<typeof derive>; dispatch: React.Dispatch<Action>; now: number } | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [s, dispatch] = useReducer(reducer, initial);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  useEffect(() => {
    if (s.breakEndsAt && s.breakEndsAt <= now) dispatch({ type: "endBreak" });
  }, [now, s.breakEndsAt]);
  useEffect(() => {
    if (!s.toast) return;
    const t = setTimeout(() => dispatch({ type: "dismissToast" }), 3200);
    return () => clearTimeout(t);
  }, [s.toast]);
  return <Ctx.Provider value={{ s, d: derive(s, now), dispatch, now }}>{children}</Ctx.Provider>;
}

export function useStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error("no store");
  return c;
}

export const fmtDate = (iso: string) =>
  iso ? new Date(iso + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "No date";
