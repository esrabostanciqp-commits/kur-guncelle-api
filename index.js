const express = require("express");
const app = express();

app.use(express.json());

// =======================
// AYARLAR
// =======================
const PORT = 3000;
const BITRIX_WEBHOOK =
  "https://quickpoint.bitrix24.com.tr/rest/1292/25vb2dah83otx54w";

// Smart Process bilgileri
const ENTITY_TYPE_ID = 1102; // Kur Geçmişi
const CATEGORY_ID = 42;      // Kur Geçmişi pipeline

// Alan kodları
const FIELD_USD = "UF_CRM_42_1770198932"; // 1$
const FIELD_EUR = "UF_CRM_42_1770198961"; // 1€
const FIELD_DATE = "UF_CRM_42_1770198985"; // Kur Tarihi

// =======================
// YARDIMCI FONKSİYONLAR
// =======================

// Log başlığı: 09.00 / 13.00
function getKurTitle() {
  const hour = new Date().toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul",
    hour: "2-digit",
    hour12: false
  });

  if (Number(hour) < 12) {
    return "Güncel Kur 09.00";
  }
  return "Güncel Kur 13.00";
}

// Bugünün tarihi (Smart Process tarih alanı için doğru format)
function getTodayDate() {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "Europe/Istanbul"
  });
}

// =======================
// SMART PROCESS LOG
// =======================
async function logToSmartProcess({ usd, eur }) {
  await fetch(`${BITRIX_WEBHOOK}/crm.item.add.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      entityTypeId: ENTITY_TYPE_ID,
      categoryId: CATEGORY_ID,
      fields: {
        TITLE: getKurTitle(),
        [FIELD_USD]: Number(usd),
        [FIELD_EUR]: Number(eur),
        [FIELD_DATE]: getTodayDate()
      }
    })
  });
}

// =======================
// KONTROL ENDPOINT
// =======================
app.get("/", (req, res) => {
  res.json({ message: "Kur API çalışıyor" });
});

// =======================
// KUR GÜNCELLEME
// =======================
app.post("/kur-guncelle", async (req, res) => {
  try {
    // 1️⃣ Kur verisini al (USD base)
    const kurResponse = await fetch(
      "https://v6.exchangerate-api.com/v6/62b4bf0401d377105b1565cf/latest/USD"
    );
    const kurData = await kurResponse.json();

    // 2️⃣ Hesapla (+0.50 TL marj)
    const usdTry = (kurData.conversion_rates.TRY + 0.5).toFixed(4);
    const eurTry = (
      kurData.conversion_rates.TRY / kurData.conversion_rates.EUR + 0.5
    ).toFixed(4);

    // 3️⃣ Bitrix CRM USD güncelle
    await fetch(`${BITRIX_WEBHOOK}/crm.currency.update.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: "USD",
        fields: { AMOUNT: usdTry, AMOUNT_CNT: 1 }
      })
    });

    // 4️⃣ Bitrix CRM EUR güncelle
    await fetch(`${BITRIX_WEBHOOK}/crm.currency.update.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: "EUR",
        fields: { AMOUNT: eurTry, AMOUNT_CNT: 1 }
      })
    });

    // 5️⃣ Smart Process log
    await logToSmartProcess({
      usd: usdTry,
      eur: eurTry
    });

    res.json({
      success: true,
      updated: {
        USD: usdTry,
        EUR: eurTry
      }
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// =======================
app.listen(PORT, () => {
  console.log(`API ayakta: http://localhost:${PORT}`);
});
