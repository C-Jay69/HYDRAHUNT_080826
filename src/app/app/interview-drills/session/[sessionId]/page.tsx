import RouteView from '@/components/app/route-view'

export default async function InterviewSessionRoutePage({
  params,
}: {
  params: Promise<{ sessionId: string }>
}) {
  const { sessionId } = await params
  return <RouteView initialView="interview-session" sessionId={sessionId} />
}
