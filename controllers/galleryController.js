const galleryModel = require('../models/galleryModel');

async function list(req, res) {
  try {
    const images = await galleryModel.findAll();
    return res.json({ images });
  } catch (err) {
    console.error('List gallery error:', err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}

async function create(req, res) {
  try {
    const { imageUrl, caption, serviceId, displayOrder } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ error: 'An image URL is required' });
    }
    const image = await galleryModel.create({ imageUrl, caption, serviceId, displayOrder });
    return res.status(201).json({ image });
  } catch (err) {
    console.error('Create gallery image error:', err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}

async function remove(req, res) {
  try {
    const existing = await galleryModel.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Image not found' });
    }
    await galleryModel.remove(req.params.id);
    return res.json({ message: 'Image deleted' });
  } catch (err) {
    console.error('Delete gallery image error:', err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}

module.exports = { list, create, remove };
