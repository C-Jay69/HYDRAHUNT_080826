import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    // Return first user in DB, or create a demo user
    let user = await db.user.findFirst({
      include: {
        profile: true,
        subscriptions: {
          where: { status: 'active' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    if (!user) {
      user = await db.user.create({
        data: {
          email: 'demo@hydrahunt.io',
          name: 'Demo Hunter',
          profile: { create: {} },
          subscriptions: { create: { plan: 'free', status: 'active' } },
        },
        include: {
          profile: true,
          subscriptions: {
            where: { status: 'active' },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      })
    }

    const activeSubscription = user.subscriptions[0]

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        profile: user.profile,
        plan: activeSubscription?.plan || 'free',
      },
    })
  } catch (error) {
    console.error('Get current user error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    // Get the demo/first user
    const user = await db.user.findFirst({
      include: { profile: true },
    })

    if (!user) {
      return NextResponse.json({ success: false, error: 'No user found' }, { status: 404 })
    }

    // Update profile fields
    const { headline, bio, location, website, linkedin, github, phone, targetRole, targetSalary, targetLocation, experience, onboardingComplete, name } = body

    const profileUpdate: Record<string, unknown> = {}
    if (headline !== undefined) profileUpdate.headline = headline
    if (bio !== undefined) profileUpdate.bio = bio
    if (location !== undefined) profileUpdate.location = location
    if (website !== undefined) profileUpdate.website = website
    if (linkedin !== undefined) profileUpdate.linkedin = linkedin
    if (github !== undefined) profileUpdate.github = github
    if (phone !== undefined) profileUpdate.phone = phone
    if (targetRole !== undefined) profileUpdate.targetRole = targetRole
    if (targetSalary !== undefined) profileUpdate.targetSalary = targetSalary
    if (targetLocation !== undefined) profileUpdate.targetLocation = targetLocation
    if (experience !== undefined) profileUpdate.experience = experience
    if (onboardingComplete !== undefined) profileUpdate.onboardingComplete = onboardingComplete

    const userUpdate: Record<string, unknown> = {}
    if (name !== undefined) userUpdate.name = name

    const [updatedUser] = await Promise.all([
      db.user.update({
        where: { id: user.id },
        data: userUpdate,
        include: {
          profile: true,
          subscriptions: {
            where: { status: 'active' },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
      user.profile
        ? db.profile.update({
            where: { id: user.profile.id },
            data: profileUpdate,
          })
        : Promise.resolve(null),
    ])

    const activeSubscription = updatedUser.subscriptions[0]

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        image: updatedUser.image,
        profile: updatedUser.profile,
        plan: activeSubscription?.plan || 'free',
      },
    })
  } catch (error) {
    console.error('Update profile error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
