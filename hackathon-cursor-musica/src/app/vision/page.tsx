import VisionClient from "@/components/VisionClient";

export const metadata = {
  title: "Body Drum — Vision",
};

export default function VisionPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-8 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Body Drum — Vision
        </h1>
        <p className="max-w-xl text-zinc-600 dark:text-zinc-400">
          Stand back so your upper body and arms are visible, then hit a limb
          with the opposite hand. Each strike fires a{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5 text-sm dark:bg-zinc-800">
            vision:hit
          </code>{" "}
          event the music branch listens for.
        </p>
      </header>
      <VisionClient />
    </main>
  );
}
