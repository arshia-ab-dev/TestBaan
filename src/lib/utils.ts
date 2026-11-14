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

export function getBaseUrl(request?: Request): string {
  // اگر درخواست از سمت کلاینت آمده، همیشه دامنه جاری مرورگر را اولویت بده
  if (request) {
    try {
      const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
      const proto = request.headers.get('x-forwarded-proto') || 'http';
      if (host) {
        // برای لوکال‌هاست پروتکل http و برای بقیه دامنه‌ها https
        const cleanProto = host.includes('localhost') ? 'http' : proto;
        return `${cleanProto}://${host}`;
      }
      const url = new URL(request.url);
      return `${url.protocol}//${url.host}`;
    } catch {}
  }

  // در صورت نبود درخواست (Fallback)
  let envUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl) {
    return envUrl.replace(/^\uFEFF/, '').trim().replace(/\/$/, '');
  }

  return 'http://localhost:3000';
}
