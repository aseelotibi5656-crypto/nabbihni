import 'server-only';
import { parseArabic } from './parser-ar';
import type { AiParseResult } from '@/lib/types';

/**
 * طبقة المساعد الذكي (AI Integration Layer)
 * ---------------------------------------------------------------------------
 * كل ما يحتاجه التطبيق من الذكاء الاصطناعي يمر عبر الواجهة `AiProvider`.
 * المزوّد الافتراضي `local` قواعدي ويعمل بلا مفاتيح. لتفعيل مزوّد خارجي:
 *
 *   AI_PROVIDER=anthropic        # أو openai
 *   AI_API_KEY=sk-...
 *   AI_MODEL=...
 *
 * أضف مزوّدك في `providers` أدناه ونفّذ نفس الواجهة — لا شيء آخر يتغيّر
 * في التطبيق. الميزات المستقبلية (خطة يومية، تقسيم المهام، تلخيص اليوم)
 * تُضاف كدوال جديدة على نفس الواجهة.
 */

export interface AiContext {
  timezone: string;
  defaultReminderOffsets: number[];
  categories: string[];
  userName: string;
}

export interface AiProvider {
  name: string;
  /** تحويل نص حر إلى مسودّة مهمة */
  parseIntent(text: string, ctx: AiContext): Promise<AiParseResult>;
  /** جاهز للاستخدام؟ */
  ready(): boolean;
}

const localProvider: AiProvider = {
  name: 'local',
  ready: () => true,
  async parseIntent(text, ctx) {
    const result = parseArabic(text, ctx.timezone, ctx.defaultReminderOffsets);
    // مطابقة اسم التصنيف مع تصنيفات المستخدم الفعلية
    if (result.draft.categoryName && !ctx.categories.includes(result.draft.categoryName)) {
      const found = ctx.categories.find((c) => c.includes(result.draft.categoryName!));
      result.draft.categoryName = found ?? null;
    }
    return result;
  },
};

/**
 * مزوّد خارجي (Anthropic / OpenAI) — الهيكل جاهز، ويُفعَّل تلقائياً
 * بمجرد ضبط AI_PROVIDER و AI_API_KEY. يستخدم المحلّل المحلي كخطة بديلة
 * عند أي فشل في الشبكة حتى لا تتوقف الميزة أبداً.
 */
const remoteProvider: AiProvider = {
  name: process.env.AI_PROVIDER || 'remote',
  ready: () => Boolean(process.env.AI_API_KEY),
  async parseIntent(text, ctx) {
    try {
      const response = await callLlm(text, ctx);
      if (response) return response;
    } catch (error) {
      console.warn('[ai] فشل المزوّد الخارجي، تم التحويل للمحلّل المحلي:', error);
    }
    return localProvider.parseIntent(text, ctx);
  },
};

const SYSTEM_PROMPT = `أنت مساعد داخل تطبيق "نَبّهني" لإدارة المهام.
حوّل طلب المستخدم العربي إلى JSON فقط بالشكل التالي دون أي نص إضافي:
{"intent":"create_task|create_event|create_habit|query|unknown","confidence":0..1,
"missing":["date"|"time"|"title"],"clarification":null|"سؤال توضيحي بالعربية",
"draft":{"title":"","date":"YYYY-MM-DD|null","time":"HH:mm|null",
"priority":"low|medium|high|urgent","categoryName":null,"reminderOffsets":[10],
"durationMin":null,"recurrence":null}}
إذا نقصت معلومة أساسية اسأل عنها في clarification ولا تخترع قيمة.`;

async function callLlm(text: string, ctx: AiContext): Promise<AiParseResult | null> {
  const provider = process.env.AI_PROVIDER;
  const key = process.env.AI_API_KEY;
  if (!key) return null;

  const today = new Date().toISOString().slice(0, 10);
  const userPrompt = `اليوم: ${today} (المنطقة الزمنية ${ctx.timezone}). التصنيفات المتاحة: ${ctx.categories.join('، ')}.\nالطلب: ${text}`;

  if (provider === 'anthropic') {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || 'claude-sonnet-4-5',
        max_tokens: 700,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { content?: { text?: string }[] };
    return safeParse(data.content?.[0]?.text ?? '', text);
  }

  if (provider === 'openai') {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.AI_MODEL || 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
      }),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    return safeParse(data.choices?.[0]?.message?.content ?? '', text);
  }

  return null;
}

function safeParse(raw: string, echo: string): AiParseResult | null {
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]) as AiParseResult;
    if (!parsed?.draft?.title) return null;
    return { ...parsed, echo };
  } catch {
    return null;
  }
}

export function aiProvider(): AiProvider {
  const name = process.env.AI_PROVIDER || 'local';
  if (name !== 'local' && remoteProvider.ready()) return remoteProvider;
  return localProvider;
}

export function aiStatus() {
  const provider = aiProvider();
  return {
    provider: provider.name,
    mode: provider.name === 'local' ? ('rules' as const) : ('llm' as const),
    ready: provider.ready(),
  };
}
