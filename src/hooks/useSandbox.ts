// ============================================================
// ARPET - Hook useSandbox
// Version: 4.0.0 - Compatible migration schémas
// Date: 2025-12-11
// ============================================================

import { useCallback } from 'react';
import { useAppStore } from '@/stores/appStore';
import type { SandboxItem, SandboxItemUpdate } from '@/types';
import * as sandboxService from '@/services/sandbox.service';

// ============================================================
// HOOK: useSandboxItems - Juste un wrapper du store
// ============================================================

export function useSandboxItems() {
  const sandboxItems = useAppStore((s) => s.sandboxItems);
  const sandboxLoading = useAppStore((s) => s.sandboxLoading);
  const sandboxError = useAppStore((s) => s.sandboxError);
  const sandboxCreating = useAppStore((s) => s.sandboxCreating);
  
  const fetchSandboxItems = useAppStore((s) => s.fetchSandboxItems);
  const createSandboxItem = useAppStore((s) => s.createSandboxItem);
  const deleteSandboxItem = useAppStore((s) => s.deleteSandboxItem);
  const pinSandboxItem = useAppStore((s) => s.pinSandboxItem);
  const unpinSandboxItem = useAppStore((s) => s.unpinSandboxItem);
  const archiveSandboxItem = useAppStore((s) => s.archiveSandboxItem);
  const clearSandboxError = useAppStore((s) => s.clearSandboxError);

  return {
    items: sandboxItems,
    loading: sandboxLoading,
    error: sandboxError,
    creating: sandboxCreating,
    refresh: fetchSandboxItems,
    create: createSandboxItem,
    remove: deleteSandboxItem,
    pin: pinSandboxItem,
    unpin: unpinSandboxItem,
    archive: archiveSandboxItem,
    clearError: clearSandboxError,
  };
}

// ============================================================
// HOOK: useSandboxItem (pour l'éditeur)
// ============================================================

interface UseSandboxItemReturn {
  item: SandboxItem | null;
  loading: boolean;
  error: Error | null;
  update: (input: SandboxItemUpdate) => Promise<SandboxItem | null>;
  addMessage: (role: 'user' | 'agent', text: string) => Promise<SandboxItem | null>;
  pin: () => Promise<SandboxItem | null>;
  remove: () => Promise<boolean>;
}

export function useSandboxItem(id: string | null): UseSandboxItemReturn {
  const sandboxItems = useAppStore((s) => s.sandboxItems);
  const pinSandboxItem = useAppStore((s) => s.pinSandboxItem);
  const deleteSandboxItem = useAppStore((s) => s.deleteSandboxItem);

  // Trouver l'item dans le store
  const item = id ? sandboxItems.find(i => i.id === id) || null : null;

  const update = useCallback(async (input: SandboxItemUpdate): Promise<SandboxItem | null> => {
    if (!id) return null;
    
    try {
      const { data, error } = await sandboxService.updateSandboxItem(id, input);
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('❌ Update error:', err);
      return null;
    }
  }, [id]);

  const addMessage = useCallback(async (role: 'user' | 'agent', text: string): Promise<SandboxItem | null> => {
    if (!id) return null;
    
    try {
      const { data, error } = await sandboxService.addMessageToSandbox(id, role, text);
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('❌ Add message error:', err);
      return null;
    }
  }, [id]);

  const pin = useCallback(async (): Promise<SandboxItem | null> => {
    if (!id) return null;
    return await pinSandboxItem(id);
  }, [id, pinSandboxItem]);

  const remove = useCallback(async (): Promise<boolean> => {
    if (!id) return false;
    return await deleteSandboxItem(id);
  }, [id, deleteSandboxItem]);

  return {
    item,
    loading: false,
    error: null,
    update,
    addMessage,
    pin,
    remove,
  };
}
