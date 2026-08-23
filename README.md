# Salon Kasse — v0.4.0-test

وب‌اپ دوزبانه فارسی/آلمانی برای مدیریت پول نقد آرایشگاه.

## امکانات این نسخه

- رابط فارسی RTL و آلمانی LTR
- موبایل، تبلت و دسکتاپ
- ثبت فروش خدمات و پکیج‌ها
- انعام و محاسبه باقی‌مانده
- ورود و خروج نقدی
- شروع و بستن روز کاری
- موجودی مورد انتظار و اختلاف صندوق
- داشبورد و گزارش ماهانه
- مدیریت خدمات، پکیج‌ها و قیمت‌ها
- تاریخچه تغییر قیمت
- بکاپ JSON و خروجی CSV
- IndexedDB و PWA
- Docker، Caddy و استقرار خودکار GitHub Actions

> این نسخه برای تست محصول است و هنوز نباید به‌عنوان صندوق رسمی مالیاتی آلمان استفاده شود.

## اجرای Windows

Node.js 24 LTS باید نصب باشد.

بعد از کپی فایل‌ها داخل Repository، روی این فایل دو بار کلیک کن:

```text
scripts/RUN_LOCAL.bat
```

برنامه روی این آدرس باز می‌شود:

```text
http://localhost:5173
```

در اجرای اول Dependencies نصب می‌شوند. دفعات بعد مستقیم اجرا می‌شود.

## اجرای دستی

```bash
npm install
npm run dev
```

بررسی کد و Build:

```bash
npm run check
npm run build
```

## اولین Push

در GitHub Desktop:

```text
Summary:
feat: bootstrap bilingual offline-first PWA
```

سپس:

```text
Commit to main
Push origin
```

Workflow با نام `Quality Check` به‌صورت خودکار Build را بررسی می‌کند.

## استقرار خودکار VPS

استقرار در ابتدا غیرفعال است تا بدون تنظیم VPS خطا تولید نکند.

### Secrets

در مسیر زیر:

```text
Settings → Secrets and variables → Actions → Secrets
```

این موارد را یک‌بار تعریف کن:

```text
VPS_HOST
VPS_USER
VPS_SSH_KEY
```

### Variables

```text
VPS_PORT=22
DEPLOY_PATH=/opt/salon-cash-register
APP_DOMAIN=salon-kasse.YOUR-IP-WITH-DASHES.sslip.io
ENABLE_VPS_DEPLOY=true
```

بعد از آن، هر Push روی `main` به‌صورت خودکار فایل‌ها را منتقل می‌کند،
Docker را Build می‌کند، برنامه را Restart می‌کند و HTTPS را بررسی می‌کند.

## اطلاعات نسخه تست

اطلاعات داخل IndexedDB مرورگر ذخیره می‌شوند. برای انتقال یا بکاپ:

```text
تنظیمات → دانلود بکاپ JSON
```

مرحله بعد بعد از تأیید این Build:

1. Backend و PostgreSQL
2. ورود امن صاحب آرایشگاه
3. Sync بین IndexedDB و سرور
4. بکاپ خودکار VPS
5. Audit Log
6. بررسی TSE و الزامات مالیاتی آلمان
