import { formatISO } from "date-fns";
import { TableProperties } from "lucide-react";

import { useAdminContext } from "@/components/admin/AdminContext";
import Button from "@/components/shared/Button";
import Dialog from "@/components/shared/Dialog";
import Grid from "@/components/shared/Grid";
import LabelWithValue from "@/components/shared/LabelWithValue";

export default function RateLimiterPropertiesDialog() {
  const { appData } = useAdminContext();

  const rateLimiter = appData.lendingMarket.rateLimiter;

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
        title: { icon: <TableProperties />, children: "Properties" },
      }}
    >
      <Grid>
        <LabelWithValue
          label="$typeName"
          value={rateLimiter.$typeName}
          isType
        />
        <LabelWithValue label="curQty" value={rateLimiter.curQty.toString()} />
        <LabelWithValue
          label="windowStart"
          value={formatISO(new Date(Number(rateLimiter.windowStart) * 1000))}
        />
        <LabelWithValue
          label="prevQty"
          value={rateLimiter.prevQty.toString()}
        />
      </Grid>
    </Dialog>
  );
}
