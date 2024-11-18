import { formatISO } from "date-fns";
import { TableProperties } from "lucide-react";

import Dialog from "@/components/admin/Dialog";
import Button from "@/components/shared/Button";
import Grid from "@/components/shared/Grid";
import LabelWithValue from "@/components/shared/LabelWithValue";
import { useLoadedAppContext } from "@/contexts/AppContext";

export default function RateLimiterPropertiesDialog() {
  const { data } = useLoadedAppContext();

  const rateLimiter = data.lendingMarket.rateLimiter;

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
      titleIcon={<TableProperties />}
      title="Properties"
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
