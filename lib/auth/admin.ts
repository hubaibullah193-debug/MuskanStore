import { SupabaseClient } from '@supabase/supabase-js';

export async function isAdmin(supabase: SupabaseClient): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  // Check if user has admin record
  const { data: adminRecord } = await supabase
    .from('admin_audit_logs')
    .select('user_id')
    .eq('user_id', user.id)
    .limit(1)
    .single();

  return !!adminRecord;
}
