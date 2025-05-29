import { useRouter } from "next/router";

import { ClassValue } from "clsx";
import { cloneDeep } from "lodash";
import { VenetianMask } from "lucide-react";

import { formatAddress } from "@suilend/sui-fe";
import {
  WalletContextQueryParams,
  shallowPushQuery,
  useWalletContext,
} from "@suilend/sui-fe-next";

import Tooltip from "@/components/shared/Tooltip";
import {
  bodyClassNames,
  labelSansClassNames,
} from "@/components/shared/Typography";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface ImpersonationModeBannerProps {
  className?: ClassValue;
}

export default function ImpersonationModeBanner({
  className,
}: ImpersonationModeBannerProps) {
  const router = useRouter();

  const { isImpersonating, address } = useWalletContext();

  const onClick = () => {
    const restQuery = cloneDeep(router.query);
    delete restQuery[WalletContextQueryParams.WALLET];
    shallowPushQuery(router, restQuery);
  };

  return (
    isImpersonating &&
    address && (
      <Alert
        className={cn(
          "w-full cursor-pointer rounded-sm transition-colors hover:bg-muted/10",
          className,
        )}
        onClick={onClick}
      >
        <div className="flex flex-row items-center gap-4">
          <VenetianMask className="h-8 w-8" />
          <div className="flex-1">
            <AlertTitle
              className={cn(bodyClassNames, "uppercase tracking-normal")}
            >
              {"Impersonating "}
              <Tooltip title={address}>
                <span>{formatAddress(address, 12)}</span>
              </Tooltip>
            </AlertTitle>
            <AlertDescription className={labelSansClassNames}>
              Click this banner to exit impersonation mode.
            </AlertDescription>
          </div>
        </div>
      </Alert>
    )
  );
}
