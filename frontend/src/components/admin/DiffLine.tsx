import { isEqual } from "lodash";

import { MAX_U64 } from "@suilend/sui-fe";

import { ConfigState as ReserveConfigState } from "@/components/admin/reserves/ReserveConfig";
import LabelWithValue from "@/components/shared/LabelWithValue";
import { TBody } from "@/components/shared/Typography";

interface InterestRateDiffLineProps {
  label: string;
  initialValue: ReserveConfigState["interestRate"];
  newValue: ReserveConfigState["interestRate"];
}

export function InterestRateDiffLine({
  label,
  initialValue,
  newValue,
}: InterestRateDiffLineProps) {
  const initialUtilPercents = initialValue.map((row) => row.utilPercent);
  const initialAprPercents = initialValue.map((row) => row.aprPercent);
  const newUtilPercents = newValue.map((row) => row.utilPercent);
  const newAprPercents = newValue.map((row) => row.aprPercent);

  if (
    isEqual(initialUtilPercents, newUtilPercents) &&
    isEqual(initialAprPercents, newAprPercents)
  )
    return null;

  const initialValueFormatted = initialValue
    .map((row) => `(${row.utilPercent}, ${row.aprPercent})`)
    .join(", ");
  const newValueFormatted = newValue
    .map((row) => `(${row.utilPercent}, ${row.aprPercent})`)
    .join(", ");

  return (
    <LabelWithValue
      className="w-fit"
      label={label}
      customChild={
        <div className="flex flex-col">
          <TBody>{initialValueFormatted} →</TBody>
          <TBody>{newValueFormatted}</TBody>
        </div>
      }
      value="0"
      horizontal
    />
  );
}

interface DiffLineProps {
  label: string;
  initialValue: string | number | boolean;
  newValue: string | number | boolean;
}

export default function DiffLine({
  label,
  initialValue,
  newValue,
}: DiffLineProps) {
  if (initialValue === newValue) return null;
  return (
    <LabelWithValue
      className="w-fit"
      valueClassName="break-all"
      label={label}
      value={`${initialValue} → ${newValue}${newValue.toString() === MAX_U64.toString() ? " (u64 MAX)" : ""}`}
      horizontal
    />
  );
}
