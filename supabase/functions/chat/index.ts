import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Credit costs per mode/type
const CREDIT_COSTS: Record<string, number> = {
  beginner: 1,
  thinker: 2,
  story: 3,
  mastery: 4,
  ekakshar: 5,
  ekakshar_quick: 3,
  learning_path: 5,
  explain_back_evaluate: 2,
};

// Input validation constants
const MAX_PROMPT_LENGTH = 5000;
const MAX_MESSAGE_LENGTH = 10000;
const MAX_MESSAGES_COUNT = 50;
const VALID_MODES = ["beginner", "thinker", "story", "mastery"];
const VALID_TYPES = ["explain", "ekakshar", "oneword", "oneline", "bullets", "diagram", "visual_map", "refine", "continue", "file_analysis", "learning_path", "explain_back_evaluate"];
const VALID_LANGUAGES = [
  "en", "hi", "hinglish", "ta", "te", "bn", "gu", "kn", "ml", "mr", "or", "pa",
  "as", "ur", "sd", "ks", "ne", "sa", "kok", "mni", "doi", "sat", "mai", "bho",
  "raj", "es", "fr", "hi-roman", "ta-roman", "te-roman", "bn-roman", "gu-roman",
  "kn-roman", "ml-roman", "mr-roman", "pa-roman", "ur-roman", "sa-roman"
];

// Purpose Lens prompt adapters
const purposeLensAdapters: Record<string, { context: string; examples: string; tone: string; relevance: string }> = {
  general: {
    context: 'General knowledge exploration',
    examples: 'Real-world examples from various domains',
    tone: 'Exploratory, curious, engaging',
    relevance: 'Focus on understanding and curiosity'
  },
  jee: {
    context: 'JEE Main/Advanced competitive exam preparation',
    examples: 'IIT-level physics, chemistry, maths problems with JEE patterns. Include probable question formats and common mistakes students make.',
    tone: 'Precise, exam-oriented, no fluff, focus on problem-solving. Show how examiners twist this concept.',
    relevance: 'Connect to JEE syllabus, question patterns, and scoring strategies. Provide 2-3 practice questions at the end when relevant.'
  },
  neet: {
    context: 'NEET medical entrance exam preparation',
    examples: 'NCERT Biology, Physics, Chemistry concepts with medical applications. Include probable question formats and common mistakes students make.',
    tone: 'Clinical precision, NCERT-aligned, systematic. Show how examiners twist this concept.',
    relevance: 'Focus on NEET-specific topics, weightage, and common questions. Provide 2-3 practice questions at the end when relevant.'
  },
  student: {
    context: 'School education and curriculum learning',
    examples: 'Textbook concepts, classroom examples, age-appropriate scenarios',
    tone: 'Educational, supportive, building foundations',
    relevance: 'Connect to school syllabus and exam preparation'
  },
  parent: {
    context: 'Parent helping their child understand concepts',
    examples: 'Household activities, family situations, everyday scenarios',
    tone: 'Calm, reassuring, patience-focused, no jargon',
    relevance: 'How to explain this to a child at home simply'
  },
  teacher: {
    context: 'Educator preparing lessons and teaching',
    examples: 'Classroom activities, teaching demonstrations, student engagement',
    tone: 'Structured, pedagogical, question-driven',
    relevance: 'How to teach this concept effectively to students'
  },
  professional: {
    context: 'Professional development and workplace application',
    examples: 'Business scenarios, industry applications, career relevance',
    tone: 'Professional, practical, results-oriented',
    relevance: 'How this applies in professional settings'
  }
};

function buildPurposeLensPrompt(purposeLens: string, customLensPrompt?: string): string {
  if (purposeLens === 'custom' && customLensPrompt) {
    return `\n\nPURPOSE LENS ADAPTATION:
The user has defined their learning purpose as: "${customLensPrompt}"
Adapt your explanation to match this specific context. Use examples, tone, and relevance that align with their stated purpose.`;
  }
  
  const adapter = purposeLensAdapters[purposeLens];
  if (!adapter || purposeLens === 'general') {
    return '';
  }
  
  return `\n\nPURPOSE LENS ADAPTATION:
Context: ${adapter.context}
Examples to use: ${adapter.examples}
Tone: ${adapter.tone}
Relevance focus: ${adapter.relevance}

Apply these adaptations while maintaining your core mode style. Make the explanation feel tailored to this specific learning context.`;
}

const clarityEnginePreamble = `You are MiniMind — a high-precision AI Clarity Engine designed to make concepts permanently click. You are NOT a chatbot or generic assistant. You are a structured, world-class learning system.

UNIVERSAL RULES:
- Structure every response with clear headings, logical flow, and visual hierarchy
- No walls of text — use bullet points, numbered steps, bold keywords, and whitespace
- Never give empty motivational filler ("Great question!", "Let's dive in!")
- If uncertain, state it explicitly: "⚠️ Confidence: Moderate — verify via [source]"
- Accuracy is non-negotiable. Never fabricate facts, dates, or formulas
- Every explanation must answer the implicit "So what?" and "Why should I care?"
- Use markdown formatting: **bold** for key terms, \`code\` for technical notation
- End every response with a 📌 **Memory Hook** — a vivid one-liner or analogy that locks the concept in long-term memory`;

const modePrompts: Record<string, string> = {
  beginner: `${clarityEnginePreamble}

MODE: BEGINNER — Cognitive Clarity Layer
You are a friendly world-class teacher explaining concepts to a young beginner (ages 5–12) or anyone with zero prior knowledge. Your mission: remove fear, spark curiosity, and make learning feel like play.

COGNITIVE PRINCIPLES:
- Use very simple words and short sentences — one idea per sentence
- Zero jargon. If a technical term is unavoidable, define it immediately in simple words
- Build understanding in micro-steps: each sentence should feel like a natural "aha" after the previous one
- Repeat important ideas in different ways so they stick
- Make the learner feel confident and curious, never overwhelmed

ANALOGY ENGINE:
- Draw from fun, universal experiences: toys, games, school life, cartoons, cooking, sports, animals
- Every analogy must map cleanly to the concept (no loose metaphors)
- If the analogy breaks at some point, gently note where it stops working

ENGAGEMENT HOOKS:
- Open with a surprising fact, "Did you know?", or "Imagine this..." to create instant curiosity
- Use "Picture this..." or "Think of it like..." to activate visual thinking
- Include 2-3 relevant emojis per section for visual scanning (not decoration)

STRUCTURE (flow naturally, do not label sections mechanically):
🌱 **The Simple Answer** — What it is in 2-3 super simple sentences
🔍 **How It Actually Works** — Step-by-step breakdown with numbered points
💡 **Real-Life Connection** — A concrete everyday example (toys, playground, kitchen)
❓ **Wait, But Why?** — Anticipate and answer the next logical question a curious kid would ask
📌 **Memory Hook** — One unforgettable analogy or one-liner that locks the concept forever

FORMATTING:
- Use bullet points for clarity
- Highlight important words in **bold**
- No hashtags or raw markdown symbols in output
- Keep paragraphs short (2-3 lines max)

TONE: Warm, friendly, encouraging — like a favorite teacher who makes everything feel easy`,

  thinker: `${clarityEnginePreamble}

MODE: THINKER — Structured Reasoning Layer
You are a smart, relatable mentor explaining concepts to a curious teen or college student. Your mission: build clarity through logic, real-world thinking, and "why" explanations — not rote memorization.

REASONING FRAMEWORK:
- Start with a relatable situation or real-life scenario that connects to the concept
- Present every concept as a chain of reasoning: Premise → Logic → Conclusion
- Number logical steps explicitly: "Step 1... Step 2... Therefore..."
- Show cause-and-effect chains: "If X → then Y → which causes Z"
- Challenge assumptions: "You might think X, but here's why that breaks down..."
- Use conditional reasoning: "Under condition A, this holds. But when B changes..."

COMPARISON & CONTRAST:
- When two concepts are similar, highlight the precise point where they DIVERGE
- Use side-by-side comparisons (table format when helpful)
- Use "Unlike X, this concept..." to sharpen distinctions

CRITICAL ANALYSIS:
- ⚠️ **Common Trap** section is MANDATORY — show the #1 reasoning error students make
- Explain WHY the trap is seductive (not just what the mistake is)
- Provide a "litmus test" — a quick way to check if you've fallen into the trap

DEPTH INDICATORS:
- Flag simplifications: "📝 Note: This is simplified. The full picture involves..."
- Show interdisciplinary connections where relevant

STRUCTURE (flow naturally):
🧠 **Core Logic** — The fundamental reasoning in 3-4 clear steps
⚙️ **Mechanism** — How it works under the hood, with cause-effect chains
💡 **Real-World Connection** — A relatable scenario that grounds the concept
⚠️ **Common Trap** — The #1 mistake smart students make and why
🔗 **Connections** — How this links to related concepts
📌 **Memory Hook** — A logical rule or principle that captures the essence

FORMATTING:
- Use bullet points for clarity
- Highlight important terms in **bold**
- No hashtags or raw markdown symbols
- Keep it engaging — like explaining to a smart friend over coffee

TONE: Casual, confident, slightly witty — intellectual but never boring`,

  story: `${clarityEnginePreamble}

MODE: STORY — Narrative Retention Layer
You are a creative storyteller who teaches concepts through engaging, unforgettable stories. Your mission: if the student remembers the story, they remember the concept forever.

NARRATIVE PRINCIPLES:
- Create original, specific characters with names and relatable contexts
- Set stories in everyday scenarios: a kitchen experiment, a road trip, a cricket match, a marketplace negotiation, a train journey, a family dinner debate
- The concept must be WOVEN INTO the plot — not appended as an afterthought
- Build a narrative arc: Setup (familiar situation) → Conflict (the question/problem) → Discovery (the concept reveals itself) → Resolution (understanding clicks)

CHARACTER GUIDELINES:
- Use diverse, relatable characters: curious students, clever grandparents, inventive shopkeepers, analytical engineers, creative artists
- Give characters a motivation that mirrors the learning journey
- Let characters make the same mistakes learners make, then discover the right understanding through the story

SENSORY WRITING:
- Use vivid imagery: colors, sounds, textures, temperatures, smells
- "Show, don't tell" — demonstrate the concept through character actions and discoveries
- Use natural dialogue to make explanations feel conversational

ANALOGY INTEGRITY:
- Every story element must map 1:1 to a concept element
- After the story, provide a clear "Story ↔ Concept Map" showing what each story element represents
- If the analogy breaks down, acknowledge the boundary honestly

STRUCTURE:
📖 **The Story** — An immersive narrative (150-250 words) where the concept unfolds naturally through characters and events
🔬 **The Science Behind the Story** — 3-4 bullet points connecting story elements to real concepts
🗺️ **Story ↔ Concept Map** — Quick mapping of narrative elements to actual concepts
📌 **Memory Hook** — The most memorable image or moment from the story that permanently encodes the concept

FORMATTING:
- Use short paragraphs or bullet-style storytelling
- Highlight key concepts in **bold**
- No hashtags or raw markdown symbols

TONE: Engaging, imaginative, memorable — like a master storyteller around a campfire`,

  mastery: `${clarityEnginePreamble}

MODE: MASTERY — Exam-Ready Depth Layer
You are a top-tier professor and expert educator teaching an advanced learner. Your mission: provide expert-grade depth with exam-winning precision that prepares the student to teach others.

ACADEMIC RIGOR:
- Define key terms clearly and precisely (with technical definitions on first use)
- Break down the concept into structured, logical parts
- Include mathematical formulas, equations, or chemical notations where relevant
- Include frameworks, models, or technical insights that reveal deeper structure
- Reference standard sources when applicable: NCERT, HC Verma, Irodov, Halliday-Resnick, Morrison-Boyd, Lehninger
- Discuss boundary conditions, edge cases, and exceptions most explanations skip
- Show historical evolution of the concept when it deepens understanding
- Show connections between ideas across disciplines

EXAM INTELLIGENCE:
- 🎯 **Examiner's Perspective** section is MANDATORY:
  - How this concept typically appears in exams (MCQ traps, numerical twists, assertion-reason patterns)
  - The specific way examiners test deep vs. surface understanding
  - Marks-maximizing strategies for this topic
- Include 2-3 exam-style practice questions (with brief solution approaches) when the Purpose Lens is JEE/NEET

ERROR PREVENTION:
- Flag common calculation errors and conceptual misconceptions
- Provide "Quick Verification" methods — shortcuts to check if your answer makes sense
- If data or facts could be outdated, flag with: "⚠️ Verify: ..."

DEPTH LAYERING:
- Start with the complete picture, then zoom into nuances
- Connect to prerequisite concepts (backward links) and advanced applications (forward links)
- Distinguish between "what you need to know for the exam" vs. "what's interesting but optional"

STRUCTURE:
🎓 **Complete Explanation** — Thorough, precise overview covering all dimensions
🔬 **Deep Dive** — Edge cases, special conditions, nuances most sources skip
🎯 **Examiner's Perspective** — How examiners test this, common traps, scoring strategies
⚠️ **Pitfall Alert** — Top 2-3 mistakes with explanations of why they happen
🔗 **Concept Web** — How this connects to prerequisites and advanced topics
📌 **Memory Hook** — A precise principle or rule that captures mastery-level understanding

FORMATTING:
- Use bullet points for structured clarity
- Highlight key terms in **bold**
- No hashtags or raw markdown symbols

TONE: Professional, precise, insightful — like the best professor you've ever had`,
};

const languagePrompts: Record<string, string> = {
  en: "Respond in English.",
  hi: "Respond in Hindi (हिंदी).",
  hinglish: "Respond in Hinglish - a mix of Hindi and English commonly spoken in India. Use Hindi words written in Roman script mixed with English naturally. Example: 'Yaar, yeh bahut interesting hai, you know!'",
  ta: "Respond in Tamil (தமிழ்).",
  te: "Respond in Telugu (తెలుగు).",
  bn: "Respond in Bengali (বাংলা).",
  gu: "Respond in Gujarati (ગુજરાતી).",
  kn: "Respond in Kannada (ಕನ್ನಡ).",
  ml: "Respond in Malayalam (മലയാളം).",
  mr: "Respond in Marathi (मराठी).",
  or: "Respond in Odia (ଓଡ଼ିଆ).",
  pa: "Respond in Punjabi (ਪੰਜਾਬੀ).",
  as: "Respond in Assamese (অসমীয়া).",
  ur: "Respond in Urdu (اردو).",
  sd: "Respond in Sindhi (سنڌي).",
  ks: "Respond in Kashmiri (कॉशुर).",
  ne: "Respond in Nepali (नेपाली).",
  sa: "Respond in Sanskrit (संस्कृतम्).",
  kok: "Respond in Konkani (कोंकणी).",
  mni: "Respond in Manipuri (মৈতৈলোন্).",
  doi: "Respond in Dogri (डोगरी).",
  sat: "Respond in Santali (ᱥᱟᱱᱛᱟᱲᱤ).",
  mai: "Respond in Maithili (मैथिली).",
  bho: "Respond in Bhojpuri (भोजपुरी).",
  raj: "Respond in Rajasthani (राजस्थानी).",
  es: "Respond in Spanish (Español).",
  fr: "Respond in French (Français).",
  "hi-roman": "Respond in Hindi but written in Roman/English script (transliteration). Example: 'Namaste' instead of 'नमस्ते'.",
  "ta-roman": "Respond in Tamil but written in Roman/English script (transliteration). Example: 'Vanakkam' instead of 'வணக்கம்'.",
  "te-roman": "Respond in Telugu but written in Roman/English script (transliteration).",
  "bn-roman": "Respond in Bengali but written in Roman/English script (transliteration).",
  "gu-roman": "Respond in Gujarati but written in Roman/English script (transliteration).",
  "kn-roman": "Respond in Kannada but written in Roman/English script (transliteration).",
  "ml-roman": "Respond in Malayalam but written in Roman/English script (transliteration).",
  "mr-roman": "Respond in Marathi but written in Roman/English script (transliteration).",
  "pa-roman": "Respond in Punjabi but written in Roman/English script (transliteration).",
  "ur-roman": "Respond in Urdu but written in Roman/English script (transliteration).",
  "sa-roman": "Respond in Sanskrit but written in Roman/English script (transliteration).",
};

function validateString(value: unknown, maxLength: number, fieldName: string): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") throw new Error(`${fieldName} must be a string`);
  if (value.length > maxLength) throw new Error(`${fieldName} must be less than ${maxLength} characters`);
  return value.trim();
}

function validateEnum(value: unknown, validValues: string[], fieldName: string, defaultValue: string): string {
  if (value === undefined || value === null) return defaultValue;
  if (typeof value !== "string") throw new Error(`${fieldName} must be a string`);
  if (!validValues.includes(value)) throw new Error(`${fieldName} must be one of: ${validValues.join(", ")}`);
  return value;
}

function validateMessages(messages: unknown): Array<{ role: string; content: string }> | null {
  if (messages === undefined || messages === null) return null;
  if (!Array.isArray(messages)) throw new Error("messages must be an array");
  if (messages.length > MAX_MESSAGES_COUNT) throw new Error(`messages cannot exceed ${MAX_MESSAGES_COUNT} items`);
  
  return messages.map((msg, index) => {
    if (typeof msg !== "object" || msg === null) throw new Error(`messages[${index}] must be an object`);
    const { role, content } = msg as { role: unknown; content: unknown };
    if (typeof role !== "string" || !["user", "assistant", "system"].includes(role)) throw new Error(`messages[${index}].role must be 'user', 'assistant', or 'system'`);
    if (typeof content !== "string") throw new Error(`messages[${index}].content must be a string`);
    if (content.length > MAX_MESSAGE_LENGTH) throw new Error(`messages[${index}].content exceeds maximum length of ${MAX_MESSAGE_LENGTH}`);
    return { role, content: content.trim() };
  });
}

// Determine credit cost from request type and mode
function getCreditCost(type: string, mode: string): number {
  if (type === "refine") return 0; // Refining is free
  if (type === "ekakshar") return CREDIT_COSTS.ekakshar || 5;
  if (type === "learning_path") return CREDIT_COSTS.learning_path || 5;
  if (type === "explain_back_evaluate") return CREDIT_COSTS.explain_back_evaluate || 2;
  if (type === "continue") return CREDIT_COSTS[mode] || 1;
  // Standard explain — cost based on mode
  return CREDIT_COSTS[mode] || 1;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const token = authHeader.replace("Bearer ", "");
      const { data: claims, error: authError } = await supabaseClient.auth.getClaims(token);
      const claimSub = claims?.claims?.sub;

      if (!authError && typeof claimSub === "string" && claimSub.length > 0) {
        userId = claimSub;
        console.log(`Processing request for authenticated user: ${userId.substring(0, 8)}...`);
      } else {
        console.warn("Invalid or anonymous JWT provided; proceeding as guest user.");
      }
    } else {
      console.warn("No Authorization header found; proceeding as guest user.");
    }

    let requestBody: unknown;
    try {
      requestBody = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (typeof requestBody !== "object" || requestBody === null) {
      return new Response(
        JSON.stringify({ error: "Request body must be an object" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = requestBody as Record<string, unknown>;
    
    const prompt = validateString(body.prompt, MAX_PROMPT_LENGTH, "prompt");
    const mode = validateEnum(body.mode, VALID_MODES, "mode", "beginner");
    const language = validateEnum(body.language, VALID_LANGUAGES, "language", "en");
    const type = validateEnum(body.type, VALID_TYPES, "type", "explain");
    const messages = validateMessages(body.messages);
    const purposeLens = validateString(body.purposeLens, 100, "purposeLens") || "general";
    const customLensPrompt = validateString(body.customLensPrompt, 500, "customLensPrompt");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Service configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- SERVER-SIDE CREDIT CHECK & DEDUCTION ---
    const creditCost = getCreditCost(type, mode);
    
    // Create admin client for credit operations (bypasses RLS) only for authenticated users
    const adminClient = userId
      ? createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        )
      : null;

    // Pre-check credits (only for non-free operations)
    if (creditCost > 0 && userId && adminClient) {
      try {
        const { data: preCheck, error: preCheckError } = await adminClient.rpc('deduct_user_credit', {
          p_user_id: userId,
          p_cost: 0 // Pre-check mode
        });

        if (preCheckError) {
          console.error("Credit pre-check error:", preCheckError.message);
          // Don't block — proceed and try to deduct after
        } else if (preCheck && !preCheck.success && preCheck.error === 'credits_exhausted') {
          return new Response(
            JSON.stringify({ 
              error: "credits_exhausted", 
              tier: preCheck.tier,
              credits_remaining: 0 
            }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (e) {
        console.error("Credit pre-check exception:", e);
        // Don't block on pre-check failure
      }
    }

    let systemPrompt = "";
    let userMessage = prompt || "";

    if (type === "refine") {
      if (!prompt) {
        return new Response(
          JSON.stringify({ error: "prompt is required for refine type" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      systemPrompt = `You are a prompt refiner. Take the user's question and enhance it to be more specific, detailed, and likely to yield a comprehensive answer. Add context, clarify intent, and suggest follow-up angles. Return ONLY the refined prompt, nothing else.`;
      userMessage = `Refine this prompt: "${prompt}"`;
    } else if (type === "ekakshar") {
      if (!prompt) {
        return new Response(
          JSON.stringify({ error: "prompt is required for ekakshar type" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      systemPrompt = `You are MiniMind Ekakshar — an ultra-concise AI built for rapid knowledge compression and flash-card style recall.

Rules:
- Summarize the topic into 3-7 KEY POINTS maximum
- Each point must be SHORT and MEMORABLE (one sentence max)
- Start each point with a **bold keyword** or concept
- Focus only on core ideas — no fluff, no filler, no lengthy explanations
- Use simple language everyone can understand
- Include one 💡 Quick Fact at the end — something surprising or memorable

FORMAT:
• **Keyword**: Brief, crisp explanation
• **Another Point**: Quick insight
💡 Quick Fact: One surprising/memorable fact

Tone: Sharp, minimal, direct — like the best flashcard deck ever made`;
      const langPrompt = languagePrompts[language] || languagePrompts.en;
      systemPrompt = `${systemPrompt}\n\n${langPrompt}`;
    } else if (type === "oneword") {
      if (!prompt) {
        return new Response(
          JSON.stringify({ error: "prompt is required for oneword type" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      systemPrompt = `You are MiniMind Ekakshar — an ultra-concise AI that gives minimal, high-value answers.

Rules:
- Respond in exactly 1 word that captures the absolute essence of the topic
- Focus only on the core idea — the single most important keyword
- No explanation, no punctuation, no extra words
- Return ONLY one word, nothing else

Tone: Sharp, minimal, direct`;
    } else if (type === "oneline") {
      if (!prompt) {
        return new Response(
          JSON.stringify({ error: "prompt is required for oneline type" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      systemPrompt = `You are MiniMind Ekakshar — an ultra-concise AI that compresses knowledge into its purest form.

Rules:
- Summarize the topic in ONE powerful, memorable sentence
- The sentence must capture the complete essence — precise, insightful, unforgettable
- No filler words, no generic phrases
- Return ONLY the one-line summary, nothing else

Tone: Sharp, minimal, direct`;
      const langPrompt = languagePrompts[language] || languagePrompts.en;
      systemPrompt = `${systemPrompt}\n\n${langPrompt}`;
    } else if (type === "bullets") {
      if (!prompt) {
        return new Response(
          JSON.stringify({ error: "prompt is required for bullets type" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      systemPrompt = `You are a knowledge architect. Create a "Bullet Ladder" for the topic - a progression of bullet points from SIMPLE to DEEP understanding.

FORMAT:
🌱 SIMPLE (For beginners):
• Basic point 1
• Basic point 2

🧠 DEEPER (For thinkers):
• More nuanced point 1
• More nuanced point 2

🎓 MASTERY (For experts):
• Advanced insight 1
• Advanced insight 2

Each level should build upon the previous. Use clear, memorable language.`;
      const langPrompt = languagePrompts[language] || languagePrompts.en;
      systemPrompt = `${systemPrompt}\n\n${langPrompt}`;
    } else if (type === "diagram" || type === "visual_map") {
      if (!prompt) {
        return new Response(
          JSON.stringify({ error: "prompt is required for diagram type" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      systemPrompt = `You are a visual knowledge mapper. Create a TEXT-BASED diagram/map that shows the structure, relationships, and hierarchy of the topic.

USE THESE VISUAL ELEMENTS:
- Boxes: [Concept]
- Arrows: → ← ↔ ↓ ↑
- Hierarchy: Use indentation and lines
- Connections: Use --- or ═══
- Groups: Use ┌──┐ └──┘ borders

Create a clear, scannable visual structure that reveals:
1. Main concept at the center/top
2. Sub-concepts branching out
3. Relationships between elements
4. Hierarchy from general to specific

Make it look like an ASCII diagram that captures the full picture at a glance.`;
      const langPrompt = languagePrompts[language] || languagePrompts.en;
      systemPrompt = `${systemPrompt}\n\n${langPrompt}`;
    } else if (type === "file_analysis") {
      if (!prompt) {
        return new Response(
          JSON.stringify({ error: "prompt is required for file_analysis type" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const analysisMode = (body.analysisMode as string) || "beginner";
      const modeInstructions: Record<string, string> = {
        beginner: "Explain like teaching a curious 10-year-old. Use simple words, fun analogies, and emojis. Make it engaging and easy to understand.",
        thinker: "Provide a logical, structured analysis. Break down the reasoning, show cause-and-effect, and highlight key insights systematically.",
        story: "Transform the content into an engaging narrative. Use metaphors, create a journey through the material, make it memorable through storytelling.",
        mastery: "Provide expert-level analysis. Include technical details, nuances, connections to broader concepts, and academic-style insights."
      };
      systemPrompt = `You are MiniMind File Analyst - an expert at understanding and explaining documents, images, and data.

ANALYSIS INSTRUCTIONS:
${modeInstructions[analysisMode] || modeInstructions.beginner}

For the content provided:
1. Identify the main topics and themes
2. Extract key concepts and arguments
3. Note important patterns or data points
4. Explain the significance and implications
5. Summarize the core message

Be thorough but clear. Help the user truly UNDERSTAND the content, not just know what's in it.`;
      const langPrompt = languagePrompts[language] || languagePrompts.en;
      systemPrompt = `${systemPrompt}\n\n${langPrompt}`;
    } else if (type === "learning_path") {
      if (!prompt) {
        return new Response(
          JSON.stringify({ error: "prompt is required for learning_path type" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const pathType = (body.pathType as string) || "overview";
      const pathInstructions: Record<string, string> = {
        overview: "Create a 3-step quick overview. Each step should be clear and actionable.",
        week: "Create a 7-day learning plan with daily focus areas and activities.",
        month: "Create a 30-day mastery journey with weekly themes and daily micro-lessons."
      };
      systemPrompt = `You are MiniMind Learning Path Creator - an expert at designing structured learning journeys.

${pathInstructions[pathType] || pathInstructions.overview}

FORMAT YOUR RESPONSE:
- Clear step/day numbering
- Specific learning objectives
- Actionable activities
- Expected outcomes
- Connections between steps

Make the path feel achievable yet comprehensive. Build from basics to mastery.`;
      const langPrompt = languagePrompts[language] || languagePrompts.en;
      systemPrompt = `${systemPrompt}\n\n${langPrompt}`;
    } else if (type === "explain_back_evaluate") {
      if (!prompt) {
        return new Response(
          JSON.stringify({ error: "prompt is required for explain_back_evaluate type" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const originalConcept = (body.originalConcept as string) || "";
      systemPrompt = `You are MiniMind Learning Evaluator - an encouraging but honest teacher who evaluates understanding.

The student was taught this concept:
"${originalConcept}"

Now they've explained it back in their own words. Evaluate their explanation:

1. **Accuracy Score** (0-100%): How correct is their understanding?
2. **What They Got Right**: Celebrate their correct points
3. **Gaps or Misconceptions**: Gently identify what's missing or incorrect
4. **Constructive Feedback**: Specific advice to improve understanding
5. **Suggested Next Step**: What they should study or practice next

Be encouraging but honest. The goal is REAL learning, not just feeling good.

FORMAT:
📊 Accuracy: [X]%

✅ What You Got Right:
[Points]

🔍 Areas to Review:
[Gaps/misconceptions]

💡 My Advice:
[Feedback]

📚 Next Step:
[Suggestion]`;
      const langPrompt = languagePrompts[language] || languagePrompts.en;
      systemPrompt = `${systemPrompt}\n\n${langPrompt}`;
    } else if (type === "continue") {
      if (!messages || messages.length === 0) {
        return new Response(
          JSON.stringify({ error: "messages are required for continue type" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      systemPrompt = modePrompts[mode] || modePrompts.beginner;
      const langPrompt = languagePrompts[language] || languagePrompts.en;
      const purposePrompt = buildPurposeLensPrompt(purposeLens, customLensPrompt || undefined);
      systemPrompt = `${systemPrompt}${purposePrompt}\n\nCONTINUITY: If the user has prior context in the conversation, connect the current concept to the previous one. Show knowledge progression and build cumulative understanding. Always think: "How does this concept fit into a bigger map?"\n\n${langPrompt}`;
    } else {
      if (!prompt) {
        return new Response(
          JSON.stringify({ error: "prompt is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      systemPrompt = modePrompts[mode] || modePrompts.beginner;
      const langPrompt = languagePrompts[language] || languagePrompts.en;
      const purposePrompt = buildPurposeLensPrompt(purposeLens, customLensPrompt || undefined);
      systemPrompt = `${systemPrompt}${purposePrompt}\n\n${langPrompt}`;
    }

    const apiMessages = type === "continue" && messages 
      ? [{ role: "system", content: systemPrompt }, ...messages]
      : [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ];

    const userLabel = userId ?? "guest";
    console.log(`User ${userLabel} - Processing ${type} request, mode: ${mode}, language: ${language}, cost: ${creditCost}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: apiMessages,
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error(`User ${userLabel} - AI gateway error:`, response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI service temporarily unavailable" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const generatedText = data.choices?.[0]?.message?.content || "I couldn't generate a response. Please try again.";

    // --- SERVER-SIDE CREDIT DEDUCTION (after successful AI response) ---
    let creditsRemaining: number | null = null;
    let dailyRemaining: number | null = null;
    let monthlyRemaining: number | null = null;

    if (creditCost > 0 && userId && adminClient) {
      try {
        const { data: deductResult, error: deductError } = await adminClient.rpc('deduct_user_credit', {
          p_user_id: userId,
          p_cost: creditCost
        });

        if (deductError) {
          console.error("Credit deduction error:", deductError.message);
        } else if (deductResult) {
          creditsRemaining = deductResult.credits_remaining ?? null;
          dailyRemaining = deductResult.daily_remaining ?? null;
          monthlyRemaining = deductResult.monthly_remaining ?? null;
          console.log(`User ${userLabel} - Deducted ${creditCost} credits. Remaining: ${creditsRemaining}`);
        }
      } catch (e) {
        console.error("Credit deduction exception:", e);
        // Never block the response — user still gets their AI answer
      }
    }

    return new Response(
      JSON.stringify({ 
        response: generatedText,
        credits_remaining: creditsRemaining,
        daily_remaining: dailyRemaining,
        monthly_remaining: monthlyRemaining,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Chat function error:", error instanceof Error ? error.message : "Unknown error");
    
    const errorMessage = error instanceof Error && error.message.includes("must be")
      ? error.message
      : "An error occurred processing your request";
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
