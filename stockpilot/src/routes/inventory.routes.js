const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const inventoryService = require('../services/inventory.service');

/**
 * GET /api/inventory
 * List products with pagination, search, category, and stock filters
 * Required permission: inventory.view
 */
router.get('/', authenticate, authorize('inventory.view'), (req, res) => {
  try {
    const { page, limit, search, category, stockStatus, sortBy, sortOrder } = req.query;
    const result = inventoryService.getAllProducts({
      page,
      limit,
      search,
      category,
      stockStatus,
      sortBy,
      sortOrder
    });
    return res.json(result);
  } catch (err) {
    console.error('Get inventory error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/inventory/stats
 * Real-time aggregated dashboard inventory metrics
 * Required permission: inventory.view
 */
router.get('/stats', authenticate, authorize('inventory.view'), (req, res) => {
  try {
    const stats = inventoryService.getDashboardStats();
    return res.json(stats);
  } catch (err) {
    console.error('Get stats error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/inventory/search
 * Array-based searching algorithm execution (Linear, Binary, or Both)
 * Required permission: inventory.search
 */
router.get('/search', authenticate, authorize('inventory.search'), (req, res) => {
  try {
    const { algorithm = 'both', productId } = req.query;
    if (!productId) {
      return res.status(400).json({ error: 'Query parameter "productId" is required.' });
    }

    const searchResult = inventoryService.searchArray(algorithm.toLowerCase(), productId);
    return res.json(searchResult);
  } catch (err) {
    console.error('Search error:', err.message);
    return res.status(400).json({ error: err.message });
  }
});

/**
 * GET /api/inventory/:id
 * Retrieve a single product by ID
 * Required permission: inventory.view
 */
router.get('/:id', authenticate, authorize('inventory.view'), (req, res) => {
  try {
    const product = inventoryService.getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: `Product with ID ${req.params.id} not found.` });
    }
    return res.json(product);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/inventory
 * Add a new product
 * Required permission: inventory.create
 */
router.post('/', authenticate, authorize('inventory.create'), (req, res) => {
  try {
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const newProduct = inventoryService.createProduct(req.body, req.user, clientIp);
    return res.status(201).json({
      message: 'Product created successfully.',
      product: newProduct
    });
  } catch (err) {
    console.error('Create product error:', err.message);
    return res.status(400).json({ error: err.message });
  }
});

/**
 * PUT /api/inventory/:id
 * Update an existing product
 * Required permission: inventory.update
 */
router.put('/:id', authenticate, authorize('inventory.update'), (req, res) => {
  try {
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const updated = inventoryService.updateProduct(req.params.id, req.body, req.user, clientIp);
    return res.json({
      message: 'Product updated successfully.',
      product: updated
    });
  } catch (err) {
    console.error('Update product error:', err.message);
    return res.status(400).json({ error: err.message });
  }
});

/**
 * PATCH /api/inventory/:id/stock
 * Adjust product stock levels
 * Required permission: inventory.adjust_stock
 */
router.patch('/:id/stock', authenticate, authorize('inventory.adjust_stock'), (req, res) => {
  try {
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const updated = inventoryService.adjustStock(req.params.id, req.body, req.user, clientIp);
    return res.json({
      message: 'Stock adjusted successfully.',
      product: updated
    });
  } catch (err) {
    console.error('Stock adjustment error:', err.message);
    return res.status(400).json({ error: err.message });
  }
});

/**
 * DELETE /api/inventory/:id
 * Delete a product
 * Required permission: inventory.delete
 */
router.delete('/:id', authenticate, authorize('inventory.delete'), (req, res) => {
  try {
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const result = inventoryService.deleteProduct(req.params.id, req.user, clientIp);
    return res.json(result);
  } catch (err) {
    console.error('Delete product error:', err.message);
    return res.status(400).json({ error: err.message });
  }
});

/**
 * GET /api/inventory/settings/threshold
 * View current low stock threshold
 * Required permission: inventory.view
 */
router.get('/settings/threshold', authenticate, authorize('inventory.view'), (req, res) => {
  const threshold = inventoryService.getLowStockThreshold();
  return res.json({ lowStockThreshold: threshold });
});

/**
 * POST /api/inventory/settings/threshold
 * Update low stock threshold
 * Required permission: settings.manage
 */
router.post('/settings/threshold', authenticate, authorize('settings.manage'), (req, res) => {
  try {
    const { threshold } = req.body;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const result = inventoryService.updateSetting('low_stock_threshold', threshold, req.user, clientIp);
    return res.json({ message: 'Low stock threshold updated.', threshold: Number(result.value) });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

module.exports = router;
