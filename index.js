
const express = require("express");
const app = express();

app.use(express.json());

// kontrol endpoint
app.get("/", (req, res) => {
  res.json({ message: "API çalışıyor" });
});

// USD kurunu CRM para biriminde güncelle
app.post("/kur-guncelle", async (req, res) => {
  try {
    // 1️⃣ Gerçek USD/TRY kuru al
    const kurResponse = await fetch(
      "https://v6.exchangerate-api.com/v6/62b4bf0401d377105b1565cf/latest/USD"
    );
    const kurData = await kurResponse.json();

    const usdTry = kurData.conversion_rates.TRY.toFixed(4);

    // 2️⃣ Bitrix CRM USD kurunu güncelle
    const bitrixResponse = await fetch(
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

    const result = await bitrixResponse.json();

    res.json({
      success: true,
      updated_rate: usdTry,
      bitrix: result
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
