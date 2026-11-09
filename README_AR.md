# Juba QR Studio v2.2 — الربط الحقيقي بـ QRCode Monkey (مع fallback)

**الواجهة:** https://juba-juba.github.io/Juba-QR-Studio/

**API:** https://juba-qr-studio-api.elprincedokdok0-048.workers.dev/api/v1/qr

## التعديل

- `provider: "auto"` (الافتراضي): يحاول استدعاء Monkey المباشر أولًا ثم يستخدم المحرّك المحلي **SVG فقط** عند التعذر.
- `provider: "monkey"`: يطلب صورة Monkey الأصلية بشكل صارم؛ يفشل HTTP 503 لو الأصل غير متاح، ولا يزعم أن الرسم المحلي هو الأصلي.
- `provider: "local"`: يستخدم محرّكنا المستقل، مع التنبيه أن الأنماط تقريبية.
- API الرسمي يدعم `png/svg/pdf/eps`، لكن الوصول المجاني المباشر على `api.qr-code-monkey.com` غير مضمون استقرارًا أو ترخيصًا تجاريًا؛ الصفحة الرسمية تشير إلى RapidAPI للاستخدام الاحترافي. يمكنك تهيئة `MONKEY_RAPIDAPI_KEY` و `MONKEY_RAPIDAPI_URL` من **أسرار الخادم فقط** بعد الاشتراك والتأكد من رابط الـgateway الصحيح. لا تضع المفتاح في ملفات GitHub Pages.
- المعاينة المحلية فورية، ويُستبدل الرمز بالصورة الأصلية بعد استجابة Monkey الفعلية. يظهر تحتها مصدر التوليد. ملف التصدير يفضّل النسخة الأصلية ويُظهر رسالة إذا تعذّر استخدامها.
- أسماء القوالب الرسمية 22 Body / 15 Eye / 18 EyeBall مدعومة بنفس قيم `config`؛ لا يتم إرسال إعداد غير مدعوم إلى المصدر.
- **اللوجوهات المرفوعة من المتصفح لا تُرفع إلى Monkey تلقائيًا**، وتُرسم محليًا للحفاظ على البيانات؛ رفع الصور إلى Monkey يحتاج ربط `/qr/uploadImage` وشروط الخدمة.

### مثال JavaScript

```javascript
const api = 'https://juba-qr-studio-api.elprincedokdok0-048.workers.dev/api/v1/qr';
const response = await fetch(api, {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    data: 'https://example.com/smart/001',
    file: 'svg',
    provider: 'auto',
    size: 1000,
    config: {body:'rounded-pointed',eye:'frame14',eyeBall:'ball16',bodyColor:'#294D2B',bgColor:'#FFFFFF'}
  })
});
if (!response.ok) throw new Error(await response.text());
console.log('Renderer:',response.headers.get('X-QR-Renderer')); // monkey-direct | monkey-rapidapi | local-fallback
const blob = await response.blob();
```

**الخصوصية:** لو Monkey متاح، محتوى QR بيتبعت للخدمة الخارجية. لا تستخدم بيانات شخصية/سرية في رموز QR، واستخدم الروابط اللي تخص تطبيقك.

---

# النسخة الجديدة: ربط GitHub Pages مع Cloudflare API

**واجهة التصميم:** https://juba-juba.github.io/Juba-QR-Studio/

**API على Cloudflare Workers (SVG):** https://juba-qr-studio-api.elprincedokdok0-048.workers.dev/api/v1/qr

**وثائق API:** https://juba-juba.github.io/Juba-QR-Studio/api-docs.html

> GitHub Pages استضافة ثابتة ولا تستطيع تشغيل Node REST API. النسخة السحابية على Workers تدعم SVG كامل التخصيص؛ نسخة Node/Docker تدعم PNG كذلك. أكواد الأشكال أصبحت بنفس معرفات API الرسمية لـ Monkey (22/15/18)، لكن الرسوم المستقلة تقريبية وليست ملفات الـSVG الأصلية المملوكة للخدمة.

```js
const response = await fetch('https://juba-qr-studio-api.elprincedokdok0-048.workers.dev/api/v1/qr', {
  method: 'POST', headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({data:'https://example.com/nfc/001',file:'svg',size:1000,config:{body:'rounded-pointed',eye:'frame14',eyeBall:'ball16',bodyColor:'#294D2B',bgColor:'#FFFFFF'}})
});
if (!response.ok) throw new Error(await response.text());
const svgBlob = await response.blob();
```

---

# Juba QR Studio v2.1 — لوحة تصميم QR + REST API

مشروع ويب مستقل دون شاشة دخول أو كلمة مرور، يقدّم واجهة تحرير تشبه تقسيم لوحة QRCode Monkey في الصورة المرجعية من حيث الأقسام، شكل البلاطات، الأزرار والمعاينة، لكنه لا ينسخ شعار QRCode Monkey أو كوده الخاص أو رسومه الأصلية.

## الواجهة

- أقسام **ENTER CONTENT / SET COLORS / ADD LOGO IMAGE / CUSTOMIZE DESIGN** قابلة للفتح والغلق.
- **22 Body Shape + 15 Eye Frame Shape + 18 Eye Ball Shape** (كاملة وظيفيًا، مع ملفات SVG تتغيّر بحسب اختيارك؛ الأشكال المستحدثة تقريبات مستقلة وليست نسخًا طبق الأصل من الأصول المحمية).
- لون منفرد وتدرج Linear/Radial وألوان مستقلة للزوايا الثلاث وخلفيات شفافة.
- إضافة لوجو من الجهاز أو المعرض، ومعاينة مباشرة، وتصدير **PNG/SVG** مع كامل التخصيص من واجهة المتصفح؛ PDF وEPS كلاسيكيان من الواجهة.
- 17 نوع محتوى: URL, Text, Email, Phone, SMS, vCard, MeCard, Location, Facebook, X, YouTube, Wi-Fi, Event, Bitcoin, WhatsApp, Telegram, NFC.
- واجهة عربية/إنجليزية، قوالب وتصاميم محفوظة داخل المتصفح.

## تشغيل بدون باسورد

يتطلب **Node.js 20+** فقط لتشغيل السيرفر. لا تحتاج إلى `npm install`.

```powershell
cd Juba-QR-Studio
npm start
```

افتح `http://127.0.0.1:4173/` للوحة المحرر، أو `http://127.0.0.1:4173/api-docs.html` لتوثيق الـ API وتجربته.

لا يوجد حساب أو كلمة مرور نهائيًا. **لو نشرت السيرفر للعامة، سيتمكن أي شخص لديه الرابط من إنشاء QR أو استخدام API.** يمكن قصر الوصول عبر Cloudflare Access أو جدار حماية خارجي في بيئة الإنتاج لو احتجت ذلك لاحقًا.

## REST API

### توليد SVG أو PNG

**POST `/api/v1/qr`** أو **POST `/qr/custom`**

```json
{
  "data": "https://your-domain.com/q/stand-001",
  "size": 1000,
  "file": "svg",
  "config": {
    "body": "rhombus",
    "eye": "frame13",
    "eyeBall": "ball14",
    "bodyColor": "#294D2B",
    "bgColor": "#FFFFFF",
    "gradientColor1": "#294D2B",
    "gradientColor2": "#64A83D",
    "gradientType": "linear",
    "gradientOnEyes": false,
    "logoMode": "clean"
  }
}
```

يمكن تمرير نفس الحقول عن طريق GET:

```text
GET /api/v1/qr?data=https%3A%2F%2Fexample.com&file=svg&size=1000
```

استجابة ناجحة = ملف صورة binary مباشرة (`image/svg+xml` أو `image/png`)؛ في حالة الخطأ يرجع JSON وكود HTTP مناسب. `download=true` يجعل الاستجابة مرفق تحميل.

المسارات الإضافية:

- `GET /api/v1/health` حالة الخدمة.
- `GET /api/v1/shapes` قائمة جميع الأشكال والقيم الممكن استخدامها.
- `/qr/custom` مسار متوافق جزئيًا مع أسلوب QRCode Monkey لتسهيل الانتقال. ليس بديلًا 100% لكل أكواد الأشكال الخاصة بخدمتهم.

### داخل أي تطبيق تاني

```js
const response = await fetch('https://YOUR-QR-SERVER/api/v1/qr', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    data: 'https://example.com/q/stand-001',
    file: 'svg',
    size: 1000,
    config: { body: 'dots', eye: 'frame11', eyeBall: 'ball12', bodyColor: '#294D2B' }
  })
});
if (!response.ok) throw new Error(await response.text());
const blob = await response.blob();
const imageUrl = URL.createObjectURL(blob);
```

للشعارات في API تقبل `config.logo` بصيغة `data:image/png;base64,...` أو `data:image/jpeg;base64,...` أو `data:image/webp;base64,...` بشرط ألا يتجاوز حجم النص 800 ألف حرف؛ **لا يتم جلب رابط صورة خارجي** لمنع SSRF. راعي أن نسبة حجم اللوجو الكبيرة قد تؤثر على قراءة الكود.

### الصور PNG من خادم Node

الـ SVG يعمل من غير أي أدوات إضافية. لطلب `file=png` من **REST API** يحتاج الخادم إلى `rsvg-convert` أو Inkscape، لأن PNG لازم يتم رسم تفاصيل SVG كاملة (ألوان/أشكال/لوجو) بدل تصدير QR عادي بشكل مختلف. خيار `PNG` في واجهة المتصفح يعمل باستخدام Canvas ولا يحتاج إلى تلك الأداة.

على Linux:

```bash
sudo apt-get install -y librsvg2-bin
```

على Windows: ثبت **Inkscape** وأضف ملف التنفيذ إلى PATH، أو شغّل Dockerfile المرفق على Docker؛ حيث يتضمن `rsvg-convert` تلقائيًا.

```bash
docker build -t juba-qr-studio .
docker run --rm -p 4173:4173 juba-qr-studio
```

### التهيئة والأمان

```env
HOST=127.0.0.1
PORT=4173
CORS_ORIGINS=*
RATE_LIMIT_PER_MINUTE=60
SVG_RENDERER=rsvg-convert
```

ضع `CORS_ORIGINS` على قائمة دومينات تطبيقاتك المفصولة بفواصل إذا أردت منع JavaScript من نطاقات أخرى من قراءة API من المتصفح. **CORS ليس حماية/توثيقًا للـ API**؛ يظل الوصول المباشر ممكنًا. حد الطلبات قائم على عنوان IP من اتصال TCP (مع Reverse Proxy تأكد من الضبط المناسب ومنع إساءة الاستخدام خارجيًا).

بيانات QR لا تُحفظ في قاعدة بيانات ولا تُسجل في خادم Node.

## GitHub / النشر

اسم المستودع المقترح: `Juba-QR-Studio` لأن GitHub لا يقبل المسافات في أسماء الـ repositories. اسم المنتج الظاهر **Juba QR Studio**.

- GitHub Pages: ينشر ملفات `public/` كموقع ثابت فقط، ولن تعمل عليه REST API الخاصة بـ Node.
- REST API: شغّل المشروع على VPS / Docker / سيرفر Node عبر HTTPS، أو حوّل محرك SVG إلى Cloudflare Worker باستضافة منفصلة.
- يمكنك نشر المستودع من لوحة GitHub بعد إنشاء مستودع فارغ، أو باستخدام `git init` ثم `git remote add origin` و`git push`.

## الاختبارات

```bash
npm test
```

تتحقق من محرك QR وشبكة المصفوفة والأشكال وطلبات REST والتحقق من المدخلات وملفات SVG/PNG حين تتوفر أداة rasterization.

**حدود المسؤولية البصرية:** تم توسيع كل مجموعات الأشكال لتطابق العدد وترتيب العرض من الصورة، لكن تصميمات SVG الجديدة معاد رسمها بواسطة كودنا وليست نفس مسارات الأشكال الأصلية لQRCode Monkey. يجب اختبار أي تصميم مُزخرف على هاتف قبل الطباعة أو حرق روابط NFC.