import { useState } from "react";

import { Infinity } from "lucide-react";

import { NewConfigArgs as NewRateLimitedConfigArgs } from "@suilend/sdk/_generated/suilend/rate-limiter/functions";
import { MAX_U64 } from "@suilend/sui-fe";

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
        <Input
          className="flex-1"
          label="maxOutflow"
          id="maxOutflow"
          type="number"
          value={configState.maxOutflow}
          onChange={setConfigStateKeyValue("maxOutflow")}
        />
        <Button
          className="my-1"
          tooltip="Set to u64 MAX (2^64 - 1), allowing unlimited outflows"
          icon={<Infinity />}
          variant="secondary"
          size="icon"
          onClick={() =>
            setConfigStateKeyValue("maxOutflow")(MAX_U64.toString())
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
