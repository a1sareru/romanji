// Romaji to Hiragana conversion mapping table
export const ROMAJI_MAP: Record<string, string> = {
  // 元音
  "a": "あ", "i": "い", "u": "う", "e": "え", "o": "お",
  
  // か行
  "ka": "か", "ki": "き", "ku": "く", "ke": "け", "ko": "こ",
  // さ行
  "sa": "さ", "si": "し", "su": "す", "se": "些", "so": "そ", // si 映射为 し
  "shi": "し",
  // た行
  "ta": "た", "ti": "ち", "tu": "つ", "te": "て", "to": "と", // ti -> ち, tu -> つ
  "chi": "ち", "tsu": "つ",
  // な行
  "na": "な", "ni": "に", "nu": "ぬ", "ne": "ね", "no": "の",
  // は行
  "ha": "は", "hi": "ひ", "fu": "ふ", "he": "へ", "ho": "ほ",
  "hu": "ふ",
  // ま行
  "ma": "ま", "mi": "み", "mu": "む", "me": "め", "mo": "も",
  // や行
  "ya": "や", "yu": "ゆ", "yo": "よ",
  // ら行
  "ra": "ら", "ri": "り", "ru": "る", "re": "れ", "ro": "ろ",
  // わ行
  "wa": "わ", "wo": "を",
  
  // 浊音 (が、ざ、だ、ば 行)
  "ga": "が", "gi": "ぎ", "gu": "ぐ", "ge": "げ", "go": "ご",
  "za": "ざ", "zi": "じ", "zu": "ず", "ze": "ぜ", "zo": "ぞ", "ji": "じ",
  "da": "だ", "di": "ぢ", "du": "づ", "de": "で", "do": "ど",
  "ba": "ば", "bi": "び", "bu": "ぶ", "be": "べ", "bo": "ぼ",
  // 半浊音 (ぱ 行)
  "pa": "ぱ", "pi": "ぴ", "pu": "ぷ", "pe": "ぺ", "po": "ぽ",

  // 拗音
  "kya": "きゃ", "kyu": "きゅ", "kyo": "きょ",
  "gya": "ぎゃ", "gyu": "ぎゅ", "gyo": "ぎょ",
  "sya": "しゃ", "syu": "しゅ", "syo": "しょ",
  "sha": "しゃ", "shu": "しゅ", "sho": "しょ", "she": "しぇ",
  "zya": "じゃ", "zyu": "じゅ", "zyo": "じょ",
  "ja": "じゃ", "ju": "じゅ", "jo": "じょ", "je": "じぇ",
  "jya": "じゃ", "jyu": "じゅ", "jyo": "じょ", "jye": "じぇ",
  "tya": "ちゃ", "tyu": "ちゅ", "tyo": "ちょ",
  "cha": "ちゃ", "chu": "ちゅ", "cho": "ちょ", "che": "ちぇ",
  "dya": "ぢゃ", "dyu": "ぢゅ", "dyo": "ぢょ",
  "nya": "にゃ", "nyu": "にゅ", "nyo": "にょ",
  "hya": "ひゃ", "hyu": "ひゅ", "hyo": "ひょ",
  "bya": "びゃ", "byu": "びゅ", "byo": "びょ",
  "pya": "ぴゃ", "pyu": "pyu", "pyo": "ぴょ", // pyu -> ぴゅ
  "mya": "みゃ", "myu": "みゅ", "myo": "みょ",
  "rya": "りゃ", "ryu": "りゅ", "ryo": "りょ",

  // 补正/小字符
  "la": "ぁ", "li": "ぃ", "lu": "ぅ", "le": "ぇ", "lo": "ぉ",
  "xa": "ぁ", "xi": "ぃ", "xu": "ぅ", "xe": "ぇ", "xo": "ぉ",
  "lya": "ゃ", "lyu": "ゅ", "lyo": "ょ",
  "xya": "ゃ", "xyu": "ゅ", "xyo": "ょ",
  "ltu": "っ", "xtu": "っ", "ltsu": "っ", "xtsu": "っ",
  "lwa": "ゎ", "xwa": "ゎ",

  // 拨音/促音/符号
  "nn": "ん",
  "-": "ー",
  ",": "、",
  ".": "。",
  "?": "？",
  "!": "！"
};

// Double-check some mappings:
ROMAJI_MAP["se"] = "せ"; // Fix typo in mapping
ROMAJI_MAP["pyu"] = "ぴゅ";

/**
 * 将罗马字输入缓存转换为假名，支持拼写过程中的部分转换。
 * 返回包含已转换出来的假名，以及无法转换、需继续保留在缓冲区的拼音片段。
 */
export function convertRomaji(buffer: string): { kana: string; remainder: string } {
  let kana = "";
  let temp = buffer.toLowerCase();

  while (temp.length > 0) {
    let matched = false;

    // 优先尝试最长匹配 (最大长度是 4, 比如 ltsu)
    for (let len = Math.min(4, temp.length); len > 0; len--) {
      const slice = temp.substring(0, len);
      if (ROMAJI_MAP[slice] !== undefined) {
        kana += ROMAJI_MAP[slice];
        temp = temp.substring(len);
        matched = true;
        break;
      }
    }

    if (!matched) {
      // 如果没有直接匹配，检查是否是促音双写辅音 (例如 kk -> っk)
      // 条件：至少有2个字符，首两个字符相同，且是英文字母，且不是 'n'
      if (temp.length >= 2 && temp[0] === temp[1] && temp[0] >= "a" && temp[0] <= "z" && temp[0] !== "n") {
        kana += "っ";
        temp = temp.substring(1); // 消费掉第一个辅音，留下第二个
        continue;
      }

      // 如果没有匹配上，对于单个 'n'，需要根据后面的字符来决定是否立即转换成 'ん'
      // 如果 'n' 后面跟着非元音、非 'y' 的字母，则 'n' 可以直接转为 'ん'
      if (temp[0] === "n" && temp.length >= 2) {
        const nextChar = temp[1];
        const isVowelOrY = ["a", "i", "u", "e", "o", "y"].includes(nextChar);
        if (!isVowelOrY) {
          kana += "ん";
          temp = temp.substring(1); // 消费掉 'n'
          continue;
        }
      }

      // 其他无法匹配的，跳出循环，把剩余部分当作 remainder
      break;
    }
  }

  return { kana, remainder: temp };
}
