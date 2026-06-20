import { NotFoundState } from '@/components/ui/not-found-state';

export default function NotFound() {
  return (
    <NotFoundState
      variant="root"
      homeHref="/"
      homeLabel="Go back home"
    />
  );
}
