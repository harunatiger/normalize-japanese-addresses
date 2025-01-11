import { findKanjiNumbers, kanji2number, number2kanji } from '@geolonia/japanese-numeral';
import Papaparse from 'papaparse';
import { LRUCache } from 'lru-cache';
import { cityName, machiAzaName, prefectureName, rsdtToString, chibanToString } from '@geolonia/japanese-addresses-v2';
import { promises } from 'node:fs';
import { fetch as fetch$1 } from 'undici';

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise, SuppressedError, Symbol, Iterator */


function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

// export const defaultEndpoint = 'http://localhost:8080/api/ja'
const defaultEndpoint = 'https://japanese-addresses-v2.geoloniamaps.com/api/ja';
const currentConfig = {
    japaneseAddressesApi: defaultEndpoint,
    cacheSize: 1000,
};
/**
 * @internal
 */
const __internals = {
    // default fetch
    fetch: (input, options) => {
        const o = options || {};
        let url = new URL(`${currentConfig.japaneseAddressesApi}${input}`).toString();
        if (currentConfig.geoloniaApiKey) {
            url += `?geolonia-api-key=${currentConfig.geoloniaApiKey}`;
        }
        const headers = {};
        if (typeof o.length !== 'undefined' && typeof o.offset !== 'undefined') {
            headers['Range'] = `bytes=${o.offset}-${o.offset + o.length - 1}`;
        }
        let globalFetch;
        if (typeof fetch !== 'undefined') {
            globalFetch = fetch;
        }
        else if (typeof window !== 'undefined') {
            globalFetch = window.fetch;
        }
        else {
            throw new Error('fetch is not available in this environment');
        }
        return globalFetch(url, {
            headers,
        });
    },
};

const kan2num = (string) => {
    const kanjiNumbers = findKanjiNumbers(string);
    for (let i = 0; i < kanjiNumbers.length; i++) {
        try {
            // @ts-ignore
            string = string.replace(kanjiNumbers[i], kanji2number(kanjiNumbers[i]));
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        }
        catch (error) {
            // ignore
        }
    }
    return string;
};

const zen2han = (str) => {
    return str.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => {
        return String.fromCharCode(s.charCodeAt(0) - 0xfee0);
    });
};

const addrPatches = [
    {
        pref: '香川県',
        city: '仲多度郡まんのう町',
        town: '勝浦',
        pattern: '^字?家[6六]',
        result: '家六',
    },
    {
        pref: '愛知県',
        city: 'あま市',
        town: '西今宿',
        pattern: '^字?梶村[1一]',
        result: '梶村一',
    },
    {
        pref: '香川県',
        city: '丸亀市',
        town: '原田町',
        pattern: '^字?東三分[1一]',
        result: '東三分一',
    },
];
const patchAddr = (prefName, cityName, townName, addr) => {
    let _addr = addr;
    for (let i = 0; i < addrPatches.length; i++) {
        const patch = addrPatches[i];
        if (patch.pref === prefName &&
            patch.city === cityName &&
            patch.town === townName) {
            _addr = _addr.replace(new RegExp(patch.pattern), patch.result);
        }
    }
    return _addr;
};

// JIS 第2水準 => 第1水準 及び 旧字体 => 新字体
const jisDai2Dictionary = [
    { src: '亞', dst: '亜' },
    { src: '圍', dst: '囲' },
    { src: '壹', dst: '壱' },
    { src: '榮', dst: '栄' },
    { src: '驛', dst: '駅' },
    { src: '應', dst: '応' },
    { src: '櫻', dst: '桜' },
    { src: '假', dst: '仮' },
    { src: '會', dst: '会' },
    { src: '懷', dst: '懐' },
    { src: '覺', dst: '覚' },
    { src: '樂', dst: '楽' },
    { src: '陷', dst: '陥' },
    { src: '歡', dst: '歓' },
    { src: '氣', dst: '気' },
    { src: '戲', dst: '戯' },
    { src: '據', dst: '拠' },
    { src: '挾', dst: '挟' },
    { src: '區', dst: '区' },
    { src: '徑', dst: '径' },
    { src: '溪', dst: '渓' },
    { src: '輕', dst: '軽' },
    { src: '藝', dst: '芸' },
    { src: '儉', dst: '倹' },
    { src: '圈', dst: '圏' },
    { src: '權', dst: '権' },
    { src: '嚴', dst: '厳' },
    { src: '恆', dst: '恒' },
    { src: '國', dst: '国' },
    { src: '齋', dst: '斎' },
    { src: '雜', dst: '雑' },
    { src: '蠶', dst: '蚕' },
    { src: '殘', dst: '残' },
    { src: '兒', dst: '児' },
    { src: '實', dst: '実' },
    { src: '釋', dst: '釈' },
    { src: '從', dst: '従' },
    { src: '縱', dst: '縦' },
    { src: '敍', dst: '叙' },
    { src: '燒', dst: '焼' },
    { src: '條', dst: '条' },
    { src: '剩', dst: '剰' },
    { src: '壤', dst: '壌' },
    { src: '釀', dst: '醸' },
    { src: '眞', dst: '真' },
    { src: '盡', dst: '尽' },
    { src: '醉', dst: '酔' },
    { src: '髓', dst: '髄' },
    { src: '聲', dst: '声' },
    { src: '竊', dst: '窃' },
    { src: '淺', dst: '浅' },
    { src: '錢', dst: '銭' },
    { src: '禪', dst: '禅' },
    { src: '爭', dst: '争' },
    { src: '插', dst: '挿' },
    { src: '騷', dst: '騒' },
    { src: '屬', dst: '属' },
    { src: '對', dst: '対' },
    { src: '滯', dst: '滞' },
    { src: '擇', dst: '択' },
    { src: '單', dst: '単' },
    { src: '斷', dst: '断' },
    { src: '癡', dst: '痴' },
    { src: '鑄', dst: '鋳' },
    { src: '敕', dst: '勅' },
    { src: '鐵', dst: '鉄' },
    { src: '傳', dst: '伝' },
    { src: '黨', dst: '党' },
    { src: '鬪', dst: '闘' },
    { src: '屆', dst: '届' },
    { src: '腦', dst: '脳' },
    { src: '廢', dst: '廃' },
    { src: '發', dst: '発' },
    { src: '蠻', dst: '蛮' },
    { src: '拂', dst: '払' },
    { src: '邊', dst: '辺' },
    { src: '瓣', dst: '弁' },
    { src: '寶', dst: '宝' },
    { src: '沒', dst: '没' },
    { src: '滿', dst: '満' },
    { src: '藥', dst: '薬' },
    { src: '餘', dst: '余' },
    { src: '樣', dst: '様' },
    { src: '亂', dst: '乱' },
    { src: '兩', dst: '両' },
    { src: '禮', dst: '礼' },
    { src: '靈', dst: '霊' },
    { src: '爐', dst: '炉' },
    { src: '灣', dst: '湾' },
    { src: '惡', dst: '悪' },
    { src: '醫', dst: '医' },
    { src: '飮', dst: '飲' },
    { src: '營', dst: '営' },
    { src: '圓', dst: '円' },
    { src: '歐', dst: '欧' },
    { src: '奧', dst: '奥' },
    { src: '價', dst: '価' },
    { src: '繪', dst: '絵' },
    { src: '擴', dst: '拡' },
    { src: '學', dst: '学' },
    { src: '罐', dst: '缶' },
    { src: '勸', dst: '勧' },
    { src: '觀', dst: '観' },
    { src: '歸', dst: '帰' },
    { src: '犧', dst: '犠' },
    { src: '擧', dst: '挙' },
    { src: '狹', dst: '狭' },
    { src: '驅', dst: '駆' },
    { src: '莖', dst: '茎' },
    { src: '經', dst: '経' },
    { src: '繼', dst: '継' },
    { src: '缺', dst: '欠' },
    { src: '劍', dst: '剣' },
    { src: '檢', dst: '検' },
    { src: '顯', dst: '顕' },
    { src: '廣', dst: '広' },
    { src: '鑛', dst: '鉱' },
    { src: '碎', dst: '砕' },
    { src: '劑', dst: '剤' },
    { src: '參', dst: '参' },
    { src: '慘', dst: '惨' },
    { src: '絲', dst: '糸' },
    { src: '辭', dst: '辞' },
    { src: '舍', dst: '舎' },
    { src: '壽', dst: '寿' },
    { src: '澁', dst: '渋' },
    { src: '肅', dst: '粛' },
    { src: '將', dst: '将' },
    { src: '證', dst: '証' },
    { src: '乘', dst: '乗' },
    { src: '疊', dst: '畳' },
    { src: '孃', dst: '嬢' },
    { src: '觸', dst: '触' },
    { src: '寢', dst: '寝' },
    { src: '圖', dst: '図' },
    { src: '穗', dst: '穂' },
    { src: '樞', dst: '枢' },
    { src: '齊', dst: '斉' },
    { src: '攝', dst: '摂' },
    { src: '戰', dst: '戦' },
    { src: '潛', dst: '潜' },
    { src: '雙', dst: '双' },
    { src: '莊', dst: '荘' },
    { src: '裝', dst: '装' },
    { src: '藏', dst: '蔵' },
    { src: '續', dst: '続' },
    { src: '體', dst: '体' },
    { src: '臺', dst: '台' },
    { src: '澤', dst: '沢' },
    { src: '膽', dst: '胆' },
    { src: '彈', dst: '弾' },
    { src: '蟲', dst: '虫' },
    { src: '廳', dst: '庁' },
    { src: '鎭', dst: '鎮' },
    { src: '點', dst: '点' },
    { src: '燈', dst: '灯' },
    { src: '盜', dst: '盗' },
    { src: '獨', dst: '独' },
    { src: '貳', dst: '弐' },
    { src: '霸', dst: '覇' },
    { src: '賣', dst: '売' },
    { src: '髮', dst: '髪' },
    { src: '祕', dst: '秘' },
    { src: '佛', dst: '仏' },
    { src: '變', dst: '変' },
    { src: '辯', dst: '弁' },
    { src: '豐', dst: '豊' },
    { src: '飜', dst: '翻' },
    { src: '默', dst: '黙' },
    { src: '與', dst: '与' },
    { src: '譽', dst: '誉' },
    { src: '謠', dst: '謡' },
    { src: '覽', dst: '覧' },
    { src: '獵', dst: '猟' },
    { src: '勵', dst: '励' },
    { src: '齡', dst: '齢' },
    { src: '勞', dst: '労' },
    { src: '壓', dst: '圧' },
    { src: '爲', dst: '為' },
    { src: '隱', dst: '隠' },
    { src: '衞', dst: '衛' },
    { src: '鹽', dst: '塩' },
    { src: '毆', dst: '殴' },
    { src: '穩', dst: '穏' },
    { src: '畫', dst: '画' },
    { src: '壞', dst: '壊' },
    { src: '殼', dst: '殻' },
    { src: '嶽', dst: '岳' },
    { src: '卷', dst: '巻' },
    { src: '關', dst: '関' },
    { src: '顏', dst: '顔' },
    { src: '僞', dst: '偽' },
    { src: '舊', dst: '旧' },
    { src: '峽', dst: '峡' },
    { src: '曉', dst: '暁' },
    { src: '勳', dst: '勲' },
    { src: '惠', dst: '恵' },
    { src: '螢', dst: '蛍' },
    { src: '鷄', dst: '鶏' },
    { src: '縣', dst: '県' },
    { src: '險', dst: '険' },
    { src: '獻', dst: '献' },
    { src: '驗', dst: '験' },
    { src: '效', dst: '効' },
    { src: '號', dst: '号' },
    { src: '濟', dst: '済' },
    { src: '册', dst: '冊' },
    { src: '棧', dst: '桟' },
    { src: '贊', dst: '賛' },
    { src: '齒', dst: '歯' },
    { src: '濕', dst: '湿' },
    { src: '寫', dst: '写' },
    { src: '收', dst: '収' },
    { src: '獸', dst: '獣' },
    { src: '處', dst: '処' },
    { src: '稱', dst: '称' },
    { src: '奬', dst: '奨' },
    { src: '淨', dst: '浄' },
    { src: '繩', dst: '縄' },
    { src: '讓', dst: '譲' },
    { src: '囑', dst: '嘱' },
    { src: '愼', dst: '慎' },
    { src: '粹', dst: '粋' },
    { src: '隨', dst: '随' },
    { src: '數', dst: '数' },
    { src: '靜', dst: '静' },
    { src: '專', dst: '専' },
    { src: '踐', dst: '践' },
    { src: '纖', dst: '繊' },
    { src: '壯', dst: '壮' },
    { src: '搜', dst: '捜' },
    { src: '總', dst: '総' },
    { src: '臟', dst: '臓' },
    { src: '墮', dst: '堕' },
    { src: '帶', dst: '帯' },
    { src: '瀧', dst: '滝' },
    { src: '擔', dst: '担' },
    { src: '團', dst: '団' },
    { src: '遲', dst: '遅' },
    { src: '晝', dst: '昼' },
    { src: '聽', dst: '聴' },
    { src: '遞', dst: '逓' },
    { src: '轉', dst: '転' },
    { src: '當', dst: '当' },
    { src: '稻', dst: '稲' },
    { src: '讀', dst: '読' },
    { src: '惱', dst: '悩' },
    { src: '拜', dst: '拝' },
    { src: '麥', dst: '麦' },
    { src: '拔', dst: '抜' },
    { src: '濱', dst: '浜' },
    { src: '竝', dst: '並' },
    { src: '辨', dst: '弁' },
    { src: '舖', dst: '舗' },
    { src: '襃', dst: '褒' },
    { src: '萬', dst: '万' },
    { src: '譯', dst: '訳' },
    { src: '豫', dst: '予' },
    { src: '搖', dst: '揺' },
    { src: '來', dst: '来' },
    { src: '龍', dst: '竜' },
    { src: '壘', dst: '塁' },
    { src: '隸', dst: '隷' },
    { src: '戀', dst: '恋' },
    { src: '樓', dst: '楼' },
    { src: '鰺', dst: '鯵' },
    { src: '鶯', dst: '鴬' },
    { src: '蠣', dst: '蛎' },
    { src: '攪', dst: '撹' },
    { src: '竈', dst: '竃' },
    { src: '灌', dst: '潅' },
    { src: '諫', dst: '諌' },
    { src: '頸', dst: '頚' },
    { src: '礦', dst: '砿' },
    { src: '蘂', dst: '蕊' },
    { src: '靱', dst: '靭' },
    { src: '賤', dst: '賎' },
    { src: '壺', dst: '壷' },
    { src: '礪', dst: '砺' },
    { src: '檮', dst: '梼' },
    { src: '濤', dst: '涛' },
    { src: '邇', dst: '迩' },
    { src: '蠅', dst: '蝿' },
    { src: '檜', dst: '桧' },
    { src: '儘', dst: '侭' },
    { src: '藪', dst: '薮' },
    { src: '籠', dst: '篭' },
    { src: '彌', dst: '弥' },
    { src: '麩', dst: '麸' },
    { src: '驒', dst: '騨' },
];

const dictionary = [
    jisDai2Dictionary,
    // Add more dictionary here
    // exmapleDictionary,
].flat();

const patternMap = dictionary.reduce((acc, dictionary) => {
    const pattern = `(${dictionary.src}|${dictionary.dst})`;
    // { 亞: '(亞|亜)', 亜: '(亞|亜)', 圍: '(圍|囲)', 囲: '(圍|囲)', ...}
    return Object.assign(Object.assign({}, acc), { [dictionary.src]: pattern, [dictionary.dst]: pattern });
}, {});
const regexp = new RegExp(Array.from(new Set(Object.values(patternMap))).join('|'), 'g');
const convert = (regexText) => regexText.replace(regexp, (match) => patternMap[match]);

const toRegexPattern = (string) => {
    let _str = string;
    // 以下なるべく文字数が多いものほど上にすること
    _str = _str
        .replace(/三栄町|四谷三栄町/g, '(三栄町|四谷三栄町)')
        .replace(/鬮野川|くじ野川|くじの川/g, '(鬮野川|くじ野川|くじの川)')
        .replace(/柿碕町|柿さき町/g, '(柿碕町|柿さき町)')
        .replace(/通り|とおり/g, '(通り|とおり)')
        .replace(/埠頭|ふ頭/g, '(埠頭|ふ頭)')
        .replace(/番町|番丁/g, '(番町|番丁)')
        .replace(/大冝|大宜/g, '(大冝|大宜)')
        .replace(/穝|さい/g, '(穝|さい)')
        .replace(/杁|えぶり/g, '(杁|えぶり)')
        .replace(/薭|稗|ひえ|ヒエ/g, '(薭|稗|ひえ|ヒエ)')
        .replace(/[之ノの]/g, '[之ノの]')
        .replace(/[ヶケが]/g, '[ヶケが]')
        .replace(/[ヵカか力]/g, '[ヵカか力]')
        .replace(/[ッツっつ]/g, '[ッツっつ]')
        .replace(/[ニ二]/g, '[ニ二]')
        .replace(/[ハ八]/g, '[ハ八]')
        .replace(/塚|塚/g, '(塚|塚)')
        .replace(/釜|竈/g, '(釜|竈)')
        .replace(/條|条/g, '(條|条)')
        .replace(/狛|拍/g, '(狛|拍)')
        .replace(/藪|薮/g, '(藪|薮)')
        .replace(/渕|淵/g, '(渕|淵)')
        .replace(/エ|ヱ|え/g, '(エ|ヱ|え)')
        .replace(/曾|曽/g, '(曾|曽)')
        .replace(/舟|船/g, '(舟|船)')
        .replace(/莵|菟/g, '(莵|菟)')
        .replace(/市|巿/g, '(市|巿)')
        .replace(/崎|﨑/g, '(崎|﨑)');
    _str = convert(_str);
    return _str;
};

const cache = new LRUCache({
    max: currentConfig.cacheSize,
});
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
function fetchFromCache(key, fetcher) {
    return __awaiter(this, undefined, undefined, function* () {
        let data = cache.get(key);
        if (typeof data !== 'undefined') {
            return data;
        }
        data = yield fetcher();
        cache.set(key, data);
        return data;
    });
}
let cachedPrefecturePatterns = undefined;
const cachedCityPatterns = new Map();
let cachedPrefectures = undefined;
const cachedTowns = {};
let cachedSameNamedPrefectureCityRegexPatterns = undefined;
const getPrefectures = () => __awaiter(undefined, undefined, undefined, function* () {
    if (typeof cachedPrefectures !== 'undefined') {
        return cachedPrefectures;
    }
    const prefsResp = yield __internals.fetch('.json', {}); // ja.json
    const data = (yield prefsResp.json());
    return cachePrefectures(data);
});
const cachePrefectures = (data) => {
    return (cachedPrefectures = data);
};
const getPrefectureRegexPatterns = (api) => {
    if (cachedPrefecturePatterns) {
        return cachedPrefecturePatterns;
    }
    const data = api.data;
    cachedPrefecturePatterns = data.map((pref) => {
        const _pref = pref.pref.replace(/(都|道|府|県)$/, ''); // `東京` の様に末尾の `都府県` が抜けた住所に対応
        const pattern = `^${_pref}(都|道|府|県)?`;
        return [pref, pattern];
    });
    return cachedPrefecturePatterns;
};
const getCityRegexPatterns = (pref) => {
    const cachedResult = cachedCityPatterns.get(pref.code);
    if (typeof cachedResult !== 'undefined') {
        return cachedResult;
    }
    const cities = pref.cities;
    // 少ない文字数の地名に対してミスマッチしないように文字の長さ順にソート
    cities.sort((a, b) => {
        return cityName(a).length - cityName(b).length;
    });
    const patterns = cities.map((city) => {
        const name = cityName(city);
        let pattern = `^${toRegexPattern(name)}`;
        if (name.match(/(町|村)$/)) {
            pattern = `^${toRegexPattern(name).replace(/(.+?)郡/, '($1郡)?')}`; // 郡が省略されてるかも
        }
        return [city, pattern];
    });
    cachedCityPatterns.set(pref.code, patterns);
    return patterns;
};
const getTowns = (prefObj, cityObj, apiVersion) => __awaiter(undefined, undefined, undefined, function* () {
    const pref = prefectureName(prefObj);
    const city = cityName(cityObj);
    const cacheKey = `${pref}-${city}`;
    const cachedTown = cachedTowns[cacheKey];
    if (typeof cachedTown !== 'undefined') {
        return cachedTown;
    }
    const townsResp = yield __internals.fetch(['', encodeURI(pref), encodeURI(city) + `.json?v=${apiVersion}`].join('/'), {});
    const towns = (yield townsResp.json());
    return (cachedTowns[cacheKey] = towns);
});
function fetchSubresource(kind, pref, city, row, apiVersion) {
    return __awaiter(this, undefined, undefined, function* () {
        const prefN = prefectureName(pref);
        const cityN = cityName(city);
        const resp = yield __internals.fetch([
            '',
            encodeURI(prefN),
            encodeURI(`${cityN}-${kind}.txt?v=${apiVersion}`),
        ].join('/'), {
            offset: row.start,
            length: row.length,
        });
        return resp.text();
    });
}
function parseSubresource(data) {
    const firstLineEnd = data.indexOf('\n');
    // const firstLine = data.slice(0, firstLineEnd)
    const rest = data.slice(firstLineEnd + 1);
    const lines = Papaparse.parse(rest, {
        header: true,
    }).data;
    const out = [];
    for (const line of lines) {
        const point = line.lng && line.lat
            ? [parseFloat(line.lng), parseFloat(line.lat)]
            : undefined;
        if ('blk_num' in line) {
            out.push({
                blk_num: line.blk_num,
                rsdt_num: line.rsdt_num,
                rsdt_num2: line.rsdt_num2,
                point: point,
            });
        }
        else if ('prc_num1' in line) {
            out.push({
                prc_num1: line.prc_num1,
                prc_num2: line.prc_num2,
                prc_num3: line.prc_num3,
                point: point,
            });
        }
    }
    return out;
}
const getRsdt = (pref, city, town, apiVersion) => __awaiter(undefined, undefined, undefined, function* () {
    var _a;
    const row = (_a = town.csv_ranges) === null || _a === undefined ? undefined : _a.住居表示;
    if (!row) {
        return [];
    }
    const parsed = yield fetchFromCache(`住居表示-${pref.code}-${city.code}-${machiAzaName(town)}`, () => __awaiter(undefined, undefined, undefined, function* () {
        const data = yield fetchSubresource('住居表示', pref, city, row, apiVersion);
        const parsed = parseSubresource(data);
        parsed.sort((a, b) => {
            const aStr = [a.blk_num, a.rsdt_num, a.rsdt_num2]
                .filter((a) => !!a)
                .join('-');
            const bStr = [b.blk_num, b.rsdt_num, b.rsdt_num2]
                .filter((a) => !!a)
                .join('-');
            return bStr.length - aStr.length;
        });
        return parsed;
    }));
    return parsed;
});
const getChiban = (pref, city, town, apiVersion) => __awaiter(undefined, undefined, undefined, function* () {
    var _a;
    const row = (_a = town.csv_ranges) === null || _a === undefined ? undefined : _a.地番;
    if (!row) {
        return [];
    }
    const parsed = yield fetchFromCache(`地番-${pref.code}-${city.code}-${machiAzaName(town)}`, () => __awaiter(undefined, undefined, undefined, function* () {
        const data = yield fetchSubresource('地番', pref, city, row, apiVersion);
        const parsed = parseSubresource(data);
        parsed.sort((a, b) => {
            const aStr = [a.prc_num1, a.prc_num2, a.prc_num3]
                .filter((a) => !!a)
                .join('-');
            const bStr = [b.prc_num1, b.prc_num2, b.prc_num3]
                .filter((a) => !!a)
                .join('-');
            return bStr.length - aStr.length;
        });
        return parsed;
    }));
    return parsed;
});
// 十六町 のように漢数字と町が連結しているか
const isKanjiNumberFollewedByCho = (targetTownName) => {
    const xCho = targetTownName.match(/.町/g);
    if (!xCho)
        return false;
    const kanjiNumbers = findKanjiNumbers(xCho[0]);
    return kanjiNumbers.length > 0;
};
const getTownRegexPatterns = (pref, city, apiVersion) => __awaiter(undefined, undefined, undefined, function* () {
    return fetchFromCache(`${pref.code}-${city.code}`, () => __awaiter(undefined, undefined, undefined, function* () {
        const api = yield getTowns(pref, city, apiVersion);
        const pre_towns = api.data;
        const townSet = new Set(pre_towns.map((town) => machiAzaName(town)));
        const towns = [];
        const isKyoto = city.city === '京都市';
        // 町丁目に「○○町」が含まれるケースへの対応
        // 通常は「○○町」のうち「町」の省略を許容し同義語として扱うが、まれに自治体内に「○○町」と「○○」が共存しているケースがある。
        // この場合は町の省略は許容せず、入力された住所は書き分けられているものとして正規化を行う。
        // 更に、「愛知県名古屋市瑞穂区十六町1丁目」漢数字を含むケースだと丁目や番地・号の正規化が不可能になる。このようなケースも除外。
        for (const town of pre_towns) {
            towns.push(town);
            const originalTown = machiAzaName(town);
            if (originalTown.indexOf('町') === -1)
                continue;
            const townAbbr = originalTown.replace(/(?!^町)町/g, ''); // NOTE: 冒頭の「町」は明らかに省略するべきではないので、除外
            if (!isKyoto && // 京都は通り名削除の処理があるため、意図しないマッチになるケースがある。これを除く
                !townSet.has(townAbbr) &&
                !townSet.has(`大字${townAbbr}`) && // 大字は省略されるため、大字〇〇と〇〇町がコンフリクトする。このケースを除外
                !isKanjiNumberFollewedByCho(originalTown)) {
                // エイリアスとして町なしのパターンを登録
                towns.push({
                    machiaza_id: town.machiaza_id,
                    point: town.point,
                    oaza_cho: townAbbr,
                    originalTown: town,
                });
            }
        }
        // 少ない文字数の地名に対してミスマッチしないように文字の長さ順にソート
        towns.sort((a, b) => {
            let aLen = machiAzaName(a).length;
            let bLen = machiAzaName(b).length;
            // 大字で始まる場合、優先度を低く設定する。
            // 大字XX と XXYY が存在するケースもあるので、 XXYY を先にマッチしたい
            if (machiAzaName(a).startsWith('大字'))
                aLen -= 2;
            if (machiAzaName(b).startsWith('大字'))
                bLen -= 2;
            return bLen - aLen;
        });
        const patterns = towns.map((town) => {
            const pattern = toRegexPattern(machiAzaName(town)
                // 横棒を含む場合（流通センター、など）に対応
                .replace(/[-－﹣−‐⁃‑‒–—﹘―⎯⏤ーｰ─━]/g, '[-－﹣−‐⁃‑‒–—﹘―⎯⏤ーｰ─━]')
                .replace(/大?字/g, '(大?字)?')
                // 以下住所マスターの町丁目に含まれる数字を正規表現に変換する
                // ABRデータには大文字の数字が含まれている（第１地割、など）ので、数字も一致するようにする
                .replace(/([壱一二三四五六七八九十]+|[１２３４５６７８９０]+)(丁目?|番(町|丁)|条|軒|線|(の|ノ)町|地割|号)/g, (match) => {
                const patterns = [];
                patterns.push(match
                    .toString()
                    .replace(/(丁目?|番(町|丁)|条|軒|線|(の|ノ)町|地割|号)/, '')); // 漢数字
                if (match.match(/^壱/)) {
                    patterns.push('一');
                    patterns.push('1');
                    patterns.push('１');
                }
                else {
                    const num = match
                        .replace(/([一二三四五六七八九十]+)/g, (match) => {
                        return kan2num(match);
                    })
                        .replace(/([１２３４５６７８９０]+)/g, (match) => {
                        return kanji2number(match).toString();
                    })
                        .replace(/(丁目?|番(町|丁)|条|軒|線|(の|ノ)町|地割|号)/, '');
                    patterns.push(num.toString()); // 半角アラビア数字
                }
                // 以下の正規表現は、上のよく似た正規表現とは違うことに注意！
                const _pattern = `(${patterns.join('|')})((丁|町)目?|番(町|丁)|条|軒|線|の町?|地割|号|[-－﹣−‐⁃‑‒–—﹘―⎯⏤ーｰ─━])`;
                // if (city === '下閉伊郡普代村' && town.machiaza_id === '0022000') {
                //   console.log(_pattern)
                // }
                return _pattern; // デバッグのときにめんどくさいので変数に入れる。
            }));
            return ['originalTown' in town ? town.originalTown : town, pattern];
        });
        // X丁目の丁目なしの数字だけ許容するため、最後に数字だけ追加していく
        for (const town of towns) {
            const chomeMatch = machiAzaName(town).match(/([^一二三四五六七八九十]+)([一二三四五六七八九十]+)(丁目?)/);
            if (!chomeMatch) {
                continue;
            }
            const chomeNamePart = chomeMatch[1];
            const chomeNum = chomeMatch[2];
            const pattern = toRegexPattern(`^${chomeNamePart}(${chomeNum}|${kan2num(chomeNum)})`);
            patterns.push([town, pattern]);
        }
        return patterns;
    }));
});
const getSameNamedPrefectureCityRegexPatterns = (prefApi) => {
    if (typeof cachedSameNamedPrefectureCityRegexPatterns !== 'undefined') {
        return cachedSameNamedPrefectureCityRegexPatterns;
    }
    const prefList = prefApi.data;
    const _prefs = prefList.map((pref) => {
        return pref.pref.replace(/[都|道|府|県]$/, '');
    });
    cachedSameNamedPrefectureCityRegexPatterns = [];
    for (const pref of prefList) {
        for (const city of pref.cities) {
            const cityN = cityName(city);
            // 「福島県石川郡石川町」のように、市の名前が別の都道府県名から始まっているケースも考慮する。
            for (let j = 0; j < _prefs.length; j++) {
                if (cityN.indexOf(_prefs[j]) === 0) {
                    cachedSameNamedPrefectureCityRegexPatterns.push([
                        `${pref.pref}${cityN}`,
                        `^${cityN}`,
                    ]);
                }
            }
        }
    }
    return cachedSameNamedPrefectureCityRegexPatterns;
};

/**
 * 入力された住所に対して以下の正規化を予め行う。
 *
 * 1. `1-2-3` や `四-五-六` のようなフォーマットのハイフンを半角に統一。
 * 2. 町丁目以前にあるスペースをすべて削除。
 * 3. 最初に出てくる `1-` や `五-` のような文字列を町丁目とみなして、それ以前のスペースをすべて削除する。
 */
function prenormalize(input) {
    return (input
        .normalize('NFC')
        .replace(/　/g, ' ')
        .replace(/ +/g, ' ')
        .replace(/([０-９Ａ-Ｚａ-ｚ]+)/g, (match) => {
        // 全角のアラビア数字は問答無用で半角にする
        return zen2han(match);
    })
        // 数字の後または数字の前にくる横棒はハイフンに統一する
        .replace(/([0-9０-９一二三四五六七八九〇十百千][-－﹣−‐⁃‑‒–—﹘―⎯⏤ーｰ─━])|([-－﹣−‐⁃‑‒–—﹘―⎯⏤ーｰ─━])[0-9０-９一二三四五六七八九〇十]/g, (match) => {
        return match.replace(/[-－﹣−‐⁃‑‒–—﹘―⎯⏤ーｰ─━]/g, '-');
    })
        .replace(/(.+)(丁目?|番(町|地|丁)|条|軒|線|(の|ノ)町|地割)/, (match) => {
        return match.replace(/ /g, ''); // 町丁目名以前のスペースはすべて削除
    })
        .replace(/(.+)((郡.+(町|村))|((市|巿).+(区|區)))/, (match) => {
        return match.replace(/ /g, ''); // 区、郡以前のスペースはすべて削除
    })
        .replace(/.+?[0-9一二三四五六七八九〇十百千]-/, (match) => {
        return match.replace(/ /g, ''); // 1番はじめに出てくるアラビア数字以前のスペースを削除
    }));
}

function prefectureToResultPoint(pref) {
    return {
        lat: pref.point[1],
        lng: pref.point[0],
        level: 1,
    };
}
function cityToResultPoint(city) {
    return {
        lat: city.point[1],
        lng: city.point[0],
        level: 2,
    };
}
function machiAzaToResultPoint(machiAza) {
    if (!machiAza.point)
        return undefined;
    return {
        lat: machiAza.point[1],
        lng: machiAza.point[0],
        level: 3,
    };
}
function rsdtOrChibanToResultPoint(input) {
    if (!input.point)
        return undefined;
    return {
        lat: input.point[1],
        lng: input.point[0],
        level: 8,
    };
}
function upgradePoint(a, b) {
    if (!a)
        return b;
    if (!b)
        return a;
    if (a.level > b.level)
        return a;
    return b;
}

function removeCitiesFromPrefecture(pref) {
    if (!pref) {
        return undefined;
    }
    const newPref = Object.assign({}, pref);
    delete newPref.cities;
    return newPref;
}
function removeExtraFromMachiAza(machiAza) {
    if (!machiAza) {
        return undefined;
    }
    const newMachiAza = Object.assign({}, machiAza);
    delete newMachiAza.csv_ranges;
    return newMachiAza;
}

const version$1 = '3.1.3';
const config$1 = currentConfig;
const defaultOption = {
    level: 8,
};
const normalizeTownName = (input, pref, city, apiVersion) => __awaiter(undefined, undefined, undefined, function* () {
    input = input.trim().replace(/^大字/, '');
    const townPatterns = yield getTownRegexPatterns(pref, city, apiVersion);
    const regexPrefixes = ['^'];
    if (city.city === '京都市') {
        // 京都は通り名削除のために後方一致を使う
        regexPrefixes.push('.*');
    }
    for (const regexPrefix of regexPrefixes) {
        for (const [town, pattern] of townPatterns) {
            const regex = new RegExp(`${regexPrefix}${pattern}`);
            const match = input.match(regex);
            if (match) {
                return {
                    town,
                    other: input.substring(match[0].length),
                };
            }
        }
    }
});
function normalizeAddrPart(addr, pref, city, town, apiVersion) {
    return __awaiter(this, undefined, undefined, function* () {
        const match = addr.match(/^([1-9][0-9]*)(?:-([1-9][0-9]*))?(?:-([1-9][0-9]*))?/);
        if (!match) {
            return {
                rest: addr,
            };
        }
        // TODO: rsdtの場合はrsdtと地番を両方取得する
        if (town.rsdt) {
            const res = yield getRsdt(pref, city, town, apiVersion);
            for (const rsdt of res) {
                const addrPart = rsdtToString(rsdt);
                if (match[0] === addrPart) {
                    return {
                        rsdt,
                        rest: addr.substring(addrPart.length),
                    };
                }
            }
        }
        else {
            const res = yield getChiban(pref, city, town, apiVersion);
            for (const chiban of res) {
                const addrPart = chibanToString(chiban);
                if (match[0] === addrPart) {
                    return {
                        chiban,
                        rest: addr.substring(addrPart.length),
                    };
                }
            }
        }
        return {
            rest: addr,
        };
    });
}
const normalize$1 = (address_1, ...args_1) => __awaiter(undefined, [address_1, ...args_1], undefined, function* (address, _option = defaultOption) {
    var _a;
    const option = Object.assign(Object.assign({}, defaultOption), _option);
    (_a = option.geoloniaApiKey) !== null && _a !== undefined ? _a : (option.geoloniaApiKey = config$1.geoloniaApiKey);
    // other に入っている文字列は正規化するときに
    let other = prenormalize(address);
    let pref;
    let city;
    let town;
    let point;
    let addr;
    let level = 0;
    // 都道府県名の正規化
    const prefectures = yield getPrefectures();
    const apiVersion = prefectures.meta.updated;
    const prefPatterns = getPrefectureRegexPatterns(prefectures);
    const sameNamedPrefectureCityRegexPatterns = getSameNamedPrefectureCityRegexPatterns(prefectures);
    // 県名が省略されており、かつ市の名前がどこかの都道府県名と同じ場合(例.千葉県千葉市)、
    // あらかじめ県名を補完しておく。
    for (const [prefectureCity, reg] of sameNamedPrefectureCityRegexPatterns) {
        const match = other.match(reg);
        if (match) {
            other = other.replace(new RegExp(reg), prefectureCity);
            break;
        }
    }
    for (const [_pref, pattern] of prefPatterns) {
        const match = other.match(pattern);
        if (match) {
            pref = _pref;
            other = other.substring(match[0].length); // 都道府県名以降の住所
            point = prefectureToResultPoint(pref);
            break;
        }
    }
    if (!pref) {
        // 都道府県名が省略されている
        const matched = [];
        for (const _pref of prefectures.data) {
            const cityPatterns = getCityRegexPatterns(_pref);
            other = other.trim();
            for (const [_city, pattern] of cityPatterns) {
                const match = other.match(pattern);
                if (match) {
                    matched.push({
                        pref: _pref,
                        city: _city,
                        other: other.substring(match[0].length),
                    });
                }
            }
        }
        // マッチする都道府県が複数ある場合は町名まで正規化して都道府県名を判別する。（例: 東京都府中市と広島県府中市など）
        if (1 === matched.length) {
            pref = matched[0].pref;
        }
        else {
            for (const m of matched) {
                const normalized = yield normalizeTownName(m.other, m.pref, m.city, apiVersion);
                if (normalized) {
                    pref = m.pref;
                    city = m.city;
                    town = normalized.town;
                    other = normalized.other;
                    point = upgradePoint(point, machiAzaToResultPoint(town));
                }
            }
        }
    }
    if (pref && option.level >= 2) {
        const cityPatterns = getCityRegexPatterns(pref);
        other = other.trim();
        for (const [_city, pattern] of cityPatterns) {
            const match = other.match(pattern);
            if (match) {
                city = _city;
                point = upgradePoint(point, cityToResultPoint(city));
                other = other.substring(match[0].length); // 市区町村名以降の住所
                break;
            }
        }
    }
    // 町丁目以降の正規化
    if (pref && city && option.level >= 3) {
        const normalized = yield normalizeTownName(other, pref, city, apiVersion);
        if (normalized) {
            town = normalized.town;
            other = normalized.other;
            point = upgradePoint(point, machiAzaToResultPoint(town));
        }
        // townが取得できた場合にのみ、addrに対する各種の変換処理を行う。
        if (town) {
            other = other
                .replace(/^-/, '')
                .replace(/([0-9]+)(丁目)/g, (match) => {
                return match.replace(/([0-9]+)/g, (num) => {
                    return number2kanji(Number(num));
                });
            })
                .replace(/(([0-9]+|[〇一二三四五六七八九十百千零壱弐参肆伍陸漆捌玖拾]+)(番地?)([0-9]+|[〇一二三四五六七八九十百千零壱弐参肆伍陸漆捌玖拾]+)号)\s*(.+)/, '$1 $5')
                .replace(/([0-9]+|[〇一二三四五六七八九十百千零壱弐参肆伍陸漆捌玖拾]+)\s*(番地?)\s*([0-9]+|[〇一二三四五六七八九十百千零壱弐参肆伍陸漆捌玖拾]+)\s*号?/, '$1-$3')
                .replace(/([0-9]+|[〇一二三四五六七八九十百千零壱弐参肆伍陸漆捌玖拾]+)番(地|$)/, '$1')
                .replace(/([0-9]+|[〇一二三四五六七八九十百千零壱弐参肆伍陸漆捌玖拾]+)の/g, '$1-')
                .replace(/([0-9]+|[〇一二三四五六七八九十百千零壱弐参肆伍陸漆捌玖拾]+)[-－﹣−‐⁃‑‒–—﹘―⎯⏤ーｰ─━]/g, (match) => {
                return kan2num(match).replace(/[-－﹣−‐⁃‑‒–—﹘―⎯⏤ーｰ─━]/g, '-');
            })
                .replace(/[-－﹣−‐⁃‑‒–—﹘―⎯⏤ーｰ─━]([0-9]+|[〇一二三四五六七八九十百千零壱弐参肆伍陸漆捌玖拾]+)/g, (match) => {
                return kan2num(match).replace(/[-－﹣−‐⁃‑‒–—﹘―⎯⏤ーｰ─━]/g, '-');
            })
                .replace(/([0-9]+|[〇一二三四五六七八九十百千零壱弐参肆伍陸漆捌玖拾]+)-/, (s) => {
                // `1-` のようなケース
                return kan2num(s);
            })
                .replace(/-([0-9]+|[〇一二三四五六七八九十百千零壱弐参肆伍陸漆捌玖拾]+)/, (s) => {
                // `-1` のようなケース
                return kan2num(s);
            })
                .replace(/-[^0-9]([0-9]+|[〇一二三四五六七八九十百千零壱弐参肆伍陸漆捌玖拾]+)/, (s) => {
                // `-あ1` のようなケース
                return kan2num(zen2han(s));
            })
                .replace(/([0-9]+|[〇一二三四五六七八九十百千零壱弐参肆伍陸漆捌玖拾]+)$/, (s) => {
                // `串本町串本１２３４` のようなケース
                return kan2num(s);
            })
                .trim();
        }
    }
    other = patchAddr(pref ? prefectureName(pref) : '', city ? cityName(city) : '', town ? machiAzaName(town) : '', other);
    if (pref)
        level = level + 1;
    if (city)
        level = level + 1;
    if (town)
        level = level + 1;
    if (option.level <= 3 || level < 3) {
        const result = {
            pref: pref ? prefectureName(pref) : undefined,
            city: city ? cityName(city) : undefined,
            town: town ? machiAzaName(town) : undefined,
            other: other,
            level,
            point,
            metadata: {
                input: address,
                prefecture: removeCitiesFromPrefecture(pref),
                city: city,
                machiAza: removeExtraFromMachiAza(town),
            },
        };
        return result;
    }
    const normalizedAddrPart = yield normalizeAddrPart(other, pref, city, town, apiVersion);
    // TODO: rsdtと地番を両方対応した時に両方返すけど、今はrsdtを優先する
    if (normalizedAddrPart.rsdt) {
        addr = rsdtToString(normalizedAddrPart.rsdt);
        other = normalizedAddrPart.rest;
        point = upgradePoint(point, rsdtOrChibanToResultPoint(normalizedAddrPart.rsdt));
        level = 8;
    }
    else if (normalizedAddrPart.chiban) {
        addr = chibanToString(normalizedAddrPart.chiban);
        other = normalizedAddrPart.rest;
        point = upgradePoint(point, rsdtOrChibanToResultPoint(normalizedAddrPart.chiban));
        level = 8;
    }
    const result = {
        pref: pref ? prefectureName(pref) : undefined,
        city: city ? cityName(city) : undefined,
        town: town ? machiAzaName(town) : undefined,
        addr,
        level,
        point,
        other,
        metadata: {
            input: address,
            prefecture: removeCitiesFromPrefecture(pref),
            city: city,
            machiAza: removeExtraFromMachiAza(town),
            rsdt: normalizedAddrPart.rsdt,
            chiban: normalizedAddrPart.chiban,
        },
    };
    return result;
});

const requestHandlers = {
    file: (fileURL, options) => __awaiter(undefined, undefined, undefined, function* () {
        const o = options || {};
        const filePath = process.platform === 'win32'
            ? decodeURI(fileURL.pathname).substring(1)
            : decodeURI(fileURL.pathname);
        const f = yield promises.open(filePath, 'r');
        let contents, ok;
        if (typeof o.length !== 'undefined' && typeof o.offset !== 'undefined') {
            contents = Buffer.alloc(o.length);
            const resp = yield f.read(contents, 0, o.length, o.offset);
            ok = resp.bytesRead === o.length;
        }
        else {
            contents = yield f.readFile();
            ok = true;
        }
        yield f.close();
        return {
            json: () => __awaiter(undefined, undefined, undefined, function* () {
                return JSON.parse(contents.toString('utf-8'));
            }),
            text: () => __awaiter(undefined, undefined, undefined, function* () {
                return contents.toString('utf-8');
            }),
            ok,
        };
    }),
    http: (fileURL, options) => {
        const o = options || {};
        if (config$1.geoloniaApiKey) {
            fileURL.search = `?geolonia-api-key=${config$1.geoloniaApiKey}`;
        }
        const headers = {
            'User-Agent': 'normalize-japanese-addresses/0.1 (+https://github.com/geolonia/normalize-japanese-addresses/)',
        };
        if (typeof o.length !== 'undefined' && typeof o.offset !== 'undefined') {
            headers['Range'] = `bytes=${o.offset}-${o.offset + o.length - 1}`;
        }
        return fetch$1(fileURL.toString(), {
            headers,
        });
    },
};
/**
 * 正規化のためのデータを取得する
 * @param input - Path part like '東京都/文京区.json'
 * @param requestOptions - input を構造化したデータ
 */
const fetchOrReadFile = (input, options) => __awaiter(undefined, undefined, undefined, function* () {
    const fileURL = new URL(`${config$1.japaneseAddressesApi}${input}`);
    if (fileURL.protocol === 'http:' || fileURL.protocol === 'https:') {
        return requestHandlers.http(fileURL, options);
    }
    else if (fileURL.protocol === 'file:') {
        return requestHandlers.file(fileURL, options);
    }
    else {
        throw new Error(`Unknown URL schema: ${fileURL.protocol}`);
    }
});
__internals.fetch = fetchOrReadFile;
const version = version$1;
const config = config$1;
const normalize = normalize$1;

export { config, normalize, requestHandlers, version };
//# sourceMappingURL=main-node-esm.mjs.map
