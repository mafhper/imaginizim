import imageCompression from 'browser-image-compression';

const svgoUrl = import.meta.env.BASE_URL + 'svgo.browser.js';
let optimizeSvg;
let svgoInitialized = false;

async function initSvgo() {
  if (!svgoInitialized) {
    try {
      const svgoModule = await new Function('url', 'return import(url)')(svgoUrl);
      optimizeSvg = svgoModule.optimize;
      svgoInitialized = true;
    } catch (e) {
      console.error('Failed to load SVGO:', e);
    }
  }
}

self.onmessage = async (e) => {
  const { file, id, type } = e.data;

  try {
    if (type === 'image/svg+xml') {
      await initSvgo();
    }
    
    let resultBlob;

    if (type === 'image/jpeg' || type === 'image/jpg' || type === 'image/png') {
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: false,
        fileType: type,
      };
      
      if (type.includes('jpeg') || type.includes('jpg')) {
        options.initialQuality = 0.75;
      }
      
      if (type.includes('png')) {
        options.alwaysKeepResolution = true;
        options.initialQuality = 0.9;
      }
      
      resultBlob = await imageCompression(file, options);
      
    } else if (type === 'image/svg+xml') {
      if (!optimizeSvg) throw new Error('SVGO not loaded');
      
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const text = new TextDecoder().decode(uint8Array);
      
      const result = optimizeSvg(text, {
        multipass: true,
        plugins: [
          'preset-default',
          'removeDimensions'
        ]
      });
      
      const resultData = new TextEncoder().encode(result.data);
      resultBlob = new Blob([resultData], { type: type });
      
    } else {
      throw new Error(`Unsupported file type: ${type}`);
    }

    self.postMessage({ 
      id, 
      success: true, 
      blob: resultBlob,
      originalSize: file.size,
      newSize: resultBlob.size
    });

  } catch (error) {
    self.postMessage({ id, success: false, error: error.message });
  }
};
