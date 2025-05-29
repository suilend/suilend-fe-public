import { CSSProperties, ReactNode } from "react";

import BigNumber from "bignumber.js";
import { ClassValue } from "clsx";
import { useLocalStorage } from "usehooks-ts";

import { ParsedObligation } from "@suilend/sdk/parsers/obligation";
import { reserveSort } from "@suilend/sdk/utils";
import {
  formatBorrowWeight,
  formatLtvPercent,
  formatPrice,
  formatToken,
  formatUsd,
} from "@suilend/sui-fe";

import BorrowLimitTitle from "@/components/dashboard/account/BorrowLimitTitle";
import LiquidationThresholdTitle from "@/components/dashboard/account/LiquidationThresholdTitle";
import WeightedBorrowsTitle from "@/components/dashboard/account/WeightedBorrowsTitle";
import Collapsible from "@/components/shared/Collapsible";
import LabelWithTooltip from "@/components/shared/LabelWithTooltip";
import { TBody } from "@/components/shared/Typography";
import { getWeightedBorrowsColor } from "@/components/shared/UtilizationBar";
import { Separator } from "@/components/ui/separator";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { useLoadedUserContext } from "@/contexts/UserContext";
import {
  BORROW_LIMIT_PRICE_TOOLTIP,
  BORROW_WEIGHT_TOOLTIP,
  CLOSE_LTV_TOOLTIP,
  OPEN_LTV_TOOLTIP,
  WEIGHTED_BORROWS_PRICE_TOOLTIP,
} from "@/lib/tooltips";
import { cn } from "@/lib/utils";

interface BreakdownColumn {
  title: string;
  titleTooltip?: string | ReactNode;
  data: string[];
  isSymbol?: boolean;
}

interface BreakdownColumnProps {
  column: BreakdownColumn;
  rowCount: number;
  isFirst: boolean;
  isLast: boolean;
}

function BreakdownColumn({
  column,
  rowCount,
  isFirst,
  isLast,
}: BreakdownColumnProps) {
  return column.isSymbol ? (
    <LabelWithTooltip
      className={cn(
        "h-fit w-auto flex-1 py-2 text-center",
        rowCount > 0 && "border-b",
      )}
      tooltip={column.titleTooltip}
    >
      {column.title}
    </LabelWithTooltip>
  ) : (
    <div
      className={cn(
        "flex w-max flex-col",
        !isFirst && "justify-end text-right",
      )}
    >
      <LabelWithTooltip
        className={cn(
          "w-auto py-2",
          rowCount > 0 && "border-b",
          isFirst && "pl-4",
          isLast && "pr-4",
        )}
        tooltip={column.titleTooltip}
      >
        {column.title}
      </LabelWithTooltip>
      {column.data.map((row, index) => (
        <TBody
          key={index}
          className={cn(
            "py-1 text-xs",
            index === 0 && "pt-2",
            index === column.data.length - 1 && "pb-2",
            isFirst && "pl-4",
            isLast && "pr-4",
          )}
        >
          {row}
        </TBody>
      ))}
    </div>
  );
}

interface BreakdownTableProps {
  rowCount: number;
  columns: BreakdownColumn[];
  totalValue: string;
  totalValueClassName?: ClassValue;
  totalValueStyle?: CSSProperties;
}

function BreakdownTable({
  rowCount,
  columns,
  totalValue,
  totalValueClassName,
  totalValueStyle,
}: BreakdownTableProps) {
  return (
    <div className="-mx-4 flex flex-col">
      <div className="flex w-full flex-row">
        {columns.map((column, index) => (
          <BreakdownColumn
            key={index}
            column={column}
            rowCount={rowCount}
            isFirst={index === 0}
            isLast={index === columns.length - 1}
          />
        ))}
      </div>

      <Separator className="w-full" />

      <div className="flex w-full flex-row justify-end">
        <TBody
          className={cn("pr-4 pt-2 text-xs", totalValueClassName)}
          style={totalValueStyle}
        >
          {totalValue}
        </TBody>
      </div>
    </div>
  );
}

export default function AccountBreakdown() {
  const { appData } = useLoadedAppContext();
  const userContext = useLoadedUserContext();
  const obligation = userContext.obligation as ParsedObligation;

  const sortedDeposits = obligation.deposits
    .slice()
    .sort((a, b) =>
      reserveSort(
        appData.lendingMarket.reserves,
        a.reserve.coinType,
        b.reserve.coinType,
      ),
    );
  const sortedBorrows = obligation.borrows
    .slice()
    .sort((a, b) =>
      reserveSort(
        appData.lendingMarket.reserves,
        a.reserve.coinType,
        b.reserve.coinType,
      ),
    );

  // State
  const [isOpen, setIsOpen] = useLocalStorage<boolean>(
    "isPositionBreakdownOpen",
    false,
  );

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      closedTitle="Show breakdown"
      openTitle="Hide breakdown"
      hasSeparator
    >
      <div className={cn("flex flex-col items-center gap-4", isOpen && "mt-6")}>
        <div className="flex w-full flex-col gap-2">
          <WeightedBorrowsTitle />
          <BreakdownTable
            rowCount={sortedBorrows.length}
            columns={[
              {
                title: "Position",
                data: sortedBorrows.map(
                  (b) =>
                    `${formatToken(b.borrowedAmount, { exact: false })} ${b.reserve.symbol}`,
                ),
              },
              { title: "×", data: [], isSymbol: true },
              {
                title: "Price",
                titleTooltip: WEIGHTED_BORROWS_PRICE_TOOLTIP,
                data: sortedBorrows.map((b) => formatPrice(b.reserve.maxPrice)),
              },
              { title: "×", data: [], isSymbol: true },
              {
                title: "BW",
                titleTooltip: BORROW_WEIGHT_TOOLTIP,
                data: sortedBorrows.map((b) =>
                  formatBorrowWeight(b.reserve.config.borrowWeightBps),
                ),
              },
              { title: "=", data: [], isSymbol: true },
              {
                title: "Total",
                data: sortedBorrows.map((b) =>
                  formatUsd(
                    b.borrowedAmount
                      .times(b.reserve.maxPrice)
                      .times(b.reserve.config.borrowWeightBps.div(10000)),
                  ),
                ),
              },
            ]}
            totalValue={formatUsd(
              sortedBorrows.reduce(
                (acc, b) =>
                  acc.plus(
                    b.borrowedAmount
                      .times(b.reserve.maxPrice)
                      .times(b.reserve.config.borrowWeightBps.div(10000)),
                  ),
                new BigNumber(0),
              ),
            )}
            totalValueStyle={{
              color: `hsl(var(--${getWeightedBorrowsColor(obligation)}))`,
            }}
          />
        </div>

        <div className="flex w-full flex-col gap-2">
          <BorrowLimitTitle />
          <BreakdownTable
            rowCount={sortedDeposits.length}
            columns={[
              {
                title: "Position",
                data: sortedDeposits.map(
                  (d) =>
                    `${formatToken(d.depositedAmount, { exact: false })} ${d.reserve.symbol}`,
                ),
              },
              { title: "×", data: [], isSymbol: true },
              {
                title: "Price",
                titleTooltip: BORROW_LIMIT_PRICE_TOOLTIP,
                data: sortedDeposits.map((d) =>
                  formatPrice(d.reserve.minPrice),
                ),
              },
              { title: "×", data: [], isSymbol: true },
              {
                title: "Open LTV",
                titleTooltip: OPEN_LTV_TOOLTIP,
                data: sortedDeposits.map((d) =>
                  formatLtvPercent(new BigNumber(d.reserve.config.openLtvPct)),
                ),
              },
              { title: "=", data: [], isSymbol: true },
              {
                title: "Total",
                data: sortedDeposits.map((d) =>
                  formatUsd(
                    d.depositedAmount
                      .times(d.reserve.minPrice)
                      .times(d.reserve.config.openLtvPct / 100),
                  ),
                ),
              },
            ]}
            totalValue={formatUsd(
              sortedDeposits.reduce(
                (acc, d) =>
                  acc.plus(
                    d.depositedAmount
                      .times(d.reserve.minPrice)
                      .times(d.reserve.config.openLtvPct / 100),
                  ),
                new BigNumber(0),
              ),
            )}
            totalValueClassName="text-primary"
          />
        </div>

        <div className="flex w-full flex-col gap-2">
          <LiquidationThresholdTitle />
          <BreakdownTable
            rowCount={sortedDeposits.length}
            columns={[
              {
                title: "Position",
                data: sortedDeposits.map(
                  (d) =>
                    `${formatToken(d.depositedAmount, { exact: false })} ${d.reserve.symbol}`,
                ),
              },
              { title: "×", data: [], isSymbol: true },
              {
                title: "Price",
                data: sortedDeposits.map((d) => formatPrice(d.reserve.price)),
              },
              { title: "×", data: [], isSymbol: true },
              {
                title: "Close LTV",
                titleTooltip: CLOSE_LTV_TOOLTIP,
                data: sortedDeposits.map((d) =>
                  formatLtvPercent(new BigNumber(d.reserve.config.closeLtvPct)),
                ),
              },
              { title: "=", data: [], isSymbol: true },
              {
                title: "Total",
                data: sortedDeposits.map((d) =>
                  formatUsd(
                    d.depositedAmount
                      .times(d.reserve.price)
                      .times(d.reserve.config.closeLtvPct / 100),
                  ),
                ),
              },
            ]}
            totalValue={formatUsd(
              sortedDeposits.reduce(
                (acc, d) =>
                  acc.plus(
                    d.depositedAmount
                      .times(d.reserve.price)
                      .times(d.reserve.config.closeLtvPct / 100),
                  ),
                new BigNumber(0),
              ),
            )}
            totalValueClassName="text-secondary"
          />
        </div>
      </div>
    </Collapsible>
  );
}
