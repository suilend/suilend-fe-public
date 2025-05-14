import { Token, getToken } from "@suilend/frontend-sui";
import { useSettingsContext } from "@suilend/frontend-sui-next";

import OpenOnExplorerButton from "@/components/shared/OpenOnExplorerButton";
import { TLabelSans } from "@/components/shared/Typography";
import TokenSelectionDialog from "@/components/TokenSelectionDialog";
import { useLoadedUserContext } from "@/contexts/UserContext";

interface AdminTokenSelectionDialogProps {
  token?: Token;
  onSelectToken: (token: Token) => void;
}

export default function AdminTokenSelectionDialog({
  token,
  onSelectToken,
}: AdminTokenSelectionDialogProps) {
  const { explorer } = useSettingsContext();
  const { rawBalancesMap, balancesCoinMetadataMap } = useLoadedUserContext();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-4 flex-row items-center gap-1">
        <TLabelSans>coin</TLabelSans>
        {token && (
          <OpenOnExplorerButton url={explorer.buildCoinUrl(token.coinType)} />
        )}
      </div>

      <TokenSelectionDialog
        triggerClassName="h-10 w-max"
        triggerLabelSelectedClassName="!text-sm"
        triggerLabelUnselectedClassName="!text-sm uppercase"
        token={token}
        tokens={Object.entries(rawBalancesMap ?? {})
          .filter(([coinType]) => !!balancesCoinMetadataMap?.[coinType])
          .map(([coinType]) =>
            getToken(coinType, balancesCoinMetadataMap![coinType]),
          )}
        onSelectToken={onSelectToken}
      />
    </div>
  );
}
