import { TBodySans } from "@/components/shared/Typography";
import { GitHubRepo } from "@/lib/mvr";

interface RepoItemProps {
  repo: GitHubRepo;
}

export default function RepoItem({ repo }: RepoItemProps) {
  return (
    <TBodySans>
      <span className="text-muted-foreground">{repo.owner}/</span>
      {repo.name}
    </TBodySans>
  );
}
