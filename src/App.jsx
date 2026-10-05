import { useState } from 'react';
import {
  Calendar,
  Mail,
  FileText,
  Copy,
  ExternalLink,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Download,
  Share2,
  X,
  Edit2
} from 'lucide-react';

// --- ユーティリティ関数 ---

// テキストから日時・URLを推測・抽出する関数
const extractDateTimeInfo = (text) => {
  if (!text) return { start: '', end: '', location: '', found: false };

  // 1. 全角英数字・記号を半角に変換、不要な空白を詰める
  const normalizedText = text
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
    .replace(/[：]/g, ':')
    .replace(/[（]/g, '(')
    .replace(/[）]/g, ')')
    .replace(/[／]/g, '/')
    .replace(/[〜～ー－-]/g, '~');

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  let extractedStartDate = null;
  let extractedStartTime = null;
  let extractedEndTime = null;

  // 2. 日付の抽出 (例: 9/11, 09/11, 9月11日)
  const dateRegex = /(?:20\d{2}[年/])?([1-9]|1[0-2])[月/]([1-9]|[12][0-9]|3[01])日?/;
  const dateMatch = normalizedText.match(dateRegex);

  if (dateMatch) {
    const month = parseInt(dateMatch[1], 10);
    const day = parseInt(dateMatch[2], 10);

    let year = currentYear;
    if (currentMonth >= 11 && month <= 3) {
      year = currentYear + 1;
    }

    const mStr = String(month).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    extractedStartDate = `${year}-${mStr}-${dStr}`;
  }

  // 3. 時刻の抽出 (例: 12:00~13:00, 14時30分)
  const timePattern = `(2[0-3]|[01]?[0-9])[:時]([0-5][0-9])?分?`;
  const timeRangeRegex = new RegExp(`${timePattern}\\s*~\\s*${timePattern}`);
  const rangeMatch = normalizedText.match(timeRangeRegex);

  if (rangeMatch) {
    const sHour = String(rangeMatch[1]).padStart(2, '0');
    const sMin = String(rangeMatch[2] || '00').padStart(2, '0');
    const eHour = String(rangeMatch[3]).padStart(2, '0');
    const eMin = String(rangeMatch[4] || '00').padStart(2, '0');

    extractedStartTime = `${sHour}:${sMin}`;
    extractedEndTime = `${eHour}:${eMin}`;
  } else {
    const singleTimeRegex = new RegExp(`${timePattern}`);
    const singleMatch = normalizedText.match(singleTimeRegex);
    if (singleMatch) {
      const sHour = String(singleMatch[1]).padStart(2, '0');
      const sMin = String(singleMatch[2] || '00').padStart(2, '0');
      extractedStartTime = `${sHour}:${sMin}`;
      const eHourNum = parseInt(sHour, 10) + 1;
      const eHour = String(eHourNum > 23 ? 23 : eHourNum).padStart(2, '0');
      extractedEndTime = `${eHour}:${sMin}`;
    }
  }

  // 4. URLの抽出 (Zoom, Teams, Meetなどのリンクを想定)
  const urlRegex = /https?:\/\/[-_.!~*'()a-zA-Z0-9;/?:@&=+$,%#]+/g;
  const urlMatch = text.match(urlRegex);
  let extractedLocation = '';
  if (urlMatch && urlMatch.length > 0) {
    extractedLocation = urlMatch[0];
  }

  let startISO = '';
  let endISO = '';

  if (extractedStartDate && extractedStartTime) {
    startISO = `${extractedStartDate}T${extractedStartTime}`;
    endISO = `${extractedStartDate}T${extractedEndTime || extractedStartTime}`;
  }

  return {
    start: startISO,
    end: endISO,
    location: extractedLocation,
    found: Boolean(startISO)
  };
};

// 安全なUTCフォーマットの日付文字列（YYYYMMDDTHHmmssZ）を生成する関数
const formatToUTCString = (start, end) => {
  if (!start) return { startStr: '', endStr: '' };

  const startDate = new Date(start);
  if (isNaN(startDate.getTime())) return { startStr: '', endStr: '' };

  let endDate = end ? new Date(end) : null;
  if (!endDate || isNaN(endDate.getTime()) || endDate.getTime() <= startDate.getTime()) {
    endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
  }

  const formatZ = (d) => d.toISOString().replace(/-|:|\.\d\d\d/g, '');

  return {
    startStr: formatZ(startDate),
    endStr: formatZ(endDate)
  };
};

// ICSファイルを生成してダウンロードする関数
const generateICSFile = (eventData) => {
  if (!eventData.title || !eventData.startStr) return false;

  const now = new Date();
  const nowStr = now.toISOString().replace(/-|:|\.\d\d\d/g, '');

  const safeDescription = (eventData.details || '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//JobHuntingApp//JP',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `DTSTAMP:${nowStr}`,
    `DTSTART:${eventData.startStr}`,
    `DTEND:${eventData.endStr}`,
    `SUMMARY:${eventData.title || '予定'}`,
    `LOCATION:${eventData.location || ''}`,
    `DESCRIPTION:${safeDescription}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${eventData.title || 'event'}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return true;
};

// クリップボードへのコピー処理（モダンAPI＋フォールバック）
const copyToClipboard = async (text, onSuccess) => {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      onSuccess();
      return;
    } catch (err) {
      console.error('Clipboard API failed, falling back', err);
    }
  }
  const textArea = document.createElement('textarea');
  textArea.value = text;
  document.body.appendChild(textArea);
  textArea.select();
  try {
    document.execCommand('copy');
    onSuccess();
  } catch (err) {
    console.error('コピーに失敗しました', err);
  }
  document.body.removeChild(textArea);
};

// --- コンポーネント ---

const Toast = ({ message, isVisible }) => (
  <div
    className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ${
      isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
    }`}
  >
    <div className="bg-gray-800 text-white px-6 py-3 rounded-full shadow-lg flex items-center font-medium">
      <CheckCircle2 size={18} className="text-green-400 mr-2" />
      {message}
    </div>
  </div>
);

const ShareModal = ({ isOpen, onClose, showToast }) => {
  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '【ここに共有リンクURL】';

  const shareText = `就活の面倒な「スケジュール登録〜メール返信」を1画面で終わらせるツール【就活ハック】です！🛠️\n\n✨ **できること**\n・面接メールをコピペ ➡️ 日時・Zoom URLを自動抽出してカレンダーへ\n・登録完了後、そのまま「返信メール」の作成画面へ直行\n・ESや自己PRも保存でき、いつでも1秒でコピー可能\n\n💡 **使い方**\nリンクを開き、そのまま操作できます！（スマホ・PC対応）\nログイン不要＆入力データは外部送信されないため安全です。ぜひお試しください👇\n\n${currentUrl}`;

  const handleCopyShareText = () => {
    copyToClipboard(shareText, () => {
      showToast('紹介用テキストをコピーしました！');
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-50 rounded-full p-1"
        >
          <X size={20} />
        </button>
        <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center">
          <Share2 size={20} className="mr-2 text-blue-600" />
          ツールを友達に共有する
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          URLは自動で組み込まれています。下のボタンからテキストをコピーして、SNSやチャットに貼り付けてください。
        </p>

        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-4 max-h-64 overflow-y-auto">
          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
            {shareText}
          </pre>
        </div>

        <button
          onClick={handleCopyShareText}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center transition-colors shadow-md"
        >
          <Copy size={18} className="mr-2" />
          テキストとURLをコピー
        </button>
      </div>
    </div>
  );
};

const ScheduleTab = ({ showToast, setActiveTab }) => {
  const [event, setEvent] = useState({
    companyName: '',
    eventType: '',
    start: '',
    end: '',
    location: '',
    details: ''
  });
  const [pasteText, setPasteText] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  const EVENT_TYPES = ['説明会', '面談', '一次面接', '二次面接', '最終面接', 'GD', 'Webテスト'];

  const sampleText = `〇〇株式会社 採用担当です。
書類選考を通過されましたので、一次面接のご案内をいたします。
以下の日程でオンライン面接を実施いたします。

・日時：11月15日(火) 14:00〜15:00
・場所：https://zoom.us/j/123456789
・持参物：筆記用具、履歴書

時間になりましたら上記URLよりご入室ください。`;

  const handleSetSample = () => {
    setPasteText(sampleText);
    showToast('例文を入力欄にセットしました！そのまま「解析」を押してみてください。');
  };

  const computedTitle = `${event.companyName} ${event.eventType}`.trim();

  const handleAnalyzeText = () => {
    if (!pasteText.trim()) return;
    const info = extractDateTimeInfo(pasteText);

    if (info.found) {
      setEvent((prev) => ({
        ...prev,
        start: info.start,
        end: info.end,
        location: info.location || prev.location,
        details: prev.details ? prev.details : pasteText
      }));
      showToast(info.location ? '日時とWeb会議URLを抽出しました！' : 'テキストから日時を抽出しました！');
    } else {
      showToast('日時情報を読み取れませんでした。手動で入力してください。');
    }
  };

  const executeAction = (actionType) => {
    if (!actionType) return;
    const safeTitle = computedTitle || '予定';

    const { startStr, endStr } = formatToUTCString(event.start, event.end);

    if (!startStr) {
      showToast('開始日時が正しく設定されていません。');
      return;
    }

    if (actionType === 'ics') {
      const success = generateICSFile({
        title: safeTitle,
        startStr,
        endStr,
        location: event.location,
        details: event.details
      });
      if (success) showToast('.icsファイルをダウンロードしました');
    } else if (actionType === 'google') {
      const safeDetails =
        event.details && event.details.length > 500
          ? event.details.substring(0, 500) + '\n\n...（以降省略）'
          : event.details;

      const queryParams = [
        `action=TEMPLATE`,
        `text=${encodeURIComponent(safeTitle)}`,
        `dates=${startStr}/${endStr}`,
        `details=${encodeURIComponent(safeDetails || '')}`,
        `location=${encodeURIComponent(event.location || '')}`
      ].join('&');

      window.open(`https://calendar.google.com/calendar/render?${queryParams}`, '_blank');
    }

    setIsModalOpen(false);
    setPendingAction(null);
    setIsSuccessModalOpen(true);
  };

  const handleActionClick = (actionType) => {
    if (!event.start) return;

    if (!(event.location || '').trim()) {
      setPendingAction(actionType);
      setIsModalOpen(true);
    } else {
      executeAction(actionType);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500 relative">
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Web会議URLが未入力です</h3>
            <p className="text-sm text-gray-600 mb-6">
              場所やZoom等のURLが空欄ですが、このままカレンダーに登録しますか？
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-colors"
              >
                いいえ(戻る)
              </button>
              <button
                onClick={() => executeAction(pendingAction)}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors"
              >
                はい(登録する)
              </button>
            </div>
          </div>
        </div>
      )}

      {isSuccessModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl text-center border-t-4 border-green-400">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">カレンダー出力を完了しました</h3>
            <p className="text-sm text-gray-600 mb-6">
              続けて、企業への返信や提出物の確認を行いますか？
            </p>
            <div className="space-y-3">
              <button
                onClick={() => {
                  setIsSuccessModalOpen(false);
                  setActiveTab('mail');
                }}
                className="w-full flex items-center justify-center py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-bold transition-colors"
              >
                <Mail size={18} className="mr-2" /> 返信メールを作成する
              </button>
              <button
                onClick={() => {
                  setIsSuccessModalOpen(false);
                  setActiveTab('docs');
                }}
                className="w-full flex items-center justify-center py-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl font-bold transition-colors"
              >
                <FileText size={18} className="mr-2" /> 提出用ES・URLを確認する
              </button>
              <button
                onClick={() => setIsSuccessModalOpen(false)}
                className="w-full py-3 text-gray-500 hover:bg-gray-50 rounded-xl font-medium transition-colors mt-2"
              >
                閉じる (スケジュール画面に残る)
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-2xl shadow-md text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
        <div className="flex justify-between items-start relative z-10 mb-4">
          <div>
            <h2 className="text-lg font-bold mb-1 flex items-center">
              <Mail size={20} className="mr-2" />
              メール文から一発で予定を作成 ✨
            </h2>
            <p className="text-sm text-blue-100">
              面接案内のテキストを貼り付けてください。日時とZoomURLを自動で読み取ります。
            </p>
          </div>
          <button
            onClick={handleSetSample}
            className="hidden sm:flex text-xs bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg font-bold transition-colors items-center"
          >
            <FileText size={14} className="mr-1" />
            例文で試す
          </button>
        </div>

        <div className="relative z-10">
          <textarea
            placeholder="ここにメールの文章を貼り付けてください..."
            className="w-full p-4 text-sm bg-white/10 border border-white/20 rounded-t-xl placeholder-blue-200 text-white focus:bg-white focus:text-gray-900 focus:placeholder-gray-400 focus:outline-none transition-all resize-none h-32 shadow-inner"
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
          />
          <div className="bg-white/5 border-x border-b border-white/20 rounded-b-xl p-3 flex justify-between items-center backdrop-blur-sm">
            <button
              onClick={handleSetSample}
              className="sm:hidden text-xs text-blue-100 hover:text-white px-2 py-1 rounded transition-colors flex items-center"
            >
              <FileText size={14} className="mr-1" />
              例文を入れる
            </button>
            <div className="hidden sm:block"></div>
            <button
              onClick={handleAnalyzeText}
              className="bg-white text-blue-700 hover:bg-blue-50 px-6 py-2.5 rounded-lg text-sm font-bold transition-all shadow-md flex items-center hover:scale-105 active:scale-95"
            >
              <Clock size={16} className="mr-2" />
              解析して自動入力
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 py-2">
        <div className="h-px bg-gray-200 flex-grow"></div>
        <span className="text-sm font-bold text-gray-400 bg-gray-50 px-2">または手動で入力・確認</span>
        <div className="h-px bg-gray-200 flex-grow"></div>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-gray-50 p-5 rounded-xl border border-gray-200">
            <div className="md:col-span-5">
              <label className="block text-sm font-bold text-gray-700 mb-2">企業名 *</label>
              <input
                type="text"
                className="w-full p-3.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none transition-all text-lg font-bold text-gray-800 placeholder-gray-300"
                placeholder="例：株式会社〇〇"
                value={event.companyName}
                onChange={(e) => setEvent({ ...event, companyName: e.target.value })}
              />
            </div>
            <div className="md:col-span-7">
              <label className="block text-sm font-bold text-gray-700 mb-2">予定の種類 *</label>
              <div className="flex flex-wrap gap-2">
                {EVENT_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() =>
                      setEvent({ ...event, eventType: event.eventType === type ? '' : type })
                    }
                    className={`px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                      event.eventType === type
                        ? 'bg-blue-600 text-white shadow-md transform scale-105'
                        : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
            <div className="md:col-span-12 pt-3 border-t border-gray-200 flex items-center">
              <span className="text-xs font-bold text-gray-500 mr-2">カレンダー登録名:</span>
              <span
                className={`text-base font-black ${
                  computedTitle ? 'text-blue-700' : 'text-gray-300'
                }`}
              >
                {computedTitle || '（未入力）'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">開始日時 *</label>
              <input
                type="datetime-local"
                className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:bg-white outline-none transition-all"
                value={event.start}
                onChange={(e) => setEvent({ ...event, start: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">終了日時</label>
              <input
                type="datetime-local"
                className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:bg-white outline-none transition-all"
                value={event.end}
                onChange={(e) => setEvent({ ...event, end: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">場所 / Web会議URL</label>
            <input
              type="text"
              className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:bg-white outline-none transition-all"
              placeholder="ZoomのURLやオフィスの住所"
              value={event.location}
              onChange={(e) => setEvent({ ...event, location: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">詳細メモ</label>
            <textarea
              className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:bg-white outline-none transition-all h-20 resize-none"
              placeholder="持参物や注意事項など"
              value={event.details}
              onChange={(e) => setEvent({ ...event, details: e.target.value })}
            />
          </div>

          <div className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-100">
            <button
              onClick={() => handleActionClick('google')}
              disabled={!event.start}
              className={`w-full py-4 rounded-xl font-bold flex items-center justify-center transition-all ${
                !event.start
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50 hover:shadow-md'
              }`}
            >
              <ExternalLink size={20} className="mr-2" /> Googleカレンダーへ
            </button>
            <button
              onClick={() => handleActionClick('ics')}
              disabled={!event.start}
              className={`w-full py-4 rounded-xl font-bold flex items-center justify-center transition-all ${
                !event.start
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5'
              }`}
            >
              <Download size={20} className="mr-2" /> 端末のカレンダーへ (.ics)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const MailTemplateTab = ({ showToast }) => {
  const templates = [
    {
      title: '面接の日程調整 (提示された日程から選ぶ)',
      subject: '面接日程のご連絡（氏名）',
      body: '株式会社〇〇\n採用ご担当者様\n\nお世話になっております。\n〇〇大学の[氏名]です。\n\n面接のご案内をいただき、誠にありがとうございます。\nご提示いただきました日程につきまして、以下の日時でお願いできますでしょうか。\n\n・〇月〇日（〇）〇:〇〜〇:〇\n\nお忙しいところ恐縮ですが、何卒よろしくお願い申し上げます。\n\n------------------------\n[氏名]\n[大学名・学部・学科]\n[電話番号]\n[メールアドレス]\n------------------------'
    },
    {
      title: '面接の日程調整 (こちらから提示する)',
      subject: '面接日程のご相談（氏名）',
      body: '株式会社〇〇\n採用ご担当者様\n\nお世話になっております。\n〇〇大学の[氏名]です。\n\n面接のご案内をいただき、誠にありがとうございます。\n大変恐縮ですが、ご提示いただいた日程は大学の講義と重なっており、お伺いすることが難しくなっております。\n\n誠に勝手ながら、以下の日程のいずれかで面接をお願いすることは可能でしょうか。\n\n・〇月〇日（〇）〇:〇〜〇:〇\n・〇月〇日（〇）〇:〇〜〇:〇\n・〇月〇日（〇）〇:〇〜〇:〇\n\nご検討いただけますと幸いです。よろしくお願い申し上げます。\n\n------------------------\n[氏名]\n[大学名・学部・学科]\n[電話番号]\n[メールアドレス]\n------------------------'
    },
    {
      title: '内定承諾の連絡',
      subject: '内定承諾のご連絡（氏名）',
      body: '株式会社〇〇\n採用ご担当者様\n\nお世話になっております。\n〇〇大学の[氏名]です。\n\nこの度は、内定のご連絡をいただき誠にありがとうございます。\n貴社からの内定を謹んでお受けしたく、ご連絡いたしました。\n\n入社後は貴社に貢献できるよう精一杯努めてまいります。\n今後ともご指導ご鞭撻のほど、よろしくお願い申し上げます。\n\n------------------------\n[氏名]\n[大学名・学部・学科]\n[電話番号]\n[メールアドレス]\n------------------------'
    },
    {
      title: '面接辞退の連絡',
      subject: '面接辞退のご連絡（氏名）',
      body: '株式会社〇〇\n採用ご担当者様\n\nお世話になっております。\n〇〇大学の[氏名]です。\n\n〇月〇日に予定しております面接につきまして、誠に申し訳ございませんが、一身上の都合により辞退させていただきたく、ご連絡いたしました。\n\n貴重なお時間を調整していただいたにも関わらず、このようなお返事となり大変申し訳ございません。\n\n末筆ではございますが、貴社の益々のご発展をお祈り申し上げます。\n\n------------------------\n[氏名]\n[大学名・学部・学科]\n[電話番号]\n[メールアドレス]\n------------------------'
    }
  ];

  const handleCopy = (text) => {
    copyToClipboard(text, () => showToast('クリップボードにコピーしました！'));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="grid gap-6">
        {templates.map((tmpl, idx) => (
          <div
            key={idx}
            className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className="bg-gray-50 border-b border-gray-100 p-4 flex justify-between items-center">
              <h3 className="font-bold text-gray-800">{tmpl.title}</h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    件名
                  </span>
                  <button
                    onClick={() => handleCopy(tmpl.subject)}
                    className="text-blue-600 hover:text-blue-800 text-xs flex items-center font-medium bg-blue-50 px-2 py-1 rounded"
                  >
                    <Copy size={12} className="mr-1" /> 件名をコピー
                  </button>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-800 font-medium">
                  {tmpl.subject}
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    本文
                  </span>
                  <button
                    onClick={() => handleCopy(tmpl.body)}
                    className="text-blue-600 hover:text-blue-800 text-xs flex items-center font-medium bg-blue-50 px-2 py-1 rounded"
                  >
                    <Copy size={12} className="mr-1" /> 本文をコピー
                  </button>
                </div>
                <pre className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                  {tmpl.body}
                </pre>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const DocumentTab = ({ showToast }) => {
  const [currentDoc, setCurrentDoc] = useState({
    id: null,
    title: '',
    type: 'ES',
    content: '',
    url: ''
  });
  const [isFormOpen, setIsFormOpen] = useState(false);

  const defaultDocs = [
    {
      id: 'default-1',
      title: '【ガクチカ】〇〇でのアルバイト (400字)',
      type: 'ES',
      content:
        '学生時代に最も打ち込んだことは、〇〇でのアルバイトにおいて、店舗の課題解決に取り組み売上向上に貢献したことです。\n当初、店舗では〇〇という課題があり、私はそれを解決するために〇〇という施策を提案しました。\n周囲のスタッフと協力しながら施策を実行する中で、〇〇といった困難もありましたが、〇〇の工夫をすることで乗り越えました。\n結果として、〇〇を達成することができました。\nこの経験から、現状を分析し主体的に行動して課題を解決する力を身につけました。社会に出てもこの強みを活かし、貴社のビジネスに貢献したいと考えています。',
      url: '',
      updatedAt: new Date().toISOString()
    },
    {
      id: 'default-2',
      title: '【自己PR】巻き込み力・リーダーシップ (400字)',
      type: 'ES',
      content:
        '私の強みは「目標達成に向けて周囲を巻き込み、推進する力」です。\n大学の〇〇サークルで〇〇を務めた際、〇〇という目標を掲げました。しかし、メンバー間のモチベーションに差があるという課題に直面しました。\nそこで私は、一人ひとりと対話する機会を設け、それぞれの意見や強みを活かせる役割分担を再構築しました。\n結果として、チーム全体の士気が向上し、最終的には〇〇という成果を上げることができました。\n仕事においても、多様な価値観を持つ人々と協働し、同じ目標に向かってチームを牽引することで、貴社の発展に貢献したいと考えております。',
      url: '',
      updatedAt: new Date().toISOString()
    },
    {
      id: 'default-3',
      title: '【面接用メモ】長所・短所',
      type: 'Other',
      content:
        '■ 長所\n・課題発見力と、それを解決するための行動力\n・エピソード：〇〇のアルバイトで〜\n\n■ 短所\n・集中しすぎて周りが見えなくなることがある\n・改善策：タスクに取り組む前に優先順位をつけ、定期的に進捗を客観視する時間を設けるようにしている。',
      url: '',
      updatedAt: new Date().toISOString()
    },
    {
      id: 'default-4',
      title: '【提出用】ポートフォリオ・作品集',
      type: 'Portfolio',
      content: '',
      url: 'https://github.com/あなたのユーザー名',
      updatedAt: new Date().toISOString()
    }
  ];

  const [docs, setDocs] = useState(() => {
    try {
      const savedDocs = localStorage.getItem('shukatsu_docs');
      if (!savedDocs) return defaultDocs;

      const parsedDocs = JSON.parse(savedDocs);
      return Array.isArray(parsedDocs) ? parsedDocs : defaultDocs;
    } catch {
      return defaultDocs;
    }
  });

  const saveDocs = (newDocs) => {
    setDocs(newDocs);
    localStorage.setItem('shukatsu_docs', JSON.stringify(newDocs));
  };

  const handleOpenAdd = () => {
    setCurrentDoc({ id: null, title: '', type: 'ES', content: '', url: '' });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (doc) => {
    setCurrentDoc({ ...doc });
    setIsFormOpen(true);
  };

  const handleSave = () => {
    if (!currentDoc.title) return;

    if (currentDoc.id) {
      const updatedDocs = docs.map((d) =>
        d.id === currentDoc.id
          ? { ...currentDoc, id: currentDoc.id, updatedAt: new Date().toISOString() }
          : d
      );
      saveDocs(updatedDocs);
      showToast('更新しました！');
    } else {
      const docToAdd = {
        ...currentDoc,
        id: Date.now().toString(),
        updatedAt: new Date().toISOString()
      };
      saveDocs([docToAdd, ...docs]);
      showToast('保存しました！');
    }
    setIsFormOpen(false);
  };

  const handleDelete = (id) => {
    saveDocs(docs.filter((doc) => doc.id !== id));
    showToast('削除しました');
  };

  const handleCopy = (text) => {
    copyToClipboard(text, () => showToast('コピーしました！'));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      {!isFormOpen && (
        <button
          onClick={handleOpenAdd}
          className="w-full bg-blue-50 hover:bg-blue-100 border-2 border-dashed border-blue-300 text-blue-600 rounded-2xl p-6 flex flex-col items-center justify-center transition-all"
        >
          <Plus size={24} className="mb-2" />
          <span className="font-bold">新しいES・ポートフォリオを登録</span>
        </button>
      )}

      {isFormOpen && (
        <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200">
          <h3 className="font-bold text-lg mb-4">
            {currentDoc.id ? 'ES・ポートフォリオの編集' : '新規登録'}
          </h3>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <select
                className="p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none"
                value={currentDoc.type}
                onChange={(e) => setCurrentDoc({ ...currentDoc, type: e.target.value })}
              >
                <option value="ES">エントリーシート (自己PRなど)</option>
                <option value="Portfolio">ポートフォリオURL</option>
                <option value="Other">その他メモ</option>
              </select>
              <input
                type="text"
                className="flex-grow p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none"
                placeholder="タイトル (例: 〇〇社 自己PR 400文字)"
                value={currentDoc.title}
                onChange={(e) => setCurrentDoc({ ...currentDoc, title: e.target.value })}
              />
            </div>

            {currentDoc.type === 'Portfolio' ? (
              <input
                type="url"
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none"
                placeholder="https://..."
                value={currentDoc.url}
                onChange={(e) => setCurrentDoc({ ...currentDoc, url: e.target.value })}
              />
            ) : (
              <textarea
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none h-40 resize-none"
                placeholder="内容を入力..."
                value={currentDoc.content}
                onChange={(e) => setCurrentDoc({ ...currentDoc, content: e.target.value })}
              />
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setIsFormOpen(false)}
                className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-medium transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={!currentDoc.title}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                保存する
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {docs.map((doc) => (
          <div
            key={doc.id}
            className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <span
                  className={`text-xs font-bold px-2 py-1 rounded-md mb-2 inline-block ${
                    doc.type === 'ES'
                      ? 'bg-green-100 text-green-700'
                      : doc.type === 'Portfolio'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {doc.type}
                </span>
                <h4 className="font-bold text-gray-800 line-clamp-1">{doc.title}</h4>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleOpenEdit(doc)}
                  className="text-gray-400 hover:text-blue-600 p-1.5 bg-gray-50 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="text-gray-400 hover:text-red-500 p-1.5 bg-gray-50 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="flex-grow bg-gray-50 p-3 rounded-xl mb-4 relative group">
              {doc.type === 'Portfolio' ? (
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline break-all text-sm"
                >
                  {doc.url}
                </a>
              ) : (
                <p className="text-sm text-gray-600 line-clamp-4 whitespace-pre-wrap">
                  {doc.content}
                </p>
              )}
            </div>

            <button
              onClick={() => handleCopy(doc.type === 'Portfolio' ? doc.url : doc.content)}
              className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-bold flex items-center justify-center transition-colors"
            >
              <Copy size={14} className="mr-2" /> コピーして使う
            </button>
          </div>
        ))}
        {docs.length === 0 && !isFormOpen && (
          <div className="col-span-1 md:col-span-2 text-center py-12 text-gray-400 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
            <FileText size={48} className="mx-auto mb-3 opacity-50" />
            <p>
              まだ保存されたデータがありません。
              <br />
              よく使うESやポートフォリオのURLを保存しておきましょう。
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export const App = () => {
  const [activeTab, setActiveTab] = useState('schedule');
  const [toastMessage, setToastMessage] = useState('');
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const displayToast = (message) => {
    setToastMessage(message);
    setIsToastVisible(true);
    setTimeout(() => setIsToastVisible(false), 3000);
  };

  const tabs = [
    { id: 'schedule', label: 'スケジュール', icon: Calendar },
    { id: 'mail', label: 'メール定型文', icon: Mail },
    { id: 'docs', label: 'ES・テンプレ', icon: FileText }
  ];

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 pb-20 md:pb-0">
      <Toast message={toastMessage} isVisible={isToastVisible} />
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        showToast={displayToast}
      />

      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3 shadow-sm">
              <span className="text-white font-bold text-lg">就</span>
            </div>
            <h1 className="text-xl font-black text-gray-800 tracking-tight">就活ハック</h1>
          </div>

          <div className="flex items-center gap-3">
            <nav className="hidden md:flex space-x-1 bg-gray-100 p-1 rounded-xl">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                      activeTab === tab.id
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200'
                    }`}
                  >
                    <Icon size={16} className="mr-2" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>

            <button
              onClick={() => setIsShareModalOpen(true)}
              className="flex items-center px-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-sm font-bold transition-colors"
            >
              <Share2 size={16} className="mr-1.5" />
              <span className="hidden sm:inline">共有</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-8">
        {activeTab === 'schedule' && (
          <ScheduleTab showToast={displayToast} setActiveTab={setActiveTab} />
        )}
        {activeTab === 'mail' && <MailTemplateTab showToast={displayToast} />}
        {activeTab === 'docs' && <DocumentTab showToast={displayToast} />}
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around p-2 pb-safe z-20">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center p-2 min-w-[4.5rem] rounded-xl transition-colors ${
                isActive ? 'text-blue-600' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <div
                className={`p-1.5 rounded-full mb-1 transition-colors ${
                  isActive ? 'bg-blue-50' : ''
                }`}
              >
                <Icon size={20} className={isActive ? 'stroke-[2.5px]' : ''} />
              </div>
              <span className="text-[10px] font-bold">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default App;
