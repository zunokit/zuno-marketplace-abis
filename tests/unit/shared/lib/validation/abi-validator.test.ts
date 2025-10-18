import { AbiValidator } from '@/shared/lib/validation/abi-validator';

describe('AbiValidator', () => {
  describe('validate', () => {
    it('should validate a valid ERC20 ABI', () => {
      const validERC20ABI = [
        {
          type: 'function',
          name: 'transfer',
          inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' }
          ],
          outputs: [{ name: '', type: 'bool' }],
          stateMutability: 'nonpayable'
        },
        {
          type: 'event',
          name: 'Transfer',
          inputs: [
            { name: 'from', type: 'address', indexed: true },
            { name: 'to', type: 'address', indexed: true },
            { name: 'value', type: 'uint256', indexed: false }
          ]
        }
      ];

      const result = AbiValidator.validate(validERC20ABI as any);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid ABI structure', () => {
      const invalidABI = [
        {
          // Missing required fields
          name: 'transfer'
        }
      ];

      const result = AbiValidator.validate(invalidABI as any);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject non-array ABI', () => {
      const invalidABI = { type: 'function', name: 'test' };

      const result = AbiValidator.validate(invalidABI as any);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate constructor', () => {
      const abiWithConstructor = [
        {
          type: 'constructor',
          inputs: [{ name: 'initialSupply', type: 'uint256' }],
          stateMutability: 'nonpayable'
        }
      ];

      const result = AbiValidator.validate(abiWithConstructor as any);
      expect(result.isValid).toBe(true);
    });

    it('should validate receive function', () => {
      const abiWithReceive = [
        {
          type: 'receive',
          stateMutability: 'payable'
        }
      ];

      const result = AbiValidator.validate(abiWithReceive as any);
      expect(result.isValid).toBe(true);
    });

    it('should validate fallback function', () => {
      const abiWithFallback = [
        {
          type: 'fallback',
          stateMutability: 'payable'
        }
      ];

      const result = AbiValidator.validate(abiWithFallback as any);
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateWithBusinessRules', () => {
    it('should detect duplicate function signatures', () => {
      const abiWithDuplicates = [
        {
          type: 'function',
          name: 'transfer',
          inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' }
          ],
          outputs: [{ name: '', type: 'bool' }],
          stateMutability: 'nonpayable'
        },
        {
          type: 'function',
          name: 'transfer',
          inputs: [
            { name: 'recipient', type: 'address' },
            { name: 'value', type: 'uint256' }
          ],
          outputs: [{ name: '', type: 'bool' }],
          stateMutability: 'nonpayable'
        }
      ];

      const result = AbiValidator.validateWithBusinessRules(
        abiWithDuplicates as any
      );
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === 'DUPLICATE_FUNCTION')).toBe(
        true
      );
    });

    it('should detect multiple constructors', () => {
      const abiWithMultipleConstructors = [
        {
          type: 'constructor',
          inputs: [{ name: 'param1', type: 'uint256' }]
        },
        {
          type: 'constructor',
          inputs: [{ name: 'param2', type: 'string' }]
        }
      ];

      const result = AbiValidator.validateWithBusinessRules(
        abiWithMultipleConstructors as any
      );
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((e) => e.code === 'MULTIPLE_CONSTRUCTORS')
      ).toBe(true);
    });

    it('should detect empty parameter names', () => {
      const abiWithEmptyParamNames = [
        {
          type: 'function',
          name: 'test',
          inputs: [{ name: '', type: 'uint256' }]
        }
      ];

      const result = AbiValidator.validateWithBusinessRules(
        abiWithEmptyParamNames as any
      );
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === 'EMPTY_PARAMETER_NAME')).toBe(
        true
      );
    });
  });

  describe('validateStandard', () => {
    it('should validate ERC20 standard compliance', () => {
      const validERC20ABI = [
        {
          type: 'function',
          name: 'totalSupply',
          inputs: [],
          outputs: [{ name: '', type: 'uint256' }],
          stateMutability: 'view'
        },
        {
          type: 'function',
          name: 'balanceOf',
          inputs: [{ name: 'account', type: 'address' }],
          outputs: [{ name: '', type: 'uint256' }],
          stateMutability: 'view'
        },
        {
          type: 'function',
          name: 'transfer',
          inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' }
          ],
          outputs: [{ name: '', type: 'bool' }],
          stateMutability: 'nonpayable'
        },
        {
          type: 'function',
          name: 'transferFrom',
          inputs: [
            { name: 'from', type: 'address' },
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' }
          ],
          outputs: [{ name: '', type: 'bool' }],
          stateMutability: 'nonpayable'
        },
        {
          type: 'function',
          name: 'approve',
          inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' }
          ],
          outputs: [{ name: '', type: 'bool' }],
          stateMutability: 'nonpayable'
        },
        {
          type: 'function',
          name: 'allowance',
          inputs: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' }
          ],
          outputs: [{ name: '', type: 'uint256' }],
          stateMutability: 'view'
        },
        {
          type: 'event',
          name: 'Transfer',
          inputs: [
            { name: 'from', type: 'address', indexed: true },
            { name: 'to', type: 'address', indexed: true },
            { name: 'value', type: 'uint256', indexed: false }
          ]
        },
        {
          type: 'event',
          name: 'Approval',
          inputs: [
            { name: 'owner', type: 'address', indexed: true },
            { name: 'spender', type: 'address', indexed: true },
            { name: 'value', type: 'uint256', indexed: false }
          ]
        }
      ];

      const result = AbiValidator.validateStandard(
        validERC20ABI as any,
        'ERC20'
      );
      expect(result.isValid).toBe(true);
    });

    it('should detect missing ERC20 functions', () => {
      const incompleteERC20ABI = [
        {
          type: 'function',
          name: 'totalSupply',
          inputs: [],
          outputs: [{ name: '', type: 'uint256' }],
          stateMutability: 'view'
        }
        // Missing other required functions
      ];

      const result = AbiValidator.validateStandard(
        incompleteERC20ABI as any,
        'ERC20'
      );
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((e) => e.code === 'MISSING_ERC20_FUNCTION')
      ).toBe(true);
    });

    it('should return basic validation for unknown standards', () => {
      const customABI = [
        {
          type: 'function',
          name: 'customFunction',
          inputs: [],
          outputs: []
        }
      ];

      const result = AbiValidator.validateStandard(customABI as any, 'CUSTOM');
      expect(result.isValid).toBe(true); // Should pass basic validation
    });
  });
});
