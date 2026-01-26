import * as React from "react"

import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  // Extract margin classes from className and apply to outer wrapper
  const marginClasses = className?.split(' ').filter(c =>
    c.startsWith('m-') || c.startsWith('mt-') || c.startsWith('mb-') ||
    c.startsWith('ml-') || c.startsWith('mr-') || c.startsWith('mx-') ||
    c.startsWith('my-')
  ).join(' ') || '';

  // Keep other classes for inner div
  const otherClasses = className?.split(' ').filter(c =>
    !(c.startsWith('m-') || c.startsWith('mt-') || c.startsWith('mb-') ||
      c.startsWith('ml-') || c.startsWith('mr-') || c.startsWith('mx-') ||
      c.startsWith('my-'))
  ).join(' ') || '';

  return (
    <div
      className={cn(
        // Gradient border wrapper for dark mode
        "p-[2px] rounded-lg",
        "dark:bg-[linear-gradient(to_bottom_right,#369C76,#39EB6E,#369976)]",
        marginClasses
      )}
    >
      <div
        ref={ref}
        className={cn(
          "rounded-lg bg-card text-card-foreground shadow-sm",
          "border border-border",
          "dark:border-transparent dark:shadow-none",
          otherClasses
        )}
        {...props}
      />
    </div>
  );
})
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
