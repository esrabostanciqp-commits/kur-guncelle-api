const express = require("express");
const fetch = require("node-fetch");

const app = express();
app.use(express.json());

// ===============================
// AYARLAR
// ===============================
const WEBHOOK_BASE =
  "https://quickpoint.bitrix24.com.tr/rest/1292/xzrm2uvfv1yl6gg4/";

const EXCHANGE_API =
  "https://v6.exchangerate-api.com/v6/62b4bf0401d377105b1565cf/latest/USD";

const MARJ = 0.5;

// ===============================
// TEST ENDPOINT
// ===============================
app.get("/", (req, res) => {
  res.json({ message: "API çalışıyor" });
});

// ===============================
// KUR GÜNCELLEME
// ===============================
app.post("/kur-guncelle", async (req, res) => {
  try {
    // 1️⃣ Kur verisini al
    const kurResponse = await fetch(EXCHANGE_API);
    const kurData = await kurResponse.json();

    const usdTry = (kurData.conversion_rates.TRY + MARJ).toFixed(4);
    const eurTry = (
      kurData.conversion_rates.TRY / kurData.conversion_rates.E
