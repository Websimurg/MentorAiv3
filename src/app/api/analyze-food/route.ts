import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Demo yemek verileri - API key yoksa kullanılır
const DEMO_FOODS = [
  { name: "Tavuk Göğsü Izgara", calories: 450, protein: 45, carbs: 12, fat: 18 },
  { name: "Makarna Bolonez", calories: 680, protein: 28, carbs: 85, fat: 22 },
  { name: "Izgara Somon", calories: 520, protein: 42, carbs: 8, fat: 32 },
  { name: "Mercimek Çorbası", calories: 280, protein: 18, carbs: 45, fat: 6 },
  { name: "Karışık Salata", calories: 180, protein: 8, carbs: 22, fat: 12 },
  { name: "Hamburger Menü", calories: 920, protein: 35, carbs: 95, fat: 48 },
  { name: "Pizza Dilimi", calories: 380, protein: 16, carbs: 42, fat: 18 },
  { name: "Omlet (3 Yumurta)", calories: 340, protein: 24, carbs: 4, fat: 26 },
  { name: "Yoğurt ve Meyve", calories: 220, protein: 12, carbs: 38, fat: 4 },
  { name: "Köfte Ekmek", calories: 580, protein: 32, carbs: 52, fat: 28 },
];

export async function POST(request: NextRequest) {
  console.log('🚀 API başlatıldı');
  
  try {
    const { image } = await request.json();

    if (!image) {
      return NextResponse.json({ error: 'Resim gerekli' }, { status: 400 });
    }

    // Environment variable'dan API key al
    const apiKey = process.env.OPENAI_API_KEY;
    
    // API key yoksa demo mod
    if (!apiKey) {
      console.log('⚠️ OPENAI_API_KEY bulunamadı, demo mod aktif');
      // Rastgele bir demo yemek döndür
      const randomFood = DEMO_FOODS[Math.floor(Math.random() * DEMO_FOODS.length)];
      
      // Biraz varyasyon ekle
      const variation = 0.9 + Math.random() * 0.2; // %90-110 arası
      const result = {
        name: randomFood.name,
        calories: Math.round(randomFood.calories * variation),
        protein: Math.round(randomFood.protein * variation),
        carbs: Math.round(randomFood.carbs * variation),
        fat: Math.round(randomFood.fat * variation)
      };
      
      console.log('✅ Demo sonuç:', result);
      return NextResponse.json(result);
    }
    
    console.log('🔑 API Key bulundu, gerçek analiz yapılıyor');

    // Base64 formatını kontrol et
    let imageUrl = image;
    if (!image.startsWith('data:image/')) {
      console.log('⚠️ Image data URL prefix eksik, ekleniyor...');
      // Eğer data URL değilse, jpeg olarak varsay
      imageUrl = `data:image/jpeg;base64,${image}`;
    }
    console.log('📷 Image URL format:', imageUrl.substring(0, 50) + '...');

    // OpenAI SDK kullan
    const openai = new OpenAI({
      apiKey: apiKey,
    });
    
    console.log('📤 OpenAI\'ye istek gönderiliyor...');
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Sen profesyonel bir beslenme uzmanısın. Yemek fotoğraflarını detaylı analiz edip gerçekçi besin değerleri veriyorsun. Her fotoğrafı dikkatle incele ve farklı yemekler için farklı değerler ver.'
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Bu fotoğraftaki yemeği DETAYLI analiz et:
1. Yemeğin adını belirle (Türkçe)
2. Porsiyon büyüklüğünü tahmin et
3. İçindeki malzemeleri tespit et
4. Gerçekçi besin değerlerini hesapla

SONUCU SADECE Şu JSON formatında ver (başka hiçbir şey yazma):
{"name": "yemek adı", "calories": kalori_sayısı, "protein": protein_gram, "carbs": karbonhidrat_gram, "fat": yağ_gram}

Dikkat: Her fotoğraf farklıdır, aynı değerleri verme!`
            },
            {
              type: 'image_url',
              image_url: { 
                url: imageUrl,
                detail: 'high'
              }
            }
          ]
        }
      ],
      max_tokens: 500,
      temperature: 0.3
    });

    console.log('📥 Yanıt alındı');
    let content = response.choices[0]?.message?.content;
    console.log('💬 Ham içerik:', content);

    if (!content) {
      return NextResponse.json({ error: 'Sonuç alınamadı' }, { status: 500 });
    }

    // Markdown temizle
    content = content.trim();
    if (content.startsWith('```')) {
      const lines = content.split('\n');
      content = lines.slice(1, -1).join('\n');
    }
    
    console.log('🧹 Temiz içerik:', content);
    const result = JSON.parse(content);
    console.log('✅ Başarılı:', result);
    
    return NextResponse.json(result);
    
  } catch (error: any) {
    console.error('💥 Detaylı Hata:', {
      message: error.message,
      status: error.status,
      type: error.type,
      code: error.code,
      stack: error.stack
    });
    
    // OpenAI hatasıysa detaylı bilgi ver
    if (error.status === 400) {
      return NextResponse.json(
        { 
          error: 'Resim format hatası', 
          message: error.message,
          details: 'Lütfen geçerli bir resim yükleyin (JPEG, PNG, GIF, WEBP)'
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Sunucu hatası', 
        message: error instanceof Error ? error.message : 'Bilinmeyen',
        type: error.type || 'unknown'
      },
      { status: 500 }
    );
  }
}