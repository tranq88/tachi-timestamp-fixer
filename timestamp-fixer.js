/* JSON validation and timestamp correction. */
(function (root) {
  "use strict";

  const OFFSET_MINUTES = Object.freeze(Array.from({ length: 105 }, (_, i) => -720 + i * 15));
  const MAX_DATE_MS = 8640000000000000;
  const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

  function formatOffset(minutes) {
    const sign = minutes < 0 ? "−" : "+";
    const absolute = Math.abs(minutes);
    return `UTC${sign}${String(Math.floor(absolute / 60)).padStart(2, "0")}:${String(absolute % 60).padStart(2, "0")}`;
  }

  function parseBatch(text) {
    let data;
    try {
      data = JSON.parse(text.replace(/^\uFEFF/, ""));
    } catch {
      throw new Error("This file is not valid JSON. Choose the original BATCH-MANUAL export from your server.");
    }
    if (!isRecord(data) || !isRecord(data.meta) || typeof data.meta.game !== "string" || !data.meta.game.trim() || !Array.isArray(data.scores)) {
      throw new Error("Expected a BATCH-MANUAL object with meta.game and a scores array.");
    }
    if (!data.scores.length) {
      throw new Error("This export has no scores to correct.");
    }
    let timestampCount = 0;
    let skippedCount = 0;
    const sample = [];
    data.scores.forEach((score, index) => {
      if (!isRecord(score)) {
        throw new Error(`Score ${index + 1} must be a JSON object.`);
      }
      const time = score.timeAchieved;
      // Tachi treats 0, null, and omitted timeAchieved as an unknown date.
      if (time === undefined || time === null || time === 0) {
        skippedCount++;
        return;
      }
      if (!Number.isSafeInteger(time) || Math.abs(time) > MAX_DATE_MS) {
        throw new Error(`Score ${index + 1}: timeAchieved must be a numeric Unix timestamp in milliseconds, or null. Strings and date text are not supported.`);
      }
      timestampCount++;
      if (sample.length < 3) sample.push({ index, time });
    });
    if (!timestampCount) {
      throw new Error("No known score timestamps found. This tool corrects numeric scores[].timeAchieved values; missing, null, and 0 values represent unknown times.");
    }
    return { data, timestampCount, skippedCount, sample };
  }

  function validateCorrection(batch, offsetMinutes) {
    if (!OFFSET_MINUTES.includes(offsetMinutes)) {
      throw new Error("Choose a UTC offset between UTC−12:00 and UTC+14:00.");
    }
    const shift = offsetMinutes * 60000;
    batch.data.scores.forEach((score, index) => {
      const original = score.timeAchieved;
      if (original === undefined || original === null || original === 0) return;
      const corrected = original - shift;
      if (!Number.isSafeInteger(corrected) || Math.abs(corrected) > MAX_DATE_MS || corrected === 0) {
        throw new Error(`Score ${index + 1}: this offset would produce an invalid or unknown timestamp. Check the selected offset and the original file.`);
      }
    });
    return shift;
  }

  function correctBatch(batch, offsetMinutes) {
    const shift = validateCorrection(batch, offsetMinutes);
    // Build from the original every time so changes never accumulate.
    const scores = batch.data.scores.map((score) => {
      const time = score.timeAchieved;
      return time === undefined || time === null || time === 0
        ? score
        : { ...score, timeAchieved: time - shift };
    });
    return { ...batch.data, scores };
  }

  function downloadName(originalName) {
    return `${originalName.replace(/\.json$/i, "")}-utc-corrected.json`;
  }

  const api = Object.freeze({ OFFSET_MINUTES, formatOffset, parseBatch, validateCorrection, correctBatch, downloadName });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.TimestampFixer = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
