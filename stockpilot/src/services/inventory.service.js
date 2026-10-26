const db = require('../database/db');
const auditService = require('./audit.service');
const { linearSearch } = require('../algorithms/linearSearch');
const { binarySearch } = require('../algorithms/binarySearch');

class InventoryService {
  constructor() {
    /**
     * Core Academic Requirement:
     * Maintain a dedicated JavaScript Array representation of inventory records
     * for algorithm demonstrations (Linear Search, Binary Search) synchronized
     * with the persistent SQLite database.
     */
    this.inMemoryInventory = [];
    this.refreshMemoryArray();
  }

  /**
   * Refreshes the in-memory array from persistent SQLite storage
   */
  refreshMemoryArray() {
    const rows = db.prepare(`
      SELECT 
        product_id as productId,
        name,
        category,
        quantity,
        price,
        description,
        created_at as createdAt,
        updated_at as updatedAt
      FROM products
      ORDER BY product_id ASC
    `).all();

    this.inMemoryInventory = rows.map(r => ({
      productId: Number(r.productId),
      name: String(r.name),
      category: String(r.category),
      quantity: Number(r.quantity),
      price: Number(r.price),
      description: r.description ? String(r.description) : '',
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    }));

    return this.inMemoryInventory;
  }

  /**
   * Returns a copy of the in-memory array for algorithmic processing
   */
  getInventoryArray() {
    return [...this.inMemoryInventory];
  }

  /**
   * Retrieve low-stock threshold from settings table
   */
  getLowStockThreshold() {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'low_stock_threshold'").get();
    return row ? parseInt(row.value, 10) : 10;
  }

  /**
   * Determine stock status based on current quantity and threshold
   */
  calculateStockStatus(quantity, threshold) {
    if (quantity <= 0) {
      return { status: 'Out of Stock', badgeClass: 'badge-danger' };
    }
    if (quantity <= threshold) {
      return { status: 'Low Stock', badgeClass: 'badge-warning' };
    }
    return { status: 'In Stock', badgeClass: 'badge-success' };
  }

  /**
   * Query products with pagination, search, category filter, and sorting
   */
  getAllProducts({
    page = 1,
    limit = 10,
    search = '',
    category = '',
    stockStatus = '',
    sortBy = 'product_id',
    sortOrder = 'ASC'
  } = {}) {
    const threshold = this.getLowStockThreshold();
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    // Allowed sort columns
    const allowedSortColumns = {
      product_id: 'product_id',
      productId: 'product_id',
      name: 'name',
      category: 'category',
      quantity: 'quantity',
      price: 'price',
      updated_at: 'updated_at'
    };
    const sortCol = allowedSortColumns[sortBy] || 'product_id';
    const order = String(sortOrder).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    let whereClauses = [];
    let params = [];

    if (search && search.trim() !== '') {
      const q = `%${search.trim()}%`;
      whereClauses.push('(product_id LIKE ? OR name LIKE ? OR category LIKE ? OR description LIKE ?)');
      params.push(q, q, q, q);
    }

    if (category && category.trim() !== '' && category.trim() !== 'ALL') {
      whereClauses.push('category = ?');
      params.push(category.trim());
    }

    if (stockStatus) {
      if (stockStatus === 'OUT_OF_STOCK') {
        whereClauses.push('quantity = 0');
      } else if (stockStatus === 'LOW_STOCK') {
        whereClauses.push(`quantity > 0 AND quantity <= ${threshold}`);
      } else if (stockStatus === 'IN_STOCK') {
        whereClauses.push(`quantity > ${threshold}`);
      }
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countRow = db.prepare(`SELECT COUNT(*) as count FROM products ${whereSql}`).get(...params);
    const totalRecords = countRow ? countRow.count : 0;
    const totalPages = Math.ceil(totalRecords / limitNum) || 1;

    const rows = db.prepare(`
      SELECT 
        product_id as productId,
        name,
        category,
        quantity,
        price,
        description,
        created_at as createdAt,
        updated_at as updatedAt
      FROM products
      ${whereSql}
      ORDER BY ${sortCol} ${order}
      LIMIT ? OFFSET ?
    `).all(...params, limitNum, offset);

    const items = rows.map(r => {
      const stockInfo = this.calculateStockStatus(r.quantity, threshold);
      return {
        ...r,
        stockStatus: stockInfo.status,
        stockBadgeClass: stockInfo.badgeClass,
        totalValue: Number((r.quantity * r.price).toFixed(2))
      };
    });

    // Unique categories list for filters
    const categories = db.prepare('SELECT DISTINCT category FROM products ORDER BY category').all().map(c => c.category);

    return {
      items,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalRecords,
        totalPages
      },
      categories,
      lowStockThreshold: threshold
    };
  }

  /**
   * Find a single product by ID (from database or in-memory array)
   */
  getProductById(productId) {
    const id = Number(productId);
    const row = db.prepare(`
      SELECT 
        product_id as productId,
        name,
        category,
        quantity,
        price,
        description,
        created_at as createdAt,
        updated_at as updatedAt
      FROM products
      WHERE product_id = ?
    `).get(id);

    if (!row) {
      return null;
    }

    const threshold = this.getLowStockThreshold();
    const stockInfo = this.calculateStockStatus(row.quantity, threshold);
    return {
      ...row,
      stockStatus: stockInfo.status,
      stockBadgeClass: stockInfo.badgeClass,
      totalValue: Number((row.quantity * row.price).toFixed(2))
    };
  }

  /**
   * Create a new product
   */
  createProduct(data, actingUser, ipAddress = '127.0.0.1') {
    const productId = parseInt(data.productId, 10);
    if (!productId || isNaN(productId) || productId <= 0) {
      throw new Error('Validation failed: Product ID must be a positive integer.');
    }

    if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
      throw new Error('Validation failed: Product Name cannot be empty.');
    }

    if (!data.category || typeof data.category !== 'string' || data.category.trim() === '') {
      throw new Error('Validation failed: Product Category cannot be empty.');
    }

    const quantity = parseInt(data.quantity, 10);
    if (isNaN(quantity) || quantity < 0) {
      throw new Error('Validation failed: Quantity must be a non-negative integer.');
    }

    const price = parseFloat(data.price);
    if (isNaN(price) || price < 0) {
      throw new Error('Validation failed: Price must be a non-negative number.');
    }

    // Check for duplicate ID
    const existing = db.prepare('SELECT product_id FROM products WHERE product_id = ?').get(productId);
    if (existing) {
      throw new Error(`Validation failed: Product ID ${productId} already exists. Duplicate IDs are rejected.`);
    }

    const now = new Date().toISOString();
    const description = data.description ? String(data.description).trim() : '';

    const stmt = db.prepare(`
      INSERT INTO products (product_id, name, category, quantity, price, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(productId, data.name.trim(), data.category.trim(), quantity, price, description, now, now);
    if (typeof db.checkpoint === 'function') db.checkpoint();

    // Synchronize in-memory array representation
    this.refreshMemoryArray();

    // Audit logging
    auditService.log({
      userId: actingUser ? actingUser.id : null,
      username: actingUser ? actingUser.username : 'system',
      action: 'PRODUCT_CREATE',
      targetType: 'product',
      targetId: productId,
      details: {
        productId,
        name: data.name.trim(),
        category: data.category.trim(),
        quantity,
        price
      },
      ipAddress,
      outcome: 'SUCCESS'
    });

    return this.getProductById(productId);
  }

  /**
   * Update an existing product
   */
  updateProduct(productId, updates, actingUser, ipAddress = '127.0.0.1') {
    const id = Number(productId);
    const existing = this.getProductById(id);
    if (!existing) {
      throw new Error(`Product with ID ${id} does not exist.`);
    }

    const name = updates.name !== undefined ? String(updates.name).trim() : existing.name;
    if (!name) {
      throw new Error('Validation failed: Product Name cannot be empty.');
    }

    const category = updates.category !== undefined ? String(updates.category).trim() : existing.category;
    if (!category) {
      throw new Error('Validation failed: Product Category cannot be empty.');
    }

    const quantity = updates.quantity !== undefined ? parseInt(updates.quantity, 10) : existing.quantity;
    if (isNaN(quantity) || quantity < 0) {
      throw new Error('Validation failed: Quantity must be a non-negative integer.');
    }

    const price = updates.price !== undefined ? parseFloat(updates.price) : existing.price;
    if (isNaN(price) || price < 0) {
      throw new Error('Validation failed: Price must be a non-negative number.');
    }

    const description = updates.description !== undefined ? String(updates.description).trim() : existing.description;
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE products
      SET name = ?, category = ?, quantity = ?, price = ?, description = ?, updated_at = ?
      WHERE product_id = ?
    `);

    stmt.run(name, category, quantity, price, description, now, id);
    if (typeof db.checkpoint === 'function') db.checkpoint();

    // Synchronize in-memory array representation
    this.refreshMemoryArray();

    // Audit logging
    auditService.log({
      userId: actingUser ? actingUser.id : null,
      username: actingUser ? actingUser.username : 'system',
      action: 'PRODUCT_UPDATE',
      targetType: 'product',
      targetId: id,
      details: {
        previous: { name: existing.name, category: existing.category, quantity: existing.quantity, price: existing.price },
        updated: { name, category, quantity, price }
      },
      ipAddress,
      outcome: 'SUCCESS'
    });

    return this.getProductById(id);
  }

  /**
   * Stock adjustment (e.g., received shipment, inventory recount, damaged stock write-off)
   */
  adjustStock(productId, { adjustmentType = 'add', amount = 0, newQuantity = null, reason = '' }, actingUser, ipAddress = '127.0.0.1') {
    const id = Number(productId);
    const existing = this.getProductById(id);
    if (!existing) {
      throw new Error(`Product with ID ${id} does not exist.`);
    }

    let calculatedQuantity = existing.quantity;

    if (adjustmentType === 'set') {
      const parsedQty = parseInt(newQuantity !== null ? newQuantity : amount, 10);
      if (isNaN(parsedQty) || parsedQty < 0) {
        throw new Error('Validation failed: Adjusted quantity cannot be negative.');
      }
      calculatedQuantity = parsedQty;
    } else if (adjustmentType === 'add') {
      const parsedAmount = parseInt(amount, 10);
      if (isNaN(parsedAmount) || parsedAmount < 0) {
        throw new Error('Validation failed: Adjustment amount must be a positive integer.');
      }
      calculatedQuantity += parsedAmount;
    } else if (adjustmentType === 'subtract') {
      const parsedAmount = parseInt(amount, 10);
      if (isNaN(parsedAmount) || parsedAmount < 0) {
        throw new Error('Validation failed: Adjustment amount must be a positive integer.');
      }
      if (existing.quantity - parsedAmount < 0) {
        throw new Error(`Validation failed: Cannot reduce stock below zero. Current stock is ${existing.quantity}.`);
      }
      calculatedQuantity -= parsedAmount;
    } else {
      throw new Error(`Unsupported adjustment type: ${adjustmentType}`);
    }

    const now = new Date().toISOString();
    db.prepare('UPDATE products SET quantity = ?, updated_at = ? WHERE product_id = ?').run(calculatedQuantity, now, id);
    if (typeof db.checkpoint === 'function') db.checkpoint();

    this.refreshMemoryArray();

    auditService.log({
      userId: actingUser ? actingUser.id : null,
      username: actingUser ? actingUser.username : 'system',
      action: 'PRODUCT_STOCK_ADJUST',
      targetType: 'product',
      targetId: id,
      details: {
        adjustmentType,
        previousQuantity: existing.quantity,
        newQuantity: calculatedQuantity,
        reason: reason || 'Manual stock adjustment'
      },
      ipAddress,
      outcome: 'SUCCESS'
    });

    return this.getProductById(id);
  }

  /**
   * Delete a product
   */
  deleteProduct(productId, actingUser, ipAddress = '127.0.0.1') {
    const id = Number(productId);
    const existing = this.getProductById(id);
    if (!existing) {
      throw new Error(`Product with ID ${id} does not exist.`);
    }

    db.prepare('DELETE FROM products WHERE product_id = ?').run(id);
    if (typeof db.checkpoint === 'function') db.checkpoint();

    this.refreshMemoryArray();

    auditService.log({
      userId: actingUser ? actingUser.id : null,
      username: actingUser ? actingUser.username : 'system',
      action: 'PRODUCT_DELETE',
      targetType: 'product',
      targetId: id,
      details: {
        deletedProduct: existing
      },
      ipAddress,
      outcome: 'SUCCESS'
    });

    return { success: true, message: `Product ${id} (${existing.name}) deleted successfully.` };
  }

  /**
   * Algorithmic Search: Executes Linear or Binary Search on the in-memory array representation
   */
  searchArray(algorithm, targetId) {
    const parsedId = Number(targetId);
    if (isNaN(parsedId)) {
      throw new Error('Target product ID must be a valid number.');
    }

    // Refresh memory array snapshot if needed
    const currentArray = this.getInventoryArray();
    const threshold = this.getLowStockThreshold();

    if (algorithm === 'linear') {
      const res = linearSearch(currentArray, parsedId);
      if (res.item) {
        const stockInfo = this.calculateStockStatus(res.item.quantity, threshold);
        res.item = { ...res.item, stockStatus: stockInfo.status, stockBadgeClass: stockInfo.badgeClass };
      }
      return res;
    }

    if (algorithm === 'binary') {
      const res = binarySearch(currentArray, parsedId);
      if (res.item) {
        const stockInfo = this.calculateStockStatus(res.item.quantity, threshold);
        res.item = { ...res.item, stockStatus: stockInfo.status, stockBadgeClass: stockInfo.badgeClass };
      }
      return res;
    }

    if (algorithm === 'both') {
      const linearResult = linearSearch(currentArray, parsedId);
      const binaryResult = binarySearch(currentArray, parsedId);

      const targetItem = linearResult.item || binaryResult.item;
      let enrichedItem = null;
      if (targetItem) {
        const stockInfo = this.calculateStockStatus(targetItem.quantity, threshold);
        enrichedItem = { ...targetItem, stockStatus: stockInfo.status, stockBadgeClass: stockInfo.badgeClass };
      }

      return {
        targetId: parsedId,
        found: linearResult.found,
        item: enrichedItem,
        totalItemsInArray: currentArray.length,
        linear: {
          comparisons: linearResult.comparisons,
          executionTimeMs: linearResult.executionTimeMs,
          complexity: linearResult.complexity,
          steps: linearResult.steps,
          message: linearResult.message
        },
        binary: {
          comparisons: binaryResult.comparisons,
          executionTimeMs: binaryResult.executionTimeMs,
          complexity: binaryResult.complexity,
          requiresSortedData: true,
          sortedArrayIds: binaryResult.sortedArrayIds,
          steps: binaryResult.steps,
          message: binaryResult.message
        },
        comparisonAnalysis: {
          differenceInComparisons: linearResult.comparisons - binaryResult.comparisons,
          moreEfficient: binaryResult.comparisons <= linearResult.comparisons ? 'Binary Search' : 'Linear Search',
          note: 'Binary Search achieves logarithmic O(log n) efficiency by requiring array sorting before searching, whereas Linear Search checks elements sequentially O(n).'
        }
      };
    }

    throw new Error(`Unsupported search algorithm: ${algorithm}. Must be 'linear', 'binary', or 'both'.`);
  }

  /**
   * Dashboard Statistics
   * Calculates actual aggregated data directly from database & current inventory
   */
  getDashboardStats() {
    const threshold = this.getLowStockThreshold();

    // Aggregates
    const agg = db.prepare(`
      SELECT 
        COUNT(*) as totalProducts,
        COALESCE(SUM(quantity), 0) as totalUnits,
        COALESCE(SUM(quantity * price), 0.0) as totalValue,
        COALESCE(SUM(CASE WHEN quantity > 0 AND quantity <= ? THEN 1 ELSE 0 END), 0) as lowStockCount,
        COALESCE(SUM(CASE WHEN quantity = 0 THEN 1 ELSE 0 END), 0) as outOfStockCount
      FROM products
    `).get(threshold);

    // Recently added products (last 5)
    const recentlyAdded = db.prepare(`
      SELECT product_id as productId, name, category, quantity, price, created_at as createdAt
      FROM products
      ORDER BY created_at DESC
      LIMIT 5
    `).all();

    // Recently updated products (last 5)
    const recentlyUpdated = db.prepare(`
      SELECT product_id as productId, name, category, quantity, price, updated_at as updatedAt
      FROM products
      ORDER BY updated_at DESC
      LIMIT 5
    `).all();

    // Recent inventory activities from audit log
    const recentActivity = auditService.getRecentActivity(6);

    return {
      totalProducts: Number(agg.totalProducts || 0),
      totalUnits: Number(agg.totalUnits || 0),
      totalValue: Number(Number(agg.totalValue || 0).toFixed(2)),
      lowStockCount: Number(agg.lowStockCount || 0),
      outOfStockCount: Number(agg.outOfStockCount || 0),
      inStockCount: Number(agg.totalProducts - (agg.lowStockCount + agg.outOfStockCount)),
      lowStockThreshold: threshold,
      recentlyAdded,
      recentlyUpdated,
      recentActivity
    };
  }

  /**
   * Update system settings (e.g., low stock threshold)
   */
  updateSetting(key, value, actingUser, ipAddress = '127.0.0.1') {
    if (key === 'low_stock_threshold') {
      const parsed = parseInt(value, 10);
      if (isNaN(parsed) || parsed < 1) {
        throw new Error('Low stock threshold must be a positive integer.');
      }
      value = String(parsed);
    }

    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, String(value));

    auditService.log({
      userId: actingUser ? actingUser.id : null,
      username: actingUser ? actingUser.username : 'system',
      action: 'SETTINGS_UPDATE',
      targetType: 'setting',
      targetId: key,
      details: { key, value },
      ipAddress,
      outcome: 'SUCCESS'
    });

    return { key, value };
  }
}

module.exports = new InventoryService();
