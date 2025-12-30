import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useGameStore } from '../store';

export function CompletionCelebration() {
  const { currentPicture, filledRegions } = useGameStore();
  const [show, setShow] = useState(false);
  const [confetti, setConfetti] = useState<Array<{ id: number; x: number; color: string; delay: number }>>([]);

  const totalRegions = currentPicture?.regions.length ?? 0;
  const isComplete = totalRegions > 0 && filledRegions.size === totalRegions;

  useEffect(() => {
    if (isComplete) {
      setShow(true);
      const particles = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        color: ['#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3', '#f38181', '#aa96da', '#fcbad3'][Math.floor(Math.random() * 7)],
        delay: Math.random() * 2,
      }));
      setConfetti(particles);
    }
  }, [isComplete]);

  const handleComplete = () => {
    setShow(false);
    useGameStore.setState({ currentPicture: null, filledRegions: new Set() });
  };

  if (!show || !currentPicture) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <style>{`
        @keyframes fall {
          0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        @keyframes ribbon {
          0% { transform: translateY(-100vh) translateX(0) rotate(0deg); }
          100% { transform: translateY(100vh) translateX(50px) rotate(360deg); }
        }
        .confetti { animation: fall 4s linear forwards; }
        .ribbon { animation: ribbon 5s ease-in-out forwards; }
      `}</style>

      {confetti.map(p => (
        <div
          key={p.id}
          className={p.id % 3 === 0 ? 'ribbon' : 'confetti'}
          style={{
            position: 'fixed',
            left: `${p.x}%`,
            top: 0,
            width: p.id % 3 === 0 ? '8px' : '12px',
            height: p.id % 3 === 0 ? '30px' : '12px',
            backgroundColor: p.color,
            borderRadius: p.id % 3 === 0 ? '2px' : '50%',
            animationDelay: `${p.delay}s`,
            zIndex: 51,
          }}
        />
      ))}

      <div className="relative z-52 flex flex-col items-center gap-6 p-8 bg-card rounded-2xl border border-border shadow-2xl max-w-md mx-4 animate-in zoom-in duration-500">
        <div className="text-4xl">🎉</div>
        <h2 className="text-2xl font-bold text-center">恭喜完成!</h2>
        <div className="rounded-lg overflow-hidden border border-border shadow-lg">
          <img
            src={currentPicture.coloredUrl}
            alt="完成作品"
            className="max-w-[280px] max-h-[280px] object-contain"
          />
        </div>
        <p className="text-muted-foreground text-center">你已经完成了这幅作品的填色!</p>
        <Button size="lg" onClick={handleComplete} className="w-full">
          返回首页
        </Button>
      </div>
    </div>
  );
}
