import Image from "next/image";

import { Droplet, Server } from "lucide-react";

import DiscordIcon from "@/components/assets/DiscordIcon";
import XIcon from "@/components/assets/XIcon";
import { FOOTER_HEIGHT } from "@/components/layout/Footer";
import { HEADER_HEIGHT } from "@/components/layout/HeaderBase";
import Lava from "@/components/public/Lava";
import Button from "@/components/shared/Button";
import {
  TBody,
  TDisplay,
  TPrimaryTitle,
  TTitle,
} from "@/components/shared/Typography";
import { ASSETS_URL } from "@/lib/constants";
import { DISCORD_URL, TWITTER_URL } from "@/lib/navigation";

export default function About() {
  return (
    <>
      {/* Background */}
      <div
        className="fixed inset-0 z-[1] transform-gpu"
        style={{ clipPath: "inset(0 0 0 0)" }}
      >
        <Lava />
      </div>

      {/* Content */}
      <div
        className="relative z-[2] flex w-full flex-col max-md:!min-h-0"
        style={{
          minHeight: `calc(100dvh - var(--header-top) - ${HEADER_HEIGHT}px - 24px - 24px - 1px - ${FOOTER_HEIGHT}px)`,
        }}
      >
        <div className="flex w-full flex-col gap-12 md:flex-1 md:flex-row md:items-stretch md:justify-between">
          {/* Left */}
          <div className="relative z-[2] flex flex-col gap-8 pt-4 md:flex-1 md:justify-between md:gap-12 md:pt-6">
            {/* Top */}
            <div className="flex w-full flex-col gap-6">
              <Image
                className="h-12 w-12 md:h-16 md:w-16"
                src={`${ASSETS_URL}/Suilend.svg`}
                alt="Suilend logo"
                width={64}
                height={64}
                quality={100}
              />

              <TPrimaryTitle className="w-full max-w-[800px] pr-6 text-[32px] uppercase md:text-[48px]">
                Lend and borrow crypto on Sui
              </TPrimaryTitle>
            </div>

            {/* Bottom */}
            <div className="-ml-4 -mr-4 flex flex-col gap-6 md:-ml-10 md:-mr-0 md:flex-row md:items-stretch md:gap-0">
              <div
                className="flex flex-col justify-center border-y border-secondary px-4 py-4 max-md:bg-[radial-gradient(128.40%_300.55%_at_-50.76%_132.29%,rgba(0,59,187,1)_0%,rgba(255,255,255,0.00)_100%)] md:border-b-0 md:border-t-[2px] md:pl-10 md:pr-6 md:pt-6"
                style={{ clipPath: "inset(0 0 0 0)" }}
              >
                <Lava className="md:hidden" isFiltered />
                <TTitle className="text-xl uppercase text-primary-foreground">
                  Why
                  <br />
                  Suilend?
                </TTitle>
              </div>

              <div className="flex flex-col gap-4 px-4 md:border-t md:px-0 md:px-6 md:pt-6">
                <div className="flex flex-row items-center gap-3">
                  <Server className="h-6 w-6 text-foreground/50" />
                  <TBody className="w-full text-[16px] uppercase">
                    3+ years of experience running Save
                  </TBody>
                </div>

                <div className="flex flex-row items-center gap-3">
                  <Droplet className="h-6 w-6 text-foreground/50" />
                  <TBody className="w-full text-[16px] uppercase">
                    Incentive program
                  </TBody>
                </div>
              </div>
            </div>
          </div>

          {/* Middle */}
          <div
            className="absolute -bottom-6 -left-10 -top-6 right-[332px] z-[1] transform-gpu border-r bg-background max-md:hidden"
            style={{ clipPath: "inset(0 0 0 0)" }}
          >
            <div className="absolute h-full w-full bg-[radial-gradient(128.40%_69.55%_at_-80.76%_32.29%,rgba(0,59,187,1)_0%,rgba(255,255,255,0.00)_100%)]" />
            <Lava isFiltered />
          </div>

          {/* Right */}
          <div className="relative z-[2] w-full md:w-[300px]">
            <div className="flex h-full w-full flex-col gap-6 rounded-md border border-secondary bg-secondary/5 p-4 backdrop-blur-md md:items-end md:justify-between">
              <TDisplay className="uppercase text-primary-foreground">
                Money market built on the best chain for developers.
              </TDisplay>

              <div className="flex w-full flex-row gap-3 md:justify-end">
                <a href={TWITTER_URL} target="_blank">
                  <Button
                    icon={<XIcon />}
                    variant="secondaryOutline"
                    size="icon"
                  >
                    X
                  </Button>
                </a>
                <a href={DISCORD_URL} target="_blank">
                  <Button
                    icon={<DiscordIcon />}
                    variant="secondaryOutline"
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
    </>
  );
}
