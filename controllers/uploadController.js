const path = require('path');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// One-time boot check — prints whether each Cloudinary credential is actually
// present (never the values themselves) so a missing/blank env var on Render
// is obvious immediately from the deploy log, without needing to trigger and
// catch a live upload request.
console.log('Cloudinary config check —',
  'cloud_name:', process.env.CLOUDINARY_CLOUD_NAME ? 'set' : 'MISSING',
  '| api_key:', process.env.CLOUDINARY_API_KEY ? 'set' : 'MISSING',
  '| api_secret:', process.env.CLOUDINARY_API_SECRET ? 'set' : 'MISSING'
);

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.webp', '.gif'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Files are held in memory only long enough to stream them to Cloudinary —
// never written to local disk. Render's filesystem is ephemeral (wiped on
// every deploy/restart), so disk storage would silently lose every
// customer's uploaded file the next time the app redeploys.
const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(new Error('Unsupported file type. Allowed: ' + ALLOWED_EXTENSIONS.join(', ')));
  }
  cb(null, true);
}

const upload = multer({
  storage: storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: fileFilter,
}).single('file');

function uploadToCloudinary(buffer, publicId) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        // 'auto' lets Cloudinary route images correctly and stores PDFs/docs
        // as raw files — both come back with a normal https URL either way.
        resource_type: 'auto',
        public_id: publicId,
        folder: 'rj-printing-hub/orders',
      },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}

exports.uploadFile = function (req, res) {
  console.log('Upload request received from user', req.user && req.user.id);
  upload(req, res, async function (err) {
    if (err instanceof multer.MulterError) {
      console.error('Multer error:', err.code, err.message);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File is too large. Max size is 10MB.' });
      }
      return res.status(400).json({ error: err.message });
    }
    if (err) {
      console.error('Upload pre-processing error:', err.message);
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      console.error('Upload request had no file attached');
      return res.status(400).json({ error: 'No file was uploaded.' });
    }

    try {
      const uniqueId = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const result = await uploadToCloudinary(req.file.buffer, uniqueId);
      console.log('Cloudinary upload succeeded:', result.secure_url);
      return res.status(201).json({ url: result.secure_url });
    } catch (cloudErr) {
      console.error('Cloudinary upload error:', cloudErr.message);
      return res.status(502).json({ error: 'Failed to upload file. Please try again.' });
    }
  });
};
