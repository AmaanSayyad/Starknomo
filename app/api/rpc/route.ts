import { NextResponse } from 'next/server';

const RPC_URL = process.env.NEXT_PUBLIC_STARKNET_SEPOLIA_RPC || "https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_7/demo";

export async function POST(req: Request) {
    try {
        const body = await req.json();

        const response = await fetch(RPC_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error("RPC Proxy Error:", error);
        return NextResponse.json({ error: error.message, cause: error.cause }, { status: 500 });
    }
}
