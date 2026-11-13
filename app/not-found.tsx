import { Logo } from '@/components/layout/Logo';
import { NotFoundView } from '@/components/layout/NotFoundView';

export default function RootNotFound() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
        <Logo size="md" />
      </div>
      <NotFoundView />
    </div>
  );
}
