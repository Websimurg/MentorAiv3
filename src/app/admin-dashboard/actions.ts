'use server';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';

export async function getAdminData() {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return { error: 'Service Role Key eksik! .env.local dosyasını kontrol edin.' };
    }

    try {
        const [profilesRes, subsRes, coursesRes] = await Promise.all([
            supabaseAdmin.from('profiles').select('*').order('created_at', { ascending: false }),
            supabaseAdmin.from('user_subscriptions').select('*'),
            supabaseAdmin.from('courses').select('*').order('created_at', { ascending: false })
        ]);

        if (profilesRes.error) throw profilesRes.error;
        if (subsRes.error) throw subsRes.error;
        if (coursesRes.error) throw coursesRes.error;

        const profiles = profilesRes.data || [];
        const subscriptions = subsRes.data || [];
        const courses = coursesRes.data || [];

        // Fetch all users from Auth API to get emails
        // Note: listUsers defaults to 50 users per page. For production, you'd need pagination.
        const { data: { users: authUsers }, error: authError } = await supabaseAdmin.auth.admin.listUsers({
            page: 1,
            perPage: 1000
        });

        if (authError) throw authError;

        const authUserMap = new Map(authUsers.map(u => [u.id, u]));
        const subscriptionMap = new Map(subscriptions.map(s => [s.user_id, s]));

        const formattedUsers = profiles.map(profile => {
            const authUser = authUserMap.get(profile.id);
            const subscription = subscriptionMap.get(profile.id);
            const isPremium = subscription?.plan_type !== 'free' || subscription?.is_unlimited || false;

            return {
                id: profile.id,
                name: profile.name || authUser?.user_metadata?.full_name || 'Kullanıcı',
                email: authUser?.email || 'Email yok',
                joinDate: profile.created_at,
                lastActive: authUser?.last_sign_in_at || profile.created_at,
                isPremium,
                isAdmin: profile.role === 'admin'
            };
        });

        return {
            users: formattedUsers,
            courses,
            stats: {
                totalUsers: formattedUsers.length,
                premiumUsers: formattedUsers.filter(u => u.isPremium).length,
                totalCourses: courses.length,
                totalRevenue: formattedUsers.filter(u => u.isPremium).length * 99 // Tahmini
            }
        };

    } catch (error: any) {
        console.error('Admin data fetch error:', error);
        return { error: error.message };
    }
}

export async function toggleUserAdmin(userId: string, currentStatus: boolean) {
    try {
        const { error } = await supabaseAdmin
            .from('profiles')
            .update({ role: currentStatus ? 'user' : 'admin' })
            .eq('id', userId);

        if (error) throw error;
        revalidatePath('/admin-dashboard');
        return { success: true };
    } catch (error: any) {
        return { error: error.message };
    }
}

export async function deleteUser(userId: string) {
    try {
        // 1. Delete from Auth (this triggers cascade if set up, but we'll be safe)
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (authError) throw authError;

        // 2. Delete profile (if not cascaded)
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .delete()
            .eq('id', userId);

        // Ignore profile error if it's "row not found" (already deleted by cascade)

        revalidatePath('/admin-dashboard');
        return { success: true };
    } catch (error: any) {
        return { error: error.message };
    }
}

export async function updateUser(userId: string, data: { name: string; isPremium: boolean; isAdmin: boolean }) {
    try {
        const { error } = await supabaseAdmin
            .from('profiles')
            .update({
                name: data.name,
                is_premium: data.isPremium,
                role: data.isAdmin ? 'admin' : 'user'
            })
            .eq('id', userId);

        if (error) throw error;
        revalidatePath('/admin-dashboard');
        return { success: true };
    } catch (error: any) {
        return { error: error.message };
    }
}
