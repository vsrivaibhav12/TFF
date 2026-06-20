import { NotFoundState } from '@/components/ui/not-found-state';

export default function NotFound() {
  return (
    <NotFoundState
      variant="entity"
      homeHref="/admin/queries"
      homeLabel="Back to queries"
    />
  );
}
