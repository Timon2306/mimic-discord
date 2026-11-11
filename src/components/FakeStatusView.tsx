import React, { useEffect, useMemo, useState } from 'react';
import { Search, Smile, Gamepad2, X } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { tauriApi } from '@/lib/tauri';
import type { FakeStatusConfig, SpoofableGameItem } from '@/types/spoofer';

const MAX_SEARCH_RESULTS = 100;
const STORAGE_KEY = 'mimic.fake_status';
/** Discord's limits for the status text fields. */
const MIN_TEXT_CHARS = 2;
const MAX_TEXT_CHARS = 128;

/** Discord activity types that Rich Presence accepts. */
const ACTIVITY_TYPES = [
  { value: 0, labelKey: 'status.typePlaying' },
  { value: 2, labelKey: 'status.typeListening' },
  { value: 3, labelKey: 'status.typeWatching' },
  { value: 5, labelKey: 'status.typeCompeting' },
] as const;

interface SavedForm {
  game: Pick<SpoofableGameItem, 'id' | 'name' | 'icon_hash'> | null;
  name: string;
  details: string;
  state: string;
  imageUrl: string;
  activityType: number;
}

const EMPTY_FORM: SavedForm = {
  game: null,
  name: '',
  details: '',
  state: '',
  imageUrl: '',
  activityType: 0,
};

function readSavedForm(): SavedForm {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (!parsed || typeof parsed !== 'object') return EMPTY_FORM;
    const game =
      parsed.game && typeof parsed.game.id === 'string' && typeof parsed.game.name === 'string'
        ? { id: parsed.game.id, name: parsed.game.name, icon_hash: parsed.game.icon_hash }
        : null;
    const text = (value: unknown) => (typeof value === 'string' ? value : '');
    return {
      game,
      name: text(parsed.name),
      details: text(parsed.details),
      state: text(parsed.state),
      imageUrl: text(parsed.imageUrl),
      activityType: ACTIVITY_TYPES.some((type) => type.value === parsed.activityType)
        ? parsed.activityType
        : 0,
    };
  } catch {
    return EMPTY_FORM;
  }
}

function writeSavedForm(form: SavedForm): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
  } catch {
    // storage unavailable: the form just won't survive a restart
  }
}

function isTextValid(value: string): boolean {
  const length = value.trim().length;
  return length === 0 || (length >= MIN_TEXT_CHARS && length <= MAX_TEXT_CHARS);
}

function isImageUrlValid(value: string): boolean {
  const url = value.trim();
  return url === '' || url.startsWith('https://');
}

function gameIconUrl(game: Pick<SpoofableGameItem, 'id' | 'icon_hash'>, size: number): string | null {
  return game.icon_hash
    ? `https://cdn.discordapp.com/app-icons/${game.id}/${game.icon_hash}.png?size=${size}`
    : null;
}

const GameIcon: React.FC<{ game: Pick<SpoofableGameItem, 'id' | 'icon_hash'> }> = ({ game }) => {
  const url = gameIconUrl(game, 32);
  return url ? (
    <img
      src={url}
      alt=""
      className="w-6 h-6 rounded object-cover flex-shrink-0"
      onError={(e) => {
        (e.target as HTMLElement).style.display = 'none';
      }}
    />
  ) : (
    <div className="w-6 h-6 rounded bg-[#242738] flex items-center justify-center flex-shrink-0">
      <Gamepad2 className="w-3.5 h-3.5 text-[#5865F2]" />
    </div>
  );
};

interface FakeStatusViewProps {
  excludeAdult: boolean;
  isFetching: boolean;
}

export const FakeStatusView: React.FC<FakeStatusViewProps> = ({ excludeAdult, isFetching }) => {
  const { t, formatNumber } = useI18n();
  const [games, setGames] = useState<SpoofableGameItem[]>([]);
  const [form, setForm] = useState<SavedForm>(readSavedForm);
  const [searchTerm, setSearchTerm] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    tauriApi
      .getGamesList()
      .then(setGames)
      .catch((err) => console.error('Failed to load games list:', err));
  }, [isFetching]);

  useEffect(() => {
    writeSavedForm(form);
  }, [form]);

  // The status lives in the backend, so it survives switching tabs.
  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;

    tauriApi
      .getFakeStatus()
      .then((active) => {
        if (!disposed) setIsActive(active);
      })
      .catch(() => undefined);

    tauriApi
      .onFakeStatusEnded(() => {
        if (disposed) return;
        setIsActive(false);
        setNotice(t('status.endedByDiscord'));
      })
      .then((stop) => {
        if (disposed) stop();
        else unlisten = stop;
      })
      .catch(() => undefined);

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [t]);

  const availableGames = useMemo(
    () => games.filter((g) => !(excludeAdult && g.adult)),
    [games, excludeAdult]
  );

  const searchResults = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return [];
    return availableGames
      .filter((g) => g.name.toLowerCase().includes(term) || g.id.includes(term))
      .slice(0, MAX_SEARCH_RESULTS);
  }, [searchTerm, availableGames]);

  const update = (patch: Partial<SavedForm>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setError(null);
    setNotice(null);
  };

  const isFormValid =
    form.game !== null &&
    isTextValid(form.name) &&
    isTextValid(form.details) &&
    isTextValid(form.state) &&
    isImageUrlValid(form.imageUrl);

  const handleStart = async () => {
    if (!form.game) return;
    const config: FakeStatusConfig = {
      game_id: form.game.id,
      name: form.name.trim() || null,
      details: form.details.trim() || null,
      state: form.state.trim() || null,
      image_url: form.imageUrl.trim() || null,
      activity_type: form.activityType,
    };
    setIsBusy(true);
    setError(null);
    setNotice(null);
    try {
      await tauriApi.startFakeStatus(config);
      setIsActive(true);
    } catch (e) {
      setIsActive(false);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsBusy(false);
    }
  };

  const handleStop = async () => {
    setIsBusy(true);
    try {
      await tauriApi.stopFakeStatus();
      setIsActive(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsBusy(false);
    }
  };

  const typeLabel = t(
    ACTIVITY_TYPES.find((type) => type.value === form.activityType)?.labelKey ?? 'status.typePlaying'
  );
  const previewName = form.name.trim() || form.game?.name || t('status.previewNoGame');
  const previewImage =
    (isImageUrlValid(form.imageUrl) && form.imageUrl.trim()) ||
    (form.game ? gameIconUrl(form.game, 128) : null);

  const inputClass = (valid: boolean) =>
    `w-full bg-[#1b1c28] border rounded-lg px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none ${
      valid ? 'border-white/10 focus:border-[#5865F2]' : 'border-red-500/60'
    }`;

  return (
    <div className="flex flex-col h-full gap-3 overflow-hidden pr-1">
      {/* Title and controls */}
      <div className="bg-[#161722] border border-[#232535] rounded-xl p-4 shadow-sm flex flex-col gap-2 flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Smile className="w-4 h-4 text-[#5865F2]" />
              {t('status.title')}
              {isActive && (
                <span className="flex items-center gap-1.5 text-[11px] font-normal text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {t('status.active')}
                </span>
              )}
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">{t('status.subtitle')}</p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {isActive && (
              <button
                type="button"
                disabled={isBusy}
                onClick={handleStop}
                className="py-2 px-5 rounded-lg bg-[#3d181e] hover:bg-[#521e27] text-white font-semibold text-xs uppercase tracking-wider transition-all disabled:opacity-40"
              >
                {t('status.stop')}
              </button>
            )}
            <button
              type="button"
              disabled={isBusy || !isFormValid}
              onClick={handleStart}
              className="py-2 px-5 rounded-lg bg-[#5865F2] hover:bg-[#4752c4] text-white font-semibold text-xs uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isActive ? t('status.update') : t('status.start')}
            </button>
          </div>
        </div>

        {error && <div className="text-[11px] text-red-400 select-text">{error}</div>}
        {notice && !error && <div className="text-[11px] text-amber-400">{notice}</div>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 min-h-0 overflow-hidden">
        {/* Status form */}
        <div className="bg-[#161722] border border-[#232535] rounded-xl p-4 flex flex-col gap-3 shadow-sm min-h-0 overflow-y-auto">
          <div>
            <div className="text-[11px] text-neutral-400 mb-1">{t('status.game')}</div>
            {form.game ? (
              <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#1b1c28] border border-white/5 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <GameIcon game={form.game} />
                  <span className="font-medium text-white truncate">{form.game.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => update({ game: null })}
                  className="p-1 rounded text-neutral-400 hover:text-white hover:bg-white/5 flex-shrink-0"
                  title={t('status.removeGame')}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="p-2 rounded-lg border border-dashed border-white/10 text-xs text-neutral-500">
                {t('status.noGame')}
              </div>
            )}
          </div>

          <div>
            <div className="text-[11px] text-neutral-400 mb-1">{t('status.type')}</div>
            <div className="grid grid-cols-4 gap-1">
              {ACTIVITY_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => update({ activityType: type.value })}
                  className={`py-1.5 px-1 text-[11px] rounded border transition-all ${
                    form.activityType === type.value
                      ? 'bg-[#5865F2] text-white border-[#5865F2] font-semibold'
                      : 'bg-[#1b1c28] text-neutral-400 border-white/10 hover:text-white'
                  }`}
                >
                  {t(type.labelKey)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[11px] text-neutral-400 mb-1">{t('status.name')}</div>
            <input
              type="text"
              maxLength={MAX_TEXT_CHARS}
              value={form.name}
              placeholder={form.game?.name ?? t('status.namePlaceholder')}
              onChange={(e) => update({ name: e.target.value })}
              className={inputClass(isTextValid(form.name))}
            />
          </div>

          <div>
            <div className="text-[11px] text-neutral-400 mb-1">{t('status.details')}</div>
            <input
              type="text"
              maxLength={MAX_TEXT_CHARS}
              value={form.details}
              placeholder={t('status.detailsPlaceholder')}
              onChange={(e) => update({ details: e.target.value })}
              className={inputClass(isTextValid(form.details))}
            />
          </div>

          <div>
            <div className="text-[11px] text-neutral-400 mb-1">{t('status.state')}</div>
            <input
              type="text"
              maxLength={MAX_TEXT_CHARS}
              value={form.state}
              placeholder={t('status.statePlaceholder')}
              onChange={(e) => update({ state: e.target.value })}
              className={inputClass(isTextValid(form.state))}
            />
          </div>

          <div>
            <div className="text-[11px] text-neutral-400 mb-1">{t('status.image')}</div>
            <input
              type="text"
              maxLength={256}
              value={form.imageUrl}
              placeholder="https://..."
              onChange={(e) => update({ imageUrl: e.target.value })}
              className={inputClass(isImageUrlValid(form.imageUrl))}
            />
            <div className="text-[10px] text-neutral-500 mt-1">{t('status.imageHint')}</div>
          </div>

          <div className="text-[10px] text-neutral-500">{t('status.textHint')}</div>

          {/* Preview */}
          <div>
            <div className="text-[11px] text-neutral-400 mb-1">{t('status.preview')}</div>
            <div className="p-3 rounded-lg bg-[#1b1c28] border border-white/5">
              <div className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold mb-2">
                {typeLabel}
              </div>
              <div className="flex items-center gap-3 min-w-0">
                {previewImage ? (
                  <img
                    key={previewImage}
                    src={previewImage}
                    alt=""
                    className="w-14 h-14 rounded-lg object-cover flex-shrink-0 bg-[#242738]"
                    onError={(e) => {
                      (e.target as HTMLElement).style.visibility = 'hidden';
                    }}
                  />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-[#242738] flex items-center justify-center flex-shrink-0">
                    <Gamepad2 className="w-6 h-6 text-[#5865F2]" />
                  </div>
                )}
                <div className="min-w-0 text-xs">
                  <div className="font-semibold text-white truncate">{previewName}</div>
                  {form.details.trim() && (
                    <div className="text-neutral-300 truncate">{form.details.trim()}</div>
                  )}
                  {form.state.trim() && (
                    <div className="text-neutral-300 truncate">{form.state.trim()}</div>
                  )}
                  <div className="text-emerald-400 font-mono text-[11px]">00:01</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Game search */}
        <div className="bg-[#161722] border border-[#232535] rounded-xl p-4 flex flex-col shadow-sm min-h-0 overflow-hidden">
          <div className="relative flex-shrink-0">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t('database.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#1b1c28] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#5865F2]"
            />
          </div>

          <div className="flex-1 overflow-y-auto pr-1 mt-2 space-y-1.5 min-h-0">
            {searchResults.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center text-xs text-neutral-500 p-4">
                {searchTerm.trim()
                  ? t('database.empty')
                  : t('status.searchHint', { count: formatNumber(availableGames.length) })}
              </div>
            ) : (
              searchResults.map((game) => {
                const isSelected = form.game?.id === game.id;
                return (
                  <button
                    key={game.id}
                    type="button"
                    onClick={() =>
                      update({
                        game: { id: game.id, name: game.name, icon_hash: game.icon_hash },
                      })
                    }
                    className={`w-full flex items-center gap-2.5 p-2 rounded-lg border text-xs text-left transition-all ${
                      isSelected
                        ? 'bg-[#5865F2]/15 border-[#5865F2]'
                        : 'bg-[#1b1c28] border-white/5 hover:border-white/20'
                    }`}
                  >
                    <GameIcon game={game} />
                    <span className="font-medium text-white truncate">{game.name}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
