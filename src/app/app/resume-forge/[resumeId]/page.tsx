import RouteView from '@/components/app/route-view'

export default async function ResumeDetailRoutePage({
  params,
}: {
  params: Promise<{ resumeId: string }>
}) {
  const { resumeId } = await params
  return <RouteView initialView="resume-edit" resumeId={resumeId} />
}
