import { useGameStore } from '../store';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { useState, useEffect } from 'react';

export function Palette() {
  const { currentPicture, selectedColorIndex, selectColor, filledRegions } = useGameStore();
  const [completedColors, setCompletedColors] = useState<Set<number>>(new Set());

  const getRegionCountForColor = (colorIndex: number) => {
    return currentPicture?.regions.filter(
      r => r.colorIndex === colorIndex && !filledRegions.has(r.id)
    ).length ?? 0;
  };

  useEffect(() => {
    if (!currentPicture) return;
    const newCompleted = new Set<number>();
    currentPicture.palette.forEach(color => {
      if (getRegionCountForColor(color.index) === 0) {
        newCompleted.add(color.index);
      }
    });
    setCompletedColors(newCompleted);
  }, [currentPicture, filledRegions]);

  if (!currentPicture) return null;

  const incompleteColors = currentPicture.palette.filter(c => !completedColors.has(c.index));

  return (
    <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-center p-3 sm:p-4 bg-card rounded-lg border border-border">
      {incompleteColors.map((color) => {
        const remaining = getRegionCountForColor(color.index);
        const isSelected = selectedColorIndex === color.index;

        return (
          <button
            key={color.index}
            className={cn(
              "relative w-10 h-10 sm:w-12 sm:h-12 rounded-lg transition-all duration-300 border-2 animate-in fade-in zoom-in",
              isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110",
              "border-transparent hover:scale-105 cursor-pointer",
            )}
            style={{ backgroundColor: color.hex }}
            onClick={() => selectColor(color.index)}
          >
            <span className="absolute -top-1 -left-1 bg-background text-foreground text-[10px] sm:text-xs font-bold rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center border border-border">
              {color.index + 1}
            </span>
            <span className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-[10px] sm:text-xs font-bold rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center">
              {remaining}
            </span>
          </button>
        );
      })}
      {incompleteColors.length === 0 && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Check className="h-5 w-5 text-green-500" />
          <span>所有颜色已完成!</span>
        </div>
      )}
    </div>
  );
}
