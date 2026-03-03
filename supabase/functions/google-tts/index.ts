import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Map of language keys to Google Cloud TTS language codes and voice names
const languageVoiceMap: Record<string, { languageCode: string; name: string; ssmlGender: string }> = {
  en: { languageCode: 'en-US', name: 'en-US-Neural2-J', ssmlGender: 'MALE' },
  hi: { languageCode: 'hi-IN', name: 'hi-IN-Neural2-A', ssmlGender: 'FEMALE' },
  hinglish: { languageCode: 'hi-IN', name: 'hi-IN-Neural2-A', ssmlGender: 'FEMALE' },
  bn: { languageCode: 'bn-IN', name: 'bn-IN-Neural2-A', ssmlGender: 'FEMALE' },
  te: { languageCode: 'te-IN', name: 'te-IN-Standard-A', ssmlGender: 'FEMALE' },
  mr: { languageCode: 'mr-IN', name: 'mr-IN-Standard-A', ssmlGender: 'FEMALE' },
  ta: { languageCode: 'ta-IN', name: 'ta-IN-Neural2-A', ssmlGender: 'FEMALE' },
  gu: { languageCode: 'gu-IN', name: 'gu-IN-Neural2-A', ssmlGender: 'FEMALE' },
  kn: { languageCode: 'kn-IN', name: 'kn-IN-Neural2-A', ssmlGender: 'FEMALE' },
  ml: { languageCode: 'ml-IN', name: 'ml-IN-Neural2-A', ssmlGender: 'FEMALE' },
  or: { languageCode: 'or-IN', name: 'or-IN-Standard-A', ssmlGender: 'FEMALE' },  // Odia - Standard only
  pa: { languageCode: 'pa-IN', name: 'pa-IN-Neural2-A', ssmlGender: 'FEMALE' },
  as: { languageCode: 'bn-IN', name: 'bn-IN-Neural2-A', ssmlGender: 'FEMALE' },  // Fallback to Bengali
  mai: { languageCode: 'hi-IN', name: 'hi-IN-Neural2-A', ssmlGender: 'FEMALE' },  // Fallback to Hindi
  ur: { languageCode: 'ur-IN', name: 'ur-IN-Standard-A', ssmlGender: 'FEMALE' },  // Urdu - Standard
  sa: { languageCode: 'hi-IN', name: 'hi-IN-Neural2-A', ssmlGender: 'FEMALE' },  // Fallback to Hindi
  ne: { languageCode: 'ne-NP', name: 'ne-NP-Standard-A', ssmlGender: 'FEMALE' },  // Nepali - Standard
  sd: { languageCode: 'ur-IN', name: 'ur-IN-Standard-A', ssmlGender: 'FEMALE' },  // Fallback to Urdu
  ks: { languageCode: 'hi-IN', name: 'hi-IN-Neural2-A', ssmlGender: 'FEMALE' },  // Fallback to Hindi
  kok: { languageCode: 'hi-IN', name: 'hi-IN-Neural2-A', ssmlGender: 'FEMALE' },  // Fallback to Hindi
  mni: { languageCode: 'bn-IN', name: 'bn-IN-Neural2-A', ssmlGender: 'FEMALE' },  // Fallback to Bengali
  doi: { languageCode: 'hi-IN', name: 'hi-IN-Neural2-A', ssmlGender: 'FEMALE' },  // Fallback to Hindi
  sat: { languageCode: 'hi-IN', name: 'hi-IN-Neural2-A', ssmlGender: 'FEMALE' },  // Fallback to Hindi
  bho: { languageCode: 'hi-IN', name: 'hi-IN-Neural2-A', ssmlGender: 'FEMALE' },  // Fallback to Hindi
  raj: { languageCode: 'hi-IN', name: 'hi-IN-Neural2-A', ssmlGender: 'FEMALE' },  // Fallback to Hindi
  es: { languageCode: 'es-ES', name: 'es-ES-Neural2-A', ssmlGender: 'FEMALE' },
  fr: { languageCode: 'fr-FR', name: 'fr-FR-Neural2-A', ssmlGender: 'FEMALE' },
  'hi-roman': { languageCode: 'hi-IN', name: 'hi-IN-Neural2-A', ssmlGender: 'FEMALE' },
  'ta-roman': { languageCode: 'ta-IN', name: 'ta-IN-Neural2-A', ssmlGender: 'FEMALE' },
  'te-roman': { languageCode: 'te-IN', name: 'te-IN-Standard-A', ssmlGender: 'FEMALE' },
  'bn-roman': { languageCode: 'bn-IN', name: 'bn-IN-Neural2-A', ssmlGender: 'FEMALE' },
  'gu-roman': { languageCode: 'gu-IN', name: 'gu-IN-Neural2-A', ssmlGender: 'FEMALE' },
  'kn-roman': { languageCode: 'kn-IN', name: 'kn-IN-Neural2-A', ssmlGender: 'FEMALE' },
  'ml-roman': { languageCode: 'ml-IN', name: 'ml-IN-Neural2-A', ssmlGender: 'FEMALE' },
  'mr-roman': { languageCode: 'mr-IN', name: 'mr-IN-Standard-A', ssmlGender: 'FEMALE' },
  'pa-roman': { languageCode: 'pa-IN', name: 'pa-IN-Neural2-A', ssmlGender: 'FEMALE' },
  'ur-roman': { languageCode: 'ur-IN', name: 'ur-IN-Standard-A', ssmlGender: 'FEMALE' },
  'sa-roman': { languageCode: 'hi-IN', name: 'hi-IN-Neural2-A', ssmlGender: 'FEMALE' },
};

const encoder = new TextEncoder();
const MAX_TTS_BYTES = 4800;

const splitTextByByteLimit = (text: string, maxBytes = MAX_TTS_BYTES): string[] => {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];

  if (encoder.encode(normalized).length <= maxBytes) {
    return [normalized];
  }

  const chunks: string[] = [];
  let currentChunk = '';

  const flushCurrentChunk = () => {
    if (currentChunk) {
      chunks.push(currentChunk);
      currentChunk = '';
    }
  };

  const pushSegmentWithinLimit = (segment: string) => {
    const words = segment.split(/\s+/).filter(Boolean);
    let localChunk = '';

    for (const word of words) {
      const candidate = localChunk ? `${localChunk} ${word}` : word;
      if (encoder.encode(candidate).length <= maxBytes) {
        localChunk = candidate;
        continue;
      }

      if (localChunk) {
        chunks.push(localChunk);
        localChunk = '';
      }

      if (encoder.encode(word).length <= maxBytes) {
        localChunk = word;
        continue;
      }

      let partial = '';
      for (const char of Array.from(word)) {
        const next = `${partial}${char}`;
        if (encoder.encode(next).length <= maxBytes) {
          partial = next;
        } else {
          if (partial) chunks.push(partial);
          partial = char;
        }
      }
      if (partial) {
        chunks.push(partial);
      }
    }

    if (localChunk) chunks.push(localChunk);
  };

  const sentenceParts = normalized.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [normalized];

  for (const sentencePart of sentenceParts) {
    const sentence = sentencePart.trim();
    if (!sentence) continue;

    const candidate = currentChunk ? `${currentChunk} ${sentence}` : sentence;
    if (encoder.encode(candidate).length <= maxBytes) {
      currentChunk = candidate;
      continue;
    }

    flushCurrentChunk();

    if (encoder.encode(sentence).length <= maxBytes) {
      currentChunk = sentence;
    } else {
      pushSegmentWithinLimit(sentence);
    }
  }

  flushCurrentChunk();

  return chunks;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GOOGLE_CLOUD_TTS_API_KEY = Deno.env.get('GOOGLE_CLOUD_TTS_API_KEY');
    if (!GOOGLE_CLOUD_TTS_API_KEY) {
      throw new Error('GOOGLE_CLOUD_TTS_API_KEY is not configured');
    }

    const { text, language, rate } = await req.json();

    if (!text || !language) {
      throw new Error('Missing required fields: text and language');
    }

    // Clean text for speech
    const cleanText = text
      .replace(/[#*_`~]/g, '')
      .replace(/\$\$?[^$]+\$\$?/g, '') // Remove LaTeX
      .replace(/\\[a-zA-Z]+\{[^}]*\}/g, '') // Remove LaTeX commands
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Markdown links to text
      .replace(/\n+/g, '. ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) {
      return new Response(JSON.stringify({ error: 'No speakable text' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const textChunks = splitTextByByteLimit(cleanText);

    if (!textChunks.length) {
      return new Response(JSON.stringify({ error: 'No speakable text after processing' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get voice config for language
    const voiceConfig = languageVoiceMap[language] || languageVoiceMap['en'];

    // Calculate speaking rate
    const speakingRate = rate ?? 0.95;

    const audioChunks: string[] = [];

    for (let i = 0; i < textChunks.length; i += 1) {
      const chunk = textChunks[i];

      const response = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_CLOUD_TTS_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: { text: chunk },
            voice: {
              languageCode: voiceConfig.languageCode,
              name: voiceConfig.name,
              ssmlGender: voiceConfig.ssmlGender,
            },
            audioConfig: {
              audioEncoding: 'MP3',
              speakingRate,
              pitch: 0,
              volumeGainDb: 0,
              effectsProfileId: ['small-bluetooth-speaker-class-device'],
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Google TTS API error:', response.status, errorData, `chunk=${i + 1}/${textChunks.length}`);
        throw new Error(`Google TTS API error: ${response.status} - ${errorData}`);
      }

      const data = await response.json();

      if (!data?.audioContent) {
        throw new Error(`No audio content received for chunk ${i + 1}`);
      }

      audioChunks.push(data.audioContent);
    }

    return new Response(JSON.stringify({
      audioContent: audioChunks[0] ?? null,
      audioChunks,
      totalChunks: audioChunks.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('TTS Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'TTS failed' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
