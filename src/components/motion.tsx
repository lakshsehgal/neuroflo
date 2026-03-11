"use client";

import { motion, AnimatePresence } from "framer-motion";

// Page wrapper — fade + subtle slide up
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

// Staggered container for lists/grids
export function StaggerContainer({
  children,
  className,
  staggerDelay = 0.05,
}: {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

// Individual stagger item
export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 12 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.3, ease: "easeOut" },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

// Card with hover lift + scale effect (monday.com style)
export function HoverCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      whileHover={{
        y: -2,
        scale: 1.01,
        boxShadow: "0 8px 25px -8px rgba(0, 0, 0, 0.1)",
      }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      {children}
    </motion.div>
  );
}

// Table row animation
export function AnimatedRow({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <motion.tr
      className={className}
      onClick={onClick}
      variants={{
        hidden: { opacity: 0, x: -8 },
        visible: {
          opacity: 1,
          x: 0,
          transition: { duration: 0.25, ease: "easeOut" },
        },
      }}
      whileHover={{ backgroundColor: "rgba(0,0,0,0.02)" }}
    >
      {children}
    </motion.tr>
  );
}

// Animated table body
export function AnimatedTableBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.tbody
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: 0.04 },
        },
      }}
    >
      {children}
    </motion.tbody>
  );
}

// Fade in section
export function FadeIn({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

// Animated counter for stat numbers
export function AnimatedNumber({ value }: { value: number }) {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
    >
      {value}
    </motion.span>
  );
}

// Re-export for convenience
export { motion, AnimatePresence };
