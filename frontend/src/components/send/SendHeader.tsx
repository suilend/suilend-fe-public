import { ClassValue } from "clsx";

import { cn } from "@/lib/utils";

interface SendHeaderProps {
  className?: ClassValue;
}

export default function SendHeader({ className }: SendHeaderProps) {
  return (
    <div className={cn("-mt-4 w-full md:-mt-6", className)}>
      <div className="-mx-4 flex h-[180px] flex-row justify-center md:-mx-10 md:h-[240px]">
        <div
          className="flex w-full max-w-[calc(1440px-40px*2)]"
          style={{
            backgroundImage: "url('/assets/points/header.png')",
            backgroundPosition: "top center",
            backgroundSize: "cover",
            backgroundRepeat: "no-repeat",
          }}
        />
      </div>
    </div>
  );
}
