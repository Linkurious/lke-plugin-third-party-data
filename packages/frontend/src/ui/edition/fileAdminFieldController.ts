export type FileFieldBinding = {
  fieldKey: string;
  fieldName: string;
  input: HTMLInputElement;
  setValue: (value: string | undefined) => void;
  invalidValueMessage: (fieldName: string) => string;
};

/**
 * Controller for file admin fields, which handles reading the file and storing its base64 content.
 * Each field has a FileReader associated to handle the file reading and the controller gives a way
 * to wait for all pending reads to finish. A given reader can be aborted if the user selects a new
 * file, and the controller will store any read errors that occur for each field.
 */
export class FileAdminFieldController {
  // All pending reads to finish before proceeding.
  private readonly pendingReads = new Map<string, Promise<void>>();
  // Error messages for file reads that failed. Cleared when the user selects a new file.
  private readonly readErrors = new Map<string, string>();
  // Active file readers, so that we can abort them if the user selects a new file.
  private readonly activeReaders = new Map<string, FileReader>();

  /**
   * Bind a file input to the controller, so that it can read the file and store its base64 content.
   */
  public bindFileInput(binding: FileFieldBinding): void {
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

  /**
   * Wait for all pending file reads to finish.
   */
  public async waitForPendingReads(): Promise<void> {
    await Promise.allSettled(this.pendingReads.values());
  }

  /**
   * Get the read error for a specific field, if any.
   */
  public getReadError(fieldKey: string): string | undefined {
    return this.readErrors.get(fieldKey);
  }
}
