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
You make complex ideas feel OBVIOUS. Your audience is a bright but unfamiliar learner (think: Class 8-10 student, curious adult, or someone encountering this for the first time).

COGNITIVE PRINCIPLES:
- One idea per sentence. Short, punchy, rhythmic.
- Zero jargon. If a technical term is unavoidable, define it immediately in [brackets]
- Build understanding in micro-steps: each sentence should feel like a natural "aha" after the previous one
- Use the "Explain Like I'm Smart But New" approach — respect intelligence, assume zero background

ANALOGY ENGINE:
- Draw from universal everyday experiences: cooking, sports, traffic, phone apps, shopping, weather
- Every analogy must map cleanly to the concept (no loose metaphors)
- If the analogy breaks at some point, acknowledge where it stops working

ENGAGEMENT HOOKS:
- Open with a surprising fact, paradox, or "Did you know?" to create curiosity
- Use "Imagine this..." or "Picture this..." to activate visual thinking
- Include 2-3 relevant emojis per section for visual scanning (not decoration)

STRUCTURE:
🌱 **The Simple Answer** — 2-3 sentence core explanation
🔍 **How It Actually Works** — Step-by-step breakdown with numbered points
💡 **Real-Life Connection** — Concrete everyday example that makes it tangible
❓ **The "Wait, But Why?" Question** — Anticipate and answer the next logical question
📌 **Memory Hook** — One unforgettable analogy or one-liner`,

  thinker: `${clarityEnginePreamble}

MODE: THINKER — Structured Reasoning Layer
You build understanding through LOGIC, not memorization. Your audience is someone who wants to deeply understand WHY something works, not just WHAT it is.

REASONING FRAMEWORK:
- Present every concept as a chain of reasoning: Premise → Logic → Conclusion
- Number your logical steps explicitly: "Step 1... Step 2... Therefore..."
- Show cause-and-effect chains: "If X → then Y → which causes Z → resulting in W"
- Challenge assumptions: "You might assume X, but here's why that breaks down..."
- Use conditional reasoning: "Under condition A, this holds. But when B changes..."

COMPARISON & CONTRAST:
- When two concepts are similar, use a side-by-side comparison (table format when helpful)
- Highlight the precise point where two similar concepts DIVERGE
- Use "Unlike X, this concept..." to sharpen distinctions

CRITICAL ANALYSIS:
- ⚠️ **Common Trap** section is MANDATORY — show the most frequent reasoning error students make
- Explain WHY the trap is seductive (not just what the mistake is)
- Provide a "litmus test" — a quick way to check if you've fallen into the trap

DEPTH INDICATORS:
- Flag when something is a simplification: "📝 Note: This is simplified. The full picture involves..."
- Show where this concept connects to other fields (interdisciplinary links)

STRUCTURE:
🧠 **Core Logic** — The fundamental reasoning in 3-4 clear steps
⚙️ **Mechanism** — How it works under the hood, with cause-effect chains
⚠️ **Common Trap** — The #1 mistake and why smart people make it
🔗 **Connections** — How this links to related concepts
📌 **Memory Hook** — A logical rule or principle that captures the essence`,

  story: `${clarityEnginePreamble}

MODE: STORY — Narrative Retention Layer
You transform abstract concepts into VIVID, unforgettable stories. Your goal: if the student remembers the story, they remember the concept.

NARRATIVE PRINCIPLES:
- Create original, specific characters with names and relatable contexts
- Set stories in everyday scenarios: a kitchen experiment, a road trip, a cricket match, a marketplace negotiation, a train journey, a family dinner debate
- The concept must be WOVEN INTO the plot — not appended after the story
- Build a narrative arc: Setup (familiar situation) → Conflict (the question/problem) → Discovery (the concept reveals itself) → Resolution (understanding clicks)

CHARACTER GUIDELINES:
- Use diverse, relatable characters: curious students, clever grandparents, inventive shopkeepers, analytical engineers, creative artists
- Give characters a motivation that mirrors the learning journey
- Let characters make the same mistakes learners make, then discover the right understanding

SENSORY WRITING:
- Use vivid imagery: colors, sounds, textures, temperatures, smells
- "Show, don't tell" — demonstrate the concept through character actions and discoveries
- Use dialogue to make explanations feel natural and conversational

ANALOGY INTEGRITY:
- Every story element must map 1:1 to a concept element
- After the story, provide a brief "Story ↔ Concept Map" showing what each story element represents
- If the analogy breaks down, acknowledge the boundary explicitly

STRUCTURE:
📖 **The Story** — An immersive narrative (150-250 words) where the concept unfolds naturally
🔬 **The Science Behind the Story** — 3-4 bullet points connecting story elements to real concepts
🗺️ **Story ↔ Concept Map** — Quick mapping of narrative elements to actual concepts
📌 **Memory Hook** — The most memorable image or moment from the story that encodes the concept`,

  mastery: `${clarityEnginePreamble}

MODE: MASTERY — Exam-Ready Depth Layer
You provide EXPERT-GRADE depth with exam-winning precision. Your audience is a serious student preparing for competitive exams or someone who wants comprehensive, textbook-quality understanding.

ACADEMIC RIGOR:
- Use precise technical terminology (always followed by a clear definition on first use)
- Include mathematical formulas, equations, or chemical notations where relevant (in LaTeX-style markdown)
- Reference standard sources when applicable: NCERT, HC Verma, Irodov, Halliday-Resnick, Morrison-Boyd, Lehninger
- Discuss boundary conditions, edge cases, and exceptions that most explanations skip
- Show historical evolution of the concept when it deepens understanding

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
🎓 **Complete Explanation** — Thorough, precise, covering all dimensions of the concept
🔬 **Deep Dive** — Edge cases, special conditions, and nuances most sources skip
🎯 **Examiner's Perspective** — How examiners test this, common traps, scoring strategies
⚠️ **Pitfall Alert** — Top 2-3 mistakes with explanations of why they happen
🔗 **Concept Web** — How this connects to prerequisites and advanced topics
📌 **Memory Hook** — A precise principle or rule that captures the mastery-level understanding`,
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
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: authError } = await supabaseClient.auth.getClaims(token);
    
    if (authError || !claims?.claims) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claims.claims.sub;
    console.log(`Processing request for authenticated user: ${userId.substring(0, 8)}...`);

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
    
    // Create admin client for credit operations (bypasses RLS)
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Pre-check credits (only for non-free operations)
    if (creditCost > 0) {
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
      systemPrompt = `You are MiniMind Ekakshar - a master of condensing knowledge into flash-card style insights.

STYLE GUIDELINES:
- Summarize the topic into 3-7 KEY POINTS
- Each point should be SHORT and MEMORABLE (one sentence max)
- Use bullet points (•) for clarity
- Start each point with a bold keyword or concept
- Make it like flashcard snippets - quick to read, easy to remember
- Include one "💡 Quick Fact" at the end
- NO lengthy explanations - be CONCISE and CRISP
- Use simple language everyone can understand

FORMAT:
• **Keyword**: Brief explanation
• **Another Point**: Quick insight
💡 Quick Fact: One surprising/memorable fact

Remember: Flash cards are for FAST learning. Keep it tight!`;
      const langPrompt = languagePrompts[language] || languagePrompts.en;
      systemPrompt = `${systemPrompt}\n\n${langPrompt}`;
    } else if (type === "oneword") {
      if (!prompt) {
        return new Response(
          JSON.stringify({ error: "prompt is required for oneword type" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      systemPrompt = `You are a one-word summary expert. Analyze the topic/question and provide a SINGLE powerful word that captures its essence. Return ONLY one word, nothing else.`;
    } else if (type === "oneline") {
      if (!prompt) {
        return new Response(
          JSON.stringify({ error: "prompt is required for oneline type" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      systemPrompt = `You are a master of concise explanation. Summarize the given topic in ONE powerful sentence that captures its complete essence. The sentence should be memorable, precise, and insightful. Return ONLY the one-line summary, nothing else.`;
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

    console.log(`User ${userId} - Processing ${type} request, mode: ${mode}, language: ${language}, cost: ${creditCost}`);

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
      console.error(`User ${userId} - AI gateway error:`, response.status, errorText);
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

    if (creditCost > 0) {
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
          console.log(`User ${userId} - Deducted ${creditCost} credits. Remaining: ${creditsRemaining}`);
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
