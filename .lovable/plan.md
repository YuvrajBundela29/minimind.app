

## Analysis

**Critical finding**: PocketPal AI is a **React Native app** that runs llama.cpp natively on iOS/Android via C++ bindings. It cannot be ported to a browser/web context. Its core inference engine is native code, not JavaScript/WASM.

**The correct browser-based approach** is to use `@huggingface/transformers` (Transformers.js), which runs ONNX models via WebAssembly/WebGPU entirely in the browser. This achieves the same goal (offline, on-device AI) but through browser-compatible technology.

**Build error**: Line 135 of `Index.tsx` uses `NodeJS.Timeout` which requires `@types/node` — needs to be changed to `ReturnType<typeof setTimeout>`.

---

## Plan

### 1. Fix existing build error

In `src/pages/Index.tsx` line 135, replace `NodeJS.Timeout` with `ReturnType<typeof setTimeout>` to fix the TS2503 error.

### 2. Create Offline AI module

```text
src/
├── offline-ai/
│   ├── OfflineAIPage.tsx       — Main page component with chat UI
│   ├── useOfflineModel.ts      — Hook: model loading, progress, inference
│   └── worker.ts               — Web Worker for inference (prevents UI freeze)
```

**Technology**: `@huggingface/transformers` — runs quantized models (ONNX format) in-browser via WASM/WebGPU. No server needed.

**Model choice**: `Qwen2.5-0.5B-Instruct` (quantized Q4) — approximately 300-400MB, small enough for mobile devices, good multilingual support.

### 3. Key implementation details

- **Web Worker**: All inference runs in a Web Worker so the main UI thread never freezes.
- **Lazy loading**: The `@huggingface/transformers` library and model weights are only loaded when the user navigates to `/offline-ai`.
- **Progress tracking**: Hugging Face Transformers.js provides download progress callbacks — displayed as a progress bar.
- **Device capability check**: Check `navigator.hardwareConcurrency` and available memory before loading. Show fallback message on weak devices.
- **Max tokens capped** at 256 to prevent long generation times on mobile.
- **Chat interface**: Clean UI matching the existing app theme with input field, messages area, and status indicator (Loading/Ready/Generating).

### 4. Route integration

Add a single new route in `App.tsx`:
```
<Route path="/offline-ai" element={<OfflineAIPage />} />
```

No changes to existing navigation, pages, or components.

### 5. What will NOT change

- Main navigation / SideMenu
- Existing AI service (`aiService.ts`, edge functions)
- Styling system / theme
- Any existing page or component

### 6. Performance safeguards

- Fallback message if `navigator.hardwareConcurrency < 4` or device memory < 4GB
- Abort generation button
- Token limit of 256
- Model loaded only on demand, garbage collected on page unmount

### 7. Capacitor/Android compatibility

- `@huggingface/transformers` uses only browser APIs (WASM, Web Workers, IndexedDB for caching)
- No Node.js dependencies
- Works in Capacitor WebView (Android 10+, iOS 15+)

### Notes on model size and performance

- **Qwen2.5-0.5B Q4**: ~350MB download, cached in IndexedDB after first load
- **Performance**: Expect 2-8 tokens/sec on modern phones, 10-20+ on desktop
- **First load**: 30-90 seconds depending on connection (model download)
- **Subsequent loads**: 5-15 seconds (loaded from IndexedDB cache)

