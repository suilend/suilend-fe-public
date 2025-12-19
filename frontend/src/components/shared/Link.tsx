import NextLink, { LinkProps as NextLinkProps } from "next/link";
import { useRouter } from "next/router";
import { PropsWithChildren, ReactNode, useMemo } from "react";

import { ClassValue } from "clsx";

import {
  TLabelSans,
  labelSansClassNames,
} from "@/components/shared/Typography";
import { cn } from "@/lib/utils";

interface LinkProps extends PropsWithChildren, NextLinkProps {
  href: string;
  startsWithHref?: string;
  className?: ClassValue;
  activeClassName?: ClassValue;
  isExternal?: boolean;
  startIcon?: ReactNode;
  label?: string;
  labelClassName?: ClassValue;
  labelActiveClassName?: ClassValue;
  endIcon?: ReactNode;
}

export default function Link({
  href,
  startsWithHref,
  className,
  activeClassName,
  isExternal,
  startIcon,
  label,
  labelClassName,
  labelActiveClassName,
  endIcon,
  children,
  ...props
}: LinkProps) {
  const router = useRouter();
  const isActive = startsWithHref
    ? router.asPath.startsWith(startsWithHref)
    : router.asPath.split("?")[0] === href;

  const finalHref = useMemo(() => {
    if (isExternal) return href;

    const wallet = router.query.wallet;
    if (!wallet) return href;

    const [basePath, existingQueryString] = href.split("?");
    const existingParams = new URLSearchParams(existingQueryString || "");

    if (!existingParams.has("wallet"))
      existingParams.set("wallet", wallet as string);

    const queryString = existingParams.toString();
    return queryString ? `${basePath}?${queryString}` : basePath;
  }, [isExternal, href, router.query.wallet]);

  const Component = isExternal ? "a" : NextLink;

  return (
    <Component
      href={finalHref}
      target={isExternal ? "_blank" : undefined}
      className={cn(
        labelSansClassNames,
        "group flex shrink-0 flex-row items-center gap-1.5 text-sm transition-colors hover:text-foreground",
        className,
        isActive && cn("text-foreground", activeClassName),
      )}
      {...props}
    >
      {startIcon}
      {children}
      {label && (
        <TLabelSans
          className={cn(
            "rounded-sm bg-muted px-1 text-[10px] leading-4 text-background transition-colors group-hover:bg-foreground",
            labelClassName,
            isActive && cn("bg-foreground", labelActiveClassName),
          )}
        >
          {label}
        </TLabelSans>
      )}
      {endIcon}
    </Component>
  );
}
