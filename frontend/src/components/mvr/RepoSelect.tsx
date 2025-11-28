import { ChevronDown } from "lucide-react";

import RepoItem from "@/components/mvr/RepoItem";
import Button from "@/components/shared/Button";
import DropdownMenu, {
  DropdownMenuItem,
} from "@/components/shared/DropdownMenu";
import OpenURLButton from "@/components/shared/OpenURLButton";
import { TLabelSans } from "@/components/shared/Typography";
import { GitHubRepo } from "@/lib/mvr";
import { cn } from "@/lib/utils";

interface RepoSelectProps {
  repos: GitHubRepo[];
  repoId: string | undefined;
  repo: GitHubRepo | undefined;
  onRepoIdChange: (repoId: string) => void;
}

export default function RepoSelect({
  repos,
  repoId,
  repo,
  onRepoIdChange,
}: RepoSelectProps) {
  return (
    <div className="flex w-full flex-col gap-2">
      <TLabelSans>
        Repository <span className="text-red-500">*</span>
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
            labelClassName={cn("font-sans", repoId && "text-foreground")}
            endIcon={<ChevronDown />}
            variant="secondaryOutline"
            size="lg"
          >
            {repo ? <RepoItem repo={repo} /> : "Select repository"}
          </Button>
        }
        items={
          <div className="flex w-full flex-col gap-2">
            {repos.map((repo) => {
              return (
                <DropdownMenuItem
                  key={repo.id}
                  className="h-10"
                  isSelected={repo.id === repoId}
                  onClick={() => onRepoIdChange(repo.id)}
                >
                  <div className="flex w-full flex-row items-center justify-between">
                    <RepoItem repo={repo} />

                    <OpenURLButton url={repo.url}>View on GitHub</OpenURLButton>
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
