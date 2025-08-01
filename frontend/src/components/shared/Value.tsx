import { ReactNode } from "react";

import BigNumber from "bignumber.js";
import { ClassValue } from "clsx";

import { formatId, formatType, formatUsd } from "@suilend/sui-fe";

import CopyToClipboardButton from "@/components/shared/CopyToClipboardButton";
import OpenOnExplorerButton from "@/components/shared/OpenOnExplorerButton";
import OpenURLButton from "@/components/shared/OpenURLButton";
import Tooltip from "@/components/shared/Tooltip";
import { TBody } from "@/components/shared/Typography";
import { cn } from "@/lib/utils";

interface ValueProps {
  className?: ClassValue;
  valueStartDecorator?: ReactNode;
  value: string | number | BigNumber | ReactNode;
  valueTooltip?: string | ReactNode;
  valueEndDecorator?: ReactNode;
  isId?: boolean;
  isType?: boolean;
  isUsd?: boolean;
  url?: string;
  urlTooltip?: string;
  isExplorerUrl?: boolean;
}

export default function Value({
  className,
  valueStartDecorator,
  value,
  valueTooltip,
  valueEndDecorator,
  isId,
  isType,
  isUsd,
  url,
  urlTooltip,
  isExplorerUrl,
}: ValueProps) {
  return (
    <div className={cn("flex flex-row gap-1", className)}>
      {valueStartDecorator}
      {isId || isType ? (
        <>
          <Tooltip title={valueTooltip ?? (value as string)}>
            <TBody className="w-fit break-all uppercase">
              {(isId ? formatId : formatType)((value as string).toString())}
            </TBody>
          </Tooltip>
        </>
      ) : isUsd ? (
        <>
          <Tooltip title={valueTooltip}>
            <TBody>{formatUsd(value as BigNumber)}</TBody>
          </Tooltip>
        </>
      ) : (
        <>
          <Tooltip title={valueTooltip}>
            <TBody>{value as string | number | ReactNode}</TBody>
          </Tooltip>
        </>
      )}
      {valueEndDecorator}

      {(isId || isType || url) && (
        <div className="-my-1.5 flex flex-row">
          {(isId || isType) && (
            <CopyToClipboardButton value={(value as string).toString()} />
          )}

          {url &&
            (isExplorerUrl ? (
              <OpenOnExplorerButton url={url} />
            ) : (
              <OpenURLButton url={url}>{urlTooltip}</OpenURLButton>
            ))}
        </div>
      )}
    </div>
  );
}
