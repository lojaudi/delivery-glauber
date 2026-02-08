import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminRestaurant } from './useAdminRestaurant';
import { useParams } from 'react-router-dom';

export interface AddonGroup {
  id: string;
  name: string;
  title: string;
  subtitle: string | null;
  is_required: boolean;
  max_selections: number;
  sort_order: number;
  restaurant_id?: string | null;
}

export interface AddonOption {
  id: string;
  group_id: string;
  name: string;
  price: number;
  is_available: boolean;
  sort_order: number;
}

export interface ProductAddonGroup {
  id: string;
  product_id: string;
  addon_group_id: string;
}

// ============================================
// ADDON GROUPS
// ============================================

export function useAddonGroups() {
  const { restaurantId } = useAdminRestaurant();

  return useQuery({
    queryKey: ['addon-groups', restaurantId],
    queryFn: async () => {
      if (!restaurantId) {
        return [];
      }

      const { data, error } = await supabase
        .from('addon_groups')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('sort_order');

      if (error) throw error;
      return data as AddonGroup[];
    },
    enabled: !!restaurantId,
  });
}

export function useCreateAddonGroup() {
  const queryClient = useQueryClient();
  const { restaurantId } = useAdminRestaurant();
  
  return useMutation({
    mutationFn: async (group: Omit<AddonGroup, 'id'>) => {
      const { data, error } = await supabase
        .from('addon_groups')
        .insert({ ...group, restaurant_id: restaurantId })
        .select()
        .single();

      if (error) throw error;
      return data as AddonGroup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addon-groups'] });
    },
  });
}

export function useUpdateAddonGroup() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...update }: Partial<AddonGroup> & { id: string }) => {
      const { data, error } = await supabase
        .from('addon_groups')
        .update(update)
        .eq('id', id)
        .select();

      if (error) throw error;
      return data?.[0] as AddonGroup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addon-groups'] });
    },
  });
}

export function useDeleteAddonGroup() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      // Delete options first
      const { error: optionsError } = await supabase
        .from('addon_options')
        .delete()
        .eq('group_id', id);

      if (optionsError) throw optionsError;

      const { error } = await supabase
        .from('addon_groups')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addon-groups'] });
      queryClient.invalidateQueries({ queryKey: ['addon-options'] });
    },
  });
}

export function useReorderAddonGroups() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) => ({
        id,
        sort_order: index + 1,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('addon_groups')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addon-groups'] });
    },
  });
}

export function useDuplicateAddonGroup() {
  const queryClient = useQueryClient();
  const { restaurantId } = useAdminRestaurant();
  
  return useMutation({
    mutationFn: async (groupId: string) => {
      // Fetch the original group
      const { data: originalGroup, error: groupError } = await supabase
        .from('addon_groups')
        .select('*')
        .eq('id', groupId)
        .single();

      if (groupError) throw groupError;

      // Fetch original options
      const { data: originalOptions, error: optionsError } = await supabase
        .from('addon_options')
        .select('*')
        .eq('group_id', groupId)
        .order('sort_order');

      if (optionsError) throw optionsError;

      // Get max sort_order for new group
      const { data: allGroups } = await supabase
        .from('addon_groups')
        .select('sort_order')
        .eq('restaurant_id', restaurantId)
        .order('sort_order', { ascending: false })
        .limit(1);

      const maxSortOrder = allGroups?.[0]?.sort_order || 0;

      // Create new group with "(Cópia)" suffix
      const { data: newGroup, error: createError } = await supabase
        .from('addon_groups')
        .insert({
          name: `${originalGroup.name} (Cópia)`,
          title: originalGroup.title,
          subtitle: originalGroup.subtitle,
          is_required: originalGroup.is_required,
          max_selections: originalGroup.max_selections,
          sort_order: maxSortOrder + 1,
          restaurant_id: restaurantId,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Duplicate all options
      if (originalOptions && originalOptions.length > 0) {
        const newOptions = originalOptions.map((opt, index) => ({
          group_id: newGroup.id,
          name: opt.name,
          price: opt.price,
          is_available: opt.is_available,
          sort_order: index + 1,
        }));

        const { error: optionsCreateError } = await supabase
          .from('addon_options')
          .insert(newOptions);

        if (optionsCreateError) throw optionsCreateError;
      }

      return newGroup as AddonGroup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addon-groups'] });
      queryClient.invalidateQueries({ queryKey: ['addon-options'] });
    },
  });
}

// ============================================
// ADDON OPTIONS
// ============================================

export function useAddonOptions(groupId?: string) {
  const { restaurantId } = useAdminRestaurant();

  return useQuery({
    queryKey: ['addon-options', groupId, restaurantId],
    queryFn: async () => {
      // If groupId is provided, fetch options for that group
      if (groupId) {
        const { data, error } = await supabase
          .from('addon_options')
          .select('*')
          .eq('group_id', groupId)
          .order('sort_order');

        if (error) throw error;
        return data as AddonOption[];
      }
      
      // If no groupId, fetch options only for groups belonging to current restaurant
      if (!restaurantId) return [];
      
      // First get all group IDs for this restaurant
      const { data: groups, error: groupsError } = await supabase
        .from('addon_groups')
        .select('id')
        .eq('restaurant_id', restaurantId);
      
      if (groupsError) throw groupsError;
      
      const groupIds = groups.map(g => g.id);
      if (groupIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('addon_options')
        .select('*')
        .in('group_id', groupIds)
        .order('sort_order');

      if (error) throw error;
      return data as AddonOption[];
    },
    enabled: !!groupId || !!restaurantId,
  });
}

export function useCreateAddonOption() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (option: Omit<AddonOption, 'id'>) => {
      const { data, error } = await supabase
        .from('addon_options')
        .insert(option)
        .select()
        .single();

      if (error) throw error;
      return data as AddonOption;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addon-options'] });
    },
  });
}

export function useUpdateAddonOption() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...update }: Partial<AddonOption> & { id: string }) => {
      const { data, error } = await supabase
        .from('addon_options')
        .update(update)
        .eq('id', id)
        .select();

      if (error) throw error;
      return data?.[0] as AddonOption;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addon-options'] });
    },
  });
}

export function useDeleteAddonOption() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('addon_options')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addon-options'] });
    },
  });
}

// ============================================
// PRODUCT ADDON GROUPS (relação produto <-> grupo)
// ============================================

export function useProductAddonGroups(productId?: string) {
  return useQuery({
    queryKey: ['product-addon-groups', productId],
    queryFn: async () => {
      if (!productId) return [];

      const { data, error } = await supabase
        .from('product_addon_groups')
        .select(`
          *,
          addon_group:addon_groups(*)
        `)
        .eq('product_id', productId);

      if (error) throw error;
      return data as (ProductAddonGroup & { addon_group: AddonGroup })[];
    },
    enabled: !!productId,
  });
}

export function useAddProductAddonGroup() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ product_id, addon_group_id }: { product_id: string; addon_group_id: string }) => {
      const { data, error } = await supabase
        .from('product_addon_groups')
        .insert({ product_id, addon_group_id })
        .select()
        .single();

      if (error) throw error;
      return data as ProductAddonGroup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-addon-groups'] });
    },
  });
}

export function useRemoveProductAddonGroup() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ product_id, addon_group_id }: { product_id: string; addon_group_id: string }) => {
      const { error } = await supabase
        .from('product_addon_groups')
        .delete()
        .eq('product_id', product_id)
        .eq('addon_group_id', addon_group_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-addon-groups'] });
    },
  });
}

// Hook para buscar todos os acréscimos de um produto (grupos + opções)
export function useProductAddons(productId: string) {
  const { slug } = useParams<{ slug: string }>();

  return useQuery({
    queryKey: ['product-addons', productId],
    queryFn: async () => {
      // Get product addon groups
      const { data: productGroups, error: pgError } = await supabase
        .from('product_addon_groups')
        .select('addon_group_id')
        .eq('product_id', productId);

      if (pgError) throw pgError;

      const groupIds = productGroups.map(pg => pg.addon_group_id);

      if (groupIds.length === 0) return [];

      // Get addon groups
      const { data: groups, error: groupsError } = await supabase
        .from('addon_groups')
        .select('*')
        .in('id', groupIds)
        .order('sort_order');

      if (groupsError) throw groupsError;

      // Get options for these groups
      const { data: options, error: optionsError } = await supabase
        .from('addon_options')
        .select('*')
        .in('group_id', groupIds)
        .eq('is_available', true)
        .order('sort_order');

      if (optionsError) throw optionsError;

      return groups.map(group => ({
        ...group,
        options: options.filter(opt => opt.group_id === group.id),
      }));
    },
    enabled: !!productId,
  });
}
