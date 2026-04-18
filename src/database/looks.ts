import { supabase } from '../lib/supabase';
import { ClothingItem } from './clothes';

export interface Look {
  id: number;
  name: string;
  created_at: string;
}

export interface LookWithItems extends Look {
  items: ClothingItem[];
}

export async function getAllLooks(): Promise<LookWithItems[]> {
  const { data: looks, error } = await supabase
    .from('looks')
    .select('id, name, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;

  const result: LookWithItems[] = [];

  for (const look of looks || []) {
    const { data: liData } = await supabase
      .from('look_items')
      .select('clothing_id, clothes(id, title, image_path, created_at)')
      .eq('look_id', look.id);

    const items: ClothingItem[] = (liData || []).map((row: any) => ({
      ...row.clothes,
      use_count: 0,
    }));

    result.push({ ...look, items });
  }

  return result;
}

export async function createLook(name: string, clothingIds: number[]): Promise<number> {
  const { data, error } = await supabase
    .from('looks')
    .insert({ name: name.trim() })
    .select('id')
    .single();
  if (error) throw error;

  const lookId = data.id;

  const rows = clothingIds.map(cid => ({
    look_id: lookId,
    clothing_id: cid,
  }));
  const { error: relError } = await supabase
    .from('look_items')
    .insert(rows);
  if (relError) throw relError;

  return lookId;
}

export async function deleteLook(id: number): Promise<void> {
  const { error } = await supabase
    .from('looks')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
