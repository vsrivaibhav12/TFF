import { NotFoundState } from '@/components/ui/not-found-state';

export default function NotFound() {
  return (
    <NotFoundState
      variant="entity"
      homeHref="/portal/queries"
      homeLabel="Back to queries"
    />
  );
}
