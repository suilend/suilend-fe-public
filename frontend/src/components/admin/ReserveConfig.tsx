import { useState } from "react";

import BigNumber from "bignumber.js";
import { Minus, Plus } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

import { CreateReserveConfigArgs } from "@suilend/sdk/_generated/suilend/reserve-config/functions";

import AprLineChart from "@/components/shared/AprLineChart";
import Button from "@/components/shared/Button";
import Input, { getInputId } from "@/components/shared/Input";
import Switch from "@/components/shared/Switch";
import { TLabelSans } from "@/components/shared/Typography";

export interface ConfigState {
  openLtvPct: string;
  closeLtvPct: string;
  maxCloseLtvPct: string;
  borrowWeightBps: string;
  depositLimit: string;
  borrowLimit: string;
  liquidationBonusBps: string;
  maxLiquidationBonusBps: string;
  depositLimitUsd: string;
  borrowLimitUsd: string;
  borrowFeeBps: string;
  spreadFeeBps: string;
  protocolLiquidationFeeBps: string;
  isolated: boolean;
  openAttributedBorrowLimitUsd: string;
  closeAttributedBorrowLimitUsd: string;
  interestRate: {
    id: string;
    utilPercent: string;
    aprPercent: string;
  }[];
}

export const getSortedInterestRate = (
  interestRate: ConfigState["interestRate"],
) =>
  interestRate
    .filter((row) => !(row.utilPercent === "" || row.aprPercent === ""))
    .sort((a, b) => Number(a.utilPercent) - Number(b.utilPercent));

export const parseConfigState = (
  configState: ConfigState,
  mintDecimals: number,
): CreateReserveConfigArgs => {
  const sortedInterestRate = getSortedInterestRate(configState.interestRate);

  return {
    openLtvPct: Number(configState.openLtvPct),
    closeLtvPct: Number(configState.closeLtvPct),
    maxCloseLtvPct: Number(configState.maxCloseLtvPct),
    borrowWeightBps: BigInt(configState.borrowWeightBps),
    depositLimit: BigInt(
      new BigNumber(configState.depositLimit)
        .times(10 ** mintDecimals)
        .toString(),
    ),
    borrowLimit: BigInt(
      new BigNumber(configState.borrowLimit)
        .times(10 ** mintDecimals)
        .toString(),
    ),
    liquidationBonusBps: BigInt(configState.liquidationBonusBps),
    maxLiquidationBonusBps: BigInt(configState.maxLiquidationBonusBps),
    depositLimitUsd: BigInt(configState.depositLimitUsd),
    borrowLimitUsd: BigInt(configState.borrowLimitUsd),
    borrowFeeBps: BigInt(configState.borrowFeeBps),
    spreadFeeBps: BigInt(configState.spreadFeeBps),
    protocolLiquidationFeeBps: BigInt(configState.protocolLiquidationFeeBps),
    interestRateUtils: sortedInterestRate.map((row) => Number(row.utilPercent)),
    interestRateAprs: sortedInterestRate.map((row) =>
      BigInt(new BigNumber(row.aprPercent).times(100).toString()),
    ),
    isolated: configState.isolated,
    openAttributedBorrowLimitUsd: BigInt(
      configState.openAttributedBorrowLimitUsd,
    ),
    closeAttributedBorrowLimitUsd: BigInt(
      configState.closeAttributedBorrowLimitUsd,
    ),
  };
};

export const useReserveConfigState = (initialConfigState: ConfigState) => {
  const [configState, setConfigState] =
    useState<ConfigState>(initialConfigState);

  const setConfigStateKeyValue = (key: string) => (value: string | boolean) =>
    setConfigState((prev) => ({ ...prev, [key]: value }));

  const resetConfigState = () => setConfigState(initialConfigState);

  // Interest rate
  const onInterestRateValueChange =
    (id: string, key: string) => (value: string) =>
      setConfigState((prev) => ({
        ...prev,
        interestRate: prev.interestRate.map((row) =>
          row.id === id ? { ...row, [key]: value } : row,
        ),
      }));

  const removeInterestRateRow = (id: string) => {
    setConfigState((prev) => ({
      ...prev,
      interestRate: prev.interestRate.filter((row) => row.id !== id),
    }));
  };

  const addInterestRateRow = () => {
    const rowId = uuidv4();
    setConfigState((prev) => ({
      ...prev,
      interestRate: [
        ...prev.interestRate,
        { id: rowId, utilPercent: "", aprPercent: "" },
      ],
    }));

    setTimeout(() => {
      document.getElementById(getInputId(`util-${rowId}`))?.focus();
    });
  };

  return {
    configState,
    setConfigStateKeyValue,
    resetConfigState,
    interestRate: {
      onValueChange: onInterestRateValueChange,
      removeRow: removeInterestRateRow,
      addRow: addInterestRateRow,
    },
  };
};

type ReserveConfigProps = {
  symbol?: string;
} & ReturnType<typeof useReserveConfigState>;

export default function ReserveConfig({
  symbol,
  configState,
  setConfigStateKeyValue,
  interestRate,
}: ReserveConfigProps) {
  const sortedInterestRate = getSortedInterestRate(configState.interestRate);

  return (
    <>
      <Input
        label="openLtvPct"
        id="openLtvPct"
        type="number"
        value={configState.openLtvPct}
        onChange={setConfigStateKeyValue("openLtvPct")}
        inputProps={{
          min: 0,
          max: 100,
        }}
        endDecorator="%"
      />
      <Input
        label="closeLtvPct"
        id="closeLtvPct"
        type="number"
        value={configState.closeLtvPct}
        onChange={setConfigStateKeyValue("closeLtvPct")}
        inputProps={{
          min: 0,
          max: 100,
        }}
        endDecorator="%"
      />
      <Input
        label="maxCloseLtvPct"
        id="maxCloseLtvPct"
        type="number"
        value={configState.maxCloseLtvPct}
        onChange={setConfigStateKeyValue("maxCloseLtvPct")}
        inputProps={{
          min: 0,
          max: 100,
        }}
        endDecorator="%"
      />
      <Input
        label="borrowWeightBps"
        id="borrowWeightBps"
        type="number"
        value={configState.borrowWeightBps}
        onChange={setConfigStateKeyValue("borrowWeightBps")}
        endDecorator="bps"
      />
      <Input
        label="depositLimit"
        id="depositLimit"
        type="number"
        value={configState.depositLimit}
        onChange={setConfigStateKeyValue("depositLimit")}
        endDecorator={symbol}
      />
      <Input
        label="borrowLimit"
        id="borrowLimit"
        type="number"
        value={configState.borrowLimit}
        onChange={setConfigStateKeyValue("borrowLimit")}
        endDecorator={symbol}
      />
      <Input
        label="liquidationBonusBps"
        id="liquidationBonusBps"
        type="number"
        value={configState.liquidationBonusBps}
        onChange={setConfigStateKeyValue("liquidationBonusBps")}
        endDecorator="bps"
      />
      <Input
        label="maxLiquidationBonusBps"
        id="maxLiquidationBonusBps"
        type="number"
        value={configState.maxLiquidationBonusBps}
        onChange={setConfigStateKeyValue("maxLiquidationBonusBps")}
        endDecorator="bps"
      />
      <Input
        label="depositLimitUsd"
        id="depositLimitUsd"
        type="number"
        value={configState.depositLimitUsd}
        onChange={setConfigStateKeyValue("depositLimitUsd")}
        inputProps={{ className: "pl-6" }}
        startDecorator="$"
      />
      <Input
        label="borrowLimitUsd"
        id="borrowLimitUsd"
        type="number"
        value={configState.borrowLimitUsd}
        onChange={setConfigStateKeyValue("borrowLimitUsd")}
        inputProps={{ className: "pl-6" }}
        startDecorator="$"
      />
      <Input
        label="borrowFeeBps"
        id="borrowFeeBps"
        type="number"
        value={configState.borrowFeeBps}
        onChange={setConfigStateKeyValue("borrowFeeBps")}
        endDecorator="bps"
      />
      <Input
        label="spreadFeeBps"
        id="spreadFeeBps"
        type="number"
        value={configState.spreadFeeBps}
        onChange={setConfigStateKeyValue("spreadFeeBps")}
        endDecorator="bps"
      />
      <Input
        label="protocolLiquidationFeeBps"
        id="protocolLiquidationFeeBps"
        type="number"
        value={configState.protocolLiquidationFeeBps}
        onChange={setConfigStateKeyValue("protocolLiquidationFeeBps")}
        endDecorator="bps"
      />
      <Switch
        label="isolated"
        id="isolated"
        value={configState.isolated}
        onChange={setConfigStateKeyValue("isolated")}
      />
      <Input
        label="openAttributedBorrowLimitUsd"
        id="openAttributedBorrowLimitUsd"
        type="number"
        value={configState.openAttributedBorrowLimitUsd}
        onChange={setConfigStateKeyValue("openAttributedBorrowLimitUsd")}
        inputProps={{ className: "pl-6" }}
        startDecorator="$"
      />
      <Input
        label="closeAttributedBorrowLimitUsd"
        id="closeAttributedBorrowLimitUsd"
        type="number"
        value={configState.closeAttributedBorrowLimitUsd}
        onChange={setConfigStateKeyValue("closeAttributedBorrowLimitUsd")}
        inputProps={{ className: "pl-6" }}
        startDecorator="$"
      />

      <div className="flex flex-col gap-2 md:col-span-2">
        <TLabelSans>interestRate</TLabelSans>
        <div className="flex flex-col gap-2 rounded-md border p-4">
          {configState.interestRate.map((row, index) => (
            <div key={row.id} className="flex w-full flex-row items-end gap-2">
              <div className="flex-1">
                <Input
                  label={index === 0 ? "utilization" : undefined}
                  id={`util-${row.id}`}
                  type="number"
                  value={row.utilPercent}
                  onChange={interestRate.onValueChange(row.id, "utilPercent")}
                  inputProps={{
                    min: 0,
                    max: 100,
                  }}
                  endDecorator="%"
                />
              </div>

              <div className="flex-1">
                <Input
                  label={index === 0 ? "APR" : undefined}
                  id={`apr-${row.id}`}
                  type="number"
                  value={row.aprPercent}
                  onChange={interestRate.onValueChange(row.id, "aprPercent")}
                  endDecorator="%"
                />
              </div>

              <Button
                className="my-1"
                tooltip="Remove row"
                icon={<Minus />}
                variant="secondary"
                size="icon"
                disabled={configState.interestRate.length < 2}
                onClick={() => interestRate.removeRow(row.id)}
              >
                Remove row
              </Button>
            </div>
          ))}

          <Button
            className="w-full"
            labelClassName="uppercase"
            startIcon={<Plus />}
            variant="secondary"
            size="lg"
            onClick={() => interestRate.addRow()}
          >
            Add row
          </Button>

          <div className="mt-4 w-full">
            <AprLineChart
              data={sortedInterestRate.map((row) => ({
                utilPercent: +row.utilPercent,
                aprPercent: +row.aprPercent,
              }))}
            />
          </div>
        </div>
      </div>
    </>
  );
}
