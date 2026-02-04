const express = require("express");
const app = express();

app.use(express.json());

// kontrol endpoint
app.get("/", (req, res) => {
  res.json({ message: "API çalışıyor" });
});

// 🔹 SABAH / ÖĞLEDEN SONRA ADI
function getKurName() {
  const hour = new Date().toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul",
    hour: "2-digit",
    hour12: false
  });

  return Number(hour) < 12
    ? "Güncel Kur Sabah"
    : "Güncel Kur Öğleden Sonra";
}

// 🔹 BUGÜN TARİHİ (YYYY-MM-DD) → TARİH ALANI İÇİN DOĞRU FORMAT
function getTodayDate() {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "Europe/Istanbul"
  });
}

// 🔹 BITRIX LIST LOG FONKSİYONU
async function logToBitrix({ usd, eur }) {
  await fetch(
    "https://quickpoint.bitrix24.com.tr/rest/1292/25vb2dah83otx54w/lists.element.add.json",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        IBLOCK_TYPE_ID: "lists",
        IBLOCK_ID: 204,
        ELEMENT_CODE: Date.now().toString(),
        FIELDS: {
          NAME: getKurName(),          // Text
          PROPERTY_1156: [Number(usd)], // 1 $ → Sayı
          PROPERTY_1164: [Number(eur)], // 1 € → Sayı
          PROPERTY_1154: [getTodayDate()] // Kur Tarihi → Tarih
        }
      })
    }
  );
}

// USD ve EUR kurunu CRM para biriminde güncelle (+0,50 TL marjlı)
app.post("/kur-guncelle", async (req, res) => {
  try {
    // 1️⃣ Kur verisini al (base: USD)
    const kurResponse = await fetch(
      "https://v6.exchangerate-api.com/v6/62b4bf0401d377105b1565cf/latest/USD"
    );
    const kurData = await kurResponse.json();

    // 2️⃣ Kurları hesapla (+0,50 TL eklenmiş)
    const usdTry = (kurData.conversion_rates.TRY + 0.5).toFixed(4);

    const eurTry = (
      kurData.conversion_rates.TRY / kurData.conversion_rates.EUR + 0.5
    ).toFixed(4);

    // 3️⃣ Bitrix CRM USD kurunu güncelle
    await fetch(
      "https://quickpoint.bitrix24.com.tr/rest/1292/25vb2dah83otx54w/crm.currency.update.json",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: "USD",
          fields: {
            AMOUNT: usdTry,
            AMOUNT_CNT: 1
          }
        })
      }
    );

    // 4️⃣ Bitrix CRM EUR kurunu güncelle
    await fetch(
      "https://quickpoint.bitrix24.com.tr/rest/1292/25vb2dah83otx54w/crm.currency.update.json",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: "EUR",
          fields: {
            AMOUNT: eurTry,
            AMOUNT_CNT: 1
          }
        })
      }
    );

    // ✅ LOG AT (LIST 204)
    await logToBitrix({
      usd: usdTr
