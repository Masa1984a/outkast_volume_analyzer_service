import lz4 from 'lz4';

/**
 * Decompress LZ4 compressed buffer
 * This is the core function for decompressing Hyperliquid API responses
 */
export async function decompressLz4Buffer(compressedData: Buffer): Promise<Buffer> {
  try {
    const decompressed = lz4.decode(compressedData);
    return Buffer.from(decompressed);
  } catch (error) {
    throw new Error(
      `LZ4 decompression failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Decompress LZ4 compressed data and return as string
 */
export async function decompressLz4ToString(compressedData: Buffer): Promise<string> {
  const decompressed = await decompressLz4Buffer(compressedData);
  return decompressed.toString('utf-8');
}
