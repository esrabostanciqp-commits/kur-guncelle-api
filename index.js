const express = require("express");
const app = express();

app.use(express.json());

// kontrol endpoint
app.get("/", (req, res) => {
  res.json({ message: "API çalışıyor" });
});

// USD ve EUR kurunu CRM para biriminde güncelle (+0,50 TL marjlı)
app.post("/kur-guncelle", async (req, res) => {
  try {
    // 1️⃣ Kur verisini al (base: USD)
    const kurResponse = await fetch(
      "https://v6.exchangerate-api.com/v6/62b4bf0401d377105b1565cf/latest/USD"
    );
    const kurData = await kurResponse.json();

    // 2️⃣ Kurları hesapla (+0,50 TL)
    const usdTry = (kurData.conversion_rates.TRY + 0.5).toFixed(4);

    const eurTry = (
      kurData.conversion_rates.TRY /
      kurData.conversion_rates.EUR +
      0.5
    ).toFixed(4);

    // 3️⃣ Bitrix CRM USD kurunu güncelle (1722 webhook)
    await fetch(
      "https://quickpoint.bitrix24.com.tr/rest/1292/xzrm2uvfv1yl6gg4/crm.currency.update.json",
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

    // 4️⃣ Bitrix CRM EUR kurunu güncelle (1722 webhook)
    await fetch(
      "https://quickpoint.bitrix24.com.tr/rest/1292/xzrm2uvfv1yl6gg4/crm.currency.update.json",
      {
