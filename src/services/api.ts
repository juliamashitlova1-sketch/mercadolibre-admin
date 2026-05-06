import { supabase } from '../lib/supabase';

export async function apiCall<T>(promise: any): Promise<T> {
  const { data, error } = await promise;
  if (error) {
    console.error('API Error:', error);
    throw new Error(error.message || 'Unknown API error');
  }
  return data as T;
}

export const supabaseService = {
  from: (table: string) => supabase.from(table),

  select: async <T>(table: string, columns = '*', options?: {
    filters?: Record<string, any>;
    order?: { column: string; ascending: boolean };
    limit?: number;
  }): Promise<T[]> => {
    let query = supabase.from(table).select(columns);

    if (options?.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }
    if (options?.order) {
      query = query.order(options.order.column, { ascending: options.order.ascending });
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    return apiCall<T[]>(query);
  },

  insert: async (table: string, data: any): Promise<any> => {
    return apiCall(supabase.from(table).insert(data).select());
  },

  update: async (table: string, data: any, match: Record<string, any>): Promise<any> => {
    let query = supabase.from(table).update(data);
    Object.entries(match).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
    return apiCall(query.select());
  },

  delete: async (table: string, match: Record<string, any>): Promise<null> => {
    let query = supabase.from(table).delete();
    Object.entries(match).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
    return apiCall<null>(query);
  },

  upsert: async (table: string, data: any, onConflict: string): Promise<any> => {
    return apiCall(supabase.from(table).upsert(data, { onConflict }).select());
  },

  subscribe: (table: string, callback: () => void) => {
    const channel = supabase.channel(`${table}-changes-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => callback())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }
};
