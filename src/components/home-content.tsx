"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface HomeContentProps {
  initialStarted?: boolean;
}

export function HomeContent({ initialStarted = false }: HomeContentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isStarted, setIsStarted] = useState(initialStarted);

  // Sync state with URL for smooth transitions
  useEffect(() => {
    const shouldBeStarted = pathname === "/start";
    if (shouldBeStarted !== isStarted) {
      setIsStarted(shouldBeStarted);
    }
  }, [pathname, isStarted]);

  const handleStart = () => {
    setIsStarted(true);
    // Use shallow routing to update URL without full page reload
    window.history.pushState(null, "", "/start");
  };

  useEffect(() => {
    if (isStarted && inputRef.current) {
      // Small delay to ensure animation has started
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isStarted]);

  return (
    <div className="fixed inset-0 flex flex-col bg-background overflow-hidden">
      <header className="flex justify-end p-4 shrink-0">
        <ThemeToggle />
      </header>
      <main className="flex-1 overflow-hidden">
        <motion.div
          className="flex flex-col items-center w-full"
          initial={false}
          animate={{
            paddingTop: isStarted ? "2rem" : "25svh",
          }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
          }}
        >
          <motion.h1
            className="text-6xl font-bold text-foreground"
            layout
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
            }}
          >
            deyes
          </motion.h1>

          <div className="mt-8 w-full max-w-md px-4">
            <AnimatePresence mode="wait" initial={false}>
              {!isStarted ? (
                <motion.div
                  key="button"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 25,
                  }}
                  className="flex justify-center"
                >
                  <Button
                    size="xl"
                    onClick={handleStart}
                    className="min-w-[200px]"
                  >
                    Start
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="input"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 25,
                  }}
                >
                  <Input
                    ref={inputRef}
                    type="text"
                    placeholder="Type something..."
                    className="h-14 text-lg px-6"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
