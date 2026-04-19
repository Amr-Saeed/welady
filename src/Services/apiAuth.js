import { supabase } from "./supabase";

// Generate email from phone number for users without email
function generateEmailFromPhone(phone) {
  // Remove any spaces, dashes, special characters
  const cleaned = phone.replace(/[\s\-()]/g, "");
  // Use format: phone-{number}@example.com (example.com is reserved for testing)
  return `phone-${cleaned}@example.com`;
}

// Format phone number to Egyptian format
export function formatPhoneNumber(phone) {
  const cleaned = phone.replace(/[\s\-()]/g, "");

  if (cleaned.startsWith("01")) {
    return `+20${cleaned.slice(1)}`;
  }
  if (cleaned.startsWith("+20")) {
    return cleaned;
  }
  if (cleaned.startsWith("20")) {
    return `+${cleaned}`;
  }
  return `+20${cleaned}`;
}

// Get existing account by phone (any role)
export async function getAccountByPhone(phone) {
  const formattedPhone = formatPhoneNumber(phone);
  console.log(
    "[getAccountByPhone] Checking Supabase public.users for phone:",
    formattedPhone,
    "or",
    phone,
  );

  const { data, error } = await supabase
    .from("users")
    .select("id, phoneNumber, name, role")
    .in("phoneNumber", [formattedPhone, phone])
    .limit(1)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  console.log("[getAccountByPhone] Supabase public.users result:", data);
  return data || null;
}

// Check if user exists by phone number
export async function checkUserByPhone(phone) {
  try {
    const formattedPhone = formatPhoneNumber(phone);

    console.log("🔍 Checking user with phone:", phone);
    console.log("📞 Formatted to:", formattedPhone);

    const account = await getAccountByPhone(phone);
    const data = account?.role === "parent" ? account : null;

    if (data) {
      console.log("✅ User found:", data);
    } else if (account?.role === "teacher") {
      console.log("⛔ Phone belongs to teacher account");
    } else {
      console.log("❌ No user found with phone:", formattedPhone);
    }

    return data; // Returns user data if exists, null if not
  } catch (error) {
    console.error("❌ Error checking user:", error);
    return null;
  }
}

// Sign up new user with phone and password
export async function signUpWithPhone(name, phone, relationship, password) {
  try {
    const formattedPhone = formatPhoneNumber(phone);
    const email = generateEmailFromPhone(phone);

    const existingAccount = await getAccountByPhone(phone);
    if (existingAccount?.role === "parent") {
      throw new Error("هذا الرقم مسجل بالفعل كولي أمر. استخدم تسجيل الدخول.");
    }
    if (existingAccount?.role === "teacher") {
      throw new Error(
        "هذا الرقم مسجل كمعلم. لا يمكن استخدامه في حساب ولي أمر.",
      );
    }

    console.log("📝 Signing up new user...");
    console.log("Phone:", formattedPhone);
    console.log("Email (generated):", email);

    // Create Supabase auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: undefined,
        data: {
          phone: formattedPhone,
          name,
        },
      },
    });

    if (authError) throw authError;

    console.log("✅ Auth user created:", authData.user.id);
    console.log("📞 Phone saved in metadata:", formattedPhone);

    // Create user profile in database
    const { error: userError } = await supabase.from("users").insert({
      id: authData.user.id,
      name,
      phoneNumber: formattedPhone,
      role: "parent",
      isActive: true,
    });

    if (userError) throw userError;

    // Create parent profile
    const { error: parentError } = await supabase.from("parents").insert({
      id: authData.user.id,
      relationShip: relationship,
      subscriptionStatus: "trial",
      subscriptionTier: "tier_1",
      childrenCount: 0,
    });

    if (parentError) throw parentError;

    console.log("✅ User profile created successfully");

    return { user: authData.user, session: authData.session };
  } catch (error) {
    console.error("❌ Signup error:", error);
    throw error;
  }
}

// Login existing user with phone and password
export async function loginWithPhone(phone, password) {
  try {
    const formattedPhone = formatPhoneNumber(phone);
    const email = generateEmailFromPhone(phone);

    const existingAccount = await getAccountByPhone(phone);
    if (!existingAccount) {
      throw new Error("هذا الرقم غير مسجل. أنشئ حساب ولي أمر أولاً.");
    }
    if (existingAccount.role !== "parent") {
      throw new Error("هذا الرقم مسجل كمعلم. استخدم شاشة دخول المعلمين.");
    }

    console.log("🔐 Logging in...");
    console.log("Phone:", formattedPhone);
    console.log("Email (generated):", email);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    console.log("✅ Login successful");
    return { user: data.user, session: data.session };
  } catch (error) {
    console.error("❌ Login error:", error);
    throw error;
  }
}

// Get current authenticated user
export async function getCurrentUser() {
  try {
    console.log("[getCurrentUser] Fetching session from Supabase...");
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    console.log(
      "[getCurrentUser] Session result:",
      session ? "Session exists" : "No session",
    );

    if (error) throw error;

    if (session?.user) {
      console.log("[getCurrentUser] User found:", session.user.id);
    }
    return session?.user || null;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}

// Get parent profile with user data
export async function getParentProfile() {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) throw sessionError;
    if (!session?.user) return null;

    // Get user data
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id, name, phoneNumber, role")
      .eq("id", session.user.id)
      .maybeSingle();

    if (userError && userError.code !== "PGRST116") throw userError;

    // Get parent relationship data
    const { data: parentData, error: parentError } = await supabase
      .from("parents")
      .select("relationShip")
      .eq("id", session.user.id)
      .maybeSingle();

    if (parentError && parentError.code !== "PGRST116") throw parentError;

    return {
      id: session.user.id,
      name: userData?.name || session.user.user_metadata?.name || "ولي الأمر",
      phoneNumber:
        userData?.phoneNumber || session.user.user_metadata?.phone || "",
      role: userData?.role || "parent",
      relationship: parentData?.relationShip || "father",
    };
  } catch (error) {
    console.error("Error getting parent profile:", error);
    throw error;
  }
}

// Sign out current user
export async function signOut() {
  console.log("[signOut] Initiating sign out...");
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.warn("⚠️ Server sign out warning:", error.message);
    }
  } catch (error) {
    console.error("❌ Sign out error:", error);
  } finally {
    // Force clear local storage to prevent "ghost" sessions if the server request failed
    console.log("[signOut] Cleaning up local storage...");
    if (typeof window !== "undefined") {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        console.log(`[signOut] Found localStorage key: ${key}`);
      }

      // Aggressively clear all localStorage and sessionStorage to ensure no tokens are left
      localStorage.clear();
      sessionStorage.clear();
    }
    console.log("✅ Signed out successfully");

    // Force a hard reload to clear React Query cache and Supabase internal memory
    window.location.href = "/";
    return true;
  }
}

// Get user account by id (any role)
export async function getAccountById(id) {
  const { data, error } = await supabase
    .from("users")
    .select("id, phoneNumber, name, role")
    .eq("id", id)
    .maybeSingle();
  if (error && error.code !== "PGRST116") {
    throw error;
  }
  return data || null;
}

// ============================================================================
// TEACHER AUTHENTICATION FUNCTIONS
// ============================================================================

async function ensureTeacherProfile(userId, specialization = null) {
  const { data: existingTeacher, error: existingError } = await supabase
    .from("teachers")
    .select("id, subjects, totalGroups, totalStudents")
    .eq("id", userId)
    .maybeSingle();

  if (existingError && existingError.code !== "PGRST116") {
    throw existingError;
  }

  if (!existingTeacher) {
    const subjects = specialization ? [specialization] : [];

    const { error: insertError } = await supabase.from("teachers").insert({
      id: userId,
      subjects,
      totalGroups: 0,
      totalStudents: 0,
    });

    if (insertError) throw insertError;
    return;
  }

  // Backfill subjects if teacher existed without subjects.
  if (
    specialization &&
    (!Array.isArray(existingTeacher.subjects) ||
      existingTeacher.subjects.length === 0)
  ) {
    const { error: updateError } = await supabase
      .from("teachers")
      .update({ subjects: [specialization] })
      .eq("id", userId);

    if (updateError) throw updateError;
  }
}

// Check if teacher exists by phone number
export async function checkTeacherByPhone(phone) {
  try {
    const formattedPhone = formatPhoneNumber(phone);

    console.log("🔍 Checking teacher with phone:", phone);
    console.log("📞 Formatted to:", formattedPhone);

    const account = await getAccountByPhone(phone);
    const data = account?.role === "teacher" ? account : null;

    if (data) {
      console.log("✅ Teacher found:", data);
    } else if (account?.role === "parent") {
      console.log("⛔ Phone belongs to parent account");
    } else {
      console.log("❌ No teacher found with phone:", formattedPhone);
    }

    return data; // Returns teacher data if exists, null if not
  } catch (error) {
    console.error("❌ Error checking teacher:", error);
    return null;
  }
}

// Sign up new teacher with phone and password
export async function signUpTeacherWithPhone(
  name,
  phone,
  specialization,
  password,
) {
  try {
    const formattedPhone = formatPhoneNumber(phone);
    const email = generateEmailFromPhone(phone);

    const existingAccount = await getAccountByPhone(phone);
    if (existingAccount?.role === "teacher") {
      throw new Error("هذا الرقم مسجل بالفعل كمعلم. استخدم تسجيل الدخول.");
    }
    if (existingAccount?.role === "parent") {
      throw new Error(
        "هذا الرقم مسجل كولي أمر. لا يمكن استخدامه في حساب معلم.",
      );
    }

    console.log("📝 Signing up new teacher...");
    console.log("Phone:", formattedPhone);
    console.log("Email (generated):", email);

    // Create Supabase auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: undefined,
        data: {
          phone: formattedPhone,
          name,
          specialization,
        },
      },
    });

    if (authError) throw authError;

    console.log("✅ Auth user created:", authData.user.id);
    console.log("📞 Phone saved in metadata:", formattedPhone);

    // Create user profile in database
    const { error: userError } = await supabase.from("users").insert({
      id: authData.user.id,
      name,
      phoneNumber: formattedPhone,
      role: "teacher",
      isActive: true,
    });

    if (userError) throw userError;

    // Create teacher profile
    try {
      await ensureTeacherProfile(authData.user.id, specialization);
    } catch (profileError) {
      if (profileError?.code === "42501") {
        throw new Error(
          "صلاحيات جدول teachers غير صحيحة في Supabase. شغّل ملف fix-teachers-rls.sql في SQL Editor.",
        );
      }
      throw profileError;
    }

    console.log("✅ Teacher profile created successfully");

    return { user: authData.user, session: authData.session };
  } catch (error) {
    console.error("❌ Teacher signup error:", error);
    throw error;
  }
}

// Login existing teacher with phone and password
export async function loginTeacherWithPhone(phone, password) {
  try {
    const formattedPhone = formatPhoneNumber(phone);
    const email = generateEmailFromPhone(phone);

    const existingAccount = await getAccountByPhone(phone);
    if (!existingAccount) {
      throw new Error("هذا الرقم غير مسجل. أنشئ حساب معلم أولاً.");
    }
    if (existingAccount.role !== "teacher") {
      throw new Error(
        "هذا الرقم مسجل كولي أمر. استخدم شاشة دخول أولياء الأمور.",
      );
    }

    console.log("🔐 Logging in teacher...");
    console.log("Phone:", formattedPhone);
    console.log("Email (generated):", email);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    try {
      await ensureTeacherProfile(
        data.user.id,
        data.user.user_metadata?.specialization || null,
      );
    } catch (profileError) {
      if (profileError?.code === "42501") {
        throw new Error(
          "تم تسجيل الدخول لكن لا يمكن قراءة/إنشاء ملف المعلم بسبب صلاحيات جدول teachers. شغّل fix-teachers-rls.sql.",
        );
      }
      throw profileError;
    }

    console.log("✅ Teacher login successful");
    return { user: data.user, session: data.session };
  } catch (error) {
    console.error("❌ Teacher login error:", error);
    throw error;
  }
}

// Get teacher profile with user data
export async function getTeacherProfile() {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) throw sessionError;
    if (!session?.user) return null;

    // Get user data
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id, name, phoneNumber, role")
      .eq("id", session.user.id)
      .eq("role", "teacher")
      .maybeSingle();

    if (userError && userError.code !== "PGRST116") throw userError;

    // Get teacher specific data
    const { data: teacherData, error: teacherError } = await supabase
      .from("teachers")
      .select("subjects, totalGroups, totalStudents")
      .eq("id", session.user.id)
      .maybeSingle();

    if (teacherError && teacherError.code !== "PGRST116") throw teacherError;

    return {
      id: session.user.id,
      name: userData?.name || session.user.user_metadata?.name || "الأستاذ",
      phoneNumber:
        userData?.phoneNumber || session.user.user_metadata?.phone || "",
      role: userData?.role || "teacher",
      specialization:
        teacherData?.subjects?.[0] ||
        session.user.user_metadata?.specialization ||
        "غير محدد",
      subjects: teacherData?.subjects || [],
      totalGroups: teacherData?.totalGroups ?? 0,
      totalStudents: teacherData?.totalStudents ?? 0,
    };
  } catch (error) {
    console.error("Error getting teacher profile:", error);
    throw error;
  }
}
