import { useState } from "react";

import { Transaction, TransactionResult } from "@mysten/sui/transactions";
import { SuiPriceServiceConnection } from "@pythnetwork/pyth-sui-js";
import { ColumnDef } from "@tanstack/react-table";
import BigNumber from "bignumber.js";
import { CheckIcon } from "lucide-react";
import { toast } from "sonner";

import { phantom } from "@suilend/sdk/_generated/_framework/reified";
import { LendingMarket } from "@suilend/sdk/_generated/suilend/lending-market/structs";
import { Obligation } from "@suilend/sdk/_generated/suilend/obligation/structs";
import { Reserve } from "@suilend/sdk/_generated/suilend/reserve/structs";
import {
  LENDING_MARKET_ID,
  LENDING_MARKET_TYPE,
  SuilendClient,
} from "@suilend/sdk/client";
import {
  ParsedObligation,
  parseObligation,
} from "@suilend/sdk/parsers/obligation";
import { ParsedReserve } from "@suilend/sdk/parsers/reserve";
import {
  FormattedObligationHistory,
  LiquidationHistoryEvent,
  NonLiquidationHistoryEvent,
  getObligationHistoryPage,
} from "@suilend/sdk/utils/obligation";
import * as simulate from "@suilend/sdk/utils/simulate";

import DataTable, {
  decimalSortingFn,
  tableHeader,
} from "@/components/dashboard/DataTable";
import UtilizationBar from "@/components/dashboard/UtilizationBar";
import Button from "@/components/shared/Button";
import Grid from "@/components/shared/Grid";
import Input from "@/components/shared/Input";
import LabelWithValue from "@/components/shared/LabelWithValue";
import { TBody } from "@/components/shared/Typography";
import { AppData, useAppContext } from "@/contexts/AppContext";
import { useWalletContext } from "@/contexts/WalletContext";
import { getAllCoins } from "@/lib/coinBalance";
import { isSui } from "@/lib/coinType";
import { formatToken, formatUsd } from "@/lib/format";

interface RowData {
  symbol: string;
  quantity: BigNumber;
  amountUsd: BigNumber;
  selected: boolean;
}

interface LiquidateDialogProps {
  fixedObligation?: ParsedObligation;
}

export default function LiquidateDialog({
  fixedObligation,
}: LiquidateDialogProps) {
  const { address } = useWalletContext();
  const { suiClient, signExecuteAndWaitForTransaction, ...restAppContext } =
    useAppContext();
  const suilendClient = restAppContext.suilendClient as SuilendClient;
  const data = restAppContext.data as AppData;

  const [refreshedObligation, setRefreshedObligation] =
    useState<Obligation<string> | null>(null);
  const [obligationId, setObligationId] = useState<string>("");
  const [selectedWithdrawAsset, setSelectedWithdrawAsset] =
    useState<string>("");
  const [selectedRepayAsset, setSelectedRepayAsset] = useState<string>("");
  const [obligationOwner, setObligationOwner] = useState<string>("");
  const [historyCursor, setHistoryCursor] = useState<string | null>(null);

  const [obligationHistory, setObligationHistory] = useState<
    FormattedObligationHistory[]
  >([]);
  const reserveMap = data.lendingMarket.reserves.reduce(
    (acc, reserve) => ({ ...acc, [reserve.coinType]: reserve }),
    {},
  ) as Record<string, ParsedReserve>;

  const fetchObligationOwner = async (obligationId: string) => {
    if (obligationId === "") {
      return;
    }
    const obligationObject = await suiClient.getObject({
      id: obligationId,
      options: {
        showOwner: true,
      },
    });
    if (!obligationObject?.data?.owner) {
      return;
    }
    setObligationOwner(
      (obligationObject.data.owner as { ObjectOwner: string }).ObjectOwner,
    );
  };

  const fetchObligationDetails = async (obligationId: string) => {
    await fetchObligationOwner(obligationId);
    const rawLendingMarket = await LendingMarket.fetch(
      suiClient,
      phantom(LENDING_MARKET_TYPE),
      LENDING_MARKET_ID,
    );
    const rawObligation = await SuilendClient.getObligation(
      obligationId,
      [LENDING_MARKET_TYPE],
      suiClient,
    );
    let refreshedReserves = rawLendingMarket.reserves as Reserve<string>[];
    const connection = new SuiPriceServiceConnection(
      "https://hermes.pyth.network",
    );
    refreshedReserves = await simulate.refreshReservePrice(
      rawLendingMarket.reserves.map((r) =>
        simulate.compoundReserveInterest(r, Math.round(Date.now() / 1000)),
      ),
      connection,
    );
    const refreshedObligation = simulate.refreshObligation(
      rawObligation,
      refreshedReserves,
    );
    setRefreshedObligation(refreshedObligation);
    setObligationHistory([]);
    setHistoryCursor(null);
    await fetchObligationHistory(obligationId);
  };

  const fetchObligationHistory = async (obligationId: string) => {
    const historyPage = await getObligationHistoryPage(
      suiClient,
      obligationId,
      10,
      historyCursor,
    );
    setHistoryCursor(historyPage.cursor || null);
    setObligationHistory([...obligationHistory, ...historyPage.history]);
  };

  async function liquidateObligation(
    obligation: ParsedObligation,
    repayAssetSymbol: string,
    withdrawAssetSymbol: string,
  ) {
    if (!address) throw new Error("Wallet not connected");

    const transaction = new Transaction();

    try {
      const repayCoinType = obligation.borrows.find(
        (b) => b.reserve.symbol === repayAssetSymbol,
      )?.coinType as string;
      const repayCoin = (await getAllCoins(suiClient, address))
        .filter((coin) => {
          return (
            coin.coinType === repayCoinType ||
            (isSui(coin.coinType) && isSui(repayCoinType))
          );
        })
        .sort((a, b) => {
          return parseInt(b.balance) - parseInt(a.balance);
        })[0];
      let repayCoinId: TransactionResult[0] | string = repayCoin.coinObjectId;

      if (isSui(repayCoinType)) {
        const [splitSui] = transaction.splitCoins(transaction.gas, [
          parseInt(repayCoin.balance) - 1000000000,
        ]);
        repayCoinId = splitSui;
      }
      const [withdrawn] = await suilendClient.liquidateAndRedeem(
        transaction,
        obligation.original,
        repayCoinType,
        obligation.deposits.find(
          (d) => d.reserve.symbol === withdrawAssetSymbol,
        )?.coinType as string,
        repayCoinId,
      );
      transaction.transferObjects([withdrawn], address);
      if (isSui(repayCoinType)) {
        transaction.transferObjects([repayCoinId], address);
      }

      await signExecuteAndWaitForTransaction(transaction);

      toast.success("Liquidated");
    } catch (err) {
      toast.error("Failed to liquidate", {
        description: (err as Error)?.message || "An unknown error occurred",
      });
    }
  }
  let parsedObligation: ParsedObligation | null = null;
  if (fixedObligation) {
    parsedObligation = fixedObligation;
    fetchObligationOwner(parsedObligation.id);
    fetchObligationHistory(parsedObligation.id);
  } else {
    parsedObligation = refreshedObligation
      ? parseObligation(refreshedObligation, reserveMap)
      : null;
  }
  return (
    <Grid>
      {!fixedObligation && (
        <div className="col-span-2 flex flex-row items-end gap-2">
          <div className="w-full">
            <Input
              label="Obligation ID"
              id="obligationId"
              type="text"
              value={obligationId}
              onChange={(value) => {
                setObligationId(value);
              }}
            />
            <br />
            <Button
              tooltip="Search for an Obligation"
              onClick={() => fetchObligationDetails(obligationId)}
            >
              Lookup
            </Button>
          </div>
        </div>
      )}
      {parsedObligation && (
        <>
          <LabelWithValue label="Owner" value={obligationOwner} isId={true} />
          <LabelWithValue
            label="Net Value"
            value={parsedObligation.netValueUsd}
            isUsd
          />
          <LabelWithValue
            label="Deposited Amount"
            value={parsedObligation.depositedAmountUsd}
            isUsd
          />
          <LabelWithValue
            label="(Min Price) Borrow Limit"
            value={parsedObligation.minPriceBorrowLimitUsd}
            isUsd
          />
          <LabelWithValue
            label="Unhealthy Borrow Value"
            value={parsedObligation.unhealthyBorrowValueUsd}
            isUsd
          />
          <LabelWithValue
            label="Borrowed Amount"
            value={parsedObligation.borrowedAmountUsd}
            isUsd
          />
          <LabelWithValue
            label="(Max Price) Weighted Borrows"
            value={parsedObligation.maxPriceWeightedBorrowsUsd}
            isUsd
          />
          <div className="col-span-2">
            <UtilizationBar obligation={parsedObligation} />
          </div>
          <div className="col-span-2 flex flex-row items-end gap-2">
            <DataTable<RowData>
              columns={getColumnDefinition(false)}
              data={parsedObligation.deposits.map((deposit) => {
                return {
                  symbol: deposit.reserve.symbol,
                  quantity: deposit.depositedAmount,
                  amountUsd: deposit.depositedAmountUsd,
                  selected: deposit.reserve.symbol === selectedWithdrawAsset,
                };
              })}
              noDataMessage="No Deposits"
              onRowClick={(row) => () => {
                if (selectedWithdrawAsset === row.original.symbol) {
                  setSelectedWithdrawAsset("");
                } else {
                  setSelectedWithdrawAsset(row.original.symbol);
                }
              }}
            />
          </div>
          <div className="col-span-2 flex flex-row items-end gap-2">
            <DataTable<RowData>
              columns={getColumnDefinition(true)}
              data={parsedObligation.borrows.map((borrow) => {
                return {
                  symbol: borrow.reserve.symbol,
                  quantity: borrow.borrowedAmount,
                  amountUsd: borrow.borrowedAmountUsd,
                  selected: borrow.reserve.symbol === selectedRepayAsset,
                };
              })}
              noDataMessage="No Borrows"
              onRowClick={(row) => () => {
                if (selectedRepayAsset === row.original.symbol) {
                  setSelectedRepayAsset("");
                } else {
                  setSelectedRepayAsset(row.original.symbol);
                }
              }}
            />
          </div>
          <div className="col-span-2 flex flex-row items-end gap-2">
            <Button
              tooltip="Liquidate this obligation"
              onClick={() =>
                liquidateObligation(
                  parsedObligation as ParsedObligation,
                  selectedRepayAsset,
                  selectedWithdrawAsset,
                )
              }
              disabled={
                selectedRepayAsset === "" || selectedWithdrawAsset === ""
              }
            >
              Liquidate
            </Button>
          </div>
          <div className="col-span-2 flex flex-row items-end gap-2">
            <DataTable<FormattedObligationHistory>
              columns={historyColumnDefinition(data.lendingMarket.reserves)}
              data={obligationHistory}
              noDataMessage="Loading obligation history"
              onRowClick={(row) => async () => {
                await navigator.clipboard.writeText(row.original.digest);
                toast.info(`Copied ${row.original.digest} to clipboard`);
              }}
            />
          </div>
          <div className="col-span-2 flex flex-row items-end gap-2">
            <Button
              tooltip="More"
              onClick={async () => {
                await fetchObligationHistory(obligationId);
              }}
              disabled={historyCursor === null}
            >
              Load More
            </Button>
          </div>
        </>
      )}
    </Grid>
  );
}

function getColumnDefinition(isBorrow: boolean) {
  const columns: ColumnDef<RowData>[] = [
    {
      accessorKey: "asset",
      sortingFn: "text",
      header: ({ column }) =>
        tableHeader(column, isBorrow ? "Borrowed Asset" : "Deposited Asset"),
      cell: ({ row }) => {
        const { symbol } = row.original;
        return <TBody>{symbol}</TBody>;
      },
    },
    {
      accessorKey: "quantity",
      sortingFn: decimalSortingFn("quantity"),
      header: ({ column }) => tableHeader(column, "Quantity"),
      cell: ({ row }) => {
        const { quantity } = row.original;
        return <TBody>{formatToken(quantity)}</TBody>;
      },
    },
    {
      accessorKey: "amountUsd",
      sortingFn: decimalSortingFn("amountUsd"),
      header: ({ column }) => tableHeader(column, "Value ($)"),
      cell: ({ row }) => {
        const { amountUsd } = row.original;
        return <TBody>{formatUsd(amountUsd)}</TBody>;
      },
    },
    {
      accessorKey: "selected",
      sortingFn: "text",
      header: ({ column }) => tableHeader(column, "Selected"),
      cell: ({ row }) => {
        const { selected } = row.original;
        return selected ? <CheckIcon /> : "";
      },
    },
  ];
  return columns;
}

function historyColumnDefinition(reserves: ParsedReserve[]) {
  const columns: ColumnDef<FormattedObligationHistory>[] = [
    {
      accessorKey: "timestampMs",
      header: ({ column }) => tableHeader(column, "Timestamp"),
      cell: ({ row }) => {
        const { timestampMs } = row.original;
        const humanTimestamp = new Date(timestampMs);
        return <TBody>{humanTimestamp.toLocaleString()}</TBody>;
      },
    },
    {
      accessorKey: "action",
      header: ({ column }) => tableHeader(column, "Action"),
      cell: ({ row }) => {
        const { action } = row.original;
        return <TBody>{action}</TBody>;
      },
    },
    {
      accessorKey: "reserveId",
      header: ({ column }) => tableHeader(column, "symbol"),
      cell: ({ row }) => {
        if (row.original.action === "Liquidation") {
          const original = row.original as LiquidationHistoryEvent;
          const repayReserve = reserves.find(
            (r) => r.id === original.repayReserveId,
          );
          const withdrawReserve = reserves.find(
            (r) => r.id === original.withdrawReserveId,
          );
          return (
            <TBody>
              {repayReserve?.symbol} | {withdrawReserve?.symbol}
            </TBody>
          );
        } else {
          const original = row.original as NonLiquidationHistoryEvent;
          const reserve = reserves.find((r) => r.id === original.reserveId);
          return <TBody>{reserve?.symbol}</TBody>;
        }
      },
    },
    {
      accessorKey: "quantity",
      header: ({ column }) => tableHeader(column, "Quantity"),
      cell: ({ row }) => {
        if (row.original.action === "Liquidation") {
          const original = row.original as LiquidationHistoryEvent;
          const repayReserve = reserves.find(
            (r) => r.id === original.repayReserveId,
          );
          const withdrawReserve = reserves.find(
            (r) => r.id === original.repayReserveId,
          );
          if (!repayReserve || !withdrawReserve) {
            return;
          }
          const repayHumanQuantity = new BigNumber(original.repayQuantity)
            .div(new BigNumber(10 ** repayReserve.mintDecimals))
            .toFormat(repayReserve.mintDecimals);
          const withdrawHumanQuantity = new BigNumber(original.withdrawQuantity)
            .div(new BigNumber(10 ** withdrawReserve.mintDecimals))
            .toFormat(withdrawReserve.mintDecimals);
          return (
            <TBody>
              {repayHumanQuantity} | {withdrawHumanQuantity}
            </TBody>
          );
        } else {
          const original = row.original as NonLiquidationHistoryEvent;
          const reserve = reserves.find((r) => r.id === original.reserveId);
          if (!reserve) {
            return;
          }
          const humanQuantity = new BigNumber(original.quantity)
            .div(new BigNumber(10 ** reserve.mintDecimals))
            .toFormat(reserve.mintDecimals);
          return <TBody>{humanQuantity.toString()}</TBody>;
        }
      },
    },
  ];
  return columns;
}
