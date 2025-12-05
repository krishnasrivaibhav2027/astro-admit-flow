import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-95",
  {
    variants: {
      variant: {
        default: "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 shadow-sm dark:bg-gradient-to-b dark:from-primary/90 dark:to-primary dark:text-primary-foreground dark:shadow-lg dark:hover:shadow-xl dark:hover:brightness-110 dark:border-t dark:border-white/20",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-md",
        outline: "border-2 border-primary bg-background text-primary hover:bg-primary hover:text-primary-foreground shadow-sm",
        secondary: "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 shadow-sm dark:bg-secondary dark:text-secondary-foreground dark:hover:bg-secondary/80 dark:shadow-md dark:hover:shadow-lg dark:border-t dark:border-white/40",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        hero: "bg-gradient-to-r from-primary via-blue-500 to-primary text-white hover:opacity-90 shadow-lg hover:shadow-xl glow-effect border-t border-white/30",
        glow: "bg-primary text-primary-foreground hover:bg-primary/90 glow-effect shadow-lg"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-12 rounded-lg px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };

