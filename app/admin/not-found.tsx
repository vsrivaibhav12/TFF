import { NotFoundState } from '@/components/ui/not-found-state';

export default function NotFound() {
  return (
    <NotFoundState
      homeHref="/admin"
      homeLabel="Back to dashboard"
    />
  );
}
