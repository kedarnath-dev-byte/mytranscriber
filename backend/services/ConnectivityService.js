/**
 * ConnectivityService
 * Monitors internet connectivity and manages offline mode
 * - Checks connection to OpenAI API endpoints
 * - Returns true if online, false if offline
 * - Used before transcription/summarization
 */

const https = require('https');

class ConnectivityService {
  /**
   * Check if internet connection is available
   * Tests connection to api.openai.com (our transcription service)
   * @returns {Promise<boolean>} - true if online, false if offline
   */
  static async isOnline() {
    return new Promise((resolve) => {
      const options = {
        hostname: 'api.openai.com',
        port: 443,
        path: '/',
        method: 'HEAD',
        timeout: 5000 // 5 second timeout
      };

      const req = https.request(options, (res) => {
        // Any response means we're online
        resolve(res.statusCode !== undefined);
      });

      req.on('error', () => {
        // Connection failed - we're offline
        resolve(false);
      });

      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });

      req.end();
    });
  }

  /**
   * Check connection with user-friendly message
   * @returns {Promise<{online: boolean, message: string}>}
   */
  static async checkConnection() {
    const online = await this.isOnline();
    
    return {
      online,
      message: online 
        ? '✅ Connected to internet' 
        : '⚠️ No internet connection - Recording will be saved for later processing'
    };
  }
}

module.exports = ConnectivityService;