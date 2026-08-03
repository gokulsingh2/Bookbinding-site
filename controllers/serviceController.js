const serviceModel = require('../models/serviceModel');

async function listActive(req, res) {
  try {
    const services = await serviceModel.findAllActive();
    return res.json({ services });
  } catch (err) {
    console.error('List services error:', err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}

async function listForAdmin(req, res) {
  try {
    const services = await serviceModel.findAllForAdmin();
    return res.json({ services });
  } catch (err) {
    console.error('List services (admin) error:', err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}

async function getBySlug(req, res) {
  try {
    const service = await serviceModel.findBySlug(req.params.slug);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    return res.json({ service });
  } catch (err) {
    console.error('Get service error:', err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}

async function create(req, res) {
  try {
    const { name, description, basePrice, priceNote, turnaroundDays, imageUrl, displayOrder } = req.body;

    if (!name || basePrice === undefined) {
      return res.status(400).json({ error: 'Name and base price are required' });
    }
    if (isNaN(Number(basePrice)) || Number(basePrice) < 0) {
      return res.status(400).json({ error: 'Base price must be a valid positive number' });
    }

    const service = await serviceModel.create({
      name,
      description,
      basePrice,
      priceNote,
      turnaroundDays,
      imageUrl,
      displayOrder,
    });
    return res.status(201).json({ service });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'A service with a similar name already exists' });
    }
    console.error('Create service error:', err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}

async function update(req, res) {
  try {
    const existing = await serviceModel.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Service not found' });
    }

    if (req.body.basePrice !== undefined) {
      if (isNaN(Number(req.body.basePrice)) || Number(req.body.basePrice) < 0) {
        return res.status(400).json({ error: 'Base price must be a valid positive number' });
      }
    }

    const service = await serviceModel.update(req.params.id, req.body);
    return res.json({ service });
  } catch (err) {
    console.error('Update service error:', err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}

async function remove(req, res) {
  try {
    const existing = await serviceModel.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Service not found' });
    }
    await serviceModel.remove(req.params.id);
    return res.json({ message: 'Service deleted' });
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
      return res.status(409).json({
        error: 'This service has existing orders and cannot be deleted. Deactivate it instead.',
      });
    }
    console.error('Delete service error:', err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}

module.exports = { listActive, listForAdmin, getBySlug, create, update, remove };
