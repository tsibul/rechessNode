/**
 * Abstract class for settings validation
 */
export abstract class BaseSettings {
    /**
     * Protected validation method - validates name
     */
    protected validateName(name?: string): boolean {
        if (!name || name.trim() === '') {
            return false
        }

        const nameRegex = /^[а-яёa-z0-9\-+_\s ]+$/i
        return nameRegex.test(name);
  }

  /**
     * Abstract validation method
     */
    abstract validate(data: any): boolean

  /**
     * Return table verbose name
     */
    abstract getVerboseName(): string
}
