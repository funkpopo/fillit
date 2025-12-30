import { useGameStore } from './store';
import { Canvas } from './components/Canvas';
import { Palette } from './components/Palette';
import { PictureList } from './components/PictureList';
import { ProgressBar } from './components/ProgressBar';
import { Upload } from './components/Upload';
import { SettingsDialog } from './components/SettingsDialog';
import { CompletionCelebration } from './components/CompletionCelebration';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Palette as PaletteIcon } from 'lucide-react';

function App() {
  const { currentPicture, fetchPictures } = useGameStore();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center gap-2 sm:gap-4">
          {currentPicture && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => useGameStore.setState({ currentPicture: null })}
            >
              <ArrowLeft className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">返回</span>
            </Button>
          )}
          <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <PaletteIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            Fillit
          </h1>
          <div className="ml-auto">
            <SettingsDialog />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {!currentPicture ? (
          <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto">
            <Upload onUploadComplete={fetchPictures} />
            <PictureList />
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4 max-w-3xl mx-auto">
            <ProgressBar />
            <Canvas />
            <Palette />
          </div>
        )}
      </main>

      <CompletionCelebration />
    </div>
  );
}

export default App;
