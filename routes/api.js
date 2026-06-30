const express = require('express');
const multer = require('multer');
const path = require('path');
const logController = require('../controllers/logController');
const reportController = require('../controllers/reportController');

const router = express.Router();

// Configure multer locally for uploads inside the new temp/ directory
const upload = multer({ dest: path.join(__dirname, '../temp/') });

// Route bindings
router.get('/logs', logController.getLogs);
router.get('/stats', logController.getStats);
router.post('/upload', upload.single('file'), logController.uploadExcel);
router.post('/send-report', reportController.sendReport);

module.exports = router;
