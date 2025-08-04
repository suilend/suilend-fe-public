import {
  PropsWithChildren,
  ReactElement,
  ReactNode,
  cloneElement,
} from "react";

import { ClassValue } from "clsx";
import { Info } from "lucide-react";

import Tooltip from "@/components/shared/Tooltip";
import { TabsList, Tabs as TabsRoot, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface Tab {
  id: string;
  icon?: ReactElement;
  title: string;
  tooltip?: string;
}

interface TabsProps extends PropsWithChildren {
  className?: ClassValue;
  listClassName?: ClassValue;
  triggerClassName?: (tab: Tab) => ClassValue;
  tabs: Tab[];
  selectedTab: string;
  onTabChange: (tab: string) => void;
  topEndDecorator?: ReactNode;
}

export default function Tabs({
  className,
  listClassName,
  triggerClassName,
  tabs,
  selectedTab,
  onTabChange,
  topEndDecorator,
  children,
}: TabsProps) {
  return (
    <TabsRoot value={selectedTab as string} onValueChange={onTabChange}>
      <div
        className={cn(
          "flex flex-row items-center justify-between gap-2",
          className,
        )}
      >
        <TabsList
          className={cn(
            "flex h-fit w-full flex-row rounded-[5px] bg-card p-[1px]",
            listClassName,
          )}
        >
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              className={cn(
                "flex h-10 flex-1 flex-row items-center gap-2 px-0 font-normal uppercase text-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
                triggerClassName?.(tab),
              )}
              value={tab.id}
            >
              {tab.icon &&
                cloneElement(tab.icon, {
                  className: cn("w-4 h-4 shrink-0"),
                })}
              {tab.title}

              {tab.tooltip && (
                <Tooltip title={tab.tooltip}>
                  <div className="-m-1 flex shrink-0 flex-col justify-center p-1">
                    <Info
                      className={cn(
                        "h-4 w-4 transition-colors",
                        tab.id === selectedTab
                          ? "text-primary-foreground"
                          : "text-muted-foreground",
                      )}
                    />
                  </div>
                </Tooltip>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {topEndDecorator}
      </div>

      {children}
    </TabsRoot>
  );
}
