import { redirect } from 'next/navigation';

export default function SubServiceIndexPage({ params }: { params: { id: string } }) {
  redirect(`/admin/services/sub-services/${params.id}/clients`);
}
