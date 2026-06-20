import { NotFoundState } from '@/components/ui/not-found-state';

export default function NotFound() {
  return (
    <NotFoundState
      variant="entity"
      message="Task not found."
      homeHref="/admin/tasks"
      homeLabel="Back to tasks"
    />
  );
}
