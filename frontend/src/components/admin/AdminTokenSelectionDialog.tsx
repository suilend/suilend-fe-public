import { SUI_COINTYPE, Token, getToken, isSui } from "@suilend/sui-fe";
import { useSettingsContext } from "@suilend/sui-fe-next";

import CopyToClipboardButton from "@/components/shared/CopyToClipboardButton";
import OpenOnExplorerButton from "@/components/shared/OpenOnExplorerButton";
import TokenSelectionDialog from "@/components/shared/TokenSelectionDialog";
import { TLabelSans } from "@/components/shared/Typography";
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
      <div className="flex flex-row items-center gap-1">
        <TLabelSans>coin</TLabelSans>
        {token && (
          <div className="flex h-4 flex-row items-center">
            <CopyToClipboardButton
              className="h-6 w-6 hover:bg-transparent"
              iconClassName="w-3 h-3"
              value={isSui(token.coinType) ? SUI_COINTYPE : token.coinType}
            />
            <OpenOnExplorerButton
              className="h-6 w-6 hover:bg-transparent"
              iconClassName="w-3 h-3"
              url={explorer.buildCoinUrl(token.coinType)}
            />
          </div>
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
