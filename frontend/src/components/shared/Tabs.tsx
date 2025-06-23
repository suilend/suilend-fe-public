import {
  PropsWithChildren,
  ReactElement,
  ReactNode,
  cloneElement,
} from "react";

import { ClassValue } from "clsx";

import { TabsList, Tabs as TabsRoot, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface Tab {
  id: string;
  icon?: ReactElement;
  title: string;
}

interface TabsProps extends PropsWithChildren {
  listClassName?: ClassValue;
  triggerClassName?: (tab: Tab) => ClassValue;
  tabs: Tab[];
  selectedTab: string;
  onTabChange: (tab: string) => void;
  topEndDecorator?: ReactNode;
}

export default function Tabs({
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
      <div className="-mr-2 mb-4 flex flex-row items-center justify-between gap-2">
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
            </TabsTrigger>
          ))}
        </TabsList>

        {topEndDecorator}
      </div>

      {children}
    </TabsRoot>
  );
}
