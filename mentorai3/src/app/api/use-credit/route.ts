import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { userId, creditType } = await request.json();

    // Supabase client'ı runtime'da oluştur
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    if (!userId || !creditType) {
      return NextResponse.json(
        { error: 'userId ve creditType gerekli' },
        { status: 400 }
      );
    }

    // Admin kontrolü - websimurg@gmail.com sınırsız erişim
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('email, role')
      .eq('id', userId)
      .single();

    const isAdmin = userProfile?.email === 'websimurg@gmail.com' || userProfile?.role === 'admin';

    if (isAdmin) {
      // Admin için kredi düşürme, sadece log
      await supabase
        .from('usage_logs')
        .insert({
          user_id: userId,
          usage_type: creditType,
          credits_used: 1,
          remaining_credits: -1 // Sınırsız
        });

      return NextResponse.json({
        success: true,
        remaining: -1,
        isUnlimited: true,
        isAdmin: true,
        message: `${creditType} kullanıldı (Admin - Sınırsız)`
      });
    }

    // Kullanıcının aboneliğini al
    let { data: subscription, error: fetchError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Eğer abonelik yoksa, otomatik oluştur
    if (fetchError || !subscription) {
      const subscriptionData = isAdmin ? {
        user_id: userId,
        plan_type: 'unlimited',
        status: 'active',
        message_credits: 999999,
        calorie_credits: 999999,
        is_unlimited: true,
        start_date: new Date().toISOString()
      } : {
        user_id: userId,
        plan_type: 'free',
        status: 'active',
        message_credits: 10,
        calorie_credits: 3,
        is_unlimited: false,
        start_date: new Date().toISOString()
      };

      const { data: newSubscription, error: createError } = await supabase
        .from('user_subscriptions')
        .insert(subscriptionData)
        .select()
        .single();

      if (createError || !newSubscription) {
        console.error('Subscription creation error:', createError);
        return NextResponse.json(
          { success: false, error: 'Abonelik oluşturulamadı' },
          { status: 500 }
        );
      }

      subscription = newSubscription;
    }

    // Unlimited paket için kredi düşürme
    if (subscription.is_unlimited) {
      // Kullanım logu oluştur (istatistikler için)
      await supabase
        .from('usage_logs')
        .insert({
          user_id: userId,
          usage_type: creditType,
          credits_used: 1,
          remaining_credits: -1 // sınırsız
        });

      return NextResponse.json({
        success: true,
        remaining: -1, // sınırsız
        isUnlimited: true,
        message: `${creditType} kullanıldı (Unlimited)`
      });
    }

    const fieldName = creditType === 'message' ? 'message_credits' : 'calorie_credits';
    const currentCredits = subscription[fieldName] || 0;

    if (currentCredits <= 0) {
      return NextResponse.json(
        { success: false, error: 'Yetersiz kredi', remaining: 0 },
        { status: 403 }
      );
    }

    // Krediyi azalt
    const newCredits = currentCredits - 1;
    const { error: updateError } = await supabase
      .from('user_subscriptions')
      .update({ [fieldName]: newCredits })
      .eq('user_id', userId);

    if (updateError) {
      return NextResponse.json(
        { success: false, error: 'Güncelleme hatası' },
        { status: 500 }
      );
    }

    // Kullanım kaydı oluştur
    await supabase
      .from('usage_logs')
      .insert({
        user_id: userId,
        usage_type: creditType,
        credits_used: 1,
        remaining_credits: newCredits
      });

    return NextResponse.json({
      success: true,
      remaining: newCredits,
      message: `${creditType} kredisi kullanıldı`
    });

  } catch (error) {
    console.error('Use credit error:', error);
    return NextResponse.json(
      { error: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}