import { useState } from "react";

import { SuiPriceServiceConnection } from "@pythnetwork/pyth-sui-js";
import { ColumnDef } from "@tanstack/react-table";

import { useSettingsContext } from "@suilend/frontend-sui-next";
import { phantom } from "@suilend/sdk/_generated/_framework/reified";
import { LendingMarket } from "@suilend/sdk/_generated/suilend/lending-market/structs";
import { Obligation } from "@suilend/sdk/_generated/suilend/obligation/structs";
import { LENDING_MARKET_ID, LENDING_MARKET_TYPE } from "@suilend/sdk/client";
import {
  ParsedObligation,
  parseObligation,
} from "@suilend/sdk/parsers/obligation";
import { fetchAllObligationsForMarketWithHandler } from "@suilend/sdk/utils/obligation";
import * as simulate from "@suilend/sdk/utils/simulate";

import Dialog from "@/components/admin/Dialog";
import LiquidateDialog from "@/components/admin/liquidate/LiquidateDialog";
import DataTable, { tableHeader } from "@/components/dashboard/DataTable";
import UtilizationBar from "@/components/dashboard/UtilizationBar";
import Button from "@/components/shared/Button";
import Grid from "@/components/shared/Grid";
import Input from "@/components/shared/Input";
import Switch from "@/components/shared/Switch";
import { TBody, TLabelSans } from "@/components/shared/Typography";
import Value from "@/components/shared/Value";
import { useLoadedAppContext } from "@/contexts/AppContext";

export default function ObligationsDialog() {
  const { suiClient } = useSettingsContext();
  const { data } = useLoadedAppContext();

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
    const rawLendingMarket = await LendingMarket.fetch(
      suiClient,
      phantom(LENDING_MARKET_TYPE),
      LENDING_MARKET_ID,
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
      LENDING_MARKET_ID,
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
              value={depositFilters[reserve.symbol]}
              onChange={() => {
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
              value={borrowFilters[reserve.symbol]}
              onChange={() => {
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
