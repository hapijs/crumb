'use strict'

const crypto = require('crypto');

const ALGO = 'sha256';
/**
 * Returns base64-encoded ciphertext
 * @param {string}userId The string to encrypt
 * @param {string}key The secret
 * @returns {string}token
 */
const encrypt = (userId, key) => {

    const timestamp = Date.now().toString();
    const digest = crypto.createHmac(ALGO, key)
        .update(userId, 'utf8')
        .update(timestamp, 'utf8')
        .digest("hex");

    return `${digest}_${timestamp}`;
};

/**
 * Validate a CSRF token generated with HMAC method. based on OWASP cheatsheet
 * https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#hmac-based-token-pattern
 * @param {string}enc
 * @param {string}userId
 * @param {string}key
 */
const validate = (enc, userId, key) => {

    const timestamp = Date.now().toString();
    const [token_digest, token_timestamp] = enc.split('_'); //Split the encrypted string to retrieve the hmac digest and the timestamp
    const digest = crypto.createHmac(ALGO, key)
        .update(userId, 'utf8')
        .update(token_timestamp, 'utf8') // Timestamp used at token generation
        .digest("hex");

    return ( digest === token_digest && token_timestamp <= timestamp)
};

module.exports = {
    encrypt,
    validate
}
