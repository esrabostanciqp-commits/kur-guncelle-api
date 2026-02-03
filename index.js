const express = require("express");
const app = express();

app.use(express.json());

// kontrol endpoint
app.get("/", (req, res) => {
  res.json({ message: "API çalışıyor" });
});

app.post("/kur-guncelle", async (req, res) => {
  try {
    // 1️⃣ Kur verisini al (base: USD)
    const kurResponse = await fetch(
      "https://v6.exchangerate-api.com/v6/62b4bf0401d377105b1565cf/latest/USD"
    );
    const kurData = await kurResponse.json();

    const MARJ = 0.5;

    // 2️⃣ Kurları hesapla (+0,50 TL)
    const usdTry = (kurData.conversion_rates.TRY + MARJ).toFixed(4);
    const eurTry = (
      kurData.conversion_rates.TRY / kurData.conversion_rates.EUR + MARJ
    ).toFixed(4);

    // 3️⃣ Bitrix CRM USD güncelle
    await fetch(
      "https://quickpoint.bitrix24.com.tr/rest/1292/ipys562fd67r1935/crm.currency.update.json",
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

    // 4️⃣ Bitrix CRM EUR güncelle
    await fetch(
      "https://quickpoint.bitrix24.com.tr/rest/1292/ipys562fd67r1935/crm.currency.update.json",
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

    // 5️⃣ Log adı oluştur
    const now = new Date();
    const hour = now.getHours();
    const emoji = hour < 12 ? "🕘" : "🕐";
    const logName = `Güncel Kur ${emoji} ${hour.toString().padStart(2, "0")}:00`;

    // 6️⃣ Bitrix List'e LOG EKLE
    await fetch(
      "https://quickpoint.bitrix24.com.tr/rest/1292/ipys562fd67r1935/lists.element.add.json",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          IBLOCK_TYPE_ID: "lists",
          IBLOCK_ID: 204,
          FIELDS: {
            NAME: logName,
            PROPERTY_1154: now.toISOString(), // Kur Tarihi
            PROPERTY_1156: usdTry,            // USD
            PROPERTY_1164: eurTry             // EUR
          }
        })
      }
    );

    res.json({
      success: true,
      USD: usdTry,
      EUR: eurTry,
      log: logName
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
