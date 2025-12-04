// ============================================================
// ARPET - Hook useSandbox
// Version: 1.0.0
// Date: 2025-12-04
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import type { 
  SandboxItem, 
  SandboxItemCreate,
  SandboxItemUpdate,
  SandboxDraftCard,
  WorkspaceWidget 
} from '@/types/sandbox.types';
import { toSandboxDraftCard, toWorkspaceWidget } from '@/types/sandbox.types';
import * as sandboxService from '@/services/sandbox.service';

// ============================================================
// HOOK: useSandboxItems
// ============================================================

interface UseSandboxItemsReturn {
  // Data
  items: SandboxItem[];
  drafts: SandboxDraftCard[];
  widgets: WorkspaceWidget[];
  
  // State
  loading: boolean;
  error: Error | null;
  
  // Actions
  refresh: () => Promise<void>;
  create: (input: SandboxItemCreate) => Promise<SandboxItem | null>;
  update: (id: string, input: SandboxItemUpdate) => Promise<SandboxItem | null>;
  remove: (id: string) => Promise<boolean>;
  pin: (id: string) => Promise<SandboxItem | null>;
  unpin: (id: string) => Promise<SandboxItem | null>;
  archive: (id: string) => Promise<SandboxItem | null>;
}

export function useSandboxItems(): UseSandboxItemsReturn {
  const [items, setItems] = useState<SandboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch all items
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    const { data, error: fetchError } = await sandboxService.getSandboxItems();
    
    if (fetchError) {
      setError(fetchError);
    } else {
      setItems(data || []);
    }
    
    setLoading(false);
  }, []);

  // Initial fetch
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Derived data
  const drafts: SandboxDraftCard[] = items
    .filter(item => item.status === 'draft')
    .map(toSandboxDraftCard);
  
  const widgets: WorkspaceWidget[] = items
    .filter(item => item.status === 'pinned')
    .map(toWorkspaceWidget);

  // Actions
  const create = useCallback(async (input: SandboxItemCreate) => {
    const { data, error: createError } = await sandboxService.createSandboxItem(input);
    
    if (createError) {
      setError(createError);
      return null;
    }
    
    if (data) {
      setItems(prev => [data, ...prev]);
    }
    
    return data;
  }, []);

  const update = useCallback(async (id: string, input: SandboxItemUpdate) => {
    const { data, error: updateError } = await sandboxService.updateSandboxItem(id, input);
    
    if (updateError) {
      setError(updateError);
      return null;
    }
    
    if (data) {
      setItems(prev => prev.map(item => item.id === id ? data : item));
    }
    
    return data;
  }, []);

  const remove = useCallback(async (id: string) => {
    const { data, error: deleteError } = await sandboxService.deleteSandboxItem(id);
    
    if (deleteError) {
      setError(deleteError);
      return false;
    }
    
    if (data) {
      setItems(prev => prev.filter(item => item.id !== id));
    }
    
    return data || false;
  }, []);

  const pin = useCallback(async (id: string) => {
    const { data, error: pinError } = await sandboxService.pinSandboxItem(id);
    
    if (pinError) {
      setError(pinError);
      return null;
    }
    
    if (data) {
      setItems(prev => prev.map(item => item.id === id ? data : item));
    }
    
    return data;
  }, []);

  const unpin = useCallback(async (id: string) => {
    const { data, error: unpinError } = await sandboxService.unpinSandboxItem(id);
    
    if (unpinError) {
      setError(unpinError);
      return null;
    }
    
    if (data) {
      setItems(prev => prev.map(item => item.id === id ? data : item));
    }
    
    return data;
  }, []);

  const archive = useCallback(async (id: string) => {
    const { data, error: archiveError } = await sandboxService.archiveSandboxItem(id);
    
    if (archiveError) {
      setError(archiveError);
      return null;
    }
    
    if (data) {
      setItems(prev => prev.map(item => item.id === id ? data : item));
    }
    
    return data;
  }, []);

  return {
    items,
    drafts,
    widgets,
    loading,
    error,
    refresh,
    create,
    update,
    remove,
    pin,
    unpin,
    archive,
  };
}

// ============================================================
// HOOK: useSandboxItem (single item)
// ============================================================

interface UseSandboxItemReturn {
  item: SandboxItem | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  update: (input: SandboxItemUpdate) => Promise<SandboxItem | null>;
  addMessage: (role: 'user' | 'agent', text: string) => Promise<SandboxItem | null>;
  updateResult: (
    resultType: 'table' | 'chart' | 'number' | 'text',
    resultData: unknown
  ) => Promise<SandboxItem | null>;
  pin: () => Promise<SandboxItem | null>;
  unpin: () => Promise<SandboxItem | null>;
  archive: () => Promise<SandboxItem | null>;
  remove: () => Promise<boolean>;
}

export function useSandboxItem(id: string | null): UseSandboxItemReturn {
  const [item, setItem] = useState<SandboxItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!id) {
      setItem(null);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    const { data, error: fetchError } = await sandboxService.getSandboxItemById(id);
    
    if (fetchError) {
      setError(fetchError);
    } else {
      setItem(data);
    }
    
    setLoading(false);
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const update = useCallback(async (input: SandboxItemUpdate) => {
    if (!id) return null;
    
    const { data, error: updateError } = await sandboxService.updateSandboxItem(id, input);
    
    if (updateError) {
      setError(updateError);
      return null;
    }
    
    if (data) {
      setItem(data);
    }
    
    return data;
  }, [id]);

  const addMessage = useCallback(async (role: 'user' | 'agent', text: string) => {
    if (!id) return null;
    
    const { data, error: msgError } = await sandboxService.addMessageToSandbox(id, role, text);
    
    if (msgError) {
      setError(msgError);
      return null;
    }
    
    if (data) {
      setItem(data);
    }
    
    return data;
  }, [id]);

  const updateResult = useCallback(async (
    resultType: 'table' | 'chart' | 'number' | 'text',
    resultData: unknown
  ) => {
    if (!id) return null;
    
    const { data, error: resultError } = await sandboxService.updateSandboxResult(
      id, 
      resultType, 
      resultData
    );
    
    if (resultError) {
      setError(resultError);
      return null;
    }
    
    if (data) {
      setItem(data);
    }
    
    return data;
  }, [id]);

  const pin = useCallback(async () => {
    if (!id) return null;
    
    const { data, error: pinError } = await sandboxService.pinSandboxItem(id);
    
    if (pinError) {
      setError(pinError);
      return null;
    }
    
    if (data) {
      setItem(data);
    }
    
    return data;
  }, [id]);

  const unpin = useCallback(async () => {
    if (!id) return null;
    
    const { data, error: unpinError } = await sandboxService.unpinSandboxItem(id);
    
    if (unpinError) {
      setError(unpinError);
      return null;
    }
    
    if (data) {
      setItem(data);
    }
    
    return data;
  }, [id]);

  const archive = useCallback(async () => {
    if (!id) return null;
    
    const { data, error: archiveError } = await sandboxService.archiveSandboxItem(id);
    
    if (archiveError) {
      setError(archiveError);
      return null;
    }
    
    if (data) {
      setItem(data);
    }
    
    return data;
  }, [id]);

  const remove = useCallback(async () => {
    if (!id) return false;
    
    const { data, error: deleteError } = await sandboxService.deleteSandboxItem(id);
    
    if (deleteError) {
      setError(deleteError);
      return false;
    }
    
    if (data) {
      setItem(null);
    }
    
    return data || false;
  }, [id]);

  return {
    item,
    loading,
    error,
    refresh,
    update,
    addMessage,
    updateResult,
    pin,
    unpin,
    archive,
    remove,
  };
}
