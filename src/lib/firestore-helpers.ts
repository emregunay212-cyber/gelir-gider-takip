import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  type DocumentData,
} from 'firebase/firestore';
import { getDb } from './firebase';

// Tek hane senaryosu için sabit household ID.
// Auth/Email-Password ile birden fazla hane gerekirse buraya dinamik ID gelir.
export const HOUSEHOLD_ID = 'aile-butce';

export function householdCollectionPath(collectionName: string): string {
  return `households/${HOUSEHOLD_ID}/${collectionName}`;
}

export function householdDocPath(
  collectionName: string,
  docId: string,
): string {
  return `households/${HOUSEHOLD_ID}/${collectionName}/${docId}`;
}

// Türkçe karakter / boşluk içeren composite ID'leri Firestore-safe yap.
export function safeDocId(...parts: string[]): string {
  return parts
    .map((p) => p.replace(/[\s/.#$\[\]]/g, '_'))
    .join('__');
}

interface UseFirestoreCollectionResult<T> {
  items: readonly T[];
  ready: boolean;
  upsert: (item: T) => Promise<void>;
  remove: (id: string) => Promise<void>;
  upsertMany: (items: readonly T[]) => Promise<void>;
}

export function useFirestoreCollection<T extends { id: string }>(
  collectionName: string,
  validator: (raw: DocumentData) => T | null,
): UseFirestoreCollectionResult<T> {
  const [items, setItems] = useState<T[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const db = getDb();
    const ref = collection(db, householdCollectionPath(collectionName));
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        const list: T[] = [];
        snapshot.forEach((document) => {
          const data = document.data();
          const valid = validator(data);
          if (valid) list.push(valid);
        });
        setItems(list);
        setReady(true);
      },
      () => {
        setReady(true);
      },
    );
    return () => unsubscribe();
  }, [collectionName, validator]);

  async function upsert(item: T): Promise<void> {
    const db = getDb();
    const ref = doc(db, householdDocPath(collectionName, item.id));
    await setDoc(ref, item);
  }

  async function remove(id: string): Promise<void> {
    const db = getDb();
    const ref = doc(db, householdDocPath(collectionName, id));
    await deleteDoc(ref);
  }

  async function upsertMany(list: readonly T[]): Promise<void> {
    await Promise.all(list.map((item) => upsert(item)));
  }

  return { items, ready, upsert, remove, upsertMany };
}

interface UseFirestoreDocumentResult<T> {
  data: T | null;
  ready: boolean;
  save: (next: T) => Promise<void>;
}

export function useFirestoreDocument<T>(
  collectionName: string,
  docId: string,
  validator: (raw: DocumentData) => T | null,
  defaultValue: T,
): UseFirestoreDocumentResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const db = getDb();
    const ref = doc(db, householdDocPath(collectionName, docId));
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        if (!snapshot.exists()) {
          setData(defaultValue);
          setReady(true);
          return;
        }
        const validated = validator(snapshot.data());
        setData(validated ?? defaultValue);
        setReady(true);
      },
      () => {
        setData(defaultValue);
        setReady(true);
      },
    );
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionName, docId]);

  async function save(next: T): Promise<void> {
    const db = getDb();
    const ref = doc(db, householdDocPath(collectionName, docId));
    await setDoc(ref, next as Record<string, unknown>);
  }

  return { data, ready, save };
}
