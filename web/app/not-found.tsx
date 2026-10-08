import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="wrap page-top" style={{ textAlign: 'center', minHeight: '50vh' }}>
      <div style={{ fontSize: 64 }} aria-hidden="true">📚</div>
      <h1>We can't find that page</h1>
      <p style={{ margin: '12px auto 24px' }}>It may have moved. Let's get you back to the stories.</p>
      <Link className="btn" href="/">Back to home</Link>
    </div>
  );
}
