import { Fragment, PropsWithChildren } from "react";

import BigNumber from "bignumber.js";
import { capitalize } from "lodash";

import {
  COINTYPE_PYTH_PRICE_FEED_SYMBOL_MAP,
  getPythOracleUrl,
} from "@suilend/frontend-sui";
import { useSettingsContext } from "@suilend/frontend-sui-next";
import { ParsedReserve } from "@suilend/sdk/parsers/reserve";
import { Side } from "@suilend/sdk/types";

import { useActionsModalContext } from "@/components/dashboard/actions-modal/ActionsModalContext";
import HistoricalAprLineChart from "@/components/dashboard/actions-modal/HistoricalAprLineChart";
import PythLogo from "@/components/dashboard/actions-modal/PythLogo";
import AprLineChart from "@/components/shared/AprLineChart";
import Button from "@/components/shared/Button";
import LabelWithValue from "@/components/shared/LabelWithValue";
import { Separator } from "@/components/ui/separator";
import { useLoadedAppContext } from "@/contexts/AppContext";
import {
  formatBorrowWeight,
  formatLtvPercent,
  formatPercent,
  formatToken,
  formatUsd,
} from "@/lib/format";
import {
  BORROW_WEIGHT_TOOLTIP,
  CLOSE_LTV_TOOLTIP,
  OPEN_LTV_TOOLTIP,
} from "@/lib/tooltips";
import { cn } from "@/lib/utils";

// TODO: Update beta market values
const ADMIN_CAP_ID =
  "0xf7a4defe0b6566b6a2674a02a0c61c9f99bd012eed21bc741a069eaa82d35927";
const ADMIN_ADDRESS =
  "0xb1ffbc2e1915f44b8f271a703becc1bf8aa79bc22431a58900a102892b783c25";

export enum ParametersPanelTab {
  ADVANCED = "advanced",
  RATES = "rates",
  OBJECTS = "objects",
}

interface TabContentProps {
  side: Side;
  reserve: ParsedReserve;
}

function AdvancedTabContent({ side, reserve }: TabContentProps) {
  return (
    <>
      <div className="mb-1 flex w-full flex-col gap-4">
        <HistoricalAprLineChart reserve={reserve} side={side} />
        <Separator />
      </div>

      <LabelWithValue
        label="Deposits"
        value={`${formatToken(reserve.depositedAmount, { dp: 0 })} ${reserve.symbol}`}
        horizontal
      />
      <LabelWithValue
        label="Deposit limit"
        value={`${formatToken(reserve.config.depositLimit, { dp: 0 })} ${reserve.symbol}`}
        horizontal
      />
      <LabelWithValue
        label="Deposits (USD)"
        value={formatUsd(reserve.depositedAmountUsd, { dp: 0, exact: true })}
        horizontal
      />
      <LabelWithValue
        label="Deposit limit (USD)"
        value={formatUsd(reserve.config.depositLimitUsd, {
          dp: 0,
          exact: true,
        })}
        horizontal
      />

      <Separator />

      <LabelWithValue
        label="Borrows"
        value={`${formatToken(reserve.borrowedAmount, { dp: 0 })} ${reserve.symbol}`}
        horizontal
      />
      <LabelWithValue
        label="Borrow limit"
        value={`${formatToken(reserve.config.borrowLimit, { dp: 0 })} ${reserve.symbol}`}
        horizontal
      />
      <LabelWithValue
        label="Borrows (USD)"
        value={formatUsd(reserve.borrowedAmountUsd, { dp: 0, exact: true })}
        horizontal
      />
      <LabelWithValue
        label="Borrow limit (USD)"
        value={formatUsd(reserve.config.borrowLimitUsd, { dp: 0, exact: true })}
        horizontal
      />

      <Separator />

      <LabelWithValue
        labelTooltip={OPEN_LTV_TOOLTIP}
        label="Open LTV"
        value={formatLtvPercent(new BigNumber(reserve.config.openLtvPct))}
        horizontal
      />
      <LabelWithValue
        labelTooltip={CLOSE_LTV_TOOLTIP}
        label="Close LTV"
        value={formatLtvPercent(new BigNumber(reserve.config.closeLtvPct))}
        horizontal
      />
      <LabelWithValue
        label="Max close LTV"
        value={formatLtvPercent(new BigNumber(reserve.config.maxCloseLtvPct))}
        horizontal
      />
      <LabelWithValue
        labelTooltip={BORROW_WEIGHT_TOOLTIP}
        label="Borrow weight (BW)"
        value={formatBorrowWeight(
          new BigNumber(reserve.config.borrowWeightBps / 10000),
        )}
        horizontal
      />

      <Separator />

      <LabelWithValue
        label="Open attributed borrow limit (USD)"
        value={formatUsd(
          new BigNumber(reserve.config.openAttributedBorrowLimitUsd),
        )}
        horizontal
      />
      <LabelWithValue
        label="Close attributed borrow limit (USD)"
        value={formatUsd(
          new BigNumber(reserve.config.closeAttributedBorrowLimitUsd),
        )}
        horizontal
      />
      <LabelWithValue
        label="Liquidation penalty"
        value={formatPercent(
          new BigNumber(reserve.config.liquidationBonusBps / 100),
        )}
        horizontal
      />
      <LabelWithValue
        label="Max liquidation penalty"
        value={formatPercent(
          new BigNumber(reserve.config.maxLiquidationBonusBps / 100),
        )}
        horizontal
      />
      <LabelWithValue
        label="Protocol liquidation fee"
        value={formatPercent(
          new BigNumber(reserve.config.protocolLiquidationFeeBps / 100),
        )}
        horizontal
      />
      <LabelWithValue
        label="Borrow fee"
        value={formatPercent(new BigNumber(reserve.config.borrowFeeBps / 100))}
        horizontal
      />
      <LabelWithValue
        label="Interest rate spread"
        value={formatPercent(new BigNumber(reserve.config.spreadFeeBps / 100))}
        horizontal
      />
      <LabelWithValue
        label="Isolated"
        value={reserve.config.isolated ? "Yes" : "No"}
        horizontal
      />
    </>
  );
}

function RatesTabContent({ side, reserve }: TabContentProps) {
  return (
    <>
      <div className="mb-1 flex w-full flex-col gap-4">
        <AprLineChart
          data={reserve.config.interestRate
            .slice()
            .sort((a, b) => +a.utilPercent - +b.utilPercent)
            .map((row) => ({
              utilPercent: +row.utilPercent,
              aprPercent: +row.aprPercent,
            }))}
          reference={{
            utilPercent: +reserve.utilizationPercent,
          }}
        />
        <Separator />
      </div>

      <LabelWithValue
        labelClassName="items-center"
        labelEndDecorator={<div className="h-2 w-2 rounded-full bg-white" />}
        label="Current utilization"
        value={formatPercent(reserve.utilizationPercent)}
        horizontal
      />
      <LabelWithValue
        label="Current borrow APR"
        value={formatPercent(reserve.borrowAprPercent)}
        horizontal
      />

      <Separator />

      {reserve.config.interestRate.map((rate, index, array) => (
        <Fragment key={index}>
          <LabelWithValue
            label={`Utilization threshold ${index + 1}`}
            value={formatPercent(new BigNumber(rate.utilPercent))}
            horizontal
          />
          <LabelWithValue
            label={`Borrow APR at ${formatPercent(new BigNumber(rate.utilPercent))} util.`}
            value={formatPercent(new BigNumber(rate.aprPercent))}
            horizontal
          />
          {index !== array.length - 1 && <Separator />}
        </Fragment>
      ))}
    </>
  );
}

function ObjectsTabContent({ side, reserve }: TabContentProps) {
  const { explorer } = useSettingsContext();
  const { suilendClient, obligation } = useLoadedAppContext();

  const pythOracleUrl = getPythOracleUrl(reserve.coinType);

  return (
    <>
      <LabelWithValue
        label="Coin"
        value={reserve.coinType}
        isType
        url={explorer.buildCoinUrl(reserve.coinType)}
        isExplorerUrl
        horizontal
      />
      <LabelWithValue
        label="Lending market"
        value={suilendClient.lendingMarket.id}
        isId
        url={explorer.buildObjectUrl(suilendClient.lendingMarket.id)}
        isExplorerUrl
        horizontal
      />
      <LabelWithValue label="Reserve" value={reserve.id} isId horizontal />

      <Separator />

      {pythOracleUrl && (
        <LabelWithValue
          label="Oracle"
          value={COINTYPE_PYTH_PRICE_FEED_SYMBOL_MAP[reserve.coinType]}
          valueEndDecorator={<PythLogo className="my-0.5" />}
          url={pythOracleUrl}
          urlTooltip="View price feed"
          horizontal
        />
      )}
      <LabelWithValue
        label="Price identifier"
        value={reserve.priceIdentifier}
        isId
        horizontal
      />

      <Separator />

      <LabelWithValue
        label="Admin"
        value={ADMIN_ADDRESS}
        isId
        url={explorer.buildAddressUrl(ADMIN_ADDRESS)}
        isExplorerUrl
        horizontal
      />
      <LabelWithValue
        label="Admin cap"
        value={ADMIN_CAP_ID}
        isId
        url={explorer.buildObjectUrl(ADMIN_CAP_ID)}
        isExplorerUrl
        horizontal
      />

      {obligation?.id && (
        <LabelWithValue
          label="Obligation"
          value={obligation.id}
          isId
          url={explorer.buildObjectUrl(obligation.id)}
          isExplorerUrl
          horizontal
        />
      )}
    </>
  );
}

interface TabButtonProps extends PropsWithChildren {
  isActive: boolean;
  onClick: () => void;
}

function TabButton({ isActive, onClick, children }: TabButtonProps) {
  return (
    <Button
      className={cn(
        "h-7 flex-1 py-0 uppercase",
        isActive && "border border-secondary disabled:opacity-100",
      )}
      labelClassName="text-xs"
      variant={isActive ? "secondary" : "secondaryOutline"}
      onClick={onClick}
      disabled={isActive}
    >
      {children}
    </Button>
  );
}

interface ParametersTabContentProps {
  side: Side;
  reserve: ParsedReserve;
}

export default function ParametersPanel({
  side,
  reserve,
}: ParametersTabContentProps) {
  const { selectedParametersPanelTab, onSelectedParametersPanelTabChange } =
    useActionsModalContext();

  const TabContent = {
    [ParametersPanelTab.ADVANCED]: AdvancedTabContent,
    [ParametersPanelTab.RATES]: RatesTabContent,
    [ParametersPanelTab.OBJECTS]: ObjectsTabContent,
  }[selectedParametersPanelTab];

  return (
    <>
      <div className="flex flex-row gap-2">
        {Object.values(ParametersPanelTab).map((tab) => (
          <TabButton
            key={tab}
            isActive={selectedParametersPanelTab === tab}
            onClick={() => onSelectedParametersPanelTabChange(tab)}
          >
            {capitalize(tab)}
          </TabButton>
        ))}
      </div>

      <div className="flex flex-col gap-3 md:-m-4 md:overflow-y-auto md:p-4">
        <TabContent side={side} reserve={reserve} />
      </div>
    </>
  );
}
