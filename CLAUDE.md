# CLAUDE.md - Development Guidelines

## Tech Stack
- Next.js 16 with App Router
- TypeScript
- Tailwind CSS v4
- shadcn/ui components

## Component Guidelines

### UI Components
Always use shadcn/ui components when available. Components are located in `src/components/ui/`.

Available components:
- `Button` - from `@/components/ui/button`
- `Input` - from `@/components/ui/input`

To add new shadcn components, create them in `src/components/ui/` following the shadcn patterns.

### Animations & Transitions
Use the `motion` package (from `motion/react`) for all animations and transitions.

```tsx
import { motion, AnimatePresence } from "motion/react";

// Basic animation
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
>
  Content
</motion.div>

// Spring transitions (preferred)
<motion.div
  animate={{ x: 100 }}
  transition={{
    type: "spring",
    stiffness: 300,
    damping: 30,
  }}
>
  Content
</motion.div>

// AnimatePresence for enter/exit animations
<AnimatePresence mode="wait">
  {condition ? (
    <motion.div key="a" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      A
    </motion.div>
  ) : (
    <motion.div key="b" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      B
    </motion.div>
  )}
</AnimatePresence>
```

## Mobile-First Design
- Use `dvh` (dynamic viewport height) instead of `vh` for mobile browser compatibility
- Prevent vertical scrolling on full-page layouts using `overflow-hidden`
- Test layouts on mobile browsers where the address bar affects viewport height
