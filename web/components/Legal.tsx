import type { ReactNode } from 'react';

/** Renders the policy's simple format: "# Heading", "- bullet", blank-line separated paragraphs. */
export function Legal({ text }: { text: string }) {
  const out: ReactNode[] = [];
  let bullets: string[] = [];
  const flush = (k: string) => { if (bullets.length) { out.push(<ul key={`u${k}`}>{bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>); bullets = []; } };
  text.split('\n').forEach((raw, i) => {
    const line = raw.trimEnd();
    if (line.startsWith('- ')) { bullets.push(line.slice(2)); return; }
    flush(String(i));
    if (line.startsWith('# ')) out.push(<h3 key={i}>{line.slice(2)}</h3>);
    else if (line.trim()) out.push(<p key={i}>{line}</p>);
  });
  flush('end');
  return <div className="legal">{out}</div>;
}
