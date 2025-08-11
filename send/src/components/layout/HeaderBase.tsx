import { PropsWithChildren } from "react";

import { ClassValue } from "clsx";

import Container from "@/components/shared/Container";
import { cn } from "@/lib/utils";

export const HEADER_HEIGHT = 64; // px

interface HeaderBaseProps extends PropsWithChildren {
  className?: ClassValue;
}

export default function HeaderBase({ className, children }: HeaderBaseProps) {
  return (
    <>
      <div
        className={cn("w-full shrink-0", className)}
        style={{ height: `${HEADER_HEIGHT}px` }}
      />
      <div
        className={cn(
          "fixed left-0 z-[2] border-b bg-background/60 backdrop-blur-lg",
          className,
        )}
        style={{
          top: "var(--header-top)",
          right: "var(--removed-body-scroll-bar-size, 0)",
        }}
      >
        <Container>
          <div
            className="flex w-full flex-row items-center justify-between gap-4"
            style={{ height: `${HEADER_HEIGHT}px` }}
          >
            {children}
          </div>
        </Container>
      </div>
    </>
  );
}
