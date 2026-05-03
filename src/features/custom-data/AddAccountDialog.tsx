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
import { useCustomAccounts } from './CustomAccountsProvider';
import type { AccountOwner, AccountType } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
}

const TYPE_LABEL: Record<AccountType, string> = {
  bank: '🏦 Banka hesabı',
  cash: '💵 Nakit',
  savings: '💰 Birikim',
  virtual_kasa: '📦 Sanal kasa',
};

const OWNER_LABEL: Record<AccountOwner, string> = {
  emre: 'Emre',
  sila: 'Sıla',
  shared: 'Ortak',
};

export function AddAccountDialog({ open, onClose }: Props) {
  const { add } = useCustomAccounts();

  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('bank');
  const [owner, setOwner] = useState<AccountOwner>('shared');
  const [balance, setBalance] = useState('');
  const [bankName, setBankName] = useState('');
  const [saving, setSaving] = useState(false);

  function reset(): void {
    setName('');
    setType('bank');
    setOwner('shared');
    setBalance('');
    setBankName('');
  }

  async function handleSave(): Promise<void> {
    if (!name.trim()) {
      toast.error('Hesap ismi boş olamaz');
      return;
    }
    const parsed = balance ? Number(balance.replace(',', '.')) : 0;
    if (!Number.isFinite(parsed)) {
      toast.error('Bakiye geçersiz');
      return;
    }

    setSaving(true);
    try {
      await add({
        name: name.trim(),
        type,
        owner,
        balance: parsed,
        ...(bankName.trim() && { bankName: bankName.trim() }),
      });
      toast.success(`${name} hesabı eklendi 🏦`);
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
          <DialogTitle>Yeni Hesap Ekle</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="acc-name">Hesap ismi</Label>
            <Input
              id="acc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn. Sodexo Market"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label>Tür</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as AccountType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TYPE_LABEL) as AccountType[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {TYPE_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Sahip</Label>
              <Select
                value={owner}
                onValueChange={(v) => setOwner(v as AccountOwner)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(OWNER_LABEL) as AccountOwner[]).map((o) => (
                    <SelectItem key={o} value={o}>
                      {OWNER_LABEL[o]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="acc-bank">Banka adı (opsiyonel)</Label>
            <Input
              id="acc-bank"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="Örn. Sodexo / Garanti BBVA"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="acc-balance">Başlangıç bakiyesi (TL)</Label>
            <Input
              id="acc-balance"
              type="number"
              inputMode="decimal"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              placeholder="0"
              step={0.01}
            />
            <p className="text-xs text-muted-foreground">
              Şu an hesapta olan tutar. Sonradan "Bakiye Düzelt" ile
              güncelleyebilirsin.
            </p>
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
