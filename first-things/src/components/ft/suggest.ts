import type { Goal, Profile } from "@/lib/store";

export interface Suggestion { id: string; title: string; why: string; duration?: number | undefined; goalId?: string | undefined }

export function suggestFor(goal: Goal | undefined, profile: Profile, salt = 0): Suggestion[] {
  const g = goal?.title.toLowerCase() ?? "";
  let base: Omit<Suggestion, "id" | "goalId">[];
  if (/gpa|grade|exam|class|study|test|midterm|final|course/.test(g))
    base = [
      { title: "Review lecture notes from this week", why: "Short reviews beat long cram sessions.", duration: 25 },
      { title: "Do 5 practice problems", why: "Practice reveals what you don't know yet.", duration: 30 },
      { title: "Email a question to your professor or TA", why: "Unblocks you faster than guessing.", duration: 10 },
      { title: "Make a one-page cheat sheet for the next unit", why: "Summarizing is how memory sticks.", duration: 20 },
    ];
  else if (/run|gym|fit|health|weight|workout|marathon|sleep/.test(g))
    base = [
      { title: "20-minute walk or jog", why: "Consistency matters more than intensity.", duration: 20 },
      { title: "Pack gym bag for tomorrow", why: "Removes friction from future you.", duration: 5 },
      { title: "Drink a full water bottle before lunch", why: "Tiny habit, real energy boost." },
      { title: "Stretch for 10 minutes", why: "Keeps you moving without burning out.", duration: 10 },
    ];
  else if (/job|intern|career|resume|apply|network/.test(g))
    base = [
      { title: "Update one section of your résumé", why: "Small edits add up to a strong résumé.", duration: 25 },
      { title: "Find 3 internships to apply to", why: "A short list makes applying less scary.", duration: 20 },
      { title: "Message one person on LinkedIn", why: "One connection a day compounds.", duration: 10 },
      { title: "Visit the career center site", why: "Free help you've already paid for.", duration: 10 },
    ];
  else
    base = [
      { title: `Spend 20 minutes on “${goal?.title ?? "your goal"}”`, why: "Showing up daily is the whole game.", duration: 20 },
      { title: "Write down the very next step", why: "Clarity turns big goals into action.", duration: 5 },
      { title: "Block 30 minutes in tomorrow's schedule", why: "Protected time actually gets used.", duration: 5 },
      { title: "Tidy your workspace", why: "A clear desk lowers the start-up cost.", duration: 10 },
    ];
  if (/procrastinat|phone|distract|scroll/.test(profile.challenge.toLowerCase()))
    base.push({ title: "Put phone in another room for one focus session", why: "You mentioned distractions — this helps directly.", duration: 25 });
  const rotated = [...base.slice(salt % base.length), ...base.slice(0, salt % base.length)];
  return rotated.slice(0, 4).map((b, i) => ({ ...b, id: `${salt}-${i}-${b.title}`, goalId: goal?.id }));
}
