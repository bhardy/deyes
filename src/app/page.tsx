import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex justify-end p-4">
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-center justify-center">
        <h1 className="text-6xl font-bold text-foreground">deyes</h1>
      </main>
    </div>
  );
}
