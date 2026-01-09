"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, LayoutGroup } from "motion/react";
import { ThemeToggle } from "@/components/theme-toggle";

interface HomeContentProps {
  initialStarted?: boolean;
}

export function HomeContent({ initialStarted = false }: HomeContentProps) {
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isStarted, setIsStarted] = useState(initialStarted);

  useEffect(() => {
    const shouldBeStarted = pathname === "/start";
    if (shouldBeStarted !== isStarted) {
      setIsStarted(shouldBeStarted);
    }
  }, [pathname, isStarted]);

  const handleStart = () => {
    setIsStarted(true);
    window.history.pushState(null, "", "/start");
  };

  useEffect(() => {
    if (isStarted && inputRef.current) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isStarted]);

  const springTransition = {
    type: "spring" as const,
    stiffness: 400,
    damping: 30,
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      <header className="flex justify-end p-4 shrink-0">
        <ThemeToggle />
      </header>

      <LayoutGroup>
        <motion.main
          className="flex-1 flex flex-col items-center"
          layout
          initial={false}
          animate={{
            justifyContent: isStarted ? "flex-start" : "center",
            paddingTop: isStarted ? 32 : 0,
          }}
          transition={springTransition}
        >
          <motion.h1
            layout
            className="text-6xl font-bold text-foreground mb-8"
            transition={springTransition}
          >
            deyes
          </motion.h1>

          <motion.div
            layoutId="action-element"
            className="w-full max-w-md px-4"
            transition={springTransition}
          >
            {!isStarted ? (
              <motion.button
                onClick={handleStart}
                className="w-full h-14 rounded-lg bg-primary text-primary-foreground text-lg font-medium shadow hover:bg-primary/90 transition-colors"
                whileTap={{ scale: 0.98 }}
              >
                Start
              </motion.button>
            ) : (
              <motion.input
                ref={inputRef}
                type="text"
                placeholder="Type something..."
                className="w-full h-14 rounded-lg border border-input bg-background px-6 text-lg shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15, duration: 0.2 }}
              />
            )}
          </motion.div>
        </motion.main>
      </LayoutGroup>
    </div>
  );
}
