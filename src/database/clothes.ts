import { supabase, STORAGE_BUCKET } from '../lib/supabase';

export interface ClothingItem {
  id: number;
  title: string;
  image_path: string;
  created_at: string;
  use_count: number;
}

export interface ClothingDetail extends ClothingItem {
  categories: { id: number; name: string }[];
}

export async function uploadClothingImage(uri: string): Promise<string> {
  const filename = `clothing_${Date.now()}.jpg`;

  const response = await fetch(uri);
  const blob = await response.blob();

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filename, blob, { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;

  const { data } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(filename);

  return data.publicUrl;
}

export async function addClothing(
  title: string,
  imagePath: string,
  categoryIds: number[]
): Promise<number> {
  const { data, error } = await supabase
    .from('clothes')
    .insert({ title: title.trim(), image_path: imagePath })
    .select('id')
    .single();
  if (error) throw error;

  const clothingId = data.id;

  if (categoryIds.length > 0) {
    const rows = categoryIds.map(catId => ({
      clothing_id: clothingId,
      category_id: catId,
    }));
    const { error: relError } = await supabase
      .from('clothes_categories')
      .insert(rows);
    if (relError) throw relError;
  }

  return clothingId;
}

export async function deleteClothing(id: number): Promise<void> {
  const { error } = await supabase
    .from('clothes')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

async function fetchUseCounts(): Promise<Map<number, number>> {
  const { data, error } = await supabase
    .from('usage_log')
    .select('clothing_id');
  if (error) throw error;

  const counts = new Map<number, number>();
  for (const row of data) {
    counts.set(row.clothing_id, (counts.get(row.clothing_id) || 0) + 1);
  }
  return counts;
}

export async function getClothingPaginated(
  page: number,
  categoryIds: number[] = [],
  pageSize: number = 100
): Promise<ClothingItem[]> {
  const offset = (page - 1) * pageSize;

  let clothingIds: number[] | null = null;

  if (categoryIds.length > 0) {
    const { data: ccData, error: ccError } = await supabase
      .from('clothes_categories')
      .select('clothing_id')
      .in('category_id', categoryIds);
    if (ccError) throw ccError;

    // AND logic: only items that have ALL selected categories
    const countMap = new Map<number, number>();
    for (const row of ccData) {
      countMap.set(row.clothing_id, (countMap.get(row.clothing_id) || 0) + 1);
    }
    clothingIds = [];
    for (const [cid, cnt] of countMap) {
      if (cnt >= categoryIds.length) clothingIds.push(cid);
    }
    if (clothingIds.length === 0) return [];
  }

  let query = supabase
    .from('clothes')
    .select('id, title, image_path, created_at');

  if (clothingIds) {
    query = query.in('id', clothingIds);
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);
  if (error) throw error;

  const useCounts = await fetchUseCounts();

  const items: ClothingItem[] = (data || []).map(row => ({
    ...row,
    use_count: useCounts.get(row.id) || 0,
  }));

  // Sort by use_count DESC, then created_at DESC
  items.sort((a, b) => {
    if (b.use_count !== a.use_count) return b.use_count - a.use_count;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return items;
}

export async function getTotalPages(
  categoryIds: number[] = [],
  pageSize: number = 100
): Promise<number> {
  let total: number;

  if (categoryIds.length === 0) {
    const { count, error } = await supabase
      .from('clothes')
      .select('id', { count: 'exact', head: true });
    if (error) throw error;
    total = count || 0;
  } else {
    const { data, error } = await supabase
      .from('clothes_categories')
      .select('clothing_id')
      .in('category_id', categoryIds);
    if (error) throw error;

    const countMap = new Map<number, number>();
    for (const row of data) {
      countMap.set(row.clothing_id, (countMap.get(row.clothing_id) || 0) + 1);
    }
    let matching = 0;
    for (const cnt of countMap.values()) {
      if (cnt >= categoryIds.length) matching++;
    }
    total = matching;
  }

  return Math.max(1, Math.ceil(total / pageSize));
}

export async function searchClothes(
  titleQuery: string,
  categoryIds: number[]
): Promise<ClothingItem[]> {
  if (!titleQuery && categoryIds.length === 0) {
    return getClothingPaginated(1, [], 200);
  }

  let clothingIds: number[] | null = null;

  if (categoryIds.length > 0) {
    const { data: ccData, error: ccError } = await supabase
      .from('clothes_categories')
      .select('clothing_id')
      .in('category_id', categoryIds);
    if (ccError) throw ccError;

    const countMap = new Map<number, number>();
    for (const row of ccData) {
      countMap.set(row.clothing_id, (countMap.get(row.clothing_id) || 0) + 1);
    }
    clothingIds = [];
    for (const [cid, cnt] of countMap) {
      if (cnt >= categoryIds.length) clothingIds.push(cid);
    }
    if (clothingIds.length === 0) return [];
  }

  let query = supabase
    .from('clothes')
    .select('id, title, image_path, created_at');

  if (titleQuery) {
    query = query.ilike('title', `%${titleQuery}%`);
  }
  if (clothingIds) {
    query = query.in('id', clothingIds);
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;

  const useCounts = await fetchUseCounts();

  const items: ClothingItem[] = (data || []).map(row => ({
    ...row,
    use_count: useCounts.get(row.id) || 0,
  }));

  items.sort((a, b) => {
    if (b.use_count !== a.use_count) return b.use_count - a.use_count;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return items;
}

export async function getClothingDetail(id: number): Promise<ClothingDetail | null> {
  const { data: item, error } = await supabase
    .from('clothes')
    .select('id, title, image_path, created_at')
    .eq('id', id)
    .single();
  if (error || !item) return null;

  const { data: usageData } = await supabase
    .from('usage_log')
    .select('id')
    .eq('clothing_id', id);

  const { data: catData } = await supabase
    .from('clothes_categories')
    .select('category_id, categories(id, name)')
    .eq('clothing_id', id);

  const categories = (catData || []).map((row: any) => ({
    id: row.categories.id,
    name: row.categories.name,
  }));
  categories.sort((a: any, b: any) => a.name.localeCompare(b.name));

  return {
    ...item,
    use_count: usageData?.length || 0,
    categories,
  };
}

export async function registerUse(clothingId: number): Promise<void> {
  const { error } = await supabase
    .from('usage_log')
    .insert({ clothing_id: clothingId });
  if (error) throw error;
}

export async function decrementUse(clothingId: number): Promise<void> {
  // Find the most recent usage log entry
  const { data, error: fetchError } = await supabase
    .from('usage_log')
    .select('id')
    .eq('clothing_id', clothingId)
    .order('used_at', { ascending: false })
    .limit(1);
  if (fetchError) throw fetchError;
  if (!data || data.length === 0) return;

  const { error } = await supabase
    .from('usage_log')
    .delete()
    .eq('id', data[0].id);
  if (error) throw error;
}

export async function getRelatedClothesByLooks(clothingId: number): Promise<ClothingItem[]> {
  // Get all looks that contain this clothing
  const { data: myLooks, error: lookError } = await supabase
    .from('look_items')
    .select('look_id')
    .eq('clothing_id', clothingId);
  if (lookError) throw lookError;
  if (!myLooks || myLooks.length === 0) return [];

  const lookIds = myLooks.map(l => l.look_id);

  // Get all clothing from those looks
  const { data: relatedItems, error: relError } = await supabase
    .from('look_items')
    .select('clothing_id')
    .in('look_id', lookIds)
    .neq('clothing_id', clothingId);
  if (relError) throw relError;

  const uniqueIds = [...new Set((relatedItems || []).map(r => r.clothing_id))];
  if (uniqueIds.length === 0) return [];

  const { data: clothes, error: clothesError } = await supabase
    .from('clothes')
    .select('id, title, image_path, created_at')
    .in('id', uniqueIds)
    .order('title');
  if (clothesError) throw clothesError;

  const useCounts = await fetchUseCounts();

  return (clothes || []).map(row => ({
    ...row,
    use_count: useCounts.get(row.id) || 0,
  }));
}
