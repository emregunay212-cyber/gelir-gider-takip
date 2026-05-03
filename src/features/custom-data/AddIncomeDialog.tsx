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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCustomIncomes } from './CustomIncomesProvider';

interface Props {
  open: boolean;
  onClose: () => void;
}

type Owner = 'emre' | 'sila';
type Category = 'salary' | 'side_income' | 'bonus' | 'other';
type Frequency = 'monthly' | 'one_time' | 'seasonal_range';

const CATEGORY_LABEL: Record<Category, string> = {
  salary: '💼 Maaş',
  bonus: '🎁 Yan hak (bonus, kart vs)',
  side_income: '💰 Yan gelir',
  other: '📋 Diğer',
};

const FREQUENCY_LABEL: Record<Frequency, string> = {
  monthly: 'Her ay düzenli',
  seasonal_range: 'Belirli aylarda (dönemsel)',
  one_time: 'Tek seferlik',
};

export function AddIncomeDialog({ open, onClose }: Props) {
  const { add } = useCustomIncomes();

  const [name, setName] = useState('');
  const [owner, setOwner] = useState<Owner>('sila');
  const [category, setCategory] = useState<Category>('bonus');
  const [frequency, setFrequency] = useState<Frequency>('monthly');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');
  const [amountFixed, setAmountFixed] = useState('');
  const [dayOfMonth, setDayOfMonth] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  function reset(): void {
    setName('');
    setOwner('sila');
    setCategory('bonus');
    setFrequency('monthly');
    setAmountMin('');
    setAmountMax('');
    setAmountFixed('');
    setDayOfMonth('');
    setNotes('');
  }

  async function handleSave(): Promise<void> {
    if (!name.trim()) {
      toast.error('İsim boş olamaz');
      return;
    }

    const fixed = amountFixed ? Number(amountFixed.replace(',', '.')) : null;
    const min = amountMin ? Number(amountMin.replace(',', '.')) : null;
    const max = amountMax ? Number(amountMax.replace(',', '.')) : null;
    const day = dayOfMonth ? Number(dayOfMonth) : null;

    if (fixed != null && (!Number.isFinite(fixed) || fixed <= 0)) {
      toast.error('Sabit tutar geçersiz');
      return;
    }
    if (min != null && max != null && min > max) {
      toast.error('Minimum tutar maksimumdan büyük olamaz');
      return;
    }
    if (day != null && (day < 1 || day > 31)) {
      toast.error('Ay günü 1-31 arası olmalı');
      return;
    }
    if (fixed == null && min == null && max == null) {
      toast.error('Tutar gir (sabit ya da min-max)');
      return;
    }

    setSaving(true);
    try {
      await add({
        name: name.trim(),
        ownerKey: owner,
        category,
        frequency,
        ...(fixed != null && { amountFixed: fixed }),
        ...(min != null && { amountMin: min }),
        ...(max != null && { amountMax: max }),
        ...(day != null && { dayOfMonth: day }),
        ...(notes.trim() && { notes: notes.trim() }),
      });
      toast.success(`${name} eklendi 💸`);
      reset();
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
        if (!o) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Yeni Gelir Ekle</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="inc-name">İsim</Label>
            <Input
              id="inc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn. Sodexo Market"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label>Kim</Label>
              <Select value={owner} onValueChange={(v) => setOwner(v as Owner)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="emre">Emre</SelectItem>
                  <SelectItem value="sila">Sıla</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Kategori</Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as Category)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(CATEGORY_LABEL) as Category[]).map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_LABEL[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Sıklık</Label>
            <Select
              value={frequency}
              onValueChange={(v) => setFrequency(v as Frequency)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(FREQUENCY_LABEL) as Frequency[]).map((f) => (
                  <SelectItem key={f} value={f}>
                    {FREQUENCY_LABEL[f]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Tutar (TL)
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="inc-fixed" className="text-xs">
                Sabit tutar
              </Label>
              <Input
                id="inc-fixed"
                type="number"
                inputMode="decimal"
                value={amountFixed}
                onChange={(e) => {
                  setAmountFixed(e.target.value);
                  if (e.target.value) {
                    setAmountMin('');
                    setAmountMax('');
                  }
                }}
                placeholder="Örn. 43000"
              />
            </div>
            <p className="text-center text-[11px] text-muted-foreground">
              veya değişken aralık
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                inputMode="decimal"
                value={amountMin}
                onChange={(e) => {
                  setAmountMin(e.target.value);
                  if (e.target.value) setAmountFixed('');
                }}
                placeholder="Min"
              />
              <Input
                type="number"
                inputMode="decimal"
                value={amountMax}
                onChange={(e) => {
                  setAmountMax(e.target.value);
                  if (e.target.value) setAmountFixed('');
                }}
                placeholder="Max"
              />
            </div>
          </div>

          {(frequency === 'monthly' || frequency === 'seasonal_range') && (
            <div className="space-y-1.5">
              <Label htmlFor="inc-day">Ayın hangi günü? (1-31)</Label>
              <Input
                id="inc-day"
                type="number"
                inputMode="numeric"
                min={1}
                max={31}
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(e.target.value)}
                placeholder="Örn. 5"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="inc-notes">Notlar (opsiyonel)</Label>
            <Input
              id="inc-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Örn. Market alışverişi için"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            İptal
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? 'Kaydediliyor...' : 'Ekle'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
