import { NextRequest, NextResponse } from "next/server";
import { db } from "@/firebase/admin";
import { auth } from "@/firebase/client";
import { signInWithEmailAndPassword } from "firebase/auth";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // First, verify the user exists in Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Get user data from Firestore
    const userRecord = await db.collection("users").where("email", "==", email).limit(1).get();

    if (userRecord.empty) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const userDoc = userRecord.docs[0];
    const userData = userDoc.data();

    // Create response
    const response = NextResponse.json({
      success: true,
      user: {
        id: userDoc.id,
        name: userData.name,
        email: userData.email,
        uid: userData.uid,
      },
      sessionToken: userData.uid, // Include session token in response body
    });

    // Set session cookie
    response.cookies.set("session", userData.uid, {
      httpOnly: false, // Allow JavaScript access for debugging
      secure: false, // Allow HTTP in development
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
      domain: "localhost", // Explicitly set domain
    });

    return response;
  } catch (error) {
    console.error("Error signing in:", error);
    return NextResponse.json(
      { success: false, error: "Failed to sign in" },
      { status: 500 }
    );
  }
}
