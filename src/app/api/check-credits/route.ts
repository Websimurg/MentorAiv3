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
      return NextResponse.json({
        hasCredit: true,
        remaining: -1, // Sınırsız
        planType: 'admin',
        status: 'active',
        isUnlimited: true,
        isAdmin: true
      });
    }

    // Kullanıcının aboneliğini kontrol et
    let { data: subscription, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Eğer abonelik yoksa, otomatik oluştur (ilk kullanım)
    if (error || !subscription) {
      const { data: newSubscription, error: createError } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: userId,
          plan_type: 'free',
          status: 'active',
          message_credits: 10,
          calorie_credits: 3,
          is_unlimited: false,
          start_date: new Date().toISOString()
        })
        .select()
        .single();

      if (createError || !newSubscription) {
        return NextResponse.json(
          { hasCredit: false, remaining: 0, error: 'Abonelik oluşturulamadı' },
          { status: 500 }
        );
      }

      subscription = newSubscription;
    }

    // Unlimited paket kontrolü
    if (subscription.is_unlimited) {
      return NextResponse.json({
        hasCredit: true,
        remaining: -1, // -1 = sınırsız
        planType: subscription.plan_type,
        status: subscription.status,
        isUnlimited: true
      });
    }

    const fieldName = creditType === 'message' ? 'message_credits' : 'calorie_credits';
    const remainingCredits = subscription[fieldName] || 0;

    return NextResponse.json({
      hasCredit: remainingCredits > 0,
      remaining: remainingCredits,
      planType: subscription.plan_type,
      status: subscription.status,
      isUnlimited: false
    });

  } catch (error) {
    console.error('Credit check error:', error);
    return NextResponse.json(
      { error: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}
