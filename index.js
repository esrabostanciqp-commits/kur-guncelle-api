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

// 🔹 LOG ATMA FONKSİYONU (BITRIX LIST)
async function logToBitrix({ usd, eur }) {
  await fetch(
    "https://quickpoint.bitrix24.com.tr/rest/1292/25vb2dah83otx54w/lists.element.add.json",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        IBLOCK_TYPE_ID: "lists",
        IBLOCK_ID: 204,
        FIELDS: {
          NAME: getKurName(),
          PROPERTY_1156: usd, // 1 $ 
          PROPERTY_1164: eur, // 1 €
          PROPERTY_1154: new Date().toISOString() // kur tarihi
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

    // ✅ LOG AT (CRM GÜNCELLEME SONRASI)
    await logToBitrix({
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

app.listen(3000, () => {
  console.log("API ayakta: http://localhost:3000");
});
