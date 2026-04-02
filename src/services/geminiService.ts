import { GoogleGenAI, Modality, Type, ThinkingLevel } from "@google/genai";

const getAI = () => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const geminiService = {
  async analyzeImage(base64Image: string, prompt: string) {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: {
        parts: [
          { inlineData: { data: base64Image.split(',')[1], mimeType: "image/jpeg" } },
          { text: prompt }
        ]
      }
    });
    return response.text;
  },

  async analyzeBookCover(base64Image: string) {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: {
        parts: [
          { inlineData: { data: base64Image.split(',')[1], mimeType: "image/jpeg" } },
          { text: `Analyze this book cover and identify the title and author. 
          Return ONLY the title and author in the following JSON format: {"title": "...", "author": "..."}.` }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            author: { type: Type.STRING }
          },
          required: ["title", "author"]
        }
      }
    });

    let bookInfo = { title: "", author: "" };
    try {
      bookInfo = JSON.parse(response.text);
    } catch (e) {
      console.error("Failed to parse book info from Gemini:", e);
    }

    let enrichedData = "";
    if (bookInfo.title) {
      try {
        const apiData = await this.fetchBookDetails(bookInfo.title, bookInfo.author);
        if (apiData) {
          enrichedData = `\n\n### Thông tin từ Google Books API:\n- **Mô tả:** ${apiData.description || "Không có mô tả."}\n- **Số trang:** ${apiData.pageCount || "N/A"}\n- **Ngày xuất bản:** ${apiData.publishedDate || "N/A"}\n- **Nhà xuất bản:** ${apiData.publisher || "N/A"}`;
        }
      } catch (e) {
        console.error("Failed to fetch book details from API:", e);
      }
    }

    const analysisResponse = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: {
        parts: [
          { inlineData: { data: base64Image.split(',')[1], mimeType: "image/jpeg" } },
          { text: `Dựa trên ảnh bìa sách và thông tin bổ sung sau đây: "${enrichedData}", hãy thực hiện phân tích chuyên sâu:
          1. Tóm tắt nội dung và các chủ đề chính.
          2. Phân tích phong cách thiết kế bìa và cảm xúc nó mang lại.
          3. Đưa ra nhận xét về giá trị của cuốn sách đối với độc giả.
          
          Hãy trình bày kết quả bằng Markdown chuyên nghiệp, sử dụng tiếng Việt.` }
        ]
      },
      config: {
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
      }
    });

    return {
      analysis: analysisResponse.text + enrichedData,
      title: bookInfo.title
    };
  },

  async fetchBookDetails(title: string, author: string) {
    try {
      const query = encodeURIComponent(`intitle:${title}${author ? `+inauthor:${author}` : ""}`);
      const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`);
      const data = await response.json();
      
      if (data.items && data.items.length > 0) {
        const info = data.items[0].volumeInfo;
        return {
          description: info.description,
          pageCount: info.pageCount,
          publishedDate: info.publishedDate,
          publisher: info.publisher,
          categories: info.categories
        };
      }
      return null;
    } catch (error) {
      console.error("Error fetching from Google Books API:", error);
      return null;
    }
  },

  async generateFacebookPost(base64Image: string, bookContent: string, bookAnalysis: string, style: 'professional' | 'storytelling' | 'viral' | 'educational' = 'professional') {
    const ai = getAI();
    
    const stylePrompts = {
      professional: "Phong cách chuyên nghiệp, trang trọng, tập trung vào giá trị tri thức và sự phát triển bản thân. Phù hợp cho doanh nhân, nhà quản lý.",
      storytelling: "Phong cách kể chuyện truyền cảm hứng, giàu cảm xúc, tập trung vào hành trình thay đổi và những bài học nhân văn sâu sắc.",
      viral: "Phong cách hấp dẫn, bắt trend, sử dụng ngôn ngữ trẻ trung, có hook mạnh ngay từ đầu để thu hút sự chú ý nhanh chóng.",
      educational: "Phong cách giáo dục, tóm tắt các ý chính một cách khoa học, dễ hiểu, tập trung vào việc truyền đạt kiến thức thực tiễn."
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: {
        parts: [
          { inlineData: { data: base64Image.split(',')[1], mimeType: "image/jpeg" } },
          { text: `Bạn là chuyên gia sáng tạo nội dung (Content Creator) cho Thư viện Hà Nội. 
          Hãy viết một bài đăng Facebook giới thiệu sách với phong cách: ${stylePrompts[style]}.
          
          Yêu cầu cấu trúc bài viết:
          1. Tiêu đề (Hook) cực mạnh, thu hút sự chú ý ngay lập tức.
          2. Nội dung chính: Phân tích các giá trị cốt lõi của cuốn sách.
          3. Trích dẫn (Quote) đắt giá nhất từ cuốn sách.
          4. Lời khuyên/Bài học thực tiễn cho người đọc.
          5. Thông tin nghe Podcast tại Thư viện số AI - Hanoi Library.
          6. Thông tin mượn sách tại Thư viện Hà Nội (47 Bà Triệu).
          7. Hashtags phù hợp.
          
          Sử dụng các biểu tượng (emoji) tinh tế, phù hợp với phong cách ${style}.
          
          Dựa vào thông tin sau:
          - Ảnh bìa sách (đã cung cấp).
          - Kết quả phân tích chuyên sâu: "${bookAnalysis}".
          - Cảm nhận/Tóm tắt bổ sung từ người dùng: "${bookContent}".
          
          Hãy viết bài đăng fanpage hoàn chỉnh, ngôn ngữ tiếng Việt, tinh tế và truyền cảm hứng.` }
        ]
      },
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
      }
    });
    return response.text;
  },

  async generateHanoiEventPost(eventData: { eventName: string, location: string, time: string, highlights: string }) {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: {
        parts: [
          { text: `Bạn là một chuyên gia nội dung văn hóa, nhà báo và storyteller chuyên viết về các sự kiện văn hóa tại Hà Nội.
          
          Nhiệm vụ:
          - Viết bài giới thiệu, tường thuật hoặc quảng bá các sự kiện văn hóa tại Hà Nội.
          - Nội dung phải hấp dẫn, giàu cảm xúc, mang hơi thở văn hóa – lịch sử – hiện đại.
          
          Ngữ cảnh:
          - Địa điểm: Hà Nội, Việt Nam
          - Đối tượng độc giả: người trẻ, người yêu văn hóa, khách du lịch, cộng đồng mạng
          
          Yêu cầu nội dung:
          1. Mở bài:
          - Gây tò mò hoặc cảm xúc (hook mạnh)
          - Có thể bắt đầu bằng hình ảnh, câu hỏi hoặc storytelling
          
          2. Thân bài:
          - Giới thiệu sự kiện (tên, thời gian, địa điểm)
          - Ý nghĩa văn hóa/lịch sử
          - Điểm đặc sắc (âm nhạc, nghệ thuật, ẩm thực, trải nghiệm)
          - Không khí (mô tả như đang “ở đó”)
          
          3. Kết bài:
          - Kêu gọi tham gia (CTA)
          - Tạo cảm giác FOMO (nếu không đi sẽ tiếc)
          
          Phong cách:
          - Giọng văn điện ảnh (cinematic)
          - Gợi hình, giàu cảm xúc
          - Kết hợp truyền thống + hiện đại
          - Ngắn gọn nhưng “đắt”
          
          Định dạng:
          - Viết dạng bài Facebook (150–300 từ)
          - Có emoji vừa phải
          - Có tiêu đề hấp dẫn
          
          Biến đầu vào:
          - Tên sự kiện: ${eventData.eventName}
          - Địa điểm: ${eventData.location}
          - Thời gian: ${eventData.time}
          - Điểm nổi bật: ${eventData.highlights}
          
          Đầu ra:
          - 1 bài viết hoàn chỉnh, sẵn sàng đăng MẠNG XÃ HỘI, BÁO ĐIỆN TỬ.
          
          Hãy trả lời bằng tiếng Việt.` }
        ]
      },
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
      }
    });
    return response.text;
  },

  async generateCinematicCaption(base64Image: string) {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: {
        parts: [
          { inlineData: { data: base64Image.split(',')[1], mimeType: "image/jpeg" } },
          { text: "Viết caption cinematic về bức ảnh này. Hãy làm cho nó thật sâu sắc, đầy cảm xúc và mang tính điện ảnh cao. Trả lời bằng tiếng Việt." }
        ]
      },
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
      }
    });
    return response.text;
  },

  async generateBookPodcastScript(bookInfo: string, tone: string = "Warm", voiceStyle: string = "Kore") {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: {
        parts: [
          { text: `You are an advanced AI Podcast Producer specialized in transforming books into high-quality podcast episodes.
          
          Your responsibilities:
          1. Understand the book based on the provided analysis: "${bookInfo.substring(0, 2000)}".
          2. Collect insights from summaries, themes, and interpretations.
          3. Generate a compelling, structured podcast script.
          4. Optimize for storytelling, listener engagement, and emotional flow.
          5. Prepare content for voice synthesis (TTS) with SSML tags.
          
          Tone: ${tone}.
          Voice Style: ${voiceStyle}.
          
          WORKFLOW:
          
          STEP 1: BOOK UNDERSTANDING
          - Infer Genre, Core themes, Target audience, Cultural/philosophical context.
          
          STEP 2: ANALYSIS SYNTHESIS
          - Synthesize Key ideas, Lessons & takeaways. Focus on interpretation.
          
          STEP 3: PODCAST SCRIPT GENERATION
          Create a FULL podcast script (1200-2000 words) with structure:
          1. Hook (30–60s): Emotional, curiosity-driven opening.
          2. Intro: Introduce book + author + why it matters.
          3. Main Content (3–5 sections): Each section = 1 key idea with storytelling + examples.
          4. Reflection: Personal insight / philosophical angle.
          5. Closing: Summary + call to action.
          
          Style: Similar to "The Present Writer" (slow, deep, emotional, personal storytelling) but adapted to the selected tone: ${tone}.
          Language: Vietnamese.
          
          STEP 4: AUDIO PREPARATION
          - Convert script into clean narration format with short sentences for TTS.
          - Add SSML tags: <break time="1s"/>, <emphasis>, <prosody rate="medium">.
          
          Output MUST be in JSON format.` }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            podcast_script: { type: Type.STRING, description: "The full readable script in Markdown" },
            tts_ready_script: { type: Type.STRING, description: "The script optimized for TTS with SSML tags" },
            audio_style: {
              type: Type.OBJECT,
              properties: {
                voice: { type: Type.STRING },
                speed: { type: Type.STRING },
                tone: { type: Type.STRING }
              }
            }
          },
          required: ["title", "podcast_script", "tts_ready_script", "audio_style"]
        },
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
      }
    });
    
    try {
      const result = JSON.parse(response.text);
      return { ...result, voiceStyle };
    } catch (e) {
      console.error("Failed to parse podcast script JSON:", e);
      return {
        title: "Podcast Episode",
        podcast_script: response.text,
        tts_ready_script: response.text,
        audio_style: { voice: voiceStyle, speed: "medium", tone: tone },
        voiceStyle
      };
    }
  },

  async generateTTS(text: string, voiceName: string = 'Kore') {
    const ai = getAI();
    const truncatedText = text.substring(0, 1500);
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Hãy nói bằng giọng nữ trẻ miền Bắc Việt Nam, thật tự nhiên và truyền cảm: ${truncatedText}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName as any },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const binaryString = atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const samples = new Int16Array(bytes.buffer);
      const wavBuffer = this.encodeWAV(samples, 24000);
      const blob = new Blob([wavBuffer], { type: 'audio/wav' });
      return URL.createObjectURL(blob);
    }
    return null;
  },

  encodeWAV(samples: Int16Array, sampleRate: number) {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    const writeString = (view: DataView, offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, samples.length * 2, true);

    for (let i = 0; i < samples.length; i++) {
      view.setInt16(44 + i * 2, samples[i], true);
    }

    return buffer;
  },

  async chat(message: string, history: { role: string, parts: { text: string }[] }[]) {
    const ai = getAI();
    const chat = ai.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: `Bạn là Chatbot AI thông minh của HANOI LIBRARY - nền tảng thư viện cao cấp. 
        
        Nhiệm vụ của bạn:
        1. Trả lời các câu hỏi về sách, nội dung sách, lịch sử và văn hóa Hà Nội một cách chuyên sâu.
        2. Phân tích nội dung sách, đưa ra các góc nhìn triết học, nghệ thuật và nhân văn.
        3. Gợi ý các cuốn sách liên quan dựa trên sở thích và nhu cầu của người dùng.
        4. Hỗ trợ viết kịch bản podcast, nội dung truyền thông (Facebook, Instagram) từ nội dung sách.
        
        Phong cách giao tiếp:
        - Chuyên nghiệp, sang trọng nhưng vẫn gần gũi, giống con người.
        - Ngắn gọn, súc tích nhưng mang tính gợi mở và sâu sắc.
        - Sử dụng tiếng Việt chuẩn mực, tinh tế.
        
        Hãy luôn thể hiện sự thấu cảm và niềm đam mê với tri thức và văn hóa.`,
      },
      history: history
    });

    const response = await chat.sendMessage({ message });
    return response.text;
  },

  async *chatStream(message: string, history: { role: string, parts: { text: string }[] }[]) {
    const ai = getAI();
    const chat = ai.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: `Bạn là Chatbot AI thông minh của HANOI LIBRARY - nền tảng thư viện cao cấp. 
        
        Nhiệm vụ của bạn:
        1. Trả lời các câu hỏi về sách, nội dung sách, lịch sử và văn hóa Hà Nội một cách chuyên sâu.
        2. Phân tích nội dung sách, đưa ra các góc nhìn triết học, nghệ thuật và nhân văn.
        3. Gợi ý các cuốn sách liên quan dựa trên sở thích và nhu cầu của người dùng.
        4. Hỗ trợ viết kịch bản podcast, nội dung truyền thông (Facebook, Instagram) từ nội dung sách.
        
        Phong cách giao tiếp:
        - Chuyên nghiệp, sang trọng nhưng vẫn gần gũi, giống con người.
        - Ngắn gọn, súc tích nhưng mang tính gợi mở và sâu sắc.
        - Sử dụng tiếng Việt chuẩn mực, tinh tế.
        
        Hãy luôn thể hiện sự thấu cảm và niềm đam mê với tri thức và văn hóa.`,
      },
      history: history
    });

    const result = await chat.sendMessageStream({ message });
    for await (const chunk of result) {
      yield chunk.text;
    }
  },

  async analyzeLegalDocument(base64Image: string) {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: {
        parts: [
          { inlineData: { data: base64Image.split(',')[1], mimeType: "image/jpeg" } },
          { text: `Phân tích văn bản pháp luật/hợp đồng này. 
          1. Tóm tắt các nội dung chính.
          2. Xác định các bên liên quan.
          3. Chỉ ra các điều khoản quan trọng hoặc rủi ro tiềm ẩn (nếu có).
          4. Đưa ra lời khuyên sơ bộ.
          
          Trả lời bằng tiếng Việt, định dạng Markdown chuyên nghiệp.` }
        ]
      },
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
      }
    });
    return response.text;
  },

  async generatePodcastCover(bookTitle: string, analysis: string) {
    const ai = getAI();
    const prompt = `Tạo một ảnh bìa podcast nghệ thuật, chuyên nghiệp và cinematic cho cuốn sách "${bookTitle}". 
    Nội dung sách: ${analysis.substring(0, 500)}. 
    Phong cách: Sang trọng, tối giản, mang tính biểu tượng, phù hợp với không gian thư viện hiện đại. 
    Không có chữ trên ảnh.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: prompt,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9"
        }
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  }
};
