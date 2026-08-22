/**
 * توليد مفاتيح VAPID لتفعيل الإشعارات الدافعة (Web Push).
 * شغّل:  npm run generate:vapid
 * ثم انسخ المفتاحين إلى ملف .env
 */
import webpush from 'web-push';

const keys = webpush.generateVAPIDKeys();

console.log(`
✅ تم توليد مفاتيح VAPID. أضِف هذه الأسطر إلى ملف .env:

NEXT_PUBLIC_VAPID_PUBLIC_KEY="${keys.publicKey}"
VAPID_PRIVATE_KEY="${keys.privateKey}"
VAPID_SUBJECT="mailto:you@example.com"

⚠️  المفتاح الخاص سرّي — لا ترفعه إلى Git ولا تشاركه.
   بعد إضافتها أعد تشغيل الخادم، وستعمل الإشعارات حتى والتطبيق مغلق.
`);
