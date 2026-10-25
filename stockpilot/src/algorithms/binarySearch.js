/**
 * StockPilot - Binary Search Algorithm
 * 
 * Searches a sorted array by repeatedly dividing the search interval in half.
 * Begins with an interval covering the whole array. If the value of the search key
 * is less than the item in the middle of the interval, narrow the interval to the lower half.
 * Otherwise, narrow it to the upper half. Repeatedly check until the value is found or the interval is empty.
 * 
 * Academic Requirement:
 * Binary Search strictly requires the dataset to be ordered by the search key.
 * A copy of the inventory array is created and sorted by productId before running the algorithm.
 * 
 * Time Complexity:
 * - Best Case: O(1) (Target is at the exact middle element on the first check)
 * - Average Case: O(log n)
 * - Worst Case: O(log n)
 * 
 * Space Complexity: O(n) to maintain the sorted copy without mutating original array,
 * and O(1) auxiliary search space.
 * 
 * @param {Array<Object>} array - Array of product objects containing productId
 * @param {number|string} targetId - Product ID to search for
 * @returns {Object} Search result containing found status, item, index, comparisons, sorted array snapshot, and steps
 */
function binarySearch(array, targetId) {
  const startTime = process.hrtime ? process.hrtime() : null;
  const target = Number(targetId);
  const steps = [];
  let comparisons = 0;
  let foundIndex = -1;
  let foundItem = null;

  if (!Array.isArray(array) || array.length === 0) {
    return {
      found: false,
      item: null,
      index: -1,
      comparisons: 0,
      totalElements: 0,
      executionTimeMs: 0,
      steps: [],
      sortedArray: [],
      requiresSortedData: true,
      complexity: {
        bestCase: 'O(1)',
        averageCase: 'O(log n)',
        worstCase: 'O(log n)'
      },
      message: 'Array is empty or invalid. No elements to search.'
    };
  }

  // 1. Academic requirement: Clone and sort a copy by productId ascending
  const sortedCopy = array
    .map((item, originalIndex) => ({ ...item, _originalIndex: originalIndex }))
    .sort((a, b) => Number(a.productId) - Number(b.productId));

  // 2. Manual iterative Binary Search implementation
  let low = 0;
  let high = sortedCopy.length - 1;
  let stepNumber = 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const midItem = sortedCopy[mid];
    const midId = Number(midItem.productId);

    comparisons++;

    const stepDetail = {
      step: stepNumber++,
      low,
      high,
      mid,
      checkedId: midId,
      targetId: target,
      comparison: midId === target ? 'MATCH' : (target < midId ? 'LESS_THAN' : 'GREATER_THAN')
    };
    steps.push(stepDetail);

    if (midId === target) {
      foundIndex = mid;
      foundItem = midItem;
      break;
    } else if (target < midId) {
      // Target is in the left subarray
      high = mid - 1;
    } else {
      // Target is in the right subarray
      low = mid + 1;
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
    indexInSortedArray: foundIndex,
    originalIndex: foundItem ? foundItem._originalIndex : -1,
    comparisons,
    totalElements: sortedCopy.length,
    executionTimeMs,
    steps,
    sortedArrayIds: sortedCopy.map(p => Number(p.productId)),
    requiresSortedData: true,
    complexity: {
      bestCase: 'O(1)',
      averageCase: 'O(log n)',
      worstCase: 'O(log n)'
    },
    message: foundIndex !== -1
      ? `Product found at sorted index ${foundIndex} in ${comparisons} comparison(s).`
      : `No product found with Product ID ${target}. Terminated after ${comparisons} comparison(s) across interval.`
  };
}

module.exports = { binarySearch };
