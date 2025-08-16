import { CSSProperties } from "react";

import { Token } from "@suilend/sui-fe";

import TokenLogo from "@/components/shared/TokenLogo";
import { cn } from "@/lib/utils";

interface TokenLogosProps {
  tokens?: Token[];
  size: number;
  backgroundColor?: string;
}

export default function TokenLogos({
  tokens,
  size,
  backgroundColor,
}: TokenLogosProps) {
  if ((tokens ?? []).length === 0) return null;
  return (
    <div
      className="flex shrink-0 flex-row"
      style={
        {
          "--ml": `${size / 4}px`,
          "--bg-color-internal":
            backgroundColor ?? "var(--bg-color, hsl(var(--background)))",
        } as CSSProperties
      }
    >
      {(tokens ?? []).map((token, index) => (
        <TokenLogo
          key={token.coinType}
          className={cn(index !== 0 && "-ml-[var(--ml)]")}
          imageClassName={cn(
            "bg-[var(--bg-color-internal)]",
            index !== 0 &&
              "outline outline-1 outline-[var(--bg-color-internal)]",
          )}
          token={token}
          size={size}
        />
      ))}
    </div>
  );
}
