const express = require("express");
const app = express();

app.use(express.json());

// kontrol endpoint
app.get("/", (req, res) => {
  res.json({ message: "API çalışıyor" });
});

// USD ve EUR kurunu CRM para biriminde güncelle
app.post("/kur-guncelle", async (req, res) => {
  try {
    // 1️⃣ Gerçek kur verisini al (base: USD)
    const kurResponse = await fetch(
      "https://v6.exchangerate-api.com/v6/62b4bf0401d377105b1565cf/latest/USD"
    );
    const kurData = await kurResponse.json();

    // 2️⃣ Kurları hesapla
    const usdTry = kurData.conversion_rates.TRY.toFixed(4);
    const eurTry = (
      kurData.conversion_rates.TRY / kurData.conversion_rates.EUR
    ).toFixed(4);

    // 3️⃣ Bitrix CRM USD kurunu güncelle
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

    // 4️⃣ Bitrix CRM EUR kurunu güncelle
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
