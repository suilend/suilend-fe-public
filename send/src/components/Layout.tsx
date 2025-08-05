import { PropsWithChildren } from "react";

import AppHeader from "@/components/layout/AppHeader";
import Container from "@/components/shared/Container";

export default function Layout({ children }: PropsWithChildren) {
  return (
    <div className="relative z-[1] flex min-h-dvh flex-col max-md:pb-10">
      {/* Header */}
      <AppHeader />

      {/* Content */}
      <div className="relative z-[1] flex flex-1 flex-col py-4 md:py-20">
        <Container className="flex-1">{children}</Container>
      </div>

      {/* Footer */}
    </div>
  );
}
