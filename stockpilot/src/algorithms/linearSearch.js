/**
 * StockPilot - Linear Search Algorithm
 * 
 * Sequentially checks each element in the array until a match is found
 * or until the entire array has been searched.
 * 
 * Time Complexity:
 * - Best Case: O(1) (Target is at index 0)
 * - Average Case: O(n) (Target is somewhere in the middle)
 * - Worst Case: O(n) (Target is at the end or not present)
 * 
 * Space Complexity: O(1) auxiliary space
 * 
 * @param {Array<Object>} array - Array of product objects containing productId
 * @param {number|string} targetId - Product ID to search for
 * @returns {Object} Search result containing found status, item, index, comparisons, and search steps
 */
function linearSearch(array, targetId) {
  const startTime = process.hrtime ? process.hrtime() : null;
  const target = Number(targetId);
  const steps = [];
  let comparisons = 0;
  let foundIndex = -1;
  let foundItem = null;

  if (!Array.isArray(array)) {
    return {
      found: false,
      item: null,
      index: -1,
      comparisons: 0,
      totalElements: 0,
      executionTimeMs: 0,
      steps: [],
      message: 'Invalid input: array must be provided.'
    };
  }

  for (let i = 0; i < array.length; i++) {
    comparisons++;
    const currentItem = array[i];
    const currentId = Number(currentItem.productId);

    steps.push({
      step: i + 1,
      index: i,
      checkedId: currentId,
      targetId: target,
      isMatch: currentId === target
    });

    if (currentId === target) {
      foundIndex = i;
      foundItem = currentItem;
      break;
    }
  }

  let executionTimeMs = 0;
  if (startTime) {
    const diff = process.hrtime(startTime);
    executionTimeMs = Number((diff[0] * 1000 + diff[1] / 1e6).toFixed(4));
  }

  return {
    found: foundIndex !== -1,
    item: foundItem,
    index: foundIndex,
    comparisons,
    totalElements: array.length,
    executionTimeMs,
    steps,
    complexity: {
      bestCase: 'O(1)',
      averageCase: 'O(n)',
      worstCase: 'O(n)'
    },
    message: foundIndex !== -1
      ? `Product found at index ${foundIndex} after ${comparisons} comparison(s).`
      : `No product found with Product ID ${target}. Examined all ${comparisons} element(s).`
  };
}

module.exports = { linearSearch };
