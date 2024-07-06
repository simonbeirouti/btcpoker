// app/api/game/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { PrismaClient } from '@prisma/client';
import { LightsparkClient } from "@lightsparkdev/lightspark-sdk";

const prisma = new PrismaClient();

// Initialize Lightspark client
const lightsparkClient = new LightsparkClient({
  baseUrl: process.env.LIGHTSPARK_BASE_URL,
  apiTokenClientId: process.env.LIGHTSPARK_API_TOKEN_CLIENT_ID!,
  apiTokenClientSecret: process.env.LIGHTSPARK_API_TOKEN_CLIENT_SECRET!,
});

export async function GET(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const games = await prisma.game.findMany({
      include: {
        players: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });
    return NextResponse.json(games);
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching games' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { buyIn, smallBlind, bigBlind, playerLimit } = await req.json();

  if (!buyIn || !smallBlind || !bigBlind || !playerLimit) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const game = await prisma.game.create({
      data: {
        status: 'waiting',
        pot: 0,
        buyIn: parseFloat(buyIn),
        smallBlind: parseFloat(smallBlind),
        bigBlind: parseFloat(bigBlind),
        playerLimit: parseInt(playerLimit),
        players: {
          connect: { id: session.user.id },
        },
      },
      include: {
        players: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });
    return NextResponse.json(game);
  } catch (error) {
    console.error('Error creating game:', error);
    return NextResponse.json({ error: 'Error creating game' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { gameId } = await req.json();

  try {
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: { players: true },
    });

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (game.players.some(player => player.id === session.user.id)) {
      return NextResponse.json({ error: 'Already joined this game' }, { status: 400 });
    }

    if (game.players.length >= game.playerLimit) {
      return NextResponse.json({ error: 'Game is full' }, { status: 400 });
    }

    // Create an invoice for the player to pay
    const invoice = await lightsparkClient.createInvoice({
      amountMsats: game.buyIn * 1000, // Convert to millisatoshis
      memo: `Join game ${gameId}`,
    });

    // Add player to the game
    const updatedGame = await prisma.game.update({
      where: { id: gameId },
      data: {
        players: {
          connect: { id: session.user.id },
        },
      },
      include: {
        players: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ 
      invoice: invoice.data?.encodedPaymentRequest,
      game: updatedGame
    });
  } catch (error) {
    return NextResponse.json({ error: 'Error joining game' }, { status: 500 });
  }
}