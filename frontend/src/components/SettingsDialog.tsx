import { useState } from 'react';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSettingsStore, type ApiChannel } from '@/settingsStore';

const API_CHANNELS: { value: ApiChannel; label: string }[] = [
  { value: 'seedream', label: '火山Seedream' },
];

export function SettingsDialog() {
  const { apiChannel, seedreamConfig, setApiChannel, setSeedreamConfig } = useSettingsStore();
  const [open, setOpen] = useState(false);
  const [localConfig, setLocalConfig] = useState(seedreamConfig);

  const handleSave = async () => {
    await setSeedreamConfig(localConfig);
    setOpen(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setLocalConfig(seedreamConfig);
    }
    setOpen(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>API 设置</DialogTitle>
          <DialogDescription>配置图生图 API 渠道和密钥</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">API 渠道</label>
            <Select value={apiChannel} onValueChange={(v) => setApiChannel(v as ApiChannel)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {API_CHANNELS.map((ch) => (
                  <SelectItem key={ch.value} value={ch.value}>
                    {ch.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {apiChannel === 'seedream' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">API Key</label>
              <input
                type="password"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                placeholder="请输入 API Key"
                value={localConfig.apiKey}
                onChange={(e) => setLocalConfig({ ...localConfig, apiKey: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                获取 API Key: https://console.volcengine.com/ark/region:ark+cn-beijing/apikey
              </p>
            </div>
          )}

          <Button className="w-full" onClick={handleSave}>
            保存
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
