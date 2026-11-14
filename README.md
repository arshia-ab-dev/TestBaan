# 🎯 تست‌بان (TestBaan)

سامانه هوشمند و مدرن مدیریت آزمون، کتاب‌ها و پاسخ‌برگ‌های الکترونیکی استاندارد (چیدمان ستونی و ۱۰تایی کنکوری) با قابلیت تحلیل درس‌به‌درس، تگ‌گذاری چندگانه و بانک تست‌های نشان‌دار.

این پروژه با **معماری تک‌برنچ دوگانه (Hybrid Architecture)** طراحی شده است و بدون تغییر در کدهای اصلی، هم روی زیرساخت ابری **Cloudflare Workers + D1** و هم به صورت **Self-Hosted روی Windows Server (Node.js + SQLite)** قابل اجراست.

---

## ✨ ویژگی‌های کلیدی
* **معماری دیتابیس یکپارچه (`src/lib/db.ts`):** تشخیص خودکار محیط اجرا (استفاده از Cloudflare D1 در ابر و `@libsql/client` با فایل `testbaan.db` در سرور ویندوز).
* **احراز هویت سه‌گانه:** ورود با **Google OAuth 2.0**، کد یک‌بار مصرف ایمیل (**OTP** از طریق Gmail API) و **ایمیل + رمز عبور** (هش PBKDF2 + تایید دو مرحله‌ای).
* **پاسخ‌برگ استاندارد کنکوری:** چیدمان ریسپانسیو ستونی، ذخیره خودکار ابری و محلی، زمان‌سنج آزمون، و مودال‌های اختصاصی.
* **درصدگیری هوشمند و مبحثی:** تعریف مباحث (`ریاضی: 1-10 | فیزیک: 11-20`) و پشتیبانی از سوالات بدون کلید/حذف‌شده (`?`) بدون احتساب نمره منفی.
* **سیستم تگ‌گذاری و بانک تست‌ها (`/bookmarks`):** پالت ۲۰‌رنگی، تگ‌گذاری چندگانه روی سوالات و صفحه فیلتر و مرور تست‌های نشان‌دار.
* **پشته فناوری:** Next.js 16 • React 19 • TypeScript • Tailwind CSS v4 • `@opennextjs/cloudflare` • `@libsql/client`.

---

## 🔑 مرحله ۰ (مشترک): تنظیمات Google Cloud و Gmail API

برای فعال‌سازی ورود با گوگل و ارسال ایمیل‌های OTP در هر دو محیط، یک‌بار مراحل زیر را انجام دهید:

1. در [Google Cloud Console](https://console.cloud.google.com) یک پروژه جدید بسازید و از بخش **Library** سرویس **Gmail API** را **Enable** کنید.
2. در بخش **OAuth consent screen / Audience**:
   * نوع را روی **External** بگذارید، نام اپ و دامنه مجاز (مثلاً `yourdomain.com`) را ثبت کنید.
   * اسکوپ‌های `userinfo.email`، `userinfo.profile` و `https://www.googleapis.com/auth/gmail.send` را اضافه کنید.
   * ⚠️ **بسیار مهم:** حتماً دکمه **Publish App** را بزنید تا وضعیت از *Testing* به *In Production* برود (در حالت Testing، توکن ایمیل بعد از ۷ روز منقضی می‌شود).
3. در بخش **Credentials / Clients** یک **OAuth Client ID** از نوع **Web application** بسازید و **Authorized redirect URIs** را اضافه کنید:
   ```text
   https://developers.google.com/oauthplayground
   https://your-domain.com/api/auth/callback/google
   http://localhost:3000/api/auth/callback/google
   ```
   *(مقادیر `GOOGLE_CLIENT_ID` و `GOOGLE_CLIENT_SECRET` را یادداشت کنید).*
4. برای گرفتن `GOOGLE_REFRESH_TOKEN` دائمی:
   * وارد [Google OAuth Playground](https://developers.google.com/oauthplayground) شوید، از آیکون ⚙️ گزینه **Use your own OAuth credentials** را تیک بزنید و Client ID/Secret خود را وارد کنید.
   * در Step 1 اسکوپ `https://www.googleapis.com/auth/gmail.send` را انتخاب و **Authorize APIs** را بزنید.
   * در Step 2 دکمه **Exchange authorization code for tokens** را بزنید و **Refresh Token** را کپی کنید.

---

## ☁️ روش اول: استقرار ابری روی Cloudflare Workers + D1

### الف) روش سریع (Fork و اتصال مستقیم GitHub به کلودفلر)
1. ریپازیتوری را **Fork** کنید.
2. در پنل کلودفلر، یک دیتابیس **D1** بسازید (`testbaan-db`) و کوئری‌های فایل `schema.sql` را در تب Console آن اجرا کنید.
3. در فایل `wrangler.jsonc` مقادیر `database_id`، `database_name` و `GOOGLE_CLIENT_ID` را با اطلاعات خودتان جایگزین و در گیت‌هاب پوش کنید.
4. در پنل کلودفلر به **Workers & Pages > Create > Import a repository** بروید و ریپازیتوری فورک‌شده را متصل کنید:
   * **Build command:** `npm run open-build`
   * **Deploy command:** `npm run open-deploy`
5. در تنظیمات ورکر (**Settings > Variables and Secrets**)، دو متغیر حساس را اضافه کنید:
   * `GOOGLE_CLIENT_SECRET`
   * `GOOGLE_REFRESH_TOKEN`
6. در تب **Bindings** مطمئن شوید دیتابیس D1 با نام بایندینگ `testbaan_db` متصل شده است.

### ب) استقرار دستی از طریق CLI
```bash
npm install
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put GOOGLE_REFRESH_TOKEN
npm run open-build
npm run open-deploy
```

### 🌐 نکات تکمیلی CDN و ایمیل در کلودفلر
* **جلوگیری از اسپم شدن OTP:** در DNS کلودفلر دو رکورد `TXT` زیر را اضافه کنید:
  * **SPF:** نام `@` با مقدار `v=spf1 include:_spf.google.com ~all`
  * **DMARC:** نام `_dmarc` با مقدار `v=DMARC1; p=none; rua=mailto:your-email@gmail.com` *(پس از ۲ هفته تست موفق می‌توانید به `p=quarantine` تغییر دهید).*
* **استفاده از CDN واسط (مانند Gcore):** کش را **فقط** برای `/_next/static/*` فعال کنید و مسیرهای `/api/*`، `/dashboard*`، `/exam*`، `/admin*` و هدر `Set-Cookie` را حتماً روی **Bypass Cache** بگذارید.

---

## 🖥️ روش دوم: استقرار محلی/شخصی روی Windows Server + IIS

### ۱. پیش‌نیازها و اجرای Next.js
1. روی ویندوز سرور، **Node.js 22 LTS** و **Git** را نصب کنید.
2. پروژه را کلون و پکیج‌ها را نصب کنید:
   ```powershell
   git clone https://github.com/<username>/TestBaan.git C:\inetpub\TestBaan
   cd C:\inetpub\TestBaan
   npm install
   ```
3. فایل `.env.local` را در روت پروژه (با فرمت UTF-8) بسازید:
   ```env
   # متغیر APP_URL را می‌توانید خالی بگذارید تا دامنه‌ها (محلی، تانل، عمومی) خودکار از هدر مرورگر تشخیص داده شوند
   GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID"
   GOOGLE_CLIENT_SECRET="YOUR_GOOGLE_CLIENT_SECRET"
   GOOGLE_REFRESH_TOKEN="YOUR_GOOGLE_REFRESH_TOKEN"
   ```
4. پروژه را بیلد و اجرا کنید (برای اجرای دائمی در پس‌زمینه از **PM2** استفاده کنید):
   ```powershell
   npm run build
   npm run start
   ```
   *(اگر از PM2 استفاده می‌کنید، در ویندوز مستقیماً باینری Next.js را اجرا کنید)*:
   ```powershell
   npm install -g pm2
   pm2 start node_modules/next/dist/bin/next --name "testbaan" -- start -p 3000
   pm2 save
   ```

### ۲. تنظیم DNS محلی و دریافت گواهی SSL رسمی (`win-acme`)
برای دسترسی امن (`https`) در شبکه داخلی بدون نیاز به باز کردن پورت مودم یا نصب گواهی دستی روی کلاینت‌ها:
1. در DNS کلودفلر یک رکورد `A` برای زیر‌دامنه محلی (مثلاً `local.testbaan`) با IP داخلی سرور (مثلاً `192.168.1.50`) در حالت **DNS Only (ابر خاکستری)** بسازید.
2. در پروفایل کلودفلر یک **API Token** با قالب **Edit zone DNS** برای دامنه خود بسازید.
3. آخرین نسخه **`win-acme`** (فایل `pluggable.zip`) به همراه پلاگین **`win-acme.plugin.validation.dns.cloudflare.zip`** را از گیت‌هاب دانلود و در پوشه‌ای مثل `C:\win-acme` اکسترکت کنید.
4. فایل `wacs.exe` را اجرا کنید و در منو مراحل زیر را انتخاب کنید:
   * `M` (Full options) > `2` (Manual input) > وارد کردن دامنه (`local.testbaan.yourdomain.com`) > `4` (Single certificate).
   * روش تایید: **`[dns] Create verification records in Cloudflare DNS`** > ورود API Token.
   * نوع کلید: `RSA` > ذخیره در **`Windows Certificate Store (WebHosting)`** (و در صورت نیاز به بکاپ، انتخاب مرحله دوم ذخیره به صورت **PFX**).
   * نصب در IIS: انتخاب **`Create or update bindings in IIS`** روی **`Default Web Site`**.

### ۳. تنظیم IIS به عنوان Reverse Proxy (نکات حیاتی!)
1. از Server Manager نقش **Web Server (IIS)** و سپس دو ماژول رسمی **URL Rewrite 2.1** و **Application Request Routing (ARR) 3.0** را نصب کنید.
2. در **IIS Manager (`inetmgr`)**:
   * روی نام سرور کلیک کنید > **Application Request Routing Cache** > **Server Proxy Settings**:
     * ✅ تیک **`Enable proxy`** را بزنید.
     * ✅ تیک **`Preserve host header`** را بزنید.
     * ❌ **تیک `Reverse rewrite host in response headers` را حتماً بردارید** (در غیر این صورت ریدایرکت لاگین گوگل خراب شده و با دامنه خودتان بازنویسی می‌شود!).
3. روی **Default Web Site** > **URL Rewrite**:
   * از ستون راست وارد **View Server Variables...** شوید و این دو متغیر را اضافه (Whitelist) کنید:
     * `HTTP_X_FORWARDED_HOST`
     * `HTTP_X_FORWARDED_PROTO`
4. قوانین **Inbound Rules** را به این ترتیب (اولویت از بالا به پایین) تنظیم کنید:
   * **قانون اول (`Force HTTPS Redirect`):** شرط `{HTTPS}` برابر `^OFF$` ⬅️ Action: `Redirect (301)` به `https://{HTTP_HOST}/{R:1}` *(برای جلوگیری از حذف کوکی‌های `Secure` روی HTTP)*.
   * **قانون دوم (`ReverseProxyInboundRuleHTTPS`):** شرط `{HTTPS}` برابر `on` ⬅️ تنظیم Server Variables (`HTTP_X_FORWARDED_HOST={HTTP_HOST}` و `HTTP_X_FORWARDED_PROTO=https`) ⬅️ Action: `Rewrite` به `http://localhost:3000/{R:1}`.
5. پورت‌های **80** و **443** را در فایروال ویندوز باز کنید (`New-NetFirewallRule`).

---

## 🔒 دسترسی امن تیمی از راه دور با Tailscale

برای دسترسی پایدار اعضای تیم از خارج شبکه بدون نیاز به Port Forwarding یا Cloudflare Tunnel:
1. نرم‌افزار **Tailscale** را روی ویندوز سرور نصب و لاگین کنید.
2. در پنل [Tailscale DNS](https://login.tailscale.com/admin/dns)، گزینه **MagicDNS** و **HTTPS Certificates** را فعال کنید.
3. برای دریافت گواهی SSL اختصاصی دامنه تیل‌اسکیل دستور زیر را در پاورشل بزنید:
   ```powershell
   tailscale cert <server-name>.<tailnet-name>.ts.net
   ```
4. فایل گواهی دریافتی را به IIS بدهید (Binding پورت ۴۴۳ با نام دامنه `.ts.net`) و آدرس `https://<server-name>.<tailnet-name>.ts.net/api/auth/callback/google` را در لیست Redirect URIهای گوگل اضافه کنید.

---

## 💾 بکاپ‌گیری و همگام‌سازی دیتابیس (D1 ⇄ SQLite)

برای مدیریت آسان بکاپ‌ها و انتقال دوطرفه داده‌ها بین **Cloudflare D1** و **سرور ویندوز**، اسکریپت‌های آماده در `package.json` قرار داده شده‌اند:

### ۱. انتقال از Cloudflare D1 به سرور ویندوز (Cloud ➔ Local)
1. **دریافت فایل بکاپ از کلودفلر:**
   * **از طریق پنل وب:** وارد دیتابیس D1 > تب **Backups** > دکمه **Export Database** شوید و فایل دانلود شده را با نام `remote-dump.sql` در روت پروژه قرار دهید.
   * **از طریق CLI:**
     ```powershell
     npm run db:export-cf
     ```
2. **تزریق به دیتابیس محلی سرور (`testbaan.db`):**
   ```powershell
   npm run db:import-local
   ```

---

### ۲. بکاپ `.sql` از دیتابیس محلی و انتقال به سرور جدید یا Cloudflare D1 (Local ➔ Cloud / New Server)
1. **گرفتن خروجی استاندارد `.sql` از دیتابیس محلی (`testbaan.db`):**
   این دستور تمام داده‌ها (حتی کش `-wal`) را ادغام کرده و فایل `local-dump.sql` می‌سازد:
   ```powershell
   npm run db:export-local
   ```
2. **بازگردانی فایل `local-dump.sql` در مقصد:**
   * **انتقال به Cloudflare D1 (ورکر ابری):**
     ```powershell
     npm run db:import-cf
     ```
   * **انتقال به یک سرور ویندوز جدید:**  
     فایل `local-dump.sql` را در پوشه پروژه سرور جدید بگذارید و اجرا کنید:
     ```powershell
     node import-dump.js local-dump.sql
     ```

---

### ۳. بکاپ‌گیری سریع فایلی روی سرور ویندوز
برای بکاپ‌گیری روزانه در محیط Self-Hosted کافیست از فایل‌های زیر کپی بگیرید:
* **فایل دیتابیس:** `testbaan.db` *(پیش از کپی مستقیم فایل، یا سرور را متوقف کنید یا دستور `npm run db:export-local` را بزنید تا داده‌های داخل حافظه موقت `-wal` از دست نروند).*
* **فایل تنظیمات و گواهی SSL:** فایل `.env.local` و فایل بکاپ گواهی `.pfx` (در مسیر `C:\win-acme`).
