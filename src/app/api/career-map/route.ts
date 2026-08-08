import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    // Get first user (demo user)
    const user = await db.user.findFirst()
    if (!user) {
      return NextResponse.json({ success: true, map: null })
    }

    // Get first career map or create default
    let careerMap = await db.careerMap.findFirst({
      where: { userId: user.id },
      include: {
        nodes: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    })

    if (!careerMap) {
      careerMap = await db.careerMap.create({
        data: {
          userId: user.id,
          title: 'My Career Map',
        },
        include: {
          nodes: {
            orderBy: { orderIndex: 'asc' },
          },
        },
      })
    }

    return NextResponse.json({ success: true, map: careerMap })
  } catch (error) {
    console.error('Get career map error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, label, description, status } = body

    if (!type || !label) {
      return NextResponse.json(
        { success: false, error: 'Type and label are required' },
        { status: 400 }
      )
    }

    // Get first user (demo user)
    const user = await db.user.findFirst()
    if (!user) {
      return NextResponse.json({ success: false, error: 'No user found' }, { status: 404 })
    }

    // Get or create career map
    let careerMap = await db.careerMap.findFirst({
      where: { userId: user.id },
    })

    if (!careerMap) {
      careerMap = await db.careerMap.create({
        data: { userId: user.id },
      })
    }

    // Get the current max orderIndex for this map
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
        status: status || 'pending',
        orderIndex: (maxOrderNode?.orderIndex ?? -1) + 1,
      },
    })

    return NextResponse.json({ success: true, node })
  } catch (error) {
    console.error('Create career node error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
