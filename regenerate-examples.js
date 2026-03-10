#!/usr/bin/env node
/**
 * JWT Example File Generator for IETF Draft with kramdown-rfc
 *
 * Generates JWT example files that are included via kramdown-rfc {::include} directives.
 *
 * Usage:
 *     node regenerate-examples.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const EXAMPLES_DIR = path.join(__dirname, 'examples');

// EC P-256 key pair used for signing example JWTs (also documented in README.md)
const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEEVs/o5+uQbTjL3chynL4wXgUg2R9
q9UU8I5mEovUf86QZ7kOBIjJwqnzD1omageEHWwHdBO6B+dFabmdT9POxg==
-----END PUBLIC KEY-----`;

const PRIVATE_KEY_PEM = `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgevZzL1gdAFr88hb2
OF/2NxApJCzGCEDdfSp6VQO30hyhRANCAAQRWz+jn65BtOMvdyHKcvjBeBSDZH2r
1RTwjmYSi9R/zpBnuQ4EiMnCqfMPWiZqB4QdbAd0E7oH50VpuZ1P087G
-----END PRIVATE KEY-----`;

// Ensure examples directory exists
if (!fs.existsSync(EXAMPLES_DIR)) {
    fs.mkdirSync(EXAMPLES_DIR, { recursive: true });
}

/**
 * Convert the public key PEM to a JWK object (public components only)
 */
function getPublicJwk() {
    const keyObject = crypto.createPublicKey(PUBLIC_KEY_PEM);
    const jwk = keyObject.export({ format: 'jwk' });
    return {
        kty: jwk.kty,
        crv: jwk.crv,
        x: jwk.x,
        y: jwk.y
    };
}

/**
 * Base64url encode a Buffer or string
 */
function base64url(data) {
    if (typeof data === 'string') data = Buffer.from(data);
    return data.toString('base64url');
}

/**
 * Create and sign a JWT using ES256
 */
function signJWT(header, payload) {
    const headerB64 = base64url(JSON.stringify(header));
    const payloadB64 = base64url(JSON.stringify(payload));
    const signingInput = `${headerB64}.${payloadB64}`;

    const sign = crypto.createSign('SHA256');
    sign.update(signingInput);
    const signature = sign.sign({
        key: PRIVATE_KEY_PEM,
        dsaEncoding: 'ieee-p1363'
    });

    return `${signingInput}.${base64url(signature)}`;
}

/**
 * Write content to a file in the examples directory
 */
function writeExample(filename, content) {
    const filepath = path.join(EXAMPLES_DIR, filename);
    fs.writeFileSync(filepath, content, 'utf8');
    console.log(`  ${filename}`);
}

/**
 * Format JWT for display with line wrapping
 */
function formatJWT(jwt, maxLength = 72) {
    const lines = [];
    for (let i = 0; i < jwt.length; i += maxLength) {
        lines.push(jwt.slice(i, i + maxLength));
    }
    return lines.join('\n '); // Space for continuation
}

/**
 * Generate all JWT examples
 */
function generateExamples() {
    console.log('Generating JWT examples...\n');

    const clientPublicJwk = getPublicJwk();

    // Client Attestation JWT Header
    const clientAttestationHeader = {
        "alg": "ES256",
        "kid": "11",
        "typ": "oauth-client-attestation+jwt"
    };

    // Client Attestation JWT Payload
    const clientAttestationPayload = {
        "iss": "https://attester.example.com",
        "sub": "https://client.example.com",
        "exp": 1300819380,
        "cnf": {
            "jwk": clientPublicJwk
        }
    };

    // Client Attestation PoP JWT Header
    const clientPoPHeader = {
        "alg": "ES256",
        "typ": "oauth-client-attestation-pop+jwt"
    };

    // Client Attestation PoP JWT Payload
    const clientPoPPayload = {
        "iss": "https://client.example.com",
        "aud": "https://as.example.com",
        "jti": "d25d00ab-552b-46fc-ae19-98f440f25064",
        "iat": 1300815780
    };

    // Client Attestation PoP JWT Payload with challenge
    const clientPoPChallengePayload = {
        "iss": "https://client.example.com",
        "aud": "https://as.example.com",
        "jti": "d25d00ab-552b-46fc-ae19-98f440f25064",
        "iat": 1300815780,
        "challenge": "5c1a9e10-29ff-4c2b-ae73-57c0957c09c4"
    };

    // Sign JWTs using the key from README.md
    const clientAttestationJWT = signJWT(clientAttestationHeader, clientAttestationPayload);
    const clientPoPJWT = signJWT(clientPoPHeader, clientPoPPayload);
    const clientPoPChallengeJWT = signJWT(clientPoPHeader, clientPoPChallengePayload);

    // Write JSON examples (using .md extension for kramdown-rfc compatibility)
    console.log('Writing example files:');

    writeExample('client-attestation-header.md', JSON.stringify(clientAttestationHeader, null, 2));
    writeExample('client-attestation-payload.md', JSON.stringify(clientAttestationPayload, null, 2));
    writeExample('client-pop-header.md', JSON.stringify(clientPoPHeader, null, 2));
    writeExample('client-pop-payload.md', JSON.stringify(clientPoPPayload, null, 2));
    writeExample('client-pop-challenge-payload.md', JSON.stringify(clientPoPChallengePayload, null, 2));

    // Write encoded JWT examples
    writeExample('client-attestation-jwt.md', clientAttestationJWT);
    writeExample('client-pop-jwt.md', clientPoPJWT);
    writeExample('client-pop-challenge-jwt.md', clientPoPChallengeJWT);

    // Write formatted HTTP headers
    writeExample('client-attestation-http.md',
        `OAuth-Client-Attestation: ${formatJWT(clientAttestationJWT)}`);
    writeExample('client-pop-http.md',
        `OAuth-Client-Attestation-PoP: ${formatJWT(clientPoPChallengeJWT)}`);

    // Write concatenated format
    const concatenated = `${clientAttestationJWT}~${clientPoPChallengeJWT}`;
    writeExample('concatenated.md', formatJWT(concatenated));

    // Write full HTTP request examples
    const tokenRequest = `POST /token HTTP/1.1
Host: as.example.com
Content-Type: application/x-www-form-urlencoded
OAuth-Client-Attestation: ${formatJWT(clientAttestationJWT)}
OAuth-Client-Attestation-PoP: ${formatJWT(clientPoPChallengeJWT)}

grant_type=authorization_code&
code=sadf098u23rbkjOIU&
code_verifier=2q2kqpuuw72d12klgpw&
redirect_uri=https%3A%2F%2Fclient.example.com%2Fcallback`;

    writeExample('token-request.md', tokenRequest);

    // Write PAR request example
    const parRequest = `POST /as/par HTTP/1.1
Host: as.example.com
Content-Type: application/x-www-form-urlencoded
OAuth-Client-Attestation: ${formatJWT(clientAttestationJWT)}
OAuth-Client-Attestation-PoP: ${formatJWT(clientPoPChallengeJWT)}

response_type=code&state=af0ifjsldkj&client_id=s6BhdRkqt3
&redirect_uri=https%3A%2F%2Fclient.example.org%2Fcb
&code_challenge=K2-ltc83acc4h0c9w6ESC_rEMTJ3bww-uCHaoeK1t8U
&code_challenge_method=S256&scope=account-information`;

    writeExample('par-request.md', parRequest);

    console.log('\nAll examples regenerated successfully!');
}

// Main execution
try {
    generateExamples();
} catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
}
