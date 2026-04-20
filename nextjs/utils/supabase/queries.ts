import { SupabaseClient } from '@supabase/supabase-js';
import { cache } from 'react';

export const getUser = cache(async (supabase: SupabaseClient) => {
  const {
    data: { user }
  } = await supabase.auth.getUser();
  return user;
});

export const getSubscription = cache(async (supabase: SupabaseClient) => {
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*, prices(*, products(*))')
    .in('status', ['trialing', 'active'])
    .order('created', { ascending: false })
    .limit(1)
    .maybeSingle();

  return subscription;
});

export const getProducts = cache(async (supabase: SupabaseClient) => {
  const { data: products } = await supabase
    .from('products')
    .select('*, prices(*)')
    .eq('active', true)
    .eq('prices.active', true)
    .order('metadata->index')
    .order('unit_amount', { referencedTable: 'prices' });

  return products;
});

export const getUserDetails = cache(async (supabase: SupabaseClient) => {
  const { data: userDetails } = await supabase
    .from('profiles')
    .select('*')
    .single();
  return userDetails;
});

export const getDashboardStats = cache(async (supabase: SupabaseClient) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [
    { count: pendingCount },
    { count: rejectedCount },
    { count: completedCount },
    { count: archivedCount }
  ] = await Promise.all([
    supabase.from('documents').select('*', { count: 'exact', head: true }).eq('status', 'pending').eq('creator_id', user.id),
    supabase.from('documents').select('*', { count: 'exact', head: true }).eq('status', 'paused').eq('creator_id', user.id),
    supabase.from('documents').select('*', { count: 'exact', head: true }).eq('status', 'completed').eq('creator_id', user.id),
    supabase.from('documents').select('*', { count: 'exact', head: true }).eq('is_archived', true).eq('creator_id', user.id)
  ]);

  return {
    pending: pendingCount || 0,
    rejected: rejectedCount || 0,
    completed: completedCount || 0,
    archived: archivedCount || 0
  };
});

export const getRecentDocuments = cache(async (supabase: SupabaseClient) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: documents } = await supabase
    .from('documents')
    .select('*, profiles:creator_id(full_name)')
    .eq('creator_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5);

  return documents || [];
});
