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

    // Kullanıcının aboneliğini kontrol et
    const { data: subscription, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !subscription) {
      return NextResponse.json(
        { hasCredit: false, remaining: 0, error: 'Abonelik bulunamadı' },
        { status: 404 }
      );
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
