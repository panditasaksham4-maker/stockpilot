const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { linearSearch } = require('../src/algorithms/linearSearch');
const { binarySearch } = require('../src/algorithms/binarySearch');

describe('Searching Algorithms Test Suite', () => {
  const sampleInventory = [
    { productId: 101, name: 'Keyboard', quantity: 20, price: 750 },
    { productId: 102, name: 'Mouse', quantity: 35, price: 400 },
    { productId: 103, name: 'Monitor', quantity: 10, price: 6500 },
    { productId: 104, name: 'Hub', quantity: 5, price: 1200 },
    { productId: 105, name: 'Switch', quantity: 8, price: 3200 },
    { productId: 106, name: 'SSD', quantity: 15, price: 4500 },
    { productId: 107, name: 'Headset', quantity: 12, price: 2100 },
    { productId: 108, name: 'Printer', quantity: 4, price: 8900 }
  ];

  // LINEAR SEARCH TESTS
  test('Linear Search: Finds target at first position in O(1) comparison', () => {
    const res = linearSearch(sampleInventory, 101);
    assert.equal(res.found, true);
    assert.equal(res.item.name, 'Keyboard');
    assert.equal(res.index, 0);
    assert.equal(res.comparisons, 1);
  });

  test('Linear Search: Finds target in middle and counts exact comparisons', () => {
    const res = linearSearch(sampleInventory, 104);
    assert.equal(res.found, true);
    assert.equal(res.item.name, 'Hub');
    assert.equal(res.index, 3);
    assert.equal(res.comparisons, 4);
  });

  test('Linear Search: Searches whole array and returns not found for missing ID', () => {
    const res = linearSearch(sampleInventory, 999);
    assert.equal(res.found, false);
    assert.equal(res.item, null);
    assert.equal(res.index, -1);
    assert.equal(res.comparisons, sampleInventory.length);
    assert.match(res.message, /No product found/);
  });

  test('Linear Search: Handles empty array gracefully', () => {
    const res = linearSearch([], 101);
    assert.equal(res.found, false);
    assert.equal(res.comparisons, 0);
  });

  // BINARY SEARCH TESTS
  test('Binary Search: Requires sorted array and successfully finds element', () => {
    const unsortedArray = [
      { productId: 108, name: 'Printer' },
      { productId: 102, name: 'Mouse' },
      { productId: 101, name: 'Keyboard' },
      { productId: 106, name: 'SSD' }
    ];

    const res = binarySearch(unsortedArray, 102);
    assert.equal(res.found, true);
    assert.equal(res.item.name, 'Mouse');
    assert.equal(res.requiresSortedData, true);
    // Verifies sorted copy was created
    assert.deepEqual(res.sortedArrayIds, [101, 102, 106, 108]);
  });

  test('Binary Search: Finds middle element with minimal comparisons (logarithmic)', () => {
    const res = binarySearch(sampleInventory, 104);
    assert.equal(res.found, true);
    assert.equal(res.item.name, 'Hub');
    // For 8 elements, log2(8) = 3 comparisons max
    assert.ok(res.comparisons <= 3, `Expected comparisons <= 3, got ${res.comparisons}`);
  });

  test('Binary Search: Handles nonexistent product and returns not found', () => {
    const res = binarySearch(sampleInventory, 999);
    assert.equal(res.found, false);
    assert.equal(res.item, null);
    assert.ok(res.comparisons > 0);
    assert.match(res.message, /No product found/);
  });

  test('Binary Search: Handles empty array gracefully', () => {
    const res = binarySearch([], 101);
    assert.equal(res.found, false);
    assert.equal(res.comparisons, 0);
  });
});
