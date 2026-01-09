"use client";

import { useRef, useState } from "react";
import { motion } from "motion/react";
import { ThemeToggle } from "@/components/theme-toggle";

interface HomeContentProps {
  initialStarted?: boolean;
}

export function HomeContent({ initialStarted = false }: HomeContentProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isStarted, setIsStarted] = useState(initialStarted);

  const handleStart = () => {
    setIsStarted(true);
    window.history.pushState(null, "", "/start");
    inputRef.current?.focus();
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      <header className="flex justify-end p-4 shrink-0">
        <ThemeToggle />
      </header>

      <main className="flex-1 flex flex-col items-center justify-center">
        <h1 className="text-6xl font-bold text-foreground mb-8">
          deyes
        </h1>

        <div className="w-full max-w-md px-4 relative">
          {/* Input underneath */}
          <input
            ref={inputRef}
            type="text"
            placeholder="Type something..."
            className="w-full h-14 rounded-lg border-2 border-primary bg-background px-6 text-lg placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />

          {/* Button on top */}
          <motion.button
            onClick={handleStart}
            className="absolute inset-0 w-full h-14 rounded-lg bg-primary text-primary-foreground text-lg font-medium shadow hover:bg-primary/90"
            initial={{ opacity: 1 }}
            animate={{ opacity: isStarted ? 0 : 1 }}
            transition={{ duration: 0.2 }}
            style={{ pointerEvents: isStarted ? "none" : "auto" }}
          >
            Start
          </motion.button>
        </div>
      </main>
    </div>
  );
}
