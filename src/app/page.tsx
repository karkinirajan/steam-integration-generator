import { Generator } from "@/components/Generator";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">STEAM Integration Generator</h1>
        <p className="mt-1 text-muted">STEAM integration ideas and 5E lesson plans for any topic and age group, in English or Nepali, with the AI model of your choice.</p>
      </header>
      <Generator />
      <footer className="mt-10 text-center text-xs text-muted">
        Based on{" "}
        <a className="underline" href="https://github.com/rajat-ed/steam-integration-generator" target="_blank" rel="noreferrer">
          rajat-ed/steam-integration-generator
        </a>{" "}
        (MIT).
      </footer>
    </main>
  );
}
