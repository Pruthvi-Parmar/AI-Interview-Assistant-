"use server";

import { db } from "@/firebase/admin";
import { auth } from "@/firebase/client";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { cookies } from "next/headers";

export async function signIn(params: SignInParams) {
  const { email, idToken } = params;

  try {
    const userRecord = await db.collection("users").where("email", "==", email).limit(1).get();

    if (userRecord.empty) {
      return { success: false, error: "User not found" };
    }

    const userDoc = userRecord.docs[0];
    const userData = userDoc.data();

    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set("session", userData.uid, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return {
      success: true,
      user: {
        id: userDoc.id,
        name: userData.name,
        email: userData.email,
      },
    };
  } catch (error) {
    console.error("Error signing in:", error);
    return { success: false, error: "Failed to sign in" };
  }
}

export async function signUp(params: SignUpParams) {
  const { uid, name, email, password } = params;

  try {
    const user = {
      uid,
      name,
      email,
      createdAt: new Date().toISOString(),
    };

    await db.collection("users").doc(uid).set(user);

    return {
      success: true,
      user: {
        id: uid,
        name,
        email,
      },
    };
  } catch (error) {
    console.error("Error signing up:", error);
    return { success: false, error: "Failed to sign up" };
  }
}

// Sign out user by clearing the session cookie
export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}

// Get current user from session cookie
export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();

  const sessionCookie = cookieStore.get("session")?.value;
  console.log("Session cookie value:", sessionCookie);
  
  if (!sessionCookie) {
    console.log("No session cookie found");
    return null;
  }

  try {
    // Find user by uid in the session cookie
    const userRecord = await db
      .collection("users")
      .where("uid", "==", sessionCookie)
      .limit(1)
      .get();
    
    console.log("User record found:", !userRecord.empty);
    
    if (userRecord.empty) {
      console.log("No user found with uid:", sessionCookie);
      return null;
    }

    const userDoc = userRecord.docs[0];
    const userData = userDoc.data();
    
    console.log("User data found:", userData);
    
    return {
      id: userDoc.id,
      name: userData.name,
      email: userData.email,
      uid: userData.uid,
    } as User;
  } catch (error) {
    console.log("Session verification failed:", error);
    return null;
  }
}

// Check if user is authenticated
export async function isAuthenticated() {
  const user = await getCurrentUser();
  return !!user;
}

// Admin Authentication Functions
export async function adminSignIn(email: string, password: string) {
  try {
    // First, verify the user exists in Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Check if user is an admin
    const adminRecord = await db
      .collection("admin_users")
      .where("email", "==", email)
      .limit(1)
      .get();

    if (adminRecord.empty) {
      return { success: false, error: "Access denied. Admin privileges required." };
    }

    const adminDoc = adminRecord.docs[0];
    const adminData = adminDoc.data();

    if (!adminData) {
      return { success: false, error: "Admin data not found" };
    }

    // Update last login
    await db.collection("admin_users").doc(adminDoc.id).update({
      lastLogin: new Date().toISOString(),
    });

    // Log admin action
    await db.collection("admin_actions").add({
      adminId: adminDoc.id,
      action: "login",
      resource: "admin_user",
      resourceId: adminDoc.id,
      details: `Admin ${adminData.name} logged in`,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      admin: {
        id: adminDoc.id,
        name: adminData.name,
        email: adminData.email,
        role: adminData.role,
      },
    };
  } catch (error) {
    console.error("Error signing in admin:", error);
    return { success: false, error: "Failed to sign in" };
  }
}

export async function adminSignOut(adminId: string) {
  try {
    // Log admin action
    await db.collection("admin_actions").add({
      adminId,
      action: "logout",
      resource: "admin_user",
      resourceId: adminId,
      details: "Admin logged out",
      timestamp: new Date().toISOString(),
    });

    return { success: true };
  } catch (error) {
    console.error("Error signing out admin:", error);
    return { success: false, error: "Failed to sign out" };
  }
}

export async function verifyAdminSession(adminId: string) {
  try {
    const adminDoc = await db.collection("admin_users").doc(adminId).get();

    if (!adminDoc.exists) {
      return { success: false, error: "Admin not found" };
    }

    const adminData = adminDoc.data();
    if (!adminData) {
      return { success: false, error: "Admin data not found" };
    }

    return {
      success: true,
      admin: {
        id: adminDoc.id,
        name: adminData.name,
        email: adminData.email,
        role: adminData.role,
      },
    };
  } catch (error) {
    console.error("Error verifying admin session:", error);
    return { success: false, error: "Failed to verify session" };
  }
}

export async function createAdminUser(adminData: {
  email: string;
  name: string;
  role: "admin" | "super_admin";
  password: string;
}) {
  try {
    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      adminData.email,
      adminData.password
    );

    // Create admin record in Firestore
    const adminRecord = {
      email: adminData.email,
      name: adminData.name,
      role: adminData.role,
      createdAt: new Date().toISOString(),
      lastLogin: null,
    };

    const docRef = await db.collection("admin_users").add(adminRecord);

    return {
      success: true,
      adminId: docRef.id,
    };
  } catch (error) {
    console.error("Error creating admin user:", error);
    return { success: false, error: "Failed to create admin user" };
  }
}
