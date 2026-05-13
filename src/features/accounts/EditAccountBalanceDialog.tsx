import { useEffect, useState } from 'react';
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
import { useAccountOverrides } from './AccountOverridesProvider';
import { formatTRY } from '@/lib/format';

interface Props {
  open: boolean;
  onClose: () => void;
  accountName: string;
  currentEffective: number; // delta'lar uygulanmış mevcut görünen bakiye
}

export function EditAccountBalanceDialog({
  open,
  onClose,
  accountName,
  currentEffective,
}: Props) {
  const { getOverride, setOverride, clearOverride } = useAccountOverrides();
  const existing = getOverride(accountName);
  const [value, setValue] = useState<string>(() =>
    existing ? String(existing.amount) : String(Math.round(currentEffective)),
  );
  const [saving, setSaving] = useState(false);

  // Açılır açılmaz mevcut değeri yansıt (re-open için)
  useEffect(() => {
    if (!open) return;
    setValue(
      existing ? String(existing.amount) : String(Math.round(currentEffective)),
    );
  }, [open, existing, currentEffective]);

  async function handleSave(): Promise<void> {
    const parsed = Number(value.replace(',', '.'));
    if (!Number.isFinite(parsed)) {
      toast.error('Geçerli bir tutar gir');
      return;
    }
    setSaving(true);
    try {
      await setOverride(accountName, parsed);
      toast.success(`${accountName} bakiyesi ${formatTRY(parsed)} oldu`);
      onClose();
    } catch (err) {
      toast.error('Kaydedilemedi', {
        description: err instanceof Error ? err.message : 'Bilinmeyen hata',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleReset(): Promise<void> {
    setSaving(true);
    try {
      await clearOverride(accountName);
      toast.success(`${accountName} bakiyesi otomatik hesaba döndü`);
      onClose();
    } catch (err) {
      toast.error('Sıfırlanamadı', {
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
          <DialogTitle>Bakiye Düzelt — {accountName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="acct-balance-input">Gerçek bakiye (TL)</Label>
            <Input
              id="acct-balance-input"
              type="number"
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              step={0.01}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Bankadaki şu anki gerçek bakiyeni gir. Önceki maaş, harcama ve
              borç hareketleri artık bu hesap için sayılmayacak — yeni rakam
              mutlak referans olarak alınacak. Bu tarihten sonra yapılan
              hareketler bu rakamın üstüne eklenir.
            </p>
          </div>

          {existing && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-300">
              <p className="font-semibold">Aktif manuel bakiye</p>
              <p className="mt-0.5">
                {formatTRY(existing.amount)} ·{' '}
                {new Date(existing.setAt).toLocaleDateString('tr-TR', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                tarihinde girildi
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:gap-2">
          {existing && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleReset}
              disabled={saving}
              className="text-[var(--color-danger)] hover:text-[var(--color-danger)]"
            >
              Sıfırla (otomatik hesap)
            </Button>
          )}
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
