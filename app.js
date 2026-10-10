"use strict";

(() => {
  const fixer = window.TimestampFixer;
  const get = (id) => document.getElementById(id);
  const fileInput = get("file-input");
  const offsetSelect = get("utc-offset");
  const dropZone = get("drop-zone");
  const downloadButton = get("download-button");
  let batch = null;
  let fileName = "";
  let readVersion = 0;
  let draggingDepth = 0;

  offsetSelect.replaceChildren();
  for (const minutes of fixer.OFFSET_MINUTES) {
    if (minutes === 0) continue;
    const label = fixer.formatOffset(minutes) + (minutes === 540 ? " (JST)" : "");
    offsetSelect.add(new Option(label, String(minutes), minutes === 540, minutes === 540));
  }

  function setMessage(text, kind = "info") {
    get("message").textContent = text;
    get("message").dataset.kind = kind;
  }

  function durationText(minutes) {
    const absolute = Math.abs(minutes);
    const hours = Math.floor(absolute / 60);
    const remainder = absolute % 60;
    const parts = [];
    if (hours) parts.push(`${hours} hour${hours === 1 ? "" : "s"}`);
    if (remainder) parts.push(`${remainder} minute${remainder === 1 ? "" : "s"}`);
    return parts.join(" ");
  }

  function refresh() {
    downloadButton.disabled = true;
    const hasOffset = offsetSelect.value !== "";
    const minutes = Number(offsetSelect.value);
    get("shift-note").hidden = !hasOffset;
    if (hasOffset) {
      get("shift-description").textContent = `${fixer.formatOffset(minutes)} → UTC: ${minutes > 0 ? "subtract" : "add"} ${durationText(minutes)} ${minutes > 0 ? "from" : "to"} each timestamp.`;
    }
    if (!batch) {
      setMessage("");
      return;
    }
    if (!hasOffset) {
      setMessage("Choose the service’s UTC offset to correct the file.");
      return;
    }
    try {
      fixer.validateCorrection(batch, minutes);
    } catch (error) {
      setMessage(error.message, "error");
      return;
    }
    downloadButton.disabled = false;
    setMessage("");
  }

  function resetFile() {
    readVersion++;
    batch = null;
    fileName = "";
    fileInput.value = "";
    get("file-details").hidden = true;
    get("file-name").textContent = "";
    dropZone.removeAttribute("aria-busy");
    refresh();
  }

  async function loadFile(file) {
    resetFile();
    const version = readVersion;
    if (!/\.json$/i.test(file.name)) {
      setMessage("Choose a .json BATCH-MANUAL export.", "error");
      return;
    }
    dropZone.setAttribute("aria-busy", "true");
    setMessage("Reading your file locally…");
    try {
      const text = await file.text();
      if (version !== readVersion) return;
      batch = fixer.parseBatch(text);
      fileName = file.name;
      get("file-name").textContent = fileName;
      get("file-details").hidden = false;
      refresh();
    } catch (error) {
      if (version !== readVersion) return;
      batch = null;
      setMessage(error instanceof Error ? error.message : "Could not read this file. Try selecting it again.", "error");
    } finally {
      if (version === readVersion) dropZone.removeAttribute("aria-busy");
    }
  }

  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (file) loadFile(file);
  });
  offsetSelect.addEventListener("change", refresh);
  get("clear-file").addEventListener("click", () => {
    resetFile();
    fileInput.focus();
  });
  // Prevent a dropped file from navigating away from the page.
  for (const type of ["dragover", "drop"]) {
    window.addEventListener(type, (event) => event.preventDefault());
  }
  dropZone.addEventListener("dragenter", (event) => {
    event.preventDefault();
    draggingDepth++;
    dropZone.classList.add("is-dragging");
  });
  dropZone.addEventListener("dragleave", () => {
    draggingDepth = Math.max(0, draggingDepth - 1);
    if (!draggingDepth) dropZone.classList.remove("is-dragging");
  });
  dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    draggingDepth = 0;
    dropZone.classList.remove("is-dragging");
    const files = event.dataTransfer.files;
    if (files.length !== 1) {
      resetFile();
      setMessage("Drop one JSON file at a time.", "error");
      return;
    }
    loadFile(files[0]);
  });
  downloadButton.addEventListener("click", () => {
    if (!batch || offsetSelect.value === "") return;
    try {
      const corrected = fixer.correctBatch(batch, Number(offsetSelect.value));
      const blob = new Blob([JSON.stringify(corrected)], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fixer.downloadName(fileName);
      document.body.append(link);
      link.click();
      link.remove();
      // Allow the browser to start reading the Blob before releasing it.
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      setMessage(`Download started: ${link.download}`, "success");
    } catch (error) {
      setMessage(error.message, "error");
    }
  });
  refresh();
})();
