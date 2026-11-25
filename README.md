# 🎯 تست‌بان (TestBaan)

سامانه هوشمند و مدرن مدیریت آزمون، کتاب‌ها/مجموعه‌ها و پاسخ‌برگ‌های الکترونیکی استاندارد (چیدمان ستونی و ۱۰‌تایی کنکوری) با قابلیت تحلیل درس‌به‌درس، تگ‌گذاری چندگانه و بانک تست‌های نشان‌دار.

این پروژه با **معماری تک‌برنچ دوگانه (Single-Branch Hybrid Architecture)** طراحی شده است و بدون تغییر در کدهای اصلی، هم روی زیرساخت ابری **Cloudflare Workers + D1** و هم به صورت **Self-Hosted روی Windows Server (Node.js + IIS + SQLite)** قابل اجراست.

---

## ✨ ۱. معرفی پروژه و معماری (Overview & Architecture)

### قابلیت‌های کلیدی
* **معماری دیتابیس یکپارچه (`src/lib/db.ts`):** تشخیص خودکار محیط اجرا؛ استفاده از **Cloudflare D1** در محیط ابری و درایور **`@libsql/client`** (با فایل محلی `testbaan.db` در حالت WAL) روی ویندوز سرور.
* **مسیریابی هوشمند چنددامنه‌ای (`getBaseUrl`):** تشخیص پویای دامنه و پروتکل از روی هدرهای درخواست مرورگر برای پشتیبانی همزمان از دامنه‌های مختلف (عمومی، CDN، تانل، Tailscale و شبکه محلی).
* **احراز هویت سه‌گانه و امن:**
  * ورود با **Google OAuth 2.0** (دارای قفل امنیتی تک‌دستگاهه).
  * ورود بدون رمز با کد یک‌بار مصرف ایمیل (**OTP** از طریق Gmail REST API).
  * ثبت‌نام و ورود با **ایمیل + رمز عبور** (هش امن PBKDF2 + تایید دو مرحله‌ای ایمیل در ثبت‌نام و بازیابی رمز).
* **پاسخ‌برگ استاندارد کنکوری:** چیدمان ریسپانسیو ستونی (۱۰تایی)، ذخیره خودکار ابری و محلی، تایمر آزمون زمان‌دار و مودال‌های اختصاصی جایگزین `alert`/`confirm`.
* **تصحیح هوشمند و درصدگیری مبحثی:** تعریف مباحث (`ریاضی: 1-10 | فیزیک: 11-20`)، هماهنگی دوطرفه بین فیلد ورود سریع کلیدها و گزینه‌ها، و پشتیبانی از سوالات بدون پاسخ صحیح/حذف‌شده (`?`) بدون محاسبه نمره منفی.
* **تگ‌گذاری چندگانه و بانک تست‌ها (`/bookmarks`):** پالت ۲۰ رنگ، پاپ‌اور تگ‌گذاری حین آزمون، نشانگرهای چندرنگ و صفحه فیلتر و مرور تست‌های نشان‌دار.
* **پشتیبانی از اجرای آفلاین (LAN):** میزبانی بومی فایل‌های فونت **Vazirmatn** (`.woff2`) داخل `public/fonts/` بدون نیاز به اینترنت برای رندر رابط کاربری.

### پشته فناوری (Tech Stack)
* **Frontend & Backend:** Next.js 16 • React 19 • TypeScript • Tailwind CSS v4
* **Cloud Runtime:** Cloudflare Workers (`@opennextjs/cloudflare`) + Cloudflare D1
* **Self-Hosted Runtime:** Node.js 22 LTS + IIS Reverse Proxy + `@libsql/client` (SQLite)

---

## 🔑 ۲. پیش‌نیاز مشترک: پیکربندی Google Cloud و Gmail API

برای فعال‌سازی «ورود با گوگل» و «ارسال ایمیل‌های OTP»، یک‌بار مراحل زیر را در گوگل انجام دهید:

1. در [Google Cloud Console](https://console.cloud.google.com) یک پروژه جدید بسازید و از بخش **APIs & Services > Library** سرویس **Gmail API** را جستجو و **Enable** کنید.
2. به بخش **OAuth consent screen / Audience** بروید:
   * نوع را روی **External** بگذارید، نام اپ، ایمیل پشتیبانی و دامنه مجاز (مثلاً `yourdomain.com`) را ثبت کنید.
   * در بخش **Scopes** دسترسی‌های `userinfo.email`، `userinfo.profile` و `https://www.googleapis.com/auth/gmail.send` را اضافه کنید.
   * ⚠️ **حیاتی:** پس از پایان، حتماً روی دکمه **Publish App** کلیک کنید تا وضعیت برنامه به **`In Production`** تغییر یابد (در حالت *Testing*، توکن ارسال ایمیل پس از ۷ روز منقضی می‌شود).
3. به بخش **Credentials / Clients** بروید، یک **OAuth Client ID** از نوع **Web application** بسازید و تمام آدرس‌های بازگشت را در **Authorized redirect URIs** ثبت کنید:
   ```text
   https://developers.google.com/oauthplayground
   https://your-domain.com/api/auth/callback/google
   https://local.your-domain.com/api/auth/callback/google
   http://localhost:3000/api/auth/callback/google
   ```
   *(مقادیر `GOOGLE_CLIENT_ID` و `GOOGLE_CLIENT_SECRET` را ذخیره کنید).*
4. **استخراج دائمی `GOOGLE_REFRESH_TOKEN`:**
   * وارد [Google OAuth Playground](https://developers.google.com/oauthplayground) شوید، از آیکون ⚙️ بالا سمت راست گزینه **Use your own OAuth credentials** را تیک بزنید و Client ID و Secret خود را وارد کنید.
   * در **Step 1** اسکوپ `https://www.googleapis.com/auth/gmail.send` را انتخاب کرده و **Authorize APIs** را بزنید (در صفحه هشدار روی *Advanced > Go to ... (unsafe)* بزنید و تایید کنید).
   * در **Step 2** دکمه **Exchange authorization code for tokens** را بزنید و مقدار **Refresh token** را کپی کنید.

---

## ☁️ ۳. مسیر اول: استقرار ابری روی Cloudflare Workers + D1

### ۱. آماده‌سازی دیتابیس Cloudflare D1
1. در پنل کلودفلر، به بخش **Storage & Databases > D1** بروید و یک دیتابیس به نام **`testbaan-db`** بسازید.
2. وارد تب **Console** دیتابیس شوید و محتوای فایل `schema.sql` را اجرا کنید (مطمئن شوید جدول `user_tags` نیز ایجاد شده باشد).

### ۲. تنظیم فایل `wrangler.jsonc`
برای جلوگیری از تداخل بین اکانت‌ها و کارکرد درست ویزارد ایمپورت کلودفلر:
* فیلد `database_id` (مخصوص اکانت دیگر) و `migrations_dir` (در صورت نبود پوشه `migrations`) را در `wrangler.jsonc` قرار ندهید:
```jsonc
{
	"$schema": "node_modules/wrangler/config-schema.json",
	"name": "testbaan",
	"main": ".open-next/worker.js",
	"compatibility_date": "2026-08-08",
	"compatibility_flags": ["nodejs_compat", "global_fetch_strictly_public"],
	"assets": { "binding": "ASSETS", "directory": ".open-next/assets" },
	"observability": { "enabled": true },
	"d1_databases": [
		{ "binding": "testbaan_db", "database_name": "testbaan-db" }
	]
}
```

### ۳. استقرار از طریق گیت‌هاب (Fork & Auto-Deploy)
1. ریپازیتوری را **Fork** کنید.
2. در پنل کلودفلر به **Workers & Pages > Create > Import a repository** بروید و ریپازیتوری را متصل کنید:
   * **Build command:** `npm run open-build`
   * **Deploy command:** `npm run open-deploy`
3. > 💡 **دور زدن باگ کش ۳۰ دقیقه‌ای ویزارد Import کلودفلر:** اگر هنگام Import مخزن با خطای `There was a problem parsing the Wrangler configuration file` روبه‌رو شدید، یک‌بار از یک پوشه تمیز با CLI دیپلوی اولیه را بزنید (`npx wrangler login` ➔ `npm run open-build` ➔ `npm run open-deploy`) و سپس از داخل تنظیمات همان ورکر ساخته شده (**Settings > Build**) گیت‌هاب را وصل کنید (**Connect Git**).

### ۴. تنظیم متغیرها و سکرت‌ها (`Secret` در برابر `Text`)
در بخش **Settings > Variables and Secrets** ورکر، ۳ متغیر گوگل را اضافه کنید:
* `GOOGLE_CLIENT_ID`
* `GOOGLE_CLIENT_SECRET`
* `GOOGLE_REFRESH_TOKEN`

> ⚠️ **نکته مهم درباره نوع متغیرها:**  
> وقتی بخش `vars` در `wrangler.jsonc` نباشد، دیپلوی‌های بعدی گیت‌هاب/Wrangler متغیرهای از نوع `Text` داشبورد را پاک می‌کنند (مگر اینکه `"keep_vars": true` بگذارید). اما متغیرهای از نوع **`Secret`** رمزگذاری شده و **هرگز در دیپلوی‌ها پاک نمی‌شوند**. بنابراین پیشنهاد می‌شود هر ۳ متغیر را با نوع **`Secret`** بسازید.

* در تب **Bindings** نیز بررسی کنید دیتابیس `testbaan-db` با نام بایندینگ **`testbaan_db`** به ورکر متصل باشد.

### ۵. تنظیمات DNS ایمیل و CDN واسط (Gcore)
* **جلوگیری از اسپم شدن ایمیل‌های OTP:** در بخش DNS کلودفلر این دو رکورد `TXT` را اضافه کنید:
  * **SPF:** نام `@` ➔ مقدار `v=spf1 include:_spf.google.com ~all`
  * **DMARC:** نام `_dmarc` ➔ مقدار `v=DMARC1; p=none; rua=mailto:your-email@gmail.com` *(پس از چند هفته اطمینان از سلامت ارسال‌ها می‌توانید به `p=quarantine` تغییر دهید).*
* **قوانین کش در صورت استفاده از Gcore CDN:** کش را **فقط** برای `/_next/static/*` و `/fonts/*` فعال کنید؛ مسیرهای پویا مانند `/api/*`، `/dashboard*`، `/exam*`، `/admin*` و هدر `Set-Cookie` باید حتماً روی **Bypass Cache** باشند.

---

## 🖥️ ۴. مسیر دوم: استقرار Self-Hosted روی Windows Server + IIS

### ۱. نصب پیش‌نیازهای ویندوز سرور
1. **Node.js 22 LTS** و **Git for Windows** را نصب کنید.
2. از طریق **Server Manager > Add roles and features** نقش **Web Server (IIS)** را نصب کنید.
3. دو ماژول رسمی مایکروسافت را دانلود و نصب کنید:
   * **URL Rewrite 2.1**
   * **Application Request Routing (ARR) 3.0**
4. پورت‌های **80** و **443** را در فایروال ویندوز باز کنید:
   ```powershell
   New-NetFirewallRule -DisplayName "IIS HTTP 80" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow
   New-NetFirewallRule -DisplayName "IIS HTTPS 443" -Direction Inbound -LocalPort 443 -Protocol TCP -Action Allow
   ```

### ۲. دریافت پروژه، تنظیم `.env.local` و بیلد
1. پروژه را در مسیری مثل `C:\inetpub\TestBaan` کلون و پکیج‌ها را نصب کنید:
   ```powershell
   git clone https://github.com/<username>/TestBaan.git C:\inetpub\TestBaan
   cd C:\inetpub\TestBaan
   npm install
   ```
2. فایل `.env.local` را با انکودینگ **UTF-8 بدون BOM** بسازید (برای پشتیبانی همزمان از چند دامنه، `APP_URL` را خالی بگذارید تا از هدرهای مرورگر خوانده شود):
   ```env
   GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID"
   GOOGLE_CLIENT_SECRET="YOUR_GOOGLE_CLIENT_SECRET"
   GOOGLE_REFRESH_TOKEN="YOUR_GOOGLE_REFRESH_TOKEN"
   ```
3. پروژه را کامپایل و اجرا کنید:
   ```powershell
   npm run build
   npm run start
   ```

### ۳. اجرای دائمی در پس‌زمینه (سرویس ویندوز با NSSM)
> ⚠️ **توجه (تست نشده):** روش استفاده از فایل کانفیگ PM2 در تست‌های اولیه روی این محیط بدون خطا عمل نکرد و روش جایگزین زیر با **NSSM** هنوز روی پروژه تست عملی نشده است؛ در حال حاضر اجرای تایید‌شده و تضمینی از طریق همان دستور مستقیم `npm run start` در ترمینال انجام شده است.

برای تبدیل شدن سرور Next.js به یک سرویس بومی ویندوز (بدون تداخل کاراکترهای PowerShell 7 در PM2)، روش پیشنهادی استفاده از ابزار رایگان **NSSM (Non-Sucking Service Manager)** است:
1. ابزار [NSSM](https://nssm.cc/download) را دانلود کرده و در ترمینال Admin دستور `nssm install TestBaan` را بزنید.
2. در پنجره گرافیکی باز شده:
   * **Path:** مسیر `node.exe` (مثلاً `C:\Program Files\nodejs\node.exe`)
   * **Startup directory:** `C:\inetpub\TestBaan`
   * **Arguments:** `node_modules\next\dist\bin\next start -p 3000`
3. روی **Install service** کلیک کرده و از بخش `services.msc` سرویس را Start کنید.

### ۴. DNS محلی و دریافت گواهی SSL رسمی (`win-acme`)
برای دسترسی HTTPS در شبکه محلی بدون نیاز به باز کردن پورت مودم یا نصب دستی گواهی روی گوشی‌ها/لپ‌تاپ‌ها:
1. در DNS کلودفلر یک رکورد `A` برای زیردامنه محلی (مثلاً `local.testbaan`) با IP محلی سرور (مثلاً `192.168.1.50`) در حالت **DNS Only (ابر خاکستری)** بسازید.
2. در پروفایل کلودفلر یک **API Token** با قالب **Edit zone DNS** برای دامنه خود بسازید.
3. آخرین نسخه **`win-acme`** (`pluggable.zip`) و پلاگین **`win-acme.plugin.validation.dns.cloudflare.zip`** را از گیت‌هاب دانلود و در پوشه `C:\win-acme` اکسترکت کنید.
4. *(در سرورهای ایران به دلیل تحریم سرورهای ZeroSSL/Let's Encrypt، هنگام اجرا حتماً پروکسی/Tun Mode سیستم را روشن کنید).*
5. فایل `wacs.exe` را (ترجیحاً با سوییچ `--notaskscheduler` جهت جلوگیری از ساخت تسک تمدید خودکار) اجرا کنید:
   ```powershell
   .\wacs.exe --notaskscheduler
   ```
   * **مراحل داخل ویزارد:** `M` (Full options) ➔ `2` (Manual input) ➔ وارد کردن دامنه (`local.testbaan.yourdomain.com`) ➔ `4` (Single certificate) ➔ انتخاب **`[dns] Create verification records in Cloudflare DNS`** ➔ وارد کردن Cloudflare API Token ➔ انتخاب `RSA` ➔ ذخیره در **`Windows Certificate Store (WebHosting)`** ➔ مرحله دوم ذخیره به صورت **PFX** (جهت بکاپ) ➔ نصب در IIS روی **`Default Web Site`**.
6. ⚠️ **نکته مهم درباره تمدید خودکار گواهی:** به دلیل محدودیت/تحریم آی‌پی‌های ایران، تسک تمدید خودکار ویندوز بدون فعال بودن VPN با خطا مواجه می‌شود. اگر از سوییچ `--notaskscheduler` استفاده نکردید، وارد **Task Scheduler (`taskschd.msc`)** شوید و تسک `win-acme renew` را **Disable** کنید و هر ۶۰ تا ۸۰ روز یک‌بار پس از روشن کردن پروکسی، گواهی را دستی تمدید نمایید (`wacs.exe --renew`).

### ۵. پیکربندی حیاتی IIS Reverse Proxy (چک‌لیست گرافیکی)
1. وارد **IIS Manager (`inetmgr`)** شوید و روی **نام اصلی سرور** در پنل چپ کلیک کنید:
   * وارد **Application Request Routing Cache > Server Proxy Settings** شوید:
     * ✅ تیک **`Enable proxy`** را بزنید.
     * ✅ تیک **`Preserve host header`** را بزنید.
     * ❌ **تیک `Reverse rewrite host in response headers` را حتماً بردارید** *(در غیر این صورت IIS هنگام ورود با گوگل، دامنه `accounts.google.com` را با دامنه خودتان جایگزین کرده و خطای 404 می‌دهد!)*.
   * روی **Apply** کلیک کنید.
2. روی **`Default Web Site`** کلیک کرده و وارد **Bindings...** شوید:
   * پورت **80 (`http`)** و پورت **443 (`https` همراه با SNI و گواهی صادر شده)** را برای نام دامنه محلی ست کنید.
3. وارد **URL Rewrite** سایت شوید:
   * از ستون سمت راست روی **View Server Variables...** کلیک کرده و این دو متغیر را اضافه (Whitelist) کنید:
     * `HTTP_X_FORWARDED_HOST`
     * `HTTP_X_FORWARDED_PROTO`
4. دو قانون **Inbound Rule** را دقیقاً به ترتیب اولویت زیر بسازید (قانون اول باید بالاتر باشد):
   * **اولویت ۱ (`Force HTTPS Redirect`):**
     * Pattern: `(.*)`
     * Condition: `{HTTPS}` مطابق `^OFF$`
     * Action: **Redirect (301)** به `https://{HTTP_HOST}/{R:1}` *(ضروری برای جلوگیری از حذف کوکی‌های `Secure` در حالت HTTP)*.
   * **اولویت ۲ (`ReverseProxyInboundRuleHTTPS`):**
     * Pattern: `(.*)`
     * Condition: `{HTTPS}` مطابق `on`
     * Server Variables: ست کردن `HTTP_X_FORWARDED_HOST` به `{HTTP_HOST}` و `HTTP_X_FORWARDED_PROTO` به `https`
     * Action: **Rewrite** به `http://localhost:3000/{R:1}`
5. در نهایت یک‌بار دستور `iisreset` را در ترمینال اجرا کنید.

---

## 🔒 ۵. دسترسی خصوصی تیم از راه دور با Tailscale (اختیاری)

برای دسترسی امن و پایدار اعضای تیم از خارج شبکه محلی (بدون نیاز به Port Forwarding یا تانل کلودفلر):
1. نرم‌افزار **Tailscale** را روی ویندوز سرور نصب و لاگین کنید.
2. در پنل [Tailscale DNS](https://login.tailscale.com/admin/dns) گزینه‌های **MagicDNS** و **HTTPS Certificates** را فعال کنید.
3. برای صدور گواهی SSL اختصاصی دامنه تیل‌اسکیل در پاورشل بزنید:
   ```powershell
   tailscale cert <server-name>.<tailnet-name>.ts.net
   ```
4. گواهی را در Binding پورت ۴۴۳ IIS برای نام دامنه `.ts.net` تنظیم کرده و آدرس `https://<server-name>.<tailnet-name>.ts.net/api/auth/callback/google` را در **Authorized redirect URIs** کنسول گوگل اضافه کنید.

---

## 💾 ۶. مدیریت دیتابیس: بکاپ‌گیری و انتقال دوطرفه (D1 ⇄ SQLite)

اسکریپت‌های آماده در `package.json` برای خروجی و انتقال دوطرفه داده‌ها تعبیه شده‌اند:

### ۱. انتقال از Cloudflare D1 به سرور ویندوز (Cloud ➔ Local)
1. **دریافت فایل بکاپ از کلودفلر:**
   * **از پنل وب:** وارد دیتابیس D1 > تب **Backups** > دکمه **Export Database** شوید و فایل دانلود شده را با نام `remote-dump.sql` در روت پروژه بگذارید.
   * **از طریق CLI:**
     ```powershell
     npm run db:export-cf
     ```
2. **تزریق به دیتابیس محلی (`testbaan.db`):**
   ```powershell
   npm run db:import-local
   ```

### ۲. بکاپ `.sql` از دیتابیس محلی و انتقال به سرور جدید یا Cloudflare D1 (Local ➔ Cloud / New Server)
1. **خروجی استاندارد `.sql` از `testbaan.db`:**  
   این دستور تغییرات حافظه موقت `-wal` را ادغام کرده و فایل `local-dump.sql` می‌سازد:
   ```powershell
   npm run db:export-local
   ```
2. **بازگردانی فایل `local-dump.sql` در مقصد:**
   * **انتقال به Cloudflare D1 (ورکر ابری):**
     ```powershell
     npm run db:import-cf
     ```
   * **انتقال به یک سرور ویندوز جدید:**  
     فایل `local-dump.sql` را در پوشه پروژه سرور جدید قرار دهید و اجرا کنید:
     ```powershell
     node import-dump.js local-dump.sql
     ```

### ۳. بکاپ‌گیری سریع فایلی روی سرور ویندوز
برای بکاپ دستی فایل‌های حیاتی سرور، از این موارد کپی بگیرید:
* `testbaan.db` *(پیش از کپی مستقیم، دستور `npm run db:export-local` را بزنید یا سرور را متوقف کنید تا فایل `-wal` ادغام شود).*
* `.env.local` و فایل بکاپ گواهی SSL (`.pfx` در پوشه `C:\win-acme`).

---

## 🩺 ۷. عیب‌یابی سریع و نکات کلیدی (Troubleshooting FAQ)

| مشکل / خطا | علت و راه‌حل سریع |
| :--- | :--- |
| **خطای `404` روی `/o/oauth2/v2/auth` هنگام ورود با گوگل** | در IIS گزینه **`Reverse rewrite host in response headers`** تیک خورده است؛ وارد Server Proxy Settings شوید و تیک آن را بردارید. |
| **`redirect_uri` در لاگین گوگل روی `localhost:3000` قفل شده است** | ۱) مطمئن شوید `Preserve host header` در IIS فعال است و متغیرهای `HTTP_X_FORWARDED_HOST` / `PROTO` ست شده‌اند.<br>۲) مقدار `APP_URL` در `.env.local` را خالی بگذارید. |
| **خطای `HTTP 500.50` پس از افزودن Server Variables در IIS** | نام متغیرهای `HTTP_X_FORWARDED_HOST` و `HTTP_X_FORWARDED_PROTO` در بخش **View Server Variables** سایت Whitelist نشده‌اند. |
| **ورود انجام می‌شود اما با رفرش صفحه کاربر خارج می‌شود** | مرورگر کوکی `Secure` را روی `HTTP` حذف می‌کند؛ از برقراری قانون **Force HTTPS Redirect** در ردیف اول URL Rewrite اطمینان حاصل کنید. |
| **خوانده نشدن `.env.local` پس از ساخت با PowerShell** | دستور `Out-File -Encoding utf8` در پاورشل قدیمی کاراکتر مخفی **BOM** اضافه می‌کند؛ فایل را با Notepad در حالت **UTF-8** (بدون BOM) ذخیره کنید. |
| **خطای `invalid_grant` هنگام ارسال ایمیل OTP پس از ۷ روز** | پروژه در Google Cloud روی حالت *Testing* مانده است؛ در کنسول گوگل دکمه **Publish App** را بزنید و یک `REFRESH_TOKEN` جدید بگیرید. |
| **خطای `There was a problem parsing the Wrangler configuration file` در Import کلودفلر** | `database_id` متعلق به اکانت دیگری در `wrangler.jsonc` است یا ویزارد کلودفلر نتیجه قبلی را تا ۳۰ دقیقه کش کرده است؛ `database_id` را حذف کنید یا یک‌بار با CLI دیپلوی کرده و سپس گیت را از تنظیمات ورکر وصل کنید. |
| **کندی یا لود نشدن فونت در شبکه آفلاین** | فایل‌های فونت وزیرمتن (`.woff2`) از قبل داخل `public/fonts/` و `src/app/globals.css` بومی‌سازی شده‌اند تا سایت بدون اینترنت کاملاً رندر شود. |
