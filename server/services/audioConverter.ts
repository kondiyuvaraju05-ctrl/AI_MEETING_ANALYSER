import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";

// Set FFmpeg binary path from ffmpeg-static
if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

export interface AudioPayload {
  audio: string;
  mimeType: string;
}

export interface ConversionResult {
  audio: string;
  mimeType: string;
  converted: boolean;
}

/**
 * Checks if the given mimeType or format is known to be problematic/unsupported by Gemini API directly.
 * Common unsupported or problematic WhatsApp / mobile formats:
 * - .opus / audio/opus / audio/ogg; codecs=opus
 * - .m4a / audio/m4a / audio/x-m4a
 * - .amr / audio/amr
 * - .wma / audio/x-ms-wma
 * - audio/3gpp / audio/3gp
 */
export function isConversionNeeded(mimeType: string): boolean {
  if (!mimeType) return true;

  const lowerMime = mimeType.toLowerCase();

  // Standard fully supported formats that don't strictly require transcoding
  const standardSupported = [
    "audio/wav",
    "audio/x-wav",
    "audio/mp3",
    "audio/mpeg",
    "audio/flac",
    "audio/webm"
  ];

  // If it matches standard supported without unusual codecs, conversion is not strictly needed
  if (standardSupported.some((fmt) => lowerMime === fmt || lowerMime.startsWith(`${fmt};`))) {
    // Check if webm or ogg contains opus codec which can cause issues on some devices
    if (lowerMime.includes("codecs=opus") || lowerMime.includes("opus")) {
      return true;
    }
    return false;
  }

  // Any other format (opus, m4a, amr, wma, 3gp, mp4, etc.) should be converted to WAV
  return true;
}

/**
 * Converts a base64 audio payload into standard PCM 16kHz mono WAV format if needed.
 * Safe temporary file cleanup is guaranteed via try-finally.
 */
export async function ensureCompatibleAudioFormat(
  payload: AudioPayload
): Promise<ConversionResult> {
  const { audio, mimeType } = payload;

  if (!isConversionNeeded(mimeType)) {
    console.log(`[AudioConverter] MimeType '${mimeType}' is standard. Skipping conversion.`);
    return { audio, mimeType, converted: false };
  }

  console.log(`[AudioConverter] Intercepted unsupported/non-standard format '${mimeType}'. Converting to WAV...`);

  // Strip base64 data prefix if present (e.g. data:audio/opus;base64,...)
  const base64Clean = audio.includes(",") ? audio.split(",")[1] : audio;
  const audioBuffer = Buffer.from(base64Clean, "base64");

  const uniqueId = crypto.randomUUID();
  const tempDir = os.tmpdir();

  // Determine appropriate input file extension for ffmpeg hint
  let ext = ".tmp";
  if (mimeType.includes("opus")) ext = ".opus";
  else if (mimeType.includes("m4a")) ext = ".m4a";
  else if (mimeType.includes("amr")) ext = ".amr";
  else if (mimeType.includes("wma")) ext = ".wma";
  else if (mimeType.includes("ogg")) ext = ".ogg";
  else if (mimeType.includes("mp4") || mimeType.includes("aac") || mimeType.includes("video") || mimeType.includes("quicktime")) ext = ".mp4";

  const inputFilePath = path.join(tempDir, `input_${uniqueId}${ext}`);
  const outputFilePath = path.join(tempDir, `output_${uniqueId}.wav`);

  try {
    // Write input base64 buffer to temporary input file
    await fs.promises.writeFile(inputFilePath, audioBuffer);

    // Perform FFmpeg audio transcoding to 16kHz mono PCM WAV
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputFilePath)
        .toFormat("wav")
        .audioFrequency(16000)
        .audioChannels(1)
        .on("end", () => {
          console.log(`[AudioConverter] Audio successfully converted to WAV: ${outputFilePath}`);
          resolve();
        })
        .on("error", (err: Error) => {
          console.error("[AudioConverter] FFmpeg conversion failed:", err.message);
          reject(err);
        })
        .save(outputFilePath);
    });

    // Read converted output WAV file as base64
    const convertedBuffer = await fs.promises.readFile(outputFilePath);
    const convertedBase64 = convertedBuffer.toString("base64");

    return {
      audio: convertedBase64,
      mimeType: "audio/wav",
      converted: true,
    };
  } catch (err: any) {
    console.error("[AudioConverter] Fallback: Audio conversion error occurred:", err.message);
    // If conversion fails, fallback gracefully to original audio payload so server can attempt processing
    return { audio, mimeType, converted: false };
  } finally {
    // Clean up temp files safely
    if (fs.existsSync(inputFilePath)) {
      fs.unlink(inputFilePath, (e) => {
        if (e) console.warn("[AudioConverter] Could not remove input temp file:", e.message);
      });
    }
    if (fs.existsSync(outputFilePath)) {
      fs.unlink(outputFilePath, (e) => {
        if (e) console.warn("[AudioConverter] Could not remove output temp file:", e.message);
      });
    }
  }
}
