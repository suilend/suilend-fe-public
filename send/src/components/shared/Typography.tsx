import { forwardRef } from "react";

import { cn } from "@/lib/utils";

// | 'display'
// | 'title'
// | 'headline'
// | 'body'
// | 'bodyMono'
// | 'label'
// | 'caption'
// | 'captionMono'
// | 'disclosure';

export const displayClassNames =
  "text-foreground font-mono text-lg font-normal";
export const primaryTitleClassNames =
  "text-foreground font-mono text-lg font-normal";
export const titleClassNames = "text-primary font-mono text-sm font-normal";
export const bodyClassNames = "text-foreground font-mono text-sm font-normal";
export const bodySansClassNames =
  "text-foreground font-sans text-sm font-normal";
export const labelClassNames =
  "text-muted-foreground font-mono text-xs font-normal";
export const labelSansClassNames =
  "text-muted-foreground font-sans text-xs font-normal";

// Display
export const TDisplay = forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  return (
    <p ref={ref} className={cn(displayClassNames, className)} {...props}>
      {children}
    </p>
  );
});
TDisplay.displayName = "TDisplay";

// Primary Title (h1)
export const TPrimaryTitle = forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, children, ...props }, ref) => {
  return (
    <h1 ref={ref} className={cn(primaryTitleClassNames, className)} {...props}>
      {children}
    </h1>
  );
});
TPrimaryTitle.displayName = "TPrimaryTitle";

// Title (h2)
export const TTitle = forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, children, ...props }, ref) => {
  return (
    <h2 ref={ref} className={cn(titleClassNames, className)} {...props}>
      {children}
    </h2>
  );
});
TTitle.displayName = "TTitle";

// Body (sm, foreground)
export const TBody = forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  return (
    <p ref={ref} className={cn(bodyClassNames, className)} {...props}>
      {children}
    </p>
  );
});
TBody.displayName = "TBody";

export const TBodySans = forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  return (
    <p ref={ref} className={cn(bodySansClassNames, className)} {...props}>
      {children}
    </p>
  );
});
TBodySans.displayName = "TBodySans";

// Label (xs, muted)
export const TLabel = forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  return (
    <p ref={ref} className={cn(labelClassNames, className)} {...props}>
      {children}
    </p>
  );
});
TLabel.displayName = "TLabel";

export const TLabelSans = forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  return (
    <p ref={ref} className={cn(labelSansClassNames, className)} {...props}>
      {children}
    </p>
  );
});
TLabelSans.displayName = "TLabelSans";
