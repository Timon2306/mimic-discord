import React from 'react';
import { Check, ExternalLink, Github, Star, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useI18n } from '@/i18n/I18nProvider';

interface GithubStarDialogProps {
  open: boolean;
  gamesCount: number;
  onOpenRepo: () => void | Promise<void>;
  onAccept: () => void;
  onDecline: () => void;
}

export const GithubStarDialog: React.FC<GithubStarDialogProps> = ({
  open,
  gamesCount,
  onOpenRepo,
  onAccept,
  onDecline,
}) => {
  const { t, formatNumber } = useI18n();

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="star-dialog-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-6"
    >
      <div className="relative w-[440px] max-w-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#1a1c29] to-[#12131c] p-6 shadow-2xl shadow-black/70">
        {/* Soft glow behind the icon */}
        <div className="pointer-events-none absolute -top-16 left-1/2 h-32 w-56 -translate-x-1/2 rounded-full bg-amber-400/10 blur-3xl" />

        <div className="relative flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/25 bg-amber-400/10 shadow-lg shadow-amber-500/10">
            <Star className="h-7 w-7 text-amber-300" strokeWidth={2.2} />
          </div>

          <h2
            id="star-dialog-title"
            className="mt-4 text-lg font-bold tracking-tight text-white"
          >
            {t('star.title')}
          </h2>

          <p className="mt-2 text-[13px] leading-relaxed text-neutral-400">
            {t('star.body', { count: formatNumber(gamesCount) })}
          </p>

          <Button
            size="lg"
            className="mt-5 w-full"
            onClick={() => void onOpenRepo()}
          >
            <Github className="h-4 w-4" />
            {t('star.cta')}
            <ExternalLink className="h-3.5 w-3.5 opacity-60" />
          </Button>

          <div className="mt-3 flex w-full items-stretch gap-2">
            <Button
              variant="secondary"
              className="flex-1 border-emerald-500/30 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
              onClick={onAccept}
            >
              <Check className="h-4 w-4" />
              {t('star.accepted')}
            </Button>

            <Button
              variant="ghost"
              className="flex-1 text-neutral-400 hover:bg-white/5 hover:text-white"
              onClick={onDecline}
            >
              <X className="h-4 w-4" />
              {t('star.declined')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
