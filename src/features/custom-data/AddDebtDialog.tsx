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
import { useCustomDebts } from './CustomDebtsProvider';
import type { DebtType } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
}

type Owner = 'emre' | 'sila';

const TYPE_LABEL: Record<DebtType, string> = {
  fixed_installment: '🧾 Sabit taksit (kredi/kart)',
  remaining_balance: '📉 Kalan anapara (faizli kredi)',
  interest_only: '⚠️ Sadece faiz (ana borç sabit)',
  personal_loan: '🤝 Kişisel borç (eş, dost)',
};

const TYPE_HINT: Record<DebtType, string> = {
  fixed_installment:
    'Belirli sayıda eşit taksit. Kalan ay otomatik düşer (4 KKart taksiti gibi).',
  remaining_balance:
    'Faiz dahil kalan toplam borç. Aylık ödeme bu rakamdan düşer (kredi gibi).',
  interest_only:
    'Sadece aylık faiz ödeniyor, ana borç sabit kalır (nakit avans gibi).',
  personal_loan:
    'Eş, dost, akrabaya borç. Tek ödeme veya bölünmüş — sen seçersin.',
};

export function AddDebtDialog({ open, onClose }: Props) {
  const { add } = useCustomDebts();

  const [name, setName] = useState('');
  const [owner, setOwner] = useState<Owner>('emre');
  const [type, setType] = useState<DebtType>('fixed_installment');
  const [bankOrCreditor, setBankOrCreditor] = useState('');
  const [monthlyPayment, setMonthlyPayment] = useState('');
  const [totalInstallments, setTotalInstallments] = useState('');
  const [remainingPrincipal, setRemainingPrincipal] = useState('');
  const [principalAmount, setPrincipalAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  function reset(): void {
    setName('');
    setOwner('emre');
    setType('fixed_installment');
    setBankOrCreditor('');
    setMonthlyPayment('');
    setTotalInstallments('');
    setRemainingPrincipal('');
    setPrincipalAmount('');
    setInterestRate('');
    setNotes('');
  }

  async function handleSave(): Promise<void> {
    if (!name.trim()) {
      toast.error('Borç ismi boş olamaz');
      return;
    }
    if (!bankOrCreditor.trim()) {
      toast.error('Banka / alacaklı boş olamaz');
      return;
    }

    const monthly = Number(monthlyPayment.replace(',', '.'));
    if (!Number.isFinite(monthly) || monthly <= 0) {
      toast.error('Aylık ödeme geçersiz');
      return;
    }

    const installments = totalInstallments
      ? Number(totalInstallments)
      : undefined;
    const principal = remainingPrincipal
      ? Number(remainingPrincipal.replace(',', '.'))
      : undefined;
    const principalSabit = principalAmount
      ? Number(principalAmount.replace(',', '.'))
      : undefined;
    const rate = interestRate
      ? Number(interestRate.replace(',', '.'))
      : undefined;

    if (type === 'fixed_installment' && (!installments || installments < 1)) {
      toast.error('Sabit taksit için toplam ay sayısı gerek');
      return;
    }
    if (type === 'remaining_balance' && (!principal || principal <= 0)) {
      toast.error('Kalan anapara tutarı gerek');
      return;
    }
    if (type === 'interest_only' && (!principalSabit || principalSabit <= 0)) {
      toast.error('Ana borç (sabit) tutarı gerek');
      return;
    }

    setSaving(true);
    try {
      await add({
        name: name.trim(),
        ownerKey: owner,
        type,
        bankOrCreditor: bankOrCreditor.trim(),
        monthlyPayment: monthly,
        ...(installments != null && {
          totalInstallments: installments,
          remainingInstallments: installments,
        }),
        ...(principal != null && { remainingPrincipal: principal }),
        ...(principalSabit != null && {
          principalAmount: principalSabit,
          monthlyInterest: monthly,
        }),
        ...(rate != null && { interestRate: rate }),
        ...(notes.trim() && { notes: notes.trim() }),
      });
      toast.success(`${name} borcu eklendi`);
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
          <DialogTitle>Yeni Borç Ekle</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="debt-name">İsim</Label>
            <Input
              id="debt-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn. Yapı Kredi Kartı"
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
              <Label htmlFor="debt-creditor">Banka / Alacaklı</Label>
              <Input
                id="debt-creditor"
                value={bankOrCreditor}
                onChange={(e) => setBankOrCreditor(e.target.value)}
                placeholder="Örn. Garanti BBVA"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Borç tipi</Label>
            <Select value={type} onValueChange={(v) => setType(v as DebtType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(TYPE_LABEL) as DebtType[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    {TYPE_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              {TYPE_HINT[type]}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="debt-monthly">Aylık ödeme (TL)</Label>
            <Input
              id="debt-monthly"
              type="number"
              inputMode="decimal"
              value={monthlyPayment}
              onChange={(e) => setMonthlyPayment(e.target.value)}
              placeholder="Örn. 2500"
              step={0.01}
            />
          </div>

          {type === 'fixed_installment' && (
            <div className="space-y-1.5">
              <Label htmlFor="debt-installments">Toplam ay sayısı</Label>
              <Input
                id="debt-installments"
                type="number"
                inputMode="numeric"
                min={1}
                max={120}
                value={totalInstallments}
                onChange={(e) => setTotalInstallments(e.target.value)}
                placeholder="Örn. 12"
              />
            </div>
          )}

          {type === 'remaining_balance' && (
            <div className="space-y-1.5">
              <Label htmlFor="debt-remaining">
                Kalan toplam borç (faiz dahil)
              </Label>
              <Input
                id="debt-remaining"
                type="number"
                inputMode="decimal"
                value={remainingPrincipal}
                onChange={(e) => setRemainingPrincipal(e.target.value)}
                placeholder="Örn. 50000"
                step={0.01}
              />
            </div>
          )}

          {type === 'interest_only' && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="debt-principal">Ana borç (sabit, TL)</Label>
                <Input
                  id="debt-principal"
                  type="number"
                  inputMode="decimal"
                  value={principalAmount}
                  onChange={(e) => setPrincipalAmount(e.target.value)}
                  placeholder="Örn. 75000"
                  step={0.01}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="debt-rate">Aylık faiz oranı (%)</Label>
                <Input
                  id="debt-rate"
                  type="number"
                  inputMode="decimal"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  placeholder="Örn. 4.25"
                  step={0.01}
                />
              </div>
            </>
          )}

          {type === 'personal_loan' && (
            <div className="space-y-1.5">
              <Label htmlFor="debt-installments-personal">
                Toplam ay sayısı (1 = tek ödeme)
              </Label>
              <Input
                id="debt-installments-personal"
                type="number"
                inputMode="numeric"
                min={1}
                max={120}
                value={totalInstallments}
                onChange={(e) => setTotalInstallments(e.target.value)}
                placeholder="Örn. 1"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="debt-notes">Notlar (opsiyonel)</Label>
            <Input
              id="debt-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Örn. Son ödeme Aralık 2026"
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
