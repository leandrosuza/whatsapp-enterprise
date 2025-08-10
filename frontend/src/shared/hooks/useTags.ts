import { useState, useEffect, useCallback } from 'react';

interface Tag {
  id: number;
  name: string;
  color?: string;
  description?: string;
  isActive: boolean;
  usageCount: number;
  createdAt: string;
}

interface UseTagsReturn {
  tags: Tag[];
  loading: boolean;
  error: string | null;
  createTag: (name: string, color?: string, description?: string) => Promise<boolean>;
  deleteTag: (id: number) => Promise<boolean>;
  updateTag: (id: number, data: Partial<Tag>) => Promise<boolean>;
  refreshTags: () => Promise<void>;
}

export const useTags = (): UseTagsReturn => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTags = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/tags');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        setTags(data.data || []);
      } else {
        throw new Error(data.message || 'Erro ao carregar tags');
      }
    } catch (err) {
      console.error('Error fetching tags:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, []);

  const createTag = useCallback(async (name: string, color?: string, description?: string): Promise<boolean> => {
    try {
      setError(null);
      
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          color: color || '#3B82F6',
          description: description?.trim()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao criar tag');
      }

      const data = await response.json();
      if (data.success) {
        // Refresh tags list
        await fetchTags();
        return true;
      } else {
        throw new Error(data.message || 'Erro ao criar tag');
      }
    } catch (err) {
      console.error('Error creating tag:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      return false;
    }
  }, [fetchTags]);

  const deleteTag = useCallback(async (id: number): Promise<boolean> => {
    try {
      setError(null);
      
      const response = await fetch(`/api/tags/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao excluir tag');
      }

      const data = await response.json();
      if (data.success) {
        // Remove tag from local state
        setTags(prevTags => prevTags.filter(tag => tag.id !== id));
        return true;
      } else {
        throw new Error(data.message || 'Erro ao excluir tag');
      }
    } catch (err) {
      console.error('Error deleting tag:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      return false;
    }
  }, []);

  const updateTag = useCallback(async (id: number, data: Partial<Tag>): Promise<boolean> => {
    try {
      setError(null);
      
      const response = await fetch(`/api/tags/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao atualizar tag');
      }

      const responseData = await response.json();
      if (responseData.success) {
        // Update tag in local state
        setTags(prevTags => 
          prevTags.map(tag => 
            tag.id === id ? { ...tag, ...responseData.data } : tag
          )
        );
        return true;
      } else {
        throw new Error(responseData.message || 'Erro ao atualizar tag');
      }
    } catch (err) {
      console.error('Error updating tag:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      return false;
    }
  }, []);

  const refreshTags = useCallback(async () => {
    await fetchTags();
  }, [fetchTags]);

  // Load tags on mount
  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  return {
    tags,
    loading,
    error,
    createTag,
    deleteTag,
    updateTag,
    refreshTags,
  };
};
