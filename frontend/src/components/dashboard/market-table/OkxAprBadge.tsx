import Image from "next/image";
import Link from "next/link";

import BigNumber from "bignumber.js";
import { ExternalLink } from "lucide-react";

import { Side } from "@suilend/sdk";
import { formatPercent } from "@suilend/sui-fe";

import Tooltip from "@/components/shared/Tooltip";
import { TBody, TLabel } from "@/components/shared/Typography";

const OKX_WALLET_ICON_BASE64 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAJDSURBVHgB7Zq9jtpAEMfHlhEgQLiioXEkoAGECwoKxMcTRHmC5E3IoyRPkPAEkI7unJYmTgEFTYwA8a3NTKScLnCHN6c9r1e3P2llWQy7M/s1Gv1twCP0ej37dDq9x+Zut1t3t9vZjDEHIiSRSPg4ZpDL5fxkMvn1cDh8m0wmfugfO53OoFQq/crn8wxfY9EymQyrVCqMfHvScZx1p9ls3pFxXBy/bKlUipGPrVbLuQqAfsCliq3zl0H84zwtjQrOw4Mt1W63P5LvBm2d+Xz+YzqdgkqUy+WgWCy+Mc/nc282m4FqLBYL+3g8fjDxenq72WxANZbLJeA13zDX67UDioL5ybXwafMYu64Ltn3bdDweQ5R97fd7GyhBQMipx4POeEDHIu2LfDdBIGGz+hJ9CQ1ABjoA2egAZPM6AgiCAEQhsi/C4jHyPA/6/f5NG3Ks2+3CYDC4aTccDrn6ojG54MnEvG00GoVmWLIRNZ7wTCwDHYBsdACy0QHIhiuRETxlICWpMMhGZHmqS8qH6JLyGegAZKMDkI0uKf8X4SWlaZo+Pp1bRrwlJU8ZKLIvUjKh0WiQ3sRUbNVq9c5Ebew7KEo2m/1p4jJ4qAmDaqDQBzj5XyiAT4VCQezJigAU+IDU+z8vJFnGWeC+bKQV/5VZ71FV6L7PA3gg3tXrdQ+DgLhC+75Wq3no69P3MC0NFQpx2lL04Ql9gHK1bRDjsSBIvScBnDTk1WrlGIZBorIDEYJj+rhdgnQ67VmWRe0zlplXl81vcyEt0rSoYDUAAAAASUVORK5CYII=";

interface OkxAprBadgeProps {
  side: Side;
  aprPercent: BigNumber;
  href: string;
}

export default function OkxAprBadge({
  side,
  aprPercent,
  href,
}: OkxAprBadgeProps) {
  return (
    <Tooltip
      title={`Earn an additional ${formatPercent(aprPercent)} APR by ${side === Side.DEPOSIT ? "depositing" : "borrowing"} in OKX Wallet`}
    >
      <Link
        className="group -mr-1.5 flex w-max flex-row items-center gap-1.5 rounded-md bg-gradient-to-r from-primary/25 to-primary/0 px-1.5 py-1 transition-colors"
        href={href}
        target="_blank"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={OKX_WALLET_ICON_BASE64}
          alt="OKX Wallet"
          width={16}
          height={16}
        />

        <TLabel className="text-foreground">
          {formatPercent(aprPercent, { useAccountingSign: true })}
        </TLabel>
        <ExternalLink className="h-3 w-3 text-muted-foreground transition-colors group-hover:text-foreground" />
      </Link>
    </Tooltip>
  );
}
