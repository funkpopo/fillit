import { useEffect, useState } from 'react';
import { useGameStore } from '../store';
import { usePictureStore } from '../pictureStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Trash2, Loader2, ImageIcon } from 'lucide-react';

export function PictureList() {
  const { pictures, fetchPictures, selectPicture, deletePicture } = useGameStore();
  const loading = usePictureStore(state => state.loading);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) {
      fetchPictures();
    }
  }, [loading]);

  const handleDelete = () => {
    if (deleteId) {
      deletePicture(deleteId);
      setDeleteId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (pictures.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 gap-2">
          <ImageIcon className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">还没有图片，上传一张开始吧！</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
        {pictures.map((pic) => (
          <Card
            key={pic.id}
            className="group cursor-pointer overflow-hidden transition-all hover:ring-2 hover:ring-primary active:scale-95"
            onClick={() => selectPicture(pic.id)}
          >
            <div className="relative aspect-square">
              <img
                src={pic.coloredUrl}
                alt="图片"
                className="h-full w-full object-cover"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity h-8 w-8 sm:h-10 sm:w-10"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteId(pic.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <CardContent className="p-2 sm:p-3">
              <p className="text-xs sm:text-sm truncate">{pic.id.slice(0, 8)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定删除？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销，图片将被永久删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
