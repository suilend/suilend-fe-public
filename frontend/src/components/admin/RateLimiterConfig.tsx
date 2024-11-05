import { useState } from "react";

import { Infinity } from "lucide-react";

import { NewConfigArgs as NewRateLimitedConfigArgs } from "@suilend/sdk/_generated/suilend/rate-limiter/functions";
import { maxU64 } from "@suilend/sdk/constants";

import Button from "@/components/shared/Button";
import Input from "@/components/shared/Input";

export interface ConfigState {
  maxOutflow: string;
  windowDuration: string;
}

export const parseConfigState = (
  configState: ConfigState,
): NewRateLimitedConfigArgs => ({
  maxOutflow: BigInt(configState.maxOutflow),
  windowDuration: BigInt(configState.windowDuration),
});

export const useRateLimiterConfigState = (initialConfigState: ConfigState) => {
  const [configState, setConfigState] =
    useState<ConfigState>(initialConfigState);

  const setConfigStateKeyValue = (key: string) => (value: string | boolean) =>
    setConfigState((prev) => ({ ...prev, [key]: value }));

  const resetConfigState = () => setConfigState(initialConfigState);

  return {
    configState,
    setConfigStateKeyValue,
    resetConfigState,
  };
};

type RateLimiterConfigProps = ReturnType<typeof useRateLimiterConfigState>;

export default function RateLimiterConfig({
  configState,
  setConfigStateKeyValue,
}: RateLimiterConfigProps) {
  return (
    <>
      <div className="flex flex-row items-end gap-2">
        <div className="flex-1">
          <Input
            label="maxOutflow"
            id="maxOutflow"
            type="number"
            value={configState.maxOutflow}
            onChange={setConfigStateKeyValue("maxOutflow")}
          />
        </div>

        <Button
          className="my-1"
          tooltip="Set to 2^64 - 1, the maximum possible value to allow unlimited outflow"
          icon={<Infinity />}
          variant={
            configState.maxOutflow === maxU64.toString()
              ? "secondary"
              : "secondaryOutline"
          }
          size="icon"
          onClick={() =>
            setConfigStateKeyValue("maxOutflow")(maxU64.toString())
          }
        >
          Unlimited outflow
        </Button>
      </div>

      <Input
        label="windowDuration"
        id="windowDuration"
        type="number"
        value={configState.windowDuration}
        onChange={setConfigStateKeyValue("windowDuration")}
        endDecorator="sec"
      />
    </>
  );
}
