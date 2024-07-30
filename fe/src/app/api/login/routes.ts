// app/api/login/route.ts
import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: Request) {
  const { email, password } = await request.json();

  try {
    const response = await axios.post('http://localhost:8080/login', { email, password });
    return NextResponse.json({ token: response.data.token });
  } catch (error) {
    return NextResponse.error();
  }
}
