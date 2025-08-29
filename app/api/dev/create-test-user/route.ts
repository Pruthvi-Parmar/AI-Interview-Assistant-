import { NextRequest, NextResponse } from "next/server";
import { db } from "@/firebase/admin";
import { auth } from "@/firebase/client";
import { createUserWithEmailAndPassword } from "firebase/auth";

export async function POST(request: NextRequest) {
  try {
    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      "test@example.com",
      "password123"
    );

    // Create user record in Firestore
    const user = {
      uid: userCredential.user.uid,
      name: "Test User",
      email: "test@example.com",
      createdAt: new Date().toISOString(),
    };

    await db.collection("users").doc(userCredential.user.uid).set(user);

    return NextResponse.json({
      success: true,
      message: "Test user created successfully",
      user: {
        id: userCredential.user.uid,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Error creating test user:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create test user" },
      { status: 500 }
    );
  }
}
