import { PropsWithChildren } from "react";

import { ClassValue } from "clsx";

import { cn } from "@/lib/utils";

interface ContainerProps extends PropsWithChildren {
  className?: ClassValue;
}

export default function Container({ className, children }: ContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-[1440px] flex-col items-center px-4 md:px-10",
        className,
      )}
    >
      {children}
    </div>
  );
}
