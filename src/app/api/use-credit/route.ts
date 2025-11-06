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

    // Kullanıcının aboneliğini al
    const { data: subscription, error: fetchError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (fetchError || !subscription) {
      return NextResponse.json(
        { success: false, error: 'Abonelik bulunamadı' },
        { status: 404 }
      );
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