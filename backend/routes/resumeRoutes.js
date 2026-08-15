const express    = require('express')
const router     = express.Router()
const upload     = require('../config/multer')
const { authenticate } = require('../middleware/auth')
const ctrl       = require('../controllers/resumeController')

router.post('/upload', authenticate, upload.single('resume'), ctrl.upload)
router.get('/history',       authenticate, ctrl.getHistory)
router.get('/:id',           authenticate, ctrl.getById)
router.get('/:id/download',  authenticate, ctrl.downloadResume)
router.delete('/:id',        authenticate, ctrl.deleteResume)

module.exports = router
