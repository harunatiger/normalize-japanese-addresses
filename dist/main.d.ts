import { SinglePrefecture, SingleCity, SingleMachiAza, SingleChiban, SingleRsdt } from '@geolonia/japanese-addresses-v2';

/**
 * 正規化対象の住所の位置情報
 * 位置情報は EPSG:4326 (WGS84) です。
 */
type NormalizeResultPoint = {
    lat: number;
    lng: number;
    /**
     * 緯度経度の正確さを表すレベル
     * - 1 - 都道府県の代表点（県庁所在地）の位置
     * - 2 - 市区町村の代表点（市役所など）の位置
     * - 3 - 丁目・町字の代表点の位置
     * - 8 - 住居表示住所または地番の位置
     */
    level: number;
};
type NormalizeResultMetadata = {
    input: string;
    /** 都道府県 */
    prefecture?: Omit<SinglePrefecture, 'cities'>;
    /** 市区町村 */
    city?: SingleCity;
    /** 町字 */
    machiAza?: SingleMachiAza;
    /** 丁目 */
    chiban?: SingleChiban;
    /** 住居表示住所 */
    rsdt?: SingleRsdt;
};
type NormalizeResult = {
    /** 都道府県 */
    pref?: string;
    /** 市区町村 */
    city?: string;
    /**
     * 丁目・町字
     * 丁目の場合は、丁目名の後に漢数字で丁目が付与される。
     * 例：「青葉一丁目」
     */
    town?: string;
    /** 住居表示または地番 */
    addr?: string;
    /** 正規化後の住所文字列。完全に正規化された場合は、空の文字列が入ります。 */
    other: string;
    /**
     * 住所の緯度経度
     * 注意: 正規化レベルが8でも、位置情報は8でもない場合もあります。
     */
    point?: NormalizeResultPoint;
    /**
     * 住所文字列をどこまで判別できたかを表す正規化レベル
     * - 0 - 都道府県も判別できなかった。
     * - 1 - 都道府県まで判別できた。
     * - 2 - 市区町村まで判別できた。
     * - 3 - 丁目・町字まで判別できた。
     * - 8 - 住居表示住所または地番の判別ができた。
     */
    level: number;
    /** 追加情報 */
    metadata: NormalizeResultMetadata;
};

/**
 * normalize {@link Normalizer} の動作オプション。
 */
interface Config {
    /** 住所データを URL 形式で指定。 file:// 形式で指定するとローカルファイルを参照できます。 */
    japaneseAddressesApi: string;
    /** 内部キャッシュの最大サイズ。デフォルトでは 1,000 件 */
    cacheSize: number;
    geoloniaApiKey?: string;
}
/**
 * 正規化関数の {@link normalize} のオプション
 */
interface Option {
    /**
     * 希望最大正規化を行うレベルを指定します。{@link Option.level}
     *
     * @see https://github.com/geolonia/normalize-japanese-addresses#normalizeaddress-string
     */
    level?: number;
    geoloniaApiKey?: string;
}
/**
 * 住所を正規化します。
 *
 * @param input - 住所文字列
 * @param option -  正規化のオプション {@link Option}
 *
 * @returns 正規化結果のオブジェクト {@link NormalizeResult}
 *
 * @see https://github.com/geolonia/normalize-japanese-addresses#normalizeaddress-string
 */
type Normalizer = (input: string, option?: Option) => Promise<NormalizeResult>;

declare const version: string;
declare const config: Config;
declare const normalize: Normalizer;

export { type NormalizeResult, config, normalize, version };
