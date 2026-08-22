/**
 * يطبّق السمة قبل رسم أول إطار لمنع وميض الشاشة البيضاء (FOUC)
 * عند تحميل الصفحة في الوضع الليلي.
 */
const script = `(function(){try{
  var t = localStorage.getItem('nabbihni-theme') || 'system';
  var dark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
}catch(e){}})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} suppressHydrationWarning />;
}
