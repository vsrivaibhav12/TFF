import { redirect } from 'next/navigation';

export default function BizlensReportIndexPage({ params }: { params: { reportId: string } }) {
  redirect(`/team/bizlens/${params.reportId}/output`);
}
