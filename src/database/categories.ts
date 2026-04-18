import { supabase } from '../lib/supabase';

export interface Category {
  id: number;
  name: string;
}

export async function getAllCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name')
    .order('name');
  if (error) throw error;
  return data as Category[];
}

export async function createCategory(name: string): Promise<number> {
  const { data, error } = await supabase
    .from('categories')
    .insert({ name: name.trim() })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function deleteCategory(id: number): Promise<void> {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
