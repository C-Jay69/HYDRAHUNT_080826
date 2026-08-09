import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { careerNodeCreateSchema } from '@/lib/validators'

export async function GET() {
  try {
    const user = await requireUser()

    let careerMap = await db.careerMap.findFirst({
      where: { userId: user.id },
      include: { nodes: { orderBy: { orderIndex: 'asc' } } },
    })

    if (!careerMap) {
      careerMap = await db.careerMap.create({
        data: { userId: user.id, title: 'My Career Map' },
        include: { nodes: { orderBy: { orderIndex: 'asc' } } },
      })
    }

    return NextResponse.json({ success: true, map: careerMap })
  } catch (error) {
    if (error instanceof NextResponse) return error
    console.error('Get career map error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()
    const body = await request.json()
    const parsed = careerNodeCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Type and label are required' },
        { status: 400 },
      )
    }
    const { type, label, description, status } = parsed.data

    let careerMap = await db.careerMap.findFirst({ where: { userId: user.id } })
    if (!careerMap) {
      careerMap = await db.careerMap.create({ data: { userId: user.id } })
    }

    const maxOrderNode = await db.careerNode.findFirst({
      where: { mapId: careerMap.id },
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true },
    })

    const node = await db.careerNode.create({
      data: {
        mapId: careerMap.id,
        type,
        label,
        description: description || null,
        status,
        orderIndex: (maxOrderNode?.orderIndex ?? -1) + 1,
      },
    })

    return NextResponse.json({ success: true, node })
  } catch (error) {
    if (error instanceof NextResponse) return error
    console.error('Create career node error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireUser()
    const body = await request.json()
    const { id, status } = body

    if (!id || !status) {
      return NextResponse.json({ success: false, error: 'id and status are required' }, { status: 400 })
    }

    // Ownership check via the map
    const node = await db.careerNode.findFirst({
      where: { id, map: { userId: user.id } },
    })
    if (!node) {
      return NextResponse.json({ success: false, error: 'Node not found' }, { status: 404 })
    }

    const updated = await db.careerNode.update({
      where: { id },
      data: { status },
    })

    return NextResponse.json({ success: true, node: updated })
  } catch (error) {
    if (error instanceof NextResponse) return error
    console.error('Update career node error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
