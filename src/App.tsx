import React, { useState, useEffect, useRef } from "react";
import { 
  Play, 
  RotateCcw, 
  Sun, 
  Moon, 
  Trophy,
  Volume2,
  VolumeOff,
  Settings
} from "lucide-react";
// convertRomaji is not imported since PC mode is removed.
import { playClickSound, playErrorSound, playSuccessSound } from "./utils/audio";

// 游戏状态模式
type GameMode = "SELECTION" | "PRACTICE" | "SUMMARY";

// 词汇项结构
interface WordItem {
  j: string;
  n: string;
  m: string;
  libraryId?: string;
  wordIndex?: number;
}

// 词库配置元数据
interface LibraryMeta {
  id: string;
  name: string;
  description: string;
  path: string;
}

// 本地存储历史最佳纪录
interface LibraryProgress {
  completedCount: number;
  bestKPM: number;
  bestEfficiency: number;
  lastCompletedTime: number;
}

// 12键虚拟键盘定义
interface KeyboardKey {
  id: string;
  label: string;
  subLabel?: string;
  gridArea: string;
  type: "flick" | "functional" | "modifier" | "action";
  keyNum?: number;
  center?: string;
  left?: string;
  up?: string;
  right?: string;
  down?: string;
}
const KEYBOARD_KEYS: KeyboardKey[] = [
  // Column 1 (Left Decorative Column - Dead Keys)
  { id: "switch_count", label: "☆123", subLabel: "", gridArea: "1 / 1", type: "action" },
  { id: "switch_time", label: "ABC", subLabel: "", gridArea: "2 / 1", type: "action" },
  { id: "back_to_menu", label: "あいう", subLabel: "", gridArea: "3 / 1", type: "action" },
  { id: "toggle_mute", label: "☺︎", subLabel: "", gridArea: "4 / 1", type: "action" },

  // Column 2
  { id: "key_a", label: "あ", gridArea: "1 / 2", type: "flick", keyNum: 1, center: "あ", left: "い", up: "う", right: "え", down: "お" },
  { id: "key_ta", label: "た", gridArea: "2 / 2", type: "flick", keyNum: 4, center: "た", left: "ち", up: "つ", right: "て", down: "と" },
  { id: "key_ma", label: "ま", gridArea: "3 / 2", type: "flick", keyNum: 7, center: "ま", left: "み", up: "む", right: "め", down: "も" },
  { id: "key_mod", label: "゛゜小", subLabel: "", gridArea: "4 / 2", type: "modifier", keyNum: 10 },

  // Column 3
  { id: "key_ka", label: "か", gridArea: "1 / 3", type: "flick", keyNum: 2, center: "か", left: "き", up: "く", right: "け", down: "こ" },
  { id: "key_na", label: "な", gridArea: "2 / 3", type: "flick", keyNum: 5, center: "な", left: "に", up: "ぬ", right: "ね", down: "の" },
  { id: "key_ya", label: "や", gridArea: "3 / 3", type: "flick", keyNum: 8, center: "や", left: "（", up: "ゆ", right: "）", down: "よ" },
  { id: "key_wa", label: "わ", gridArea: "4 / 3", type: "flick", keyNum: 11, center: "わ", left: "を", up: "ん", right: "ー" },

  // Column 4
  { id: "key_sa", label: "さ", gridArea: "1 / 4", type: "flick", keyNum: 3, center: "さ", left: "し", up: "す", right: "せ", down: "そ" },
  { id: "key_ha", label: "は", gridArea: "2 / 4", type: "flick", keyNum: 6, center: "は", left: "ひ", up: "ふ", right: "へ", down: "ほ" },
  { id: "key_ra", label: "ら", gridArea: "3 / 4", type: "flick", keyNum: 9, center: "ら", left: "り", up: "る", right: "れ", down: "ろ" },
  { id: "key_punc", label: "、。?!", gridArea: "4 / 4", type: "flick", keyNum: 13, center: "、", left: "。", up: "？", right: "！" },

  // Column 5 (Right Functional Column)
  { id: "key_backspace", label: "⌫", subLabel: "削除", gridArea: "1 / 5", type: "functional", keyNum: 12 },
  { id: "key_space", label: "空白", subLabel: "", gridArea: "2 / 5", type: "functional", keyNum: 14 },
  { id: "key_enter", label: "確定", subLabel: "スキップ", gridArea: "3 / 5 / 5 / 6", type: "action" }
];



// 浊音/半浊音/小字循环映射表
const MODIFIER_CYCLE: Record<string, string[]> = {
  "あ": ["あ", "ぁ"], "ぁ": ["あ", "ぁ"],
  "い": ["い", "ぃ"], "ぃ": ["い", "ぃ"],
  "う": ["う", "ぅ", "ゔ"], "ぅ": ["う", "ぅ", "ゔ"], "ゔ": ["う", "ぅ", "ゔ"],
  "え": ["え", "ぇ"], "ぇ": ["え", "ぇ"],
  "お": ["お", "ぉ"], "ぉ": ["お", "ぉ"],
  
  "か": ["か", "が"], "が": ["か", "が"],
  "き": ["き", "ぎ"], "ぎ": ["き", "ぎ"],
  "く": ["く", "ぐ"], "ぐ": ["く", "ぐ"],
  "け": ["け", "げ"], "げ": ["け", "げ"],
  "こ": ["こ", "ご"], "ご": ["こ", "ご"],
  
  "さ": ["さ", "ざ"], "ざ": ["さ", "ざ"],
  "し": ["し", "じ"], "じ": ["し", "じ"],
  "す": ["す", "ず"], "ず": ["す", "ず"],
  "せ": ["せ", "ぜ"], "ぜ": ["せ", "ぜ"],
  "そ": ["そ", "ぞ"], "ぞ": ["そ", "ぞ"],
  
  "た": ["た", "だ"], "だ": ["た", "だ"],
  "ち": ["ち", "ぢ"], "ぢ": ["ち", "ぢ"],
  "つ": ["つ", "っ", "づ"], "っ": ["つ", "っ", "づ"], "づ": ["つ", "っ", "づ"],
  "て": ["て", "で"], "で": ["て", "で"],
  "と": ["と", "ど"], "ど": ["と", "ど"],
  
  "は": ["は", "ば", "ぱ"], "ば": ["は", "ば", "ぱ"], "ぱ": ["は", "ば", "ぱ"],
  "ひ": ["ひ", "び", "ぴ"], "び": ["ひ", "び", "ぴ"], "ぴ": ["ひ", "び", "ぴ"],
  "ふ": ["ふ", "ぶ", "ぷ"], "ぶ": ["ふ", "ぶ", "ぷ"], "ぷ": ["ふ", "ぶ", "ぷ"],
  "へ": ["へ", "べ", "ぺ"], "べ": ["へ", "べ", "ぺ"], "ぺ": ["へ", "べ", "ぺ"],
  "ほ": ["ほ", "ぼ", "ぽ"], "ぼ": ["ほ", "ぼ", "ぽ"], "ぽ": ["ほ", "ぼ", "ぽ"],
  
  "や": ["や", "ゃ"], "ゃ": ["や", "ゃ"],
  "ゆ": ["ゆ", "ゅ"], "ゅ": ["ゆ", "ゅ"],
  "よ": ["よ", "ょ"], "ょ": ["よ", "ょ"],
  
  "わ": ["わ", "ゎ"], "ゎ": ["わ", "ゎ"]
};

// 获取假名所属的行，用于分析生疏按键行
function getKanaRow(char: string): string {
  if (!char) return "その他";
  if ("あいうえおぁぃぅぇぉゔ".includes(char)) return "あ行";
  if ("かきくけこがぎぐげご".includes(char)) return "か行";
  if ("さしすせそざじずぜぞ".includes(char)) return "さ行";
  if ("たちつてとだぢづでどっ".includes(char)) return "た行";
  if ("なにぬねの".includes(char)) return "な行";
  if ("はひふへほばびぶべぼぱぴぷぺぽ".includes(char)) return "は行";
  if ("まみむめも".includes(char)) return "ま行";
  if ("やゆよゃゅょ".includes(char)) return "や行";
  if ("らりるれろ".includes(char)) return "ら行";
  if ("わをんーゎ".includes(char)) return "わ行";
  return "その他";
}

// 数组随机乱序函数
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 去除假名中无需输入的特殊字符（～、括号注释、空格、分号等），并将片假名转为平假名
function stripSpecialChars(str: string): string {
  const cleaned = str.replace(/[～〜・\-]/g, "").replace(/\s*[\(（].*?[\)）]/g, "").replace(/;\s*/g, "").replace(/\s+/g, "");
  // カタカナ (U+30A1-U+30F6) → ひらがな (U+3041-U+3096)
  return cleaned.replace(/[\u30A1-\u30F6]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60));
}

// 检查过滤后的读音是否全为可输入字符（平假名+长音符+键盘可输入标点）
function isTypeable(str: string): boolean {
  const cleaned = stripSpecialChars(str);
  if (cleaned.length === 0) return false;
  return /^[\u3041-\u3096\u30FC、。？！]+$/.test(cleaned);
}

export default function App() {
  // --- UI/主题状态 ---
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [screen, setScreen] = useState<GameMode>("SELECTION");
  const [showMorePanel, setShowMorePanel] = useState<boolean>(false);
  
  // --- 词库元数据与加载状态 ---
  const [manifest, setManifest] = useState<LibraryMeta[]>([]);
  const [selectedLibraryIds, setSelectedLibraryIds] = useState<string[]>([]);
  const [completedStats, setCompletedStats] = useState<Record<string, LibraryProgress>>({});
  const [manifestLoading, setManifestLoading] = useState<boolean>(true);
  const [manifestError, setManifestError] = useState<string | null>(null);
  
  // --- 单词书进度与最高分状态 ---
  const [libraryProgress, setLibraryProgress] = useState<Record<string, number[]>>({});
  const [libraryTotalCounts, setLibraryTotalCounts] = useState<Record<string, number>>({});
  const [globalPB, setGlobalPB] = useState<number>(0);

  // 祝贺弹窗相关状态
  const [showCongratulation, setShowCongratulation] = useState<boolean>(false);
  const [congratulationLibName, setCongratulationLibName] = useState<string>("");
  const [congratulationLibId, setCongratulationLibId] = useState<string>("");
  
  // --- 用户配置设置 ---
  const [inputMode] = useState<"flick" | "romaji">("flick");
  const [wordCountOption, setWordCountOptionState] = useState<number>(10); // 10, 20, 50, 0 (无限)
  const setWordCountOption = (val: number) => {
    setWordCountOptionState(val);
    saveSettings({ wordCountOption: val });
  };
  const timeLimitOption = 0;
  const [audioEnabled, setAudioEnabled] = useState<boolean>(false);
  const [showProgress, setShowProgress] = useState<boolean>(true);
  const [showMeaning, setShowMeaning] = useState<boolean>(true);
  const [showTypingGuide, setShowTypingGuide] = useState<boolean>(true);
  const [morePanelTab, setMorePanelTab] = useState<"stat" | "settings" | "about">("stat");
  const [showStopConfirm, setShowStopConfirm] = useState<boolean>(false);
  
  // --- 游戏进行中状态 ---
  const [wordsList, setWordsList] = useState<WordItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [userInput, setUserInput] = useState<string>("");
  const [shakeWord, setShakeWord] = useState<boolean>(false);
  const [isGameRunning, setIsGameRunning] = useState<boolean>(false);
  
  // --- 结算结果缓存（确保 SUMMARY 展示值与 PB 保存值一致）---
  const [resultKPM, setResultKPM] = useState<number>(0);

  // --- 时间与计时器 ---
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState<number>(0); // 秒
  const timerRef = useRef<any>(null);
  
  // --- 效率与按键统计 ---
  const [totalKeysPressed, setTotalKeysPressed] = useState<number>(0);
  const [backspaceCount, setBackspaceCount] = useState<number>(0);
  const [correctKanaCount, setCorrectKanaCount] = useState<number>(0);
  const [mistakeCount, setMistakeCount] = useState<number>(0);
  const [errorsPerRow, setErrorsPerRow] = useState<Record<string, number>>({});
  
  // 记录开始时间戳以防定时器漂移
  const startTimeStampRef = useRef<number | null>(null);
  // 暂停时累計已暂停的毫秒数，以便恢复后正确计算经过时间
  const pausedDurationRef = useRef<number>(0);
  const pauseStartRef = useRef<number | null>(null);

  // 本次练习中已通过的单词（仅在 endGameSession 时提交到进度）
  const sessionCompletedWordsRef = useRef<WordItem[]>([]);

  // --- Flick 触控手势状态 ---
  const [activeFlickKey, setActiveFlickKey] = useState<number | null>(null);
  const [touchStartPos, setTouchStartPos] = useState<{ x: number; y: number } | null>(null);
  const [flickDirection, setFlickDirection] = useState<"center" | "left" | "up" | "right" | "down">("center");
  const keyRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const isTouchingRef = useRef(false);
  const lastTouchTimeRef = useRef<number>(0);

  // 1. 初始化加载
  useEffect(() => {
    // 获取词库清单
    setManifestLoading(true);
    setManifestError(null);
    fetch(`${import.meta.env.BASE_URL}vocabularies/manifest.json`)
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP 错误 ${res.status}: ${res.statusText}`);
        }
        return res.json();
      })
      .then((data: LibraryMeta[]) => {
        setManifest(data);
        if (data.length > 0) {
          // 从 settings 恢复上次选择的词库
          try {
            const savedSettings = localStorage.getItem("romanji_settings");
            if (savedSettings) {
              const parsed = JSON.parse(savedSettings);
              if (parsed.selectedLibraryId && data.some(m => m.id === parsed.selectedLibraryId)) {
                setSelectedLibraryIds([parsed.selectedLibraryId]);
              } else {
                setSelectedLibraryIds([data[0].id]);
              }
            } else {
              setSelectedLibraryIds([data[0].id]);
            }
          } catch {
            setSelectedLibraryIds([data[0].id]);
          }
        }
        setManifestLoading(false);

        // 异步加载所有单词本的单词总数，用于计算进度百分比
        const countPromises = data.map(lib => {
          const fetchPath = lib.path ? `${import.meta.env.BASE_URL}${lib.path}` : `${import.meta.env.BASE_URL}vocabularies/${lib.id}.json`;
          return fetch(fetchPath)
            .then(r => {
              if (!r.ok) throw new Error();
              return r.json();
            })
            .then((words: any[]) => ({ id: lib.id, count: words.length }))
            .catch(() => ({ id: lib.id, count: 0 }));
        });
        Promise.all(countPromises).then(counts => {
          const countMap: Record<string, number> = {};
          counts.forEach(c => {
            countMap[c.id] = c.count;
          });
          setLibraryTotalCounts(countMap);
        });
      })
      .catch(err => {
        console.error("Error loading manifest.json", err);
        setManifestError(err.message || String(err));
        setManifestLoading(false);
      });

    // 加载历史纪录、学习进度和最高成绩
    try {
      const savedStats = localStorage.getItem("romanji_completed_libraries");
      if (savedStats) {
        setCompletedStats(JSON.parse(savedStats));
      }

      const savedProgress = localStorage.getItem("romanji_library_progress");
      if (savedProgress) {
        setLibraryProgress(JSON.parse(savedProgress));
      }

      const savedPB = localStorage.getItem("romanji_global_pb");
      if (savedPB) {
        setGlobalPB(Number(savedPB));
      }
    } catch (e) {
      console.error("加载历史数据失败", e);
    }

    // 加载用户设置或自动检测系统主题
    let activeTheme: "dark" | "light" = "dark";
    try {
      const savedSettings = localStorage.getItem("romanji_settings");
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (parsed.audioEnabled !== undefined) setAudioEnabled(parsed.audioEnabled);
        if (parsed.showProgress !== undefined) setShowProgress(parsed.showProgress);
        if (parsed.showMeaning !== undefined) setShowMeaning(parsed.showMeaning);
        if (parsed.showTypingGuide !== undefined) setShowTypingGuide(parsed.showTypingGuide);
        if (parsed.wordCountOption !== undefined) setWordCountOptionState(parsed.wordCountOption);
        if (parsed.theme !== undefined) {
          activeTheme = parsed.theme;
        } else {
          const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
          activeTheme = systemPrefersDark ? "dark" : "light";
        }
      } else {
        const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        activeTheme = systemPrefersDark ? "dark" : "light";
      }
    } catch (e) {
      console.error("加载用户配置或自动检测主题失败", e);
      const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      activeTheme = systemPrefersDark ? "dark" : "light";
    }
    setTheme(activeTheme);
    document.documentElement.setAttribute("data-theme", activeTheme);
  }, []);

  // 监听主题变化
  // 保存用户设置到localStorage的通用函数
  const saveSettings = (overrides: Record<string, any> = {}) => {
    const settings = { theme, audioEnabled, showProgress, showMeaning, showTypingGuide, selectedLibraryId: selectedLibraryIds[0] || "", wordCountOption, ...overrides };
    localStorage.setItem("romanji_settings", JSON.stringify(settings));
  };

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    saveSettings({ theme: nextTheme });
  };



  // 监听键盘按键：PC 模式已删除，强制 12 键滑动输入，故不绑定键盘按键。

  // 启动计时器
  const startGameTimer = () => {
    setIsGameRunning(true);
    startTimeStampRef.current = Date.now();
    pausedDurationRef.current = 0;
    pauseStartRef.current = null;
    
    if (timeLimitOption > 0) {
      setTimeLeft(timeLimitOption);
    }
    setElapsedTime(0);

    timerRef.current = setInterval(() => {
      if (startTimeStampRef.current === null) return;
      // 暂停中は更新しない
      if (pauseStartRef.current !== null) return;
      
      const delta = Math.floor((Date.now() - startTimeStampRef.current - pausedDurationRef.current) / 1000);
      setElapsedTime(delta);

      if (timeLimitOption > 0) {
        const remaining = timeLimitOption - delta;
        if (remaining <= 0) {
          setTimeLeft(0);
          endGameSession(delta);
        } else {
          setTimeLeft(remaining);
        }
      }
    }, 200);
  };


  // 校验输入正确性，并累加错误按键行统计
  const validateInput = (newInput: string) => {
    const currentWord = wordsList[currentIndex];
    if (!currentWord) return;

    const targetKana = stripSpecialChars(currentWord.n);

    // 计算有效的前缀长度（支持中间态匹配）
    const validLen = getValidPrefixLength(targetKana, newInput);
    const isPrefixCorrect = newInput.length <= validLen;

    if (isPrefixCorrect) {
      // 输入正确（或者合法的中间态）
      setUserInput(newInput);
      if (audioEnabled) playClickSound(0.6);

      // 如果完全匹配目标词汇，触发结算并切换下一个词
      if (newInput === targetKana) {
        setCorrectKanaCount(prev => prev + targetKana.length);
        
        // 记录该单词为本次练习已通过（结束时统一提交）
        sessionCompletedWordsRef.current.push(currentWord);
        
        // 成功音效
        if (audioEnabled) {
          // 当前词通过，播放清脆提示音
          playClickSound(0.8);
        }

        const nextIdx = currentIndex + 1;
        if (wordCountOption > 0 && nextIdx >= Math.min(wordsList.length, wordCountOption)) {
          // 达到预设的单词数限制，结束游戏
          setTimeout(() => endGameSession(), 100);
        } else if (nextIdx >= wordsList.length) {
          // 所有词库单词打完，结束游戏
          setTimeout(() => endGameSession(), 100);
        } else {
          // 切入下一个词汇
          setCurrentIndex(nextIdx);
          setUserInput("");
        }
      }
    } else {
      // 输入错误，触发抖动动画，播放低沉蜂鸣声
      setUserInput(newInput);
      setShakeWord(true);
      setTimeout(() => setShakeWord(false), 200);
      if (audioEnabled) playErrorSound(0.5);
      setMistakeCount(prev => prev + 1);

      // 统计错误所处按键行
      // 我们找出用户第一个打错的假名位置
      const failedChar = targetKana[validLen];
      if (failedChar) {
        const row = getKanaRow(failedChar);
        setErrorsPerRow(prev => ({
          ...prev,
          [row]: (prev[row] || 0) + 1
        }));
      }
    }
  };

  // 关闭祝贺弹窗，并重置进度为 0%
  const handleDismissCongratulation = () => {
    if (congratulationLibId) {
      const progressMap = { ...libraryProgress };
      progressMap[congratulationLibId] = [];
      setLibraryProgress(progressMap);
      localStorage.setItem("romanji_library_progress", JSON.stringify(progressMap));
    }
    setShowCongratulation(false);
    setCongratulationLibName("");
    setCongratulationLibId("");
  };

  // 严格匹配长度（已完全匹配的字符长度）
  const getStrictPrefixLength = (targetStr: string, typedStr: string): number => {
    let i = 0;
    while (i < targetStr.length && i < typedStr.length && targetStr[i] === typedStr[i]) {
      i++;
    }
    return i;
  };

  // 宽容匹配长度（允许最后一个字符处于修改中的中间态）
  const getValidPrefixLength = (targetStr: string, typedStr: string): number => {
    let i = 0;
    while (i < targetStr.length && i < typedStr.length) {
      const targetChar = targetStr[i];
      const typedChar = typedStr[i];
      
      if (targetChar === typedChar) {
        i++;
      } else if (i === typedStr.length - 1) {
        const cycle = MODIFIER_CYCLE[typedChar];
        if (cycle && cycle.includes(targetChar)) {
          i++;
        } else {
          break;
        }
      } else {
        break;
      }
    }
    return i;
  };

  // 结束游戏并结算
  const endGameSession = (finalTime?: number) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsGameRunning(false);

    const seconds = finalTime !== undefined ? finalTime : elapsedTime;
    const finalSeconds = seconds <= 0 ? 1 : seconds; // 防零除

    // 播放通关音效
    if (audioEnabled) playSuccessSound(0.6);

    // 提交本次练习中通过的单词到进度记录
    const completedWords = sessionCompletedWordsRef.current;
    let roundCompletedLibId: string | null = null;
    if (completedWords.length > 0) {
      const progressMap = { ...libraryProgress };
      completedWords.forEach(word => {
        if (!word.libraryId || word.wordIndex === undefined) return;
        const completedList = progressMap[word.libraryId] ? [...progressMap[word.libraryId]] : [];
        if (!completedList.includes(word.wordIndex)) {
          completedList.push(word.wordIndex);
          progressMap[word.libraryId] = completedList;
        }
      });
      setLibraryProgress(progressMap);
      localStorage.setItem("romanji_library_progress", JSON.stringify(progressMap));

      // 检测是否有词书全部练完
      for (const libId of selectedLibraryIds) {
        const totalWords = libraryTotalCounts[libId] || 0;
        const completedCount = (progressMap[libId] || []).length;
        if (totalWords > 0 && completedCount >= totalWords) {
          roundCompletedLibId = libId;
          const libMeta = manifest.find(m => m.id === libId);
          setCongratulationLibName(libMeta?.name || "単語帳");
          setCongratulationLibId(libId);
          setShowCongratulation(true);
          break;
        }
      }
    }
    sessionCompletedWordsRef.current = [];

    // 计算成绩 (按照用户新公式: (总点击数 - 退格数) / 时间 * 60)
    // 使用 startTimeStampRef 实时计算最终经过时间，减去暂停时长
    const realElapsed = startTimeStampRef.current
      ? Math.floor((Date.now() - startTimeStampRef.current - pausedDurationRef.current) / 1000)
      : finalSeconds;
    const actualSeconds = realElapsed <= 0 ? 1 : realElapsed;
    const kpm = Math.round((totalKeysPressed - backspaceCount) / actualSeconds * 60);
    const efficiency = (correctKanaCount + mistakeCount) > 0 ? Math.round((correctKanaCount / (correctKanaCount + mistakeCount)) * 100) : 100;

    // 将计算结果存入 state，确保 SUMMARY 展示值与 PB 保存值完全一致
    setResultKPM(kpm);
    setElapsedTime(actualSeconds);

    // 更新本地数据库中选中词库的打过纪录（更新 KPM/效率，整轮完成时 +1 回数）
    const updatedStats = { ...completedStats };
    selectedLibraryIds.forEach(libId => {
      const prevRecord = updatedStats[libId] || { completedCount: 0, bestKPM: 0, bestEfficiency: 0, lastCompletedTime: 0 };
      updatedStats[libId] = {
        completedCount: prevRecord.completedCount + (libId === roundCompletedLibId ? 1 : 0),
        bestKPM: Math.max(prevRecord.bestKPM, kpm),
        bestEfficiency: Math.max(prevRecord.bestEfficiency, efficiency),
        lastCompletedTime: Date.now()
      };
    });

    setCompletedStats(updatedStats);
    localStorage.setItem("romanji_completed_libraries", JSON.stringify(updatedStats));

    // 更新并持久化全局最高纪录「PB」
    const savedGlobalPB = Number(localStorage.getItem("romanji_global_pb") || "0");
    if (kpm > savedGlobalPB) {
      localStorage.setItem("romanji_global_pb", String(kpm));
      setGlobalPB(kpm);
    }

    setScreen("SUMMARY");
  };

  // 开始练习按钮触发
  const startPractice = async () => {
    if (selectedLibraryIds.length === 0) return;

    try {
      // 动态获取所选词库的数据
      const dataPromises = selectedLibraryIds.map(id => {
        const meta = manifest.find(m => m.id === id);
        const fetchPath = meta?.path ? `${import.meta.env.BASE_URL}${meta.path}` : `${import.meta.env.BASE_URL}vocabularies/${id}.json`;
        return fetch(fetchPath)
          .then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
            return r.json();
          })
          .then((words: WordItem[]) => words.map((w, idx) => ({ ...w, libraryId: id, wordIndex: idx })));
      });

      const results = await Promise.all(dataPromises);
      const combinedWords = results.flat().filter(w => isTypeable(w.n)) as WordItem[];

      if (combinedWords.length === 0) {
        alert("選択された単語帳に単語が含まれていません。");
        return;
      }

      // 过滤已经练习过的单词，保证过完一次前不重复
      const progressMap = { ...libraryProgress };
      let unpracticedWords = combinedWords.filter(w => {
        const completedList = progressMap[w.libraryId || ""] || [];
        return !completedList.includes(w.wordIndex!);
      });

      // 如果已全部过完一轮，重置后进入新一轮
      if (unpracticedWords.length === 0) {
        selectedLibraryIds.forEach(id => {
          progressMap[id] = [];
        });
        setLibraryProgress(progressMap);
        localStorage.setItem("romanji_library_progress", JSON.stringify(progressMap));
        unpracticedWords = combinedWords;
      }

      // 洗牌打乱词库
      const shuffled = shuffleArray(unpracticedWords);
      setWordsList(shuffled);
      setCurrentIndex(0);
      setUserInput("");
      setTotalKeysPressed(0);
      setBackspaceCount(0);
      setCorrectKanaCount(0);
      setMistakeCount(0);
      setErrorsPerRow({});
      sessionCompletedWordsRef.current = [];
      setElapsedTime(0);
      setTimeLeft(timeLimitOption);
      setIsGameRunning(false);
      startTimeStampRef.current = null;

      setScreen("PRACTICE");
    } catch (e) {
      console.error("加载词库文件失败", e);
      alert("加载词库数据失败，请确认词库文件是否存在于指定路径！");
    }
  };

  // 跳过当前单词
  const skipWord = () => {
    if (audioEnabled) playClickSound(0.5);
    const nextIndex = currentIndex + 1;
    const limit = wordCountOption === 0 ? wordsList.length : Math.min(wordsList.length, wordCountOption);
    
    if (nextIndex >= limit) {
      endGameSession();
    } else {
      setCurrentIndex(nextIndex);
      setUserInput("");
    }
  };

  // 动作键处理器
  const handleActionKey = (id: string) => {
    if (id === "switch_count" || id === "switch_time" || id === "back_to_menu" || id === "toggle_mute") {
      return; // 死键，不作响应
    } else if (id === "key_enter") {
      skipWord();
    }
  };

  // 5x4虚拟键盘手势判定算法
  const handleTouchStart = (keyId: string, e: React.TouchEvent<HTMLDivElement>) => {
    if (screen !== "PRACTICE" || inputMode !== "flick") return;
    
    e.preventDefault(); // 阻止浏览器默认行为，彻底根除模拟鼠标双重点击 bug
    isTouchingRef.current = true; // 标记处于触屏操作中
    lastTouchTimeRef.current = Date.now(); // 记录本次 Touch 时间戳
    
    if (!isGameRunning) {
      startGameTimer();
    }

    const keyDef = KEYBOARD_KEYS.find(k => k.id === keyId);
    if (!keyDef) return;
    if (keyDef.id === "switch_count" || keyDef.id === "switch_time" || keyDef.id === "back_to_menu" || keyDef.id === "toggle_mute" || keyDef.id === "key_space") {
      return; // 死键
    }

    const touch = e.touches[0];
    setTouchStartPos({ x: touch.clientX, y: touch.clientY });
    setActiveFlickKey(keyDef.keyNum || null);
    setFlickDirection("center");
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (screen !== "PRACTICE" || inputMode !== "flick" || !touchStartPos || activeFlickKey === null) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartPos.x;
    const dy = touch.clientY - touchStartPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const threshold = 30; // 触发滑动判定阈值 (30px)

    if (distance < threshold) {
      setFlickDirection("center");
    } else {
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (absDx > absDy) {
        setFlickDirection(dx > 0 ? "right" : "left");
      } else {
        setFlickDirection(dy > 0 ? "down" : "up");
      }
    }
  };

  const handleTouchEnd = (keyId: string) => {
    if (screen !== "PRACTICE" || inputMode !== "flick") return;

    const keyDef = KEYBOARD_KEYS.find(k => k.id === keyId);
    if (!keyDef) {
      setActiveFlickKey(null);
      setTouchStartPos(null);
      setFlickDirection("center");
      return;
    }

    // 检查输入偏差限制：如果在退格改正之前有拼写错误，拒绝除退格、修饰、功能以外的所有新键入
    if (wordsList.length > 0 && currentIndex < wordsList.length) {
      const currentWord = wordsList[currentIndex];
      const targetKana = stripSpecialChars(currentWord.n);
      const validLen = getValidPrefixLength(targetKana, userInput);
      const isInputIncorrect = userInput.length > validLen;
      if (isInputIncorrect) {
        const isAllowed = keyDef.id === "key_backspace" || keyDef.id === "key_mod" || keyDef.type === "action";
        if (!isAllowed) {
          if (audioEnabled) playErrorSound(0.4);
          setActiveFlickKey(null);
          setTouchStartPos(null);
          setFlickDirection("center");
          return; // 拦截拒绝输入
        }
      }
    }

    if (keyDef.type === "action") {
      handleActionKey(keyDef.id);
    } else {
      setTotalKeysPressed(prev => prev + 1);
      if (keyDef.id === "key_backspace") {
        if (audioEnabled) playClickSound(0.3);
        setBackspaceCount(prev => prev + 1);
        if (userInput.length > 0) {
          setUserInput(prev => prev.slice(0, -1));
        }
      } else if (keyDef.id === "key_space") {
        // 死键，不作响应
      } else if (keyDef.id === "key_mod") {
        if (userInput.length > 0) {
          const lastChar = userInput.slice(-1);
          const cycle = MODIFIER_CYCLE[lastChar];
          if (cycle) {
            const currentIdx = cycle.indexOf(lastChar);
            const nextChar = cycle[(currentIdx + 1) % cycle.length];
            const nextInput = userInput.slice(0, -1) + nextChar;
            validateInput(nextInput);
          } else {
            if (audioEnabled) playErrorSound(0.4);
          }
        }
      } else if (keyDef.type === "flick") {
        let selectedChar = keyDef.center || "";
        if (flickDirection === "left" && keyDef.left) selectedChar = keyDef.left;
        else if (flickDirection === "up" && keyDef.up) selectedChar = keyDef.up;
        else if (flickDirection === "right" && keyDef.right) selectedChar = keyDef.right;
        else if (flickDirection === "down" && keyDef.down) selectedChar = keyDef.down;

        const nextInput = userInput + selectedChar;
        validateInput(nextInput);
      }
    }

    setActiveFlickKey(null);
    setTouchStartPos(null);
    setFlickDirection("center");
    lastTouchTimeRef.current = Date.now(); // 记录本次 Touch 结束时间戳

    // 延迟 500 毫秒清除触屏标记，拦截这期间产生的浏览器模拟 mousedown 事件
    setTimeout(() => {
      isTouchingRef.current = false;
    }, 500);
  };

  // 支持 PC 调试：鼠标点击模拟
  const handleMouseDown = (keyId: string, e: React.MouseEvent<HTMLDivElement>) => {
    if (screen !== "PRACTICE" || inputMode !== "flick") return;
    
    // 如果最近 1000ms 内发生过物理触屏事件，彻底拦截模拟生成的 mousedown
    if (Date.now() - lastTouchTimeRef.current < 1000) return;
    if (isTouchingRef.current) return;

    if (!isGameRunning) {
      startGameTimer();
    }

    const keyDef = KEYBOARD_KEYS.find(k => k.id === keyId);
    if (!keyDef) return;
    if (keyDef.id === "switch_count" || keyDef.id === "switch_time" || keyDef.id === "back_to_menu" || keyDef.id === "toggle_mute" || keyDef.id === "key_space") {
      return; // 死键
    }

    setTouchStartPos({ x: e.clientX, y: e.clientY });
    setActiveFlickKey(keyDef.keyNum || null);
    setFlickDirection("center");

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - e.clientX;
      const dy = moveEvent.clientY - e.clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const threshold = 30;

      if (distance < threshold) {
        setFlickDirection("center");
      } else {
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        if (absDx > absDy) {
          setFlickDirection(dx > 0 ? "right" : "left");
        } else {
          setFlickDirection(dy > 0 ? "down" : "up");
        }
      }
    };

    const handleMouseUp = () => {
      handleTouchEnd(keyId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  // 单选词库，并保存至 localStorage
  const handleSelectLibrary = (id: string) => {
    setSelectedLibraryIds([id]);
    saveSettings({ selectedLibraryId: id });
  };

  // 格式化时间显示 (分:秒)
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // 当前单词
  const currentWord = wordsList[currentIndex];

  // 计算最常犯错的行
  const getTopFailingRow = (): string => {
    let topRow = "なし";
    let maxErrors = 0;
    Object.entries(errorsPerRow).forEach(([row, count]) => {
      if (count > maxErrors) {
        maxErrors = count;
        topRow = row;
      }
    });
    return maxErrors > 0 ? `${topRow}（ミス${maxErrors}回）` : "なし";
  };

  return (
    <>
      <div className="glow-bg">
        <div className="glow-circle glow-circle-1"></div>
        <div className="glow-circle glow-circle-2"></div>
      </div>

      <div className="app-viewport">
        {/* 页眉导航 */}
        <header className="app-header">
          <div className="header-left">
            <div 
              className="app-title flex-center app-title-clickable" 
              onClick={() => {
                if (timerRef.current) {
                  clearInterval(timerRef.current);
                  timerRef.current = null;
                }
                setIsGameRunning(false);
                setScreen("SELECTION");
              }}
            >
              <span>ロマンジ</span>
            </div>
            {/* 深浅主题切换 */}
            <button className="icon-btn" onClick={toggleTheme} title="テーマ切替">
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            {/* 音効オン/オフ切替 */}
            <button className="icon-btn" onClick={() => { const next = !audioEnabled; setAudioEnabled(next); saveSettings({ audioEnabled: next }); }} title="音効切替">
              {audioEnabled ? <Volume2 size={18} /> : <VolumeOff size={18} />}
            </button>
          </div>

          <div className="header-right">
            {/* 如果正在游戏中，提供退出键 */}
            {screen === "PRACTICE" && (
              <button 
                className="icon-btn stop-btn-text" 
                onClick={() => {
                  pauseStartRef.current = Date.now();
                  setShowStopConfirm(true);
                }} 
                title="練習を終了する"
              >
                終了
              </button>
            )}
            {/* More 面板入口 */}
            <button className="icon-btn" onClick={() => setShowMorePanel(true)} title="その他">
              <Settings size={18} />
            </button>
          </div>
        </header>

        {/* 1. 词库选择与配置屏幕 (SELECTION) */}
        {screen === "SELECTION" && (
          <div className="selection-container">
            {manifestLoading ? (
              <div className="glass-card loading-card">
                <div className="loading-text">
                  🛸 単語帳データを読み込んでいます...
                </div>
              </div>
            ) : manifestError ? (
              <div className="glass-card error-card">
                <div className="error-title">
                  ❌ 単語帳の読み込みに失敗しました
                </div>
                <div className="error-detail">
                  {manifestError}
                </div>
                <button 
                  className="btn-secondary reload-btn" 
                  onClick={() => window.location.reload()}
                >
                  再読み込み
                </button>
              </div>
            ) : (
              <>
                <div>
                  <h3 className="section-title section-title-primary">単語帳を選択</h3>
              <div className="library-list">
                {manifest.map(lib => {
                  const isSelected = selectedLibraryIds.includes(lib.id);
                  const completedCount = (libraryProgress[lib.id] || []).length;
                  const totalCount = libraryTotalCounts[lib.id] || 0;
                  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

                  return (
                    <div 
                      key={lib.id} 
                      className={`library-card glass-card library-card-compact ${isSelected ? "selected" : ""}`}
                      onClick={() => handleSelectLibrary(lib.id)}
                    >
                      <div className="library-name library-name-compact">
                        {lib.name}
                      </div>
                      {showProgress && (
                        <div className="library-sub library-sub-text">
                          <span>
                            {completedCount === 0 && completedStats[lib.id]?.completedCount > 0
                              ? `${completedStats[lib.id].completedCount}回`
                              : `${completedCount}/${totalCount} (${percentage}%)`
                            }
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="section-title section-title-primary">設定</h3>
              <div className="settings-list">
                {/* 出題数 */}
                <div className="setting-row">
                  <span className="setting-label">出題数</span>
                  <div className="setting-options">
                    {(() => {
                      const selectedId = selectedLibraryIds[0] || "";
                      const totalCount = libraryTotalCounts[selectedId] || 0;
                      const progressCount = (libraryProgress[selectedId] || []).length;
                      const remaining = totalCount > 0 ? totalCount - progressCount : 0;
                      const available = remaining > 0 ? remaining : totalCount;

                      const baseOptions = [10, 20, 50, 0];
                      let options = baseOptions;
                      if (available > 0 && available < baseOptions[0]) {
                        options = [available, ...baseOptions.slice(1)];
                      }

                      return options.map(count => {
                        const isDisabled = count > 0 && available > 0 && count > available;
                        const isSelected = wordCountOption === count || (count === available && wordCountOption > available && count !== 0);
                        return (
                          <button
                            key={count}
                            className={`btn-secondary setting-option-btn ${isSelected ? "btn-option-selected" : ""} ${isDisabled ? "btn-disabled" : ""}`}
                            onClick={() => { if (!isDisabled) setWordCountOption(count); }}
                            disabled={isDisabled}
                          >
                            {count === 0 ? "∞" : count}
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>
                {/* 入力ガイド */}
                <div className="setting-row">
                  <span className="setting-label">入力ガイド</span>
                  <button
                    className={`btn-secondary setting-toggle-btn ${showTypingGuide ? "btn-option-selected" : ""}`}
                    onClick={() => { setShowTypingGuide(!showTypingGuide); saveSettings({ showTypingGuide: !showTypingGuide }); }}
                  >
                    {showTypingGuide ? "ON" : "OFF"}
                  </button>
                </div>
              </div>
            </div>

            <button               className="action-btn-large" 
              onClick={startPractice}
              disabled={selectedLibraryIds.length === 0}
            >
              <Play size={20} fill="white" />
              <span>練習を始める</span>
            </button>
              </>
            )}
          </div>
        )}

        {/* 2. 核心打字练习面板 (PRACTICE) */}
        {screen === "PRACTICE" && currentWord && (
          <div className="practice-container">
            {/* 上半部：效率看板 */}
            <div className="stats-header-grid glass-card stats-header-no-radius">
              <div className="stat-header-card">
                <div className="stat-header-label">進捗</div>
                <div className="stat-header-value">
                  {wordCountOption > 0 
                    ? `${currentIndex + 1}/${Math.min(wordsList.length, wordCountOption)}`
                    : `${currentIndex + 1} 語`
                  }
                </div>
              </div>
              <div className="stat-header-card">
                <div className="stat-header-label">時間</div>
                <div className="stat-header-value highlight">
                  {timeLimitOption > 0 ? formatTime(timeLeft) : formatTime(elapsedTime)}
                </div>
              </div>
              <div className="stat-header-card">
                <div className="stat-header-label">打鍵数</div>
                <div className="stat-header-value">{totalKeysPressed}</div>
              </div>
              <div className="stat-header-card">
                <div className="stat-header-label">修正</div>
                <div className={`stat-header-value ${backspaceCount > 0 ? "stat-value-warning" : ""}`}>
                  {backspaceCount}
                </div>
              </div>
            </div>

            {/* 中间：目标词汇显示看板 */}
            <div className="word-board">
              {/* 日文汉字与读音 */}
              <div className="kanji-ruby-display animate-pop" key={`kanji-${currentIndex}`}>
                {currentWord.j !== currentWord.n && (
                  <div className="reading-annotation">{currentWord.n}</div>
                )}
                <div className="kanji-main" style={{ fontSize: currentWord.j.length > 12 ? "16px" : currentWord.j.length > 9 ? "20px" : currentWord.j.length > 6 ? "24px" : undefined }}>
                  {currentWord.j}
                </div>
              </div>

              {/* 精细化字母匹配区 */}
              <div className={`typing-guide-container ${shakeWord ? "animate-shake" : ""}`}>
                {showTypingGuide && (
                <div className="target-kana-spelling">
                  {(() => {
                    const targetKana = stripSpecialChars(currentWord.n);
                    const strictLen = getStrictPrefixLength(targetKana, userInput);
                    return targetKana.split("").map((char, index) => {
                      let status: "correct" | "current" | "pending" = "pending";
                      if (index < strictLen) {
                        status = "correct";
                      } else if (index === strictLen) {
                        status = "current";
                      }
                      return (
                        <span key={index} className={`kana-char ${status}`}>
                          {char}
                        </span>
                      );
                    });
                  })()}
                </div>
                )}

                {/* 虚拟输入框实时文字反馈 */}
                <div className="virtual-input-preview-box">
                  {(() => {
                    const targetKana = stripSpecialChars(currentWord.n);
                    const strictLen = getStrictPrefixLength(targetKana, userInput);
                    const validLen = getValidPrefixLength(targetKana, userInput);
                    const correctPart = userInput.slice(0, strictLen);
                    const pendingPart = userInput.slice(strictLen, validLen);
                    const incorrectPart = userInput.slice(validLen);
                    return (
                      <>
                        {correctPart && (
                          <span className="input-text-correct">
                            {correctPart}
                          </span>
                        )}
                        {pendingPart && (
                          <span className="input-text-pending">
                            {pendingPart}
                          </span>
                        )}
                        {incorrectPart && (
                          <span className="input-text-incorrect">
                            {incorrectPart}
                          </span>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
            {showMeaning && (
              <div className="meaning-bubble meaning-bubble-centered animate-pop" key={`meaning-${currentIndex}`} dangerouslySetInnerHTML={{ __html: currentWord.m }}>
              </div>
            )}

            {/* 下半部：手势键盘 (仅在 Flick 模式下展示) */}
            {inputMode === "flick" && (
              <div className="keyboard-section">
                <div className="keyboard-grid-5x4">
                  {KEYBOARD_KEYS.map(k => {
                    const isActive = k.keyNum !== undefined && activeFlickKey === k.keyNum;

                    
                    // 动态获取及修正副标题
                    let displaySubLabel = k.subLabel;

                    const isWhiteKey = [
                      "key_a", "key_ta", "key_ma", "key_mod",
                      "key_ka", "key_na", "key_ya", "key_wa",
                      "key_sa", "key_ha", "key_ra", "key_punc"
                    ].includes(k.id);

                    const isDeadKey = [
                      "switch_count", "switch_time", "back_to_menu", "toggle_mute", "key_space"
                    ].includes(k.id);

                    return (
                      <div
                        key={k.id}
                        ref={el => {
                          if (k.keyNum) keyRefs.current[k.keyNum] = el;
                        }}
                        style={{ gridArea: k.gridArea }}
                        className={`flick-key ${
                          isWhiteKey ? "key-style-white" : "key-style-gray"
                        } ${
                          isActive ? "active-flick" : ""
                        } ${
                          isDeadKey ? "dead-key" : ""
                        }`}
                        onTouchStart={(e) => handleTouchStart(k.id, e)}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={() => handleTouchEnd(k.id)}
                        onMouseDown={(e) => handleMouseDown(k.id, e)}
                      >
                        <span className="key-main-label">
                          {(() => {
                            if (k.id === "key_mod") {
                              const lastChar = userInput.slice(-1);
                              const canModify = lastChar && MODIFIER_CYCLE[lastChar];
                              return canModify ? "゛゜小" : "^_^";
                            }
                            return k.label;
                          })()}
                        </span>
                        {displaySubLabel && <span className="key-sub-label">{displaySubLabel}</span>}

                        {/* 十字滑行浮现气泡预览 (Flick Pop) */}
                        {isActive && k.type === "flick" && (
                          <div className="flick-pop-overlay">
                            <div className="flick-pop-cross">
                              {/* 中心 */}
                              <div className={`flick-pop-item center ${flickDirection === "center" ? "active" : ""}`}>
                                {k.center}
                              </div>
                              {/* 左 */}
                              {k.left && (
                                <div className={`flick-pop-item left ${flickDirection === "left" ? "active" : ""}`}>
                                  {k.left}
                                </div>
                              )}
                              {/* 上 */}
                              {k.up && (
                                <div className={`flick-pop-item up ${flickDirection === "up" ? "active" : ""}`}>
                                  {k.up}
                                </div>
                              )}
                              {/* 右 */}
                              {k.right && (
                                <div className={`flick-pop-item right ${flickDirection === "right" ? "active" : ""}`}>
                                  {k.right}
                                </div>
                              )}
                              {/* 下 */}
                              {k.down && (
                                <div className={`flick-pop-item down ${flickDirection === "down" ? "active" : ""}`}>
                                  {k.down}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. 游戏成绩结算屏幕 (SUMMARY) */}
        {screen === "SUMMARY" && (
          <div className="summary-container animate-pop">
            <div className="trophy-glow">
              <Trophy size={42} />
            </div>

            <div>
              <h2>リザルト</h2>
              <p className="summary-subtitle">
                お疲れさまでした。
              </p>
            </div>

            {/* 核心指标展示 */}
            <div className="result-kpm-box">
              <span className="result-kpm-val">
                {resultKPM}
              </span>
              <span className="result-kpm-lbl">タイピング速度（KPM）</span>
            </div>

            <div className="results-details-grid">
              <div className="result-detail-card glass-card">
                <span className="result-detail-val">
                  {(correctKanaCount + mistakeCount) > 0 ? Math.round((correctKanaCount / (correctKanaCount + mistakeCount)) * 100) : 100}%
                </span>
                <span className="result-detail-lbl">正確率</span>
              </div>
              <div className="result-detail-card glass-card">
                <span className="result-detail-val">{formatTime(elapsedTime)}</span>
                <span className="result-detail-lbl">クリアタイム</span>
              </div>
              <div className="result-detail-card glass-card">
                <span className="result-detail-val">{totalKeysPressed} 回</span>
                <span className="result-detail-lbl">キー入力数</span>
              </div>
              <div className="result-detail-card glass-card">
                <span className="result-detail-val">{backspaceCount} 回</span>
                <span className="result-detail-lbl">バックスペース回数</span>
              </div>
            </div>

            {/* 生疏度 analysis */}
            <div className="summary-weakness-section">
              <h3 className="section-title section-title-left">苦手かも？</h3>
              <div className="glass-card weakness-card-padding">
                <div className="mastery-row-list">
                  <div className="mastery-row-item">
                    <span className="mastery-row-name">ミスが多かった行</span>
                    <span className={`mastery-row-rate ${Object.keys(errorsPerRow).length > 0 ? "mastery-row-rate-error" : "mastery-row-rate-success"}`}>
                      {getTopFailingRow()}
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* 操作控制 */}
            <div className="secondary-btn-group summary-btn-group">
              <button className="btn-secondary flex-center btn-gap" onClick={() => setScreen("SELECTION")}>
                <RotateCcw size={16} />
                <span>ホームに戻る</span>
              </button>
              <button className="btn-primary flex-center btn-gap" onClick={startPractice}>
                <Play size={16} fill="white" />
                <span>もう一度練習</span>
              </button>
            </div>
          </div>
        )}

        {/* 祝賀弹出框 (Congratulations Pass Modal) */}
        {/* More 信息面板 */}
        {showMorePanel && (
          <div className="congrats-overlay flex-center modal-overlay" onClick={() => setShowMorePanel(false)}>
            <div className="congrats-modal glass-card animate-pop more-panel-modal" onClick={e => e.stopPropagation()}>

              {/* Tab 切换 */}
              <div className="more-panel-tabs">
                {(["stat", "settings", "about"] as const).map(tab => (
                  <button
                    key={tab}
                    className={`btn-secondary more-panel-tab-btn ${morePanelTab === tab ? "btn-option-selected" : ""}`}
                    onClick={() => setMorePanelTab(tab)}
                  >
                    {tab === "stat" ? "Status" : tab === "settings" ? "Settings" : "About"}
                  </button>
                ))}
              </div>

              {/* Stat Tab */}
              {morePanelTab === "stat" && (
                <>
                  {/* PB */}
                  <div className="stat-pb-row">
                    <span className="stat-pb-label">PB（自己ベスト）</span>
                    <span className="stat-pb-value">
                      {globalPB > 0 ? `${globalPB} KPM` : "---"}
                    </span>
                  </div>

                  {/* 各単語帳の完了回数 */}
                  {(() => {
                    const entries = Object.entries(completedStats).filter(([, v]) => v.completedCount > 0);
                    if (entries.length === 0) return (
                      <div className="stat-empty-text">
                        まだ学習記録がありません
                      </div>
                    );
                    return (
                      <div>
                        <div className="stat-section-title">単語帳の学習回数</div>
                        {entries.map(([libId, stat]) => {
                          const libMeta = manifest.find(m => m.id === libId);
                          return (
                            <div key={libId} className="stat-lib-row">
                              <span>{libMeta?.name || libId}</span>
                              <span className="stat-lib-count">{stat.completedCount}回</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* 学習記録クリア */}
                  <button
                    className="btn-primary reset-btn"
                    onClick={() => {
                      if (confirm("学習記録（進捗・PB・回数）をすべてリセットしますか？")) {
                        localStorage.removeItem("romanji_library_progress");
                        localStorage.removeItem("romanji_global_pb");
                        localStorage.removeItem("romanji_completed_libraries");
                        setLibraryProgress({});
                        setGlobalPB(0);
                        setCompletedStats({});
                      }
                    }}
                  >
                    学習記録をリセット
                  </button>
                </>
              )}

              {/* Settings Tab */}
              {morePanelTab === "settings" && (
                <>
                  <div className="settings-panel-row">
                    <span className="settings-panel-label">単語帳の進捗を表示</span>
                    <button
                      className={`btn-secondary settings-panel-toggle ${showProgress ? "btn-option-selected" : ""}`}
                      onClick={() => { setShowProgress(!showProgress); saveSettings({ showProgress: !showProgress }); }}
                    >
                      {showProgress ? "ON" : "OFF"}
                    </button>
                  </div>
                  <div className="settings-panel-row">
                    <span className="settings-panel-label">単語の解釈を表示</span>
                    <button
                      className={`btn-secondary settings-panel-toggle ${showMeaning ? "btn-option-selected" : ""}`}
                      onClick={() => { setShowMeaning(!showMeaning); saveSettings({ showMeaning: !showMeaning }); }}
                    >
                      {showMeaning ? "ON" : "OFF"}
                    </button>
                  </div>
                  <div className="settings-panel-row">
                    <span className="settings-panel-label">入力ガイドを表示</span>
                    <button
                      className={`btn-secondary settings-panel-toggle ${showTypingGuide ? "btn-option-selected" : ""}`}
                      onClick={() => { setShowTypingGuide(!showTypingGuide); saveSettings({ showTypingGuide: !showTypingGuide }); }}
                    >
                      {showTypingGuide ? "ON" : "OFF"}
                    </button>
                  </div>
                </>
              )}

              {/* About Tab */}
              {morePanelTab === "about" && (
                <div>
                  <div className="about-section-title">このサイトについて</div>
                  <p className="about-text">
                    本サイトはiPhoneのかな入力（フリック入力）のみを対象とした仮名タイピング練習サイトです。ローマ字入力やPC入力には対応していません。
                  </p>
                  <p className="about-text-spaced">
                    サイト名「ロマンジ」（浪漫時）は、「ローマ字」と「ロマン」を掛け合わせた造語です。（けれど本サイトの練習は、ローマ字入力じゃなくて、かな入力です。<del>さようなら、全てのローマ字くん！</del>）
                  </p>
                  <p className="about-text-spaced">
                    キーをタップするとその行の「あ段」が入力されます。上下左右にフリック（スワイプ）すると「い・う・え・お段」を入力できます。
                    濁点・半濁点・小書きは、文字入力後に左下の変換キーをタップして切り替えます。
                  </p>
                  <hr className="about-divider" />
                  <p className="about-text">
                    JLPT単語データは <a href="https://github.com/elzup/jlpt-word-list" target="_blank" rel="noopener noreferrer" className="about-link">elzup/jlpt-word-list</a> を利用しています。
                  </p>
                </div>
              )}

              <button
                className="btn-secondary modal-close-btn"
                onClick={() => setShowMorePanel(false)}
              >
                閉じる
              </button>
            </div>
          </div>
        )}

        {/* 停止確認ダイアログ */}
        {showStopConfirm && (
          <div className="congrats-overlay flex-center modal-overlay">
            <div className="glass-card animate-pop stop-confirm-modal">
              <div className="stop-confirm-title">練習を終了しますか？</div>
              <button
                className="btn-secondary stop-confirm-continue"
                onClick={() => {
                  // 恢复计时：累加暂停时长
                  if (pauseStartRef.current !== null) {
                    pausedDurationRef.current += Date.now() - pauseStartRef.current;
                    pauseStartRef.current = null;
                  }
                  setShowStopConfirm(false);
                }}
              >
                続ける
              </button>
              <div className="stop-confirm-actions">
                <button
                  className="btn-secondary stop-confirm-quit"
                  onClick={() => {
                    setShowStopConfirm(false);
                    pauseStartRef.current = null;
                    if (timerRef.current) {
                      clearInterval(timerRef.current);
                      timerRef.current = null;
                    }
                    setIsGameRunning(false);
                    sessionCompletedWordsRef.current = [];
                    setScreen("SELECTION");
                  }}
                >
                  やめる
                </button>
                <button
                  className="btn-primary stop-confirm-result"
                  onClick={() => {
                    setShowStopConfirm(false);
                    // 累加暂停时长后再结算
                    if (pauseStartRef.current !== null) {
                      pausedDurationRef.current += Date.now() - pauseStartRef.current;
                      pauseStartRef.current = null;
                    }
                    endGameSession();
                  }}
                >
                  結果へ
                </button>
              </div>
            </div>
          </div>
        )}

        {showCongratulation && (
          <div className="congrats-overlay flex-center modal-overlay">
            <div className="congrats-modal glass-card animate-pop congrats-modal-inner">
              <div className="congrats-emoji">🎉</div>
              <h2 className="congrats-title">読了おめでとうございます！</h2>
              <p className="congrats-desc">
                単語帳<strong>「{congratulationLibName}」</strong>のすべての単語を練習しました。
              </p>
              <p className="congrats-sub">
                学習進捗をリセットし、新しいラウンドを開始します。
              </p>
              <button 
                className="btn-primary congrats-close-btn" 
                onClick={handleDismissCongratulation}
              >
                閉じる
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
