import { ReactNode, forwardRef, useEffect, useRef } from "react";

import { ClassValue } from "clsx";
import { mergeRefs } from "react-merge-refs";

import { TLabel, TLabelSans } from "@/components/shared/Typography";
import {
  Input as InputComponent,
  InputProps as InputComponentProps,
} from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const getInputId = (id: string) => `input-${id}`;

interface InputProps {
  className?: ClassValue;
  label?: ReactNode;
  labelRight?: string;
  id: string;
  type?: "text" | "number" | "range";
  placeholder?: string;
  defaultValue?: string | number;
  value?: string | number;
  onChange: (value: string) => void;
  inputProps?: InputComponentProps;
  startDecorator?: string;
  endDecorator?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      labelRight,
      id,
      type = "text",
      placeholder,
      defaultValue,
      value,
      onChange,
      inputProps,
      startDecorator,
      endDecorator,
    },
    ref,
  ) => {
    const {
      className: inputClassName,
      autoFocus: inputAutoFocus,
      ...restInputProps
    } = inputProps || {};

    const inputId = getInputId(id);

    // Autofocus
    const localRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
      if (!inputAutoFocus) return;
      setTimeout(() => localRef.current?.focus());
    }, [inputAutoFocus]);

    return (
      <div className={cn("flex flex-col gap-2", className)}>
        {label && (
          <div className="flex flex-row justify-between">
            <label htmlFor={inputId}>
              <TLabelSans>{label}</TLabelSans>
            </label>
            {labelRight && <TLabelSans>{labelRight}</TLabelSans>}
          </div>
        )}

        <div className="relative w-full">
          {startDecorator && (
            <TLabel className="pointer-events-none absolute left-3 top-1/2 z-[2] -translate-y-2/4">
              {startDecorator}
            </TLabel>
          )}

          <InputComponent
            ref={mergeRefs([localRef, ref])}
            id={inputId}
            className={cn(
              "border-divider relative z-[1] focus:border-primary",
              startDecorator && "pl-10",
              endDecorator && "pr-10",
              inputClassName,
            )}
            type={type}
            placeholder={placeholder}
            defaultValue={defaultValue}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onWheel={(e) => e.currentTarget.blur()}
            autoComplete="off"
            {...restInputProps}
          />

          {endDecorator && (
            <TLabel className="pointer-events-none absolute right-3 top-1/2 z-[2] -translate-y-2/4">
              {endDecorator}
            </TLabel>
          )}
        </div>
      </div>
    );
  },
);
Input.displayName = "Input";

export default Input;
