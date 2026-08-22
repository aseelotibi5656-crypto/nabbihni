import 'server-only';

/**
 * طبقة تكامل البريد الإلكتروني
 * ---------------------------------------------------------------------------
 * مزوّد افتراضي `console` يطبع الرسالة في الطرفية أثناء التطوير — وهذا يجعل
 * روابط تفعيل البريد وإعادة تعيين كلمة المرور تعمل فعلياً بدون أي حساب خارجي.
 *
 * لتفعيل الإرسال الحقيقي: عيّن في .env
 *   EMAIL_PROVIDER=resend
 *   RESEND_API_KEY=re_xxx
 * أو أضف مزوّدك الخاص في `providers` أدناه (SES، Postmark، SMTP…).
 */

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

type Provider = (message: EmailMessage) => Promise<{ ok: boolean; id?: string; error?: string }>;

const providers: Record<string, Provider> = {
  /** يطبع الرسالة في الطرفية — الوضع الافتراضي في التطوير */
  console: async (message) => {
    console.log(
      [
        '',
        '┌───────────────── ✉️  بريد صادر (وضع التطوير) ─────────────────',
        `│ إلى: ${message.to}`,
        `│ الموضوع: ${message.subject}`,
        '│',
        ...message.html
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .match(/.{1,70}/g)!
          .map((line) => `│ ${line}`),
        '└──────────────────────────────────────────────────────────────',
        '',
      ].join('\n'),
    );
    return { ok: true, id: 'console' };
  },

  /** Resend — يحتاج RESEND_API_KEY فقط */
  resend: async (message) => {
    const key = process.env.RESEND_API_KEY;
    if (!key) return { ok: false, error: 'RESEND_API_KEY غير معرّف' };
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'نَبّهني <onboarding@resend.dev>',
        to: [message.to],
        subject: message.subject,
        html: message.html,
      }),
    });
    if (!response.ok) return { ok: false, error: await response.text() };
    const data = (await response.json()) as { id?: string };
    return { ok: true, id: data.id };
  },
};

export async function sendEmail(message: EmailMessage) {
  const name = process.env.EMAIL_PROVIDER || 'console';
  const provider = providers[name] ?? providers.console;
  try {
    return await provider(message);
  } catch (error) {
    console.error('[email]', error);
    return { ok: false, error: (error as Error).message };
  }
}

const shell = (title: string, body: string, cta?: { label: string; url: string }) => `
<div dir="rtl" style="font-family:system-ui,'Segoe UI',Tahoma,sans-serif;background:#f6f7fb;padding:32px">
  <div style="max-width:520px;margin:auto;background:#fff;border-radius:18px;padding:32px;border:1px solid #eceef4">
    <div style="font-size:22px;font-weight:800;color:#4f46e5;margin-bottom:18px">نَبّهني</div>
    <h1 style="font-size:19px;color:#0f172a;margin:0 0 12px">${title}</h1>
    <div style="font-size:15px;line-height:1.9;color:#475569">${body}</div>
    ${
      cta
        ? `<a href="${cta.url}" style="display:inline-block;margin-top:22px;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 26px;border-radius:12px;font-weight:600">${cta.label}</a>
           <p style="font-size:12px;color:#94a3b8;margin-top:18px;word-break:break-all">أو انسخ الرابط: ${cta.url}</p>`
        : ''
    }
    <p style="font-size:12px;color:#94a3b8;margin-top:26px;border-top:1px solid #eceef4;padding-top:14px">
      صُنع بواسطة otbAseel
    </p>
  </div>
</div>`;

export function verificationEmail(name: string, url: string): EmailMessage {
  return {
    to: '',
    subject: 'فعّل بريدك في نَبّهني',
    html: shell(
      `أهلاً ${name} 👋`,
      'خطوة أخيرة لتفعيل حسابك: اضغط الزر أدناه لتأكيد بريدك الإلكتروني. الرابط صالح لمدة ٢٤ ساعة.',
      { label: 'تفعيل البريد', url },
    ),
  };
}

export function resetPasswordEmail(name: string, url: string): EmailMessage {
  return {
    to: '',
    subject: 'إعادة تعيين كلمة المرور — نَبّهني',
    html: shell(
      `مرحبًا ${name}`,
      'وصلنا طلب لإعادة تعيين كلمة المرور. الرابط صالح لمدة ساعة واحدة، وإذا لم تطلب ذلك تجاهل هذه الرسالة بأمان.',
      { label: 'إعادة تعيين كلمة المرور', url },
    ),
  };
}
