'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  {
    q: 'هل نَبّهني مجاني؟',
    a: 'نعم. الخطة المجانية تشمل مهام ومواعيد بلا حدود، تذكيرات فورية، تقويمًا كاملًا، وحتى خمس عادات. الخطط المدفوعة تضيف عادات غير محدودة وإحصائيات متقدمة ومساحات مشتركة.',
  },
  {
    q: 'كيف تصلني التذكيرات؟',
    a: 'عبر إشعارات المتصفح وإشعارات الويب الدافعة (Web Push) التي تصلك حتى والتطبيق مغلق بعد تثبيته على جهازك. ويمكنك تفعيل التذكير عبر البريد الإلكتروني من الإعدادات.',
  },
  {
    q: 'هل أستطيع إضافة أكثر من تذكير للمهمة الواحدة؟',
    a: 'بالتأكيد. يمكنك مثلًا أن تُذكَّر قبل يوم، ثم قبل ساعة، ثم قبل عشر دقائق من الموعد نفسه — وهذا ما نسميه التذكير الذكي.',
  },
  {
    q: 'هل يعمل التطبيق على الجوال؟',
    a: 'نعم. الواجهة مصمّمة أولًا للجوال، والتطبيق قابل للتثبيت على شاشتك الرئيسية كتطبيق مستقل (PWA) يعمل حتى بدون إنترنت في وضع القراءة.',
  },
  {
    q: 'ماذا يفعل المساعد الذكي بالضبط؟',
    a: 'تكتب طلبك بلغتك الطبيعية مثل «ذكرني أذاكر الفصل الثالث يوم الخميس الساعة ٧ مساءً»، فيحوّله إلى مهمة كاملة بتاريخها ووقتها وتذكيرها، ويعرضها عليك للموافقة قبل الحفظ. وإذا كان الطلب ناقصًا يسألك بدل أن يخمّن.',
  },
  {
    q: 'ماذا يحدث إذا لم أنجز مهمة في وقتها؟',
    a: 'يظهر لك اقتراح لإعادة جدولتها مع أوقات مناسبة مبنية على جدولك الحالي، وتستطيع اختيار وقت مخصص في أي لحظة.',
  },
  {
    q: 'هل بياناتي آمنة؟',
    a: 'كلمات المرور تُخزَّن مجزّأة بـ bcrypt، والجلسات محميّة بكوكيز HttpOnly قابلة للإبطال الفوري، وكل استعلام في النظام مقيَّد بمعرّف المستخدم فلا يمكن لأي حساب رؤية بيانات حساب آخر.',
  },
  {
    q: 'هل تدعمون المناطق الزمنية؟',
    a: 'نعم. كل الأوقات تُخزَّن بتوقيت UTC وتُعرض بتوقيتك المحلي. إن كنت في السعودية ستظهر مواعيدك بتوقيت الرياض، وإن سافرت غيّرت المنطقة من ملفك الشخصي وبقيت مواعيدك صحيحة.',
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-3xl divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface">
      {items.map((item, index) => {
        const isOpen = open === index;
        return (
          <div key={item.q}>
            <button
              onClick={() => setOpen(isOpen ? null : index)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 px-5 py-5 text-right transition-colors hover:bg-fg/[.02] sm:px-6"
            >
              <span className="text-[15px] font-bold sm:text-base">{item.q}</span>
              <Plus
                className={cn(
                  'h-5 w-5 shrink-0 text-muted transition-transform duration-300',
                  isOpen && 'rotate-45 text-brand',
                )}
              />
            </button>
            <div
              className={cn(
                'grid transition-all duration-300 ease-out',
                isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
              )}
            >
              <div className="overflow-hidden">
                <p className="px-5 pb-5 text-[15px] leading-loose text-muted sm:px-6">{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
