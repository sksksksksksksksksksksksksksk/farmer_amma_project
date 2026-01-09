
import { keccak256, toHex, stringToBytes } from 'viem';

/**
 * World-class blockchain interaction simulation.
 * In a real app, this would use a wallet (Metamask/viem) to send transactions to Sepolia.
 */
export const blockchainService = {
  /**
   * Generates a unique data hash for an event.
   */
  generateDataHash: (data: any): string => {
    const serialized = JSON.stringify(data);
    return keccak256(toHex(stringToBytes(serialized)));
  },

  /**
   * Simulates sending a hash to the blockchain and returns a mock Tx Hash.
   */
  submitToBlockchain: async (dataHash: string): Promise<string> => {
    // Artificial delay to simulate block time
    await new Promise((resolve) => setTimeout(resolve, 800));
    // Generate a mock Ethereum transaction hash
    return `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
  },

  /**
   * Verifies if a piece of data matches a stored hash.
   */
  verifyData: (data: any, storedHash: string): boolean => {
    const currentHash = blockchainService.generateDataHash(data);
    return currentHash === storedHash;
  }
};
