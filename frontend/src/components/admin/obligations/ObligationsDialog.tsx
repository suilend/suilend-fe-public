import { useState } from "react";

import { SuiPriceServiceConnection } from "@pythnetwork/pyth-sui-js";
import { ColumnDef } from "@tanstack/react-table";

import { useSettingsContext } from "@suilend/frontend-sui-next";
import { LENDING_MARKETS } from "@suilend/sdk";
import { phantom } from "@suilend/sdk/_generated/_framework/reified";
import { LendingMarket } from "@suilend/sdk/_generated/suilend/lending-market/structs";
import { Obligation } from "@suilend/sdk/_generated/suilend/obligation/structs";
import {
  ParsedObligation,
  parseObligation,
} from "@suilend/sdk/parsers/obligation";
import { fetchAllObligationsForMarketWithHandler } from "@suilend/sdk/utils/obligation";
import * as simulate from "@suilend/sdk/utils/simulate";

import { useAdminContext } from "@/components/admin/AdminContext";
import LiquidateDialog from "@/components/admin/liquidate/LiquidateDialog";
import DataTable, { tableHeader } from "@/components/dashboard/DataTable";
import Button from "@/components/shared/Button";
import Dialog from "@/components/shared/Dialog";
import Grid from "@/components/shared/Grid";
import Input from "@/components/shared/Input";
import Switch from "@/components/shared/Switch";
import { TBody, TLabelSans } from "@/components/shared/Typography";
import UtilizationBar from "@/components/shared/UtilizationBar";
import Value from "@/components/shared/Value";
import { useLoadedAppContext } from "@/contexts/AppContext";

export default function ObligationsDialog() {
  const { suiClient } = useSettingsContext();
  const { data } = useLoadedAppContext();

  const { selectedLendingMarketId } = useAdminContext();
  const selectedLendingMarket = LENDING_MARKETS.find(
    (lm) => lm.id === selectedLendingMarketId,
  );

  const [minDepositValue, setMinDepositValue] = useState<number>(0);
  const [minWeightedBorrowValue, setMinWeightedBorrowValue] =
    useState<number>(0);
  const reserveSymbols = data.lendingMarket.reserves.map(
    (reserve) => reserve.symbol,
  );

  const [depositFilters, setDepositFilters] = useState<{
    [key: string]: boolean;
  }>(reserveSymbols.reduce((obj, key) => ({ ...obj, [key]: true }), {}));
  const [borrowFilters, setBorrowFilters] = useState<{
    [key: string]: boolean;
  }>(reserveSymbols.reduce((obj, key) => ({ ...obj, [key]: true }), {}));

  const [minUtil, setMinUtil] = useState<number>(0);
  const [obligations, setObligations] = useState<Obligation<string>[]>([]);

  const fetchObligationData = async () => {
    if (!selectedLendingMarket) throw new Error("Missing lending market");

    const rawLendingMarket = await LendingMarket.fetch(
      suiClient,
      phantom(selectedLendingMarket.type),
      selectedLendingMarket.id,
    );
    const refreshedReserves = await simulate.refreshReservePrice(
      rawLendingMarket.reserves.map((r) =>
        simulate.compoundReserveInterest(r, Math.round(Date.now() / 1000)),
      ),
      new SuiPriceServiceConnection("https://hermes.pyth.network"),
    );
    async function chunkHandler(obligationsChunk: Obligation<string>[]) {
      setObligations((obligations) => [
        ...obligations,
        ...obligationsChunk.map((o) =>
          simulate.refreshObligation(o, refreshedReserves),
        ),
      ]);
    }
    fetchAllObligationsForMarketWithHandler(
      suiClient,
      selectedLendingMarket.id,
      selectedLendingMarket.type,
      chunkHandler,
    );
  };

  return (
    <Grid>
      <div className="col-span-1 flex flex-col gap-2">
        <TLabelSans>Deposits</TLabelSans>

        <div className="flex flex-row flex-wrap items-end gap-2">
          {data.lendingMarket.reserves.map((reserve) => (
            <Switch
              key={"deposit-switch-" + reserve.symbol}
              id={"deposit-switch-" + reserve.symbol}
              label={reserve.symbol}
              isChecked={depositFilters[reserve.symbol]}
              onToggle={() => {
                const newState = { ...depositFilters };
                newState[reserve.symbol] = !newState[reserve.symbol];
                setDepositFilters(newState);
              }}
            />
          ))}
        </div>
      </div>

      <div className="col-span-1 flex flex-col gap-2">
        <TLabelSans>Borrows</TLabelSans>

        <div className="flex flex-row flex-wrap items-end gap-2">
          {data.lendingMarket.reserves.map((reserve) => (
            <Switch
              key={"borrow-switch-" + reserve.symbol}
              id={"borrow-switch-" + reserve.symbol}
              label={reserve.symbol}
              isChecked={borrowFilters[reserve.symbol]}
              onToggle={() => {
                const newState = { ...borrowFilters };
                newState[reserve.symbol] = !newState[reserve.symbol];
                setBorrowFilters(newState);
              }}
            />
          ))}
        </div>
      </div>

      <div className="col-span-2 flex flex-row items-end gap-2">
        <Input
          label="minDepositValue"
          id="minDepositValue"
          type="number"
          value={minDepositValue}
          onChange={(value) => {
            setMinDepositValue(parseFloat(value));
          }}
          startDecorator="$"
        />
        <Input
          label="minWeightedBorrowValue"
          id="minWeightedBorrowValue"
          type="number"
          value={minWeightedBorrowValue}
          onChange={(value) => {
            setMinWeightedBorrowValue(parseFloat(value));
          }}
          startDecorator="$"
        />
        <Input
          label="minUtil"
          id="minUtil"
          type="number"
          value={minUtil}
          onChange={(value) => {
            setMinUtil(parseFloat(value));
          }}
          startDecorator="%"
        />
        <Button
          tooltip="Fetch all Obligations"
          onClick={() => fetchObligationData()}
        >
          Search
        </Button>
      </div>
      <div className="col-span-2 flex flex-row items-end gap-2">
        <DataTable<ParsedObligation>
          columns={COLUMNS}
          data={obligations
            .filter((obligation) => {
              const utilPercent =
                simulate
                  .decimalToBigNumber(obligation.weightedBorrowedValueUsd)
                  .div(
                    simulate.decimalToBigNumber(
                      obligation.allowedBorrowValueUsd,
                    ),
                  )
                  .toNumber() * 100;
              return (
                simulate
                  .decimalToBigNumber(obligation.depositedValueUsd)
                  .toNumber() >= minDepositValue &&
                simulate
                  .decimalToBigNumber(obligation.weightedBorrowedValueUsd)
                  .toNumber() >= minWeightedBorrowValue &&
                utilPercent > minUtil &&
                arrayIntersection(
                  Object.keys(depositFilters).filter(
                    (symbol) => depositFilters[symbol],
                  ),
                  obligation.deposits.map(
                    (d) =>
                      reserveSymbols[parseInt(d.reserveArrayIndex.toString())],
                  ),
                ).length > 0 &&
                arrayIntersection(
                  Object.keys(borrowFilters).filter(
                    (symbol) => borrowFilters[symbol],
                  ),
                  obligation.borrows.map(
                    (b) =>
                      reserveSymbols[parseInt(b.reserveArrayIndex.toString())],
                  ),
                ).length > 0
              );
            })
            .map((obligation) => parseObligation(obligation, data.reserveMap))}
          noDataMessage="No Obligations"
        />
      </div>
    </Grid>
  );
}

function arrayIntersection(array1: string[], array2: string[]) {
  return array1.filter((element) => array2.includes(element));
}

const COLUMNS: ColumnDef<ParsedObligation>[] = [
  {
    accessorKey: "obligationId",
    sortingFn: "text",
    header: ({ column }) => tableHeader(column, "Obligation"),
    cell: ({ row }) => {
      return <Value value={row.original.id} isId={true} />;
    },
  },
  {
    accessorKey: "depositValue",
    sortingFn: "auto",
    header: ({ column }) =>
      tableHeader(column, "Deposit", { isNumerical: true }),
    cell: ({ row }) => {
      const value = row.original.depositedAmountUsd.toFormat(2).toString();
      return <TBody>${value}</TBody>;
    },
  },
  {
    accessorKey: "weightedBorrowValue",
    sortingFn: "auto",
    header: ({ column }) => tableHeader(column, "(Max Price) Wtd. Borrows"),
    cell: ({ row }) => {
      const value = row.original.maxPriceWeightedBorrowsUsd
        .toFormat(2)
        .toString();
      return <TBody>${value}</TBody>;
    },
  },
  {
    accessorKey: "healthBar",
    header: ({ column }) => tableHeader(column, "Utilization"),
    cell: ({ row }) => {
      return <UtilizationBar obligation={row.original} />;
    },
  },
  {
    accessorKey: "view",
    header: ({ column }) => tableHeader(column, ""),
    cell: ({ row }) => {
      return (
        <TBody>
          <Dialog trigger={<Button>More</Button>}>
            <LiquidateDialog fixedObligation={row.original} />
          </Dialog>
        </TBody>
      );
    },
  },
];
