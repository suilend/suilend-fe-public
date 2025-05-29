import { useRef, useState } from "react";

import { Transaction } from "@mysten/sui/transactions";
import { Eraser, Plus, Rss } from "lucide-react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

import { ADMIN_ADDRESS } from "@suilend/sdk";
import { Token } from "@suilend/sui-fe";
import { useWalletContext } from "@suilend/sui-fe-next";

import { useAdminContext } from "@/components/admin/AdminContext";
import AdminTokenSelectionDialog from "@/components/admin/AdminTokenSelectionDialog";
import ReserveConfig, {
  ConfigState,
  parseConfigState,
  useReserveConfigState,
} from "@/components/admin/reserves/ReserveConfig";
import Button from "@/components/shared/Button";
import Dialog from "@/components/shared/Dialog";
import Grid from "@/components/shared/Grid";
import Input from "@/components/shared/Input";
import { useLoadedUserContext } from "@/contexts/UserContext";

export default function AddReserveDialog() {
  const { address, signExecuteAndWaitForTransaction } = useWalletContext();
  const { refresh } = useLoadedUserContext();

  const { appData } = useAdminContext();

  const isEditable = address === ADMIN_ADDRESS;

  // State
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);

  const [token, setToken] = useState<Token | undefined>(undefined);
  const [pythPriceId, setPythPriceId] = useState<string>("");

  const initialConfigStateRef = useRef<ConfigState>({
    openLtvPct: "",
    closeLtvPct: "",
    maxCloseLtvPct: "",
    borrowWeightBps: "",
    depositLimit: "",
    borrowLimit: "",
    liquidationBonusBps: "",
    maxLiquidationBonusBps: "",
    depositLimitUsd: "",
    borrowLimitUsd: "",
    borrowFeeBps: "",
    spreadFeeBps: "",
    protocolLiquidationFeeBps: "",
    isolated: false,
    openAttributedBorrowLimitUsd: "",
    closeAttributedBorrowLimitUsd: "",
    interestRate: [
      {
        id: uuidv4(),
        utilPercent: "0",
        aprPercent: "0",
      },
    ],
  });

  const reserveConfigState = useReserveConfigState(
    initialConfigStateRef.current,
  );
  const { configState, resetConfigState } = reserveConfigState;

  const reset = () => {
    setToken(undefined);
    setPythPriceId("");

    resetConfigState();
  };

  // Submit
  const createPriceFeed = async () => {
    if (pythPriceId === "") {
      toast.error("Enter a pyth price id");
      return;
    }

    const transaction = new Transaction();

    try {
      const priceUpdateData =
        await appData.suilendClient.pythConnection.getPriceFeedsUpdateData([
          pythPriceId,
        ]);
      await appData.suilendClient.pythClient.createPriceFeed(
        transaction,
        priceUpdateData,
      );

      await signExecuteAndWaitForTransaction(transaction);

      toast.success("Pyth price feed created");
    } catch (err) {
      toast.error("Failed to create Pyth price feed", {
        description: (err as Error)?.message || "An unknown error occurred",
      });
    }
  };

  const submit = async () => {
    if (!address) throw new Error("Wallet not connected");
    if (!appData.lendingMarket.ownerCapId)
      throw new Error("Error: lendingMarket.ownerCapId not defined");

    if (token === undefined) {
      toast.error("Select a coin");
      return;
    }
    if (pythPriceId === "") {
      toast.error("Enter a pyth price id");
      return;
    }
    if (
      configState.openLtvPct === "" ||
      configState.closeLtvPct === "" ||
      configState.maxCloseLtvPct === "" ||
      configState.borrowWeightBps === "" ||
      configState.depositLimit === "" ||
      configState.borrowLimit === "" ||
      configState.liquidationBonusBps === "" ||
      configState.maxLiquidationBonusBps === "" ||
      configState.depositLimitUsd === "" ||
      configState.borrowLimitUsd === "" ||
      configState.borrowFeeBps === "" ||
      configState.spreadFeeBps === "" ||
      configState.protocolLiquidationFeeBps === "" ||
      configState.openAttributedBorrowLimitUsd === "" ||
      configState.closeAttributedBorrowLimitUsd === ""
    ) {
      toast.error("Some config values missing");
      return;
    }

    const transaction = new Transaction();
    const newConfig = parseConfigState(configState, token.decimals);

    try {
      await appData.suilendClient.createReserve(
        appData.lendingMarket.ownerCapId,
        transaction,
        pythPriceId,
        token.coinType,
        newConfig,
      );

      await signExecuteAndWaitForTransaction(transaction);

      toast.success("Reserve added");
      setIsDialogOpen(false);
      reset();
    } catch (err) {
      toast.error("Failed to add reserve", {
        description: (err as Error)?.message || "An unknown error occurred",
      });
    } finally {
      refresh();
    }
  };

  return (
    <Dialog
      rootProps={{ open: isDialogOpen, onOpenChange: setIsDialogOpen }}
      trigger={
        <Button
          className="w-fit"
          labelClassName="uppercase"
          startIcon={<Plus />}
          variant="secondary"
        >
          Add reserve
        </Button>
      }
      headerProps={{
        title: { icon: <Plus />, children: "Add Reserve" },
      }}
      footerProps={{
        children: (
          <>
            <Button
              tooltip="Clear"
              icon={<Eraser />}
              variant="ghost"
              size="icon"
              onClick={reset}
            >
              Clear
            </Button>
            <Button
              className="flex-1"
              labelClassName="uppercase"
              size="lg"
              onClick={submit}
              disabled={!isEditable}
            >
              Add
            </Button>
          </>
        ),
      }}
    >
      <Grid>
        <AdminTokenSelectionDialog token={token} onSelectToken={setToken} />
        <div className="flex w-full flex-row items-end gap-2">
          <Input
            className="flex-1"
            label="pythPriceId"
            id="pythPriceId"
            value={pythPriceId}
            onChange={setPythPriceId}
          />
          <Button
            className="my-1"
            tooltip="Create price feed"
            icon={<Rss />}
            variant="secondary"
            size="icon"
            onClick={createPriceFeed}
          >
            Create price feed
          </Button>
        </div>

        <ReserveConfig symbol={token?.symbol} {...reserveConfigState} />
      </Grid>
    </Dialog>
  );
}
