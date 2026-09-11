export type FileFieldBinding = {
  fieldKey: string;
  fieldName: string;
  input: HTMLInputElement;
  setValue: (value: string | undefined) => void;
  invalidValueMessage: (fieldName: string) => string;
};

export class FileAdminFieldController {
  private readonly pendingReads = new Map<string, Promise<void>>();
  private readonly readErrors = new Map<string, string>();
  private readonly activeReaders = new Map<string, FileReader>();

  bindFileInput(binding: FileFieldBinding): void {
    const {fieldKey, fieldName, input, setValue, invalidValueMessage} = binding;
    input.addEventListener('change', () => {
      this.readErrors.delete(fieldKey);

      const activeReader = this.activeReaders.get(fieldKey);
      if (activeReader && activeReader.readyState === FileReader.LOADING) {
        activeReader.abort();
      }

      const file = input.files?.[0];
      if (!file) {
        setValue(undefined);
        this.pendingReads.delete(fieldKey);
        this.activeReaders.delete(fieldKey);
        return;
      }

      const reader = new FileReader();
      this.activeReaders.set(fieldKey, reader);
      const pendingRead = new Promise<void>((resolve) => {
        reader.addEventListener('load', () => {
          if (this.activeReaders.get(fieldKey) !== reader) {
            resolve();
            return;
          }
          const dataUrl = reader.result;
          if (typeof dataUrl !== 'string') {
            setValue(undefined);
            this.readErrors.set(fieldKey, invalidValueMessage(fieldName));
            resolve();
            return;
          }
          const base64Data = dataUrl.includes('base64,') ? dataUrl.split('base64,')[1].trim() : '';
          setValue(base64Data !== '' ? base64Data : undefined);
          resolve();
        });
        reader.addEventListener('error', () => {
          if (this.activeReaders.get(fieldKey) !== reader) {
            resolve();
            return;
          }
          setValue(undefined);
          this.readErrors.set(fieldKey, invalidValueMessage(fieldName));
          resolve();
        });
        reader.addEventListener('abort', () => {
          resolve();
        });
        reader.readAsDataURL(file);
      });

      this.pendingReads.set(fieldKey, pendingRead);
      void pendingRead.finally(() => {
        if (this.pendingReads.get(fieldKey) === pendingRead) {
          this.pendingReads.delete(fieldKey);
        }
        if (this.activeReaders.get(fieldKey) === reader) {
          this.activeReaders.delete(fieldKey);
        }
      });
    });
  }

  async waitForPendingReads(): Promise<void> {
    await Promise.allSettled(this.pendingReads.values());
  }

  getReadError(fieldKey: string): string | undefined {
    return this.readErrors.get(fieldKey);
  }
}
