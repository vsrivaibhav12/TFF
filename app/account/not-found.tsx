import { NotFoundState } from '@/components/ui/not-found-state';

export default function NotFound() {
  return (
    <NotFoundState
      title="Page not found"
      message="The account page you are looking for does not exist."
      homeHref="/account"
      homeLabel="Back to account"
    />
  );
}
