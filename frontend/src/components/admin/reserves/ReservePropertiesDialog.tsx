import { formatISO } from "date-fns";
import { TableProperties } from "lucide-react";

import { ParsedReserve } from "@suilend/sdk/parsers/reserve";
import { useSettingsContext } from "@suilend/sui-fe-next";

import { useAdminContext } from "@/components/admin/AdminContext";
import SteammPoolBadges from "@/components/admin/reserves/SteammPoolBadges";
import Button from "@/components/shared/Button";
import Dialog from "@/components/shared/Dialog";
import Grid from "@/components/shared/Grid";
import LabelWithValue from "@/components/shared/LabelWithValue";
import { getPoolInfo } from "@/lib/admin";

interface ReservePropertiesDialogProps {
  reserve: ParsedReserve;
}

export default function ReservePropertiesDialog({
  reserve,
}: ReservePropertiesDialogProps) {
  const { explorer } = useSettingsContext();

  const { steammPoolInfos } = useAdminContext();
  const poolInfo = getPoolInfo(steammPoolInfos, reserve.coinType);

  return (
    <Dialog
      trigger={
        <Button
          labelClassName="uppercase text-xs"
          startIcon={<TableProperties />}
          variant="secondaryOutline"
        >
          Properties
        </Button>
      }
      headerProps={{
        title: {
          icon: <TableProperties />,
          children: (
            <>
              {reserve.token.symbol}
              {poolInfo && (
                <>
                  {" "}
                  <SteammPoolBadges poolInfo={poolInfo} />
                </>
              )}{" "}
              Properties
            </>
          ),
        },
      }}
    >
      <Grid>
        <LabelWithValue label="$typeName" value={reserve.$typeName} isType />
        <LabelWithValue
          label="id"
          value={reserve.id}
          isId
          url={explorer.buildObjectUrl(reserve.id)}
          isExplorerUrl
        />
        <LabelWithValue
          label="coinType"
          value={reserve.coinType}
          isType
          url={explorer.buildCoinUrl(reserve.coinType)}
          isExplorerUrl
        />
        <LabelWithValue label="mintDecimals" value={reserve.mintDecimals} />
        <LabelWithValue
          label="priceIdentifier"
          value={reserve.priceIdentifier}
          isId
        />
        <LabelWithValue label="price" value={reserve.price.toString()} />
        <LabelWithValue
          label="smoothedPrice"
          value={reserve.smoothedPrice.toString()}
        />
        <LabelWithValue label="minPrice" value={reserve.minPrice.toString()} />
        <LabelWithValue label="maxPrice" value={reserve.maxPrice.toString()} />
        <LabelWithValue
          label="priceLastUpdateTimestampS"
          value={formatISO(
            new Date(Number(reserve.priceLastUpdateTimestampS) * 1000),
          )}
        />
        <LabelWithValue
          label="availableAmount"
          value={reserve.availableAmount.toString()}
        />
        <LabelWithValue
          label="ctokenSupply"
          value={reserve.ctokenSupply.toString()}
        />
        <LabelWithValue
          label="borrowedAmount"
          value={reserve.borrowedAmount.toString()}
        />
        <LabelWithValue
          label="cumulativeBorrowRate"
          value={reserve.cumulativeBorrowRate.toString()}
        />
        <LabelWithValue
          label="interestLastUpdateTimestampS"
          value={formatISO(
            new Date(Number(reserve.interestLastUpdateTimestampS) * 1000),
          )}
        />
        <LabelWithValue
          label="unclaimedSpreadFees"
          value={reserve.unclaimedSpreadFees.toString()}
        />
        <LabelWithValue
          label="attributedBorrowValue"
          value={reserve.attributedBorrowValue.toString()}
        />
      </Grid>
    </Dialog>
  );
}
