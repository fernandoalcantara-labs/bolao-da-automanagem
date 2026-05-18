import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border-2 px-2.5 py-0.5 text-xs font-bold transition-colors",
  {
    variants: {
      variant: {
        default: "border-festive-green/30 bg-festive-green/10 text-festive-green",
        secondary: "border-festive-gold/40 bg-festive-gold/15 text-festive-gold-dark",
        destructive: "border-festive-red/40 bg-festive-red/10 text-festive-red",
        outline: "border-border bg-white text-foreground",
        success: "border-festive-green/40 bg-festive-green/15 text-festive-green",
        warning: "border-festive-orange/40 bg-festive-orange/15 text-festive-orange",
        muted: "border-transparent bg-muted text-muted-foreground",
        gold: "border-festive-gold/50 gradient-gold text-zinc-900 shadow-stack-gold",
        blue: "border-festive-blue/40 bg-festive-blue/10 text-festive-blue",
        purple: "border-festive-purple/40 bg-festive-purple/10 text-festive-purple",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
