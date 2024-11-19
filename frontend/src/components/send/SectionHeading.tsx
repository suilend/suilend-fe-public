import { PropsWithChildren } from "react";

import { TDisplay } from "@/components/shared/Typography";

export default function SectionHeading({ children }: PropsWithChildren) {
  return (
    <TDisplay className="inline max-w-[800px] text-center font-sans text-4xl font-bold !leading-tight md:text-5xl">
      {children}
    </TDisplay>
  );
}
