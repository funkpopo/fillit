import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload as UploadIcon, Loader2 } from 'lucide-react';
import { useSettingsStore } from '@/settingsStore';
import { usePictureStore } from '@/pictureStore';
import { API_BASE } from '../config';
import type { PictureData } from '../types';

interface UploadProps {
  onUploadComplete: () => void;
}

export function Upload({ onUploadComplete }: UploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [useVLM, setUseVLM] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { seedreamConfig } = useSettingsStore();

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('useVLM', String(useVLM));
    if (useVLM && seedreamConfig.apiKey) {
      formData.append('apiKey', seedreamConfig.apiKey);
    }

    try {
      const res = await fetch(`${API_BASE}/api/pictures`, {
        method: 'POST',
        body: formData
      });
      const data: PictureData = await res.json();

      if (data.vlmError) {
        setError(`AI处理失败: ${data.vlmError}`);
      }
      await usePictureStore.getState().addPicture(data);
      onUploadComplete();
    } catch (e) {
      setError(`上传失败: ${e instanceof Error ? e.message : '未知错误'}`);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleFileChange = () => {
    const file = fileRef.current?.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  return (
    <Card
      className={`border-2 border-dashed transition-colors ${
        dragActive ? 'border-primary bg-primary/5' : 'border-border'
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
    >
      <CardContent className="flex flex-col items-center justify-center py-10 gap-4">
        <div className="rounded-full bg-muted p-4">
          {uploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          ) : (
            <UploadIcon className="h-8 w-8 text-muted-foreground" />
          )}
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            {uploading ? '处理中...' : '拖拽图片到这里，或者'}
          </p>
        </div>
        <input
          type="file"
          ref={fileRef}
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <Button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          variant="outline"
        >
          选择文件
        </Button>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={useVLM}
            onChange={(e) => setUseVLM(e.target.checked)}
            className="rounded border-input"
          />
          <span className="text-muted-foreground">使用 AI 图生图处理</span>
        </label>
        {useVLM && !seedreamConfig.apiKey && (
          <p className="text-xs text-destructive">请先在设置中配置 API Key</p>
        )}
        {error && (
          <p className="text-xs text-destructive max-w-xs text-center">{error}</p>
        )}
      </CardContent>
    </Card>
  );
}
