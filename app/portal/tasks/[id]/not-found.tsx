import { NotFoundState } from '@/components/ui/not-found-state';

export default function NotFound() {
  return (
    <NotFoundState
      variant="entity"
      homeHref="/portal/tasks"
      homeLabel="Back to tasks"
    />
  );
}
