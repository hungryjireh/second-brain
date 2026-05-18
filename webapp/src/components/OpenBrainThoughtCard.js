export default function OpenBrainThoughtCard({ item, date }) {
  const body = item?.text || '';
  return (
    <div>
      <p>{item?.profile?.username || 'openbrain.user'} · {date || 'just now'}</p>
      <p>{body}</p>
    </div>
  );
}
