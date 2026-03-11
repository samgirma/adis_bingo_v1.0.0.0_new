/**
 * Hardware ID Module - Web Compatible Version
 * Returns valid strings for both desktop and web deployments
 */

/**
 * Get machine ID with web fallback
 * @returns {string} Valid machine identifier
 */
export function getMachineId(): string {
  // Vercel deployment - return web client identifier
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    return 'WEB_CLIENT';
  }
  
  // Desktop deployment - try to get actual machine ID
  try {
    // Import enhanced machine ID generator for desktop
    const EnhancedMachineIdGenerator = require('./enhanced-machine-id').default;
    const generator = EnhancedMachineIdGenerator.getInstance();
    return generator.getMachineId();
  } catch (error) {
    console.warn('Hardware ID detection failed, using fallback:', error);
    return 'DESKTOP_CLIENT';
  }
}

/**
 * Verify machine ID - always true for web clients
 * @param {string} storedId - Stored machine ID to verify
 * @returns {boolean} Always true for web, actual verification for desktop
 */
export function verifyMachineId(storedId: string): boolean {
  // Vercel deployment - always return true
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    return true;
  }
  
  // Desktop deployment - actual verification
  try {
    const EnhancedMachineIdGenerator = require('./enhanced-machine-id').default;
    const generator = EnhancedMachineIdGenerator.getInstance();
    return generator.verifyMachineId(storedId);
  } catch (error) {
    console.warn('Machine ID verification failed:', error);
    return false;
  }
}

/**
 * Get web client identifier
 * @returns {string} Web client identifier
 */
export function getWebClientId(): string {
  return 'WEB_CLIENT-' + Date.now().toString(36);
}

export default {
  getMachineId,
  verifyMachineId,
  getWebClientId
};
