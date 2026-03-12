import { supabase } from './supabaseClient';

export interface ProductionLog {
  id: string;
  test_record_id: string;
  analyst: string;
  old_status: string;
  new_status: string;
  created_at: string;
}

export const fetchProductionLogs = async (analyst?: string): Promise<ProductionLog[]> => {
  let query = supabase
    .from('analyst_production_logs')
    .select('*')
    .order('created_at', { ascending: false });

  if (analyst) {
    query = query.eq('analyst', analyst);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching production logs:', error);
    return [];
  }

  return data || [];
};
