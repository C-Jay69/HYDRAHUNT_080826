import RouteView from '@/components/app/route-view'

export default async function AnalysisDetailRoutePage({
  params,
}: {
  params: Promise<{ analysisId: string }>
}) {
  const { analysisId } = await params
  return <RouteView initialView="analysis" analysisId={analysisId} />
}
