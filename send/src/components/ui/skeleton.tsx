import * as React from "react";

type SkeletonProps = React.HTMLAttributes<HTMLDivElement> & {
  rounded?: string;
};

export function Skeleton({ className = "", rounded, ...props }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-muted ${rounded ? rounded : "rounded-md"} ${className}`}
      {...props}
    />
  );
}
