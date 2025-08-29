import { NextRequest, NextResponse } from "next/server";
import { db } from "@/firebase/admin";
import { auth } from "@/firebase/client";
import { createUserWithEmailAndPassword } from "firebase/auth";

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Create user record in Firestore
    const userRecord = {
      uid: user.uid,
      name,
      email,
      createdAt: new Date().toISOString(),
    };

    await db.collection("users").doc(user.uid).set(userRecord);

    // Create response
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.uid,
        name,
        email,
      },
    });

    // Set session cookie
    response.cookies.set("session", user.uid, {
      httpOnly: false, // Allow JavaScript access for debugging
      secure: false, // Allow HTTP in development
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
      domain: "localhost", // Explicitly set domain
    });

    return response;
  } catch (error) {
    console.error("Error signing up:", error);
    return NextResponse.json(
      { success: false, error: "Failed to sign up" },
      { status: 500 }
    );
  }
}
