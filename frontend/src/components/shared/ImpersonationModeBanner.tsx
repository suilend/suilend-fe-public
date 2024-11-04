import { useRouter } from "next/router";

import { cloneDeep } from "lodash";
import { VenetianMask } from "lucide-react";

import Tooltip from "@/components/shared/Tooltip";
import {
  bodyClassNames,
  labelSansClassNames,
} from "@/components/shared/Typography";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  QueryParams as WalletContextQueryParams,
  useWalletContext,
} from "@/contexts/WalletContext";
import { formatAddress } from "@/lib/format";
import { shallowPushQuery } from "@/lib/router";
import { cn } from "@/lib/utils";

export default function ImpersonationModeBanner() {
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
        className="mb-6 cursor-pointer transition-colors hover:bg-muted/10"
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
