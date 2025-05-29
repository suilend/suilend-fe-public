import Link from "next/link";
import { CSSProperties, PropsWithChildren, forwardRef } from "react";

import { ArrowLeftRight, Info, LucideIcon } from "lucide-react";

import track from "@suilend/sui-fe/lib/track";

import Container from "@/components/shared/Container";
import { TBody, TBodySans } from "@/components/shared/Typography";
import { cn } from "@/lib/utils";

const IconMap: Record<string, LucideIcon> = {
  info: Info,
  arrowLeftRight: ArrowLeftRight,
};

interface LinkWrapperProps extends PropsWithChildren {
  isLinkRelative?: boolean;
  link?: string;
}

function LinkWrapper({ isLinkRelative, link, children }: LinkWrapperProps) {
  if (!link) return children;
  return (
    <Link
      className="block"
      target={isLinkRelative ? undefined : "_blank"}
      href={link}
      onClick={() => track("banner_click", { link })}
    >
      {children}
    </Link>
  );
}

interface BannerProps {
  style?: CSSProperties;
  icon?: keyof typeof IconMap;
  isLinkRelative?: boolean;
  link?: string;
  linkTitle?: string;
  message?: string;
  height: number | null;
  isHidden?: boolean;
}

const Banner = forwardRef<HTMLDivElement, BannerProps>(
  (
    { style, icon, isLinkRelative, link, linkTitle, message, height, isHidden },
    ref,
  ) => {
    const Icon = icon ? IconMap[icon] : null;

    return (
      <>
        <div className="w-full" style={{ height: `${height ?? 0}px` }} />
        <div
          ref={ref}
          className={cn(
            "fixed left-0 top-0 z-[3] bg-secondary",
            isHidden && "hidden",
            !isHidden && [0, null].includes(height) && "opacity-0",
          )}
          style={{
            right: "var(--removed-body-scroll-bar-size, 0)",
            ...(style ?? {}),
          }}
        >
          <Container>
            <LinkWrapper isLinkRelative={isLinkRelative} link={link}>
              <div className="flex min-h-10 w-full flex-col items-center justify-center gap-1 py-2 md:flex-row md:gap-4">
                <div className="flex flex-row gap-2">
                  {Icon && (
                    <Icon className="my-0.5 h-4 w-4 shrink-0 text-secondary-foreground" />
                  )}

                  <TBodySans className="text-center text-secondary-foreground">
                    {message}
                  </TBodySans>
                </div>

                {link && (
                  <TBody className="shrink-0 uppercase text-secondary-foreground underline decoration-secondary-foreground hover:no-underline">
                    {linkTitle ?? "View"}
                  </TBody>
                )}
              </div>
            </LinkWrapper>
          </Container>
        </div>
      </>
    );
  },
);
Banner.displayName = "Banner";

export default Banner;
