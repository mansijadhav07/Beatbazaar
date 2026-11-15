import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded font-medium transition-[transform,opacity] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-steel focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 touch-manipulation",
  {
    variants: {
      variant: {
        default:
          "bg-brass text-ink-dark hover:bg-brass-dark active:bg-brass-dark font-semibold",
        secondary:
          "bg-mist text-ink hover:bg-mist-dark active:bg-mist-dark",
        outline:
          "border border-border bg-surface text-ink hover:bg-surface-muted active:bg-surface-subtle",
        ghost:
          "text-ink hover:bg-surface-muted active:bg-surface-subtle",
        danger:
          "bg-status-danger text-surface hover:opacity-90 active:opacity-100",
      },
      size: {
        default: "h-11 sm:h-10 px-4 py-2 text-sm",
        sm: "h-11 px-3 text-sm sm:h-10",
        lg: "h-11 px-6 text-base sm:h-10",
        icon: "h-11 w-11 sm:h-10 sm:w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
