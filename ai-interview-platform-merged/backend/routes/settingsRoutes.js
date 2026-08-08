const express = require('express');
const router = express.Router();
const { getAllSettings } = require('../utils/settingsStore');

// GET /api/settings/public — no auth. Only exposes the two booleans that
// non-admin pages need (maintenance banner, registration gate) — never the
// raw settings table.
router.get('/public', async (req, res) => {
  try {
    const settings = await getAllSettings();
    res.status(200).json({
      maintenanceMode: settings.maintenance_mode === 'true',
      allowRegistrations: settings.allow_registrations === 'true',
    });
  } catch (err) {
    console.error('Public settings error:', err);
    res.status(500).json({ message: 'Server error fetching settings' });
  }
});

module.exports = router;
