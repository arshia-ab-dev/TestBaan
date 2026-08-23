export function toFaNum(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  const faDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return str.replace(/[0-9]/g, (w) => faDigits[parseInt(w, 10)]);
}

export function toEnNum(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  const faDigits = [/۰/g, /۱/g, /۲/g, /۳/g, /۴/g, /۵/g, /۶/g, /۷/g, /۸/g, /۹/g];
  let result = str;
  for (let i = 0; i < 10; i++) {
    result = result.replace(faDigits[i], String(i));
  }
  return result;
}

// تابع تشخیص دقیق دامنه اصلی سایت
export function getBaseUrl(request?: Request): string {
  // ۱. بررسی متغیرهای محیطی با فیلتر کردن کاراکتر پنهان BOM ویندوز
  let envUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl) {
    envUrl = envUrl.replace(/^\uFEFF/, '').trim(); // حذف BOM
    return envUrl.replace(/\/$/, '');
  }

  // ۲. استخراج دقیق پروتکل از خود ریکوئست
  if (request) {
    try {
      const url = new URL(request.url);
      const host = request.headers.get('x-forwarded-host') || url.host;
      const proto = request.headers.get('x-forwarded-proto') || url.protocol.replace(':', '');
      return `${proto}://${host}`;
    } catch {}
  }

  return 'http://localhost:3000';
}