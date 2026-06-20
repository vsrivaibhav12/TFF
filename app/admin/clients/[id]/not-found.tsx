import { NotFoundState } from '@/components/ui/not-found-state';

export default function NotFound() {
  return (
    <NotFoundState
      variant="entity"
      message="Client not found."
      homeHref="/admin/clients"
      homeLabel="Back to clients"
    />
  );
}
