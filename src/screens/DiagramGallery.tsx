import { DrillDiagramView } from '../components/DrillDiagram';
import { DIAGRAMS } from '../drills/diagrams';
import { getDrill } from '../drills/library';

/** Dev only (#/__diagrams): every drill diagram at its last step, for checking them by eye. */
export function DiagramGallery() {
  return (
    <>
      <h1 className="page-title">Diagrams</h1>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 12,
          width: '96vw',
          marginLeft: 'calc(50% - 48vw)',
        }}
      >
        {Object.entries(DIAGRAMS).map(([id, dg]) => {
          const d = getDrill(id);
          if (!d) return <p key={id}>Unknown drill: {id}</p>;
          return (
            <section key={id} className="card" data-diagram={id}>
              <p className="card__eyebrow">{d.name}</p>
              <DrillDiagramView drill={d} diagram={dg} startAtEnd />
            </section>
          );
        })}
      </div>
    </>
  );
}
