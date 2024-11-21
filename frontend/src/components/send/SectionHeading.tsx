import { PropsWithChildren } from "react";

import { TDisplay } from "@/components/shared/Typography";

export default function SectionHeading({ children }: PropsWithChildren) {
  return (
    <TDisplay className="inline max-w-[960px] text-center text-4xl font-medium uppercase !leading-tight md:text-5xl">
      {children}
    </TDisplay>
  );
}
