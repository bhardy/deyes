"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, useAnimationControls } from "motion/react";
import { ThemeToggle } from "@/components/theme-toggle";

interface HomeContentProps {
  initialStarted?: boolean;
}

type AnimationPhase = "idle" | "transitioning" | "complete";

export function HomeContent({ initialStarted = false }: HomeContentProps) {
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [phase, setPhase] = useState<AnimationPhase>(initialStarted ? "complete" : "idle");
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);
  const maskControls = useAnimationControls();

  useEffect(() => {
    if (pathname === "/start" && phase === "idle") {
      setPhase("complete");
    }
  }, [pathname, phase]);

  const handleStart = async () => {
    if (buttonRef.current) {
      setButtonRect(buttonRef.current.getBoundingClientRect());
    }
    setPhase("transitioning");
    window.history.pushState(null, "", "/start");

    // Run the mask animation
    await maskControls.start({
      top: 88,
      backgroundColor: "var(--background)",
      borderColor: "var(--primary)",
      borderWidth: 2,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
      },
    });

    // Fade out the mask
    await maskControls.start({
      opacity: 0,
      transition: { duration: 0.2 },
    });

    setPhase("complete");
  };

  useEffect(() => {
    if (phase === "complete" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [phase]);

  const isComplete = phase === "complete";
  const isTransitioning = phase === "transitioning";

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      <header className="flex justify-end p-4 shrink-0">
        <ThemeToggle />
      </header>

      <main className="flex-1 flex flex-col items-center relative">
        {/* Content container */}
        <motion.div
          className="flex flex-col items-center w-full"
          initial={false}
          animate={{
            paddingTop: isComplete || isTransitioning ? 32 : "30%",
          }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
          }}
        >
          <motion.h1
            className="text-6xl font-bold text-foreground mb-8"
            initial={false}
            animate={{
              scale: 1,
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
            }}
          >
            deyes
          </motion.h1>

          <div className="w-full max-w-md px-4">
            {phase === "idle" && (
              <motion.button
                ref={buttonRef}
                onClick={handleStart}
                className="w-full h-14 rounded-lg bg-primary text-primary-foreground text-lg font-medium shadow hover:bg-primary/90 transition-colors"
                whileTap={{ scale: 0.98 }}
              >
                Start
              </motion.button>
            )}

            {isComplete && (
              <motion.input
                ref={inputRef}
                type="text"
                placeholder="Type something..."
                className="w-full h-14 rounded-lg border-2 border-primary bg-background px-6 text-lg shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15 }}
              />
            )}
          </div>
        </motion.div>

        {/* Animated mask layer */}
        {isTransitioning && buttonRect && (
          <motion.div
            className="fixed rounded-lg pointer-events-none"
            style={{
              left: buttonRect.left,
              width: buttonRect.width,
              height: buttonRect.height,
            }}
            initial={{
              top: buttonRect.top,
              backgroundColor: "var(--primary)",
              borderColor: "var(--primary)",
              borderWidth: 0,
              opacity: 1,
            }}
            animate={maskControls}
          />
        )}
      </main>
    </div>
  );
}
