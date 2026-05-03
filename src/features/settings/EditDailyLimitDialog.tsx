import { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useSettings } from './SettingsProvider';
import { formatTRY } from '@/lib/format';

interface Props {
  open: boolean;
  onClose: () => void;
}

const PRESETS = [300, 400, 510, 600, 750, 1000] as const;

export function EditDailyLimitDialog({ open, onClose }: Props) {
  const { dailyLimit, setDailyLimit } = useSettings();
  const [value, setValue] = useState<string>(String(dailyLimit));
  const [saving, setSaving] = useState(false);

  async function handleSave(): Promise<void> {
    const parsed = Number(value.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.error('Geçerli bir tutar gir');
      return;
    }
    if (parsed > 50000) {
      toast.error('Çok yüksek — 50.000 TL üstü kabul edilmiyor');
      return;
    }

    setSaving(true);
    try {
      await setDailyLimit(parsed);
      toast.success(`Günlük limit ${formatTRY(parsed)} oldu`);
      onClose();
    } catch (err) {
      toast.error('Kaydedilemedi', {
        description: err instanceof Error ? err.message : 'Bilinmeyen hata',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Günlük Harcama Limiti</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="daily-limit-input">Tutar (TL)</Label>
            <Input
              id="daily-limit-input"
              type="number"
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              min={1}
              max={50000}
              step={10}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Aşım olursa ertesi günkü limit azalır; kalan miktar kasaya yatar.
            </p>
          </div>

          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Hızlı Seçim
            </p>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setValue(String(preset))}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                    Number(value) === preset
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  {formatTRY(preset)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            İptal
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
