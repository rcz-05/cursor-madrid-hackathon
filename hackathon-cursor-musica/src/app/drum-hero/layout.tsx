/** Transparent shell so camera/video layers show through beneath the overlay. */
export default function DrumHeroLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="fixed inset-0 bg-transparent">{children}</div>;
}
