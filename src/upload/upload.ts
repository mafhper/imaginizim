interface UploadSetup {
  dropzone: HTMLElement;
  input: HTMLInputElement;
  onFiles: (files: File[]) => void;
}

const SUPPORTED_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/svg+xml',
  'image/webp',
  'image/avif'
]);

function filterSupported(files: File[]): File[] {
  return files.filter((file) => SUPPORTED_TYPES.has(file.type));
}

export function setupUpload({ dropzone, input, onFiles }: UploadSetup): void {
  const pushFiles = (incoming: File[]) => {
    const files = filterSupported(incoming);
    if (files.length > 0) {
      onFiles(files);
    }
  };

  dropzone.addEventListener('click', () => input.click());

  dropzone.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropzone.classList.add('drag-over');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('drag-over');
  });

  dropzone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropzone.classList.remove('drag-over');
    const files = Array.from(event.dataTransfer?.files ?? []);
    pushFiles(files);
  });

  input.addEventListener('change', () => {
    const files = Array.from(input.files ?? []);
    pushFiles(files);
    input.value = '';
  });
}
