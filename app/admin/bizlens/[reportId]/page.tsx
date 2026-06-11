import { redirect } from 'next/navigation';

export default function BizlensReportIndexPage({ params }: { params: { reportId: string } }) {
  redirect(`/admin/bizlens/${params.reportId}/output`);
}
