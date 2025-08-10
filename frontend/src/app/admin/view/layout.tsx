import { ProtectedRoute } from '@/shared/components/ProtectedRoute';

export default function ViewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute requireAdmin={true}>
      <div className="h-screen overflow-hidden">
        {children}
      </div>
    </ProtectedRoute>
  );
} 