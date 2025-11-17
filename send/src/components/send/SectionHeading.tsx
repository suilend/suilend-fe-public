import { PropsWithChildren } from "react";

import { TDisplay } from "@/components/shared/Typography";

interface SectionHeadingProps extends PropsWithChildren {
  id?: string;
}

export default function SectionHeading({ id, children }: SectionHeadingProps) {
  return (
    <TDisplay
      id={id}
      className="inline max-w-[720px] text-center text-3xl font-medium uppercase !leading-tight sm:text-4xl md:text-5xl"
    >
      {children}
    </TDisplay>
  );
}
