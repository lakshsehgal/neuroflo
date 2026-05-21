import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring/60 focus:ring-offset-1 focus:ring-offset-background",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-xs hover:bg-primary/85",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive/12 text-destructive ring-1 ring-inset ring-destructive/25 hover:bg-destructive/18",
        outline:
          "border-border text-foreground bg-transparent hover:bg-accent",
        success:
          "border-transparent bg-emerald-500/12 text-emerald-700 ring-1 ring-inset ring-emerald-500/25 dark:text-emerald-300",
        warning:
          "border-transparent bg-amber-500/12 text-amber-700 ring-1 ring-inset ring-amber-500/25 dark:text-amber-300",
        info:
          "border-transparent bg-sky-500/12 text-sky-700 ring-1 ring-inset ring-sky-500/25 dark:text-sky-300",
        brand:
          "border-transparent bg-brand-muted text-brand ring-1 ring-inset ring-brand/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
