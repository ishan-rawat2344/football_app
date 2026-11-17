import { useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { BackLink } from '../components/forms';
import { toast } from '../components/Toast';
import {
  deleteAllData,
  exportBackup,
  importProfile,
  markBackedUp,
  restoreBackup,
  shareOrDownload,
} from '../data/dataOps';
import { ImportError, parseImportFile, type BackupTable, type ParsedImport } from '../data/importExport';
import { useProfile, useSetting } from '../hooks/useData';
import { formatShort, toISODate } from '../lib/dates';
import { timeAgo } from '../lib/format';

const TABLE_LABELS: Partial<Record<BackupTable, string>> = {
  profile: 'Profile',
  ratingSnapshots: 'Skill ratings',
  sessionLogs: 'Session logs',
  matchLogs: 'Match logs',
  painReports: 'Pain reports',
  testResults: 'Test results',
  games: 'Games',
  plannedSessions: 'Planned sessions',
  videoFeedback: 'Video feedback',
  lessonProgress: 'Lessons read',
};

export function DataScreen() {
  const [, navigate] = useLocation();
  const profile = useProfile();
  const lastBackupAt = useSetting<string>('lastBackupAt');
  const fileInput = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedImport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const hasProfile = profile !== 'loading' && profile !== null;

  async function backUp() {
    setBusy(true);
    try {
      const file = await exportBackup();
      if (await shareOrDownload(file)) {
        await markBackedUp();
        toast('Backup saved');
      }
    } catch (err) {
      console.error(err);
      toast("Couldn't make the backup");
    } finally {
      setBusy(false);
    }
  }

  async function onFile(file: File | undefined) {
    setError(null);
    setParsed(null);
    if (!file) return;
    try {
      setParsed(parseImportFile(await file.text()));
    } catch (err) {
      setError(err instanceof ImportError ? err.message : "Couldn't read that file.");
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  async function confirmImport() {
    if (!parsed) return;
    setBusy(true);
    try {
      if (parsed.type === 'profile') {
        await importProfile(parsed.profile, parsed.ratings);
        toast('Profile imported');
        navigate('/profile');
      } else {
        await restoreBackup(parsed.backup);
        toast('Backup restored');
        navigate('/');
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong while saving. Nothing was changed.");
    } finally {
      setBusy(false);
      setParsed(null);
    }
  }

  async function wipe() {
    if (!window.confirm('Delete ALL Touchline data on this phone? This cannot be undone.')) return;
    if (!window.confirm('Last check: have you made a backup? Tap OK to delete everything.')) return;
    await deleteAllData();
    toast('All data deleted');
    navigate('/');
  }

  return (
    <>
      <BackLink href="/settings" label="Settings" />
      <h1 className="page-title">Your data</h1>
      <p className="page-lede">
        Everything is stored only on this phone. Back up regularly: if the phone is lost or the app
        is deleted, a backup is the only copy.
      </p>

      <div className="stack">
        <section className="card">
          <p className="card__eyebrow">Back up</p>
          <p className="card__body" style={{ marginBottom: 16 }}>
            Last backup: <strong>{lastBackupAt === 'loading' ? '…' : timeAgo(lastBackupAt)}</strong>.
            Saves one file. On iPhone choose <strong>Save to Files</strong> (iCloud Drive keeps it off the
            phone) or AirDrop it to your Mac.
          </p>
          <button className="btn btn--primary btn--block" onClick={backUp} disabled={busy}>
            Back up now
          </button>
        </section>

        <section className="card">
          <p className="card__eyebrow">Import or restore</p>
          <p className="card__body" style={{ marginBottom: 16 }}>
            Choose your <strong>profile file</strong> (from the interview) or a <strong>backup file</strong>.
            You'll see what's inside before anything changes.
          </p>
          <input
            ref={fileInput}
            type="file"
            hidden
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
          <button className="btn btn--secondary btn--block" onClick={() => fileInput.current?.click()} disabled={busy}>
            Choose file
          </button>

          {error && (
            <p className="notice notice--bad" role="alert">
              {error}
            </p>
          )}

          {parsed?.type === 'profile' && (
            <div className="preview">
              <p className="preview__title">Profile file</p>
              <ul className="bullets">
                <li>
                  {[
                    parsed.profile.name || 'No name yet',
                    parsed.profile.age !== null && `${parsed.profile.age}`,
                    `${parsed.profile.dominantFoot}-footed`,
                    parsed.profile.positions.join(', '),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </li>
                <li>
                  {parsed.profile.goals.weeks4.length + parsed.profile.goals.months3.length + parsed.profile.goals.year1.length} goals ·{' '}
                  {parsed.profile.health.length} health notes · {parsed.profile.mind.ifThen.length} if → then plans
                </li>
                {parsed.ratings && <li>Skill ratings from {formatShort(parsed.ratings.date)}</li>}
              </ul>
              {hasProfile && (
                <p className="notice notice--warn">
                  This replaces your current profile. Your logs, matches and rating history are kept.
                </p>
              )}
              <div className="row">
                <button className="btn btn--secondary" onClick={() => setParsed(null)}>
                  Cancel
                </button>
                <button className="btn btn--primary" onClick={confirmImport} disabled={busy}>
                  Import profile
                </button>
              </div>
            </div>
          )}

          {parsed?.type === 'backup' && (
            <div className="preview">
              <p className="preview__title">
                Backup from{' '}
                {parsed.backup.exportedAt ? formatShort(toISODate(new Date(parsed.backup.exportedAt))) : 'unknown date'}
              </p>
              <ul className="list">
                {Object.entries(TABLE_LABELS).map(([table, label]) => (
                  <li key={table}>
                    <span>{label}</span>
                    <span className="muted">{parsed.counts[table as BackupTable]}</span>
                  </li>
                ))}
              </ul>
              <p className="notice notice--bad">
                Restoring <strong>replaces everything</strong> on this phone with this backup. Back up
                first if you might want today's data.
              </p>
              <div className="row">
                <button className="btn btn--secondary" onClick={() => setParsed(null)}>
                  Cancel
                </button>
                <button className="btn btn--danger" onClick={confirmImport} disabled={busy}>
                  Restore
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="card">
          <p className="card__eyebrow">Danger zone</p>
          <p className="card__body" style={{ marginBottom: 16 }}>
            Deletes every log, rating and setting on this phone.
          </p>
          <button className="btn btn--ghost btn--danger-text btn--block" onClick={wipe}>
            Delete all data on this phone
          </button>
        </section>
      </div>
    </>
  );
}
