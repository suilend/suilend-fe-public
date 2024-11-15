import Image from "next/image";
import NextLink from "next/link";

import { Droplet, Server } from "lucide-react";

import {
  NORMALIZED_mSUI_COINTYPE,
  getFilteredRewards,
  getStakingYieldAprPercent,
  getTotalAprPercent,
} from "@suilend/frontend-sui";
import { Side } from "@suilend/sdk/types";

import DiscordIcon from "@/components/assets/DiscordIcon";
import XIcon from "@/components/assets/XIcon";
import HeaderBase from "@/components/layout/HeaderBase";
import Logo from "@/components/layout/Logo";
import Lava from "@/components/public/Lava";
import Button from "@/components/shared/Button";
import Ticker from "@/components/shared/Ticker";
import TokenLogo from "@/components/shared/TokenLogo";
import { TBody, TPrimaryTitle, TTitle } from "@/components/shared/Typography";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppContext } from "@/contexts/AppContext";
import { formatPercent } from "@/lib/format";
import { DASHBOARD_URL, DISCORD_URL, TWITTER_URL } from "@/lib/navigation";
import suilendLogo from "@/public/assets/suilend.svg";

export default function Home() {
  const { data } = useAppContext();

  return (
    <>
      {/* Background */}
      <div
        className="fixed inset-0 z-[1] transform-gpu"
        style={{ clipPath: "inset(0 0 0 0)" }}
      >
        <Lava />
      </div>

      <div
        className="fixed bottom-0 right-[332px] top-0 z-[2] w-1/3 min-w-[300px] transform-gpu border-x bg-background max-lg:hidden"
        style={{ clipPath: "inset(0 0 0 0)" }}
      >
        <div className="absolute h-full w-full bg-[radial-gradient(128.40%_69.55%_at_-80.76%_32.29%,rgba(0,59,187,1)_0%,rgba(255,255,255,0.00)_100%)]" />
        <Lava isFiltered />
      </div>

      {/* Content */}
      <div
        className="relative z-[3] flex w-full flex-col"
        style={{ minHeight: "calc(100dvh - var(--header-top))" }}
      >
        <HeaderBase className="md:hidden">
          <Logo />

          <NextLink href={DASHBOARD_URL}>
            <Button labelClassName="uppercase">Launch app</Button>
          </NextLink>
        </HeaderBase>

        <div className="flex w-full flex-1 flex-col justify-between gap-12 md:flex-row md:items-stretch">
          {/* Left/Top */}
          <div className="md:flex-1">
            <div className="flex flex-col justify-between gap-12 px-4 pt-8 md:h-full md:py-12 md:pl-10 md:pr-0">
              <div className="flex w-full flex-col gap-8 md:pt-4">
                <Image
                  className="max-md:hidden"
                  src={suilendLogo}
                  alt="Suilend logo"
                  width={64}
                  height={64}
                />

                <TPrimaryTitle className="w-full max-w-[800px] text-[32px] uppercase md:text-[48px]">
                  Lend and borrow crypto on Sui
                </TPrimaryTitle>

                <NextLink href={DASHBOARD_URL} className="w-max max-md:hidden">
                  <Button labelClassName="uppercase" size="lg">
                    Launch app
                  </Button>
                </NextLink>
              </div>

              <div className="flex w-full flex-col gap-6 md:flex-row md:items-stretch md:gap-0">
                <div
                  className="flex flex-col justify-center border-t border-secondary px-4 py-4 max-md:-mx-4 max-md:border-b max-md:bg-[radial-gradient(128.40%_300.55%_at_-50.76%_132.29%,rgba(0,59,187,1)_0%,rgba(255,255,255,0.00)_100%)] md:px-6"
                  style={{ clipPath: "inset(0 0 0 0)" }}
                >
                  <Lava className="md:hidden" isFiltered />
                  <TTitle className="text-xl uppercase text-primary-foreground">
                    Why
                    <br />
                    Suilend?
                  </TTitle>
                </div>

                <div className="flex flex-col gap-6 md:border-t md:px-6 md:py-6">
                  <div className="flex flex-row items-center gap-4">
                    <Server className="h-6 w-6 text-muted-foreground" />
                    <TBody className="w-full text-[16px] uppercase text-muted-foreground md:max-w-[300px]">
                      3+ years of experience running Save
                    </TBody>
                  </div>

                  <div className="flex flex-row items-center gap-4">
                    <Droplet className="h-6 w-6 text-muted-foreground" />
                    <TBody className="w-full text-[16px] uppercase text-muted-foreground md:max-w-[300px]">
                      Incentive program
                    </TBody>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right/bottom */}
          <div className="w-full px-4 pb-8 md:w-[316px] md:py-4 md:pl-0">
            <div className="flex h-full w-full flex-col gap-6 rounded-lg border border-secondary p-4 md:items-end md:justify-between">
              <NextLink href={DASHBOARD_URL} className="max-md:hidden">
                <Button labelClassName="uppercase">Launch app</Button>
              </NextLink>

              <TTitle className="text-xl uppercase text-primary-foreground md:text-2xl">
                Money market built on the best chain for developers.
              </TTitle>

              <div className="flex w-full flex-row justify-between gap-4 md:justify-end">
                <NextLink href={DASHBOARD_URL} className="md:hidden">
                  <Button labelClassName="uppercase">Launch app</Button>
                </NextLink>

                <div className="flex flex-row gap-4">
                  <a href={TWITTER_URL} target="_blank">
                    <Button icon={<XIcon />} variant="secondary" size="icon">
                      X
                    </Button>
                  </a>
                  <a href={DISCORD_URL} target="_blank">
                    <Button
                      icon={<DiscordIcon />}
                      variant="secondary"
                      size="icon"
                    >
                      Discord
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Ticker */}
        <div className="h-16 w-full shrink-0 overflow-hidden border-t bg-background">
          {!data ? (
            <Skeleton className="h-full w-full bg-muted/10" />
          ) : (
            <Ticker
              className="h-16"
              items={data.lendingMarket.reserves
                .filter((reserve) =>
                  reserve.coinType === NORMALIZED_mSUI_COINTYPE
                    ? Date.now() >= 1731492000000 // 2024-11-13 19:00:00 JST
                    : reserve.config.depositLimit.gt(0),
                )
                .map((reserve) => {
                  const stakingYieldAprPercent = getStakingYieldAprPercent(
                    Side.DEPOSIT,
                    reserve,
                    data.lstAprPercentMap,
                  );

                  const totalDepositAprPercent = getTotalAprPercent(
                    Side.DEPOSIT,
                    reserve.depositAprPercent,
                    getFilteredRewards(
                      data.rewardMap[reserve.coinType].deposit,
                    ),
                    stakingYieldAprPercent,
                  );

                  return (
                    <div
                      key={reserve.coinType}
                      className="flex flex-row items-center gap-3 py-2"
                    >
                      <TokenLogo
                        token={{
                          coinType: reserve.coinType,
                          symbol: reserve.symbol,
                          iconUrl: reserve.iconUrl,
                        }}
                      />
                      <TBody>{reserve.symbol}</TBody>
                      <TBody className="text-muted-foreground">
                        {formatPercent(totalDepositAprPercent)}
                        {stakingYieldAprPercent && "*"} APR
                      </TBody>
                    </div>
                  );
                })}
            />
          )}
        </div>
      </div>
    </>
  );
}
