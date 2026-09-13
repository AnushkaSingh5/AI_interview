const CURATED_PROBLEMS = [
  {
    problemId: 'two-sum',
    title: 'Two Sum',
    difficulty: 'Easy',
    category: 'Arrays, Two Pointers',
    topics: ['Arrays', 'Two Pointers'],
    description: `Given an array of integers \`nums\` and an integer \`target\`, return the indices of the two numbers such that they add up to \`target\`.

You may assume that each input would have **exactly one solution**, and you may not use the same element twice.

You can return the answer in any order.`,
    constraints: [
      '2 <= nums.length <= 10^4',
      '-10^9 <= nums[i] <= 10^9',
      '-10^9 <= target <= 10^9',
      'Only one valid answer exists.'
    ],
    examples: [
      {
        input: '[2, 7, 11, 15], 9',
        output: '[0, 1]',
        explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].'
      },
      {
        input: '[3, 2, 4], 6',
        output: '[1, 2]',
        explanation: 'nums[1] + nums[2] == 6, so we return [1, 2].'
      },
      {
        input: '[3, 3], 6',
        output: '[0, 1]',
        explanation: 'nums[0] + nums[1] == 6, so we return [0, 1].'
      }
    ],
    starterCode: {
      c: `/**
 * Note: The returned array must be malloced, assume caller calls free().
 */
#include <stdio.h>
#include <stdlib.h>

int* twoSum(int* nums, int numsSize, int target, int* returnSize) {
    // Write your solution here
    *returnSize = 0;
    return NULL;
}`,
      cpp: `#include <vector>
using namespace std;

class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        // Write your solution here
        return {};
    }
};`,
      java: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Write your solution here
        return new int[]{};
    }
}`,
      python: `def twoSum(nums: list[int], target: int) -> list[int]:
    # Write your solution here
    return []`,
      javascript: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
function twoSum(nums, target) {
  // Write your code here
  return [];
}`
    },
    testCases: [
      { input: '[2, 7, 11, 15], 9', expectedOutput: '[0, 1]', isHidden: false },
      { input: '[3, 2, 4], 6', expectedOutput: '[1, 2]', isHidden: false },
      { input: '[3, 3], 6', expectedOutput: '[0, 1]', isHidden: false },
      { input: '[1, 4, 8, 10, 19], 20', expectedOutput: '[0, 4]', isHidden: true },
      { input: '[-3, 4, 3, 90], 0', expectedOutput: '[0, 2]', isHidden: true }
    ]
  },
  {
    problemId: 'valid-palindrome',
    title: 'Valid Palindrome',
    difficulty: 'Easy',
    category: 'Strings, Two Pointers',
    topics: ['Strings', 'Two Pointers'],
    description: `A phrase is a **palindrome** if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward.

Given a string \`s\`, return \`true\` if it is a palindrome, or \`false\` otherwise.`,
    constraints: [
      '1 <= s.length <= 2 * 10^5',
      's consists only of printable ASCII characters.'
    ],
    examples: [
      { input: '"A man, a plan, a canal: Panama"', output: 'true', explanation: '"amanaplanacanalpanama" is a palindrome.' },
      { input: '"race a car"', output: 'false', explanation: '"raceacar" is not a palindrome.' },
      { input: '" "', output: 'true', explanation: 'Empty after filtering non-alphanumeric chars.' }
    ],
    starterCode: {
      c: `#include <stdbool.h>
#include <string.h>
#include <ctype.h>

bool isPalindrome(char* s) {
    // Write your solution here
    return false;
}`,
      cpp: `#include <string>
using namespace std;

class Solution {
public:
    bool isPalindrome(string s) {
        // Write your solution here
        return false;
    }
};`,
      java: `class Solution {
    public boolean isPalindrome(String s) {
        // Write your solution here
        return false;
    }
}`,
      python: `def isPalindrome(s: str) -> bool:
    # Write your solution here
    return False`,
      javascript: `/**
 * @param {string} s
 * @return {boolean}
 */
function isPalindrome(s) {
  // Write your code here
  return false;
}`
    },
    testCases: [
      { input: '"A man, a plan, a canal: Panama"', expectedOutput: 'true', isHidden: false },
      { input: '"race a car"', expectedOutput: 'false', isHidden: false },
      { input: '" "', expectedOutput: 'true', isHidden: false },
      { input: '"0P"', expectedOutput: 'false', isHidden: true },
      { input: '"ab_a"', expectedOutput: 'true', isHidden: true }
    ]
  },
  {
    problemId: 'binary-search',
    title: 'Binary Search',
    difficulty: 'Easy',
    category: 'Binary Search, Arrays',
    topics: ['Binary Search', 'Arrays'],
    description: `Given an array of integers \`nums\` which is sorted in ascending order, and an integer \`target\`, write a function to search \`target\` in \`nums\`. If \`target\` exists, then return its index. Otherwise, return \`-1\`.

You must write an algorithm with **O(log n)** runtime complexity.`,
    constraints: [
      '1 <= nums.length <= 10^4',
      '-10^4 < nums[i], target < 10^4',
      'All integers in nums are unique and sorted in ascending order.'
    ],
    examples: [
      { input: '[-1, 0, 3, 5, 9, 12], 9', output: '4', explanation: '9 exists in nums and its index is 4' },
      { input: '[-1, 0, 3, 5, 9, 12], 2', output: '-1', explanation: '2 does not exist in nums so return -1' }
    ],
    starterCode: {
      c: `int search(int* nums, int numsSize, int target) {
    // Write your solution here
    return -1;
}`,
      cpp: `#include <vector>
using namespace std;

class Solution {
public:
    int search(vector<int>& nums, int target) {
        // Write your solution here
        return -1;
    }
};`,
      java: `class Solution {
    public int search(int[] nums, int target) {
        // Write your solution here
        return -1;
    }
}`,
      python: `def search(nums: list[int], target: int) -> int:
    # Write your solution here
    return -1`,
      javascript: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number}
 */
function search(nums, target) {
  // Write your code here
  return -1;
}`
    },
    testCases: [
      { input: '[-1, 0, 3, 5, 9, 12], 9', expectedOutput: '4', isHidden: false },
      { input: '[-1, 0, 3, 5, 9, 12], 2', expectedOutput: '-1', isHidden: false },
      { input: '[5], 5', expectedOutput: '0', isHidden: true },
      { input: '[1, 3, 5, 7, 9], 1', expectedOutput: '0', isHidden: true },
      { input: '[1, 3, 5, 7, 9], 9', expectedOutput: '4', isHidden: true }
    ]
  },
  {
    problemId: 'maximum-subarray',
    title: 'Maximum Subarray (Kadane\'s Algorithm)',
    difficulty: 'Medium',
    category: 'DP, Greedy, Arrays',
    topics: ['DP', 'Greedy', 'Arrays'],
    description: `Given an integer array \`nums\`, find the subarray with the largest sum, and return *its sum*.

A **subarray** is a contiguous non-empty sequence of elements within an array.`,
    constraints: [
      '1 <= nums.length <= 10^5',
      '-10^4 <= nums[i] <= 10^4'
    ],
    examples: [
      { input: '[-2, 1, -3, 4, -1, 2, 1, -5, 4]', output: '6', explanation: 'Subarray [4, -1, 2, 1] has largest sum 6.' },
      { input: '[1]', output: '1', explanation: 'Single element subarray sum is 1.' },
      { input: '[5, 4, -1, 7, 8]', output: '23', explanation: 'Entire array sum is 23.' }
    ],
    starterCode: {
      c: `#include <stdio.h>

int maxSubArray(int* nums, int numsSize) {
    // Write your solution here
    return 0;
}`,
      cpp: `#include <vector>
using namespace std;

class Solution {
public:
    int maxSubArray(vector<int>& nums) {
        // Write your solution here
        return 0;
    }
};`,
      java: `class Solution {
    public int maxSubArray(int[] nums) {
        // Write your solution here
        return 0;
    }
}`,
      python: `def maxSubArray(nums: list[int]) -> int:
    # Write your solution here
    return 0`,
      javascript: `/**
 * @param {number[]} nums
 * @return {number}
 */
function maxSubArray(nums) {
  // Write your code here
  return 0;
}`
    },
    testCases: [
      { input: '[-2, 1, -3, 4, -1, 2, 1, -5, 4]', expectedOutput: '6', isHidden: false },
      { input: '[1]', expectedOutput: '1', isHidden: false },
      { input: '[5, 4, -1, 7, 8]', expectedOutput: '23', isHidden: false },
      { input: '[-1]', expectedOutput: '-1', isHidden: true },
      { input: '[-5, -2, -8, -1]', expectedOutput: '-1', isHidden: true }
    ]
  },
  {
    problemId: 'longest-substring-without-repeating-characters',
    title: 'Longest Substring Without Repeating Characters',
    difficulty: 'Medium',
    category: 'Sliding Window, Strings, Two Pointers',
    topics: ['Sliding Window', 'Strings', 'Two Pointers'],
    description: `Given a string \`s\`, find the length of the **longest substring** without repeating characters.`,
    constraints: [
      '0 <= s.length <= 5 * 10^4',
      's consists of English letters, digits, symbols and spaces.'
    ],
    examples: [
      { input: '"abcabcbb"', output: '3', explanation: 'The answer is "abc", with length of 3.' },
      { input: '"bbbbb"', output: '1', explanation: 'The answer is "b", with length of 1.' },
      { input: '"pwwkew"', output: '3', explanation: 'The answer is "wke", with length of 3.' }
    ],
    starterCode: {
      c: `#include <string.h>

int lengthOfLongestSubstring(char* s) {
    // Write your solution here
    return 0;
}`,
      cpp: `#include <string>
using namespace std;

class Solution {
public:
    int lengthOfLongestSubstring(string s) {
        // Write your solution here
        return 0;
    }
};`,
      java: `class Solution {
    public int lengthOfLongestSubstring(String s) {
        // Write your solution here
        return 0;
    }
}`,
      python: `def lengthOfLongestSubstring(s: str) -> int:
    # Write your solution here
    return 0`,
      javascript: `/**
 * @param {string} s
 * @return {number}
 */
function lengthOfLongestSubstring(s) {
  // Write your code here
  return 0;
}`
    },
    testCases: [
      { input: '"abcabcbb"', expectedOutput: '3', isHidden: false },
      { input: '"bbbbb"', expectedOutput: '1', isHidden: false },
      { input: '"pwwkew"', expectedOutput: '3', isHidden: false },
      { input: '""', expectedOutput: '0', isHidden: true },
      { input: '"dvdf"', expectedOutput: '3', isHidden: true }
    ]
  },
  {
    problemId: 'valid-parentheses',
    title: 'Valid Parentheses',
    difficulty: 'Easy',
    category: 'Stack, Strings',
    topics: ['Stack', 'Strings'],
    description: `Given a string \`s\` containing just the characters \`'('\`, \`')'\`, \`'{'\`, \`'}'\`, \`'['\` and \`']'\`, determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.`,
    constraints: [
      '1 <= s.length <= 10^4',
      's consists of parentheses only "()[]{}"'
    ],
    examples: [
      { input: '"()"', output: 'true', explanation: 'Valid pair' },
      { input: '"()[]{}"', output: 'true', explanation: 'All valid pairs' },
      { input: '"(]"', output: 'false', explanation: 'Mismatched pair' }
    ],
    starterCode: {
      c: `#include <stdbool.h>

bool isValid(char* s) {
    // Write your solution here
    return false;
}`,
      cpp: `#include <string>
using namespace std;

class Solution {
public:
    bool isValid(string s) {
        // Write your solution here
        return false;
    }
};`,
      java: `class Solution {
    public boolean isValid(String s) {
        // Write your solution here
        return false;
    }
}`,
      python: `def isValid(s: str) -> bool:
    # Write your solution here
    return False`,
      javascript: `/**
 * @param {string} s
 * @return {boolean}
 */
function isValid(s) {
  // Write your code here
  return false;
}`
    },
    testCases: [
      { input: '"()"', expectedOutput: 'true', isHidden: false },
      { input: '"()[]{}"', expectedOutput: 'true', isHidden: false },
      { input: '"(]"', expectedOutput: 'false', isHidden: false },
      { input: '"([)]"', expectedOutput: 'false', isHidden: true },
      { input: '"{[]}"', expectedOutput: 'true', isHidden: true }
    ]
  },
  {
    problemId: 'single-number',
    title: 'Single Number',
    difficulty: 'Easy',
    category: 'Bit Manipulation, Arrays',
    topics: ['Bit Manipulation', 'Arrays'],
    description: `Given a **non-empty** array of integers \`nums\`, every element appears *twice* except for one. Find that single one.

You must implement a solution with a linear runtime complexity **O(n)** and use only constant extra space **O(1)**.`,
    constraints: [
      '1 <= nums.length <= 3 * 10^4',
      '-3 * 10^4 <= nums[i] <= 3 * 10^4',
      'Each element in the array appears twice except for one element which appears only once.'
    ],
    examples: [
      { input: '[2, 2, 1]', output: '1', explanation: '1 appears once' },
      { input: '[4, 1, 2, 1, 2]', output: '4', explanation: '4 appears once' },
      { input: '[1]', output: '1', explanation: 'Single element is 1' }
    ],
    starterCode: {
      c: `int singleNumber(int* nums, int numsSize) {
    // Write your solution here
    return 0;
}`,
      cpp: `#include <vector>
using namespace std;

class Solution {
public:
    int singleNumber(vector<int>& nums) {
        // Write your solution here
        return 0;
    }
};`,
      java: `class Solution {
    public int singleNumber(int[] nums) {
        // Write your solution here
        return 0;
    }
}`,
      python: `def singleNumber(nums: list[int]) -> int:
    # Write your solution here
    return 0`,
      javascript: `/**
 * @param {number[]} nums
 * @return {number}
 */
function singleNumber(nums) {
  // Write your code here
  return 0;
}`
    },
    testCases: [
      { input: '[2, 2, 1]', expectedOutput: '1', isHidden: false },
      { input: '[4, 1, 2, 1, 2]', expectedOutput: '4', isHidden: false },
      { input: '[1]', expectedOutput: '1', isHidden: false },
      { input: '[7, 3, 5, 3, 7]', expectedOutput: '5', isHidden: true },
      { input: '[-1, -1, -2]', expectedOutput: '-2', isHidden: true }
    ]
  },
  {
    problemId: 'climbing-stairs',
    title: 'Climbing Stairs',
    difficulty: 'Easy',
    category: 'DP, Recursion',
    topics: ['DP', 'Recursion'],
    description: `You are climbing a staircase. It takes \`n\` steps to reach the top.

Each time you can either climb \`1\` or \`2\` steps. In how many distinct ways can you climb to the top?`,
    constraints: [
      '1 <= n <= 45'
    ],
    examples: [
      { input: '2', output: '2', explanation: '1+1 or 2 (2 ways)' },
      { input: '3', output: '3', explanation: '1+1+1, 1+2, or 2+1 (3 ways)' }
    ],
    starterCode: {
      c: `int climbStairs(int n) {
    // Write your solution here
    return 0;
}`,
      cpp: `class Solution {
public:
    int climbStairs(int n) {
        // Write your solution here
        return 0;
    }
};`,
      java: `class Solution {
    public int climbStairs(int n) {
        // Write your solution here
        return 0;
    }
}`,
      python: `def climbStairs(n: int) -> int:
    # Write your solution here
    return 0`,
      javascript: `/**
 * @param {number} n
 * @return {number}
 */
function climbStairs(n) {
  // Write your code here
  return 0;
}`
    },
    testCases: [
      { input: '2', expectedOutput: '2', isHidden: false },
      { input: '3', expectedOutput: '3', isHidden: false },
      { input: '4', expectedOutput: '5', isHidden: true },
      { input: '5', expectedOutput: '8', isHidden: true },
      { input: '6', expectedOutput: '13', isHidden: true }
    ]
  },
  {
    problemId: 'reverse-linked-list',
    title: 'Reverse Linked List',
    difficulty: 'Easy',
    category: 'Linked List, Recursion',
    topics: ['Linked List', 'Recursion'],
    description: `Given the \`head\` of a singly linked list (represented as an array of values), reverse the list, and return *the reversed list*.`,
    constraints: [
      'The number of nodes in the list is in the range [0, 5000].',
      '-5000 <= Node.val <= 5000'
    ],
    examples: [
      { input: '[1, 2, 3, 4, 5]', output: '[5, 4, 3, 2, 1]', explanation: 'Reversed order' },
      { input: '[1, 2]', output: '[2, 1]', explanation: 'Reversed order' },
      { input: '[]', output: '[]', explanation: 'Empty list reversed is empty' }
    ],
    starterCode: {
      c: `#include <stdlib.h>

int* reverseList(int* head, int headSize, int* returnSize) {
    // Write your solution here
    *returnSize = 0;
    return NULL;
}`,
      cpp: `#include <vector>
using namespace std;

class Solution {
public:
    vector<int> reverseList(vector<int>& head) {
        // Write your solution here
        return {};
    }
};`,
      java: `class Solution {
    public int[] reverseList(int[] head) {
        // Write your solution here
        return new int[]{};
    }
}`,
      python: `def reverseList(head: list[int]) -> list[int]:
    # Write your solution here
    return []`,
      javascript: `/**
 * @param {number[]} head
 * @return {number[]}
 */
function reverseList(head) {
  // Write your code here
  return [];
}`
    },
    testCases: [
      { input: '[1, 2, 3, 4, 5]', expectedOutput: '[5, 4, 3, 2, 1]', isHidden: false },
      { input: '[1, 2]', expectedOutput: '[2, 1]', isHidden: false },
      { input: '[]', expectedOutput: '[]', isHidden: false },
      { input: '[9, 8, 7]', expectedOutput: '[7, 8, 9]', isHidden: true }
    ]
  },
  {
    problemId: 'container-with-most-water',
    title: 'Container With Most Water',
    difficulty: 'Medium',
    category: 'Two Pointers, Greedy, Arrays',
    topics: ['Two Pointers', 'Greedy', 'Arrays'],
    description: `You are given an integer array \`height\` of length \`n\`. There are \`n\` vertical lines drawn such that the two endpoints of the \`i-th\` line are \`(i, 0)\` and \`(i, height[i])\`.

Find two lines that together with the x-axis form a container, such that the container contains the most water.

Return *the maximum amount of water a container can store*.`,
    constraints: [
      'n == height.length',
      '2 <= n <= 10^5',
      '0 <= height[i] <= 10^4'
    ],
    examples: [
      { input: '[1, 8, 6, 2, 5, 4, 8, 3, 7]', output: '49', explanation: 'Max area is between 8 and 7 with width 7 (7 * 7 = 49).' },
      { input: '[1, 1]', output: '1', explanation: 'Min height 1 with width 1 = 1' }
    ],
    starterCode: {
      c: `int maxArea(int* height, int heightSize) {
    // Write your solution here
    return 0;
}`,
      cpp: `#include <vector>
using namespace std;

class Solution {
public:
    int maxArea(vector<int>& height) {
        // Write your solution here
        return 0;
    }
};`,
      java: `class Solution {
    public int maxArea(int[] height) {
        // Write your solution here
        return 0;
    }
}`,
      python: `def maxArea(height: list[int]) -> int:
    # Write your solution here
    return 0`,
      javascript: `/**
 * @param {number[]} height
 * @return {number}
 */
function maxArea(height) {
  // Write your code here
  return 0;
}`
    },
    testCases: [
      { input: '[1, 8, 6, 2, 5, 4, 8, 3, 7]', expectedOutput: '49', isHidden: false },
      { input: '[1, 1]', expectedOutput: '1', isHidden: false },
      { input: '[4, 3, 2, 1, 4]', expectedOutput: '16', isHidden: true },
      { input: '[1, 2, 1]', expectedOutput: '2', isHidden: true }
    ]
  },
  {
    problemId: 'kth-largest-element',
    title: 'Kth Largest Element in an Array',
    difficulty: 'Medium',
    category: 'Heap, Arrays',
    topics: ['Heap', 'Arrays'],
    description: `Given an integer array \`nums\` and an integer \`k\`, return the \`k\`-th largest element in the array.

Note that it is the \`k\`-th largest element in sorted order, not the \`k\`-th distinct element.`,
    constraints: [
      '1 <= k <= nums.length <= 10^5',
      '-10^4 <= nums[i] <= 10^4'
    ],
    examples: [
      { input: '[3, 2, 1, 5, 6, 4], 2', output: '5', explanation: 'Sorted: [1,2,3,4,5,6], 2nd largest is 5' },
      { input: '[3, 2, 3, 1, 2, 4, 5, 5, 6], 4', output: '4', explanation: '4th largest is 4' }
    ],
    starterCode: {
      c: `int findKthLargest(int* nums, int numsSize, int k) {
    // Write your solution here
    return 0;
}`,
      cpp: `#include <vector>
using namespace std;

class Solution {
public:
    int findKthLargest(vector<int>& nums, int k) {
        // Write your solution here
        return 0;
    }
};`,
      java: `class Solution {
    public int findKthLargest(int[] nums, int k) {
        // Write your solution here
        return 0;
    }
}`,
      python: `def findKthLargest(nums: list[int], k: int) -> int:
    # Write your solution here
    return 0`,
      javascript: `/**
 * @param {number[]} nums
 * @param {number} k
 * @return {number}
 */
function findKthLargest(nums, k) {
  // Write your code here
  return 0;
}`
    },
    testCases: [
      { input: '[3, 2, 1, 5, 6, 4], 2', expectedOutput: '5', isHidden: false },
      { input: '[3, 2, 3, 1, 2, 4, 5, 5, 6], 4', expectedOutput: '4', isHidden: false },
      { input: '[1], 1', expectedOutput: '1', isHidden: true },
      { input: '[7, 10, 4, 3, 20, 15], 3', expectedOutput: '10', isHidden: true }
    ]
  },
  {
    problemId: 'max-depth-binary-tree',
    title: 'Maximum Depth of Binary Tree',
    difficulty: 'Easy',
    category: 'Trees, Recursion',
    topics: ['Trees', 'Recursion'],
    description: `Given the array representation of a binary tree \`root\` (in level-order format), return its **maximum depth**.

A binary tree's maximum depth is the number of nodes along the longest path from the root node down to the farthest leaf node.`,
    constraints: [
      'The number of nodes in the tree is in the range [0, 10^4].',
      '-100 <= Node.val <= 100'
    ],
    examples: [
      { input: '[3, 9, 20, null, null, 15, 7]', output: '3', explanation: 'Max depth is 3 nodes (3 -> 20 -> 7)' },
      { input: '[1, null, 2]', output: '2', explanation: 'Max depth is 2 nodes' },
      { input: '[]', output: '0', explanation: 'Empty tree has depth 0' }
    ],
    starterCode: {
      c: `int maxDepth(int* root, int rootSize) {
    // Write your solution here
    return 0;
}`,
      cpp: `#include <vector>
using namespace std;

class Solution {
public:
    int maxDepth(vector<int>& root) {
        // Write your solution here
        return 0;
    }
};`,
      java: `class Solution {
    public int maxDepth(Integer[] root) {
        // Write your solution here
        return 0;
    }
}`,
      python: `def maxDepth(root: list) -> int:
    # Write your solution here
    return 0`,
      javascript: `/**
 * @param {Array} root
 * @return {number}
 */
function maxDepth(root) {
  // Write your code here
  return 0;
}`
    },
    testCases: [
      { input: '[3, 9, 20, null, null, 15, 7]', expectedOutput: '3', isHidden: false },
      { input: '[1, null, 2]', expectedOutput: '2', isHidden: false },
      { input: '[]', expectedOutput: '0', isHidden: false }
    ]
  },
  {
    problemId: 'number-of-islands',
    title: 'Number of Islands',
    difficulty: 'Medium',
    category: 'Graphs, Recursion, Arrays',
    topics: ['Graphs', 'Recursion', 'Arrays'],
    description: `Given an \`m x n\` 2D binary grid \`grid\` which represents a map of \`'1'\`s (land) and \`'0'\`s (water), return *the number of islands*.

An **island** is surrounded by water and is formed by connecting adjacent lands horizontally or vertically. You may assume all four edges of the grid are all surrounded by water.`,
    constraints: [
      'm == grid.length',
      'n == grid[i].length',
      '1 <= m, n <= 300',
      'grid[i][j] is "0" or "1".'
    ],
    examples: [
      {
        input: '[["1","1","1","1","0"],["1","1","0","1","0"],["1","1","0","0","0"],["0","0","0","0","0"]]',
        output: '1',
        explanation: 'All 1s connect into 1 single island.'
      },
      {
        input: '[["1","1","0","0","0"],["1","1","0","0","0"],["0","0","1","0","0"],["0","0","0","1","1"]]',
        output: '3',
        explanation: '3 separate islands.'
      }
    ],
    starterCode: {
      c: `int numIslands(char** grid, int gridSize, int* gridColSize) {
    // Write your solution here
    return 0;
}`,
      cpp: `#include <vector>
using namespace std;

class Solution {
public:
    int numIslands(vector<vector<char>>& grid) {
        // Write your solution here
        return 0;
    }
};`,
      java: `class Solution {
    public int numIslands(char[][] grid) {
        // Write your solution here
        return 0;
    }
}`,
      python: `def numIslands(grid: list[list[str]]) -> int:
    # Write your solution here
    return 0`,
      javascript: `/**
 * @param {character[][]} grid
 * @return {number}
 */
function numIslands(grid) {
  // Write your code here
  return 0;
}`
    },
    testCases: [
      {
        input: '[["1","1","1","1","0"],["1","1","0","1","0"],["1","1","0","0","0"],["0","0","0","0","0"]]',
        expectedOutput: '1',
        isHidden: false
      },
      {
        input: '[["1","1","0","0","0"],["1","1","0","0","0"],["0","0","1","0","0"],["0","0","0","1","1"]]',
        expectedOutput: '3',
        isHidden: false
      }
    ]
  },
  {
    problemId: 'queue-using-stacks',
    title: 'Implement Queue using Stacks',
    difficulty: 'Easy',
    category: 'Queue, Stack',
    topics: ['Queue', 'Stack'],
    description: `Implement a first in first out (FIFO) queue using only two stacks. The implemented queue should support all the functions of a normal queue (\`push\`, \`pop\`, \`peek\`, and \`empty\`).

Execute the series of operations and return the output array.`,
    constraints: [
      '1 <= operations.length <= 100',
      'All values are between 1 and 1000'
    ],
    examples: [
      {
        input: '["push", "push", "peek", "pop", "empty"], [[1], [2], [], [], []]',
        output: '[null, null, 1, 1, false]',
        explanation: 'Standard FIFO operations'
      }
    ],
    starterCode: {
      c: `#include <stdbool.h>
#include <stdlib.h>

typedef struct {
    int inStack[100];
    int inTop;
    int outStack[100];
    int outTop;
} MyQueue;

MyQueue* myQueueCreate() {
    // Write your code here
    return NULL;
}

void myQueuePush(MyQueue* obj, int x) {
    // Write your code here
}

int myQueuePop(MyQueue* obj) {
    // Write your code here
    return 0;
}`,
      cpp: `class MyQueue {
public:
    MyQueue() {
        // Write your code here
    }
    
    void push(int x) {
        // Write your code here
    }
    
    int pop() {
        // Write your code here
        return 0;
    }
    
    int peek() {
        // Write your code here
        return 0;
    }
    
    bool empty() {
        // Write your code here
        return true;
    }
};`,
      java: `class MyQueue {
    public MyQueue() {
        // Write your code here
    }
    
    public void push(int x) {
        // Write your code here
    }
    
    public int pop() {
        // Write your code here
        return 0;
    }
    
    public int peek() {
        // Write your code here
        return 0;
    }
    
    public boolean empty() {
        // Write your code here
        return true;
    }
}`,
      python: `class MyQueue:
    def __init__(self):
        # Write your code here
        pass
    def push(self, x: int) -> None:
        # Write your code here
        pass
    def pop(self) -> int:
        # Write your code here
        return 0
    def peek(self) -> int:
        # Write your code here
        return 0
    def empty(self) -> bool:
        # Write your code here
        return True`,
      javascript: `class MyQueue {
  constructor() {
    // Write your code here
  }
  push(x) {
    // Write your code here
  }
  pop() {
    // Write your code here
    return 0;
  }
  peek() {
    // Write your code here
    return 0;
  }
  empty() {
    // Write your code here
    return true;
  }
}`
    },
    testCases: [
      {
        input: '["push", "push", "peek", "pop", "empty"], [[1], [2], [], [], []]',
        expectedOutput: '[null, null, 1, 1, false]',
        isHidden: false
      }
    ]
  }
];

/**
 * Retrieves a curated problem matching requested topics and difficulty
 */
async function getProblemForInterview({ difficulty = 'Medium', topic = '', topics = [], role = 'Software Engineer' }) {
  // Normalize search keywords from topics array and topic string
  const keywords = [];
  if (Array.isArray(topics) && topics.length > 0) {
    topics.forEach(t => keywords.push(t.toLowerCase().trim()));
  }
  if (topic && typeof topic === 'string') {
    topic.split(',').forEach(t => {
      const clean = t.toLowerCase().trim();
      if (clean && !keywords.includes(clean)) keywords.push(clean);
    });
  }

  const diffLower = (difficulty || 'Medium').toLowerCase();

  // 1. Exact match on difficulty AND any of the requested topics
  if (keywords.length > 0) {
    const matched = CURATED_PROBLEMS.find(p => {
      const matchDiff = p.difficulty.toLowerCase() === diffLower;
      const probTopics = (p.topics || []).map(t => t.toLowerCase());
      const categoryLower = (p.category || '').toLowerCase();
      const titleLower = (p.title || '').toLowerCase();

      const matchTopic = keywords.some(kw => 
        probTopics.includes(kw) || 
        categoryLower.includes(kw) || 
        titleLower.includes(kw)
      );

      return matchDiff && matchTopic;
    });

    if (matched) return matched;

    // 2. Match on topics regardless of difficulty
    const topicMatched = CURATED_PROBLEMS.find(p => {
      const probTopics = (p.topics || []).map(t => t.toLowerCase());
      const categoryLower = (p.category || '').toLowerCase();
      const titleLower = (p.title || '').toLowerCase();

      return keywords.some(kw => 
        probTopics.includes(kw) || 
        categoryLower.includes(kw) || 
        titleLower.includes(kw)
      );
    });

    if (topicMatched) return topicMatched;
  }

  // 3. Fallback to match by difficulty
  const diffMatch = CURATED_PROBLEMS.find(p => p.difficulty.toLowerCase() === diffLower);
  if (diffMatch) return diffMatch;

  // 4. Default first curated problem
  return CURATED_PROBLEMS[0];
}

module.exports = {
  CURATED_PROBLEMS,
  getProblemForInterview
};
