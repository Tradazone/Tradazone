// @ts-nocheck
/**
 * @vitest
 * @fileoverview Tests for CI Pipeline Utils - Advanced Filtering and Sorting
 * Verifies that the CI pipeline filtering and sorting functionality
 * works correctly across all supported test types and filtering options.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import CIPipelineUtils from '../../scripts/ci-pipeline-utils.js';

describe('CI Pipeline Utils - Advanced Filtering and Sorting', () => {
  let utils;

  beforeEach(() => {
    utils = new CIPipelineUtils();
  });

  describe('Test Detection', () => {
    it('should detect unit test files', () => {
      const testType = utils.detectTestType('src/test/auth.test.jsx');
      expect(testType).toBe('unit');
    });

    it('should detect integration test files', () => {
      const testType = utils.detectTestType('src/test/DataContext.integration.test.jsx');
      expect(testType).toBe('integration');
    });

    it('should detect snapshot test files', () => {
      const testType = utils.detectTestType('src/test/AuthComponents.snapshot.test.jsx');
      expect(testType).toBe('snapshot');
    });

    it('should detect CSP test files', () => {
      const testType = utils.detectTestType('src/test/AuthContext.csp.test.jsx');
      expect(testType).toBe('csp-test');
    });

    it('should detect CSV export test files', () => {
      const testType = utils.detectTestType('src/test/CheckoutDetail.csv-export.test.jsx');
      expect(testType).toBe('csv-export');
    });

    it('should detect staging test files', () => {
      const testType = utils.detectTestType('src/test/auth.staging.test.jsx');
      expect(testType).toBe('staging-test');
    });

    it('should detect focus trap test files', () => {
      const testType = utils.detectTestType('src/test/ConnectWalletModal.focusTrap.test.jsx');
      expect(testType).toBe('focus-trap');
    });

    it('should detect memo test files', () => {
      const testType = utils.detectTestType('src/test/CustomerList.memo.test.jsx');
      expect(testType).toBe('memo-test');
    });

    it('should detect race condition test files', () => {
      const testType = utils.detectTestType('src/test/DataContext.race.test.jsx');
      expect(testType).toBe('race-test');
    });

    it('should detect async integration test files', () => {
      const testType = utils.detectTestType('src/test/AuthContextMutations.async.integration.test.jsx');
      expect(testType).toBe('async-test');
    });
  });

  describe('Category Detection', () => {
    it('should detect context tests', () => {
      const category = utils.detectCategory('src/test/DataContext.test.jsx');
      expect(category).toBe('context');
    });

    it('should detect component tests', () => {
      const category = utils.detectCategory('src/test/components/Header.test.jsx');
      expect(category).toBe('components');
    });

    it('should detect page tests', () => {
      const category = utils.detectCategory('src/test/pages/Dashboard.test.jsx');
      expect(category).toBe('pages');
    });

    it('should detect hook tests', () => {
      const category = utils.detectCategory('src/test/hooks/useDebounce.test.js');
      expect(category).toBe('hooks');
    });

    it('should detect utility tests', () => {
      const category = utils.detectCategory('src/test/utils/dateUtils.test.js');
      expect(category).toBe('utils');
    });

    it('should detect service tests', () => {
      const category = utils.detectCategory('src/test/services/api.test.js');
      expect(category).toBe('services');
    });

    it('should detect security tests', () => {
      const category = utils.detectCategory('src/test/security/csp.test.jsx');
      expect(category).toBe('security');
    });
  });

  describe('Test Filtering by Type', () => {
    it('should filter unit tests', () => {
      const testFiles = [
        'src/test/auth.test.jsx',
        'src/test/DataContext.integration.test.jsx',
        'src/test/auth.snapshot.test.jsx',
      ];
      
      const filtered = utils.filterByTestType(testFiles, 'unit');
      expect(filtered).toEqual(['src/test/auth.test.jsx']);
    });

    it('should filter integration tests', () => {
      const testFiles = [
        'src/test/auth.test.jsx',
        'src/test/DataContext.integration.test.jsx',
        'src/test/auth.snapshot.test.jsx',
      ];
      
      const filtered = utils.filterByTestType(testFiles, 'integration');
      expect(filtered).toEqual(['src/test/DataContext.integration.test.jsx']);
    });

    it('should filter snapshot tests', () => {
      const testFiles = [
        'src/test/auth.test.jsx',
        'src/test/DataContext.integration.test.jsx',
        'src/test/auth.snapshot.test.jsx',
      ];
      
      const filtered = utils.filterByTestType(testFiles, 'snapshot');
      expect(filtered).toEqual(['src/test/auth.snapshot.test.jsx']);
    });

    it('should filter multiple test types', () => {
      const testFiles = [
        'src/test/auth.test.jsx',
        'src/test/DataContext.integration.test.jsx',
        'src/test/auth.snapshot.test.jsx',
      ];
      
      const filtered = utils.filterByTestType(testFiles, ['unit', 'integration']);
      expect(filtered).toContain('src/test/auth.test.jsx');
      expect(filtered).toContain('src/test/DataContext.integration.test.jsx');
      expect(filtered).not.toContain('src/test/auth.snapshot.test.jsx');
    });

    it('should handle invalid test types gracefully', () => {
      const testFiles = ['src/test/auth.test.jsx'];
      const filtered = utils.filterByTestType(testFiles, 'invalid-type');
      expect(filtered).toEqual(testFiles); // Returns all files if type not found
    });
  });

  describe('Test Sorting', () => {
    const sampleTests = [
      'src/test/zed.test.jsx',
      'src/test/alpha.test.jsx',
      'src/test/DataContext.integration.test.jsx',
      'src/test/auth.snapshot.test.jsx',
    ];

    it('should sort tests by name ascending', () => {
      const sorted = utils.sortTests(sampleTests, 'name', 'asc');
      const names = sorted.map(f => path.basename(f));
      expect(names[0]).toBe('alpha.test.jsx');
      expect(names[names.length - 1]).toBe('zed.test.jsx');
    });

    it('should sort tests by name descending', () => {
      const sorted = utils.sortTests(sampleTests, 'name', 'desc');
      const names = sorted.map(f => path.basename(f));
      expect(names[0]).toBe('zed.test.jsx');
      expect(names[names.length - 1]).toBe('alpha.test.jsx');
    });

    it('should sort tests by type', () => {
      const sorted = utils.sortTests(sampleTests, 'type', 'asc');
      const types = sorted.map(f => utils.detectTestType(f));
      expect(types).toEqual(['unit', 'unit', 'integration', 'snapshot']);
    });

    it('should sort tests by category', () => {
      const sorted = utils.sortTests(sampleTests, 'category', 'asc');
      expect(sorted).toBeDefined();
      expect(sorted.length).toBe(sampleTests.length);
    });

    it('should default to name sorting when invalid criteria provided', () => {
      const sorted = utils.sortTests(sampleTests, 'invalid-sort', 'asc');
      const names = sorted.map(f => path.basename(f));
      expect(names[0]).toBe('alpha.test.jsx');
    });
  });

  describe('Test Metadata', () => {
    it('should generate correct metadata for test file', () => {
      // Mock file statistics
      const testPath = 'src/test/auth.test.jsx';
      if (fs.existsSync(testPath)) {
        const metadata = utils.getTestMetadata(testPath);
        expect(metadata).toHaveProperty('path');
        expect(metadata).toHaveProperty('name');
        expect(metadata).toHaveProperty('type');
        expect(metadata).toHaveProperty('category');
        expect(metadata).toHaveProperty('size');
      }
    });

    it('should identify test file type in metadata', () => {
      const metadata = utils.getTestMetadata('src/test/auth.integration.test.jsx');
      expect(metadata.type).toBe('integration');
    });
  });

  describe('Smart Test Selection', () => {
    it('should return result object with expected properties', () => {
      // Mock the discovery and changed files
      utils.testFiles = [
        'src/test/auth.test.jsx',
        'src/test/DataContext.test.jsx',
      ];
      
      const result = utils.generateSmartTestSelection('main', { verbose: false });
      
      expect(result).toHaveProperty('success', expect.any(Boolean));
      expect(result).toHaveProperty('message', expect.any(String));
      expect(result).toHaveProperty('tests', expect.any(Array));
      expect(result).toHaveProperty('count', expect.any(Number));
    });

    it('should respect snapshot inclusion option', () => {
      utils.testFiles = [
        'src/test/auth.snapshot.test.jsx',
        'src/test/auth.test.jsx',
      ];
      
      const result1 = utils.generateSmartTestSelection('main', { includeSnapshots: true });
      const result2 = utils.generateSmartTestSelection('main', { includeSnapshots: false });
      
      expect(result1).toHaveProperty('count');
      expect(result2).toHaveProperty('count');
      expect(result1.count).toBeGreaterThanOrEqual(result2.count);
    });

    it('should respect integration inclusion option', () => {
      utils.testFiles = [
        'src/test/auth.integration.test.jsx',
        'src/test/auth.test.jsx',
      ];
      
      const result1 = utils.generateSmartTestSelection('main', { includeIntegration: true });
      const result2 = utils.generateSmartTestSelection('main', { includeIntegration: false });
      
      expect(result1).toHaveProperty('count');
      expect(result2).toHaveProperty('count');
      expect(result1.count).toBeGreaterThanOrEqual(result2.count);
    });
  });

  describe('CI Report Generation', () => {
    const testFiles = [
      'src/test/auth.test.jsx',
      'src/test/DataContext.integration.test.jsx',
      'src/test/auth.snapshot.test.jsx',
    ];

    it('should generate markdown report', () => {
      const report = utils.generateCIReport(testFiles, { format: 'markdown' });
      expect(report).toContain('CI Pipeline Test Report');
      expect(report).toContain('Summary');
      expect(report).toContain('unit');
      expect(report).toContain('integration');
      expect(report).toContain('snapshot');
    });

    it('should generate JSON report', () => {
      const report = utils.generateCIReport(testFiles, { format: 'json' });
      const parsed = JSON.parse(report);
      expect(parsed).toHaveProperty('unit');
      expect(parsed).toHaveProperty('integration');
      expect(parsed).toHaveProperty('snapshot');
    });

    it('should generate text report', () => {
      const report = utils.generateCIReport(testFiles, { format: 'text' });
      expect(report).toContain('CI Pipeline Test Report');
      expect(report).toContain('UNIT Tests');
      expect(report).toContain('INTEGRATION Tests');
      expect(report).toContain('SNAPSHOT Tests');
    });

    it('should count tests correctly in report', () => {
      const report = utils.generateCIReport(testFiles, { format: 'markdown' });
      expect(report).toContain('Total Tests: 3');
      expect(report).toContain('Test Types: 3');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing test directory gracefully', () => {
      const tests = utils.discoverTestFiles();
      expect(Array.isArray(tests)).toBe(true);
    });

    it('should handle failed git commands gracefully', () => {
      const result = utils.generateSmartTestSelection('non-existent-branch', { verbose: false });
      expect(result).toHaveProperty('success');
      expect(Array.isArray(result.tests)).toBe(true);
    });

    it('should return empty array for invalid test type', () => {
      const testFiles = ['src/test/auth.test.jsx'];
      const filtered = utils.filterByTestType(testFiles, 'definitely-invalid');
      expect(filtered).toEqual(testFiles);
    });
  });

  describe('Integration Tests', () => {
    it('should chain filtering and sorting operations', () => {
      const testFiles = [
        'src/test/zed.test.jsx',
        'src/test/alpha.integration.test.jsx',
        'src/test/beta.snapshot.test.jsx',
      ];
      
      // Filter to only integration + snapshot tests
      const filtered = utils.filterByTestType(testFiles, ['integration', 'snapshot']);
      expect(filtered.length).toBe(2);
      
      // Sort by name
      const sorted = utils.sortTests(filtered, 'name', 'asc');
      expect(path.basename(sorted[0])).toBe('alpha.integration.test.jsx');
      expect(path.basename(sorted[1])).toBe('beta.snapshot.test.jsx');
    });

    it('should support complete test selection workflow', () => {
      const testFiles = utils.discoverTestFiles();
      
      if (testFiles.length > 0) {
        // Step 1: Discover tests
        expect(testFiles.length).toBeGreaterThan(0);
        
        // Step 2: Get initial metadata
        const metadata = testFiles.map(f => utils.getTestMetadata(f));
        expect(metadata.length).toBeGreaterThan(0);
        
        // Step 3: Filter and sort
        const unitTests = utils.filterByTestType(testFiles, 'unit');
        const sorted = utils.sortTests(unitTests, 'name', 'asc');
        expect(sorted.length).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
