import { deflate, inflate } from 'pako';

/**
 * StegoManager — Browser LSB (Least Significant Bit) Steganography Engine.
 * Fully compatible with the Python StegoManager specification:
 * - 4-byte big-endian length header
 * - zlib/deflate compression
 * - RGB channel LSB modulation (Alpha untouched)
 */
export class StegoManager {
  public static readonly HEADER_SIZE = 4; // 4 bytes = 32 bits

  /**
   * Calculate maximum capacity in bytes for a given image dimension
   */
  public static calculateCapacity(width: number, height: number): number {
    return Math.floor((width * height * 3) / 8);
  }

  /**
   * Embed arbitrary secret data bytes into an ImageData instance using LSB steganography.
   * Returns a new ImageData with the data embedded and compression stats.
   */
  public static hideData(
    originalImageData: ImageData,
    secretData: Uint8Array
  ): {
    stegoImageData: ImageData;
    capacity: number;
    compressedSize: number;
    totalEmbeddedBytes: number;
  } {
    const width = originalImageData.width;
    const height = originalImageData.height;
    const capacity = this.calculateCapacity(width, height);

    // Step 1: Compress secret data with deflate level 9
    const compressed = deflate(secretData, { level: 9 });
    const payloadLength = compressed.length;

    // Frame: 4-byte big-endian header + compressed payload
    const totalFramedLength = this.HEADER_SIZE + payloadLength;
    if (totalFramedLength > capacity) {
      throw new Error(
        `Insufficient stego capacity! Payload requires ${totalFramedLength.toLocaleString()} bytes (with header), but image can hold ${capacity.toLocaleString()} bytes. Try using a larger image or fewer redaction zones.`
      );
    }

    const framed = new Uint8Array(totalFramedLength);
    // Write 4-byte big-endian length
    framed[0] = (payloadLength >>> 24) & 0xff;
    framed[1] = (payloadLength >>> 16) & 0xff;
    framed[2] = (payloadLength >>> 8) & 0xff;
    framed[3] = payloadLength & 0xff;
    framed.set(compressed, this.HEADER_SIZE);

    // Create a copy of the pixel data so we do not mutate the input
    const dataCopy = new Uint8ClampedArray(originalImageData.data);
    const totalBits = totalFramedLength * 8;
    let bitIdx = 0;

    const totalPixels = width * height;
    for (let p = 0; p < totalPixels && bitIdx < totalBits; p++) {
      const offset = p * 4;
      // Loop over RGB channels (0=R, 1=G, 2=B), skip Alpha (offset+3)
      for (let c = 0; c < 3 && bitIdx < totalBits; c++) {
        const byteIndex = Math.floor(bitIdx / 8);
        const bitOffset = 7 - (bitIdx % 8); // read MSB to LSB within each framed byte
        const bit = (framed[byteIndex] >> bitOffset) & 1;

        // Clear LSB and write our bit
        dataCopy[offset + c] = (dataCopy[offset + c] & 0xfe) | bit;
        bitIdx++;
      }
    }

    const stegoImageData = new ImageData(dataCopy, width, height);

    return {
      stegoImageData,
      capacity,
      compressedSize: payloadLength,
      totalEmbeddedBytes: totalFramedLength,
    };
  }

  /**
   * Extract hidden data from an ImageData instance.
   * Reads the 4-byte length prefix first, then unpacks and inflates the payload.
   */
  public static extractData(imageData: ImageData): Uint8Array {
    const width = imageData.width;
    const height = imageData.height;
    const capacity = this.calculateCapacity(width, height);
    const data = imageData.data;

    // Step 1: Extract 32 bits for the length header
    const headerBitsNeeded = this.HEADER_SIZE * 8;
    const headerBytes = new Uint8Array(this.HEADER_SIZE);
    let bitIdx = 0;

    let p = 0;
    const totalPixels = width * height;
    while (p < totalPixels && bitIdx < headerBitsNeeded) {
      const offset = p * 4;
      for (let c = 0; c < 3 && bitIdx < headerBitsNeeded; c++) {
        const bit = data[offset + c] & 1;
        const byteIndex = Math.floor(bitIdx / 8);
        const bitOffset = 7 - (bitIdx % 8);
        headerBytes[byteIndex] |= bit << bitOffset;
        bitIdx++;
      }
      p++;
    }

    const payloadLength =
      ((headerBytes[0] << 24) >>> 0) +
      (headerBytes[1] << 16) +
      (headerBytes[2] << 8) +
      headerBytes[3];

    const maxPayload = capacity - this.HEADER_SIZE;
    if (payloadLength <= 0 || payloadLength > maxPayload) {
      throw new Error(
        'No valid SecureGuard steganographic payload found in this document, or the image has been modified/compressed.'
      );
    }

    // Step 2: Extract exactly payloadLength bytes (payloadLength * 8 bits)
    const payloadBitsNeeded = payloadLength * 8;
    const compressed = new Uint8Array(payloadLength);
    let payloadBitIdx = 0;

    while (p < totalPixels && payloadBitIdx < payloadBitsNeeded) {
      const offset = p * 4;
      for (let c = 0; c < 3 && payloadBitIdx < payloadBitsNeeded; c++) {
        const bit = data[offset + c] & 1;
        const byteIndex = Math.floor(payloadBitIdx / 8);
        const bitOffset = 7 - (payloadBitIdx % 8);
        compressed[byteIndex] |= bit << bitOffset;
        payloadBitIdx++;
      }
      p++;
    }

    if (payloadBitIdx < payloadBitsNeeded) {
      throw new Error('Image ended unexpectedly before entire hidden payload could be extracted.');
    }

    // Step 3: Decompress with zlib/inflate
    try {
      return inflate(compressed);
    } catch {
      throw new Error('Decompression failed — stego payload bits corrupted or tampered with.');
    }
  }

  /**
   * Inspect steganography metadata without extracting everything
   */
  public static inspect(imageData: ImageData): {
    hasStego: boolean;
    payloadLength: number;
    capacity: number;
    utilizationPercent: number;
  } {
    const capacity = this.calculateCapacity(imageData.width, imageData.height);
    try {
      const data = imageData.data;
      const headerBytes = new Uint8Array(4);
      let bitIdx = 0;
      for (let p = 0; p < imageData.width * imageData.height && bitIdx < 32; p++) {
        const offset = p * 4;
        for (let c = 0; c < 3 && bitIdx < 32; c++) {
          const bit = data[offset + c] & 1;
          const byteIndex = Math.floor(bitIdx / 8);
          const bitOffset = 7 - (bitIdx % 8);
          headerBytes[byteIndex] |= bit << bitOffset;
          bitIdx++;
        }
      }
      const payloadLength =
        ((headerBytes[0] << 24) >>> 0) +
        (headerBytes[1] << 16) +
        (headerBytes[2] << 8) +
        headerBytes[3];

      const maxPayload = capacity - 4;
      if (payloadLength > 0 && payloadLength <= maxPayload) {
        return {
          hasStego: true,
          payloadLength,
          capacity,
          utilizationPercent: Math.min(100, (payloadLength / capacity) * 100),
        };
      }
    } catch {
      // not stego
    }

    return {
      hasStego: false,
      payloadLength: 0,
      capacity,
      utilizationPercent: 0,
    };
  }

  /**
   * Generates a visual contrast map of the 0th bit plane (LSB).
   * Modulates pixels to 255 if bit is 1, and 0 if bit is 0.
   */
  public static generateLSBVisualization(imageData: ImageData): ImageData {
    const { width, height, data } = imageData;
    const visData = new Uint8ClampedArray(width * height * 4);

    for (let p = 0; p < width * height; p++) {
      const offset = p * 4;
      // High contrast LSB of each channel
      const rBit = (data[offset] & 1) * 255;
      const gBit = (data[offset + 1] & 1) * 255;
      const bBit = (data[offset + 2] & 1) * 255;

      visData[offset] = rBit;
      visData[offset + 1] = gBit;
      visData[offset + 2] = bBit;
      visData[offset + 3] = 255;
    }

    return new ImageData(visData, width, height);
  }
}
