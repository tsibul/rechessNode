export abstract class BaseSettingsRepository {
    abstract getDataForCMS(): Promise<any>
}
