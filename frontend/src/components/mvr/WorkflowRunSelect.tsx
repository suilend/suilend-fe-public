import { ChevronDown } from "lucide-react";

import WorkflowRunItem from "@/components/mvr/WorkflowRunItem";
import Button from "@/components/shared/Button";
import DropdownMenu, {
  DropdownMenuItem,
} from "@/components/shared/DropdownMenu";
import OpenURLButton from "@/components/shared/OpenURLButton";
import { TLabelSans } from "@/components/shared/Typography";
import { GitHubWorkflowRun } from "@/lib/mvr";
import { cn } from "@/lib/utils";

interface WorkflowRunSelectProps {
  workflowRunsForRepo: GitHubWorkflowRun[];
  repoId: string | undefined;
  workflowRunId: string | undefined;
  workflowRun: GitHubWorkflowRun | undefined;
  onWorkflowRunIdChange: (workflowRunId: string) => void;
}

export default function WorkflowRunSelect({
  workflowRunsForRepo,
  repoId,
  workflowRunId,
  workflowRun,
  onWorkflowRunIdChange,
}: WorkflowRunSelectProps) {
  return (
    <div className="flex w-full flex-col gap-2">
      <TLabelSans>
        Workflow run <span className="text-red-500">*</span>
      </TLabelSans>
      <DropdownMenu
        contentProps={{
          style: {
            minWidth: "var(--radix-dropdown-menu-trigger-width)",
            maxWidth: "var(--radix-dropdown-menu-trigger-width)",
          },
        }}
        trigger={
          <Button
            className="h-max min-h-10 w-full justify-between"
            labelClassName={cn("font-sans", workflowRunId && "text-foreground")}
            endIcon={<ChevronDown />}
            variant="secondaryOutline"
            size="lg"
            disabled={!repoId}
          >
            {workflowRun ? (
              <WorkflowRunItem workflowRun={workflowRun} />
            ) : (
              "Select workflow run"
            )}
          </Button>
        }
        items={
          <div className="flex w-full flex-col gap-2">
            {workflowRunsForRepo.map((workflowRun) => {
              return (
                <DropdownMenuItem
                  key={workflowRun.id}
                  className="h-max min-h-10"
                  isSelected={workflowRun.id === workflowRunId}
                  onClick={() => onWorkflowRunIdChange(workflowRun.id)}
                >
                  <div className="flex w-full flex-row items-center justify-between">
                    <WorkflowRunItem workflowRun={workflowRun} />

                    <OpenURLButton url={workflowRun.url}>
                      View on GitHub
                    </OpenURLButton>
                  </div>
                </DropdownMenuItem>
              );
            })}
          </div>
        }
      />
    </div>
  );
}
