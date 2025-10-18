import { z } from "zod";
import { ContractAbi, ValidationResult, ValidationError } from "@/shared/types";

// Zod schemas for ABI validation
const AbiInputSchema: z.ZodType<any> = z.object({
  name: z.string(),
  type: z.string(),
  indexed: z.boolean().optional(),
  internalType: z.string().optional(),
  components: z.lazy(() => z.array(AbiInputSchema)).optional(),
});

const AbiOutputSchema: z.ZodType<any> = z.object({
  name: z.string(),
  type: z.string(),
  internalType: z.string().optional(),
  components: z.lazy(() => z.array(AbiOutputSchema)).optional(),
});

const AbiFunctionSchema = z.object({
  name: z.string(),
  type: z.literal("function"),
  inputs: z.array(AbiInputSchema).default([]),
  outputs: z.array(AbiOutputSchema).optional(),
  stateMutability: z.enum(["pure", "view", "nonpayable", "payable"]).optional(),
  constant: z.boolean().optional(),
  payable: z.boolean().optional(),
});

const AbiConstructorSchema = z.object({
  type: z.literal("constructor"),
  inputs: z.array(AbiInputSchema).default([]),
  stateMutability: z.enum(["nonpayable", "payable"]).optional(),
  payable: z.boolean().optional(),
});

const AbiReceiveSchema = z.object({
  type: z.literal("receive"),
  stateMutability: z.literal("payable"),
});

const AbiFallbackSchema = z.object({
  type: z.literal("fallback"),
  stateMutability: z.enum(["nonpayable", "payable"]).optional(),
  payable: z.boolean().optional(),
});

const AbiEventSchema = z.object({
  name: z.string(),
  type: z.literal("event"),
  inputs: z.array(AbiInputSchema).default([]),
  anonymous: z.boolean().optional(),
});

const AbiErrorSchema = z.object({
  name: z.string(),
  type: z.literal("error"),
  inputs: z.array(AbiInputSchema).default([]),
});

const AbiItemSchema = z.discriminatedUnion("type", [
  AbiFunctionSchema,
  AbiConstructorSchema,
  AbiReceiveSchema,
  AbiFallbackSchema,
  AbiEventSchema,
  AbiErrorSchema,
]);

const ContractAbiSchema = z.array(AbiItemSchema);

export class AbiValidator {
  /**
   * Validate ABI structure using Zod schema
   */
  static validate(abi: unknown): ValidationResult {
    try {
      ContractAbiSchema.parse(abi);
      return {
        isValid: true,
        errors: [],
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: ValidationError[] = error.issues.map((err: any) => ({
          field: err.path.join("."),
          message: err.message,
          code: err.code,
        }));

        return {
          isValid: false,
          errors,
        };
      }

      return {
        isValid: false,
        errors: [
          {
            field: "abi",
            message: "Unknown validation error",
            code: "UNKNOWN_ERROR",
          },
        ],
      };
    }
  }

  /**
   * Validate ABI with additional business rules
   */
  static validateWithBusinessRules(abi: unknown): ValidationResult {
    // First, validate the basic structure
    const basicValidation = this.validate(abi);
    if (!basicValidation.isValid) {
      return basicValidation;
    }

    const typedAbi = abi as ContractAbi;
    const errors: ValidationError[] = [];

    // Business rule validations
    this.validateNoDuplicateFunctions(typedAbi, errors);
    this.validateNoDuplicateEvents(typedAbi, errors);
    this.validateConstructorRules(typedAbi, errors);
    this.validateReceiveFallbackRules(typedAbi, errors);
    this.validateParameterNames(typedAbi, errors);

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check for duplicate function signatures
   */
  private static validateNoDuplicateFunctions(abi: ContractAbi, errors: ValidationError[]): void {
    const functionSignatures = new Set<string>();

    abi.forEach((item, index) => {
      if (item.type === "function") {
        const signature = this.getFunctionSignature(item);
        if (functionSignatures.has(signature)) {
          errors.push({
            field: `[${index}].name`,
            message: `Duplicate function signature: ${signature}`,
            code: "DUPLICATE_FUNCTION",
          });
        }
        functionSignatures.add(signature);
      }
    });
  }

  /**
   * Check for duplicate event signatures
   */
  private static validateNoDuplicateEvents(abi: ContractAbi, errors: ValidationError[]): void {
    const eventSignatures = new Set<string>();

    abi.forEach((item, index) => {
      if (item.type === "event") {
        const signature = this.getEventSignature(item);
        if (eventSignatures.has(signature)) {
          errors.push({
            field: `[${index}].name`,
            message: `Duplicate event signature: ${signature}`,
            code: "DUPLICATE_EVENT",
          });
        }
        eventSignatures.add(signature);
      }
    });
  }

  /**
   * Validate constructor rules
   */
  private static validateConstructorRules(abi: ContractAbi, errors: ValidationError[]): void {
    const constructors = abi.filter(item => item.type === "constructor");

    if (constructors.length > 1) {
      errors.push({
        field: "abi",
        message: "Multiple constructors are not allowed",
        code: "MULTIPLE_CONSTRUCTORS",
      });
    }
  }

  /**
   * Validate receive and fallback function rules
   */
  private static validateReceiveFallbackRules(abi: ContractAbi, errors: ValidationError[]): void {
    const receives = abi.filter(item => item.type === "receive");
    const fallbacks = abi.filter(item => item.type === "fallback");

    if (receives.length > 1) {
      errors.push({
        field: "abi",
        message: "Multiple receive functions are not allowed",
        code: "MULTIPLE_RECEIVE",
      });
    }

    if (fallbacks.length > 1) {
      errors.push({
        field: "abi",
        message: "Multiple fallback functions are not allowed",
        code: "MULTIPLE_FALLBACK",
      });
    }
  }

  /**
   * Validate parameter names for consistency
   */
  private static validateParameterNames(abi: ContractAbi, errors: ValidationError[]): void {
    abi.forEach((item, index) => {
      if ("inputs" in item && item.inputs) {
        item.inputs.forEach((input, inputIndex) => {
          if (!input.name.trim()) {
            errors.push({
              field: `[${index}].inputs[${inputIndex}].name`,
              message: "Parameter name cannot be empty",
              code: "EMPTY_PARAMETER_NAME",
            });
          }
        });
      }
    });
  }

  /**
   * Generate function signature for comparison
   */
  private static getFunctionSignature(func: any): string {
    const paramTypes = func.inputs?.map((input: any) => input.type).join(",") || "";
    return `${func.name}(${paramTypes})`;
  }

  /**
   * Generate event signature for comparison
   */
  private static getEventSignature(event: any): string {
    const paramTypes = event.inputs?.map((input: any) => input.type).join(",") || "";
    return `${event.name}(${paramTypes})`;
  }

  /**
   * Validate specific ABI standard (ERC20, ERC721, etc.)
   */
  static validateStandard(abi: ContractAbi, standard: string): ValidationResult {
    const basicValidation = this.validateWithBusinessRules(abi);
    if (!basicValidation.isValid) {
      return basicValidation;
    }

    switch (standard.toUpperCase()) {
      case "ERC20":
        return this.validateERC20(abi);
      case "ERC721":
        return this.validateERC721(abi);
      case "ERC1155":
        return this.validateERC1155(abi);
      default:
        return basicValidation; // No specific validation for unknown standards
    }
  }

  /**
   * Validate ERC20 standard compliance
   */
  private static validateERC20(abi: ContractAbi): ValidationResult {
    const errors: ValidationError[] = [];
    const requiredFunctions = [
      "totalSupply()",
      "balanceOf(address)",
      "transfer(address,uint256)",
      "transferFrom(address,address,uint256)",
      "approve(address,uint256)",
      "allowance(address,address)",
    ];

    const requiredEvents = [
      "Transfer(address,address,uint256)",
      "Approval(address,address,uint256)",
    ];

    // Check required functions
    requiredFunctions.forEach(signature => {
      const found = abi.some(item =>
        item.type === "function" && this.getFunctionSignature(item) === signature
      );
      if (!found) {
        errors.push({
          field: "abi",
          message: `Missing required ERC20 function: ${signature}`,
          code: "MISSING_ERC20_FUNCTION",
        });
      }
    });

    // Check required events
    requiredEvents.forEach(signature => {
      const found = abi.some(item =>
        item.type === "event" && this.getEventSignature(item) === signature
      );
      if (!found) {
        errors.push({
          field: "abi",
          message: `Missing required ERC20 event: ${signature}`,
          code: "MISSING_ERC20_EVENT",
        });
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate ERC721 standard compliance
   */
  private static validateERC721(abi: ContractAbi): ValidationResult {
    const errors: ValidationError[] = [];
    const requiredFunctions = [
      "balanceOf(address)",
      "ownerOf(uint256)",
      "safeTransferFrom(address,address,uint256,bytes)",
      "safeTransferFrom(address,address,uint256)",
      "transferFrom(address,address,uint256)",
      "approve(address,uint256)",
      "setApprovalForAll(address,bool)",
      "getApproved(uint256)",
      "isApprovedForAll(address,address)",
    ];

    requiredFunctions.forEach(signature => {
      const found = abi.some(item =>
        item.type === "function" && this.getFunctionSignature(item) === signature
      );
      if (!found) {
        errors.push({
          field: "abi",
          message: `Missing required ERC721 function: ${signature}`,
          code: "MISSING_ERC721_FUNCTION",
        });
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate ERC1155 standard compliance
   */
  private static validateERC1155(abi: ContractAbi): ValidationResult {
    const errors: ValidationError[] = [];
    const requiredFunctions = [
      "safeTransferFrom(address,address,uint256,uint256,bytes)",
      "safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)",
      "balanceOf(address,uint256)",
      "balanceOfBatch(address[],uint256[])",
      "setApprovalForAll(address,bool)",
      "isApprovedForAll(address,address)",
    ];

    requiredFunctions.forEach(signature => {
      const found = abi.some(item =>
        item.type === "function" && this.getFunctionSignature(item) === signature
      );
      if (!found) {
        errors.push({
          field: "abi",
          message: `Missing required ERC1155 function: ${signature}`,
          code: "MISSING_ERC1155_FUNCTION",
        });
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}