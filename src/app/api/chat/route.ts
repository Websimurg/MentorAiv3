import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ASSISTANT_ID = "asst_EmS0mTwSqzYzf7rxiirs1vml";

export async function POST(req: NextRequest) {
  try {
    const { message, threadId, userContext } = await req.json();

    if (!message) {
      return NextResponse.json(
        { error: "Mesaj gerekli" },
        { status: 400 }
      );
    }
    
    // Kullanıcı bağlamını hazırla
    const userName = userContext?.name || "Kullanıcı";
    const userPreferences = userContext?.preferences || [];
    const userLearnings = userContext?.learnings || [];
    const conversationCount = userContext?.conversationCount || 0;

    // Thread oluştur veya mevcut thread'i kullan
    let currentThreadId = threadId;
    if (!currentThreadId) {
      const thread = await openai.beta.threads.create();
      currentThreadId = thread.id;
    }

    // Kullanıcı bağlamı ile mesajı hazırla
    let contextualMessage = message;
    
    // İlk mesajsa kullanıcı bilgilerini ekle
    if (conversationCount === 0 || !threadId) {
      contextualMessage = `Kullanıcı Bilgileri:
- İsim: ${userName}
- Toplam sohbet: ${conversationCount}
${userLearnings.length > 0 ? `- Öğrenilen bilgiler: ${userLearnings.join(", ")}` : ""}
${userPreferences.length > 0 ? `- Tercihler: ${userPreferences.join(", ")}` : ""}

Kullanıcının mesajı: ${message}

Lütfen kullanıcıya ${userName} diye hitap et. Öğrenilen bilgileri sadece UYGUN OLDUĞUNDA kullan, her mesajda bahsetme. Doğal ve akıcı bir sohbet yap.`;
    }
    
    // Mesajı thread'e ekle
    await openai.beta.threads.messages.create(currentThreadId, {
      role: "user",
      content: contextualMessage,
    });

    // Assistant'ı çalıştır
    const run = await openai.beta.threads.runs.create(currentThreadId, {
      assistant_id: ASSISTANT_ID,
    });

    // Yanıtı bekle
    let runStatus = await openai.beta.threads.runs.retrieve(
      currentThreadId,
      run.id
    );

    // Run tamamlanana kadar bekle
    while (runStatus.status !== "completed") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(
        currentThreadId,
        run.id
      );

      if (runStatus.status === "failed" || runStatus.status === "cancelled") {
        throw new Error("Assistant yanıt veremedi");
      }
    }

    // Mesajları al
    const messages = await openai.beta.threads.messages.list(currentThreadId);
    const lastMessage = messages.data[0];
    
    // Yanıtı çıkar
    let aiResponse = "Üzgünüm, bir hata oluştu.";
    if (lastMessage && lastMessage.content && lastMessage.content.length > 0) {
      const content = lastMessage.content[0];
      if (content.type === "text") {
        aiResponse = content.text.value;
      }
    }
    
    // Kullanıcı mesajından öğrenilen bilgileri çıkar (sadece kullanıcının mesajından)
    const learnings: string[] = [];
    const lowerMessage = message.toLowerCase();
    
    // Kullanıcı açıkça ilgi alanını belirtiyorsa öğren
    if ((lowerMessage.includes("meditasyon yapmak istiyorum") || 
         lowerMessage.includes("yoga ile ilgileniyorum") ||
         lowerMessage.includes("meditasyon öğrenmek")) && conversationCount < 3) {
      learnings.push("Meditasyon ve yoga ile ilgileniyor");
    }
    if ((lowerMessage.includes("beslenme hakkında") || 
         lowerMessage.includes("diyet yapmak istiyorum") ||
         lowerMessage.includes("sağlıklı beslenmek")) && conversationCount < 3) {
      learnings.push("Sağlıklı beslenme ile ilgileniyor");
    }
    if ((lowerMessage.includes("yatırım yapmak") || 
         lowerMessage.includes("para kazanmak") ||
         lowerMessage.includes("finansal")) && conversationCount < 3) {
      learnings.push("Finansal konularla ilgileniyor");
    }
    if ((lowerMessage.includes("ilişkim") || 
         lowerMessage.includes("sevgilim") ||
         lowerMessage.includes("aşk hayatım")) && conversationCount < 3) {
      learnings.push("İlişki konularıyla ilgileniyor");
    }

    return NextResponse.json({ 
      response: aiResponse,
      threadId: currentThreadId,
      userLearnings: learnings.length > 0 ? learnings : undefined
    });
  } catch (error: any) {
    console.error("OpenAI API Error:", error);
    return NextResponse.json(
      { error: error.message || "Bir hata oluştu" },
      { status: 500 }
    );
  }
}