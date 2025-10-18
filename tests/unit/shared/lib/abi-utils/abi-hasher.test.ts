import { AbiHasher } from '@/shared/lib/abi-utils/abi-hasher';

describe('AbiHasher', () => {
  const sampleABI = [
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

  describe('generateHash', () => {
    it('should generate consistent hash for the same ABI', () => {
      const hash1 = AbiHasher.generateHash(sampleABI as any);
      const hash2 = AbiHasher.generateHash(sampleABI as any);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 produces 64 character hex string
    });

    it('should generate different hashes for different ABIs', () => {
      const differentABI = [
        {
          type: 'function',
          name: 'approve',
          inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' }
          ],
          outputs: [{ name: '', type: 'bool' }],
          stateMutability: 'nonpayable'
        }
      ];

      const hash1 = AbiHasher.generateHash(sampleABI as any);
      const hash2 = AbiHasher.generateHash(differentABI as any);

      expect(hash1).not.toBe(hash2);
    });

    it('should normalize ABI order and generate same hash', () => {
      const abi1 = [
        {
          type: 'function',
          name: 'transfer',
          inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' }
          ]
        },
        {
          type: 'event',
          name: 'Transfer',
          inputs: [
            { name: 'from', type: 'address', indexed: true },
            { name: 'to', type: 'address', indexed: true }
          ]
        }
      ];

      // Same ABI but different order
      const abi2 = [
        {
          type: 'event',
          name: 'Transfer',
          inputs: [
            { name: 'from', type: 'address', indexed: true },
            { name: 'to', type: 'address', indexed: true }
          ]
        },
        {
          type: 'function',
          name: 'transfer',
          inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' }
          ]
        }
      ];

      const hash1 = AbiHasher.generateHash(abi1 as any);
      const hash2 = AbiHasher.generateHash(abi2 as any);

      expect(hash1).toBe(hash2);
    });

    it('should handle ABI with different parameter orders consistently', () => {
      const abi1 = [
        {
          type: 'function',
          name: 'test',
          inputs: [
            { name: 'param1', type: 'uint256' },
            { name: 'param2', type: 'address' }
          ]
        }
      ];

      const abi2 = [
        {
          type: 'function',
          name: 'test',
          inputs: [
            { name: 'param2', type: 'address' },
            { name: 'param1', type: 'uint256' }
          ]
        }
      ];

      const hash1 = AbiHasher.generateHash(abi1 as any);
      const hash2 = AbiHasher.generateHash(abi2 as any);

      expect(hash1).toBe(hash2);
    });
  });

  describe('areIdentical', () => {
    it('should return true for identical ABIs', () => {
      const abi1 = [...sampleABI];
      const abi2 = [...sampleABI];

      expect(AbiHasher.areIdentical(abi1 as any, abi2 as any)).toBe(true);
    });

    it('should return false for different ABIs', () => {
      const abi1 = sampleABI;
      const abi2 = [
        {
          type: 'function',
          name: 'approve',
          inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' }
          ]
        }
      ];

      expect(AbiHasher.areIdentical(abi1 as any, abi2 as any)).toBe(false);
    });
  });

  describe('generateShortHash', () => {
    it('should generate short hash with default length', () => {
      const shortHash = AbiHasher.generateShortHash(sampleABI as any);

      expect(shortHash).toHaveLength(8);
      expect(typeof shortHash).toBe('string');
    });

    it('should generate short hash with custom length', () => {
      const shortHash = AbiHasher.generateShortHash(sampleABI as any, 12);

      expect(shortHash).toHaveLength(12);
    });

    it('should be consistent for same ABI', () => {
      const shortHash1 = AbiHasher.generateShortHash(sampleABI as any, 10);
      const shortHash2 = AbiHasher.generateShortHash(sampleABI as any, 10);

      expect(shortHash1).toBe(shortHash2);
    });
  });

  describe('normalization edge cases', () => {
    it('should handle empty ABI', () => {
      const emptyABI: any[] = [];

      expect(() => {
        AbiHasher.generateHash(emptyABI as any);
      }).not.toThrow();
    });

    it('should handle ABI with optional fields', () => {
      const abiWithOptionals = [
        {
          type: 'function',
          name: 'test',
          inputs: [],
          constant: true,
          payable: false
        }
      ];

      expect(() => {
        AbiHasher.generateHash(abiWithOptionals as any);
      }).not.toThrow();
    });

    it('should handle nested component types', () => {
      const abiWithComponents = [
        {
          type: 'function',
          name: 'testStruct',
          inputs: [
            {
              name: 'data',
              type: 'tuple',
              components: [
                { name: 'amount', type: 'uint256' },
                { name: 'token', type: 'address' }
              ]
            }
          ]
        }
      ];

      expect(() => {
        AbiHasher.generateHash(abiWithComponents as any);
      }).not.toThrow();
    });
  });
});
