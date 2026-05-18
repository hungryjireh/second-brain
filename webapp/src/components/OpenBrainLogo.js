export default function OpenBrainLogo({ style, accentStyle, textProps }) {
  return (
    <span style={style} {...(textProps || {})}>
      open<span style={accentStyle}>brain</span>
    </span>
  );
}
