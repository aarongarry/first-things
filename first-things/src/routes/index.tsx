import { createFileRoute } from "@tanstack/react-router";
import { StoreProvider, useStore } from "@/lib/store";
import { Onboarding } from "@/components/ft/Onboarding";
import { MainApp } from "@/components/ft/MainApp";
import { George } from "@/components/ft/kit";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "First Things — Do what matters before you scroll" },
      { name: "description", content: "A prototype app with George, an AI sidekick that helps college students finish meaningful tasks before distracting apps unlock." },
      { property: "og:title", content: "First Things — Do what matters before you scroll" },
      { property: "og:description", content: "Plan a daily list with George, earn breaks, and unlock your apps by making progress." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Clock() {
  return <span>9:41</span>;
}

function Phone() {
  const { s } = useStore();
  return (
    <div className="relative h-[820px] max-h-[94vh] w-[400px] shrink-0 rounded-[3rem] bg-phone p-3 shadow-2xl">
      <div className="relative flex h-full flex-col overflow-hidden rounded-[2.4rem] bg-background">
        <div className="flex items-center justify-between px-7 pb-1 pt-3 text-xs font-semibold">
          <Clock /><span className="absolute left-1/2 top-2 h-6 w-24 -translate-x-1/2 rounded-full bg-phone" /><span>●●● 5G ▮</span>
        </div>
        <div className="relative min-h-0 flex-1">{s.stage === "app" ? <MainApp /> : <Onboarding />}</div>
      </div>
    </div>
  );
}

function Notes() {
  return (
    <aside className="hidden max-w-xs text-sm text-desk-foreground lg:block">
      <div className="flex items-center gap-3"><George size={48} /><h1 className="text-3xl font-extrabold">First Things</h1></div>
      <p className="mt-3 opacity-80">Clickable prototype. Sign-up, texts, George's replies, calendar, app blocking and photo checks are all simulated with sample data.</p>
      <h2 className="mt-6 font-bold">Try this journey</h2>
      <ol className="mt-2 list-decimal space-y-1 pl-5 opacity-80">
        <li>Sign up (use “Fill demo details”)</li>
        <li>Meet George, chat, set a goal</li>
        <li>Accept a few suggested tasks</li>
        <li>Open TikTok in the Apps tab — it's blocked</li>
        <li>Complete tasks, earn and start a break</li>
        <li>Finish everything to unlock apps</li>
      </ol>
      <h2 className="mt-6 font-bold">Prototype assumptions</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 opacity-80">
        <li>At midnight, unfinished one-time tasks carry over to the next day.</li>
        <li>Unused breaks expire at midnight.</li>
        <li>Break milestones landing on the last task are replaced by full unlock.</li>
        <li>Use “Simulate midnight” in Settings to see the reset.</li>
      </ul>
    </aside>
  );
}

function Index() {
  return (
    <StoreProvider>
      <main className="flex min-h-screen items-center justify-center gap-16 p-4">
        <Notes />
        <Phone />
      </main>
    </StoreProvider>
  );
}
