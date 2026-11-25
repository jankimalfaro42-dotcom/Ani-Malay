const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const router = express.Router();

// ==========================================
// RESOLVE DB CONNECTION SAFELY
// Adjust if your db file is at ../config/db or ../db
// ==========================================
let db = null;
try {
  db = require("../config/db");
} catch {
  try {
    db = require("../db");
  } catch {
    db = null;
  }
}

// ==========================================
// OPTIONAL MULTER SETUP FOR QR IMAGE UPLOAD
// ==========================================
const uploadDir = path.join(__dirname, "..", "uploads", "gcash-qr");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".png";
    const safeName = `gcash-qr-${Date.now()}${ext}`;
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG, and WEBP images are allowed."));
    }
  },
});

// Middleware that runs multer ONLY when request is multipart/form-data
const maybeUploadQr = (req, res, next) => {
  const contentType = req.headers["content-type"] || "";
  if (contentType.includes("multipart/form-data")) {
    return upload.single("qr_image")(req, res, (err) => {
      if (err) {
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  }
  next();
};

// ==========================================
// ENSURE TABLE EXISTS (MYSQL / POSTGRES SAFE)
// ==========================================
async function ensureGcashTable() {
  if (!db) return;

  const createSql = `
    CREATE TABLE IF NOT EXISTS gcash_qr_settings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      account_name VARCHAR(255) NOT NULL,
      account_number VARCHAR(100) NOT NULL,
      qr_image LONGTEXT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `;

  if (typeof db.query === "function") {
    await db.query(createSql);
  } else if (typeof db.execute === "function") {
    await db.execute(createSql);
  }
}

async function runQuery(sql, params = []) {
  if (!db) {
    throw new Error("Database connection not found in gcashQrRoutes.js.");
  }

  if (typeof db.query === "function") {
    const result = await db.query(sql, params);
    return Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;
  }

  if (typeof db.execute === "function") {
    const result = await db.execute(sql, params);
    return Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;
  }

  throw new Error("Unsupported database client.");
}

// ==========================================
// GET /api/gcash-qr
// Fetch latest saved LGU GCash QR settings
// ==========================================
router.get("/", async (_req, res) => {
  try {
    await ensureGcashTable();

    const rows = await runQuery(
      `SELECT id, account_name, account_number, qr_image, updated_at
       FROM gcash_qr_settings
       ORDER BY id DESC
       LIMIT 1`
    );

    const record = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;

    if (!record) {
      return res.json({
        account_name: "Municipal Agriculture Office - LGU Malay",
        account_number: "",
        qr_image: "",
      });
    }

    return res.json({
      id: record.id,
      account_name: record.account_name,
      account_number: record.account_number,
      qr_image: record.qr_image || "",
      updated_at: record.updated_at,
    });
  } catch (error) {
    console.error("GET /api/gcash-qr error:", error);
    return res.status(500).json({
      message: error.message || "Failed to load GCash QR settings.",
    });
  }
});

// ==========================================
// PUT /api/gcash-qr
// Create or update LGU GCash QR settings
// ==========================================
router.put("/", maybeUploadQr, async (req, res) => {
  try {
    await ensureGcashTable();

    const body = req.body || {};
    const accountName = String(
      body.account_name || body.accountName || ""
    ).trim();
    const accountNumber = String(
      body.account_number || body.accountNumber || ""
    ).trim();

    if (!accountName) {
      return res.status(400).json({
        message: "LGU GCash account name is required.",
      });
    }

    if (!accountNumber) {
      return res.status(400).json({
        message: "LGU GCash number is required.",
      });
    }

    const existingRows = await runQuery(
      `SELECT id, qr_image
       FROM gcash_qr_settings
       ORDER BY id DESC
       LIMIT 1`
    );

    const existing =
      Array.isArray(existingRows) && existingRows.length > 0
        ? existingRows[0]
        : null;

    let finalQrImage = existing?.qr_image || "";

    if (req.file) {
      finalQrImage = `/uploads/gcash-qr/${req.file.filename}`;
    } else if (
      typeof (body.qr_image ?? body.qrImage) === "string" &&
      (body.qr_image ?? body.qrImage).trim() !== ""
    ) {
      finalQrImage = (body.qr_image ?? body.qrImage).trim();
    }

    if (existing) {
      await runQuery(
        `UPDATE gcash_qr_settings
         SET account_name = ?, account_number = ?, qr_image = ?
         WHERE id = ?`,
        [accountName, accountNumber, finalQrImage, existing.id]
      );

      return res.json({
        message: "GCash QR settings updated successfully.",
        id: existing.id,
        account_name: accountName,
        account_number: accountNumber,
        qr_image: finalQrImage,
      });
    }

    const insertResult = await runQuery(
      `INSERT INTO gcash_qr_settings (account_name, account_number, qr_image)
       VALUES (?, ?, ?)`,
      [accountName, accountNumber, finalQrImage]
    );

    return res.status(201).json({
      message: "GCash QR settings saved successfully.",
      id: insertResult?.insertId || null,
      account_name: accountName,
      account_number: accountNumber,
      qr_image: finalQrImage,
    });
  } catch (error) {
    console.error("PUT /api/gcash-qr error:", error);
    return res.status(500).json({
      message: error.message || "Failed to save GCash QR settings.",
    });
  }
});

module.exports = router;