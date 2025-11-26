import { formatDate, formatRelative } from "date-fns";
import { GitCommit } from "lucide-react";

import Tooltip from "@/components/shared/Tooltip";
import { TBodySans, TLabel, TLabelSans } from "@/components/shared/Typography";
import { GitHubWorkflowRun } from "@/lib/mvr";

interface WorkflowRunItemProps {
  workflowRun: GitHubWorkflowRun;
}

export default function WorkflowRunItem({ workflowRun }: WorkflowRunItemProps) {
  return (
    <div className="flex flex-col items-start gap-1">
      <TBodySans>{workflowRun.displayTitle}</TBodySans>

      <div className="flex flex-row items-center gap-1">
        <Tooltip title={workflowRun.commitSha}>
          <div className="flex flex-row items-center gap-1">
            <GitCommit className="h-4 w-4 text-muted-foreground" />
            <TLabel>{workflowRun.commitSha.slice(0, 7)}</TLabel>
          </div>
        </Tooltip>

        <TLabelSans>•</TLabelSans>

        <Tooltip
          title={formatDate(
            new Date(workflowRun.createdAt),
            "MMM dd, yyyy, h:mm a",
          )}
        >
          <TLabelSans>
            {formatRelative(new Date(workflowRun.createdAt), new Date())}
          </TLabelSans>
        </Tooltip>
      </div>
    </div>
  );
}
