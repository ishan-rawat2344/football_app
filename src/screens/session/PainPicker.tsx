import { useState } from 'react';
import type { BodyArea } from '../../db/types';
import { BODY_AREAS } from '../../profile/meta';

export interface PainPick {
  area: BodyArea;
  score: number;
}

const scoreWord = (s: number) =>
  s === 0 ? 'None' : s <= 2 ? 'Mild' : s <= 4 ? 'Moderate' : s <= 6 ? 'Bad' : 'Severe';

/** Pick a body area and a 0–10 score. Big targets, one hand. */
export function PainPicker({
  onSave,
  onCancel,
  saveLabel = 'Save',
  defaultArea,
}: {
  onSave: (p: PainPick) => void;
  onCancel: () => void;
  saveLabel?: string;
  defaultArea?: BodyArea;
}) {
  const [area, setArea] = useState<BodyArea | null>(defaultArea ?? null);
  const [score, setScore] = useState(3);
  return (
    <div className="pain-picker">
      <p className="field__label">Where?</p>
      <div className="chips" role="group" aria-label="Where it hurts">
        {BODY_AREAS.map((a) => (
          <button key={a.key} type="button" className="chip" aria-pressed={area === a.key} onClick={() => setArea(a.key)}>
            {a.label}
          </button>
        ))}
      </div>
      <div className="rating__head" style={{ marginTop: 16 }}>
        <label className="field__label" htmlFor="pain-score">
          How bad, 0–10?
        </label>
        <output className={`pain-score pain-score--${score >= 5 ? 'red' : score >= 3 ? 'amber' : 'green'}`} htmlFor="pain-score">
          {score} <span>{scoreWord(score)}</span>
        </output>
      </div>
      <input
        id="pain-score"
        className="range"
        type="range"
        min={0}
        max={10}
        value={score}
        onChange={(e) => setScore(Number(e.target.value))}
      />
      <div className="row" style={{ marginTop: 16 }}>
        <button type="button" className="btn btn--secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="btn btn--primary" disabled={!area} onClick={() => area && onSave({ area, score })}>
          {saveLabel}
        </button>
      </div>
    </div>
  );
}
