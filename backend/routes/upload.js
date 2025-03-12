const express = require("express");
const upload = require("../middlewares/upload");
const router = express.Router();

router.post("/", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No image uploaded" });
  }
  const imageUrl = `/uploads/${req.file.filename}`;
  res.json({ imageUrl });
});

module.exports = router;
