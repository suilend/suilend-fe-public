import { PropsWithChildren } from "react";

import { TDisplay } from "@/components/shared/Typography";

export default function SectionHeading({ children }: PropsWithChildren) {
  return (
    <TDisplay className="inline max-w-[840px] text-center text-3xl font-medium uppercase !leading-tight sm:text-4xl md:text-5xl">
      {children}
    </TDisplay>
  );
}
