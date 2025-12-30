import { useGameStore } from '../store';
import { Progress } from '@/components/ui/progress';

export function ProgressBar() {
  const { currentPicture, filledRegions } = useGameStore();

  if (!currentPicture) return null;

  const totalRegions = currentPicture.regions.length;
  const filledCount = filledRegions.size;
  const percentage = totalRegions > 0 ? Math.round((filledCount / totalRegions) * 100) : 0;

  return (
    <div className="flex items-center gap-3">
      <Progress value={percentage} className="flex-1 h-3" />
      <span className="text-sm font-medium text-muted-foreground min-w-[3rem] text-right">
        {percentage}%
      </span>
    </div>
  );
}
