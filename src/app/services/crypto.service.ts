import { Injectable } from '@angular/core';
import * as forge from 'node-forge';

@Injectable({
    providedIn: 'root'
})
export class CryptoService {

    constructor() { }

    // -------------------------
    // 1. AES Operations
    // -------------------------

    /**
     * Generates a random 32-byte (256-bit) AES key.
     * key is returned as a binary string (or bytes).
     */
    generateAESKey(): string {
        return forge.random.getBytesSync(32);
    }

    /**
     * Encrypts file content using AES-CBC.
     * Returns: { encryptedBytes: string (binary), iv: string (binary) }
     * We prepend IV to the encrypted content for simpler storage.
     */
    encryptFile(fileContent: ArrayBuffer, aesKey: string): string {
        const iv = forge.random.getBytesSync(16);
        const cipher = forge.cipher.createCipher('AES-CBC', aesKey);
        cipher.start({ iv: iv });

        // Convert ArrayBuffer to binary string for Forge
        const fileStr = this.arrayBufferToBinaryString(fileContent);
        cipher.update(forge.util.createBuffer(fileStr));
        cipher.finish();

        const encrypted = cipher.output.getBytes();

        // Return IV + EncryptedContent
        return iv + encrypted;
    }

    /**
     * Decrypts file content using AES-CBC.
     * Input: Binary string (IV + Encrypted)
     * Output: ArrayBuffer
     */
    decryptFile(encryptedDataWithIv: string, aesKey: string): ArrayBuffer {
        // Defensive Checks
        if (!aesKey || typeof aesKey !== 'string') {
            console.error('Invalid AES Key Type:', typeof aesKey);
            throw new Error('Invalid AES Key provided for decryption (Not a string)');
        }
        if (aesKey.length !== 32) {
            console.error('Invalid AES Key Length:', aesKey.length);
            throw new Error(`Invalid AES Key length: ${aesKey.length} bytes. Expected 32 bytes (256-bit).`);
        }
        if (!encryptedDataWithIv || typeof encryptedDataWithIv !== 'string') {
            console.error('Invalid Encrypted Data Type:', typeof encryptedDataWithIv);
            throw new Error('Invalid Encrypted Data (Not a string)');
        }
        // Minimal length for ANY AES block is 16 bytes
        if (encryptedDataWithIv.length < 1) {
            throw new Error('Encrypted file data is empty');
        }

        try {
            // STRATEGY 1: Try AES-CBC (New Backend Standard)
            // Expects: 16 bytes IV + Encrypted Content
            if (encryptedDataWithIv.length >= 32) { // 16 bytes IV + at least 16 bytes block
                try {
                    console.log('Attempting AES-CBC Decryption...');
                    const iv = encryptedDataWithIv.slice(0, 16);
                    const encrypted = encryptedDataWithIv.slice(16);

                    const decipher = forge.cipher.createDecipher('AES-CBC', aesKey);
                    decipher.start({ iv: iv });
                    decipher.update(forge.util.createBuffer(encrypted));
                    const result = decipher.finish();

                    if (result) {
                        console.log('AES-CBC Decryption successful.');
                        return this.binaryStringToArrayBuffer(decipher.output.getBytes());
                    } else {
                        throw new Error('CBC padding check failed');
                    }
                } catch (cbcError) {
                    console.warn('AES-CBC failed (likely legacy file), attempting Fallback to AES-ECB...', cbcError);
                }
            } else {
                console.warn('File too short for CBC (needs IV), attempting AES-ECB...');
            }

            // STRATEGY 2: Fallback to AES-ECB (Old Backend Standard)
            // Expects: Raw Encrypted Content (No IV)
            console.log('Attempting AES-ECB Decryption (Legacy Fallback)...');
            const decipher = forge.cipher.createDecipher('AES-ECB', aesKey);
            decipher.start();
            decipher.update(forge.util.createBuffer(encryptedDataWithIv));
            const result = decipher.finish();

            if (!result) {
                throw new Error('AES-ECB Decryption failed (Padding Error). Key is wrong or file is corrupted.');
            }

            console.log('AES-ECB Decryption successful.');
            return this.binaryStringToArrayBuffer(decipher.output.getBytes());

        } catch (e: any) {
            console.error('All Decryption Attempts Failed:', e);
            throw new Error('Decryption Failed: ' + e.message);
        }
    }

    // -------------------------
    // 2. RSA Operations (Key Encryption)
    // -------------------------

    /**
     * Encrypts the AES key using the Receiver's Public Key.
     * Returns Base64 encoded string.
     */
    encryptAESKey(aesKey: string, receiverPublicKey: string): string {
        const pem = this.ensurePem(receiverPublicKey, 'PUBLIC');
        const publicKey = forge.pki.publicKeyFromPem(pem);
        const encrypted = publicKey.encrypt(aesKey, 'RSA-OAEP');
        return forge.util.encode64(encrypted);
    }

    /**
     * Decrypts the Encrypted AES Key using Receiver's Private Key.
     * Input: Base64 encoded encrypted key.
     * Output: Binary string (the AES key).
     */
    decryptAESKey(encryptedAesKeyBase64: string, receiverPrivateKey: string): string {
        try {
            const pem = this.ensurePem(receiverPrivateKey, 'PRIVATE');
            const privateKey = forge.pki.privateKeyFromPem(pem);
            const encryptedBytes = forge.util.decode64(encryptedAesKeyBase64);

            try {
                // Try OAEP first (New backend standard)
                let decrypted = privateKey.decrypt(encryptedBytes, 'RSA-OAEP');

                // BACKEND QUIRK FIX:
                // The backend encrypts the Base64 String of the key (44 bytes), not the raw 32 bytes.
                // If we get 44 bytes, it's likely the Base64 string. Decode it.
                if (decrypted.length === 44) {
                    console.log('Detected Base64 encoded AES key (44 bytes). Decoding...');
                    try {
                        const decoded = forge.util.decode64(decrypted);
                        if (decoded.length === 32) {
                            console.log('Successfully decoded to 32-byte AES Key.');
                            return decoded;
                        }
                    } catch (ignore) {
                        console.warn('Failed to decode potential Base64 key, using raw.');
                    }
                }
                return decrypted;

            } catch (oaepError) {
                console.warn('OAEP Decryption failed, attempting PKCS1 fallback...', oaepError);
                // Fallback to PKCS1 (Old backend standard / Legacy files)
                let decrypted = privateKey.decrypt(encryptedBytes, 'RSAES-PKCS1-V1_5');

                // SAME FIX FOR LEGACY/PKCS1:
                if (decrypted.length === 44) {
                    console.log('Detected Base64 encoded AES key (Legacy 44 bytes). Decoding...');
                    try {
                        const decoded = forge.util.decode64(decrypted);
                        if (decoded.length === 32) {
                            console.log('Successfully decoded to 32-byte AES Key.');
                            return decoded;
                        }
                    } catch (ignore) {
                        console.warn('Failed to decode potential Base64 key, using raw.');
                    }
                }
                return decrypted;
            }
        } catch (e) {
            console.error("AES Key Decryption Failed", e);
            throw e;
        }
    }

    private ensurePem(key: string, type: 'PUBLIC' | 'PRIVATE'): string {
        if (!key) return '';
        if (key.includes('-----BEGIN')) return key;

        const header = `-----BEGIN ${type} KEY-----`;
        const footer = `-----END ${type} KEY-----`;
        return `${header}\n${key}\n${footer}`;
    }

    // -------------------------
    // 3. Digital Signature
    // -------------------------

    /**
     * Signs the Original File Content (or its hash) using Sender's Private Key.
     * We will hash the file content first (SHA-256), then sign the hash.
     * Returns Base64 encoded signature.
     */
    /**
     * Signs the Original File Content (or its hash) using Sender's Private Key.
     * We will hash the file content first (SHA-256), then sign the hash.
     * Returns Base64 encoded signature.
     */
    signData(fileContent: ArrayBuffer, senderPrivateKey: string): string {
        try {
            const md = forge.md.sha256.create();
            const fileStr = this.arrayBufferToBinaryString(fileContent);
            md.update(fileStr, 'raw');

            console.log('Signing Data Hash (SHA-256):', md.digest().toHex()); // Debug Log

            const pem = this.ensurePem(senderPrivateKey, 'PRIVATE');
            const privateKey = forge.pki.privateKeyFromPem(pem);
            const signature = privateKey.sign(md);

            return forge.util.encode64(signature);
        } catch (e) {
            console.error("Signing Failed", e);
            throw e;
        }
    }

    /**
     * Verifies the signature using Sender's Public Key.
     */
    verifySignature(fileContent: ArrayBuffer, signatureBase64: string, senderPublicKey: string): boolean {
        try {
            const md = forge.md.sha256.create();
            const fileStr = this.arrayBufferToBinaryString(fileContent);
            md.update(fileStr, 'raw');

            const digestBytes = md.digest().bytes();
            const digestHex = forge.util.bytesToHex(digestBytes);

            console.log('Verifying Data Hash (SHA-256):', digestHex); // Debug Log

            const signature = forge.util.decode64(signatureBase64);
            const pem = this.ensurePem(senderPublicKey, 'PUBLIC');
            const publicKey = forge.pki.publicKeyFromPem(pem);

            const verified = publicKey.verify(digestBytes, signature);
            console.log('Signature Verification Result:', verified);
            return verified;
        } catch (e: any) {
            console.error("Verification Failed", e);
            throw new Error('Signature Verification crashed: ' + e.message);
        }
    }

    // -------------------------
    // 4. Utils
    // -------------------------

    arrayBufferToBinaryString(buffer: ArrayBuffer): string {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return binary;
    }

    binaryStringToArrayBuffer(binary: string): ArrayBuffer {
        const length = binary.length;
        const buffer = new ArrayBuffer(length);
        const view = new Uint8Array(buffer);
        for (let i = 0; i < length; i++) {
            view[i] = binary.charCodeAt(i);
        }
        return buffer;
    }

    /**
     * Converts a binary string to a Hex string.
     * Useful for displaying keys safely.
     */
    bytesToHex(bytes: string): string {
        return forge.util.bytesToHex(bytes);
    }

    /**
     * Converts a Hex string back to a binary string.
     * Useful for retrieving keys from input.
     */
    hexToBytes(hex: string): string {
        return forge.util.hexToBytes(hex);
    }

    blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                resolve(reader.result as ArrayBuffer);
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(blob);
        });
    }
}
